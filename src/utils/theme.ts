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

// ── Tipos ──────────────────────────────────────────────────────────────────

export type ThemePreference = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

// ── Constantes ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'theme-preference';
const VALID_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

// ── Estado interno ─────────────────────────────────────────────────────────

let _mediaQuery: MediaQueryList | null = null;
let _mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

// ── Funciones públicas ─────────────────────────────────────────────────────

/**
 * Lee la preferencia almacenada en localStorage.
 * Devuelve 'system' si no hay valor guardado o el valor es inválido.
 */
export function getThemePreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && VALID_PREFERENCES.includes(stored as ThemePreference)) {
    return stored as ThemePreference;
  }
  return 'system';
}

/**
 * Persiste la preferencia y aplica el tema inmediatamente.
 */
export function setThemePreference(preference: ThemePreference): void {
  localStorage.setItem(STORAGE_KEY, preference);
  _applyTheme(preference);
}

/**
 * Resuelve el tema efectivo que debe mostrarse (light o dark).
 */
export function resolveEffectiveTheme(preference: ThemePreference): EffectiveTheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return _getSystemTheme();
}

/**
 * Inicializa el gestor de tema: aplica el tema almacenado y
 * registra el listener para cambios dinámicos del SO.
 * Debe llamarse una sola vez durante el bootstrap de la app.
 */
export function initTheme(): void {
  const preference = getThemePreference();
  _applyTheme(preference);
}

// ── Funciones privadas ─────────────────────────────────────────────────────

function _getSystemTheme(): EffectiveTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function _applyTheme(preference: ThemePreference): void {
  const effective = resolveEffectiveTheme(preference);
  document.documentElement.setAttribute('data-theme', effective);

  // Gestionar listener de cambios dinámicos del SO
  _removeMediaListener();

  if (preference === 'system') {
    _addMediaListener();
  }
}

function _addMediaListener(): void {
  _mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  _mediaListener = (e: MediaQueryListEvent) => {
    const effective: EffectiveTheme = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', effective);
  };
  _mediaQuery.addEventListener('change', _mediaListener);
}

function _removeMediaListener(): void {
  if (_mediaQuery && _mediaListener) {
    _mediaQuery.removeEventListener('change', _mediaListener);
    _mediaQuery = null;
    _mediaListener = null;
  }
}
