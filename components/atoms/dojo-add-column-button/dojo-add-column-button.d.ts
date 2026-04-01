/**
 * dojo-add-column-button — Átomo
 *
 * Botón "Añadir columna" que aparece al final del tablero.
 *
 * ## Eventos despachados
 * | Nombre              | Detalle | Descripción                      |
 * |---------------------|---------|----------------------------------|
 * | dojo:add-column     | —       | El usuario solicita agregar col. |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-border, --dojo-text-secondary, --dojo-surface, --dojo-radius,
 * --dojo-primary, --dojo-text-primary
 */
export declare class DojoAddColumnButton extends HTMLElement {
    static readonly TAG = "dojo-add-column-button";
    private _shadow;
    constructor();
    connectedCallback(): void;
    private _render;
}
