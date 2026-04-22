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
import '../dojo-wiki/dojo-wiki.js';
import '../dojo-project-manager/dojo-project-manager.js';
import '../dojo-person-manager/dojo-person-manager.js';
import '../dojo-command-palette/dojo-command-palette.js';
import '../dojo-board-selector/dojo-board-selector.js';
import '../dojo-list-view/dojo-list-view.js';
import '../dojo-template-manager/dojo-template-manager.js';
import '../../atoms/dojo-theme-toggle/dojo-theme-toggle.js';
import '../../atoms/dojo-person-avatar/dojo-person-avatar.js';

import type { Label } from '../../../types/models.js';
import { getAllBoards } from '../../../db/board.repository.js';
import { onMultipleSync } from '../../../utils/broadcast-sync.js';
import {
  dismissTaskNotificationPromptForSession,
  requestTaskNotificationPermission,
  shouldPromptForTaskNotifications,
} from '../../../utils/task-notifications.js';
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
  private _notificationPromptCleanup: (() => void) | null = null;
  /** ID del tablero activo. Si es vacío, se muestra el selector de tableros (US-22). */
  private _activeBoardId = '';
  /** Modo de vista activo para el tablero: 'kanban' o 'list'. Persiste en localStorage (US-33). */
  private _boardViewMode: 'kanban' | 'list' = 'kanban';
  private _pendingTaskLink: { boardId: string; taskId: string } | null = null;

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
    this._boardViewMode = this._loadBoardViewPreference();
    this._pendingTaskLink = this._readPendingTaskLink();
    if (this._pendingTaskLink) this._boardViewMode = 'kanban';
    this._render();
    this._autoSelectSingleBoard();
    void this._refreshNotificationPrompt();
    this._notificationPromptCleanup = onMultipleSync({
      'task:created': () => void this._refreshNotificationPrompt(),
      'task:updated': () => void this._refreshNotificationPrompt(),
      'task:deleted': () => void this._refreshNotificationPrompt(),
      'board:deleted': () => void this._refreshNotificationPrompt(),
    });
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this._onImportKeydown);
    this._notificationPromptCleanup?.();
    this._notificationPromptCleanup = null;
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
        flex-shrink: 0;
        overflow-x: auto;
      }
      .import-input { display: none; }

      .notification-banner {
        display: none;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.75rem 1.25rem;
        background: color-mix(in srgb, var(--dojo-warning, #D97706) 14%, var(--dojo-surface));
        border-bottom: 1px solid color-mix(in srgb, var(--dojo-warning, #D97706) 35%, var(--dojo-border));
      }
      .notification-banner.visible {
        display: flex;
      }
      .notification-banner-copy {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }
      .notification-banner-title {
        font-size: 0.875rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
      }
      .notification-banner-text {
        font-size: 0.8125rem;
        color: var(--dojo-text-secondary);
      }
      .notification-banner-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }
      .notification-banner-btn {
        padding: 0.4375rem 0.8rem;
        border-radius: var(--dojo-radius-sm, 4px);
        border: 1px solid var(--dojo-border);
        background: transparent;
        color: var(--dojo-text-primary);
        font: inherit;
        cursor: pointer;
      }
      .notification-banner-btn.primary {
        background: var(--dojo-warning, #D97706);
        border-color: transparent;
        color: #fff;
        font-weight: 700;
      }
      .notification-banner-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

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
      dojo-list-view {
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

      /* ── Toggle Tablero / Lista (US-33) ────────────────────────────── */
      .view-toggle {
        display: none;
        align-items: center;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        overflow: hidden;
        flex-shrink: 0;
      }
      :host([view="board"]) .view-toggle { display: flex; }
      .view-toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.3125rem 0.625rem;
        background: transparent;
        border: none;
        color: var(--dojo-text-secondary);
        font-size: 0.8125rem;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.14s, color 0.14s;
        white-space: nowrap;
      }
      .view-toggle-btn.active {
        background: var(--dojo-primary, #1D4ED8);
        color: #fff;
        font-weight: 600;
      }
      .view-toggle-btn:hover:not(.active) {
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
      }
      .view-toggle-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: -2px;
      }

      /* Botón de ayuda — siempre visible (US-27) */
      .help-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        background: transparent;
        color: var(--dojo-text-secondary);
        font-size: 1rem;
        cursor: pointer;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        flex-shrink: 0;
      }
      .help-btn:hover {
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
        border-color: var(--dojo-primary, #1D4ED8);
      }
      .help-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      @media (max-width: 767px) {
        .notification-banner {
          flex-direction: column;
          align-items: flex-start;
        }
        .notification-banner-actions {
          width: 100%;
          justify-content: flex-end;
        }
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

    // ── Botón Gestionar proyectos (US-26) ───────────────────────────────────
    const manageProjectBtn = document.createElement('button');
    manageProjectBtn.className = 'header-btn';
    manageProjectBtn.type = 'button';
    manageProjectBtn.setAttribute('aria-label', 'Gestionar proyectos');
    const projBtnIcon = document.createElement('span');
    projBtnIcon.setAttribute('aria-hidden', 'true');
    projBtnIcon.textContent = '📁';
    const projBtnText = document.createElement('span');
    projBtnText.textContent = 'Proyectos';
    manageProjectBtn.appendChild(projBtnIcon);
    manageProjectBtn.appendChild(projBtnText);
    manageProjectBtn.addEventListener('click', () => {
      (projectMgr as any).show();
    });

    // ── Botón Gestionar personas (US-29) ────────────────────────────────────
    const managePersonBtn = document.createElement('button');
    managePersonBtn.className = 'header-btn';
    managePersonBtn.type = 'button';
    managePersonBtn.setAttribute('aria-label', 'Gestionar personas');
    const personBtnIcon = document.createElement('span');
    personBtnIcon.setAttribute('aria-hidden', 'true');
    personBtnIcon.textContent = '👤';
    const personBtnText = document.createElement('span');
    personBtnText.textContent = 'Personas';
    managePersonBtn.appendChild(personBtnIcon);
    managePersonBtn.appendChild(personBtnText);
    managePersonBtn.addEventListener('click', () => {
      (personMgr as any).show();
    });

    // ── Botón Gestionar templates (US-36) ───────────────────────────────────
    const manageTemplateBtn = document.createElement('button');
    manageTemplateBtn.className = 'header-btn';
    manageTemplateBtn.type = 'button';
    manageTemplateBtn.setAttribute('aria-label', 'Gestionar templates de tareas');
    manageTemplateBtn.setAttribute('title', 'Templates de tareas');
    const templateBtnIcon = document.createElement('span');
    templateBtnIcon.setAttribute('aria-hidden', 'true');
    templateBtnIcon.textContent = '📋';
    const templateBtnText = document.createElement('span');
    templateBtnText.textContent = 'Templates';
    manageTemplateBtn.appendChild(templateBtnIcon);
    manageTemplateBtn.appendChild(templateBtnText);
    manageTemplateBtn.addEventListener('click', () => {
      (templateMgr as HTMLElement & { open(): void }).open();
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
    headerActions.appendChild(manageProjectBtn);
    headerActions.appendChild(managePersonBtn);
    headerActions.appendChild(manageTemplateBtn);
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

    // ── Botón Ayuda (US-27) ─────────────────────────────────────────────────
    const helpBtn = document.createElement('button');
    helpBtn.className = 'help-btn';
    helpBtn.type = 'button';
    helpBtn.setAttribute('aria-label', 'Abrir guía de usuario');
    helpBtn.setAttribute('title', 'Ayuda (también: ?)');
    helpBtn.textContent = '?';
    helpBtn.addEventListener('click', () => {
      (wiki as any).show?.();
    });

    // ── Toggle Tablero / Lista (US-33) ───────────────────────────────────
    const viewToggle = document.createElement('div');
    viewToggle.className = 'view-toggle';
    viewToggle.setAttribute('role', 'group');
    viewToggle.setAttribute('aria-label', 'Seleccionar modo de vista');

    const kanbanViewBtn = document.createElement('button');
    kanbanViewBtn.className = 'view-toggle-btn' + (this._boardViewMode === 'kanban' ? ' active' : '');
    kanbanViewBtn.type = 'button';
    kanbanViewBtn.dataset.mode = 'kanban';
    kanbanViewBtn.setAttribute('aria-pressed', String(this._boardViewMode === 'kanban'));
    kanbanViewBtn.setAttribute('aria-label', 'Vista tablero Kanban');
    kanbanViewBtn.textContent = '📊 Tablero';

    const listViewBtn = document.createElement('button');
    listViewBtn.className = 'view-toggle-btn' + (this._boardViewMode === 'list' ? ' active' : '');
    listViewBtn.type = 'button';
    listViewBtn.dataset.mode = 'list';
    listViewBtn.setAttribute('aria-pressed', String(this._boardViewMode === 'list'));
    listViewBtn.setAttribute('aria-label', 'Vista lista de tareas');
    listViewBtn.textContent = '📋 Lista';

    kanbanViewBtn.addEventListener('click', () => this._setBoardViewMode('kanban'));
    listViewBtn.addEventListener('click', () => this._setBoardViewMode('list'));

    viewToggle.appendChild(kanbanViewBtn);
    viewToggle.appendChild(listViewBtn);
    appHeader.appendChild(viewToggle);

    appHeader.appendChild(headerActions);
    appHeader.appendChild(helpBtn);
    appHeader.appendChild(themeToggle);
    this._shadow.appendChild(appHeader);

    const notificationBanner = document.createElement('section');
    notificationBanner.className = 'notification-banner';
    notificationBanner.setAttribute('aria-label', 'Permiso de notificaciones');
    notificationBanner.setAttribute('role', 'status');
    notificationBanner.setAttribute('aria-live', 'polite');
    notificationBanner.setAttribute('aria-atomic', 'true');

    const notificationCopy = document.createElement('div');
    notificationCopy.className = 'notification-banner-copy';
    const notificationTitle = document.createElement('strong');
    notificationTitle.className = 'notification-banner-title';
    notificationTitle.textContent = 'Activa recordatorios de vencimiento';
    const notificationText = document.createElement('span');
    notificationText.className = 'notification-banner-text';
    notificationText.textContent = 'La app puede avisarte 24 horas antes y al vencer una tarea, incluso si no tienes el tablero en primer plano.';
    notificationCopy.appendChild(notificationTitle);
    notificationCopy.appendChild(notificationText);

    const notificationActions = document.createElement('div');
    notificationActions.className = 'notification-banner-actions';
    const dismissNotificationsBtn = document.createElement('button');
    dismissNotificationsBtn.type = 'button';
    dismissNotificationsBtn.className = 'notification-banner-btn';
    dismissNotificationsBtn.textContent = 'Ahora no';
    dismissNotificationsBtn.addEventListener('click', () => {
      dismissTaskNotificationPromptForSession();
      void this._refreshNotificationPrompt();
    });

    const allowNotificationsBtn = document.createElement('button');
    allowNotificationsBtn.type = 'button';
    allowNotificationsBtn.className = 'notification-banner-btn primary';
    allowNotificationsBtn.textContent = 'Permitir';
    allowNotificationsBtn.addEventListener('click', () => {
      void this._handleNotificationPermissionRequest();
    });

    notificationActions.appendChild(dismissNotificationsBtn);
    notificationActions.appendChild(allowNotificationsBtn);
    notificationBanner.appendChild(notificationCopy);
    notificationBanner.appendChild(notificationActions);
    this._shadow.appendChild(notificationBanner);

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

    // Vista lista (US-33)
    const listView = document.createElement('dojo-list-view');
    listView.style.display = 'none';
    boardArea.appendChild(listView);
    this._shadow.appendChild(boardArea);

    // Escuchar selección de tablero (US-22)
    this._shadow.addEventListener('dojo:board-selected', (e: Event) => {
      const { boardId } = (e as CustomEvent).detail as { boardId: string };
      this._navigateToBoard(boardId);
    });

    // ── Panel de gestión de etiquetas (US-11) ───────────────────────────────────────
    const labelMgr = document.createElement('dojo-label-manager');
    this._shadow.appendChild(labelMgr);

    // ── Panel de gestión de proyectos (US-26) ────────────────────────────────────────
    const projectMgr = document.createElement('dojo-project-manager');
    this._shadow.appendChild(projectMgr);

    // ── Panel de gestión de personas (US-29) ─────────────────────────────────────────
    const personMgr = document.createElement('dojo-person-manager');
    this._shadow.appendChild(personMgr);

    // ── Gestor de templates (US-36) ───────────────────────────────────────────────────
    const templateMgr = document.createElement('dojo-template-manager');
    this._shadow.appendChild(templateMgr);

    // ── Paleta de comandos (US-28) ───────────────────────────────────────────────────
    const palette = document.createElement('dojo-command-palette');
    this._shadow.appendChild(palette);

    // ── Wiki / Guía de usuario (US-27) ───────────────────────────────────────────────
    const wiki = document.createElement('dojo-wiki');
    this._shadow.appendChild(wiki);

    // Seleccionar tarea desde la paleta
    this._shadow.addEventListener('dojo:palette-select-task', (e: Event) => {
      const { taskId } = (e as CustomEvent).detail as { taskId: string };
      (board as any).openTaskById?.(taskId);
    });

    // Crear tarea desde la paleta
    this._shadow.addEventListener('dojo:palette-create-task', (e: Event) => {
      const { title } = (e as CustomEvent).detail as { title: string };
      (board as any).openCreateTaskWithTitle?.(title);
    });

    // Invalidar caché de la paleta cuando las tareas cambian
    const invalidatePalette = (): void => {
      (palette as any).invalidateCache?.();
    };
    this._shadow.addEventListener('dojo:task-field-updated',   invalidatePalette);
    this._shadow.addEventListener('dojo:task-delete-confirm',  invalidatePalette);
    this._shadow.addEventListener('dojo:board-ready', () => {
      invalidatePalette();
      void this._openPendingTaskLink();
    });

    // Cuando se crea/actualiza/elimina un proyecto, refrescar el tablero
    this._shadow.addEventListener('dojo:project-created', () => {
      (board as any)._loadBoard?.();
    });
    this._shadow.addEventListener('dojo:project-updated', () => {
      (board as any)._loadBoard?.();
    });
    this._shadow.addEventListener('dojo:project-deleted', () => {
      (board as any)._loadBoard?.();
    });

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
      if (this._pendingTaskLink?.boardId) {
        this._navigateToBoard(this._pendingTaskLink.boardId);
        return;
      }

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
    const listView = this._shadow.querySelector('dojo-list-view') as HTMLElement | null;
    const palette  = this._shadow.querySelector('dojo-command-palette') as any;

    if (selector) selector.style.display = 'none';
    if (palette) palette.boardId = boardId;

    this._applyBoardViewMode(boardId, board, listView);
  }

  private _showBoardSelector(): void {
    this._activeBoardId = '';
    this.removeAttribute('view');

    const selector = this._shadow.querySelector('dojo-board-selector') as HTMLElement | null;
    const board    = this._shadow.querySelector('dojo-kanban-board') as HTMLElement | null;
    const listView = this._shadow.querySelector('dojo-list-view') as HTMLElement | null;
    if (board)    board.style.display    = 'none';
    if (listView) listView.style.display = 'none';
    if (selector) {
      selector.style.display = '';
      (selector as any).refresh?.();
    }
    const palette = this._shadow.querySelector('dojo-command-palette') as any;
    if (palette) palette.boardId = '';
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
      // Navegar al selector para que el usuario vea todos los tableros importados
      // y el board-selector se refresque correctamente con los nuevos datos.
      this._showBoardSelector();
      // Invalidar caché de la paleta tras importar datos
      const palette = this._shadow.querySelector('dojo-command-palette') as any;
      palette?.invalidateCache?.();
      this._showToast('Datos importados correctamente.');
    } catch (err) {
      this._hideImportConfirm();
      const msg = err instanceof Error ? err.message : 'Error al importar';
      this._showToast(msg, true);
    }
  }

  // ── Vista Tablero / Lista (US-33) ──────────────────────────────────────

  /** Carga la preferencia de vista desde localStorage. */
  private _loadBoardViewPreference(): 'kanban' | 'list' {
    try {
      const stored = localStorage.getItem('dojo:board-view');
      if (stored === 'list') return 'list';
    } catch { /* sin acceso a localStorage */ }
    return 'kanban';
  }

  /** Persiste la preferencia de vista en localStorage. */
  private _saveBoardViewPreference(mode: 'kanban' | 'list'): void {
    try {
      localStorage.setItem('dojo:board-view', mode);
    } catch { /* sin acceso a localStorage */ }
  }

  /** Actualiza el estado visual de los botones del toggle. */
  private _updateViewToggleBtns(): void {
    this._shadow.querySelectorAll<HTMLButtonElement>('.view-toggle-btn').forEach(btn => {
      const isActive = btn.dataset.mode === this._boardViewMode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  /**
   * Muestra la vista activa (kanban o lista) para el tablero dado.
   * Oculta la vista inactiva.
   */
  private _applyBoardViewMode(
    boardId: string,
    board: HTMLElement | null,
    listView: HTMLElement | null,
  ): void {
    if (this._boardViewMode === 'list') {
      if (board)    board.style.display    = 'none';
      if (listView) {
        listView.style.display = '';
        listView.setAttribute('board-id', boardId);
      }
    } else {
      if (listView) listView.style.display = 'none';
      if (board) {
        board.style.display = '';
        board.setAttribute('board-id', boardId);
      }
    }
  }

  /**
   * Cambia el modo de vista del tablero y actualiza la UI.
   * Persiste la preferencia en localStorage.
   */
  private _setBoardViewMode(mode: 'kanban' | 'list'): void {
    if (this._boardViewMode === mode) return;
    this._boardViewMode = mode;
    this._saveBoardViewPreference(mode);
    this._updateViewToggleBtns();

    if (!this._activeBoardId) return; // sin tablero activo, nada que cambiar
    const board    = this._shadow.querySelector('dojo-kanban-board') as HTMLElement | null;
    const listView = this._shadow.querySelector('dojo-list-view') as HTMLElement | null;
    this._applyBoardViewMode(this._activeBoardId, board, listView);
  }

  private _readPendingTaskLink(): { boardId: string; taskId: string } | null {
    try {
      const url = new URL(window.location.href);
      const boardId = url.searchParams.get('boardId');
      const taskId = url.searchParams.get('taskId');
      if (!boardId || !taskId) return null;
      return { boardId, taskId };
    } catch {
      return null;
    }
  }

  private _clearPendingTaskLink(): void {
    this._pendingTaskLink = null;
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('boardId');
      url.searchParams.delete('taskId');
      window.history.replaceState({}, '', url);
    } catch {
      // Ignorar si el navegador no soporta URL/history como se espera.
    }
  }

  private async _openPendingTaskLink(): Promise<void> {
    if (!this._pendingTaskLink || this._activeBoardId !== this._pendingTaskLink.boardId) return;

    const board = this._shadow.querySelector('dojo-kanban-board') as
      (HTMLElement & { openTaskById(id: string): Promise<void> }) | null;
    if (!board?.openTaskById) return;

    try {
      await board.openTaskById(this._pendingTaskLink.taskId);
    } finally {
      this._clearPendingTaskLink();
    }
  }

  private async _refreshNotificationPrompt(): Promise<void> {
    const banner = this._shadow.querySelector<HTMLElement>('.notification-banner');
    if (!banner) return;

    const shouldPrompt = await shouldPromptForTaskNotifications();
    banner.classList.toggle('visible', shouldPrompt);
  }

  private async _handleNotificationPermissionRequest(): Promise<void> {
    const permission = await requestTaskNotificationPermission();

    if (permission === 'granted') {
      this._showToast('Notificaciones activadas para vencimientos.');
    } else if (permission === 'denied') {
      this._showToast('El navegador bloqueó las notificaciones. Debes habilitarlas desde la configuración del navegador.', true);
    }

    await this._refreshNotificationPrompt();
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
