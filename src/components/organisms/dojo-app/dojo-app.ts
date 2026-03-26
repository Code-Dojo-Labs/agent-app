/**
 * dojo-app — Organismo raíz
 *
 * Componente raíz de la aplicación. Monta el `<dojo-kanban-board>`
 * y establece el layout general (header + área del tablero).
 *
 * Escucha el evento `dojo:board-error` para representar estados de fallo
 * en el nivel de aplicación.
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*, --dojo-primary,
 * --dojo-shadow, --dojo-radius
 */

import '../dojo-kanban-board/dojo-kanban-board.js';
import '../dojo-label-manager/dojo-label-manager.js';

import type { Label } from '../../../types/models.js';

export class DojoApp extends HTMLElement {
  static readonly TAG = 'dojo-app';

  private _shadow: ShadowRoot;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    // Guarda de idempotencia: evita re-render al mover el elemento en el DOM
    if (this._shadow.childElementCount > 0) return;
    this._render();
  }

  private _render(): void {
    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        height: 100dvh;
        overflow: hidden;
        background: var(--dojo-bg);
      }

      /* ── Header de aplicación (fijo) ─────────────────────────────── */
      .app-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0 1.25rem;
        height: 52px;
        background: var(--dojo-surface);
        border-bottom: 1px solid var(--dojo-border);
        box-shadow: var(--dojo-shadow);
        flex-shrink: 0;
        z-index: 10;
      }
      .app-logo {
        font-size: 1.25rem;
        line-height: 1;
      }
      .app-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
        letter-spacing: -0.01em;
      }
      .app-subtitle {
        font-size: 0.75rem;
        color: var(--dojo-text-secondary);
        margin-left: auto;
      }

      /* Botón Gestionar etiquetas */
      .manage-labels-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.3125rem 0.75rem;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius, 6px);
        background: transparent;
        color: var(--dojo-text-secondary);
        font-size: 0.8125rem;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        margin-left: auto;
        white-space: nowrap;
      }
      .manage-labels-btn:hover {
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
        border-color: var(--dojo-primary, #1D4ED8);
      }
      .manage-labels-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* ── Área del tablero (ocupa el espacio restante) ─────────────── */
      .board-area {
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }
      dojo-kanban-board {
        height: 100%;
      }
    `;
    this._shadow.appendChild(style);

    // ── Header ─────────────────────────────────────────────────────────────
    const appHeader = document.createElement('header');
    appHeader.className = 'app-header';
    appHeader.setAttribute('role', 'banner');

    const logo = document.createElement('span');
    logo.className = 'app-logo';
    logo.setAttribute('aria-hidden', 'true');
    logo.textContent = '🥋';

    const title = document.createElement('span');
    title.className = 'app-title';
    title.textContent = 'Dojo Kanban';

    const subtitle = document.createElement('span');
    subtitle.className = 'app-subtitle';
    subtitle.textContent = 'Zero Dependencies';

    const manageLabelBtn = document.createElement('button');
    manageLabelBtn.className = 'manage-labels-btn';
    manageLabelBtn.type = 'button';
    manageLabelBtn.setAttribute('aria-label', 'Gestionar etiquetas');
    const btnIcon = document.createElement('span');
    btnIcon.setAttribute('aria-hidden', 'true');
    btnIcon.textContent = '🏷️';
    const btnText = document.createElement('span');
    btnText.textContent = 'Gestionar etiquetas';
    manageLabelBtn.appendChild(btnIcon);
    manageLabelBtn.appendChild(btnText);
    manageLabelBtn.addEventListener('click', () => {
      (labelMgr as any).show();
    });

    appHeader.appendChild(logo);
    appHeader.appendChild(title);
    appHeader.appendChild(manageLabelBtn);
    this._shadow.appendChild(appHeader);

    // ── Área del tablero ────────────────────────────────────────────────────────────────────
    const boardArea = document.createElement('main');
    boardArea.className = 'board-area';
    boardArea.setAttribute('role', 'main');

    const board = document.createElement('dojo-kanban-board');
    boardArea.appendChild(board);
    this._shadow.appendChild(boardArea);

    // ── Panel de gestión de etiquetas (US-11) ───────────────────────────────────────
    const labelMgr = document.createElement('dojo-label-manager');
    this._shadow.appendChild(labelMgr);

    // Cuando se actualiza una etiqueta, propagar al tablero para refrescar los chips
    this._shadow.addEventListener('dojo:label-updated', (e: Event) => {
      const { label } = (e as CustomEvent).detail as { label: Label };
      (board as any).refreshLabel?.(label);
    });
  }
}

customElements.define(DojoApp.TAG, DojoApp);
