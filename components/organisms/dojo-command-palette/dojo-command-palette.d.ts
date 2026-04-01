/**
 * dojo-command-palette — Paleta de comandos global (US-28)
 *
 * Se abre con Cmd/Ctrl+K. Busca tareas por título y descripción con
 * ordenamiento por relevancia (título > descripción). Soporta navegación
 * por teclado (↑/↓, Enter, Escape) y creación rápida de tareas.
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*, --dojo-primary,
 * --dojo-shadow, --dojo-radius
 */
export declare class DojoCommandPalette extends HTMLElement {
    static readonly TAG = "dojo-command-palette";
    private _shadow;
    private _tasks;
    private _results;
    private _selectedIndex;
    private _debounceTimer;
    /** Elemento que tenía el foco antes de abrir la paleta. */
    private _previousFocus;
    /** ID del tablero activo para filtrar tareas. */
    private _boardId;
    /** Indica que el caché de tareas debe refrescarse en la próxima apertura. */
    private _cacheDirty;
    private _input;
    private _listEl;
    private _emptyEl;
    private _createOption;
    private _onDocKeydown;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Configura el ID del tablero activo (filtra tareas). */
    set boardId(id: string);
    /** Marca el caché de tareas como sucio para refrescarlo en la próxima apertura. */
    invalidateCache(): void;
    /** Abre la paleta y carga las tareas. */
    show(): Promise<void>;
    /** Cierra la paleta y devuelve el foco al elemento anterior. */
    hide(): void;
    private _onInput;
    private _search;
    private _moveSelection;
    /** Cuenta total: resultados + opción "crear" (si visible). */
    private _getSelectableCount;
    private _confirmSelection;
    private _dispatchSelectTask;
    private _dispatchCreateTask;
    private _render;
    private _renderResults;
    private _updateActiveDescendant;
}
