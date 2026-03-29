/**
 * dojo-task-card — Átomo
 *
 * Tarjeta arrastrable que representa una tarea en el tablero Kanban.
 * Implementa la API nativa HTML5 Drag & Drop requerida por US-03.
 *
 * ## Atributos observados
 * | Atributo       | Tipo   | Descripción                             |
 * |----------------|--------|-----------------------------------------|
 * | task-id        | string | UUID de la tarea en IndexedDB           |
 * | task-title     | string | Título visible (máx. 120 chars)         |
 * | task-priority  | string | low | medium | high | urgent             |
 *
 * ## Propiedades públicas
 * | Propiedad   | Tipo     | Descripción                                     |
 * |-------------|----------|-------------------------------------------------|
 * | taskLabels  | Label[]  | Etiquetas asociadas; re-renderiza automáticamente|
 *
 * ## Eventos despachados
 * | Nombre          | Detalle          | Descripción                      |
 * |-----------------|------------------|----------------------------------|
 * | dojo:task-open  | { taskId }       | Usuario hizo clic en la tarjeta  |
 *
 * ## CSS Custom Properties
 * --dojo-surface, --dojo-border, --dojo-radius, --dojo-text-*,
 * --dojo-primary, --dojo-shadow,
 * --dojo-priority-low, --dojo-priority-medium,
 * --dojo-priority-high, --dojo-priority-urgent
 */

import type { Label } from '../../../types/models.js';
import { getDueStatus, formatRelativeDate, type DueStatus } from '../../../utils/date.js';
// US-13: texto de chips siempre #FFFFFF (todos los colores de paleta cumplen ≥ 4.5:1 con blanco)

export class DojoTaskCard extends HTMLElement {
  static readonly TAG = 'dojo-task-card';

  static get observedAttributes(): string[] {
    return ['task-id', 'task-title', 'task-priority', 'task-created-at', 'task-due-date', 'task-number'];
  }

  private _shadow: ShadowRoot;

  /** Etiquetas asociadas a esta tarjeta (US-10) */
  private _labels: Label[] = [];

  get taskLabels(): Label[] { return this._labels; }
  set taskLabels(labels: Label[]) {
    this._labels = [...labels];
    if (this.isConnected) this._render();
  }

  /** Progreso de subtareas (US-21): [completadas, total] */
  private _subtasksDone  = 0;
  private _subtasksTotal = 0;

  get subtasksDone(): number  { return this._subtasksDone; }
  get subtasksTotal(): number { return this._subtasksTotal; }

  setSubtaskProgress(done: number, total: number): void {
    if (!Number.isFinite(done) || !Number.isFinite(total) || total < 0) return;
    this._subtasksDone  = Math.max(0, Math.min(done, total));
    this._subtasksTotal = total;
    if (this.isConnected) this._render();
  }

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (this._shadow.childElementCount === 0) {
      this._render();
    }
    this.setAttribute('draggable', 'true');
    this.setAttribute('role', 'listitem');
    // WCAG 2.1 SC 2.1.1 (Keyboard, Level A): permite foco por teclado
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
    this.addEventListener('dragstart', this._onDragStart);
    this.addEventListener('dragend',   this._onDragEnd);
    this.addEventListener('click',     this._onClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener('dragstart', this._onDragStart);
    this.removeEventListener('dragend',   this._onDragEnd);
    this.removeEventListener('click',     this._onClick);
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this._render();
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get taskId(): string    { return this.getAttribute('task-id') ?? ''; }
  get taskTitle(): string { return this.getAttribute('task-title') ?? ''; }
  get priority(): string  { return this.getAttribute('task-priority') ?? 'medium'; }
  get createdAt(): string { return this.getAttribute('task-created-at') ?? ''; }
  get dueDate(): string   { return this.getAttribute('task-due-date') ?? ''; }
  get taskNumber(): string { return this.getAttribute('task-number') ?? ''; }

  // ── Drag handlers ─────────────────────────────────────────────────────────

  private _onDragStart = (e: DragEvent): void => {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      // Usar tipo MIME personalizado para distinguir de arrastre de columnas
      e.dataTransfer.setData('text/dojo-task-id', this.taskId);
      // Fallback para compatibilidad con navegadores más antiguos
      e.dataTransfer.setData('text/plain', this.taskId);
    }
    this.setAttribute('dragging', '');
    // CRÍTICO: evitar que el column-drag se dispare cuando se arrastra una tarjeta
    e.stopPropagation();
  };

  private _onDragEnd = (): void => {
    this.removeAttribute('dragging');
    // Limpiar cualquier indicador de drop que quedara pendiente
    this.removeAttribute('drop-indicator');
  };

  private _onClick = (e: MouseEvent): void => {
    // Evitar que el click del drag se interprete como tap
    if (e.defaultPrevented) return;
    this.dispatchEvent(new CustomEvent('dojo:task-open', {
      bubbles: true, composed: true,
      detail: { taskId: this.taskId },
    }));
  };

  // ── Prioridades ───────────────────────────────────────────────────────────

  private static readonly PRIORITY_CONFIG = {
    low:    { icon: '⬇️', label: 'Baja',    color: 'var(--dojo-priority-low,    #3B82F6)' },
    medium: { icon: '➡️', label: 'Media',   color: 'var(--dojo-priority-medium, #F59E0B)' },
    high:   { icon: '⬆️', label: 'Alta',    color: 'var(--dojo-priority-high,   #F97316)' },
    urgent: { icon: '🔥', label: 'Urgente', color: 'var(--dojo-priority-urgent, #EF4444)' },
  } as const;

  // ── Render ────────────────────────────────────────────────────────────────

  /** Mapeo estado → clase CSS para borde de alerta de vencimiento (US-17). */
  private static readonly DUE_STATUS_CLASS: Record<DueStatus, string> = {
    overdue:    'due-overdue',
    'due-soon': 'due-soon',
    normal:     '',
    none:       '',
  };

  private _render(): void {
    const p       = this.priority as keyof typeof DojoTaskCard.PRIORITY_CONFIG;
    const pConfig = DojoTaskCard.PRIORITY_CONFIG[p] ?? DojoTaskCard.PRIORITY_CONFIG.medium;
    const dueStatus = getDueStatus(this.dueDate || null);
    const dueCls    = DojoTaskCard.DUE_STATUS_CLASS[dueStatus];

    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius, 6px);
        padding: 0.625rem 0.75rem;
        cursor: grab;
        user-select: none;
        box-shadow: 0 1px 2px rgba(0,0,0,.06);
        transition: box-shadow 0.15s, opacity 0.15s, transform 0.12s;
        outline: none;
        position: relative;
      }

      /* Estado: siendo arrastrada */
      :host([dragging]) {
        opacity: 0.4;
        cursor: grabbing;
        transform: rotate(1.5deg) scale(0.98);
      }

      /* Estado: hover */
      :host(:hover:not([dragging])) {
        box-shadow: 0 4px 10px rgba(0,0,0,.12);
      }

      /* Foco accesible */
      :host(:focus-visible) {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* Acciones rápidas en hover (US-06, US-16) */
      .card-actions {
        position: absolute;
        top: 0.375rem;
        right: 0.375rem;
        display: flex;
        align-items: center;
        gap: 0.125rem;
        opacity: 0;
        transition: opacity 0.15s;
        z-index: 1;
      }
      :host(:hover) .card-actions,
      :host(:focus-within) .card-actions {
        opacity: 1;
      }
      .quick-delete-btn,
      .drag-handle-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0.2rem 0.3rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.8125rem;
        color: var(--dojo-text-secondary);
        line-height: 1;
        font-family: inherit;
        transition: background 0.15s, color 0.15s;
      }
      .quick-delete-btn:hover {
        background: #FEE2E2;
        color: #EF4444;
      }
      .drag-handle-btn {
        cursor: grab;
      }
      .drag-handle-btn:hover {
        background: var(--dojo-bg);
      }
      .drag-handle-btn:active {
        cursor: grabbing;
      }
      .quick-delete-btn:focus-visible,
      .drag-handle-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* Indicador de posición de drop — línea en la parte superior */
      :host([drop-indicator="top"])::before {
        content: '';
        position: absolute;
        top: -3px;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--dojo-primary, #1D4ED8);
        border-radius: 2px;
      }

      /* Indicador de posición de drop — línea en la parte inferior */
      :host([drop-indicator="bottom"])::after {
        content: '';
        position: absolute;
        bottom: -3px;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--dojo-primary, #1D4ED8);
        border-radius: 2px;
      }

      /* Título de la tarjeta */
      .title {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--dojo-text-primary);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        line-height: 1.4;
        word-break: break-word;
        margin: 0 0 0.5rem 0;
      }

      /* Identificador de proyecto (US-26) */
      .task-number {
        font-size: 0.625rem;
        font-weight: 600;
        color: var(--dojo-primary, #1D4ED8);
        letter-spacing: 0.04em;
        margin-bottom: 0.125rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }

      /* Footer: prioridad (izq) + fecha (der) */
      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.375rem;
        margin-top: 0.25rem;
      }
      .footer-priority {
        display: flex;
        align-items: center;
        gap: 0.375rem;
      }

      .priority-icon {
        font-size: 0.875rem;
        line-height: 1;
        flex-shrink: 0;
      }

      .priority-label {
        font-size: 0.6875rem;
        color: var(--dojo-text-muted, var(--dojo-text-secondary));
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      /* Fecha de creación (US-16) */
      .date-label {
        font-size: 0.625rem;
        color: var(--dojo-text-muted, var(--dojo-text-secondary));
        white-space: nowrap;
        flex-shrink: 0;
      }

      /* ── Alertas de vencimiento (US-17) ── */
      :host(.due-overdue) {
        border-color: var(--dojo-due-overdue, #EF4444);
        border-width: 2px;
      }
      :host(.due-soon) {
        border-color: var(--dojo-due-soon, #F59E0B);
        border-width: 2px;
      }
      .due-date-label {
        font-size: 0.625rem;
        white-space: nowrap;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
      }
      .due-date-label.due-overdue {
        color: var(--dojo-due-overdue, #EF4444);
        font-weight: 600;
      }
      .due-date-label.due-soon {
        color: var(--dojo-due-soon, #F59E0B);
        font-weight: 600;
      }
      .due-date-label.due-normal {
        color: var(--dojo-text-muted, var(--dojo-text-secondary));
      }

      /* Progreso de subtareas (US-21) */
      .subtask-progress {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        margin-top: 0.25rem;
        margin-bottom: 0.25rem;
      }
      .subtask-progress-text {
        font-size: 0.625rem;
        color: var(--dojo-text-muted, var(--dojo-text-secondary));
        white-space: nowrap;
        flex-shrink: 0;
      }
      .subtask-progress-bar {
        flex: 1;
        height: 4px;
        background: var(--dojo-border);
        border-radius: 2px;
        overflow: hidden;
      }
      .subtask-progress-fill {
        height: 100%;
        background: var(--dojo-primary, #1D4ED8);
        border-radius: 2px;
        transition: width 0.2s;
      }

      /* Chips de etiquetas (US-10) */
      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.1875rem;
        margin-top: 0.25rem;
        margin-bottom: 0.25rem;
      }
      .task-label-chip {
        display: inline-flex;
        align-items: center;
        padding: 0.1rem 0.375rem;
        border-radius: 999px;
        font-size: 0.625rem;
        font-weight: 500;
        line-height: 1.4;
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;
    this._shadow.appendChild(style);

    // ── Clase de alerta de vencimiento en el host (US-17) ─────────────────
    this.classList.remove('due-overdue', 'due-soon');
    if (dueCls) this.classList.add(dueCls);

    // ── Acciones rápidas en hover (US-06, US-16) ──────────────────────────
    const cardActions = document.createElement('div');
    cardActions.className = 'card-actions';

    const dragHandleBtn = document.createElement('button');
    dragHandleBtn.className = 'drag-handle-btn';
    dragHandleBtn.type = 'button';
    dragHandleBtn.setAttribute('aria-label', 'Arrastrar tarea');
    dragHandleBtn.textContent = '⠿';
    dragHandleBtn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation(); // evitar que abra el detalle al hacer clic en el handle
    });
    cardActions.appendChild(dragHandleBtn);

    const quickDeleteBtn = document.createElement('button');
    quickDeleteBtn.className = 'quick-delete-btn';
    quickDeleteBtn.setAttribute('aria-label', `Eliminar tarea: ${this.taskTitle}`);
    quickDeleteBtn.textContent = '🗑';
    quickDeleteBtn.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('dojo:task-delete-request', {
        bubbles: true, composed: true,
        detail: { taskId: this.taskId, taskTitle: this.taskTitle },
      }));
    });
    cardActions.appendChild(quickDeleteBtn);
    this._shadow.appendChild(cardActions);

    // ── Chips de etiquetas — parte superior (US-10, US-16) ─────────────────
    if (this._labels.length > 0) {
      const HEX_COLOR_RE = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/;
      const chipRow = document.createElement('div');
      chipRow.className = 'chip-row';
      chipRow.setAttribute('aria-label', 'Etiquetas');
      chipRow.setAttribute('role', 'list');
      for (const lbl of this._labels) {
        const chip = document.createElement('span');
        chip.className = 'task-label-chip';
        chip.setAttribute('role', 'listitem');
        chip.textContent = lbl.name;
        chip.setAttribute('title', lbl.name);
        if (HEX_COLOR_RE.test(lbl.color)) {
          chip.style.backgroundColor = lbl.color;
          chip.style.color = '#FFFFFF';
        } else {
          chip.style.backgroundColor = 'var(--dojo-border)';
        }
        chipRow.appendChild(chip);
      }
      this._shadow.appendChild(chipRow);
    }

    // ── Progreso de subtareas (US-21) ───────────────────────────────────
    if (this._subtasksTotal > 0) {
      const progressRow = document.createElement('div');
      progressRow.className = 'subtask-progress';

      const pText = document.createElement('span');
      pText.className = 'subtask-progress-text';
      pText.textContent = `${this._subtasksDone} / ${this._subtasksTotal}`;
      progressRow.appendChild(pText);

      const pBar = document.createElement('div');
      pBar.className = 'subtask-progress-bar';
      pBar.setAttribute('role', 'progressbar');
      pBar.setAttribute('aria-valuenow', String(this._subtasksDone));
      pBar.setAttribute('aria-valuemin', '0');
      pBar.setAttribute('aria-valuemax', String(this._subtasksTotal));
      pBar.setAttribute('aria-label', `Progreso: ${this._subtasksDone} de ${this._subtasksTotal} subtareas`);
      const pFill = document.createElement('div');
      pFill.className = 'subtask-progress-fill';
      pFill.style.width = `${Math.round((this._subtasksDone / this._subtasksTotal) * 100)}%`;
      pBar.appendChild(pFill);
      progressRow.appendChild(pBar);

      this._shadow.appendChild(progressRow);
    }

    // ── Identificador de proyecto (US-26) ──────────────────────────────────
    if (this.taskNumber) {
      const numEl = document.createElement('span');
      numEl.className = 'task-number';
      numEl.textContent = this.taskNumber;
      this._shadow.appendChild(numEl);
    }

    // ── Título ────────────────────────────────────────────────────────────
    const titleEl = document.createElement('p');
    titleEl.className = 'title';
    titleEl.textContent = this.taskTitle;
    this._shadow.appendChild(titleEl);

    // ── Footer: prioridad (izq) + fecha de creación (der, US-16) ──────────
    const footer = document.createElement('div');
    footer.className = 'footer';
    footer.setAttribute('aria-label', `Prioridad: ${pConfig.label}`);

    const footerPriority = document.createElement('div');
    footerPriority.className = 'footer-priority';

    const iconEl = document.createElement('span');
    iconEl.className = 'priority-icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = pConfig.icon;

    const label = document.createElement('span');
    label.className = 'priority-label';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = pConfig.label;

    footerPriority.appendChild(iconEl);
    footerPriority.appendChild(label);
    footer.appendChild(footerPriority);

    const dateStr = DojoTaskCard._formatCardDate(this.createdAt);
    if (dateStr) {
      const dateEl = document.createElement('span');
      dateEl.className = 'date-label';
      dateEl.setAttribute('aria-label', `Creado el ${dateStr}`);
      dateEl.textContent = dateStr;
      footer.appendChild(dateEl);
    }

    // ── Fecha de vencimiento relativa (US-17) ─────────────────────────────
    const dueRelative = formatRelativeDate(this.dueDate || null);
    if (dueRelative) {
      const dueEl = document.createElement('span');
      const statusCls = dueStatus === 'overdue' ? 'due-overdue'
                      : dueStatus === 'due-soon' ? 'due-soon'
                      : 'due-normal';
      dueEl.className = `due-date-label ${statusCls}`;
      const ariaLabel = dueStatus === 'overdue'
        ? `Venció ${dueRelative}`
        : `Vence ${dueRelative}`;
      dueEl.setAttribute('aria-label', ariaLabel);
      dueEl.textContent = `📅 ${dueRelative}`;
      footer.appendChild(dueEl);
    }

    this._shadow.appendChild(footer);
  }

  /** Formatea una fecha ISO a "25 mar 2026" para uso en tarjetas. */
  private static readonly MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

  private static _formatCardDate(iso: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return `${d.getDate()} ${DojoTaskCard.MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return '';
    }
  }
}

customElements.define(DojoTaskCard.TAG, DojoTaskCard);
