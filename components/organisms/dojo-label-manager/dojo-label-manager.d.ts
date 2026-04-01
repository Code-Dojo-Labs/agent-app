/**
 * dojo-label-manager — Organismo
 *
 * Panel lateral para gestionar las etiquetas existentes.
 * Permite editar el nombre y el color de cualquier etiqueta.
 * Los cambios se persisten en IndexedDB y se propagan al tablero
 * mediante el evento `dojo:label-updated`.
 *
 * ## API pública
 * | Método  | Descripción                                        |
 * |---------|----------------------------------------------------|
 * | show()  | Abre el panel y carga las etiquetas desde IndexedDB|
 * | hide()  | Cierra el panel                                    |
 *
 * ## Eventos despachados
 * | Nombre              | Detalle       | Descripción                         |
 * |---------------------|---------------|-------------------------------------|
 * | dojo:label-updated  | { label }     | Etiqueta actualizada en IndexedDB   |
 *
 * ## Atributos observados
 * | Atributo | Valores      | Descripción        |
 * |----------|--------------|--------------------|
 * | open     | presente/ausente | Panel visible  |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-primary, --dojo-shadow, --dojo-radius
 */
export declare class DojoLabelManager extends HTMLElement {
    static readonly TAG = "dojo-label-manager";
    static get observedAttributes(): string[];
    private _shadow;
    private _labels;
    private _editingId;
    private _deletingId;
    private _deletingAffectedCount;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void;
    show(): Promise<void>;
    hide(): void;
    private _render;
    private _buildContent;
    private _buildLabelRow;
    private _buildDeleteConfirm;
    private _buildEditForm;
}
