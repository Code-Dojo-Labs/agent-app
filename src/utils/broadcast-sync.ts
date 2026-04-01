/**
 * broadcast-sync.ts — Sincronización entre pestañas US-30
 *
 * Sistema de sincronización basado en BroadcastChannel API nativa.
 * Mantiene coherencia de datos entre múltiples pestañas sin dependencias externas.
 *
 * @author builder
 * @references US-30
 */

// ── Tipos de eventos de sincronización ────────────────────────────────────

export type SyncEventType =
  | 'task:created'   | 'task:updated'   | 'task:deleted'   | 'task:reordered'
  | 'column:created' | 'column:updated' | 'column:deleted'
  | 'label:created'  | 'label:updated'  | 'label:deleted'
  | 'board:created'  | 'board:updated'  | 'board:deleted'
  | 'project:created'| 'project:updated'| 'project:deleted';

export interface SyncEvent<T = any> {
  /** Tipo de evento de sincronización. */
  type: SyncEventType;
  /** ID de la entidad afectada. */
  entityId: string;
  /** Datos adicionales del evento (opcional). */
  payload?: T;
  /** Timestamp del evento. */
  timestamp: number;
  /** ID de la pestaña que originó el evento. */
  tabId: string;
}

// ── Service de sincronización ─────────────────────────────────────────────

class BroadcastSyncService {
  private static instance: BroadcastSyncService;
  private channel: BroadcastChannel;
  private tabId: string;
  private listeners: Map<SyncEventType, Set<(event: SyncEvent) => void>>;

  private constructor() {
    this.channel = new BroadcastChannel('kanban-sync');
    this.tabId = crypto.randomUUID();
    this.listeners = new Map();
    this.setupEventListener();
  }

  /** Singleton: Obtiene la instancia única del servicio. */
  public static getInstance(): BroadcastSyncService {
    if (!BroadcastSyncService.instance) {
      BroadcastSyncService.instance = new BroadcastSyncService();
    }
    return BroadcastSyncService.instance;
  }

  /** Configura el listener principal del BroadcastChannel. */
  private setupEventListener(): void {
    this.channel.addEventListener('message', (event: MessageEvent<SyncEvent>) => {
      const syncEvent = event.data;

      // Ignorar eventos de la misma pestaña
      if (syncEvent.tabId === this.tabId) {
        return;
      }

      // Dispatch a listeners específicos
      const typeListeners = this.listeners.get(syncEvent.type);
      if (typeListeners) {
        for (const listener of typeListeners) {
          try {
            listener(syncEvent);
          } catch (error) {
            console.error(`Error al procesar evento de sync ${syncEvent.type}:`, error);
          }
        }
      }
    });
  }

  /**
   * Emite un evento de sincronización a todas las demás pestañas.
   * @param type Tipo de evento de sincronización
   * @param entityId ID de la entidad afectada
   * @param payload Datos adicionales (opcional)
   */
  public emit<T = any>(type: SyncEventType, entityId: string, payload?: T): void {
    const syncEvent: SyncEvent<T> = {
      type,
      entityId,
      payload,
      timestamp: Date.now(),
      tabId: this.tabId
    };

    this.channel.postMessage(syncEvent);
  }

  /**
   * Suscribe un listener a un tipo específico de evento.
   * @param type Tipo de evento a escuchar
   * @param listener Función callback para procesar el evento
   * @returns Función para cancelar la suscripción
   */
  public on(type: SyncEventType, listener: (event: SyncEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const typeListeners = this.listeners.get(type)!;
    typeListeners.add(listener);

    // Retorna función de cleanup
    return () => {
      typeListeners.delete(listener);
      if (typeListeners.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  /**
   * Suscribe múltiples listeners de una vez.
   * @param eventMap Mapa de tipo -> listener
   * @returns Función para cancelar todas las suscripciones
   */
  public onMultiple(eventMap: Partial<Record<SyncEventType, (event: SyncEvent) => void>>): () => void {
    const unsubscribeFns: (() => void)[] = [];

    for (const [type, listener] of Object.entries(eventMap)) {
      if (listener) {
        const unsubscribe = this.on(type as SyncEventType, listener);
        unsubscribeFns.push(unsubscribe);
      }
    }

    // Retorna función que cancela todas las suscripciones
    return () => {
      for (const unsubscribe of unsubscribeFns) {
        unsubscribe();
      }
    };
  }

  /** Cierra el BroadcastChannel (normalmente no necesario). */
  public close(): void {
    this.channel.close();
    this.listeners.clear();
  }
}

// ── API pública ────────────────────────────────────────────────────────────

/** Instancia singleton del servicio de sincronización. */
export const broadcastSync = BroadcastSyncService.getInstance();

/**
 * Helper para emitir eventos de sincronización desde repositorios.
 * @param type Tipo de evento
 * @param entityId ID de la entidad
 * @param payload Datos adicionales
 */
export function emitSync<T = any>(type: SyncEventType, entityId: string, payload?: T): void {
  broadcastSync.emit(type, entityId, payload);
}

/**
 * Helper para suscribirse a eventos de sincronización en componentes.
 * @param type Tipo de evento
 * @param listener Callback del evento
 * @returns Función de cleanup
 */
export function onSync(type: SyncEventType, listener: (event: SyncEvent) => void): () => void {
  return broadcastSync.on(type, listener);
}

/**
 * Helper para suscribirse a múltiples eventos de sincronización.
 * @param eventMap Mapa de eventos y sus listeners
 * @returns Función de cleanup
 */
export function onMultipleSync(eventMap: Partial<Record<SyncEventType, (event: SyncEvent) => void>>): () => void {
  return broadcastSync.onMultiple(eventMap);
}