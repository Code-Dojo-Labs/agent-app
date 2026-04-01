/**
 * dojo-column-header — Átomo
 *
 * Cabecera de una columna del tablero Kanban.
 * Muestra el ícono, el nombre y el conteo de tareas de la columna.
 *
 * Cuando hay filtros activos, el conteo se muestra en formato "visibles / totales".
 *
 * ## Atributos observados
 * | Atributo      | Tipo   | Descripción                                         |
 * |---------------|--------|-----------------------------------------------------|
 * | icon          | string | Emoji o carácter que representa el estado           |
 * | column-name   | string | Nombre visible de la columna                        |
 * | count         | number | Número de tareas visibles                           |
 * | total-count   | number | Total de tareas (sin filtro). Si omitido = count    |
 * | accent-color  | string | Color hex de acento opcional (borde superior)       |
 *
 * ## Eventos despachados
 * Ninguno en esta versión.
 *
 * ## CSS Custom Properties heredadas
 * --dojo-text-primary, --dojo-text-secondary, --dojo-surface, --dojo-border,
 * --dojo-radius, --dojo-bg
 */
export declare class DojoColumnHeader extends HTMLElement {
    static readonly TAG = "dojo-column-header";
    static get observedAttributes(): string[];
    private _shadow;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    private get _icon();
    private get _columnName();
    private get _count();
    private get _totalCount();
    private get _accentColor();
    private _render;
}
