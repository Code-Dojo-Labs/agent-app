/**
 * broadcast-sync.ts — Sincronización entre pestañas US-30
 *
 * Sistema de sincronización basado en BroadcastChannel API nativa.
 * Mantiene coherencia de datos entre múltiples pestañas sin dependencias externas.
 *
 * @author builder
 * @references US-30
 */
// ── Service de sincronización ─────────────────────────────────────────────
class BroadcastSyncService {
    static instance;
    channel;
    tabId;
    listeners;
    constructor() {
        this.channel = new BroadcastChannel('kanban-sync');
        this.tabId = crypto.randomUUID();
        this.listeners = new Map();
        this.setupEventListener();
    }
    /** Singleton: Obtiene la instancia única del servicio. */
    static getInstance() {
        if (!BroadcastSyncService.instance) {
            BroadcastSyncService.instance = new BroadcastSyncService();
        }
        return BroadcastSyncService.instance;
    }
    /** Configura el listener principal del BroadcastChannel. */
    setupEventListener() {
        this.channel.addEventListener('message', (event) => {
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
                    }
                    catch (error) {
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
    emit(type, entityId, payload) {
        const syncEvent = {
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
    on(type, listener) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        const typeListeners = this.listeners.get(type);
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
    onMultiple(eventMap) {
        const unsubscribeFns = [];
        for (const [type, listener] of Object.entries(eventMap)) {
            if (listener) {
                const unsubscribe = this.on(type, listener);
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
    close() {
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
export function emitSync(type, entityId, payload) {
    broadcastSync.emit(type, entityId, payload);
}
/**
 * Helper para suscribirse a eventos de sincronización en componentes.
 * @param type Tipo de evento
 * @param listener Callback del evento
 * @returns Función de cleanup
 */
export function onSync(type, listener) {
    return broadcastSync.on(type, listener);
}
/**
 * Helper para suscribirse a múltiples eventos de sincronización.
 * @param eventMap Mapa de eventos y sus listeners
 * @returns Función de cleanup
 */
export function onMultipleSync(eventMap) {
    return broadcastSync.onMultiple(eventMap);
}
