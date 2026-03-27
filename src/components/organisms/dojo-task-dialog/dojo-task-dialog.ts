/**
 * dojo-task-dialog — Organismo
 *
 * Diálogo modal para crear tareas en el tablero Kanban.
 * Implementa los criterios de aceptación de US-04.
 *
 * ## API Pública
 * | Método                          | Descripción                              |
 * |---------------------------------|------------------------------------------|
 * | openCreate(columnId, colName)   | Abre el formulario de creación de tarea  |
 *
 * ## Eventos despachados
 * | Nombre                    | Detalle                                       | Descripción           |
 * |---------------------------|-----------------------------------------------|-----------------------|
 * | dojo:dialog-create-task   | { statusId, title, description, priority }    | Usuario confirmó crear|
 *
 * ## Validaciones (US-04)
 * - Título obligatorio (no vacío)
 * - Título máximo 120 caracteres (impide entrada + muestra error)
 * - Prioridad por defecto: "medium"
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*, --dojo-primary,
 * --dojo-danger, --dojo-radius, --dojo-radius-sm, --dojo-shadow
 */

import type { Priority } from '../../../types/models.js';

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low',    label: '⬇️ Baja'    },
  { value: 'medium', label: '➡️ Media'   },
  { value: 'high',   label: '⬆️ Alta'    },
  { value: 'urgent', label: '🔥 Urgente' },
];

export class DojoTaskDialog extends HTMLElement {
  static readonly TAG = 'dojo-task-dialog';

  private _shadow: ShadowRoot;
  private _columnId  = '';
  private _columnName = '';

  // Referencia estable para poder eliminar el listener de teclado
  private _onDocKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this._isOpen()) this._close();
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

  openCreate(columnId: string, columnName: string): void {
    this._columnId   = columnId;
    this._columnName = columnName;
    this._buildForm();
    this._open();
  }

  // ── Estado del diálogo ────────────────────────────────────────────────────

  private _isOpen(): boolean {
    return this._shadow.querySelector('.backdrop')?.getAttribute('aria-hidden') === 'false';
  }

  private _open(): void {
    const backdrop = this._shadow.querySelector<HTMLElement>('.backdrop');
    if (!backdrop) return;
    backdrop.setAttribute('aria-hidden', 'false');
    // Remover primero para evitar acumular listeners duplicados si se invoca
    // openCreate() varias veces sin cerrar el diálogo entre llamadas.
    document.removeEventListener('keydown', this._onDocKeydown);
    document.addEventListener('keydown', this._onDocKeydown);
  }

  private _close(): void {
    const backdrop = this._shadow.querySelector<HTMLElement>('.backdrop');
    if (!backdrop) return;
    backdrop.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', this._onDocKeydown);
  }

  // ── Render base ───────────────────────────────────────────────────────────

  private _render(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host { display: contents; }

      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 300;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .backdrop[aria-hidden="false"] { display: flex; }

      .dialog {
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius);
        box-shadow: var(--dojo-shadow);
        width: 100%;
        max-width: 460px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.125rem;
        animation: dlg-in 0.18s ease;
      }
      @keyframes dlg-in {
        from { opacity: 0; transform: scale(0.96) translateY(-8px); }
        to   { opacity: 1; transform: none; }
      }

      .dialog-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
        margin: 0;
      }
      .dialog-subtitle {
        font-size: 0.8125rem;
        color: var(--dojo-text-secondary);
        margin: 0;
        margin-top: -0.5rem;
      }

      /* Campos de formulario */
      .field { display: flex; flex-direction: column; gap: 0.375rem; }

      .field-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }

      .field label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--dojo-text-secondary);
      }

      .char-count {
        font-size: 0.75rem;
        color: var(--dojo-text-muted, var(--dojo-text-secondary));
      }
      .char-count.near-limit { color: var(--dojo-danger, #DC2626); }

      .field input,
      .field textarea,
      .field select {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.9375rem;
        color: var(--dojo-text-primary);
        background: var(--dojo-bg);
        width: 100%;
        box-sizing: border-box;
        transition: border-color 0.15s;
        font-family: inherit;
      }
      .field input:focus,
      .field textarea:focus,
      .field select:focus {
        outline: none;
        border-color: var(--dojo-primary, #1D4ED8);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--dojo-primary, #1D4ED8) 20%, transparent);
      }
      .field input[aria-invalid="true"],
      .field textarea[aria-invalid="true"] {
        border-color: var(--dojo-danger, #DC2626);
      }

      .field textarea {
        resize: vertical;
        min-height: 80px;
        line-height: 1.5;
      }

      .field-error {
        font-size: 0.75rem;
        color: var(--dojo-danger, #DC2626);
        display: none;
      }
      .field-error[aria-live] { display: block; }

      /* Acciones */
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.625rem;
        margin-top: 0.25rem;
      }
      .btn {
        padding: 0.4375rem 1rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid transparent;
        transition: opacity 0.15s;
      }
      .btn:hover { opacity: 0.85; }
      .btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }
      .btn-cancel {
        background: transparent;
        border-color: var(--dojo-border);
        color: var(--dojo-text-secondary);
      }
      .btn-primary {
        background: var(--dojo-primary, #1D4ED8);
        color: #fff;
      }
    `;
    this._shadow.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-labelledby', 'task-dlg-title');

    // Cerrar al clicar fuera del diálogo
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this._close();
    });

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    backdrop.appendChild(dialog);
    this._shadow.appendChild(backdrop);
  }

  // ── Formulario de creación ────────────────────────────────────────────────

  private _buildForm(): void {
    const dialog = this._shadow.querySelector<HTMLElement>('.dialog');
    if (!dialog) return;
    dialog.innerHTML = '';

    // ── Título del diálogo ─────────────────────────────────────────────────
    const h2 = document.createElement('h2');
    h2.id = 'task-dlg-title';
    h2.className = 'dialog-title';
    h2.textContent = 'Nueva tarea';
    dialog.appendChild(h2);

    const subtitle = document.createElement('p');
    subtitle.className = 'dialog-subtitle';
    // textContent es seguro (no hay input del usuario aquí)
    subtitle.textContent = `En columna: ${this._columnName}`;
    dialog.appendChild(subtitle);

    // ── Campo: Título (obligatorio, máx 120) ───────────────────────────────
    const MAX_TITLE = 120;
    const titleField = document.createElement('div');
    titleField.className = 'field';

    const titleHeader = document.createElement('div');
    titleHeader.className = 'field-header';

    const titleLabel = document.createElement('label');
    titleLabel.setAttribute('for', 'task-title-input');
    titleLabel.textContent = 'Título *';

    const charCount = document.createElement('span');
    charCount.className = 'char-count';
    charCount.setAttribute('aria-live', 'polite');
    charCount.textContent = `0 / ${MAX_TITLE}`;

    titleHeader.appendChild(titleLabel);
    titleHeader.appendChild(charCount);
    titleField.appendChild(titleHeader);

    const titleInput = document.createElement('input');
    titleInput.id = 'task-title-input';
    titleInput.type = 'text';
    titleInput.placeholder = 'Ej. Implementar autenticación';
    titleInput.maxLength = MAX_TITLE;
    titleInput.setAttribute('aria-required', 'true');
    titleInput.setAttribute('aria-describedby', 'task-title-error');

    titleInput.addEventListener('input', () => {
      // Usar trim() para que el contador y la limpieza de error reflejen el valor real
      const len = titleInput.value.trim().length;
      charCount.textContent = `${len} / ${MAX_TITLE}`;
      charCount.classList.toggle('near-limit', len >= MAX_TITLE * 0.9);
      if (len > 0) {
        titleInput.removeAttribute('aria-invalid');
        titleError.removeAttribute('aria-live');
      }
    });

    const titleError = document.createElement('span');
    titleError.id = 'task-title-error';
    titleError.className = 'field-error';
    titleError.textContent = 'El título es obligatorio.';

    titleField.appendChild(titleInput);
    titleField.appendChild(titleError);
    dialog.appendChild(titleField);

    // ── Campo: Descripción (opcional) ─────────────────────────────────────
    const descField = document.createElement('div');
    descField.className = 'field';

    const descLabel = document.createElement('label');
    descLabel.setAttribute('for', 'task-desc-input');
    descLabel.textContent = 'Descripción (Markdown, opcional)';

    const MAX_DESC = 2000;
    const descInput = document.createElement('textarea');
    descInput.id = 'task-desc-input';
    descInput.placeholder = 'Describe la tarea…';
    descInput.rows = 3;
    descInput.maxLength = MAX_DESC;

    descField.appendChild(descLabel);
    descField.appendChild(descInput);
    dialog.appendChild(descField);

    // ── Campo: Prioridad (default medium) ─────────────────────────────────
    const priField = document.createElement('div');
    priField.className = 'field';

    const priLabel = document.createElement('label');
    priLabel.setAttribute('for', 'task-priority-select');
    priLabel.textContent = 'Prioridad';

    const priSelect = document.createElement('select');
    priSelect.id = 'task-priority-select';
    priSelect.setAttribute('aria-label', 'Seleccionar prioridad');

    PRIORITIES.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      if (value === 'medium') opt.selected = true;
      priSelect.appendChild(opt);
    });

    priField.appendChild(priLabel);
    priField.appendChild(priSelect);
    dialog.appendChild(priField);

    // ── Campo: Fecha de vencimiento (opcional, US-17) ─────────────────────
    const dueField = document.createElement('div');
    dueField.className = 'field';

    const dueLabel = document.createElement('label');
    dueLabel.setAttribute('for', 'task-due-date-input');
    dueLabel.textContent = 'Fecha de vencimiento (opcional)';

    const dueInput = document.createElement('input');
    dueInput.id   = 'task-due-date-input';
    dueInput.type = 'date';
    dueInput.setAttribute('aria-label', 'Fecha de vencimiento');

    dueField.appendChild(dueLabel);
    dueField.appendChild(dueInput);
    dialog.appendChild(dueField);

    // ── Acciones ───────────────────────────────────────────────────────────
    const actions = document.createElement('div');
    actions.className = 'actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => this._close());

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = 'Crear tarea';
    confirmBtn.addEventListener('click', () => {
      const title = titleInput.value.trim();

      // Validación: título obligatorio
      if (!title) {
        titleInput.setAttribute('aria-invalid', 'true');
        titleError.setAttribute('aria-live', 'assertive');
        titleInput.focus();
        return;
      }

      this.dispatchEvent(new CustomEvent('dojo:dialog-create-task', {
        bubbles:  true,
        composed: true,
        detail: {
          statusId:    this._columnId,
          title,
          description: descInput.value.trim(),
          priority:    priSelect.value as Priority,
          dueDate:     (() => {
            if (!dueInput.value) return null;
            const parts = dueInput.value.split('-');
            if (parts.length !== 3) return null;
            const [y, m, d] = parts.map(Number);
            if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
            const date = new Date(y, m - 1, d, 23, 59, 59, 999);
            return isNaN(date.getTime()) ? null : date.toISOString();
          })(),
        },
      }));
      this._close();
    });

    // Enter en el campo título también confirma
    titleInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') confirmBtn.click();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    dialog.appendChild(actions);

    // Foco inicial al input de título
    setTimeout(() => titleInput.focus(), 50);
  }
}

customElements.define(DojoTaskDialog.TAG, DojoTaskDialog);
