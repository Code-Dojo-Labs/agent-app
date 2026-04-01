/**
 * ui-sync.ts — Integración de UI con sincronización entre pestañas
 *
 * Sistema que escucha eventos de BroadcastChannel y actualiza automáticamente
 * los componentes de la interfaz cuando hay cambios en otras pestañas.
 *
 * @author builder
 * @references US-30
 */
import { onMultipleSync } from './broadcast-sync.js';
// ── Gestor de sincronización de UI ─────────────────────────────────────────
class UISyncManager {
    static instance;
    unsubscribe;
    componentRefreshMap = new Map();
    constructor() {
        this.setupSyncListeners();
    }
    /** Singleton: Obtiene la instancia única del gestor. */
    static getInstance() {
        if (!UISyncManager.instance) {
            UISyncManager.instance = new UISyncManager();
        }
        return UISyncManager.instance;
    }
    /** Configura los listeners principales de sincronización. */
    setupSyncListeners() {
        this.unsubscribe = onMultipleSync({
            'task:created': (event) => this.handleTaskSync(event, 'created'),
            'task:updated': (event) => this.handleTaskSync(event, 'updated'),
            'task:deleted': (event) => this.handleTaskSync(event, 'deleted'),
            'task:reordered': (event) => this.handleTaskSync(event, 'reordered'),
            'column:created': (event) => this.handleColumnSync(event, 'created'),
            'column:updated': (event) => this.handleColumnSync(event, 'updated'),
            'column:deleted': (event) => this.handleColumnSync(event, 'deleted'),
            'label:created': (event) => this.handleLabelSync(event, 'created'),
            'label:updated': (event) => this.handleLabelSync(event, 'updated'),
            'label:deleted': (event) => this.handleLabelSync(event, 'deleted'),
            'board:created': (event) => this.handleBoardSync(event, 'created'),
            'board:updated': (event) => this.handleBoardSync(event, 'updated'),
            'board:deleted': (event) => this.handleBoardSync(event, 'deleted'),
        });
    }
    /** Maneja eventos de sincronización de tareas. */
    handleTaskSync(event, action) {
        console.log(`[UI-Sync] Task ${action}:`, event.entityId);
        // Refrescar componentes relacionados con tareas
        this.refreshComponents([
            'dojo-kanban-board', // Tablero principal
            'dojo-kanban-column', // Columnas individuales
            'dojo-task-card', // Tarjetas de tareas
            'dojo-task-detail', // Panel de detalle
        ]);
        // Callback personalizado si existe
        const config = this.componentRefreshMap.get('task');
        if (config?.onSync) {
            config.onSync(event);
        }
    }
    /** Maneja eventos de sincronización de columnas. */
    handleColumnSync(event, action) {
        console.log(`[UI-Sync] Column ${action}:`, event.entityId);
        this.refreshComponents([
            'dojo-kanban-board', // Tablero principal
            'dojo-kanban-column', // Columnas individuales  
            'dojo-column-dialog', // Diálogo de columnas
        ]);
        const config = this.componentRefreshMap.get('column');
        if (config?.onSync) {
            config.onSync(event);
        }
    }
    /** Maneja eventos de sincronización de etiquetas. */
    handleLabelSync(event, action) {
        console.log(`[UI-Sync] Label ${action}:`, event.entityId);
        this.refreshComponents([
            'dojo-task-card', // Tarjetas (muestran etiquetas)
            'dojo-task-detail', // Panel de detalle
            'dojo-task-dialog', // Diálogo de tareas
            'dojo-label-manager', // Gestor de etiquetas
        ]);
        const config = this.componentRefreshMap.get('label');
        if (config?.onSync) {
            config.onSync(event);
        }
    }
    /** Maneja eventos de sincronización de tableros. */
    handleBoardSync(event, action) {
        console.log(`[UI-Sync] Board ${action}:`, event.entityId);
        this.refreshComponents([
            'dojo-board-selector', // Selector de tableros
            'dojo-kanban-board', // Tablero principal
        ]);
        const config = this.componentRefreshMap.get('board');
        if (config?.onSync) {
            config.onSync(event);
        }
    }
    /**
     * Refresca componentes Web Components del DOM.
     * @param selectors Lista de selectores CSS de componentes a refrescar
     */
    refreshComponents(selectors) {
        for (const selector of selectors) {
            const components = document.querySelectorAll(selector);
            for (const component of components) {
                // Intentar llamar método refresh() si existe
                if (typeof component.refresh === 'function') {
                    try {
                        component.refresh();
                    }
                    catch (error) {
                        console.warn(`[UI-Sync] Error refrescando ${selector}:`, error);
                    }
                }
                // Disparar evento personalizado como fallback
                component.dispatchEvent(new CustomEvent('sync-refresh', {
                    bubbles: false,
                    detail: { source: 'broadcast-sync' }
                }));
            }
        }
    }
    /**
     * Registra configuración personalizada para un tipo de entidad.
     * @param entityType Tipo de entidad (task, column, label, board)
     * @param config Configuración de refresco
     */
    registerEntitySync(entityType, config) {
        this.componentRefreshMap.set(entityType, config);
    }
    /**
     * Fuerza un refresco manual de todos los componentes del DOM.
     */
    refreshAll() {
        this.refreshComponents([
            'dojo-kanban-board',
            'dojo-kanban-column',
            'dojo-task-card',
            'dojo-task-detail',
            'dojo-task-dialog',
            'dojo-column-dialog',
            'dojo-label-manager',
            'dojo-board-selector',
        ]);
    }
    /** Limpia los listeners de sincronización. */
    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = undefined;
        }
        this.componentRefreshMap.clear();
    }
}
// ── API pública ────────────────────────────────────────────────────────────
/** Instancia singleton del gestor de sincronización de UI. */
export const uiSync = UISyncManager.getInstance();
/**
 * Inicializa la sincronización automática de UI entre pestañas.
 * Debe llamarse una vez al inicializar la aplicación.
 */
export function initializeUISync() {
    console.log('[UI-Sync] Sistema de sincronización inicializado');
    // El singleton ya se encarga de configurar los listeners
    void UISyncManager.getInstance();
}
/**
 * Registra callback personalizado para un tipo de entidad.
 * @param entityType Tipo de entidad (task, column, label, board)
 * @param config Configuración de sincronización
 */
export function registerEntitySync(entityType, config) {
    uiSync.registerEntitySync(entityType, config);
}
/**
 * Fuerza refresco de todos los componentes.
 */
export function refreshAllComponents() {
    uiSync.refreshAll();
}
