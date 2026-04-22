/**
 * dojo-template-manager — Organismo (US-36)
 *
 * Panel modal para gestionar templates de tareas: crear, editar y eliminar.
 *
 * ## API Pública
 * | Método        | Descripción                                   |
 * |---------------|-----------------------------------------------|
 * | open(): void  | Abre el panel de gestión de templates         |
 * | close(): void | Cierra el panel                               |
 *
 * ## Eventos despachados
 * | Nombre                     | Detalle          | Descripción                    |
 * |----------------------------|------------------|--------------------------------|
 * | dojo:templates-changed     | {}               | Se creó, editó o eliminó un template |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*, --dojo-primary,
 * --dojo-danger, --dojo-radius, --dojo-radius-sm, --dojo-shadow
 */

import type { TaskTemplate, Label, Priority, Person } from '../../../types/models.js';
import {
  getAllTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../../../db/template.repository.js';
import { getAllLabels } from '../../../db/label.repository.js';
import { getAllPersons } from '../../../db/person.repository.js';
import { pickTextColor } from '../../../utils/contrast.js';

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'low',    label: '⬇️ Baja'    },
  { value: 'medium', label: '➡️ Media'   },
  { value: 'high',   label: '⬆️ Alta'    },
  { value: 'urgent', label: '🔥 Urgente' },
];

type ManagerView = 'list' | 'form';

export class DojoTemplateManager extends HTMLElement {
  static readonly TAG = 'dojo-template-manager';

  private _shadow: ShadowRoot;
  private _view: ManagerView = 'list';
  private _editingId: string | null = null;

  private _templates: TaskTemplate[] = [];
  private _allLabels: Label[] = [];
  private _allPersons: Person[] = [];
  private _selectedLabelIds: Set<string> = new Set();
  private _selectedPersonIds: Set<string> = new Set();

  private _onDocKeydown = (e: KeyboardEvent): void => {
    if (!this._isOpen()) return;
    if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
    if (e.key === 'Tab') this._trapFocus(e);
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

  // ── API pública ──────────────────────────────────────────────────────────

  open(): void {
    this._view      = 'list';
    this._editingId = null;
    Promise.all([
      getAllTemplates().catch(() => [] as TaskTemplate[]),
      getAllLabels().catch(() => [] as Label[]),
      getAllPersons().catch(() => [] as Person[]),
    ]).then(([templates, labels, persons]) => {
      this._templates   = templates;
      this._allLabels   = labels;
      this._allPersons  = persons;
      this._buildContent();
      const backdrop = this._shadow.querySelector<HTMLElement>('.backdrop');
      if (!backdrop) return;
      backdrop.setAttribute('aria-hidden', 'false');
      document.removeEventListener('keydown', this._onDocKeydown);
      document.addEventListener('keydown', this._onDocKeydown);
      (this._shadow.querySelector<HTMLElement>('.btn-new-template') as HTMLElement | null)?.focus();
    });
  }

  close(): void {
    const backdrop = this._shadow.querySelector<HTMLElement>('.backdrop');
    if (!backdrop) return;
    backdrop.setAttribute('aria-hidden', 'true');
    document.removeEventListener('keydown', this._onDocKeydown);
  }

  // ── Estado ───────────────────────────────────────────────────────────────

  private _isOpen(): boolean {
    return this._shadow.querySelector('.backdrop')?.getAttribute('aria-hidden') === 'false';
  }

  // ── Focus trap ───────────────────────────────────────────────────────────

  private _trapFocus(e: KeyboardEvent): void {
    const panel = this._shadow.querySelector<HTMLElement>('.panel');
    if (!panel) return;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => el.offsetParent !== null);
    if (focusable.length < 2) return;
    const first  = focusable[0];
    const last   = focusable[focusable.length - 1];
    const active = this._shadow.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }

  // ── Render base ──────────────────────────────────────────────────────────

  private _render(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; }

      .backdrop {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 400;
        display: none;
        pointer-events: none;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .backdrop[aria-hidden="false"] { display: flex; pointer-events: auto; }

      .panel {
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius);
        box-shadow: var(--dojo-shadow);
        width: 100%;
        max-width: 640px;
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        animation: dlg-in 0.18s ease;
      }
      @keyframes dlg-in {
        from { opacity: 0; transform: scale(0.96) translateY(-8px); }
        to   { opacity: 1; transform: none; }
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 1.5rem 1rem;
        border-bottom: 1px solid var(--dojo-border);
        position: sticky;
        top: 0;
        background: var(--dojo-surface);
        z-index: 1;
      }
      .panel-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
        margin: 0;
      }
      .panel-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

      /* ── Botones generales ── */
      .btn {
        padding: 0.4375rem 1rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid transparent;
        font-family: inherit;
        transition: opacity 0.15s;
      }
      .btn:hover { opacity: 0.85; }
      .btn:focus-visible { outline: 2px solid var(--dojo-primary, #1D4ED8); outline-offset: 2px; }
      .btn-icon {
        background: transparent; border: none; cursor: pointer; padding: 0.25rem;
        color: var(--dojo-text-secondary); border-radius: var(--dojo-radius-sm, 4px);
        font-size: 1rem; line-height: 1; font-family: inherit;
      }
      .btn-icon:hover { color: var(--dojo-text-primary); background: var(--dojo-bg); }
      .btn-icon:focus-visible { outline: 2px solid var(--dojo-primary, #1D4ED8); outline-offset: 2px; }
      .btn-primary { background: var(--dojo-primary, #1D4ED8); color: #fff; }
      .btn-ghost { background: transparent; border-color: var(--dojo-border); color: var(--dojo-text-secondary); }
      .btn-danger { background: var(--dojo-danger, #DC2626); color: #fff; }
      .btn-new-template { align-self: flex-start; }

      /* ── Lista de templates ── */
      .template-list { display: flex; flex-direction: column; gap: 0.5rem; }
      .template-empty {
        text-align: center; padding: 2rem 1rem;
        color: var(--dojo-text-secondary); font-size: 0.875rem;
      }
      .template-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        background: var(--dojo-bg);
      }
      .template-item-info { display: flex; flex-direction: column; gap: 0.125rem; min-width: 0; }
      .template-item-name {
        font-size: 0.9375rem; font-weight: 600;
        color: var(--dojo-text-primary);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .template-item-meta { font-size: 0.75rem; color: var(--dojo-text-secondary); }
      .template-item-actions { display: flex; gap: 0.25rem; flex-shrink: 0; }

      /* ── Formulario ── */
      .form-header {
        display: flex; align-items: center; gap: 0.5rem;
        padding-bottom: 0.75rem; border-bottom: 1px solid var(--dojo-border);
        margin-bottom: 0.25rem;
      }
      .form-title { font-size: 0.9375rem; font-weight: 700; color: var(--dojo-text-primary); margin: 0; }
      .field { display: flex; flex-direction: column; gap: 0.375rem; }
      .field label { font-size: 0.8125rem; font-weight: 600; color: var(--dojo-text-secondary); }
      .field input, .field textarea, .field select {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.9375rem;
        color: var(--dojo-text-primary);
        background: var(--dojo-bg);
        width: 100%; box-sizing: border-box;
        transition: border-color 0.15s; font-family: inherit;
      }
      .field input:focus, .field textarea:focus, .field select:focus {
        outline: none;
        border-color: var(--dojo-primary, #1D4ED8);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--dojo-primary, #1D4ED8) 20%, transparent);
      }
      .field input[aria-invalid="true"] { border-color: var(--dojo-danger, #DC2626); }
      .field textarea { resize: vertical; min-height: 120px; line-height: 1.5; }
      .field-error { font-size: 0.75rem; color: var(--dojo-danger, #DC2626); min-height: 1rem; }

      /* ── Chips de etiquetas (reutilizado de dojo-task-dialog) ── */
      .labels-chips {
        display: flex; flex-wrap: wrap; gap: 0.375rem;
        min-height: 28px; align-items: center;
      }
      .label-chip {
        display: inline-flex; align-items: center; gap: 0.25rem;
        padding: 0.2rem 0.5rem; border-radius: 99px;
        font-size: 0.75rem; font-weight: 500;
      }
      .label-chip-remove {
        background: transparent; border: none; cursor: pointer;
        padding: 0; line-height: 1; font-size: 0.875rem;
        opacity: 0.65; transition: opacity 0.1s; color: inherit;
      }
      .label-chip-remove:hover { opacity: 1; }
      .add-label-btn {
        display: inline-flex; align-items: center; gap: 0.25rem;
        padding: 0.2rem 0.6rem; border: 1px dashed var(--dojo-border);
        border-radius: 99px; font-size: 0.75rem;
        color: var(--dojo-text-secondary); background: transparent;
        cursor: pointer; transition: border-color 0.15s, color 0.15s; font-family: inherit;
      }
      .add-label-btn:hover { border-color: var(--dojo-primary, #1D4ED8); color: var(--dojo-primary, #1D4ED8); }
      .add-label-btn:focus-visible { outline: 2px solid var(--dojo-primary, #1D4ED8); outline-offset: 2px; }
      .labels-picker {
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        background: var(--dojo-surface);
        box-shadow: var(--dojo-shadow);
        max-height: 160px; overflow-y: auto;
        display: none; margin-top: 0.25rem;
      }
      .labels-picker.open { display: block; }
      .label-option {
        display: flex; align-items: center; gap: 0.5rem;
        padding: 0.4375rem 0.75rem; cursor: pointer;
        font-size: 0.875rem; transition: background 0.1s;
      }
      .label-option:hover { background: var(--dojo-bg); }
      .label-option input[type="checkbox"] { accent-color: var(--dojo-primary, #1D4ED8); flex-shrink: 0; width: auto; }
      .label-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

      /* ── Chips de personas ── */
      .persons-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; min-height: 28px; align-items: center; }
      .person-chip {
        display: inline-flex; align-items: center; gap: 0.375rem;
        padding: 0.2rem 0.5rem; border-radius: 99px;
        font-size: 0.75rem; background: var(--dojo-bg); border: 1px solid var(--dojo-border);
        color: var(--dojo-text-primary);
      }
      .person-chip-remove {
        background: transparent; border: none; cursor: pointer;
        padding: 0; line-height: 1; font-size: 0.875rem;
        opacity: 0.65; color: inherit;
      }
      .person-chip-remove:hover { opacity: 1; }
      .add-person-btn {
        display: inline-flex; align-items: center; gap: 0.25rem;
        padding: 0.2rem 0.6rem; border: 1px dashed var(--dojo-border);
        border-radius: 99px; font-size: 0.75rem;
        color: var(--dojo-text-secondary); background: transparent;
        cursor: pointer; font-family: inherit;
      }
      .add-person-btn:hover { border-color: var(--dojo-primary, #1D4ED8); color: var(--dojo-primary, #1D4ED8); }
      .add-person-btn:focus-visible { outline: 2px solid var(--dojo-primary, #1D4ED8); outline-offset: 2px; }
      .persons-picker {
        border: 1px solid var(--dojo-border); border-radius: var(--dojo-radius-sm, 4px);
        background: var(--dojo-surface); box-shadow: var(--dojo-shadow);
        max-height: 160px; overflow-y: auto; display: none; margin-top: 0.25rem;
      }
      .persons-picker.open { display: block; }
      .person-option {
        display: flex; align-items: center; gap: 0.5rem;
        padding: 0.4375rem 0.75rem; cursor: pointer;
        font-size: 0.875rem; transition: background 0.1s;
      }
      .person-option:hover { background: var(--dojo-bg); }
      .person-option input[type="checkbox"] { accent-color: var(--dojo-primary, #1D4ED8); flex-shrink: 0; width: auto; }

      /* ── Acciones formulario ── */
      .form-actions {
        display: flex; justify-content: flex-end; gap: 0.625rem; margin-top: 0.5rem;
      }

      /* ── Confirm delete inline ── */
      .delete-confirm {
        display: none; align-items: center; gap: 0.75rem; flex-wrap: wrap;
        padding: 0.75rem 1rem; background: color-mix(in srgb, var(--dojo-danger, #DC2626) 10%, var(--dojo-surface));
        border: 1px solid color-mix(in srgb, var(--dojo-danger, #DC2626) 30%, var(--dojo-border));
        border-radius: var(--dojo-radius-sm, 4px);
      }
      .delete-confirm.visible { display: flex; }
      .delete-confirm-text { font-size: 0.875rem; color: var(--dojo-text-primary); flex: 1; }
    `;

    const backdrop = document.createElement('div');
    backdrop.className  = 'backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.close();
    });

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'tpl-manager-title');

    const header = document.createElement('div');
    header.className = 'panel-header';

    const title = document.createElement('h2');
    title.id          = 'tpl-manager-title';
    title.className   = 'panel-title';
    title.textContent = 'Templates de tareas';

    const closeBtn = document.createElement('button');
    closeBtn.className  = 'btn-icon';
    closeBtn.type       = 'button';
    closeBtn.setAttribute('aria-label', 'Cerrar');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.close());

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'panel-body';

    panel.appendChild(header);
    panel.appendChild(body);
    backdrop.appendChild(panel);
    this._shadow.appendChild(style);
    this._shadow.appendChild(backdrop);
  }

  // ── Contenido dinámico ───────────────────────────────────────────────────

  private _buildContent(): void {
    const body = this._shadow.querySelector<HTMLElement>('.panel-body');
    if (!body) return;
    body.innerHTML = '';
    if (this._view === 'list') this._buildList(body);
    else this._buildForm(body);
  }

  // ── Vista: lista ─────────────────────────────────────────────────────────

  private _buildList(body: HTMLElement): void {
    const newBtn = document.createElement('button');
    newBtn.className   = 'btn btn-primary btn-new-template';
    newBtn.type        = 'button';
    newBtn.textContent = '+ Nuevo template';
    newBtn.addEventListener('click', () => this._openForm());

    const listEl = document.createElement('div');
    listEl.className = 'template-list';

    if (this._templates.length === 0) {
      const empty = document.createElement('p');
      empty.className   = 'template-empty';
      empty.textContent = 'No hay templates creados. Crea el primero para acelerar tus tareas.';
      listEl.appendChild(empty);
    } else {
      for (const tpl of this._templates) {
        listEl.appendChild(this._buildTemplateItem(tpl));
      }
    }

    body.appendChild(newBtn);
    body.appendChild(listEl);
  }

  private _buildTemplateItem(tpl: TaskTemplate): HTMLElement {
    const item = document.createElement('div');
    item.className = 'template-item';

    const info = document.createElement('div');
    info.className = 'template-item-info';

    const name = document.createElement('span');
    name.className   = 'template-item-name';
    name.textContent = tpl.name;

    const meta = document.createElement('span');
    meta.className = 'template-item-meta';
    const parts: string[] = [];
    if (tpl.priority) parts.push(PRIORITIES.find(p => p.value === tpl.priority)?.label ?? tpl.priority);
    if (tpl.labelIds?.length) parts.push(`${tpl.labelIds.length} etiqueta${tpl.labelIds.length > 1 ? 's' : ''}`);
    if (tpl.personIds?.length) parts.push(`${tpl.personIds.length} asignado${tpl.personIds.length > 1 ? 's' : ''}`);
    meta.textContent = parts.join(' · ') || 'Sin configuración adicional';

    info.appendChild(name);
    info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'template-item-actions';

    const editBtn = document.createElement('button');
    editBtn.className  = 'btn-icon';
    editBtn.type       = 'button';
    editBtn.title      = 'Editar template';
    editBtn.setAttribute('aria-label', `Editar template ${tpl.name}`);
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => this._openForm(tpl));

    const deleteBtn = document.createElement('button');
    deleteBtn.className  = 'btn-icon';
    deleteBtn.type       = 'button';
    deleteBtn.title      = 'Eliminar template';
    deleteBtn.setAttribute('aria-label', `Eliminar template ${tpl.name}`);
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', () => this._showDeleteConfirm(tpl, item));

    // Confirm delete inline
    const confirmEl = document.createElement('div');
    confirmEl.className = 'delete-confirm';
    confirmEl.setAttribute('role', 'alert');
    confirmEl.setAttribute('aria-atomic', 'true');

    const confirmText = document.createElement('span');
    confirmText.className   = 'delete-confirm-text';
    // El texto se asigna en _showDeleteConfirm para que la live region lo anuncie

    const cancelDelBtn = document.createElement('button');
    cancelDelBtn.className  = 'btn btn-ghost';
    cancelDelBtn.type       = 'button';
    cancelDelBtn.textContent = 'Cancelar';
    cancelDelBtn.addEventListener('click', () => {
      confirmEl.classList.remove('visible');
      item.querySelector<HTMLElement>('.template-item-info')!.hidden = false;
      item.querySelector<HTMLElement>('.template-item-actions')!.hidden = false;
    });

    const confirmDelBtn = document.createElement('button');
    confirmDelBtn.className  = 'btn btn-danger';
    confirmDelBtn.type       = 'button';
    confirmDelBtn.textContent = 'Eliminar';
    confirmDelBtn.addEventListener('click', () => {
      void this._handleDelete(tpl.id);
    });

    confirmEl.appendChild(confirmText);
    confirmEl.appendChild(cancelDelBtn);
    confirmEl.appendChild(confirmDelBtn);

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(info);
    item.appendChild(actions);
    item.appendChild(confirmEl);
    return item;
  }

  private _showDeleteConfirm(tpl: TaskTemplate, item: HTMLElement): void {
    item.querySelector<HTMLElement>('.template-item-info')!.hidden = true;
    item.querySelector<HTMLElement>('.template-item-actions')!.hidden = true;
    const confirmEl = item.querySelector<HTMLElement>('.delete-confirm')!;
    // Inyectar el texto aquí para que role="alert" lo detecte como cambio y lo anuncie
    confirmEl.querySelector<HTMLElement>('.delete-confirm-text')!.textContent =
      `¿Eliminar "${tpl.name}"?`;
    confirmEl.classList.add('visible');
    confirmEl.querySelector<HTMLElement>('.btn-danger')?.focus();
  }

  private async _handleDelete(id: string): Promise<void> {
    try {
      await deleteTemplate(id);
      this._templates = await getAllTemplates().catch(() => []);
      this._buildContent();
      this._dispatchChanged();
    } catch (err) {
      console.error('[dojo-template-manager] Error al eliminar template:', err);
    }
  }

  // ── Vista: formulario ────────────────────────────────────────────────────

  private _openForm(tpl?: TaskTemplate): void {
    this._view      = 'form';
    this._editingId = tpl?.id ?? null;
    this._selectedLabelIds  = new Set(tpl?.labelIds ?? []);
    this._selectedPersonIds = new Set(tpl?.personIds ?? []);
    this._buildContent();
    // El foco lo gestiona _buildForm mediante requestAnimationFrame
  }

  private _buildForm(body: HTMLElement): void {
    const editing = this._templates.find(t => t.id === this._editingId);

    // Encabezado del formulario
    const formHeader = document.createElement('div');
    formHeader.className = 'form-header';
    const backBtn = document.createElement('button');
    backBtn.className  = 'btn-icon';
    backBtn.type       = 'button';
    backBtn.setAttribute('aria-label', 'Volver a la lista');
    backBtn.textContent = '←';
    backBtn.addEventListener('click', () => { this._view = 'list'; this._buildContent(); });
    const formTitle = document.createElement('h3');
    formTitle.className   = 'form-title';
    formTitle.textContent = editing ? `Editar "${editing.name}"` : 'Nuevo template';
    formHeader.appendChild(backBtn);
    formHeader.appendChild(formTitle);

    // Error global
    const globalError = document.createElement('p');
    globalError.className   = 'field-error';
    globalError.setAttribute('role', 'alert');
    globalError.id = 'form-error';

    // Campo: nombre
    const nameField = document.createElement('div');
    nameField.className = 'field field-name';
    const nameLbl = document.createElement('label');
    nameLbl.setAttribute('for', 'tpl-name');
    nameLbl.textContent = 'Nombre *';
    const nameInput = document.createElement('input');
    nameInput.type        = 'text';
    nameInput.id          = 'tpl-name';
    nameInput.setAttribute('aria-describedby', 'tpl-name-error');
    nameInput.maxLength   = 60;
    nameInput.placeholder = 'Ej. Bug Report, Feature Request…';
    nameInput.value       = editing?.name ?? '';
    const nameError = document.createElement('span');
    nameError.className = 'field-error';
    nameError.id = 'tpl-name-error';
    nameField.appendChild(nameLbl);
    nameField.appendChild(nameInput);
    nameField.appendChild(nameError);

    // Campo: descripción
    const descField = document.createElement('div');
    descField.className = 'field';
    const descLbl = document.createElement('label');
    descLbl.setAttribute('for', 'tpl-desc');
    descLbl.textContent = 'Descripción (Markdown)';
    const descArea = document.createElement('textarea');
    descArea.id          = 'tpl-desc';
    descArea.placeholder = 'Ej. ## Pasos para reproducir\n\n## Comportamiento esperado';
    descArea.value       = editing?.description ?? '';
    descField.appendChild(descLbl);
    descField.appendChild(descArea);

    // Campo: prioridad
    const prioField = document.createElement('div');
    prioField.className = 'field';
    const prioLbl = document.createElement('label');
    prioLbl.setAttribute('for', 'tpl-priority');
    prioLbl.textContent = 'Prioridad por defecto';
    const prioSelect = document.createElement('select');
    prioSelect.id = 'tpl-priority';
    const optNone = document.createElement('option');
    optNone.value = '';
    optNone.textContent = '— Sin prioridad por defecto —';
    prioSelect.appendChild(optNone);
    for (const p of PRIORITIES) {
      const opt = document.createElement('option');
      opt.value       = p.value;
      opt.textContent = p.label;
      if (editing?.priority === p.value) opt.selected = true;
      prioSelect.appendChild(opt);
    }
    prioField.appendChild(prioLbl);
    prioField.appendChild(prioSelect);

    // Campo: etiquetas
    const labelsField = document.createElement('div');
    labelsField.className = 'field';
    const labelsLbl = document.createElement('span');
    labelsLbl.textContent = 'Etiquetas por defecto';
    labelsField.appendChild(labelsLbl);
    const labelsChips = this._buildLabelsChips();
    const labelsPicker = this._buildLabelsPicker(labelsChips);
    labelsField.appendChild(labelsChips);
    labelsField.appendChild(labelsPicker);

    // Campo: personas
    const personsField = document.createElement('div');
    personsField.className = 'field';
    const personsLbl = document.createElement('span');
    personsLbl.textContent = 'Asignados por defecto';
    personsField.appendChild(personsLbl);
    const personsChips = this._buildPersonsChips();
    const personsPicker = this._buildPersonsPicker(personsChips);
    personsField.appendChild(personsChips);
    personsField.appendChild(personsPicker);

    // Acciones
    const formActions = document.createElement('div');
    formActions.className = 'form-actions';
    const cancelBtn = document.createElement('button');
    cancelBtn.className  = 'btn btn-ghost';
    cancelBtn.type       = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => { this._view = 'list'; this._buildContent(); });
    const saveBtn = document.createElement('button');
    saveBtn.className  = 'btn btn-primary';
    saveBtn.type       = 'button';
    saveBtn.textContent = editing ? 'Guardar cambios' : 'Crear template';
    saveBtn.addEventListener('click', () => {
      void this._handleSave(nameInput, descArea, prioSelect, nameError, globalError);
    });
    formActions.appendChild(cancelBtn);
    formActions.appendChild(saveBtn);

    body.appendChild(formHeader);
    body.appendChild(globalError);
    body.appendChild(nameField);
    body.appendChild(descField);
    body.appendChild(prioField);
    body.appendChild(labelsField);
    body.appendChild(personsField);
    body.appendChild(formActions);

    // Auto-focus nombre
    requestAnimationFrame(() => nameInput.focus());
  }

  // ── Labels chips/picker ──────────────────────────────────────────────────

  private _buildLabelsChips(): HTMLElement {
    const chips = document.createElement('div');
    chips.className = 'labels-chips';
    this._renderLabelChips(chips);
    return chips;
  }

  private _renderLabelChips(chips: HTMLElement): void {
    chips.innerHTML = '';
    for (const id of this._selectedLabelIds) {
      const lbl = this._allLabels.find(l => l.id === id);
      if (!lbl) continue;
      const chip = document.createElement('span');
      chip.className = 'label-chip';
      chip.style.background = lbl.color;
      chip.style.color = pickTextColor(lbl.color);
      chip.textContent = lbl.name;
      const rm = document.createElement('button');
      rm.className   = 'label-chip-remove';
      rm.type        = 'button';
      rm.textContent = '×';
      rm.setAttribute('aria-label', `Quitar etiqueta ${lbl.name}`);
      rm.addEventListener('click', () => {
        this._selectedLabelIds.delete(id);
        this._renderLabelChips(chips);
        const cb = this._shadow.querySelector<HTMLInputElement>(`input[data-label-id="${id}"]`);
        if (cb) cb.checked = false;
      });
      chip.appendChild(rm);
      chips.appendChild(chip);
    }
    const addBtn = document.createElement('button');
    addBtn.className   = 'add-label-btn';
    addBtn.type        = 'button';
    addBtn.textContent = '+ Etiqueta';
    addBtn.addEventListener('click', () => {
      const picker = this._shadow.querySelector('.labels-picker') as (HTMLElement & { _closeOutside?: (e: MouseEvent) => void }) | null;
      if (!picker) return;
      const isOpen = picker.classList.toggle('open');
      if (isOpen && picker._closeOutside) {
        document.addEventListener('click', picker._closeOutside, { capture: true });
      } else if (!isOpen && picker._closeOutside) {
        document.removeEventListener('click', picker._closeOutside, { capture: true });
      }
    });
    chips.appendChild(addBtn);
  }

  private _buildLabelsPicker(chips: HTMLElement): HTMLElement {
    const picker = document.createElement('div');
    picker.className = 'labels-picker';
    for (const lbl of this._allLabels) {
      const opt = document.createElement('label');
      opt.className = 'label-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset['labelId'] = lbl.id;
      cb.checked = this._selectedLabelIds.has(lbl.id);
      cb.addEventListener('change', () => {
        if (cb.checked) this._selectedLabelIds.add(lbl.id);
        else this._selectedLabelIds.delete(lbl.id);
        this._renderLabelChips(chips);
      });
      const dot = document.createElement('span');
      dot.className        = 'label-dot';
      dot.style.background = lbl.color;
      opt.appendChild(cb);
      opt.appendChild(dot);
      opt.appendChild(document.createTextNode(lbl.name));
      picker.appendChild(opt);
    }
    if (this._allLabels.length === 0) {
      const empty = document.createElement('p');
      empty.style.cssText = 'padding: 0.75rem; font-size: 0.8125rem; color: var(--dojo-text-secondary); margin: 0;';
      empty.textContent   = 'No hay etiquetas disponibles.';
      picker.appendChild(empty);
    }
    // Almacenar el handler en el elemento para que el botón "+ Etiqueta" pueda
    // registrarlo/desregistrarlo en cada toggle — evita acumular listeners en document.
    const closeOutside = (e: MouseEvent): void => {
      if (!this._shadow.contains(e.target as Node)) {
        picker.classList.remove('open');
        document.removeEventListener('click', closeOutside, { capture: true });
      }
    };
    (picker as unknown as { _closeOutside: (e: MouseEvent) => void })._closeOutside = closeOutside;
    return picker;
  }

  // ── Persons chips/picker ─────────────────────────────────────────────────

  private _buildPersonsChips(): HTMLElement {
    const chips = document.createElement('div');
    chips.className = 'persons-chips';
    this._renderPersonChips(chips);
    return chips;
  }

  private _renderPersonChips(chips: HTMLElement): void {
    chips.innerHTML = '';
    for (const id of this._selectedPersonIds) {
      const person = this._allPersons.find(p => p.id === id);
      if (!person) continue;
      const chip = document.createElement('span');
      chip.className = 'person-chip';
      chip.textContent = `${person.avatar} ${person.name}`;
      const rm = document.createElement('button');
      rm.className   = 'person-chip-remove';
      rm.type        = 'button';
      rm.textContent = '×';
      rm.setAttribute('aria-label', `Quitar asignado ${person.name}`);
      rm.addEventListener('click', () => {
        this._selectedPersonIds.delete(id);
        this._renderPersonChips(chips);
        const cb = this._shadow.querySelector<HTMLInputElement>(`input[data-person-id="${id}"]`);
        if (cb) cb.checked = false;
      });
      chip.appendChild(rm);
      chips.appendChild(chip);
    }
    const addBtn = document.createElement('button');
    addBtn.className   = 'add-person-btn';
    addBtn.type        = 'button';
    addBtn.textContent = '+ Persona';
    addBtn.addEventListener('click', () => {
      const picker = this._shadow.querySelector('.persons-picker') as (HTMLElement & { _closeOutside?: (e: MouseEvent) => void }) | null;
      if (!picker) return;
      const isOpen = picker.classList.toggle('open');
      if (isOpen && picker._closeOutside) {
        document.addEventListener('click', picker._closeOutside, { capture: true });
      } else if (!isOpen && picker._closeOutside) {
        document.removeEventListener('click', picker._closeOutside, { capture: true });
      }
    });
    chips.appendChild(addBtn);
  }

  private _buildPersonsPicker(chips: HTMLElement): HTMLElement {
    const picker = document.createElement('div');
    picker.className = 'persons-picker';
    const closeOutside = (e: MouseEvent): void => {
      if (!this._shadow.contains(e.target as Node)) {
        picker.classList.remove('open');
        document.removeEventListener('click', closeOutside, { capture: true });
      }
    };
    (picker as unknown as { _closeOutside: (e: MouseEvent) => void })._closeOutside = closeOutside;
    for (const person of this._allPersons) {
      const opt = document.createElement('label');
      opt.className = 'person-option';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset['personId'] = person.id;
      cb.checked = this._selectedPersonIds.has(person.id);
      cb.addEventListener('change', () => {
        if (cb.checked) this._selectedPersonIds.add(person.id);
        else this._selectedPersonIds.delete(person.id);
        this._renderPersonChips(chips);
      });
      opt.appendChild(cb);
      opt.appendChild(document.createTextNode(`${person.avatar} ${person.name}`));
      picker.appendChild(opt);
    }
    if (this._allPersons.length === 0) {
      const empty = document.createElement('p');
      empty.style.cssText = 'padding: 0.75rem; font-size: 0.8125rem; color: var(--dojo-text-secondary); margin: 0;';
      empty.textContent   = 'No hay personas en el directorio.';
      picker.appendChild(empty);
    }
    return picker;
  }

  // ── Guardar ──────────────────────────────────────────────────────────────

  private async _handleSave(
    nameInput: HTMLInputElement,
    descArea: HTMLTextAreaElement,
    prioSelect: HTMLSelectElement,
    nameError: HTMLElement,
    globalError: HTMLElement,
  ): Promise<void> {
    nameError.textContent  = '';
    globalError.textContent = '';
    nameInput.removeAttribute('aria-invalid');

    const name = nameInput.value.trim();
    if (!name) {
      nameInput.setAttribute('aria-invalid', 'true');
      nameError.textContent = 'El nombre es obligatorio.';
      nameInput.focus();
      return;
    }

    const input = {
      name,
      description: descArea.value || undefined,
      priority:    (prioSelect.value as Priority) || undefined,
      labelIds:    this._selectedLabelIds.size > 0 ? [...this._selectedLabelIds] : undefined,
      personIds:   this._selectedPersonIds.size > 0 ? [...this._selectedPersonIds] : undefined,
    };

    try {
      if (this._editingId) {
        await updateTemplate(this._editingId, input);
      } else {
        await createTemplate(input);
      }
      this._templates = await getAllTemplates().catch(() => []);
      this._view      = 'list';
      this._editingId = null;
      this._buildContent();
      this._dispatchChanged();
    } catch (err) {
      globalError.textContent = err instanceof Error ? err.message : 'Error al guardar el template.';
    }
  }

  // ── Evento ──────────────────────────────────────────────────────────────

  private _dispatchChanged(): void {
    this.dispatchEvent(new CustomEvent('dojo:templates-changed', {
      bubbles: true, composed: true, detail: {},
    }));
  }
}

customElements.define(DojoTemplateManager.TAG, DojoTemplateManager);
