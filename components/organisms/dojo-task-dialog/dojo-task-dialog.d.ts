/**
 * dojo-task-dialog — Organismo
 *
 * Diálogo modal para crear tareas en el tablero Kanban.
 * Implementa los criterios de aceptación de US-04 y US-23.
 *
 * ## API Pública
 * | Método                          | Descripción                              |
 * |---------------------------------|------------------------------------------|
 * | openCreate(columnId, colName)   | Abre el formulario de creación de tarea  |
 *
 * ## Eventos despachados
 * | Nombre                    | Detalle                                                 | Descripción           |
 * |---------------------------|---------------------------------------------------------|-----------------------|
 * | dojo:dialog-create-task   | { statusId, title, description, priority, labelIds }    | Usuario confirmó crear|
 *
 * ## Validaciones (US-04)
 * - Título obligatorio (no vacío)
 * - Título máximo 120 caracteres (impide entrada + muestra error)
 * - Prioridad por defecto: "medium"
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*, --dojo-primary,
 * --dojo-danger, --dojo-radius, --dojo-radius-sm, --dojo-shadow
 */
export declare class DojoTaskDialog extends HTMLElement {
    static readonly TAG = "dojo-task-dialog";
    private _shadow;
    private _columnId;
    private _columnName;
    private _allLabels;
    private _selectedLabelIds;
    private _allProjects;
    private _prefillTitle;
    private _onDocKeydown;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    openCreate(columnId: string, columnName: string, prefillTitle?: string): void;
    private _isOpen;
    private _open;
    private _close;
    private _render;
    private _buildForm;
}
