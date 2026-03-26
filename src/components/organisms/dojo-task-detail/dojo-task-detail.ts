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

// ── Constantes ─────────────────────────────────────────────────────────────

const PRIORITIES: { value: Priority; label: string; icon: string }[] = [
  { value: 'low',    label: 'Baja',    icon: '🔵' },
  { value: 'medium', label: 'Media',   icon: '🟡' },
  { value: 'high',   label: 'Alta',    icon: '🟠' },
  { value: 'urgent', label: 'Urgente', icon: '🔴' },
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

    // Navegación por teclado dentro del picker (Fix #4: ArrowDown/ArrowUp + Escape)
    picker.addEventListener('keydown', (ev: KeyboardEvent) => {
      const checkboxes = Array.from(picker.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
      if (!checkboxes.length) return;
      const current = checkboxes.indexOf(this._shadow.activeElement as HTMLInputElement);
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        const next = current >= 0 ? (current + 1) % checkboxes.length : 0;
        checkboxes[next].focus();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        const prev = current >= 0 ? (current - 1 + checkboxes.length) % checkboxes.length : checkboxes.length - 1;
        checkboxes[prev].focus();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        this._labelsPickerOpen = false;
        picker.classList.remove('open');
        chips.querySelector<HTMLElement>('.add-label-btn')?.focus();
      }
    });

    const renderChips = (): void => {
      chips.innerHTML = '';
      const currentIds = this._task?.labelIds ?? [];

      currentIds.forEach(labelId => {
        const label = this._allLabels.find(l => l.id === labelId);
        if (!label) return;

        let textColor = '#ffffff';
        // Fix #6: validar formato hex antes de llamar a pickTextColor
        const HEX_COLOR_RE = /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/;
        if (HEX_COLOR_RE.test(label.color)) {
          try { textColor = pickTextColor(label.color); } catch { /* sin cambios */ }
        } else {
          console.warn('[dojo-task-detail] Color de etiqueta inválido (se usa blanco):', label.color);
        }

        const chip    = document.createElement('span');
        chip.className  = 'label-chip';
        chip.style.backgroundColor = label.color;
        chip.style.color              = textColor;

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

      // Botón abrir/cerrar picker
      const addBtn = document.createElement('button');
      addBtn.className = 'add-label-btn';
      addBtn.textContent = '＋ Etiqueta';
      addBtn.setAttribute('aria-expanded', String(this._labelsPickerOpen));
      addBtn.setAttribute('aria-controls', 'labels-picker-dropdown');
      addBtn.addEventListener('click', () => {
        this._labelsPickerOpen = !this._labelsPickerOpen;
        picker.classList.toggle('open', this._labelsPickerOpen);
        addBtn.setAttribute('aria-expanded', String(this._labelsPickerOpen));
        // Fix #4: mover foco al primer checkbox al abrir
        if (this._labelsPickerOpen) {
          requestAnimationFrame(() => {
            picker.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus();
          });
        }
      });
      chips.appendChild(addBtn);
    };

    const renderPicker = (): void => {
      picker.innerHTML = '';
      if (this._allLabels.length === 0) {
        const empty = document.createElement('p');
        empty.style.cssText = 'padding:.5rem .75rem;font-size:.8125rem;color:var(--dojo-text-secondary)';
        empty.textContent = 'No hay etiquetas disponibles.';
        picker.appendChild(empty);
        return;
      }
      this._allLabels.forEach(label => {
        const currentIds = this._task?.labelIds ?? [];
        const isSelected = currentIds.includes(label.id);

        const optionEl = document.createElement('label');
        optionEl.className = 'label-option';

        const cb = document.createElement('input');
        cb.type    = 'checkbox';
        cb.checked = isSelected;
        cb.setAttribute('aria-label', label.name);
        cb.addEventListener('change', () => {
          const ids    = this._task?.labelIds ?? [];
          const newIds = cb.checked
            ? [...ids, label.id]
            : ids.filter(id => id !== label.id);
          this._save({ labelIds: newIds });
          renderChips();
        });

        const dot = document.createElement('span');
        dot.className           = 'label-dot';
        dot.style.backgroundColor = label.color;
        dot.setAttribute('aria-hidden', 'true');

        const namePart = document.createElement('span');
        namePart.textContent = label.name;

        optionEl.appendChild(cb);
        optionEl.appendChild(dot);
        optionEl.appendChild(namePart);
        picker.appendChild(optionEl);
      });
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
