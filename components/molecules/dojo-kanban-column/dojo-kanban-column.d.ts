/**
 * dojo-kanban-column — Molécula
 *
 * Columna del tablero Kanban con scroll vertical independiente.
 * Contiene un `<dojo-column-header>`, un botón de menú contextual ⋮
 * y una zona de contenido (slot) donde se colocarán las tarjetas de tareas.
 *
 * ## Atributos observados
 * | Atributo      | Tipo   | Descripción                                         |
 * |---------------|--------|-----------------------------------------------------|
 * | column-id     | string | ID de la columna en IndexedDB                       |
 * | column-name   | string | Nombre visible de la columna                        |
 * | icon          | string | Emoji representativo del estado                     |
 * | count         | number | Número de tareas visibles en la columna             |
 * | total-count   | number | Total de tareas sin filtro (opcional)               |
 * | accent-color  | string | Color hex de acento opcional                        |
 *
 * ## Slots
 * | Nombre  | Descripción                                                  |
 * |---------|--------------------------------------------------------------|
 * (default) | Tarjetas de tarea (`<dojo-task-card>`) proyectadas aquí      |
 *
 * ## Eventos despachados
 * | Nombre               | Detalle                                         | Descripción                    |
 * |----------------------|-------------------------------------------------|--------------------------------|
 * | dojo:column-drop     | { columnId, taskId, beforeTaskId: string|null } | Tarea dropeada en la columna   |
 * | dojo:column-rename   | { columnId }                                    | Usuario eligió "Renombrar"     |
 * | dojo:column-delete   | { columnId }                                    | Usuario eligió "Eliminar"      |
 * | dojo:column-reorder  | { sourceId, targetId }                          | Columna arrastrada a posición  |
 * | dojo:add-task        | { columnId }                                    | Usuario quiere crear una tarea |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-surface, --dojo-border, --dojo-radius, --dojo-bg, --dojo-shadow
 */
import '../../atoms/dojo-column-header/dojo-column-header.js';
import '../../atoms/dojo-column-menu/dojo-column-menu.js';
import '../../atoms/dojo-add-task-button/dojo-add-task-button.js';
export declare class DojoKanbanColumn extends HTMLElement {
    static readonly TAG = "dojo-kanban-column";
    static get observedAttributes(): string[];
    private _shadow;
    /** ID de la tarjeta ante la cual se soltará la tarea en curso (null = al final) */
    private _dropBeforeId;
    /** Último valor enviado a _setDropIndicator para evitar mutaciones DOM redundantes */
    private _lastDropIndicatorId;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    get columnId(): string;
    private get _name();
    private get _icon();
    private get _count();
    private get _totalCount();
    private get _accentColor();
    private _render;
    private _updateHeader;
    private _onColumnDragStart;
    private _onColumnDragEnd;
    private _onColumnDragOver;
    private _onColumnDragLeave;
    private _onColumnDrop;
    private _attachColumnDragListeners;
    private _onDragOver;
    private _onDragLeave;
    private _onDrop;
    /**
     * Calcula ante qué tarjeta se soltará la tarea arrastrada.
     * Cuando el puntero está por encima del centro de una tarjeta,
     * se inserta antes de esa tarjeta; si está debajo del centro de
     * la última tarjeta, se inserta al final (retorna null).
     */
    private _getDropBeforeId;
    /** Pone el indicador de drop en la tarjeta correcta. */
    private _setDropIndicator;
    /** Elimina todos los indicadores de drop de las tarjetas asignadas al slot. */
    private _clearDropIndicators;
    private _attachDragListeners;
    private _detachDragListeners;
}
