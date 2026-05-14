/**
 * dojo-delete-confirm-dialog — Organismo
 *
 * Diálogo modal de confirmación para eliminar una tarea.
 * Implementa los criterios de aceptación de US-06 (Eliminar tarea).
 *
 * ## API Pública
 * | Método                          | Descripción                                 |
 * |---------------------------------|---------------------------------------------|
 * | show(taskId, taskTitle): void   | Abre el diálogo con el título de la tarea   |
 * | hide(): void                    | Cierra el diálogo sin confirmar             |
 *
 * ## Eventos despachados
 * | Nombre                    | Detalle       | Descripción                     |
 * |---------------------------|---------------|---------------------------------|
 * | dojo:task-delete-confirm  | { taskId }    | Usuario confirmó la eliminación |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-primary, --dojo-radius, --dojo-radius-sm, --dojo-shadow
 */

// ── Clase ──────────────────────────────────────────────────────────────────

export class DojoDeleteConfirmDialog extends HTMLElement {
  static readonly TAG = 'dojo-delete-confirm-dialog';

  private _shadow: ShadowRoot;
  private _taskId: string = '';
  /** Elemento que abrió el diálogo — el foco regresa aquí al cerrar (WCAG 2.1 SC 2.4.3). */
  private _triggerEl: HTMLElement | null = null;

  /** Referencia estable para poder eliminar el listener de teclado. */
  private _onDocKeydown = (e: KeyboardEvent): void => {
    if (!this._isOpen()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.hide();
      return;
    }
    // Focus trap: mantener Tab dentro del diálogo (WCAG 2.1 SC 2.1.2)
    if (e.key === 'Tab') {
      const focusable = this._getFocusable();
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
    if (this._shadow.childElementCount === 0) this._render();
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this._onDocKeydown);
  }

  // ── API pública ───────────────────────────────────────────────────────────

  show(taskId: string, taskTitle: string, triggerEl?: HTMLElement): void {
    this._taskId    = taskId;
    this._triggerEl = triggerEl ?? null;
    const titleEl = this._shadow.querySelector<HTMLElement>('.dialog-task-title');
    if (titleEl) titleEl.textContent = `"${taskTitle}"`;
    // Marcar como visible para lectores de pantalla (Fix #2)
    const dialog = this._shadow.querySelector<HTMLElement>('.dialog');
    dialog?.setAttribute('aria-hidden', 'false');
    this.setAttribute('open', '');
    document.removeEventListener('keydown', this._onDocKeydown);
    document.addEventListener('keydown', this._onDocKeydown);
    // Foco al botón Cancelar por defecto (acción segura)
    requestAnimationFrame(() => {
      this._shadow.querySelector<HTMLElement>('.cancel-btn')?.focus();
    });
  }

  hide(): void {
    this.removeAttribute('open');
    document.removeEventListener('keydown', this._onDocKeydown);
    // Ocultar del árbol AT mientras está cerrado (Fix #2)
    const dialog = this._shadow.querySelector<HTMLElement>('.dialog');
    dialog?.setAttribute('aria-hidden', 'true');
    // Devolver foco al disparador (Fix #3 — WCAG 2.1 SC 2.4.3)
    const trigger = this._triggerEl;
    this._triggerEl = null;
    requestAnimationFrame(() => trigger?.focus());
  }

  // ── Estado ────────────────────────────────────────────────────────────────

  private _isOpen(): boolean {
    return this.hasAttribute('open');
  }

  private _getFocusable(): HTMLElement[] {
    const dialog = this._shadow.querySelector<HTMLElement>('.dialog');
    if (!dialog) return [];
    return Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not([disabled])')
    ).filter(el => el.offsetParent !== null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private _render(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host { display: contents; }

      /* ── Backdrop ── */
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        z-index: 300;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s ease;
      }
      :host([open]) .backdrop {
        opacity: 1;
        pointer-events: auto;
      }

      /* ── Diálogo ── */
      .dialog {
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
        width: 360px;
        max-width: calc(100vw - 2rem);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s ease, transform 0.18s ease;
      }
      :host([open]) .dialog {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, -50%);
      }

      /* ── Ícono ── */
      .dialog-icon {
        font-size: 2rem;
        text-align: center;
        margin-bottom: 0.75rem;
        line-height: 1;
      }

      /* ── Título ── */
      .dialog-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
        text-align: center;
        margin: 0 0 0.375rem;
      }

      /* ── Nombre de la tarea ── */
      .dialog-task-title {
        display: block;
        font-size: 0.875rem;
        color: var(--dojo-text-secondary);
        text-align: center;
        margin: 0 0 1.25rem;
        word-break: break-word;
      }

      /* ── Acciones ── */
      .dialog-actions {
        display: flex;
        gap: 0.625rem;
        justify-content: flex-end;
      }

      .cancel-btn {
        padding: 0.4375rem 1rem;
        background: transparent;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.875rem;
        color: var(--dojo-text-primary);
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
      }
      .cancel-btn:hover { background: var(--dojo-bg); }
      .cancel-btn:focus-visible {
        outline: 2px solid var(--dojo-primary);
        outline-offset: 2px;
      }

      .confirm-btn {
        padding: 0.4375rem 1rem;
        background: var(--dojo-danger-light);
        border: none;
        border-radius: var(--dojo-radius-sm);
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dojo-text-on-danger);
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
      }
      .confirm-btn:hover  { background: var(--dojo-danger); }
      .confirm-btn:focus-visible {
        outline: 2px solid var(--dojo-danger-focus);
        outline-offset: 2px;
      }
    `;
    this._shadow.appendChild(style);

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', () => this.hide());
    this._shadow.appendChild(backdrop);

    // Diálogo
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'delete-dialog-title');
    dialog.setAttribute('aria-describedby', 'delete-dialog-desc');
    // Oculto del árbol AT hasta que se abra con show() (Fix #2)
    dialog.setAttribute('aria-hidden', 'true');

    const icon = document.createElement('div');
    icon.className = 'dialog-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🗑️';

    const titleEl = document.createElement('h2');
    titleEl.id = 'delete-dialog-title';
    titleEl.className = 'dialog-title';
    titleEl.textContent = '¿Eliminar tarea?';

    const desc = document.createElement('span');
    desc.id = 'delete-dialog-desc';
    desc.className = 'dialog-task-title';
    // El texto se inyecta en show() vía textContent (nunca innerHTML)

    const actions = document.createElement('div');
    actions.className = 'dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => this.hide());

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'confirm-btn';
    confirmBtn.textContent = 'Eliminar';
    confirmBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('dojo:task-delete-confirm', {
        bubbles:  true,
        composed: true,
        detail:   { taskId: this._taskId },
      }));
      this.hide();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    dialog.appendChild(icon);
    dialog.appendChild(titleEl);
    dialog.appendChild(desc);
    dialog.appendChild(actions);

    this._shadow.appendChild(dialog);
  }
}

customElements.define(DojoDeleteConfirmDialog.TAG, DojoDeleteConfirmDialog);
