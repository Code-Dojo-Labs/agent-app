/**
 * ui-sync.ts — Integración de UI con sincronización entre pestañas
 *
 * Sistema que escucha eventos de BroadcastChannel y actualiza automáticamente
 * los componentes de la interfaz cuando hay cambios en otras pestañas.
 *
 * @author builder
 * @references US-30
 */
import { type SyncEvent } from './broadcast-sync.js';
interface UIRefreshConfig {
    /** Lista de selectores CSS de componentes que deben refrescarse. */
    components?: string[];
    /** Callback personalizado para manejar el evento de sincronización. */
    onSync?: (event: SyncEvent) => void;
}
declare class UISyncManager {
    private static instance;
    private unsubscribe?;
    private componentRefreshMap;
    private constructor();
    /** Singleton: Obtiene la instancia única del gestor. */
    static getInstance(): UISyncManager;
    /** Configura los listeners principales de sincronización. */
    private setupSyncListeners;
    /** Maneja eventos de sincronización de tareas. */
    private handleTaskSync;
    /** Maneja eventos de sincronización de columnas. */
    private handleColumnSync;
    /** Maneja eventos de sincronización de etiquetas. */
    private handleLabelSync;
    /** Maneja eventos de sincronización de tableros. */
    private handleBoardSync;
    /**
     * Refresca componentes Web Components del DOM.
     * @param selectors Lista de selectores CSS de componentes a refrescar
     */
    private refreshComponents;
    /**
     * Registra configuración personalizada para un tipo de entidad.
     * @param entityType Tipo de entidad (task, column, label, board)
     * @param config Configuración de refresco
     */
    registerEntitySync(entityType: string, config: UIRefreshConfig): void;
    /**
     * Fuerza un refresco manual de todos los componentes del DOM.
     */
    refreshAll(): void;
    /** Limpia los listeners de sincronización. */
    destroy(): void;
}
/** Instancia singleton del gestor de sincronización de UI. */
export declare const uiSync: UISyncManager;
/**
 * Inicializa la sincronización automática de UI entre pestañas.
 * Debe llamarse una vez al inicializar la aplicación.
 */
export declare function initializeUISync(): void;
/**
 * Registra callback personalizado para un tipo de entidad.
 * @param entityType Tipo de entidad (task, column, label, board)
 * @param config Configuración de sincronización
 */
export declare function registerEntitySync(entityType: string, config: UIRefreshConfig): void;
/**
 * Fuerza refresco de todos los componentes.
 */
export declare function refreshAllComponents(): void;
export {};
