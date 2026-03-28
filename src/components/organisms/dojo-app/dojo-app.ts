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
import '../dojo-board-selector/dojo-board-selector.js';
import '../../atoms/dojo-theme-toggle/dojo-theme-toggle.js';

import type { Label } from '../../../types/models.js';
import { getAllBoards } from '../../../db/board.repository.js';
import {
  exportBoardData,
  downloadBoardExport,
  readImportFile,
  validateImportData,
  importBoardData,
} from '../../../db/export-import.js';

export class DojoApp extends HTMLElement {
  static readonly TAG = 'dojo-app';

  private _shadow: ShadowRoot;
  /** Datos pendientes de importación (tras validación, previo a confirmación). */
  private _pendingImport: import('../../../db/export-import.js').BoardExport | null = null;
  private _toastTimer: ReturnType<typeof setTimeout> | null = null;
  /** ID del tablero activo. Si es vacío, se muestra el selector de tableros (US-22). */
  private _activeBoardId = '';

  /** Referencia estable para poder eliminar el listener de teclado del diálogo de importación. */
  private _onImportKeydown = (e: KeyboardEvent): void => {
    if (!this.hasAttribute('import-confirm')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this._hideImportConfirm();
      return;
    }
    // Focus trap: mantener Tab dentro del diálogo (WCAG 2.1 SC 2.1.2)
    if (e.key === 'Tab') {
      const focusable = Array.from(
        this._shadow.querySelectorAll<HTMLElement>('.import-dialog button:not([disabled])')
      ).filter(el => el.offsetParent !== null);
      if (focusable.length < 2) return;
      const first  = focusable[0];
      const last   = focusable[focusable.length - 1];
      const active = this._shadow.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    // Guarda de idempotencia: evita re-render al mover el elemento en el DOM
    if (this._shadow.childElementCount > 0) return;
    this._render();
    this._autoSelectSingleBoard();
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this._onImportKeydown);
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

      /* Selector de tema */
      dojo-theme-toggle {
        flex-shrink: 0;
      }

      /* Botones del header (gestionar etiquetas, exportar, importar) */
      .header-btn {
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
        white-space: nowrap;
      }
      .header-btn:hover {
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
        border-color: var(--dojo-primary, #1D4ED8);
      }
      .header-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }
      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-left: auto;
      }
      .import-input { display: none; }

      /* ── Diálogo de confirmación de importación ───────────────── */
      .import-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        z-index: 300;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s ease;
      }
      :host([import-confirm]) .import-backdrop {
        opacity: 1;
        pointer-events: auto;
      }
      .import-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -56%);
        z-index: 301;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius, 6px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        padding: 1.5rem;
        width: 400px;
        max-width: calc(100vw - 2rem);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s ease, transform 0.18s ease;
      }
      :host([import-confirm]) .import-dialog {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, -50%);
      }
      .import-dialog-icon {
        font-size: 2rem;
        text-align: center;
        margin-bottom: 0.75rem;
        line-height: 1;
      }
      .import-dialog-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
        text-align: center;
        margin: 0 0 0.5rem;
      }
      .import-dialog-body {
        font-size: 0.875rem;
        color: var(--dojo-text-secondary);
        text-align: center;
        margin: 0 0 1.25rem;
        line-height: 1.5;
      }
      .import-dialog-actions {
        display: flex;
        gap: 0.625rem;
        justify-content: flex-end;
      }
      .import-cancel-btn,
      .import-confirm-btn {
        padding: 0.4375rem 1rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.8125rem;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
      }
      .import-cancel-btn {
        background: transparent;
        border: 1px solid var(--dojo-border);
        color: var(--dojo-text-primary);
      }
      .import-cancel-btn:hover { background: var(--dojo-bg); }
      .import-confirm-btn {
        background: var(--dojo-danger, #DC2626);
        border: 1px solid transparent;
        color: #fff;
        font-weight: 600;
      }
      .import-confirm-btn:hover { opacity: 0.9; }
      .import-cancel-btn:focus-visible,
      .import-confirm-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* ── Toast de notificación ─────────────────────────────── */
      .toast {
        position: fixed;
        bottom: 1.5rem;
        left: 50%;
        transform: translateX(-50%) translateY(120%);
        z-index: 400;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius, 6px);
        box-shadow: var(--dojo-shadow-md, 0 4px 6px rgba(0,0,0,.07));
        padding: 0.75rem 1.25rem;
        font-size: 0.875rem;
        color: var(--dojo-text-primary);
        opacity: 0;
        pointer-events: none;
        transition: transform 0.25s ease, opacity 0.25s ease;
      }
      .toast.visible {
        opacity: 1;
        pointer-events: auto;
        transform: translateX(-50%) translateY(0);
      }
      .toast.error {
        border-color: var(--dojo-danger, #DC2626);
        color: var(--dojo-danger, #DC2626);
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
      dojo-board-selector {
        height: 100%;
      }

      /* Botón "Volver a tableros" */
      .back-btn {
        display: none;
        align-items: center;
        gap: 0.25rem;
        padding: 0.3125rem 0.625rem;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius, 6px);
        background: transparent;
        color: var(--dojo-text-secondary);
        font-size: 0.8125rem;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        white-space: nowrap;
      }
      .back-btn:hover {
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
        border-color: var(--dojo-primary, #1D4ED8);
      }
      .back-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }
      :host([view="board"]) .back-btn { display: inline-flex; }
      :host([view="board"]) .header-actions { display: flex; }
      :host(:not([view="board"])) .header-actions { display: none; }
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
    manageLabelBtn.className = 'header-btn';
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

    // ── Botón Exportar (US-19) ──────────────────────────────────────────────
    const exportBtn = document.createElement('button');
    exportBtn.className = 'header-btn';
    exportBtn.type = 'button';
    exportBtn.setAttribute('aria-label', 'Exportar datos del tablero');
    const exportIcon = document.createElement('span');
    exportIcon.setAttribute('aria-hidden', 'true');
    exportIcon.textContent = '📤';
    const exportText = document.createElement('span');
    exportText.textContent = 'Exportar';
    exportBtn.appendChild(exportIcon);
    exportBtn.appendChild(exportText);
    exportBtn.addEventListener('click', () => this._handleExport());

    // ── Botón Importar (US-19) ──────────────────────────────────────────────
    const importBtn = document.createElement('button');
    importBtn.className = 'header-btn';
    importBtn.type = 'button';
    importBtn.setAttribute('aria-label', 'Importar datos al tablero');
    const importIcon = document.createElement('span');
    importIcon.setAttribute('aria-hidden', 'true');
    importIcon.textContent = '📥';
    const importText = document.createElement('span');
    importText.textContent = 'Importar';
    importBtn.appendChild(importIcon);
    importBtn.appendChild(importText);

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.json,application/json';
    importInput.className = 'import-input';
    importInput.addEventListener('change', () => this._handleImportFile(importInput));
    importBtn.addEventListener('click', () => {
      importInput.value = '';
      importInput.click();
    });

    const themeToggle = document.createElement('dojo-theme-toggle');

    // Grupo de acciones del header
    const headerActions = document.createElement('div');
    headerActions.className = 'header-actions';
    headerActions.appendChild(manageLabelBtn);
    headerActions.appendChild(exportBtn);
    headerActions.appendChild(importBtn);
    headerActions.appendChild(importInput);

    appHeader.appendChild(logo);
    appHeader.appendChild(title);

    // Botón "Volver a tableros" (US-22) — visible solo en vista de tablero
    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.type = 'button';
    backBtn.setAttribute('aria-label', 'Volver a la lista de tableros');
    const backIcon = document.createElement('span');
    backIcon.setAttribute('aria-hidden', 'true');
    backIcon.textContent = '←';
    const backText = document.createElement('span');
    backText.textContent = 'Tableros';
    backBtn.appendChild(backIcon);
    backBtn.appendChild(backText);
    backBtn.addEventListener('click', () => this._showBoardSelector());
    appHeader.appendChild(backBtn);

    appHeader.appendChild(headerActions);
    appHeader.appendChild(themeToggle);
    this._shadow.appendChild(appHeader);

    // ── Área del tablero ────────────────────────────────────────────────────────────────────
    const boardArea = document.createElement('main');
    boardArea.className = 'board-area';
    boardArea.setAttribute('role', 'main');

    // Selector de tableros (vista por defecto — US-22)
    const boardSelector = document.createElement('dojo-board-selector');
    boardArea.appendChild(boardSelector);

    // Tablero Kanban (se muestra al seleccionar un tablero)
    const board = document.createElement('dojo-kanban-board');
    board.style.display = 'none';
    boardArea.appendChild(board);
    this._shadow.appendChild(boardArea);

    // Escuchar selección de tablero (US-22)
    this._shadow.addEventListener('dojo:board-selected', (e: Event) => {
      const { boardId } = (e as CustomEvent).detail as { boardId: string };
      this._navigateToBoard(boardId);
    });

    // ── Panel de gestión de etiquetas (US-11) ───────────────────────────────────────
    const labelMgr = document.createElement('dojo-label-manager');
    this._shadow.appendChild(labelMgr);

    // Cuando se actualiza una etiqueta, propagar al tablero para refrescar los chips
    this._shadow.addEventListener('dojo:label-updated', (e: Event) => {
      const { label } = (e as CustomEvent).detail as { label: Label };
      (board as any).refreshLabel?.(label);
    });

    // Cuando se elimina una etiqueta, propagar al tablero para eliminar sus chips (US-12)
    this._shadow.addEventListener('dojo:label-deleted', (e: Event) => {
      const { labelId } = (e as CustomEvent).detail as { labelId: string };
      (board as any).removeLabel?.(labelId);
    });

    // ── Diálogo de confirmación de importación (US-19) ──────────────────────
    const importBackdrop = document.createElement('div');
    importBackdrop.className = 'import-backdrop';
    importBackdrop.addEventListener('click', () => this._hideImportConfirm());

    const importDialog = document.createElement('div');
    importDialog.className = 'import-dialog';
    importDialog.setAttribute('role', 'alertdialog');
    importDialog.setAttribute('aria-labelledby', 'import-dialog-title');
    importDialog.setAttribute('aria-describedby', 'import-dialog-body');
    importDialog.setAttribute('aria-hidden', 'true');
    importDialog.innerHTML = `
      <div class="import-dialog-icon" aria-hidden="true">⚠️</div>
      <h2 class="import-dialog-title" id="import-dialog-title">Importar datos</h2>
      <p class="import-dialog-body" id="import-dialog-body">
        Los datos actuales del tablero serán <strong>reemplazados</strong> por los del archivo importado. Esta acción no se puede deshacer.
      </p>
      <div class="import-dialog-actions">
        <button class="import-cancel-btn" type="button">Cancelar</button>
        <button class="import-confirm-btn" type="button">Importar y reemplazar</button>
      </div>
    `;
    importDialog.querySelector('.import-cancel-btn')!
      .addEventListener('click', () => this._hideImportConfirm());
    importDialog.querySelector('.import-confirm-btn')!
      .addEventListener('click', () => this._confirmImport(board));

    this._shadow.appendChild(importBackdrop);
    this._shadow.appendChild(importDialog);

    // ── Toast de notificación (US-19) ────────────────────────────────────────
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    this._shadow.appendChild(toast);
  }

  // ── Navegación entre vistas (US-22) ──────────────────────────────────────

  /**
   * Si solo hay un tablero, navega directamente a él.
   * Si hay múltiples, se queda en el selector.
   */
  private async _autoSelectSingleBoard(): Promise<void> {
    try {
      const boards = await getAllBoards();
      if (boards.length === 1) {
        this._navigateToBoard(boards[0].id);
      }
    } catch {
      // Si falla, se queda en el selector
    }
  }

  private _navigateToBoard(boardId: string): void {
    this._activeBoardId = boardId;
    this.setAttribute('view', 'board');

    const selector = this._shadow.querySelector('dojo-board-selector') as HTMLElement | null;
    const board    = this._shadow.querySelector('dojo-kanban-board') as HTMLElement | null;
    if (selector) selector.style.display = 'none';
    if (board) {
      board.style.display = '';
      board.setAttribute('board-id', boardId);
    }
  }

  private _showBoardSelector(): void {
    this._activeBoardId = '';
    this.removeAttribute('view');

    const selector = this._shadow.querySelector('dojo-board-selector') as HTMLElement | null;
    const board    = this._shadow.querySelector('dojo-kanban-board') as HTMLElement | null;
    if (board) board.style.display = 'none';
    if (selector) {
      selector.style.display = '';
      (selector as any).refresh?.();
    }
  }

  // ── Export/Import (US-19) ────────────────────────────────────────────────

  private async _handleExport(): Promise<void> {
    try {
      const data = await exportBoardData();
      downloadBoardExport(data);
      this._showToast('Datos exportados correctamente.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al exportar';
      this._showToast(msg, true);
    }
  }

  private async _handleImportFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const raw    = await readImportFile(file);
      const result = validateImportData(raw);

      if (!result.ok) {
        this._showToast(result.message, true);
        return;
      }

      this._pendingImport = result.data;
      this._showImportConfirm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al leer el archivo';
      this._showToast(msg, true);
    }
  }

  private _showImportConfirm(): void {
    this.setAttribute('import-confirm', '');
    const dialog = this._shadow.querySelector<HTMLElement>('.import-dialog');
    dialog?.setAttribute('aria-hidden', 'false');
    document.removeEventListener('keydown', this._onImportKeydown);
    document.addEventListener('keydown', this._onImportKeydown);
    requestAnimationFrame(() => {
      this._shadow.querySelector<HTMLElement>('.import-cancel-btn')?.focus();
    });
  }

  private _hideImportConfirm(): void {
    this.removeAttribute('import-confirm');
    document.removeEventListener('keydown', this._onImportKeydown);
    const dialog = this._shadow.querySelector<HTMLElement>('.import-dialog');
    dialog?.setAttribute('aria-hidden', 'true');
    this._pendingImport = null;
  }

  private async _confirmImport(board: HTMLElement): Promise<void> {
    if (!this._pendingImport) return;

    try {
      await importBoardData(this._pendingImport);
      this._hideImportConfirm();
      // Recargar el tablero completo para reflejar los nuevos datos
      (board as any)._loadBoard?.();
      this._showToast('Datos importados correctamente.');
    } catch (err) {
      this._hideImportConfirm();
      const msg = err instanceof Error ? err.message : 'Error al importar';
      this._showToast(msg, true);
    }
  }

  private _showToast(message: string, isError = false): void {
    const toast = this._shadow.querySelector<HTMLElement>('.toast');
    if (!toast) return;

    if (this._toastTimer) clearTimeout(this._toastTimer);

    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('visible');

    this._toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 3500);
  }
}

customElements.define(DojoApp.TAG, DojoApp);
