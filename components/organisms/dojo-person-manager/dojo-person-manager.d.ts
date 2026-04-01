/**
 * dojo-person-manager — Organismo
 *
 * Panel lateral para gestionar el directorio local de personas.
 * Permite crear, editar y eliminar personas que pueden asignarse a tareas.
 * Los cambios se persisten en IndexedDB y se propagan mediante eventos.
 *
 * ## API pública
 * | Método  | Descripción                                        |
 * |---------|----------------------------------------------------|
 * | show()  | Abre el panel y carga las personas desde IndexedDB|
 * | hide()  | Cierra el panel                                    |
 *
 * ## Eventos despachados
 * | Nombre              | Detalle       | Descripción                         |
 * |---------------------|---------------|-------------------------------------|
 * | dojo:person-created | { person }    | Persona creada en IndexedDB         |
 * | dojo:person-updated | { person }    | Persona actualizada en IndexedDB    |
 * | dojo:person-deleted | { personId }  | Persona eliminada de IndexedDB      |
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
export declare class DojoPersonManager extends HTMLElement {
    static readonly TAG = "dojo-person-manager";
    static get observedAttributes(): string[];
    private _shadow;
    private _persons;
    private _editingId;
    private _deletingId;
    private _deletingAffectedCount;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void;
    /** Abre el panel y carga las personas desde IndexedDB. */
    show(): void;
    /** Cierra el panel. */
    hide(): void;
    /** Refresca la lista de personas desde IndexedDB (para sincronización). */
    refresh(): Promise<void>;
    /** Carga todas las personas desde IndexedDB y re-renderiza la lista. */
    private _loadPersons;
    /** Maneja la creación de una nueva persona. */
    private _handleCreatePerson;
    /** Maneja la actualización de una persona existente. */
    private _handleUpdatePerson;
    /** Calcula cuántas tareas tiene asignadas una persona. */
    private _countTasksForPerson;
    /** Maneja la eliminación de una persona (con confirmación). */
    private _handleDeletePerson;
    /** Confirma la eliminación de una persona. */
    private _confirmDeletePerson;
    /** Cancela la eliminación de una persona. */
    private _cancelDeletePerson;
    private _render;
    /** Configura los event listeners del panel. */
    private _setupEventListeners;
    /** Genera la grilla de avatares predeterminados. */
    private _generateAvatarGrid;
    /** Re-renderiza la lista de personas. */
    private _renderPersonList;
}
