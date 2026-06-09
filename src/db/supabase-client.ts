/**
 * supabase-client.ts — Cliente nativo de Supabase (sin SDK externo).
 *
 * Implementa únicamente con Web APIs nativas:
 *   - fetch()     → REST API (Auth + PostgREST)
 *   - WebSocket   → Supabase Realtime (Postgres Changes)
 *   - localStorage → Sesión de usuario y credenciales de configuración
 *
 * Endpoints cubiertos:
 *   Auth    : /auth/v1/signup, /auth/v1/token, /auth/v1/logout, /auth/v1/user
 *   REST    : /rest/v1/{table} — GET, POST, PATCH, DELETE
 *   Realtime: wss://{host}/realtime/v1/websocket
 */

// ── Tipos internos de respuesta Auth ──────────────────────────────────────

interface SupabaseAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email: string; role?: string };
}

// ── Tipos públicos ──────────────────────────────────────────────────────────

export interface SupabaseConfig {
  projectUrl: string;
  anonKey: string;
}

export interface SupabaseSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;   // Unix timestamp (ms)
  userId: string;
  email: string;
}

export interface SupabaseUser {
  id: string;
  email: string;
  role: string;
}

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimeChange<T = Record<string, unknown>> {
  eventType: RealtimeEvent;
  table: string;
  new: T | null;
  old: T | null;
}

export type RealtimeCallback<T = Record<string, unknown>> = (change: RealtimeChange<T>) => void;

/** Opciones de filtro para queries REST (PostgREST). */
export interface QueryOptions {
  /** Columnas a devolver. Ej: 'id,title,status'. Por defecto: '*'. */
  select?: string;
  /** Filtros en formato PostgREST. Ej: { status: 'eq.open' }. */
  filters?: Record<string, string>;
  /** Orden. Ej: 'created_at.desc'. */
  order?: string;
  /** Límite de filas. */
  limit?: number;
}

// ── Almacenamiento de sesión ────────────────────────────────────────────────

const SESSION_KEY = 'dojo_supabase_session';
const CONFIG_KEY  = 'dojo_supabase_config';

function saveSession(session: SupabaseSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): SupabaseSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as SupabaseSession; } catch { return null; }
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ── Clase principal ─────────────────────────────────────────────────────────

export class SupabaseClient {
  private readonly _projectUrl: string;
  private readonly _anonKey: string;
  private _session: SupabaseSession | null;

  /** Suscripciones Realtime activas { topic → WebSocket }. */
  private _realtimeSockets = new Map<string, WebSocket>();

  constructor(config: SupabaseConfig) {
    // Normalizar URL eliminando slash final
    this._projectUrl = config.projectUrl.replace(/\/$/, '');
    this._anonKey    = config.anonKey;
    this._session    = loadSession();
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  get session(): SupabaseSession | null { return this._session; }
  get isAuthenticated(): boolean { return !!this._session && Date.now() < this._session.expiresAt; }
  get currentUserId(): string | null { return this._session?.userId ?? null; }

  /**
   * Registra un nuevo usuario con email y contraseña.
   * @throws Error si el registro falla (email duplicado, política de password, etc.)
   */
  async signUp(email: string, password: string): Promise<SupabaseUser> {
    const res  = await this._authFetch('/auth/v1/signup', { email, password });
    const data = await this._parseResponse<SupabaseAuthResponse>(res);

    // Cuando "Confirm email" está activado en Supabase, el signup devuelve
    // access_token vacío y user null hasta que el usuario confirme su correo.
    if (!data.user || !data.access_token) {
      throw new Error(
        'Revisa tu bandeja de entrada y confirma tu correo antes de iniciar sesión. ' +
        'También puedes desactivar "Confirm email" en Supabase → Authentication → Providers → Email.'
      );
    }

    this._applySession(data);
    return { id: data.user.id, email: data.user.email, role: data.user.role ?? 'authenticated' };
  }

  /**
   * Inicia sesión con email y contraseña.
   * @throws Error si las credenciales son incorrectas.
   */
  async signIn(email: string, password: string): Promise<SupabaseUser> {
    const res = await this._authFetch(
      '/auth/v1/token?grant_type=password',
      { email, password }
    );
    const data = await this._parseResponse<SupabaseAuthResponse>(res);
    this._applySession(data);
    return { id: data.user.id, email: data.user.email, role: data.user.role ?? 'authenticated' };
  }

  /**
   * Inicia sesión OAuth redirigiendo al proveedor configurado en el proyecto personal.
   * @param provider 'google' | 'github' | cualquier proveedor habilitado.
   */
  signInWithOAuth(provider: string): void {
    const redirectTo = encodeURIComponent(window.location.origin);
    window.location.href =
      `${this._projectUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${redirectTo}`;
  }

  /**
   * Renueva el accessToken usando el refreshToken almacenado.
   * Llamado automáticamente antes de cada request cuando el token está próximo a expirar.
   */
  async refreshSession(): Promise<void> {
    if (!this._session) throw new Error('No hay sesión activa para renovar.');
    const res = await this._authFetch(
      '/auth/v1/token?grant_type=refresh_token',
      { refresh_token: this._session.refreshToken }
    );
    const data = await this._parseResponse<SupabaseAuthResponse>(res);
    this._applySession(data);
  }

  /** Cierra la sesión actual y limpia el estado local. */
  async signOut(): Promise<void> {
    if (!this._session) return;
    try {
      await fetch(`${this._projectUrl}/auth/v1/logout`, {
        method:  'POST',
        headers: this._authHeaders(),
      });
    } finally {
      this._session = null;
      clearSession();
      this._closeAllRealtime();
    }
  }

  /**
   * Valida las credenciales con una llamada de prueba sin modificar el estado de sesión.
   * Útil para verificar antes de guardar la configuración.
   */
  static async validateCredentials(config: SupabaseConfig): Promise<boolean> {
    try {
      const url = config.projectUrl.replace(/\/$/, '');
      // /auth/v1/settings es público y siempre responde si el proyecto existe y el apikey es válido.
      // Cualquier respuesta HTTP (incluso 4xx) significa que el servidor es alcanzable con ese apikey.
      // Solo un error de red (fetch throw) o 401 sin cuerpo indica credenciales incorrectas.
      const res = await fetch(`${url}/auth/v1/settings`, {
        headers: {
          'apikey':        config.anonKey,
          'Authorization': `Bearer ${config.anonKey}`,
        },
      });
      // 200 = ok, 400 = error de parámetros (server ok), 401 = apikey inválida
      return res.status !== 401 && res.status !== 403;
    } catch {
      return false;
    }
  }

  // ── REST API (PostgREST) ──────────────────────────────────────────────────

  /**
   * Lee registros de una tabla.
   * Aplica filtros en formato PostgREST (columna=operador.valor).
   */
  async select<T>(table: string, options: QueryOptions = {}): Promise<T[]> {
    await this._ensureFreshToken();
    const params = new URLSearchParams();
    params.set('select', options.select ?? '*');
    if (options.filters) {
      for (const [col, val] of Object.entries(options.filters)) {
        params.set(col, val);
      }
    }
    if (options.order)  params.set('order', options.order);
    if (options.limit)  params.set('limit', String(options.limit));

    const res = await fetch(`${this._projectUrl}/rest/v1/${table}?${params.toString()}`, {
      headers: this._restHeaders(),
    });
    return this._parseResponse<T[]>(res);
  }

  /**
   * Inserta uno o varios registros.
   * @returns El registro insertado con todos sus campos (incluido id asignado por DB si aplica).
   */
  async insert<T>(table: string, data: Partial<T> | Partial<T>[]): Promise<T[]> {
    await this._ensureFreshToken();
    const res = await fetch(`${this._projectUrl}/rest/v1/${table}`, {
      method:  'POST',
      headers: { ...this._restHeaders(), 'Prefer': 'return=representation' },
      body:    JSON.stringify(data),
    });
    return this._parseResponse<T[]>(res);
  }

  /**
   * Actualiza registros que coincidan con los filtros.
   */
  async update<T>(table: string, data: Partial<T>, filters: Record<string, string>): Promise<T[]> {
    await this._ensureFreshToken();
    const params = new URLSearchParams(filters);
    const res = await fetch(`${this._projectUrl}/rest/v1/${table}?${params.toString()}`, {
      method:  'PATCH',
      headers: { ...this._restHeaders(), 'Prefer': 'return=representation' },
      body:    JSON.stringify(data),
    });
    return this._parseResponse<T[]>(res);
  }

  /**
   * Inserta o actualiza un registro usando ON CONFLICT DO UPDATE (upsert).
   * Requiere que la tabla tenga una constraint UNIQUE en `id`.
   */
  async upsert<T>(table: string, data: Partial<T> | Partial<T>[]): Promise<T[]> {
    await this._ensureFreshToken();
    const res = await fetch(`${this._projectUrl}/rest/v1/${table}`, {
      method:  'POST',
      headers: { ...this._restHeaders(), 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body:    JSON.stringify(data),
    });
    return this._parseResponse<T[]>(res);
  }

  /**
   * Elimina registros que coincidan con los filtros.
   */
  async delete(table: string, filters: Record<string, string>): Promise<void> {
    await this._ensureFreshToken();
    const params = new URLSearchParams(filters);
    const res = await fetch(`${this._projectUrl}/rest/v1/${table}?${params.toString()}`, {
      method:  'DELETE',
      headers: this._restHeaders(),
    });
    if (!res.ok) throw await this._buildError(res);
  }

  // ── Realtime ──────────────────────────────────────────────────────────────

  /**
   * Suscribe a cambios de una tabla vía WebSocket (Supabase Realtime v2).
   * @param table     Nombre de la tabla a escuchar.
   * @param event     'INSERT' | 'UPDATE' | 'DELETE' | '*'
   * @param callback  Función invocada con cada cambio recibido.
   * @returns Función para cancelar la suscripción.
   */
  subscribe<T>(table: string, event: RealtimeEvent, callback: RealtimeCallback<T>): () => void {
    const host  = new URL(this._projectUrl).host;
    const wsUrl = `wss://${host}/realtime/v1/websocket?apikey=${this._anonKey}&vsn=1.0.0`;
    const topic = `realtime:public:${table}`;

    let ws: WebSocket;
    let heartbeatInterval: ReturnType<typeof setInterval>;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let closed = false;
    let ref    = 1;

    const connect = (): void => {
      ws = new WebSocket(wsUrl);
      this._realtimeSockets.set(topic, ws);

      ws.onopen = () => {
        // Unirse al canal
        ws.send(JSON.stringify({
          topic,
          event:   'phx_join',
          payload: {
            config: {
              broadcast:  { self: false },
              presence:   { key: '' },
              postgres_changes: [{ event, schema: 'public', table }],
            },
          },
          ref: String(ref++),
        }));

        // Heartbeat cada 25 s para mantener la conexión viva
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              topic:   'phoenix',
              event:   'heartbeat',
              payload: {},
              ref:     String(ref++),
            }));
          }
        }, 25_000);
      };

      ws.onmessage = (msgEvent) => {
        let envelope: Record<string, unknown>;
        try { envelope = JSON.parse(msgEvent.data as string); } catch { return; }

        if (envelope['event'] !== 'postgres_changes') return;

        const payload = envelope['payload'] as Record<string, unknown> | undefined;
        if (!payload) return;

        const data = payload['data'] as Record<string, unknown> | undefined;
        if (!data) return;

        callback({
          eventType: data['type'] as RealtimeEvent,
          table:     data['table'] as string,
          new:       (data['record'] ?? null) as T | null,
          old:       (data['old_record'] ?? null) as T | null,
        });
      };

      ws.onerror = (e) => console.error('[Realtime] WebSocket error:', e);

      ws.onclose = () => {
        clearInterval(heartbeatInterval);
        if (!closed) {
          // Reconectar con back-off de 3 s
          reconnectTimeout = setTimeout(connect, 3_000);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      clearInterval(heartbeatInterval);
      clearTimeout(reconnectTimeout);
      ws?.close();
      this._realtimeSockets.delete(topic);
    };
  }

  // ── Helpers privados ───────────────────────────────────────────────────────

  private _authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey':        this._anonKey,
    };
    if (this._session) {
      headers['Authorization'] = `Bearer ${this._session.accessToken}`;
    }
    return headers;
  }

  private _restHeaders(): Record<string, string> {
    const token  = this._session?.accessToken ?? this._anonKey;
    return {
      'Content-Type':  'application/json',
      'apikey':         this._anonKey,
      'Authorization': `Bearer ${token}`,
    };
  }

  private async _authFetch(path: string, body: unknown): Promise<Response> {
    return fetch(`${this._projectUrl}${path}`, {
      method:  'POST',
      headers: this._authHeaders(),
      body:    JSON.stringify(body),
    });
  }

  private async _parseResponse<T>(res: Response): Promise<T> {
    if (!res.ok) throw await this._buildError(res);
    const text = await res.text();
    if (!text) return undefined as unknown as T;
    return JSON.parse(text) as T;
  }

  private async _buildError(res: Response): Promise<Error> {
    let msg = `Supabase error ${res.status}`;
    if (res.status === 429) {
      return new Error('Demasiados intentos. Espera 1 minuto antes de volver a intentarlo.');
    }
    try {
      const body = await res.json() as { message?: string; error_description?: string };
      msg = body.message ?? body.error_description ?? msg;
    } catch { /* mantener mensaje genérico */ }
    return new Error(msg);
  }

  private _applySession(data: SupabaseAuthResponse): void {
    this._session = {
      accessToken:  data.access_token,
      refreshToken: data.refresh_token,
      expiresAt:    Date.now() + data.expires_in * 1_000,
      userId:       data.user.id,
      email:        data.user.email,
    };
    saveSession(this._session);
  }

  /**
   * Si el accessToken expira en menos de 60 s, lo renueva automáticamente.
   */
  private async _ensureFreshToken(): Promise<void> {
    if (!this._session) return;
    const margin = 60_000; // 60 s de margen
    if (Date.now() < this._session.expiresAt - margin) return;
    try { await this.refreshSession(); } catch {
      // Si la renovación falla (token revocado), limpiar sesión
      this._session = null;
      clearSession();
    }
  }

  private _closeAllRealtime(): void {
    for (const ws of this._realtimeSockets.values()) {
      ws.close();
    }
    this._realtimeSockets.clear();
  }
}

// ── Singleton gestionado por configuración ──────────────────────────────────

let _instance: SupabaseClient | null = null;

/** Devuelve el cliente activo, o null si Supabase no está configurado. */
export function getSupabaseClient(): SupabaseClient | null {
  return _instance;
}

/**
 * Inicializa el cliente Supabase con la configuración guardada en localStorage.
 * Debe llamarse durante el bootstrap de la app.
 */
export function initSupabaseClient(): SupabaseClient | null {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    const config = JSON.parse(raw) as SupabaseConfig;
    _instance = new SupabaseClient(config);
    return _instance;
  } catch {
    return null;
  }
}

/**
 * Persiste la configuración y crea el cliente.
 * Llamar solo tras validar las credenciales con `SupabaseClient.validateCredentials()`.
 */
export function saveSupabaseConfig(config: SupabaseConfig): SupabaseClient {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  _instance = new SupabaseClient(config);
  return _instance;
}

/** Elimina la configuración guardada y destruye el cliente activo. */
export function clearSupabaseConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
  localStorage.removeItem(SESSION_KEY);
  _instance = null;
}

/** Devuelve true si el usuario ha configurado Supabase. */
export function isSupabaseConfigured(): boolean {
  return !!localStorage.getItem(CONFIG_KEY);
}

/** Devuelve el modo de operación actual de la app. */
export type AppMode = 'local' | 'cloud';
export function getAppMode(): AppMode {
  return isSupabaseConfigured() ? 'cloud' : 'local';
}

/** Marca que el usuario eligió el modo local (omitir setup). */
export function setLocalModeChosen(): void {
  localStorage.setItem('dojo_mode_chosen', 'local');
}

/** Devuelve true si el usuario ya eligió un modo (local o cloud). */
export function hasModeBeenChosen(): boolean {
  return !!localStorage.getItem('dojo_mode_chosen') || isSupabaseConfigured();
}
