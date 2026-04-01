/**
 * dojo-theme-toggle — Átomo selector de tema
 *
 * Control segmentado con tres opciones: ☀️ Claro / 🌙 Oscuro / 💻 Sistema.
 * Persiste la preferencia en localStorage y aplica el tema inmediatamente.
 *
 * ## Eventos emitidos
 * - `dojo:theme-changed` → `{ preference: ThemePreference, effective: EffectiveTheme }`
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-primary,
 * --dojo-text-secondary, --dojo-primary, --dojo-radius-sm
 */
export declare class DojoThemeToggle extends HTMLElement {
    static readonly TAG = "dojo-theme-toggle";
    private _shadow;
    constructor();
    connectedCallback(): void;
    private _render;
    private _onSelect;
}
