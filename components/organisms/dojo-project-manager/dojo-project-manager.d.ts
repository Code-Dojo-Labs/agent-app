/**
 * dojo-project-manager — Organismo
 *
 * Panel lateral para gestionar los proyectos existentes (US-26).
 * Permite crear, editar nombre/descripción y eliminar proyectos.
 * Los cambios se persisten en IndexedDB y se propagan al tablero
 * mediante eventos personalizados.
 *
 * ## API pública
 * | Método  | Descripción                                          |
 * |---------|----------------------------------------------------- |
 * | show()  | Abre el panel y carga los proyectos desde IndexedDB  |
 * | hide()  | Cierra el panel                                      |
 *
 * ## Eventos despachados
 * | Nombre                | Detalle         | Descripción                         |
 * |-----------------------|-----------------|-------------------------------------|
 * | dojo:project-created  | { project }     | Proyecto creado en IndexedDB        |
 * | dojo:project-updated  | { project }     | Proyecto actualizado en IndexedDB   |
 * | dojo:project-deleted  | { projectId }   | Proyecto eliminado de IndexedDB     |
 *
 * ## Atributos observados
 * | Atributo | Valores          | Descripción       |
 * |----------|------------------|--------------------|
 * | open     | presente/ausente | Panel visible      |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-primary, --dojo-shadow, --dojo-radius
 */
export declare class DojoProjectManager extends HTMLElement {
    static readonly TAG = "dojo-project-manager";
    static get observedAttributes(): string[];
    private _shadow;
    private _projects;
    private _editingId;
    private _deletingId;
    private _creating;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void;
    show(): Promise<void>;
    hide(): void;
    private _render;
    private _buildContent;
    private _buildCreateForm;
    private _buildProjectRow;
    private _buildEditForm;
    private _buildDeleteConfirm;
}
