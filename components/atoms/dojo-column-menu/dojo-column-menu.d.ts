/**
 * dojo-column-menu — Átomo
 *
 * Botón ⋮ con menú contextual flotante para acciones de columna.
 * Admite las acciones "Renombrar" y "Eliminar".
 *
 * ## Atributos observados
 * Ninguno — es un componente puramente interactivo.
 *
 * ## Eventos despachados
 * | Nombre                    | Detalle | Descripción                        |
 * |---------------------------|---------|------------------------------------|
 * | dojo:column-rename        | —       | El usuario elige "Renombrar"       |
 * | dojo:column-delete        | —       | El usuario elige "Eliminar"        |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-surface, --dojo-border, --dojo-text-primary, --dojo-text-secondary,
 * --dojo-radius, --dojo-shadow, --dojo-danger (fallback: #DC2626)
 */
export declare class DojoColumnMenu extends HTMLElement {
    static readonly TAG = "dojo-column-menu";
    private _shadow;
    private _open;
    private _onDocClick;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    private _render;
    private _createMenuItem;
    private _toggle;
    private _openMenu;
    private _close;
}
