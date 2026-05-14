/**
 * dojo-theme-customizer.ts — Panel de personalización del color primario (US-43 / IMP-12).
 *
 * Permite al usuario elegir un color de marca custom que reemplaza --dojo-primary
 * y sus variantes derivadas. La selección se persiste en localStorage.
 *
 * Arquitectura:
 *   - Shadow DOM aislado.
 *   - Sin dependencias externas.
 *   - Modifica CSS Custom Properties en :root vía JS para propagación instantánea.
 *   - Deriva automáticamente el hover (ligero oscurecimiento) del color elegido.
 *
 * Almacenamiento (localStorage):
 *   Key: 'dojo-primary-color'   Value: string hex (#RRGGBB)
 *
 * API pública:
 *   Attribute  open             — Booleano; muestra/oculta el panel.
 *   Method     open()           — Abre el panel.
 *   Method     close()          — Cierra el panel.
 *
 * Eventos:
 *   'dojo-theme-change'  — detail: { primary: string }  — disparado al cambiar color.
 *   'dojo-theme-reset'   — detail: null                 — disparado al resetear.
 */

const STORAGE_KEY = 'dojo-primary-color';

/** Paleta de presets predefinidos */
const COLOR_PRESETS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Índigo (por defecto)', value: '#1D4ED8' },
  { label: 'Violeta',              value: '#7C3AED' },
  { label: 'Fucsia',               value: '#C026D3' },
  { label: 'Rosa',                 value: '#E11D48' },
  { label: 'Naranja',              value: '#EA580C' },
  { label: 'Esmeralda',            value: '#059669' },
  { label: 'Cian',                 value: '#0891B2' },
  { label: 'Gris pizarra',         value: '#475569' },
];

const DEFAULT_PRIMARY = '#1D4ED8';

/**
 * Calcula el color hover oscureciendo el hex en un factor dado.
 * Retorna un hex string.
 */
function darkenHex(hex: string, factor: number = 0.12): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - factor)));
  const g = Math.max(0, Math.round(((n >> 8)  & 0xff) * (1 - factor)));
  const b = Math.max(0, Math.round(( n        & 0xff) * (1 - factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Aplica el color primario y su hover en :root. */
function applyPrimaryColor(primary: string): void {
  const root = document.documentElement;
  root.style.setProperty('--dojo-primary',       primary);
  root.style.setProperty('--dojo-primary-hover',  darkenHex(primary));
  root.style.setProperty('--dojo-primary-focus',  primary + '4D'); /* 30% opacidad aproximada */
}

/** Restaura el color desde localStorage (llamar en bootstrap). */
export function restoreThemeCustomization(): void {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) applyPrimaryColor(saved);
}

export class DojoThemeCustomizer extends HTMLElement {
  static readonly TAG = 'dojo-theme-customizer';

  private _shadow: ShadowRoot;
  private _onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.close();
  };

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes(): string[] { return ['open']; }

  attributeChangedCallback(name: string, _old: string | null, next: string | null): void {
    if (name === 'open') {
      const isOpen = next !== null;
      this._shadow.querySelector('.panel')?.setAttribute('aria-hidden', String(!isOpen));
      if (isOpen) {
        document.addEventListener('keydown', this._onKeyDown);
      } else {
        document.removeEventListener('keydown', this._onKeyDown);
      }
    }
  }

  connectedCallback(): void {
    this._render();
    this._shadow.addEventListener('click', this._handleClick.bind(this));
    this._shadow.querySelector('input[type="color"]')
      ?.addEventListener('input', this._handleColorInput.bind(this));
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this._onKeyDown);
  }

  open(): void  { this.setAttribute('open', ''); }
  close(): void { this.removeAttribute('open'); }

  // ── Handlers ────────────────────────────────────────────────────

  private _handleClick(e: Event): void {
    const target = e.target as HTMLElement;

    // Cerrar
    if (target.closest('.btn-close') || target.classList.contains('backdrop')) {
      this.close();
      return;
    }

    // Preset
    const presetBtn = target.closest<HTMLButtonElement>('.preset-btn');
    if (presetBtn?.dataset.color) {
      this._applyAndSave(presetBtn.dataset.color);
      this._syncPickerValue(presetBtn.dataset.color);
      return;
    }

    // Reset
    if (target.closest('.btn-reset')) {
      localStorage.removeItem(STORAGE_KEY);
      applyPrimaryColor(DEFAULT_PRIMARY);
      this._syncPickerValue(DEFAULT_PRIMARY);
      this._updateActivePreset(DEFAULT_PRIMARY);
      this.dispatchEvent(new CustomEvent('dojo-theme-reset', { bubbles: true, composed: true }));
    }
  }

  private _handleColorInput(e: Event): void {
    const value = (e.target as HTMLInputElement).value;
    this._applyAndSave(value);
    this._updateActivePreset(value);
  }

  private _applyAndSave(color: string): void {
    applyPrimaryColor(color);
    localStorage.setItem(STORAGE_KEY, color);
    this._updateActivePreset(color);
    this.dispatchEvent(new CustomEvent('dojo-theme-change', {
      bubbles: true,
      composed: true,
      detail: { primary: color },
    }));
  }

  private _syncPickerValue(color: string): void {
    const picker = this._shadow.querySelector<HTMLInputElement>('input[type="color"]');
    if (picker) picker.value = color;
  }

  private _updateActivePreset(color: string): void {
    this._shadow.querySelectorAll<HTMLButtonElement>('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color?.toLowerCase() === color.toLowerCase());
      btn.setAttribute('aria-pressed', String(btn.dataset.color?.toLowerCase() === color.toLowerCase()));
    });
  }

  // ── Render ───────────────────────────────────────────────────────

  private _render(): void {
    const saved = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_PRIMARY;

    this._shadow.innerHTML = `
      <style>
        :host { display: contents; }

        .backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.4);
          z-index: var(--z-overlay, 300);
          display: none;
        }
        :host([open]) .backdrop { display: block; }

        .panel {
          position: fixed;
          top: 0; right: 0;
          height: 100%;
          width: var(--customizer-width, 280px);
          background: var(--customizer-bg, var(--dojo-surface));
          border-left: 1px solid var(--customizer-border, var(--dojo-border));
          box-shadow: var(--customizer-shadow, var(--dojo-shadow-md));
          z-index: calc(var(--z-overlay, 300) + 1);
          display: flex; flex-direction: column;
          transform: translateX(100%);
          transition: transform var(--dojo-transition, 200ms ease);
          overflow-y: auto;
        }
        :host([open]) .panel { transform: translateX(0); }

        .panel-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: var(--space-4, 16px);
          border-bottom: 1px solid var(--dojo-border);
          position: sticky; top: 0;
          background: var(--customizer-bg, var(--dojo-surface));
          z-index: 1;
        }
        .panel-header h2 {
          font-size: var(--font-size-base, 1rem);
          font-weight: var(--font-weight-semibold, 600);
          color: var(--dojo-text-primary);
          margin: 0;
        }
        .btn-close {
          background: none; border: none; cursor: pointer;
          color: var(--dojo-text-secondary);
          padding: var(--space-1, 4px);
          border-radius: var(--dojo-radius-sm);
          font-size: var(--font-size-lg, 1.125rem);
          line-height: 1;
          transition: color var(--dojo-transition, 200ms ease);
        }
        .btn-close:hover { color: var(--dojo-text-primary); }
        .btn-close:focus-visible {
          outline: 2px solid var(--dojo-primary);
          outline-offset: 2px;
        }

        .panel-body { padding: var(--space-4, 16px); flex: 1; display: flex; flex-direction: column; gap: var(--space-6, 24px); }

        section h3 {
          font-size: var(--font-size-xs, 0.75rem);
          font-weight: var(--font-weight-semibold, 600);
          text-transform: uppercase;
          letter-spacing: .05em;
          color: var(--dojo-text-secondary);
          margin: 0 0 var(--space-3, 12px);
        }

        /* ── Color picker ── */
        .color-picker-row {
          display: flex; align-items: center; gap: var(--space-3, 12px);
        }
        .color-swatch {
          width: 40px; height: 40px;
          border-radius: var(--dojo-radius-sm);
          border: 1px solid var(--dojo-border);
          overflow: hidden; cursor: pointer; flex-shrink: 0;
          position: relative;
        }
        .color-swatch input[type="color"] {
          position: absolute; inset: -4px;
          width: calc(100% + 8px); height: calc(100% + 8px);
          border: none; padding: 0; cursor: pointer; opacity: 0;
        }
        .color-swatch-preview {
          width: 100%; height: 100%;
          background: var(--dojo-primary);
          pointer-events: none;
        }
        .color-picker-label {
          font-size: var(--font-size-sm, 0.875rem);
          color: var(--dojo-text-primary);
        }
        .color-picker-label span {
          display: block;
          font-size: var(--font-size-xs, 0.75rem);
          color: var(--dojo-text-muted);
        }

        /* ── Presets ── */
        .preset-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-2, 8px);
        }
        .preset-btn {
          aspect-ratio: 1;
          border-radius: var(--dojo-radius-sm);
          border: 2px solid transparent;
          cursor: pointer; padding: 0;
          transition: border-color var(--dojo-transition, 200ms ease),
                      transform var(--dojo-transition, 200ms ease);
          position: relative;
        }
        .preset-btn:hover { transform: scale(1.1); }
        .preset-btn.active { border-color: var(--dojo-text-primary); }
        .preset-btn.active::after {
          content: '✓';
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          color: var(--dojo-text-on-primary);
          font-size: var(--font-size-sm, 0.875rem);
          font-weight: var(--font-weight-bold, 700);
          text-shadow: 0 1px 2px rgba(0,0,0,.4);
        }
        .preset-btn:focus-visible {
          outline: 2px solid var(--dojo-primary);
          outline-offset: 2px;
        }
        .preset-label {
          font-size: var(--font-size-xs, 0.75rem);
          color: var(--dojo-text-muted);
          text-align: center;
          margin-top: var(--space-1, 4px);
        }

        /* ── Footer / Reset ── */
        .panel-footer {
          padding: var(--space-4, 16px);
          border-top: 1px solid var(--dojo-border);
          position: sticky; bottom: 0;
          background: var(--customizer-bg, var(--dojo-surface));
        }
        .btn-reset {
          width: 100%;
          padding: var(--space-2, 8px) var(--space-4, 16px);
          background: none;
          border: 1px solid var(--dojo-border);
          border-radius: var(--dojo-radius-sm);
          color: var(--dojo-text-secondary);
          font-size: var(--font-size-sm, 0.875rem);
          cursor: pointer;
          transition: background var(--dojo-transition, 200ms ease),
                      color var(--dojo-transition, 200ms ease);
        }
        .btn-reset:hover {
          background: var(--dojo-surface-hover);
          color: var(--dojo-text-primary);
        }
        .btn-reset:focus-visible {
          outline: 2px solid var(--dojo-primary);
          outline-offset: 2px;
        }
      </style>

      <div class="backdrop" role="presentation"></div>

      <div
        class="panel"
        role="dialog"
        aria-modal="true"
        aria-label="Personalizar tema"
        aria-hidden="true"
      >
        <header class="panel-header">
          <h2>🎨 Personalizar tema</h2>
          <button class="btn-close" aria-label="Cerrar personalizador">✕</button>
        </header>

        <div class="panel-body">
          <!-- Color picker libre -->
          <section aria-labelledby="lbl-custom">
            <h3 id="lbl-custom">Color personalizado</h3>
            <div class="color-picker-row">
              <label class="color-swatch" aria-label="Selector de color primario">
                <div class="color-swatch-preview" style="background:${saved}"></div>
                <input type="color" value="${saved}" aria-label="Color primario" />
              </label>
              <div class="color-picker-label">
                Color primario
                <span>Afecta botones, bordes activos y acentos</span>
              </div>
            </div>
          </section>

          <!-- Presets -->
          <section aria-labelledby="lbl-presets">
            <h3 id="lbl-presets">Paletas predefinidas</h3>
            <div class="preset-grid">
              ${COLOR_PRESETS.map(p => `
                <div>
                  <button
                    class="preset-btn${p.value.toLowerCase() === saved.toLowerCase() ? ' active' : ''}"
                    style="background:${p.value}"
                    data-color="${p.value}"
                    aria-label="${p.label}"
                    aria-pressed="${p.value.toLowerCase() === saved.toLowerCase()}"
                    title="${p.label}"
                  ></button>
                  <p class="preset-label">${p.label.split(' ')[0]}</p>
                </div>
              `).join('')}
            </div>
          </section>
        </div>

        <footer class="panel-footer">
          <button class="btn-reset" aria-label="Restablecer color por defecto">
            Restablecer por defecto
          </button>
        </footer>
      </div>
    `;

    // Sincronizar el preview del swatch con el input color real
    const input = this._shadow.querySelector<HTMLInputElement>('input[type="color"]');
    const preview = this._shadow.querySelector<HTMLDivElement>('.color-swatch-preview');
    if (input && preview) {
      input.addEventListener('input', e => {
        preview.style.background = (e.target as HTMLInputElement).value;
      });
    }
  }
}

if (!customElements.get(DojoThemeCustomizer.TAG)) {
  customElements.define(DojoThemeCustomizer.TAG, DojoThemeCustomizer);
}
