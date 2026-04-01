/**
 * dojo-add-task-button — Átomo
 *
 * Botón compacto "＋ Agregar tarea" situado al pie de cada columna del tablero.
 * Al ser activado (clic o teclado) emite el evento `dojo:add-task` con el
 * `columnId` que toma del atributo `column-id` del elemento padre más cercano.
 *
 * ## Atributos observados
 * | Atributo   | Tipo   | Descripción                         |
 * |------------|--------|-------------------------------------|
 * | column-id  | string | ID de la columna a la que pertenece |
 *
 * ## Eventos despachados
 * | Nombre        | Detalle        | Descripción                        |
 * |---------------|----------------|------------------------------------|
 * | dojo:add-task | { columnId }   | Usuario solicitó crear nueva tarea |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-border, --dojo-text-muted, --dojo-primary, --dojo-radius-sm
 */
export declare class DojoAddTaskButton extends HTMLElement {
    static readonly TAG = "dojo-add-task-button";
    static get observedAttributes(): string[];
    private _shadow;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    get columnId(): string;
    private _render;
}
