/**
 * dojo-person-avatar — Átomo avatar de persona
 *
 * Muestra el avatar (emoji o inicial) de una persona asignada a tareas.
 * Soporta tooltips con el nombre completo y indicating si es emoji o inicial generada.
 *
 * ## Atributos
 * - `avatar`  → string  — emoji o inicial(es) de la persona
 * - `name`    → string  — nombre completo para tooltip
 * - `size`    → 'sm' | 'md' | 'lg' — tamaño del avatar (default: 'md')
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-primary,
 * --dojo-radius-sm, --dojo-primary
 */
export declare class DojoPersonAvatar extends HTMLElement {
    static readonly TAG = "dojo-person-avatar";
    private _shadow;
    constructor();
    connectedCallback(): void;
    static get observedAttributes(): string[];
    attributeChangedCallback(): void;
    get avatar(): string;
    set avatar(value: string);
    get name(): string;
    set name(value: string);
    get size(): 'sm' | 'md' | 'lg';
    set size(value: 'sm' | 'md' | 'lg');
    private _render;
    /**
     * Detecta si un string contiene emojis.
     * Regex simplificado que cubre la mayoría de emojis Unicode.
     */
    private _isEmoji;
}
