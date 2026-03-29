/**
 * dojo-project-manager — Organismo
 *
 * Panel lateral para gestionar los proyectos existentes (US-26).
 * Permite crear, editar nombre/descripción y eliminar proyectos.
 * Los cambios se persisten en IndexedDB y se propagan al tablero
 * mediante eventos personalizados.
 *
 * ## API pública
 * | Método  | Descripción                                          |
 * |---------|----------------------------------------------------- |
 * | show()  | Abre el panel y carga los proyectos desde IndexedDB  |
 * | hide()  | Cierra el panel                                      |
 *
 * ## Eventos despachados
 * | Nombre                | Detalle         | Descripción                         |
 * |-----------------------|-----------------|-------------------------------------|
 * | dojo:project-created  | { project }     | Proyecto creado en IndexedDB        |
 * | dojo:project-updated  | { project }     | Proyecto actualizado en IndexedDB   |
 * | dojo:project-deleted  | { projectId }   | Proyecto eliminado de IndexedDB     |
 *
 * ## Atributos observados
 * | Atributo | Valores          | Descripción       |
 * |----------|------------------|--------------------|
 * | open     | presente/ausente | Panel visible      |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-primary, --dojo-shadow, --dojo-radius
 */

import type { Project } from '../../../types/models.js';
import { DEFAULT_PROJECT_PREFIX } from '../../../types/models.js';
import {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
  isValidPrefix,
} from '../../../db/project.repository.js';

export class DojoProjectManager extends HTMLElement {
  static readonly TAG = 'dojo-project-manager';

  static get observedAttributes(): string[] { return ['open']; }

  private _shadow: ShadowRoot;
  private _projects: Project[] = [];
  private _editingId: string | null = null;
  private _deletingId: string | null = null;
  private _creating = false;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
  }

  attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void {
    if (name === 'open') {
      const panel = this._shadow.querySelector<HTMLElement>('.panel');
      const backdrop = this._shadow.querySelector<HTMLElement>('.backdrop');
      const isOpen = newVal !== null;
      if (panel) {
        panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        if (isOpen) {
          panel.removeAttribute('inert');
        } else {
          panel.setAttribute('inert', '');
        }
      }
      if (backdrop) backdrop.classList.toggle('visible', isOpen);
    }
  }

  // ── API pública ──────────────────────────────────────────────────────────

  async show(): Promise<void> {
    this._projects = await getAllProjects();
    this._editingId  = null;
    this._deletingId = null;
    this._creating   = false;
    this.setAttribute('open', '');
    this._buildContent();
    requestAnimationFrame(() => {
      this._shadow.querySelector<HTMLButtonElement>('.panel-close')?.focus();
    });
  }

  hide(): void {
    this.removeAttribute('open');
    this._editingId  = null;
    this._deletingId = null;
    this._creating   = false;
  }

  // ── Render base ──────────────────────────────────────────────────────────

  private _render(): void {
    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      .backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.45);
        z-index: 40;
      }
      .backdrop.visible { display: block; }

      .panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(400px, 100vw);
        background: var(--dojo-surface);
        border-left: 1px solid var(--dojo-border);
        box-shadow: -4px 0 16px rgba(0,0,0,.12);
        z-index: 50;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateX(100%);
        transition: transform 0.25s ease;
      }
      :host([open]) .panel {
        transform: translateX(0);
      }

      .panel-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1.25rem;
        border-bottom: 1px solid var(--dojo-border);
        flex-shrink: 0;
      }
      .panel-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
        margin: 0;
        flex: 1;
      }
      .panel-close {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 1.125rem;
        color: var(--dojo-text-secondary);
        padding: 0.25rem;
        border-radius: var(--dojo-radius-sm, 4px);
        line-height: 1;
        transition: color 0.15s, background 0.15s;
      }
      .panel-close:hover { color: var(--dojo-text-primary); background: var(--dojo-bg); }
      .panel-close:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem 0;
      }

      .empty-state {
        padding: 1.25rem;
        font-size: 0.875rem;
        color: var(--dojo-text-secondary);
        text-align: center;
        margin: 0;
      }

      /* Botón crear proyecto */
      .create-btn-wrap {
        padding: 0.75rem 1.25rem;
        border-bottom: 1px solid var(--dojo-border);
      }
      .create-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius, 6px);
        background: transparent;
        color: var(--dojo-text-secondary);
        font-size: 0.8125rem;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .create-btn:hover {
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
        border-color: var(--dojo-primary, #1D4ED8);
      }
      .create-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* Lista de proyectos */
      .project-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .project-row {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.625rem 1.25rem;
        border-bottom: 1px solid var(--dojo-border);
      }
      .project-row:last-child { border-bottom: none; }

      .project-prefix {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 48px;
        padding: 0.125rem 0.5rem;
        background: var(--dojo-primary, #1D4ED8);
        color: #fff;
        font-size: 0.6875rem;
        font-weight: 700;
        border-radius: var(--dojo-radius-sm, 4px);
        flex-shrink: 0;
        letter-spacing: 0.03em;
        font-family: monospace;
      }

      .project-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        overflow: hidden;
      }
      .project-name {
        font-size: 0.875rem;
        color: var(--dojo-text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .project-desc {
        font-size: 0.75rem;
        color: var(--dojo-text-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .action-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.875rem;
        color: var(--dojo-text-secondary);
        flex-shrink: 0;
        line-height: 1;
        transition: background 0.15s, color 0.15s;
      }
      .action-btn:hover { background: var(--dojo-bg); color: var(--dojo-text-primary); }
      .action-btn.danger:hover { background: #FEE2E2; color: #B91C1C; }
      .action-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* Formulario inline (editar / crear) */
      .inline-form {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.5rem 0;
      }
      .form-label {
        font-size: 0.6875rem;
        font-weight: 700;
        color: var(--dojo-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .form-input {
        font-size: 0.8125rem;
        padding: 0.375rem 0.5rem;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
        font-family: inherit;
        outline: none;
        width: 100%;
        box-sizing: border-box;
      }
      .form-input:focus {
        border-color: var(--dojo-primary, #1D4ED8);
      }
      .form-input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .form-hint {
        font-size: 0.6875rem;
        color: var(--dojo-text-secondary);
        margin: 0;
      }
      .form-error {
        font-size: 0.75rem;
        color: #EF4444;
        margin: 0;
      }

      .form-actions {
        display: flex;
        gap: 0.375rem;
        justify-content: flex-end;
        padding-top: 0.25rem;
      }
      .btn-secondary {
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
      .btn-secondary:hover { background: var(--dojo-bg); color: var(--dojo-text-primary); }
      .btn-primary {
        padding: 0.25rem 0.625rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.75rem;
        cursor: pointer;
        font-family: inherit;
        background: var(--dojo-primary, #1D4ED8);
        border: 1px solid var(--dojo-primary, #1D4ED8);
        color: #fff;
        font-weight: 600;
        transition: opacity 0.15s;
      }
      .btn-primary:hover { opacity: 0.88; }
      .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
      .btn-secondary:focus-visible,
      .btn-primary:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }
      .btn-danger {
        padding: 0.25rem 0.625rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.75rem;
        cursor: pointer;
        font-family: inherit;
        background: #EF4444;
        border: 1px solid #EF4444;
        color: #fff;
        font-weight: 600;
        transition: opacity 0.15s;
      }
      .btn-danger:hover { opacity: 0.88; }
      .btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }
      .btn-danger:focus-visible {
        outline: 2px solid #EF4444;
        outline-offset: 2px;
      }

      /* Confirmación de eliminación inline */
      .delete-confirm {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        padding: 0.5rem 0;
      }
      .delete-confirm-msg {
        font-size: 0.8125rem;
        color: var(--dojo-text-primary);
        margin: 0;
        line-height: 1.45;
      }
      .delete-confirm-warning {
        font-size: 0.75rem;
        color: #B45309;
        margin: 0;
        background: #FEF3C7;
        border: 1px solid #F59E0B;
        border-radius: var(--dojo-radius-sm, 4px);
        padding: 0.3rem 0.5rem;
      }
      .delete-confirm-actions {
        display: flex;
        gap: 0.375rem;
        justify-content: flex-end;
        padding-top: 0.25rem;
      }

      /* Formulario crear (arriba de la lista) */
      .create-form-wrap {
        padding: 0.75rem 1.25rem;
        border-bottom: 1px solid var(--dojo-border);
      }
    `;
    this._shadow.appendChild(style);

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', () => this.hide());
    this._shadow.appendChild(backdrop);

    // Panel
    const panel = document.createElement('aside');
    panel.className = 'panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'pm-title');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('inert', '');

    // Header
    const panelHeader = document.createElement('div');
    panelHeader.className = 'panel-header';

    const panelTitle = document.createElement('h2');
    panelTitle.id = 'pm-title';
    panelTitle.className = 'panel-title';
    panelTitle.textContent = 'Gestionar proyectos';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'panel-close';
    closeBtn.type = 'button';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Cerrar panel de proyectos');
    closeBtn.addEventListener('click', () => this.hide());

    panelHeader.appendChild(panelTitle);
    panelHeader.appendChild(closeBtn);
    panel.appendChild(panelHeader);

    // Contenido desplazable
    const content = document.createElement('div');
    content.className = 'panel-content';
    panel.appendChild(content);

    this._shadow.appendChild(panel);

    // Escape cierra el panel
    this._shadow.addEventListener('keydown', ((e: Event) => {
      if ((e as KeyboardEvent).key === 'Escape' && this.hasAttribute('open')) this.hide();
    }) as EventListener);
  }

  // ── Construcción dinámica ────────────────────────────────────────────────

  private _buildContent(): void {
    const content = this._shadow.querySelector('.panel-content');
    if (!content) return;
    content.innerHTML = '';

    // Botón o formulario de creación
    if (this._creating) {
      content.appendChild(this._buildCreateForm());
    } else {
      const createWrap = document.createElement('div');
      createWrap.className = 'create-btn-wrap';
      const createBtn = document.createElement('button');
      createBtn.className = 'create-btn';
      createBtn.type = 'button';
      const plusIcon = document.createElement('span');
      plusIcon.setAttribute('aria-hidden', 'true');
      plusIcon.textContent = '➕';
      const plusText = document.createElement('span');
      plusText.textContent = 'Nuevo proyecto';
      createBtn.appendChild(plusIcon);
      createBtn.appendChild(plusText);
      createBtn.addEventListener('click', () => {
        this._creating   = true;
        this._editingId  = null;
        this._deletingId = null;
        this._buildContent();
        requestAnimationFrame(() => {
          this._shadow.querySelector<HTMLInputElement>('.create-name-input')?.focus();
        });
      });
      createWrap.appendChild(createBtn);
      content.appendChild(createWrap);
    }

    if (this._projects.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No hay proyectos. Crea uno para agrupar tus tareas.';
      content.appendChild(empty);
      return;
    }

    const list = document.createElement('ul');
    list.className = 'project-list';
    list.setAttribute('role', 'list');

    for (const project of this._projects) {
      list.appendChild(this._buildProjectRow(project));
    }

    content.appendChild(list);
  }

  // ── Formulario de creación ───────────────────────────────────────────────

  private _buildCreateForm(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'create-form-wrap';

    const form = document.createElement('div');
    form.className = 'inline-form';

    // Nombre
    const nameLabel = document.createElement('label');
    nameLabel.className = 'form-label';
    nameLabel.textContent = 'Nombre';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-input create-name-input';
    nameInput.maxLength = 60;
    nameInput.placeholder = 'Ej. Sitio Web';
    nameLabel.appendChild(nameInput);
    form.appendChild(nameLabel);

    // Prefijo
    const prefixLabel = document.createElement('label');
    prefixLabel.className = 'form-label';
    prefixLabel.textContent = 'Prefijo';
    const prefixInput = document.createElement('input');
    prefixInput.type = 'text';
    prefixInput.className = 'form-input';
    prefixInput.maxLength = 5;
    prefixInput.placeholder = 'Ej. WEB';
    prefixInput.addEventListener('input', () => {
      prefixInput.value = prefixInput.value.toUpperCase().replace(/[^A-Z]/g, '');
    });
    const prefixHint = document.createElement('p');
    prefixHint.className = 'form-hint';
    prefixHint.textContent = '1-5 letras mayúsculas. Inmutable tras la creación.';
    prefixLabel.appendChild(prefixInput);
    prefixLabel.appendChild(prefixHint);
    form.appendChild(prefixLabel);

    // Descripción
    const descLabel = document.createElement('label');
    descLabel.className = 'form-label';
    descLabel.textContent = 'Descripción (opcional)';
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'form-input';
    descInput.maxLength = 200;
    descInput.placeholder = 'Breve descripción del proyecto';
    descLabel.appendChild(descInput);
    form.appendChild(descLabel);

    // Error
    const errorEl = document.createElement('p');
    errorEl.className = 'form-error';
    errorEl.style.display = 'none';
    form.appendChild(errorEl);

    // Acciones
    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {
      this._creating = false;
      this._buildContent();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-primary';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Crear proyecto';
    saveBtn.addEventListener('click', async () => {
      const name   = nameInput.value.trim();
      const prefix = prefixInput.value.trim().toUpperCase();
      const desc   = descInput.value.trim();

      if (!name) {
        errorEl.textContent = 'El nombre es obligatorio.';
        errorEl.style.display = '';
        nameInput.focus();
        return;
      }
      if (!isValidPrefix(prefix)) {
        errorEl.textContent = 'El prefijo debe tener entre 1 y 5 letras mayúsculas (A-Z).';
        errorEl.style.display = '';
        prefixInput.focus();
        return;
      }

      saveBtn.disabled = true;
      errorEl.style.display = 'none';

      try {
        const created = await createProject({ name, prefix, description: desc });
        this._projects.push(created);
        this._creating = false;
        this._buildContent();
        this.dispatchEvent(new CustomEvent('dojo:project-created', {
          bubbles: true, composed: true,
          detail: { project: created },
        }));
      } catch (err) {
        saveBtn.disabled = false;
        errorEl.textContent = err instanceof Error ? err.message : 'Error al crear el proyecto.';
        errorEl.style.display = '';
      }
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    form.appendChild(actions);
    wrap.appendChild(form);

    return wrap;
  }

  // ── Fila de proyecto ─────────────────────────────────────────────────────

  private _buildProjectRow(project: Project): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'project-row';
    item.dataset['projectId'] = project.id;

    if (this._editingId === project.id) {
      item.appendChild(this._buildEditForm(project));
    } else if (this._deletingId === project.id) {
      item.appendChild(this._buildDeleteConfirm(project));
    } else {
      const prefix = document.createElement('span');
      prefix.className = 'project-prefix';
      prefix.textContent = project.prefix;

      const info = document.createElement('div');
      info.className = 'project-info';
      const nameEl = document.createElement('span');
      nameEl.className = 'project-name';
      nameEl.textContent = project.name;
      nameEl.title = project.name;
      info.appendChild(nameEl);
      if (project.description) {
        const descEl = document.createElement('span');
        descEl.className = 'project-desc';
        descEl.textContent = project.description;
        descEl.title = project.description;
        info.appendChild(descEl);
      }

      const editBtn = document.createElement('button');
      editBtn.className = 'action-btn';
      editBtn.type = 'button';
      editBtn.textContent = '✏️';
      editBtn.setAttribute('aria-label', `Editar proyecto "${project.name}"`);
      editBtn.addEventListener('click', () => {
        this._editingId  = project.id;
        this._deletingId = null;
        this._creating   = false;
        this._buildContent();
        requestAnimationFrame(() => {
          this._shadow.querySelector<HTMLInputElement>('.edit-name-input')?.focus();
        });
      });

      // No mostrar botón eliminar para proyecto General
      const isDefault = project.prefix === DEFAULT_PROJECT_PREFIX;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'action-btn danger';
      deleteBtn.type = 'button';
      deleteBtn.textContent = '🗑️';
      deleteBtn.setAttribute('aria-label', `Eliminar proyecto "${project.name}"`);
      if (isDefault) {
        deleteBtn.disabled = true;
        deleteBtn.title = 'No se puede eliminar el proyecto por defecto';
        deleteBtn.style.opacity = '0.35';
        deleteBtn.style.cursor = 'not-allowed';
      } else {
        deleteBtn.addEventListener('click', () => {
          this._editingId  = null;
          this._deletingId = project.id;
          this._creating   = false;
          this._buildContent();
          requestAnimationFrame(() => {
            this._shadow.querySelector<HTMLButtonElement>('.btn-secondary')?.focus();
          });
        });
      }

      item.appendChild(prefix);
      item.appendChild(info);
      item.appendChild(editBtn);
      item.appendChild(deleteBtn);
    }

    return item;
  }

  // ── Formulario de edición inline ─────────────────────────────────────────

  private _buildEditForm(project: Project): HTMLElement {
    const form = document.createElement('div');
    form.className = 'inline-form';

    // Prefijo (solo lectura)
    const prefixLabel = document.createElement('label');
    prefixLabel.className = 'form-label';
    prefixLabel.textContent = 'Prefijo';
    const prefixInput = document.createElement('input');
    prefixInput.type = 'text';
    prefixInput.className = 'form-input';
    prefixInput.value = project.prefix;
    prefixInput.disabled = true;
    prefixLabel.appendChild(prefixInput);
    form.appendChild(prefixLabel);

    // Nombre
    const nameLabel = document.createElement('label');
    nameLabel.className = 'form-label';
    nameLabel.textContent = 'Nombre';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-input edit-name-input';
    nameInput.maxLength = 60;
    nameInput.value = project.name;
    nameLabel.appendChild(nameInput);
    form.appendChild(nameLabel);

    // Descripción
    const descLabel = document.createElement('label');
    descLabel.className = 'form-label';
    descLabel.textContent = 'Descripción';
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'form-input';
    descInput.maxLength = 200;
    descInput.value = project.description || '';
    descLabel.appendChild(descInput);
    form.appendChild(descLabel);

    // Error
    const errorEl = document.createElement('p');
    errorEl.className = 'form-error';
    errorEl.style.display = 'none';
    form.appendChild(errorEl);

    // Acciones
    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {
      this._editingId = null;
      this._buildContent();
    });

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-primary';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Guardar';
    saveBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      const desc = descInput.value.trim();

      if (!name) {
        errorEl.textContent = 'El nombre es obligatorio.';
        errorEl.style.display = '';
        nameInput.focus();
        return;
      }

      saveBtn.disabled = true;
      errorEl.style.display = 'none';

      try {
        const updated = await updateProject(project.id, { name, description: desc });
        const idx = this._projects.findIndex(p => p.id === project.id);
        if (idx >= 0) this._projects[idx] = updated;
        this._editingId = null;
        this._buildContent();
        this.dispatchEvent(new CustomEvent('dojo:project-updated', {
          bubbles: true, composed: true,
          detail: { project: updated },
        }));
      } catch (err) {
        saveBtn.disabled = false;
        errorEl.textContent = err instanceof Error ? err.message : 'Error al guardar.';
        errorEl.style.display = '';
      }
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    form.appendChild(actions);

    return form;
  }

  // ── Confirmación de eliminación ──────────────────────────────────────────

  private _buildDeleteConfirm(project: Project): HTMLElement {
    const container = document.createElement('div');
    container.className = 'delete-confirm';

    const msg = document.createElement('p');
    msg.className = 'delete-confirm-msg';
    msg.textContent = `¿Eliminar el proyecto "${project.name}" (${project.prefix})?`;
    container.appendChild(msg);

    const warning = document.createElement('p');
    warning.className = 'delete-confirm-warning';
    warning.setAttribute('role', 'alert');
    warning.textContent = 'Las tareas de este proyecto se reasignarán al proyecto "General".';
    container.appendChild(warning);

    const actions = document.createElement('div');
    actions.className = 'delete-confirm-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-secondary';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {
      this._deletingId = null;
      this._buildContent();
    });

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-danger';
    confirmBtn.type = 'button';
    confirmBtn.textContent = 'Eliminar';
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;

      try {
        await deleteProject(project.id);
        this._projects = this._projects.filter(p => p.id !== project.id);
        this._deletingId = null;
        this._buildContent();
        this.dispatchEvent(new CustomEvent('dojo:project-deleted', {
          bubbles: true, composed: true,
          detail: { projectId: project.id },
        }));
      } catch (err) {
        confirmBtn.disabled = false;
        const errMsg = document.createElement('p');
        errMsg.className = 'form-error';
        errMsg.textContent = err instanceof Error ? err.message : 'Error al eliminar.';
        container.appendChild(errMsg);
      }
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    container.appendChild(actions);

    return container;
  }
}

customElements.define(DojoProjectManager.TAG, DojoProjectManager);
