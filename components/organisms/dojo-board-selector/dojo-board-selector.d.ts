/**
 * dojo-board-selector — Organismo
 *
 * Pantalla de selección de tableros. Muestra una grid con los tableros
 * disponibles y permite crear, renombrar y eliminar tableros.
 *
 * ## Eventos despachados
 * | Nombre                  | Detalle           | Descripción                       |
 * |-------------------------|-------------------|-----------------------------------|
 * | dojo:board-selected     | { boardId }       | Usuario seleccionó un tablero     |
 * | dojo:boards-changed     | —                 | Tablero creado/eliminado/editado  |
 *
 * ## CSS Custom Properties
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-radius,
 * --dojo-text-primary, --dojo-text-secondary, --dojo-primary, --dojo-shadow
 */
export declare class DojoBoardSelector extends HTMLElement {
    static readonly TAG = "dojo-board-selector";
    private _shadow;
    private _boards;
    constructor();
    connectedCallback(): void;
    /** Recarga la lista de tableros externamente. */
    refresh(): Promise<void>;
    private _loadBoards;
    private _render;
    private _renderBoardGrid;
    private _createBoardCard;
    private _showCreateForm;
    private _showRenameForm;
    private _pendingDeleteId;
    private _showDeleteDialog;
    private _showDeleteDialogUI;
    private _hideDeleteDialog;
    /** Focus trap + Escape para el diálogo de eliminación (WCAG 2.1 SC 2.1.2). */
    private _onDeleteKeydown;
    private _confirmDelete;
}
