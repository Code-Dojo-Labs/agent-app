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

import {
  type ThemePreference,
  getThemePreference,
  setThemePreference,
  resolveEffectiveTheme,
} from '../../../utils/theme.js';

const OPTIONS: readonly { value: ThemePreference; icon: string; label: string }[] = [
  { value: 'light', icon: '☀️', label: 'Claro' },
  { value: 'dark', icon: '🌙', label: 'Oscuro' },
  { value: 'system', icon: '💻', label: 'Sistema' },
];

export class DojoThemeToggle extends HTMLElement {
  static readonly TAG = 'dojo-theme-toggle';

  private _shadow: ShadowRoot;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (this._shadow.childElementCount > 0) return;
    this._render();
  }

  private _render(): void {
    const current = getThemePreference();

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-flex;
      }

      .toggle-group {
        display: inline-flex;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        overflow: hidden;
        background: var(--dojo-surface);
      }

      .toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        border: none;
        background: transparent;
        color: var(--dojo-text-secondary);
        font-size: 0.75rem;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
        white-space: nowrap;
        line-height: 1.2;
      }
      .toggle-btn:not(:last-child) {
        border-right: 1px solid var(--dojo-border);
      }
      .toggle-btn:hover {
        background: var(--dojo-surface-hover, #F7F8FA);
        color: var(--dojo-text-primary);
      }
      .toggle-btn[aria-pressed="true"] {
        background: var(--dojo-primary, #1D4ED8);
        color: var(--dojo-text-on-primary);
      }
      .toggle-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: -2px;
        z-index: 1;
      }

      .toggle-icon {
        font-size: 0.8125rem;
        line-height: 1;
      }
    `;
    this._shadow.appendChild(style);

    const group = document.createElement('div');
    group.className = 'toggle-group';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Selector de tema');

    for (const opt of OPTIONS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toggle-btn';
      btn.setAttribute('aria-pressed', String(opt.value === current));
      btn.setAttribute('aria-label', opt.label);
      btn.dataset.value = opt.value;

      const icon = document.createElement('span');
      icon.className = 'toggle-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = opt.icon;

      const label = document.createElement('span');
      label.textContent = opt.label;

      btn.appendChild(icon);
      btn.appendChild(label);
      group.appendChild(btn);

      btn.addEventListener('click', () => this._onSelect(opt.value));
    }

    this._shadow.appendChild(group);
  }

  private _onSelect(preference: ThemePreference): void {
    setThemePreference(preference);

    // Actualizar estados aria-pressed
    const buttons = this._shadow.querySelectorAll('.toggle-btn');
    buttons.forEach((btn) => {
      const el = btn as HTMLButtonElement;
      el.setAttribute('aria-pressed', String(el.dataset.value === preference));
    });

    this.dispatchEvent(
      new CustomEvent('dojo:theme-changed', {
        bubbles: true,
        composed: true,
        detail: {
          preference,
          effective: resolveEffectiveTheme(preference),
        },
      }),
    );
  }
}

customElements.define(DojoThemeToggle.TAG, DojoThemeToggle);
