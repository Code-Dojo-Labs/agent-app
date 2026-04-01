/**
 * broadcast-sync.ts — Sincronización entre pestañas US-30
 *
 * Sistema de sincronización basado en BroadcastChannel API nativa.
 * Mantiene coherencia de datos entre múltiples pestañas sin dependencias externas.
 *
 * @author builder
 * @references US-30
 */
export type SyncEventType = 'task:created' | 'task:updated' | 'task:deleted' | 'task:reordered' | 'column:created' | 'column:updated' | 'column:deleted' | 'label:created' | 'label:updated' | 'label:deleted' | 'board:created' | 'board:updated' | 'board:deleted' | 'project:created' | 'project:updated' | 'project:deleted';
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
declare class BroadcastSyncService {
    private static instance;
    private channel;
    private tabId;
    private listeners;
    private constructor();
    /** Singleton: Obtiene la instancia única del servicio. */
    static getInstance(): BroadcastSyncService;
    /** Configura el listener principal del BroadcastChannel. */
    private setupEventListener;
    /**
     * Emite un evento de sincronización a todas las demás pestañas.
     * @param type Tipo de evento de sincronización
     * @param entityId ID de la entidad afectada
     * @param payload Datos adicionales (opcional)
     */
    emit<T = any>(type: SyncEventType, entityId: string, payload?: T): void;
    /**
     * Suscribe un listener a un tipo específico de evento.
     * @param type Tipo de evento a escuchar
     * @param listener Función callback para procesar el evento
     * @returns Función para cancelar la suscripción
     */
    on(type: SyncEventType, listener: (event: SyncEvent) => void): () => void;
    /**
     * Suscribe múltiples listeners de una vez.
     * @param eventMap Mapa de tipo -> listener
     * @returns Función para cancelar todas las suscripciones
     */
    onMultiple(eventMap: Partial<Record<SyncEventType, (event: SyncEvent) => void>>): () => void;
    /** Cierra el BroadcastChannel (normalmente no necesario). */
    close(): void;
}
/** Instancia singleton del servicio de sincronización. */
export declare const broadcastSync: BroadcastSyncService;
/**
 * Helper para emitir eventos de sincronización desde repositorios.
 * @param type Tipo de evento
 * @param entityId ID de la entidad
 * @param payload Datos adicionales
 */
export declare function emitSync<T = any>(type: SyncEventType, entityId: string, payload?: T): void;
/**
 * Helper para suscribirse a eventos de sincronización en componentes.
 * @param type Tipo de evento
 * @param listener Callback del evento
 * @returns Función de cleanup
 */
export declare function onSync(type: SyncEventType, listener: (event: SyncEvent) => void): () => void;
/**
 * Helper para suscribirse a múltiples eventos de sincronización.
 * @param eventMap Mapa de eventos y sus listeners
 * @returns Función de cleanup
 */
export declare function onMultipleSync(eventMap: Partial<Record<SyncEventType, (event: SyncEvent) => void>>): () => void;
export {};
