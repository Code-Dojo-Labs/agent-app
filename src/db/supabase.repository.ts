/**
 * supabase.repository.ts — Implementación de IRepository<T> contra Supabase REST API.
 *
 * Usa el cliente nativo `SupabaseClient` (sin SDK externo).
 * Cada instancia está ligada a una tabla específica de Supabase con RLS activo.
 *
 * Estrategia de conflictos: last-write-wins basado en `updated_at`.
 *
 * Nota de RLS: todas las queries incluyen automáticamente el userId del token JWT,
 * garantizando el aislamiento de datos por usuario sin filtros manuales.
 */

import type { IRepository, BaseEntity } from './repository.interface.js';
import type { SupabaseClient, RealtimeCallback, RealtimeEvent } from './supabase-client.js';

// ── Implementación ──────────────────────────────────────────────────────────

export class SupabaseRepository<T extends BaseEntity> implements IRepository<T> {
  private readonly _client: SupabaseClient;
  private readonly _table: string;

  /**
   * @param client  Instancia activa del cliente Supabase.
   * @param table   Nombre de la tabla de Supabase (debe existir con RLS configurado).
   */
  constructor(client: SupabaseClient, table: string) {
    this._client = client;
    this._table  = table;
  }

  /** Devuelve todos los registros de la tabla (filtrados por RLS del usuario activo). */
  async findAll(): Promise<T[]> {
    return this._client.select<T>(this._table, { order: 'updated_at.desc' });
  }

  /** Devuelve un registro por su ID, o `null` si no existe. */
  async findById(id: string): Promise<T | null> {
    const rows = await this._client.select<T>(this._table, {
      filters: { id: `eq.${id}` },
      limit:   1,
    });
    return rows[0] ?? null;
  }

  /**
   * Inserta un nuevo registro.
   * El `id` debe ser un UUID v4 generado por el llamador.
   * Supabase aplica RLS en el INSERT; si el usuario no está autenticado, lanzará error.
   */
  async create(entity: T): Promise<T> {
    const rows = await this._client.insert<T>(this._table, entity);
    if (!rows[0]) throw new Error(`[SupabaseRepository] Error al insertar en '${this._table}'`);
    return rows[0];
  }

  /**
   * Actualiza campos de un registro existente.
   * Mezcla `changes` con el estado actual usando PATCH semántico de PostgREST.
   * @throws Error si el registro no existe o RLS lo rechaza.
   */
  async update(id: string, changes: Partial<Omit<T, 'id'>>): Promise<T> {
    const rows = await this._client.update<T>(
      this._table,
      { ...changes, updated_at: new Date().toISOString() } as unknown as Partial<T>,
      { id: `eq.${id}` }
    );
    if (!rows[0]) throw new Error(`[SupabaseRepository] Registro '${id}' no encontrado en '${this._table}'`);
    return rows[0];
  }

  /**
   * Elimina un registro por su ID.
   * Operación idempotente — no lanza error si no existe.
   */
  async delete(id: string): Promise<void> {
    await this._client.delete(this._table, { id: `eq.${id}` });
  }

  // ── Realtime ──────────────────────────────────────────────────────────────

  /**
   * Suscribe a cambios en tiempo real de esta tabla.
   * @param event    'INSERT' | 'UPDATE' | 'DELETE' | '*'
   * @param callback Función invocada con cada cambio recibido.
   * @returns        Función para cancelar la suscripción.
   */
  subscribe(event: RealtimeEvent, callback: RealtimeCallback<T>): () => void {
    return this._client.subscribe<T>(this._table, event, callback);
  }
}
