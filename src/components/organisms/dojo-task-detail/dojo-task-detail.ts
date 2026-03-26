/**
 * dojo-task-detail — Organismo
 *
 * Panel lateral deslizable (sidebar) para editar todos los campos de una tarea.
 * Implementa los criterios de aceptación de US-05 (Editar tarea).
 *
 * ## API Pública
 * | Método                                    | Descripción                           |
 * |-------------------------------------------|---------------------------------------|
 * | openTask(task, columns, labels): void     | Abre el panel con la tarea indicada   |
 * | close(): void                             | Cierra el panel                       |
 *
 * ## Eventos despachados
 * | Nombre                   | Detalle                              | Descripción               |
 * |--------------------------|--------------------------------------|---------------------------|
 * | dojo:task-field-updated  | { taskId, changes: Partial<Task> }   | Campo editado — auto-save |
 *
 * ## Comportamiento de guardado (US-05)
 * - Título / Descripción  → blur (pierde el foco)
 * - Estado / Prioridad    → change (selección inmediata)
 * - Etiquetas             → click en chip/opción (inmediato)
 * - createdAt             → solo lectura, no editable
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-primary, --dojo-radius, --dojo-radius-sm, --dojo-shadow
 */

import type { Task, Column, Label, Priority } from '../../../types/models.js';
import { parseMarkdown } from '../../../utils/markdown.js';
import { pickTextColor } from '../../../utils/contrast.js';
import { createLabel } from '../../../db/label.repository.js';

// ── Constantes ─────────────────────────────────────────────────────────────

const PRIORITIES: { value: Priority; label: string; icon: string }[] = [
  { value: 'low',    label: 'Baja',    icon: '⬇️' },
  { value: 'medium', label: 'Media',   icon: '➡️' },
  { value: 'high',   label: 'Alta',    icon: '⬆️' },
  { value: 'urgent', label: 'Urgente', icon: '🔥' },
];

// ── Clase ──────────────────────────────────────────────────────────────────

export class DojoTaskDetail extends HTMLElement {
  static readonly TAG = 'dojo-task-detail';

  private _shadow: ShadowRoot;
  /** Snapshot local de la tarea en edición. */
  private _task: Task | null = null;
  private _columns: Column[] = [];
  private _allLabels: Label[] = [];
  private _labelsPickerOpen = false;
  /** Preserva el overflow del body antes de abrir el panel (se restaura al cerrar). Fix #5 */
  private _prevOverflow: string = '';

  /** Referencia estable para poder eliminar el listener de teclado. */
  private _onDocKeydown = (e: KeyboardEvent): void => {
    if (!this._isOpen()) return;
    if (e.key === 'Escape') {
      this.close();
      return;
    }
    // Focus trap: mantener Tab dentro del panel (Fix #7)
    if (e.key === 'Tab') {
      const panel = this._shadow.querySelector<HTMLElement>('.panel');
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => !el.hidden && el.offsetParent !== null);
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
    document.body.style.overflow = this._prevOverflow;
  }

  // ── API pública ───────────────────────────────────────────────────────────

  /** Id de la tarea actualmente en edición (null si el panel está cerrado). */
  get currentTaskId(): string | null {
    return this._task?.id ?? null;
  }

  openTask(task: Task, columns: Column[], labels: Label[]): void {
    this._task           = { ...task };
    this._columns        = columns;
    this._allLabels      = labels;
    this._labelsPickerOpen = false;
    this._buildContent();
    this._openPanel();
  }

  close(): void {
    this._closePanel();
  }

  // ── Estado del panel ──────────────────────────────────────────────────────

  private _isOpen(): boolean {
    return this.hasAttribute('open');
  }

  private _openPanel(): void {
    this.setAttribute('open', '');
    this._prevOverflow = document.body.style.overflow;  // Fix #5
    document.body.style.overflow = 'hidden';
    // Guarda de duplicados — igual que en dojo-task-dialog
    document.removeEventListener('keydown', this._onDocKeydown);
    document.addEventListener('keydown', this._onDocKeydown);
    // Mover foco al primer campo editable
    requestAnimationFrame(() => {
      this._shadow.querySelector<HTMLElement>('.title-input')?.focus();
    });
  }

  private _closePanel(): void {
    this.removeAttribute('open');
    document.body.style.overflow = this._prevOverflow;  // Fix #5
    document.removeEventListener('keydown', this._onDocKeydown);
  }

  // ── Auto-save ─────────────────────────────────────────────────────────────

  private _save(changes: Partial<Omit<Task, 'id' | 'createdAt'>>): void {
    if (!this._task) return;
    // Actualizar snapshot local para que sabves posteriores no sobreescriban
    this._task = { ...this._task, ...changes };
    this.dispatchEvent(new CustomEvent('dojo:task-field-updated', {
      bubbles:  true,
      composed: true,
      detail:   { taskId: this._task.id, changes },
    }));
  }

  // ── Render base (estructura estática) ─────────────────────────────────────

  private _render(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host { display: contents; }

      /* ── Backdrop ── */
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.35);
        z-index: 200;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.22s ease;
      }
      :host([open]) .backdrop {
        opacity: 1;
        pointer-events: auto;
      }

      /* ── Panel lateral ── */
      .panel {
        position: fixed;
        top: 0;
        right: 0;
        height: 100%;
        width: 400px;
        max-width: 100vw;
        background: var(--dojo-surface);
        border-left: 1px solid var(--dojo-border);
        box-shadow: -4px 0 24px rgba(0,0,0,0.12);
        z-index: 201;
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.22s ease;
        overflow: hidden;
      }
      :host([open]) .panel { transform: translateX(0); }

      /* ── Encabezado fijo ── */
      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.875rem 1rem 0.875rem 1.25rem;
        border-bottom: 1px solid var(--dojo-border);
        flex-shrink: 0;
      }
      .panel-hdr-title {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--dojo-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .close-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0.375rem;
        border-radius: var(--dojo-radius-sm, 4px);
        color: var(--dojo-text-secondary);
        font-size: 1.125rem;
        line-height: 1;
        display: flex;
        align-items: center;
        transition: background 0.15s;
      }
      .close-btn:hover { background: var(--dojo-bg); }
      .close-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* ── Cuerpo scrollable ── */
      .panel-body {
        flex: 1;
        overflow-y: auto;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        scrollbar-width: thin;
        scrollbar-color: var(--dojo-border) transparent;
      }
      .panel-body::-webkit-scrollbar       { width: 4px; }
      .panel-body::-webkit-scrollbar-thumb { background: var(--dojo-border); border-radius: 2px; }

      /* ── Sección genérica ── */
      .section { display: flex; flex-direction: column; gap: 0.375rem; }
      .section-lbl {
        font-size: 0.6875rem;
        font-weight: 700;
        color: var(--dojo-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      /* ── Campo: Título ── */
      .title-input {
        font-size: 1rem;
        font-weight: 600;
        color: var(--dojo-text-primary);
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--dojo-radius-sm, 4px);
        padding: 0.375rem 0.5rem;
        width: 100%;
        box-sizing: border-box;
        font-family: inherit;
        line-height: 1.4;
        transition: border-color 0.15s, background 0.15s;
      }
      .title-input:hover { border-color: var(--dojo-border); }
      .title-input:focus {
        outline: none;
        border-color: var(--dojo-primary, #1D4ED8);
        background: var(--dojo-bg);
      }
      .title-input:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* ── Selects ── */
      .field-select {
        padding: 0.4375rem 0.625rem;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.875rem;
        color: var(--dojo-text-primary);
        background: var(--dojo-bg);
        width: 100%;
        box-sizing: border-box;
        cursor: pointer;
        font-family: inherit;
        transition: border-color 0.15s;
      }
      .field-select:focus {
        outline: none;
        border-color: var(--dojo-primary, #1D4ED8);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--dojo-primary, #1D4ED8) 20%, transparent);
      }
      .field-select:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* ── Fila de dos campos ── */
      .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

      /* ── Descripción (editor + preview) ── */
      .desc-tabs {
        display: flex;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px) var(--dojo-radius-sm, 4px) 0 0;
        overflow: hidden;
      }
      .desc-tab {
        flex: 1;
        padding: 0.375rem 0.625rem;
        background: var(--dojo-bg);
        border: none;
        cursor: pointer;
        font-size: 0.8125rem;
        color: var(--dojo-text-secondary);
        font-family: inherit;
        transition: background 0.15s;
      }
      .desc-tab.active {
        background: var(--dojo-surface);
        color: var(--dojo-primary, #1D4ED8);
        font-weight: 600;
      }
      .desc-tab:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: -2px;
      }
      .desc-textarea {
        width: 100%;
        min-height: 140px;
        box-sizing: border-box;
        resize: vertical;
        padding: 0.625rem 0.75rem;
        border: 1px solid var(--dojo-border);
        border-top: none;
        border-radius: 0 0 var(--dojo-radius-sm, 4px) var(--dojo-radius-sm, 4px);
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
        color: var(--dojo-text-primary);
        background: var(--dojo-bg);
        line-height: 1.5;
      }
      .desc-textarea:focus {
        outline: none;
        border-color: var(--dojo-primary, #1D4ED8);
      }
      .desc-textarea:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }
      .desc-preview {
        min-height: 140px;
        padding: 0.625rem 0.75rem;
        border: 1px solid var(--dojo-border);
        border-top: none;
        border-radius: 0 0 var(--dojo-radius-sm, 4px) var(--dojo-radius-sm, 4px);
        background: var(--dojo-bg);
        font-size: 0.875rem;
        line-height: 1.6;
        color: var(--dojo-text-primary);
        overflow-y: auto;
      }
      .desc-preview p   { margin: 0 0 0.5rem; }
      .desc-preview h1,
      .desc-preview h2,
      .desc-preview h3  { margin: 0.75rem 0 0.375rem; font-size: 1rem; }
      .desc-preview code {
        background: color-mix(in srgb, var(--dojo-border) 30%, transparent);
        padding: 0.1em 0.3em;
        border-radius: 3px;
        font-family: monospace;
        font-size: 0.8125rem;
      }
      .desc-preview pre {
        background: color-mix(in srgb, var(--dojo-border) 20%, transparent);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        padding: 0.625rem 0.75rem;
        overflow-x: auto;
        margin: 0.375rem 0 0.625rem;
      }
      .desc-preview pre code {
        background: transparent;
        padding: 0;
        border-radius: 0;
        font-family: monospace;
        font-size: 0.8125rem;
        white-space: pre;
      }
      .desc-preview ul  { padding-left: 1.25rem; margin: 0.375rem 0; }
      .desc-preview li  { margin-bottom: 0.2rem; }
      .desc-preview a   { color: var(--dojo-primary, #1D4ED8); }

      /* ── Etiquetas — chips ── */
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

      /* ── Etiquetas — picker dropdown ── */
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

      /* ── Etiquetas — búsqueda y creación (US-09) ── */
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

      /* ── Footer de peligro (US-06) ── */
      .panel-footer {
        flex-shrink: 0;
        padding: 0.875rem 1.25rem;
        border-top: 1px solid var(--dojo-border);
        display: flex;
        justify-content: flex-end;
      }
      .delete-task-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.4375rem 0.875rem;
        background: transparent;
        border: 1px solid #EF4444;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.8125rem;
        font-weight: 600;
        color: #EF4444;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s, color 0.15s;
      }
      .delete-task-btn:hover {
        background: #FEE2E2;
      }
      .delete-task-btn:focus-visible {
        outline: 2px solid #EF4444;
        outline-offset: 2px;
      }

      /* ── Metadatos (solo lectura) ── */
      .metadata {
        border-top: 1px solid var(--dojo-border);
        padding-top: 0.875rem;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        font-size: 0.75rem;
        color: var(--dojo-text-secondary);
      }
      .meta-key   { font-weight: 600; }
      .meta-value { color: var(--dojo-text-primary); }
    `;
    this._shadow.appendChild(style);

    // Backdrop — cierra al clicar fuera del panel
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', () => this.close());
    this._shadow.appendChild(backdrop);

    // Panel (vacío hasta que se llame a openTask)
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'Detalle de tarea');
    this._shadow.appendChild(panel);
  }

  // ── Construcción del contenido del panel ──────────────────────────────────

  private _buildContent(): void {
    const task  = this._task!;
    const panel = this._shadow.querySelector<HTMLElement>('.panel');
    if (!panel) return;
    panel.innerHTML = '';

    // ── Encabezado ─────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'panel-header';

    const hdrTitle = document.createElement('span');
    hdrTitle.className = 'panel-hdr-title';
    hdrTitle.textContent = 'Detalle de tarea';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.setAttribute('aria-label', 'Cerrar panel de detalle');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(hdrTitle);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // ── Body ────────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'panel-body';

    body.appendChild(this._buildTitleField(task));
    body.appendChild(this._buildStatusPriorityRow(task));
    body.appendChild(this._buildDescriptionField(task));
    body.appendChild(this._buildLabelsField(task));
    body.appendChild(this._buildMetadata(task));

    panel.appendChild(body);

    // ── Footer de eliminación (US-06) ──────────────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'panel-footer';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-task-btn';
    deleteBtn.setAttribute('aria-label', `Eliminar tarea: ${task.title}`);
    deleteBtn.textContent = '🗑 Eliminar tarea';
    deleteBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('dojo:task-delete-request', {
        bubbles:  true,
        composed: true,
        detail:   { taskId: task.id, taskTitle: task.title },
      }));
    });

    footer.appendChild(deleteBtn);
    panel.appendChild(footer);
  }

  // ── Secciones del formulario ──────────────────────────────────────────────

  private _buildTitleField(task: Task): HTMLElement {
    const section = document.createElement('div');
    section.className = 'section';

    const lbl = document.createElement('label');
    lbl.className = 'section-lbl';
    lbl.setAttribute('for', 'detail-title');
    lbl.textContent = 'Título';

    const input = document.createElement('input');
    input.id        = 'detail-title';
    input.className = 'title-input';
    input.type      = 'text';
    input.maxLength = 120;
    input.value     = task.title;
    input.setAttribute('aria-required', 'true');
    input.setAttribute('aria-label', 'Título de la tarea');

    let titleSnapshot = task.title;
    input.addEventListener('focus', () => { titleSnapshot = input.value; });
    input.addEventListener('blur',  () => {
      const trimmed = input.value.trim();
      if (!trimmed) {
        // No se permite título vacío — revertir
        input.value = titleSnapshot;
        return;
      }
      if (trimmed !== titleSnapshot) this._save({ title: trimmed });
    });

    section.appendChild(lbl);
    section.appendChild(input);
    return section;
  }

  private _buildStatusPriorityRow(task: Task): HTMLElement {
    const row = document.createElement('div');
    row.className = 'row-2';

    // Estado
    const statusSection = document.createElement('div');
    statusSection.className = 'section';

    const statusLbl = document.createElement('label');
    statusLbl.className = 'section-lbl';
    statusLbl.setAttribute('for', 'detail-status');
    statusLbl.textContent = 'Estado';

    const statusSelect = document.createElement('select');
    statusSelect.id        = 'detail-status';
    statusSelect.className = 'field-select';
    statusSelect.setAttribute('aria-label', 'Estado de la tarea');
    this._columns.forEach(col => {
      const opt = document.createElement('option');
      opt.value       = col.id;
      opt.textContent = `${col.icon} ${col.name}`;
      if (col.id === task.statusId) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusSelect.addEventListener('change', () => {
      this._save({ statusId: statusSelect.value });
    });

    statusSection.appendChild(statusLbl);
    statusSection.appendChild(statusSelect);
    row.appendChild(statusSection);

    // Prioridad
    const priSection = document.createElement('div');
    priSection.className = 'section';

    const priLbl = document.createElement('label');
    priLbl.className = 'section-lbl';
    priLbl.setAttribute('for', 'detail-priority');
    priLbl.textContent = 'Prioridad';

    const priSelect = document.createElement('select');
    priSelect.id        = 'detail-priority';
    priSelect.className = 'field-select';
    priSelect.setAttribute('aria-label', 'Prioridad de la tarea');
    PRIORITIES.forEach(({ value, label, icon }) => {
      const opt = document.createElement('option');
      opt.value       = value;
      opt.textContent = `${icon} ${label}`;
      if (value === task.priority) opt.selected = true;
      priSelect.appendChild(opt);
    });
    priSelect.addEventListener('change', () => {
      this._save({ priority: priSelect.value as Priority });
    });

    priSection.appendChild(priLbl);
    priSection.appendChild(priSelect);
    row.appendChild(priSection);

    return row;
  }

  private _buildDescriptionField(task: Task): HTMLElement {
    const section = document.createElement('div');
    section.className = 'section';

    const sectionLbl = document.createElement('span');
    sectionLbl.className = 'section-lbl';
    sectionLbl.id       = 'desc-section-label';
    sectionLbl.textContent = 'Descripción';

    // Tabs Editar / Vista previa
    const tabs = document.createElement('div');
    tabs.className = 'desc-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Modo de edición de descripción');

    const editTab = document.createElement('button');
    editTab.className = 'desc-tab active';
    editTab.textContent = 'Editar';
    editTab.setAttribute('role', 'tab');
    editTab.setAttribute('aria-selected', 'true');
    editTab.setAttribute('id', 'desc-tab-edit');
    editTab.setAttribute('aria-controls', 'desc-editor-panel');

    const previewTab = document.createElement('button');
    previewTab.className = 'desc-tab';
    previewTab.textContent = '◉ Vista previa';
    previewTab.setAttribute('role', 'tab');
    previewTab.setAttribute('aria-selected', 'false');
    previewTab.setAttribute('id', 'desc-tab-preview');
    previewTab.setAttribute('aria-controls', 'desc-preview-panel');

    tabs.appendChild(editTab);
    tabs.appendChild(previewTab);

    // Textarea
    const textarea = document.createElement('textarea');
    textarea.id        = 'desc-editor-panel';
    textarea.className = 'desc-textarea';
    textarea.value     = task.description;
    textarea.placeholder = 'Descripción en Markdown… (opcional)';
    textarea.maxLength = 2000;
    textarea.setAttribute('role', 'tabpanel');
    textarea.setAttribute('aria-labelledby', 'desc-tab-edit');
    textarea.setAttribute('aria-describedby', 'desc-section-label');

    let descSnapshot = task.description;
    textarea.addEventListener('focus', () => { descSnapshot = textarea.value; });
    textarea.addEventListener('blur',  () => {
      const trimmed = textarea.value.trim();
      if (trimmed !== descSnapshot.trim()) this._save({ description: trimmed });
    });

    // Preview
    const previewPanel = document.createElement('div');
    previewPanel.id        = 'desc-preview-panel';
    previewPanel.className = 'desc-preview';
    previewPanel.setAttribute('role', 'tabpanel');
    previewPanel.setAttribute('aria-labelledby', 'desc-tab-preview');
    previewPanel.style.display = 'none';

    const switchToEdit = (): void => {
      editTab.classList.add('active');
      editTab.setAttribute('aria-selected', 'true');
      previewTab.classList.remove('active');
      previewTab.setAttribute('aria-selected', 'false');
      textarea.style.display     = '';
      previewPanel.style.display = 'none';
      textarea.focus();
    };

    const switchToPreview = (): void => {
      previewTab.classList.add('active');
      previewTab.setAttribute('aria-selected', 'true');
      editTab.classList.remove('active');
      editTab.setAttribute('aria-selected', 'false');
      textarea.style.display     = 'none';
      previewPanel.style.display = '';

      // Renderizar Markdown de forma segura (parseMarkdown no usa innerHTML con entrada de usuario)
      previewPanel.innerHTML = '';
      const content = textarea.value.trim();
      if (content) {
        previewPanel.appendChild(parseMarkdown(content));
      } else {
        const empty = document.createElement('p');
        empty.style.color      = 'var(--dojo-text-secondary)';
        empty.style.fontStyle  = 'italic';
        empty.textContent      = 'Sin descripción.';
        previewPanel.appendChild(empty);
      }
    };

    const tabEls     = [editTab, previewTab];
    const tabActions  = [switchToEdit, switchToPreview];

    // Roving tabindex — solo el tab activo es alcanzable con Tab (WCAG 2.1 AA Fix #2)
    editTab.setAttribute('tabindex', '0');
    previewTab.setAttribute('tabindex', '-1');

    const switchTab = (index: number): void => {
      if (index < 0 || index >= tabEls.length) return;
      tabEls.forEach((t, idx) => t.setAttribute('tabindex', idx === index ? '0' : '-1'));
      tabEls[index].focus();
      tabActions[index]();
    };

    tabEls.forEach((tab, i) => {
      tab.addEventListener('click', () => {
        tabEls.forEach((t, idx) => t.setAttribute('tabindex', idx === i ? '0' : '-1'));
        tabActions[i]();
      });
      tab.addEventListener('keydown', (ev: KeyboardEvent) => {
        if (ev.key === 'ArrowLeft')  { ev.preventDefault(); switchTab(i - 1); }
        if (ev.key === 'ArrowRight') { ev.preventDefault(); switchTab(i + 1); }
        if (ev.key === 'Home')       { ev.preventDefault(); switchTab(0); }
        if (ev.key === 'End')        { ev.preventDefault(); switchTab(tabEls.length - 1); }
      });
    });

    section.appendChild(sectionLbl);
    section.appendChild(tabs);
    section.appendChild(textarea);
    section.appendChild(previewPanel);
    return section;
  }

  private _buildLabelsField(task: Task): HTMLElement {
    const PRESET_COLORS = [
      '#EF4444', '#F97316', '#F59E0B', '#EAB308',
      '#22C55E', '#10B981', '#3B82F6', '#6366F1',
      '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    ];
    const PRESET_COLOR_NAMES = [
      'Rojo', 'Naranja', 'Ámbar', 'Amarillo',
      'Verde', 'Esmeralda', 'Azul', 'Índigo',
      'Violeta', 'Rosa', 'Cian', 'Lima',
    ];

    const section = document.createElement('div');
    section.className = 'section';

    const sectionLbl = document.createElement('span');
    sectionLbl.className = 'section-lbl';
    sectionLbl.textContent = 'Etiquetas';

    const chips = document.createElement('div');
    chips.className = 'labels-chips';
    chips.setAttribute('aria-label', 'Etiquetas de la tarea');

    const picker = document.createElement('div');
    picker.className = 'labels-picker';
    picker.id = 'labels-picker-dropdown';
    picker.setAttribute('aria-label', 'Selector de etiquetas disponibles');

    // ── Estado de cierre del picker ───────────────────────────────────────
    let searchTerm     = '';
    let showCreateForm = false;
    let pendingColor   = PRESET_COLORS[0];

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
          this._labelsPickerOpen = false;
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
      const currentIds = this._task?.labelIds ?? [];

      currentIds.forEach(labelId => {
        const label = this._allLabels.find(l => l.id === labelId);
        if (!label) return;

        let textColor = '#ffffff';
        const HEX_COLOR_RE = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/;
        if (HEX_COLOR_RE.test(label.color)) {
          try { textColor = pickTextColor(label.color); } catch { /* sin cambios */ }
        } else {
          console.warn('[dojo-task-detail] Color de etiqueta inválido (se usa blanco):', label.color);
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
          const newIds = (this._task?.labelIds ?? []).filter(id => id !== labelId);
          this._save({ labelIds: newIds });
          renderChips();
          renderPicker();
        });

        chip.appendChild(chipText);
        chip.appendChild(removeBtn);
        chips.appendChild(chip);
      });

      const addBtn = document.createElement('button');
      addBtn.className = 'add-label-btn';
      addBtn.textContent = '＋ Etiqueta';
      addBtn.setAttribute('aria-expanded', String(this._labelsPickerOpen));
      addBtn.setAttribute('aria-controls', 'labels-picker-dropdown');
      addBtn.addEventListener('click', () => {
        this._labelsPickerOpen = !this._labelsPickerOpen;
        picker.classList.toggle('open', this._labelsPickerOpen);
        addBtn.setAttribute('aria-expanded', String(this._labelsPickerOpen));
        if (this._labelsPickerOpen) {
          requestAnimationFrame(() =>
            picker.querySelector<HTMLInputElement>('.labels-search')?.focus()
          );
        }
      });
      chips.appendChild(addBtn);
    };

    // ── Formulario inline de creación (US-09) ─────────────────────────────
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
      });
      customRow.appendChild(customLbl);
      customRow.appendChild(colorInput);
      form.appendChild(customRow);

      const errorEl = document.createElement('span');
      errorEl.className = 'label-error';
      errorEl.setAttribute('role', 'alert');
      errorEl.setAttribute('aria-live', 'polite');
      errorEl.style.display = 'none';
      form.appendChild(errorEl);

      const actions = document.createElement('div');
      actions.className = 'label-create-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'label-btn';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.addEventListener('click', () => {
        showCreateForm = false;
        pendingColor = PRESET_COLORS[0];
        renderPicker();
        requestAnimationFrame(() =>
          picker.querySelector<HTMLInputElement>('.labels-search')?.focus()
        );
      });

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'label-btn label-btn-primary';
      confirmBtn.textContent = 'Crear';
      confirmBtn.setAttribute('aria-label', `Confirmar creación de etiqueta "${name}"`);
      confirmBtn.addEventListener('click', async () => {
        if (!pendingColor) {
          errorEl.textContent = 'Debes seleccionar un color.';
          errorEl.style.display = '';
          return;
        }
        confirmBtn.disabled = true;
        confirmBtn.textContent = '…';
        try {
          const newLabel = await createLabel({ name, color: pendingColor });
          this._allLabels = [...this._allLabels, newLabel].sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
          );
          const currentIds = this._task?.labelIds ?? [];
          this._save({ labelIds: [...currentIds, newLabel.id] });
          searchTerm     = '';
          showCreateForm = false;
          pendingColor   = PRESET_COLORS[0];
          renderChips();
          renderPicker();
          this._labelsPickerOpen = false;
          picker.classList.remove('open');
          chips.querySelector<HTMLElement>('.add-label-btn')?.focus();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error al crear la etiqueta';
          errorEl.textContent = msg;
          errorEl.style.display = '';
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Crear';
        }
      });

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      form.appendChild(actions);
      return form;
    };

    // ── Render picker con búsqueda (US-09) ────────────────────────────────
    const renderPicker = (): void => {
      picker.innerHTML = '';

      // Campo de búsqueda — siempre visible
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

      // Lista de etiquetas (filtradas o completa)
      if (filtered.length === 0 && !trimmed) {
        const empty = document.createElement('p');
        empty.style.cssText = 'padding:.375rem .75rem;font-size:.8125rem;color:var(--dojo-text-secondary);margin:0';
        empty.textContent = 'No hay etiquetas. Escribe un nombre para crear una.';
        picker.appendChild(empty);
      } else {
        filtered.forEach(label => {
          const currentIds = this._task?.labelIds ?? [];
          const isSelected = currentIds.includes(label.id);

          const optionEl = document.createElement('label');
          optionEl.className = 'label-option';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = isSelected;
          cb.setAttribute('aria-label', label.name);
          cb.addEventListener('change', () => {
            const ids = this._task?.labelIds ?? [];
            const newIds = cb.checked
              ? [...ids, label.id]
              : ids.filter(id => id !== label.id);
            this._save({ labelIds: newIds });
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
        }
      }
    };

    renderChips();
    renderPicker();

    section.appendChild(sectionLbl);
    section.appendChild(chips);
    section.appendChild(picker);
    return section;
  }

  private _buildMetadata(task: Task): HTMLElement {
    const metadata = document.createElement('div');
    metadata.className = 'metadata';

    const rows: [string, string][] = [
      ['Creado el',    this._formatDate(task.createdAt)],
      ['Actualizado',  this._formatDate(task.updatedAt)],
    ];

    rows.forEach(([key, value]) => {
      const row = document.createElement('div');
      row.className = 'meta-row';

      const keySpan = document.createElement('span');
      keySpan.className   = 'meta-key';
      keySpan.textContent = key;

      const valSpan = document.createElement('span');
      valSpan.className   = 'meta-value';
      valSpan.textContent = value;

      row.appendChild(keySpan);
      row.appendChild(valSpan);
      metadata.appendChild(row);
    });

    return metadata;
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  private _formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleString('es-MX', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }
}

customElements.define(DojoTaskDetail.TAG, DojoTaskDetail);
