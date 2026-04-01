/**
 * dojo-kanban-board — Organismo
 *
 * Tablero Kanban completo. Carga columnas desde IndexedDB, instancia
 * `<dojo-kanban-column>` por cada una y gestiona el scroll horizontal.
 *
 * Criterios US-01 cubiertos:
 * - Muestra las 6 columnas por defecto (o las existentes en IndexedDB)
 * - Scroll horizontal del tablero con header fijo
 * - Scroll vertical independiente por columna (delegado a dojo-kanban-column)
 * - Conteo de tareas por columna (y formato "X / Y" si hay filtros activos)
 * - Estado `loading` con indicador visual y `aria-busy`
 * - Estado `error` con mensaje descriptivo accesible
 *
 * ## Propiedades públicas
 * | Propiedad    | Tipo     | Descripción                                         |
 * |--------------|----------|-----------------------------------------------------|
 * | activeFilter | object   | Filtro activo { labelIds?, priority? }              |
 *
 * ## Eventos despachados
 * | Nombre               | Detalle          | Descripción                     |
 * |----------------------|------------------|---------------------------------|
 * | dojo:board-ready     | { columnCount }  | Tablero cargado con sus columnas|
 * | dojo:board-error     | { message }      | Error de carga                  |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-shadow, --dojo-radius, --dojo-primary
 */
import type { Label, Priority } from '../../../types/models.js';
import '../../molecules/dojo-kanban-column/dojo-kanban-column.js';
import '../../atoms/dojo-task-card/dojo-task-card.js';
import '../../atoms/dojo-add-column-button/dojo-add-column-button.js';
import '../../organisms/dojo-column-dialog/dojo-column-dialog.js';
import '../../organisms/dojo-task-dialog/dojo-task-dialog.js';
import '../../organisms/dojo-task-detail/dojo-task-detail.js';
import '../../organisms/dojo-delete-confirm-dialog/dojo-delete-confirm-dialog.js';
type SortMode = 'order' | 'due-date';
interface ActiveFilter {
    priorities?: Priority[];
    labelIds?: string[];
    searchText?: string;
    sortBy?: SortMode;
    projectId?: string;
}
export declare class DojoKanbanBoard extends HTMLElement {
    static readonly TAG = "dojo-kanban-board";
    static get observedAttributes(): string[];
    private _shadow;
    private _boardId;
    private _activeFilter;
    /** columnId → lista de todas las tareas de esa columna (sin filtrar) */
    private _tasksByColumn;
    /** Lista ordenada de columnas actualmente cargadas */
    private _columns;
    /** Lista completa de etiquetas (US-10) */
    private _labels;
    /** Lista completa de proyectos (US-26) */
    private _projects;
    private _filterBarContent;
    private _filterClearAllBtn;
    private _filterLabelSection;
    private _filterLabelChipsContainer;
    private _filterToggleBtn;
    private _filterSearchInput;
    private _selectedLabelIds;
    private _selectedPriorities;
    private _filterDebounceTimer;
    private _filterProjectSelect;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void;
    get boardId(): string;
    /** US-28: Abre el panel de detalle de una tarea por su ID (para la paleta de comandos). */
    openTaskById(taskId: string): Promise<void>;
    /** US-28: Abre el diálogo de creación con título prellenado (para la paleta de comandos). */
    openCreateTaskWithTitle(title: string): void;
    get activeFilter(): ActiveFilter;
    /**
     * Aplica un filtro al tablero. Actualiza los conteos de todas las columnas
     * en tiempo real sin necesidad de recargar desde IndexedDB.
     */
    set activeFilter(filter: ActiveFilter);
    /**
     * Actualiza una etiqueta en el caché local y refresca los chips de todas las
     * tarjetas visibles que la tienen asignada. Llamado por dojo-app tras recibir
     * el evento `dojo:label-updated` desde dojo-label-manager (US-11).
     */
    refreshLabel(updatedLabel: Label): void;
    /**
     * Elimina una etiqueta del caché local y actualiza los chips de todas
     * las tarjetas que la tenían asignada. Llamado por dojo-app tras recibir
     * el evento `dojo:label-deleted` desde dojo-label-manager (US-12).
     */
    removeLabel(deletedLabelId: string): void;
    /**
     * Refresca completamente el tablero recargando datos desde IndexedDB.
     * Utilizado para sincronización entre pestañas (US-30).
     */
    refresh(): Promise<void>;
    private _render;
    private _buildFilterBar;
    /** Reconstruye los chips de etiquetas del toolbar. Se llama tras cargar/cambiar etiquetas. */
    private _rebuildLabelFilterChips;
    /** Reconstruye las opciones del selector de proyectos (US-26). */
    private _rebuildProjectFilterSelect;
    /** Muestra/oculta el botón "Limpiar filtros" y actualiza el estado visual del toggle. */
    private _updateClearAllVisibility;
    /** Resetea todos los filtros activos y actualiza la UI del toolbar. */
    private _clearAllFilters;
    private _showLoading;
    private _showError;
    private _setMainContent;
    private _loadBoard;
    private _renderColumns;
    /**
     * Crea y agrega `dojo-task-card` como hijos directos del elemento de columna.
     * Las tarjetas se proyectan en el default slot del componente.
     */
    private _renderTaskCards;
    /**
     * Reemplaza las tarjetas de una columna ya renderizada sin recrear el elemento columna.
     */
    private _refreshColumnCards;
    private _getColumnCounts;
    /** Resuelve los objetos Label para una tarea a partir del caché local (US-10). */
    private _getTaskLabels;
    /** Añade una etiqueta recién creada al caché local para que los chips se muestren sin recargar (US-10). */
    private _handleLabelCreated;
    private _filterTasks;
    /** Actualiza los conteos en las columnas ya renderizadas sin re-renderizar. */
    private _updateColumnCounts;
    /**
     * Maneja `dojo:column-drop` para mover tareas entre columnas o reordenarlas
     * dentro de la misma. Detecta el tipo de operación por comparación de columnId.
     */
    private _handleTaskDrop;
    /**
     * Calcula el array de IDs resultante al mover `movingId` antes de `beforeId`.
     * Si `beforeId` es null, la tarea se añade al final.
     */
    private _computeReorderedIds;
    /**
     * Inserta `task` en `tasks` antes del elemento con id `beforeId`.
     * Si `beforeId` es null o no existe, inserta al final.
     */
    private _insertAtPosition;
    private _getDialog;
    private _getTaskDialog;
    private _getTaskDetail;
    private _getDeleteDialog;
    private _onAddColumnRequest;
    private _onColumnRenameRequest;
    private _onColumnDeleteRequest;
    private _handleCreate;
    private _handleRename;
    private _handleDelete;
    private _handleReorder;
    private _onAddTaskRequest;
    private _handleCreateTask;
    private _onTaskOpen;
    private _handleTaskFieldUpdated;
    private _onTaskDeleteRequest;
    private _handleTaskDeleteConfirm;
}
export {};
