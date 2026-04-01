/**
 * theme.ts — Gestión del tema (claro / oscuro / sistema)
 *
 * Responsabilidades:
 *   1. Leer/escribir la preferencia del usuario en `localStorage`.
 *   2. Resolver el tema efectivo (light | dark) según la preferencia.
 *   3. Aplicar el atributo `data-theme` en `<html>`.
 *   4. Escuchar cambios dinámicos de `prefers-color-scheme` del SO.
 *
 * Clave en localStorage: `theme-preference`
 * Valores posibles: 'light' | 'dark' | 'system'
 */
export type ThemePreference = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';
/**
 * Lee la preferencia almacenada en localStorage.
 * Devuelve 'system' si no hay valor guardado o el valor es inválido.
 */
export declare function getThemePreference(): ThemePreference;
/**
 * Persiste la preferencia y aplica el tema inmediatamente.
 */
export declare function setThemePreference(preference: ThemePreference): void;
/**
 * Resuelve el tema efectivo que debe mostrarse (light o dark).
 */
export declare function resolveEffectiveTheme(preference: ThemePreference): EffectiveTheme;
/**
 * Inicializa el gestor de tema: aplica el tema almacenado y
 * registra el listener para cambios dinámicos del SO.
 * Debe llamarse una sola vez durante el bootstrap de la app.
 */
export declare function initTheme(): void;
