/**
 * dojo-delete-confirm-dialog — Organismo
 *
 * Diálogo modal de confirmación para eliminar una tarea.
 * Implementa los criterios de aceptación de US-06 (Eliminar tarea).
 *
 * ## API Pública
 * | Método                          | Descripción                                 |
 * |---------------------------------|---------------------------------------------|
 * | show(taskId, taskTitle): void   | Abre el diálogo con el título de la tarea   |
 * | hide(): void                    | Cierra el diálogo sin confirmar             |
 *
 * ## Eventos despachados
 * | Nombre                    | Detalle       | Descripción                     |
 * |---------------------------|---------------|---------------------------------|
 * | dojo:task-delete-confirm  | { taskId }    | Usuario confirmó la eliminación |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-primary, --dojo-radius, --dojo-radius-sm, --dojo-shadow
 */
export declare class DojoDeleteConfirmDialog extends HTMLElement {
    static readonly TAG = "dojo-delete-confirm-dialog";
    private _shadow;
    private _taskId;
    /** Elemento que abrió el diálogo — el foco regresa aquí al cerrar (WCAG 2.1 SC 2.4.3). */
    private _triggerEl;
    /** Referencia estable para poder eliminar el listener de teclado. */
    private _onDocKeydown;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    show(taskId: string, taskTitle: string, triggerEl?: HTMLElement): void;
    hide(): void;
    private _isOpen;
    private _getFocusable;
    private _render;
}
