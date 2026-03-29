/**
 * dojo-task-dialog — Organismo
 *
 * Diálogo modal para crear tareas en el tablero Kanban.
 * Implementa los criterios de aceptación de US-04 y US-23.
 *
 * ## API Pública
 * | Método                          | Descripción                              |
 * |---------------------------------|------------------------------------------|
 * | openCreate(columnId, colName)   | Abre el formulario de creación de tarea  |
 *
 * ## Eventos despachados
 * | Nombre                    | Detalle                                                 | Descripción           |
 * |---------------------------|---------------------------------------------------------|-----------------------|
 * | dojo:dialog-create-task   | { statusId, title, description, priority, labelIds }    | Usuario confirmó crear|
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

import type { Priority, Label, Project } from '../../../types/models.js';
import { getAllLabels, createLabel } from '../../../db/label.repository.js';
import { getAllProjects } from '../../../db/project.repository.js';
import { pickTextColor, meetsWcagAA, suggestAccessibleColor } from '../../../utils/contrast.js';

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

  // US-23: estado de etiquetas
  private _allLabels: Label[] = [];
  private _selectedLabelIds: Set<string> = new Set();
  // US-26: estado de proyectos
  private _allProjects: Project[] = [];
  // US-28: título prellenado desde la paleta de comandos
  private _prefillTitle = '';

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

  openCreate(columnId: string, columnName: string, prefillTitle = ''): void {
    this._columnId   = columnId;
    this._columnName = columnName;
    this._prefillTitle = prefillTitle;
    this._selectedLabelIds = new Set();
    // Cargar etiquetas (US-23) y proyectos (US-26), luego construir el formulario
    Promise.all([
      getAllLabels().catch(() => [] as Label[]),
      getAllProjects().catch(() => [] as Project[]),
    ]).then(([labels, projects]) => {
      this._allLabels = labels;
      this._allProjects = projects;
      this._buildForm();
      this._open();
    });
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
        max-width: 560px;
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
        min-height: 120px;
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

      /* ── Etiquetas — US-23 ── */
      .labels-field { display: flex; flex-direction: column; gap: 0.375rem; }
      .labels-field label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--dojo-text-secondary);
      }
      .labels-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
        min-height: 28px;
        align-items: center;
      }
      .label-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.2rem 0.5rem;
        border-radius: 99px;
        font-size: 0.75rem;
        font-weight: 500;
      }
      .label-chip-remove {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        font-size: 0.875rem;
        opacity: 0.65;
        transition: opacity 0.1s;
        color: inherit;
      }
      .label-chip-remove:hover { opacity: 1; }
      .label-chip-remove:focus-visible {
        outline: 1px solid currentColor;
        border-radius: 2px;
      }
      .add-label-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.2rem 0.6rem;
        border: 1px dashed var(--dojo-border);
        border-radius: 99px;
        font-size: 0.75rem;
        color: var(--dojo-text-secondary);
        background: transparent;
        cursor: pointer;
        transition: border-color 0.15s, color 0.15s;
        font-family: inherit;
      }
      .add-label-btn:hover {
        border-color: var(--dojo-primary, #1D4ED8);
        color: var(--dojo-primary, #1D4ED8);
      }
      .add-label-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }
      .labels-picker {
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        background: var(--dojo-surface);
        box-shadow: var(--dojo-shadow);
        max-height: 180px;
        overflow-y: auto;
        display: none;
        margin-top: 0.25rem;
      }
      .labels-picker.open { display: block; }
      .label-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4375rem 0.75rem;
        cursor: pointer;
        font-size: 0.875rem;
        transition: background 0.1s;
      }
      .label-option:hover { background: var(--dojo-bg); }
      .label-option input[type="checkbox"] {
        accent-color: var(--dojo-primary, #1D4ED8);
        flex-shrink: 0;
      }
      .label-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .labels-search {
        display: block;
        width: 100%;
        padding: 0.4375rem 0.75rem;
        border: none;
        border-bottom: 1px solid var(--dojo-border);
        background: transparent;
        font-size: 0.8125rem;
        color: var(--dojo-text-primary);
        box-sizing: border-box;
        font-family: inherit;
        outline: none;
      }
      .labels-search:focus {
        border-bottom-color: var(--dojo-primary, #1D4ED8);
        background: var(--dojo-bg);
      }
      .label-create-option {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.4375rem 0.75rem;
        cursor: pointer;
        font-size: 0.8125rem;
        color: var(--dojo-primary, #1D4ED8);
        font-weight: 500;
        border-top: 1px solid var(--dojo-border);
      }
      .label-create-option:hover { background: var(--dojo-bg); }
      .label-create-option:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: -2px;
      }
      .label-create-form {
        padding: 0.625rem 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border-top: 1px solid var(--dojo-border);
      }
      .label-create-form-title {
        font-size: 0.6875rem;
        font-weight: 700;
        color: var(--dojo-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .label-color-palette {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3125rem;
      }
      .color-swatch {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        padding: 0;
        outline: none;
        transition: border-color 0.12s, transform 0.12s;
      }
      .color-swatch.selected,
      .color-swatch:focus-visible {
        border-color: var(--dojo-text-primary, #111);
        transform: scale(1.2);
      }
      .label-custom-color-row {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.8125rem;
        color: var(--dojo-text-secondary);
      }
      .label-color-input {
        width: 36px;
        height: 22px;
        border: 1px solid var(--dojo-border);
        border-radius: 3px;
        padding: 0 2px;
        cursor: pointer;
        background: transparent;
      }
      .label-error {
        font-size: 0.75rem;
        color: #EF4444;
      }
      .label-contrast-warning {
        font-size: 0.75rem;
        color: #92400E;
        background: #FEF3C7;
        border: 1px solid #F59E0B;
        border-radius: var(--dojo-radius-sm, 4px);
        padding: 0.3rem 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .label-create-actions {
        display: flex;
        gap: 0.375rem;
        justify-content: flex-end;
      }
      .label-btn {
        padding: 0.25rem 0.625rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.75rem;
        cursor: pointer;
        font-family: inherit;
        border: 1px solid var(--dojo-border);
        background: transparent;
        color: var(--dojo-text-secondary);
        transition: background 0.15s;
      }
      .label-btn:hover { background: var(--dojo-bg); color: var(--dojo-text-primary); }
      .label-btn-primary {
        background: var(--dojo-primary, #1D4ED8);
        border-color: var(--dojo-primary, #1D4ED8);
        color: #fff;
        font-weight: 600;
      }
      .label-btn-primary:hover { opacity: 0.88; }
      .label-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
      .label-btn:focus-visible,
      .label-btn-primary:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }
      .label-info-notice {
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
        color: var(--dojo-primary, #1D4ED8);
        background: color-mix(in srgb, var(--dojo-primary, #1D4ED8) 8%, transparent);
        border-top: 1px solid var(--dojo-border);
        line-height: 1.4;
        margin: 0;
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
    descInput.rows = 5;
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

    // ── Campo: Proyecto (US-26) ────────────────────────────────────────────
    const projField = document.createElement('div');
    projField.className = 'field';

    const projLabel = document.createElement('label');
    projLabel.setAttribute('for', 'task-project-select');
    projLabel.textContent = 'Proyecto';

    const projSelect = document.createElement('select');
    projSelect.id = 'task-project-select';
    projSelect.setAttribute('aria-label', 'Seleccionar proyecto');

    for (const proj of this._allProjects) {
      const opt = document.createElement('option');
      opt.value = proj.id;
      opt.textContent = `${proj.prefix} — ${proj.name}`;
      // Seleccionar "General" por defecto
      if (proj.prefix === 'GEN') opt.selected = true;
      projSelect.appendChild(opt);
    }

    projField.appendChild(projLabel);
    projField.appendChild(projSelect);
    dialog.appendChild(projField);

    // ── Campo: Etiquetas (US-23) ──────────────────────────────────────────
    const labelsField = document.createElement('div');
    labelsField.className = 'labels-field';

    const labelsLabel = document.createElement('label');
    labelsLabel.textContent = 'Etiquetas (opcional)';
    labelsField.appendChild(labelsLabel);

    const chips = document.createElement('div');
    chips.className = 'labels-chips';
    chips.setAttribute('aria-label', 'Etiquetas seleccionadas');
    labelsField.appendChild(chips);

    const picker = document.createElement('div');
    picker.className = 'labels-picker';
    picker.id = 'labels-picker-dropdown';
    picker.setAttribute('aria-label', 'Selector de etiquetas disponibles');
    labelsField.appendChild(picker);

    // Paleta WCAG AA (contraste ≥ 4.5:1 con #FFFFFF) — US-13
    const PRESET_COLORS = [
      '#B91C1C', '#C2410C', '#B45309', '#15803D',
      '#1D4ED8', '#4338CA', '#6D28D9', '#BE185D',
      '#0E7490', '#374151',
    ];
    const PRESET_COLOR_NAMES = [
      'Rojo', 'Naranja', 'Ámbar', 'Verde',
      'Azul', 'Índigo', 'Violeta', 'Rosa',
      'Cian', 'Gris',
    ];

    let pickerOpen   = false;
    let searchTerm   = '';
    let showCreateForm = false;
    let pendingColor = PRESET_COLORS[0];

    // Navegación por teclado dentro del picker
    picker.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        if (showCreateForm) {
          showCreateForm = false;
          renderPicker();
          requestAnimationFrame(() =>
            picker.querySelector<HTMLInputElement>('.labels-search')?.focus()
          );
        } else {
          pickerOpen = false;
          picker.classList.remove('open');
          chips.querySelector<HTMLElement>('.add-label-btn')?.focus();
        }
        return;
      }
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        const focusable = Array.from(
          picker.querySelectorAll<HTMLElement>(
            'input[type="checkbox"], .label-create-option, .color-swatch, .label-btn, .label-btn-primary, input[type="color"]'
          )
        );
        if (focusable.length < 2) return;
        const current = focusable.indexOf(this._shadow.activeElement as HTMLElement);
        if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          const next = current >= 0 ? (current + 1) % focusable.length : 0;
          focusable[next].focus();
        } else {
          ev.preventDefault();
          const prev = current >= 0 ? (current - 1 + focusable.length) % focusable.length : focusable.length - 1;
          focusable[prev].focus();
        }
      }
    });

    // ── Render chips ───────────────────────────────────────────────────────
    const renderChips = (): void => {
      chips.innerHTML = '';

      this._selectedLabelIds.forEach(labelId => {
        const label = this._allLabels.find(l => l.id === labelId);
        if (!label) return;

        let textColor = '#ffffff';
        const HEX_COLOR_RE = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/;
        if (HEX_COLOR_RE.test(label.color)) {
          try { textColor = pickTextColor(label.color); } catch { /* fallback blanco */ }
        }

        const chip = document.createElement('span');
        chip.className = 'label-chip';
        chip.style.backgroundColor = label.color;
        chip.style.color = textColor;

        const chipText = document.createElement('span');
        chipText.textContent = label.name;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'label-chip-remove';
        removeBtn.setAttribute('aria-label', `Quitar etiqueta ${label.name}`);
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => {
          this._selectedLabelIds.delete(labelId);
          renderChips();
          renderPicker();
        });

        chip.appendChild(chipText);
        chip.appendChild(removeBtn);
        chips.appendChild(chip);
      });

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'add-label-btn';
      addBtn.textContent = '＋ Etiqueta';
      addBtn.setAttribute('aria-expanded', String(pickerOpen));
      addBtn.setAttribute('aria-controls', 'labels-picker-dropdown');
      addBtn.addEventListener('click', () => {
        pickerOpen = !pickerOpen;
        picker.classList.toggle('open', pickerOpen);
        addBtn.setAttribute('aria-expanded', String(pickerOpen));
        if (pickerOpen) {
          renderPicker();
          requestAnimationFrame(() =>
            picker.querySelector<HTMLInputElement>('.labels-search')?.focus()
          );
        }
      });
      chips.appendChild(addBtn);
    };

    // ── Formulario inline de creación (US-23 + US-09 pattern) ─────────────
    const buildCreateForm = (name: string): HTMLElement => {
      const form = document.createElement('div');
      form.className = 'label-create-form';
      form.setAttribute('role', 'group');
      form.setAttribute('aria-label', `Crear etiqueta "${name}"`);

      const formTitle = document.createElement('span');
      formTitle.className = 'label-create-form-title';
      formTitle.textContent = `Color para "${name}"`;
      form.appendChild(formTitle);

      const palette = document.createElement('div');
      palette.className = 'label-color-palette';
      PRESET_COLORS.forEach(c => {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'color-swatch' + (pendingColor === c ? ' selected' : '');
        swatch.style.backgroundColor = c;
        const colorName = PRESET_COLOR_NAMES[PRESET_COLORS.indexOf(c)] ?? c;
        swatch.setAttribute('aria-label', `Color ${colorName}`);
        swatch.setAttribute('aria-pressed', String(pendingColor === c));
        swatch.title = colorName;
        swatch.dataset['color'] = c;
        swatch.addEventListener('click', () => {
          pendingColor = c;
          palette.querySelectorAll<HTMLButtonElement>('.color-swatch').forEach(s => {
            const active = s.dataset['color'] === c;
            s.classList.toggle('selected', active);
            s.setAttribute('aria-pressed', String(active));
          });
          const ci = form.querySelector<HTMLInputElement>('.label-color-input');
          if (ci) ci.value = c;
          updateContrastWarning(c);
        });
        palette.appendChild(swatch);
      });
      form.appendChild(palette);

      const customRow = document.createElement('div');
      customRow.className = 'label-custom-color-row';
      const customLbl = document.createElement('span');
      customLbl.textContent = 'Personalizado:';
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'label-color-input';
      colorInput.value = pendingColor;
      colorInput.setAttribute('aria-label', 'Color personalizado para la etiqueta');
      colorInput.addEventListener('input', () => {
        pendingColor = colorInput.value;
        palette.querySelectorAll<HTMLButtonElement>('.color-swatch').forEach(s => {
          const active = s.dataset['color'] === pendingColor;
          s.classList.toggle('selected', active);
          s.setAttribute('aria-pressed', String(active));
        });
        updateContrastWarning(pendingColor);
      });
      customRow.appendChild(customLbl);
      customRow.appendChild(colorInput);
      form.appendChild(customRow);

      // Advertencia de contraste WCAG (US-13)
      const contrastWarning = document.createElement('div');
      contrastWarning.className = 'label-contrast-warning';
      contrastWarning.setAttribute('role', 'alert');
      contrastWarning.style.display = 'none';
      form.appendChild(contrastWarning);

      const errorEl = document.createElement('span');
      errorEl.className = 'label-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.setAttribute('aria-live', 'polite');
      errorEl.style.display = 'none';
      form.appendChild(errorEl);

      const formActions = document.createElement('div');
      formActions.className = 'label-create-actions';

      const cancelFormBtn = document.createElement('button');
      cancelFormBtn.type = 'button';
      cancelFormBtn.className = 'label-btn';
      cancelFormBtn.textContent = 'Cancelar';
      cancelFormBtn.addEventListener('click', () => {
        showCreateForm = false;
        pendingColor = PRESET_COLORS[0];
        renderPicker();
        requestAnimationFrame(() =>
          picker.querySelector<HTMLInputElement>('.labels-search')?.focus()
        );
      });

      const updateContrastWarning = (color: string): void => {
        const isPreset = PRESET_COLORS.includes(color);
        if (isPreset || meetsWcagAA('#FFFFFF', color)) {
          contrastWarning.style.display = 'none';
          confirmCreateBtn.disabled = false;
          return;
        }
        const suggested = suggestAccessibleColor(color, '#FFFFFF');
        contrastWarning.innerHTML = '';
        const msg = document.createElement('span');
        msg.textContent = 'El color no tiene suficiente contraste con texto blanco (mínimo 4.5:1 WCAG AA).';
        contrastWarning.appendChild(msg);
        const row = document.createElement('span');
        row.style.cssText = 'display:inline-flex;align-items:center;gap:0.375rem;font-size:0.75rem;';
        const sw = document.createElement('span');
        sw.style.cssText = `display:inline-block;width:14px;height:14px;border-radius:3px;background:${suggested};border:1px solid rgba(0,0,0,.2);flex-shrink:0;`;
        sw.setAttribute('aria-hidden', 'true');
        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:.75rem;color:var(--dojo-primary,#1D4ED8);padding:0;font-family:inherit;text-decoration:underline;';
        applyBtn.textContent = `Usar versión accesible (${suggested})`;
        applyBtn.addEventListener('click', () => {
          pendingColor = suggested;
          colorInput.value = suggested;
          palette.querySelectorAll<HTMLButtonElement>('.color-swatch').forEach(s => {
            const active = s.dataset['color'] === suggested;
            s.classList.toggle('selected', active);
            s.setAttribute('aria-pressed', String(active));
          });
          updateContrastWarning(suggested);
        });
        row.appendChild(sw);
        row.appendChild(applyBtn);
        contrastWarning.appendChild(row);
        contrastWarning.style.display = '';
        confirmCreateBtn.disabled = true;
      };

      const confirmCreateBtn = document.createElement('button');
      confirmCreateBtn.type = 'button';
      confirmCreateBtn.className = 'label-btn label-btn-primary';
      confirmCreateBtn.textContent = 'Crear';
      confirmCreateBtn.setAttribute('aria-label', `Confirmar creación de etiqueta "${name}"`);
      confirmCreateBtn.addEventListener('click', async () => {
        if (!pendingColor) {
          errorEl.textContent = 'Debes seleccionar un color.';
          errorEl.style.display = '';
          return;
        }
        confirmCreateBtn.disabled = true;
        confirmCreateBtn.textContent = '…';
        try {
          const newLabel = await createLabel({ name, color: pendingColor });
          this._allLabels = [...this._allLabels, newLabel].sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
          );
          this._selectedLabelIds.add(newLabel.id);
          this.dispatchEvent(new CustomEvent('dojo:label-created', {
            bubbles: true, composed: true,
            detail: { label: newLabel },
          }));
          searchTerm     = '';
          showCreateForm = false;
          pendingColor   = PRESET_COLORS[0];
          renderChips();
          pickerOpen = false;
          picker.classList.remove('open');
          chips.querySelector<HTMLElement>('.add-label-btn')?.focus();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error al crear la etiqueta';
          errorEl.textContent = msg;
          errorEl.style.display = '';
          confirmCreateBtn.disabled = false;
          confirmCreateBtn.textContent = 'Crear';
        }
      });

      formActions.appendChild(cancelFormBtn);
      formActions.appendChild(confirmCreateBtn);
      form.appendChild(formActions);
      return form;
    };

    // ── Render picker con búsqueda ────────────────────────────────────────
    const renderPicker = (): void => {
      picker.innerHTML = '';

      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'labels-search';
      searchInput.placeholder = 'Buscar o crear etiqueta…';
      searchInput.maxLength = 30;
      searchInput.value = searchTerm;
      searchInput.setAttribute('aria-label', 'Buscar etiqueta');
      searchInput.setAttribute('autocomplete', 'off');
      searchInput.addEventListener('input', () => {
        const newVal = searchInput.value;
        if (newVal === searchTerm) return;
        searchTerm = newVal;
        const trimmedNew = newVal.trim();
        if (showCreateForm) {
          const hasExact = this._allLabels.some(
            l => l.name.toLowerCase() === trimmedNew.toLowerCase()
          );
          if (!trimmedNew || hasExact) showCreateForm = false;
        }
        renderPicker();
        requestAnimationFrame(() => {
          const s = picker.querySelector<HTMLInputElement>('.labels-search');
          if (s) { s.focus(); const len = s.value.length; s.setSelectionRange(len, len); }
        });
      });
      picker.appendChild(searchInput);

      const trimmed = searchTerm.trim();
      const filtered = trimmed
        ? this._allLabels.filter(l => l.name.toLowerCase().includes(trimmed.toLowerCase()))
        : this._allLabels;

      if (filtered.length === 0 && !trimmed) {
        const empty = document.createElement('p');
        empty.style.cssText = 'padding:.375rem .75rem;font-size:.8125rem;color:var(--dojo-text-secondary);margin:0';
        empty.textContent = 'No hay etiquetas. Escribe un nombre para crear una.';
        picker.appendChild(empty);
      } else {
        filtered.forEach(label => {
          const isSelected = this._selectedLabelIds.has(label.id);

          const optionEl = document.createElement('label');
          optionEl.className = 'label-option';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = isSelected;
          cb.setAttribute('aria-label', label.name);
          cb.addEventListener('change', () => {
            if (cb.checked) {
              this._selectedLabelIds.add(label.id);
            } else {
              this._selectedLabelIds.delete(label.id);
            }
            renderChips();
          });

          const dot = document.createElement('span');
          dot.className = 'label-dot';
          dot.style.backgroundColor = label.color;
          dot.setAttribute('aria-hidden', 'true');

          const namePart = document.createElement('span');
          namePart.textContent = label.name;

          optionEl.appendChild(cb);
          optionEl.appendChild(dot);
          optionEl.appendChild(namePart);
          picker.appendChild(optionEl);
        });
      }

      // Opción / formulario de creación cuando no hay coincidencia exacta
      if (trimmed) {
        const hasExact = this._allLabels.some(
          l => l.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (!hasExact) {
          if (showCreateForm) {
            picker.appendChild(buildCreateForm(trimmed));
          } else {
            const createOpt = document.createElement('div');
            createOpt.className = 'label-create-option';
            createOpt.setAttribute('role', 'button');
            createOpt.setAttribute('tabindex', '0');
            const icon = document.createElement('span');
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = '＋';
            const labelEl = document.createElement('span');
            labelEl.textContent = `Crear etiqueta "${trimmed}"`;
            createOpt.appendChild(icon);
            createOpt.appendChild(labelEl);
            const activate = (): void => {
              showCreateForm = true;
              pendingColor   = PRESET_COLORS[0];
              renderPicker();
              requestAnimationFrame(() =>
                picker.querySelector<HTMLInputElement>('.labels-search')?.focus()
              );
            };
            createOpt.addEventListener('click', activate);
            createOpt.addEventListener('keydown', (ev: KeyboardEvent) => {
              if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); activate(); }
            });
            picker.appendChild(createOpt);
          }
        } else {
          const matchedLabel = this._allLabels.find(l => l.name.toLowerCase() === trimmed.toLowerCase())!;
          if (matchedLabel.name !== trimmed) {
            const notice = document.createElement('p');
            notice.className = 'label-info-notice';
            notice.textContent = `ℹ️\u00a0«${matchedLabel.name}» ya existe — selecciónala en la lista.`;
            picker.appendChild(notice);
          }
        }
      }
    };

    renderChips();
    dialog.appendChild(labelsField);

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
          labelIds:    [...this._selectedLabelIds],
          projectId:   projSelect.value || undefined,
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

      // Limpieza defensiva del picker antes de cerrar (US-23 review)
      pickerOpen = false;
      picker.classList.remove('open');
      this._close();
    });

    // Enter en el campo título también confirma
    titleInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') confirmBtn.click();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    dialog.appendChild(actions);

    // US-28: Prellenar título si se proporcionó desde la paleta de comandos
    if (this._prefillTitle) {
      titleInput.value = this._prefillTitle;
      charCount.textContent = `${this._prefillTitle.length} / ${MAX_TITLE}`;
      this._prefillTitle = '';
    }

    // Foco inicial al input de título
    setTimeout(() => titleInput.focus(), 50);
  }
}

customElements.define(DojoTaskDialog.TAG, DojoTaskDialog);
