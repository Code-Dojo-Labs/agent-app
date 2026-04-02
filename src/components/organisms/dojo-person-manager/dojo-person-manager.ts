/**
 * dojo-person-manager — Organismo
 *
 * Panel lateral para gestionar el directorio local de personas.
 * Permite crear, editar y eliminar personas que pueden asignarse a tareas.
 * Los cambios se persisten en IndexedDB y se propagan mediante eventos.
 *
 * ## API pública  
 * | Método  | Descripción                                        |
 * |---------|----------------------------------------------------|
 * | show()  | Abre el panel y carga las personas desde IndexedDB|
 * | hide()  | Cierra el panel                                    |
 *
 * ## Eventos despachados
 * | Nombre              | Detalle       | Descripción                         |
 * |---------------------|---------------|-------------------------------------|
 * | dojo:person-created | { person }    | Persona creada en IndexedDB         |
 * | dojo:person-updated | { person }    | Persona actualizada en IndexedDB    |
 * | dojo:person-deleted | { personId }  | Persona eliminada de IndexedDB      |
 *
 * ## Atributos observados
 * | Atributo | Valores      | Descripción        |
 * |----------|--------------|--------------------|
 * | open     | presente/ausente | Panel visible  |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-primary, --dojo-shadow, --dojo-radius
 */

import type { Person } from '../../../types/models.js';
import { getAllPersons, createPerson, updatePerson, deletePerson } from '../../../db/person.repository.js';
import { getAllTasks } from '../../../db/task.repository.js';

// ── Emojis predeterminados para avatares ───────────────────────────────────
const PRESET_AVATARS = [
  '👤', '👨‍💻', '👩‍💻', '🧑‍💼', '👨‍🔬', '👩‍🔬', 
  '🧑‍🎨', '👨‍🏫', '👩‍🏫', '🧑‍🔧', '👨‍⚕️', '👩‍⚕️',
  '🧙‍♂️', '🧙‍♀️', '🥷', '🦸‍♂️', '🦸‍♀️', '🤖', 
  '👽', '🐱', '🐶', '🦄', '🐧', '🦁',
] as const;

// ── Clase ──────────────────────────────────────────────────────────────────

export class DojoPersonManager extends HTMLElement {
  static readonly TAG = 'dojo-person-manager';

  static get observedAttributes(): string[] { return ['open']; }

  private _shadow: ShadowRoot;
  private _persons: Person[] = [];
  private _editingId: string | null = null;
  private _deletingId: string | null = null;
  private _deletingAffectedCount: number = 0;

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
      const isOpen = newVal !== null;
      
      if (panel) {
        panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        
        // Gestión de inert para accesibilidad
        if (isOpen) {
          panel.removeAttribute('inert');
        } else {
          panel.setAttribute('inert', '');
        }
      }

      if (isOpen) {
        this._loadPersons();
      }
    }
  }

  // ── API pública ────────────────────────────────────────────────────────────

  /** Abre el panel y carga las personas desde IndexedDB. */
  public show(): void {
    this.setAttribute('open', '');
  }

  /** Cierra el panel. */
  public hide(): void {
    this.removeAttribute('open');
  }

  /** Refresca la lista de personas desde IndexedDB (para sincronización). */
  public async refresh(): Promise<void> {
    await this._loadPersons();
  }

  // ── Lógica interna ─────────────────────────────────────────────────────────

  /** Carga todas las personas desde IndexedDB y re-renderiza la lista. */
  private async _loadPersons(): Promise<void> {
    try {
      this._persons = await getAllPersons();
      this._renderPersonList();
    } catch (error) {
      console.error('[Person Manager] Error cargando personas:', error);
    }
  }

  /** Maneja la creación de una nueva persona. */
  private async _handleCreatePerson(name: string, avatar: string): Promise<void> {
    try {
      const person = await createPerson({ name: name.trim(), avatar });

      // Emitir evento de nivel aplicación
      this.dispatchEvent(new CustomEvent('dojo:person-created', {
        bubbles: true,
        detail: { person }
      }));

      await this._loadPersons();
    } catch (error) {
      console.error('[Person Manager] Error creando persona:', error);
      alert('Error al crear la persona. Inténtalo de nuevo.');
    }
  }

  /** Maneja la actualización de una persona existente. */
  private async _handleUpdatePerson(id: string, name: string, avatar: string): Promise<void> {
    try {
      const person = await updatePerson(id, { name: name.trim(), avatar });

      // Emitir evento de nivel aplicación
      this.dispatchEvent(new CustomEvent('dojo:person-updated', {
        bubbles: true,
        detail: { person }
      }));

      this._editingId = null;
      await this._loadPersons();
    } catch (error) {
      console.error('[Person Manager] Error actualizando persona:', error);
      alert('Error al actualizar la persona. Inténtalo de nuevo.');
    }
  }

  /** Calcula cuántas tareas tiene asignadas una persona. */
  private async _countTasksForPerson(personId: string): Promise<number> {
    try {
      const allTasks = await getAllTasks();
      return allTasks.filter(task => task.assignees.includes(personId)).length;
    } catch (error) {
      console.error('[Person Manager] Error contando tareas:', error);
      return 0;
    }
  }

  /** Maneja la eliminación de una persona (con confirmación). */
  private async _handleDeletePerson(id: string): Promise<void> {
    try {
      // Contar tareas afectadas
      const affectedCount = await this._countTasksForPerson(id);
      
      this._deletingId = id;
      this._deletingAffectedCount = affectedCount;
      this._renderPersonList(); // Re-render para mostrar confirmación
    } catch (error) {
      console.error('[Person Manager] Error iniciando eliminación:', error);
    }
  }

  /** Confirma la eliminación de una persona. */
  private async _confirmDeletePerson(): Promise<void> {
    if (!this._deletingId) return;

    try {
      await deletePerson(this._deletingId);

      // Emitir evento de nivel aplicación
      this.dispatchEvent(new CustomEvent('dojo:person-deleted', {
        bubbles: true,
        detail: { personId: this._deletingId }
      }));

      this._deletingId = null;
      this._deletingAffectedCount = 0;
      await this._loadPersons();
    } catch (error) {
      console.error('[Person Manager] Error eliminando persona:', error);
      alert('Error al eliminar la persona. Inténtalo de nuevo.');
    }
  }

  /** Cancela la eliminación de una persona. */
  private _cancelDeletePerson(): void {
    this._deletingId = null;
    this._deletingAffectedCount = 0;
    this._renderPersonList();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  private _render(): void {
    this._shadow.innerHTML = `
      <style>
        :host {
          display: block;
        }

        .backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }

        :host([open]) .backdrop {
          opacity: 1;
          pointer-events: auto;
        }

        .panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 400px;
          max-width: 90vw;
          height: 100vh;
          background: var(--dojo-surface, #FFFFFF);
          border-left: 1px solid var(--dojo-border, #E5E7EB);
          box-shadow: var(--dojo-shadow, -4px 0 20px rgba(0, 0, 0, 0.1));
          z-index: 1001;
          transform: translateX(100%);
          transition: transform 0.25s ease;
          display: flex;
          flex-direction: column;
        }

        :host([open]) .panel {
          transform: translateX(0);
        }

        .header {
          padding: 20px;
          border-bottom: 1px solid var(--dojo-border, #E5E7EB);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: var(--dojo-text-primary, #1F2937);
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--dojo-text-secondary, #6B7280);
          padding: 4px;
          border-radius: var(--dojo-radius-sm, 6px);
          transition: all 0.15s ease;
        }

        .close-btn:hover {
          background: var(--dojo-bg, #F9FAFB);
          color: var(--dojo-text-primary, #1F2937);
        }

        .content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .create-form {
          background: var(--dojo-bg, #F9FAFB);
          border: 1px solid var(--dojo-border, #E5E7EB);
          border-radius: var(--dojo-radius, 8px);
          padding: 16px;
          margin-bottom: 24px;
        }

        .create-form h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--dojo-text-primary, #1F2937);
        }

        .form-group {
          margin-bottom: 12px;
        }

        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-size: 12px;
          font-weight: 500;
          color: var(--dojo-text-secondary, #6B7280);
        }

        .form-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--dojo-border, #E5E7EB);
          border-radius: var(--dojo-radius-sm, 6px);
          font-size: 14px;
          background: var(--dojo-surface, #FFFFFF);
          color: var(--dojo-text-primary, #1F2937);
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--dojo-primary, #3B82F6);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .avatar-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
          margin-top: 8px;
        }

        .avatar-option {
          aspect-ratio: 1;
          border: 1px solid var(--dojo-border, #E5E7EB);
          border-radius: var(--dojo-radius-sm, 6px);
          background: var(--dojo-surface, #FFFFFF);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.15s ease;
        }

        .avatar-option:hover {
          border-color: var(--dojo-primary, #3B82F6);
          transform: scale(1.05);
        }

        .avatar-option.selected {
          border-color: var(--dojo-primary, #3B82F6);
          background: rgba(59, 130, 246, 0.1);
        }

        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: var(--dojo-radius-sm, 6px);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn-primary {
          background: var(--dojo-primary, #3B82F6);
          color: #FFFFFF;
        }

        .btn-primary:hover {
          background: #2563EB;
        }

        .btn-primary:disabled {
          background: #9CA3AF;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: var(--dojo-bg, #F9FAFB);
          color: var(--dojo-text-secondary, #6B7280);
          border: 1px solid var(--dojo-border, #E5E7EB);
        }

        .btn-secondary:hover {
          background: var(--dojo-surface, #FFFFFF);
          color: var(--dojo-text-primary, #1F2937);
        }

        .btn-danger {
          background: #DC2626;
          color: #FFFFFF;
        }

        .btn-danger:hover {
          background: #B91C1C;
        }

        .person-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .person-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--dojo-border, #E5E7EB);
          border-radius: var(--dojo-radius, 8px);
          margin-bottom: 8px;
          background: var(--dojo-surface, #FFFFFF);
        }

        .person-avatar {
          width: 32px;
          height: 32px;
          border-radius: var(--dojo-radius-sm, 6px);
          background: var(--dojo-primary, #3B82F6);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }

        .person-info {
          flex: 1;
          min-width: 0;
        }

        .person-name {
          font-weight: 500;
          color: var(--dojo-text-primary, #1F2937);
          margin: 0;
          font-size: 14px;
        }

        .person-stats {
          font-size: 12px;
          color: var(--dojo-text-secondary, #6B7280);
          margin-top: 2px;
        }

        .person-actions {
          display: flex;
          gap: 4px;
        }

        .action-btn {
          padding: 4px 8px;
          border: none;
          border-radius: var(--dojo-radius-sm, 6px);
          background: none;
          color: var(--dojo-text-secondary, #6B7280);
          cursor: pointer;
          font-size: 12px;
          transition: all 0.15s ease;
        }

        .action-btn:hover {
          background: var(--dojo-bg, #F9FAFB);
          color: var(--dojo-text-primary, #1F2937);
        }

        .confirm-delete {
          background: #FEF2F2;
          border: 1px solid #FCA5A5;
          border-radius: var(--dojo-radius, 8px);
          padding: 16px;
          margin-bottom: 8px;
        }

        .confirm-delete p {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #7F1D1D;
        }

        .confirm-delete-actions {
          display: flex;
          gap: 8px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: var(--dojo-text-secondary, #6B7280);
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        @media (max-width: 640px) {
          .panel {
            width: 100vw;
            max-width: none;
          }

          .avatar-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      </style>

      <div class="backdrop"></div>

      <div class="panel" role="dialog" aria-labelledby="person-manager-title" aria-hidden="true">
        <div class="header">
          <h2 id="person-manager-title">👤 Gestión de personas</h2>
          <button class="close-btn" aria-label="Cerrar panel">
            ✕
          </button>
        </div>

        <div class="content">
          <div class="create-form">
            <h3>✨ Nueva persona</h3>
            
            <div class="form-group">
              <label for="create-name">Nombre completo</label>
              <input type="text" id="create-name" class="form-input" 
                     placeholder="Ej. Ana García" maxlength="60">
            </div>

            <div class="form-group">
              <label>Avatar</label>
              <div class="avatar-grid" id="avatar-grid">
                <!-- Avatares se generan dinámicamente -->
              </div>
            </div>

            <button class="btn btn-primary" id="create-btn" disabled>
              👤 Crear persona
            </button>
          </div>

          <div id="person-list-container">
            <!-- Lista de personas se genera dinámicamente -->
          </div>
        </div>
      </div>
    `;
    this._generateAvatarGrid();
    this._setupEventListeners();
  }

  /** Configura los event listeners del panel. */
  private _setupEventListeners(): void {
    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.hasAttribute('open')) {
        this.hide();
      }
    });

    // Cerrar backdrop
    const backdrop = this._shadow.querySelector('.backdrop');
    backdrop?.addEventListener('click', () => this.hide());

    // Botón cerrar
    const closeBtn = this._shadow.querySelector('.close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Form de creación
    const nameInput = this._shadow.querySelector<HTMLInputElement>('#create-name');
    const createBtn = this._shadow.querySelector<HTMLButtonElement>('#create-btn');

    const validateCreateForm = () => {
      const name = nameInput?.value.trim() || '';
      const selectedAvatar = this._shadow.querySelector('.avatar-option.selected')?.textContent || '';
      
      if (createBtn) {
        createBtn.disabled = !name || !selectedAvatar;
      }
    };

    nameInput?.addEventListener('input', validateCreateForm);

    createBtn?.addEventListener('click', async () => {
      const name = nameInput?.value.trim() || '';
      const selectedAvatar = this._shadow.querySelector('.avatar-option.selected')?.textContent || '';
      
      if (name && selectedAvatar) {
        await this._handleCreatePerson(name, selectedAvatar);
        
        // Limpiar form
        if (nameInput) nameInput.value = '';
        this._shadow.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
        validateCreateForm();
      }
    });
  }

  /** Genera la grilla de avatares predeterminados. */
  private _generateAvatarGrid(): void {
    const grid = this._shadow.querySelector('#avatar-grid');
    if (!grid) return;

    grid.innerHTML = '';

    PRESET_AVATARS.forEach(avatar => {
      const option = document.createElement('div');
      option.className = 'avatar-option';
      option.textContent = avatar;
      option.addEventListener('click', () => {
        // Deseleccionar otros
        grid.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
        // Seleccionar este
        option.classList.add('selected');
        
        // Validar form
        const createBtn = this._shadow.querySelector<HTMLButtonElement>('#create-btn');
        const nameInput = this._shadow.querySelector<HTMLInputElement>('#create-name');
        if (createBtn && nameInput) {
          createBtn.disabled = !nameInput.value.trim();
        }
      });
      
      grid.appendChild(option);
    });
  }

  /** Re-renderiza la lista de personas. */
  private async _renderPersonList(): Promise<void> {
    const container = this._shadow.querySelector('#person-list-container');
    if (!container) return;

    if (this._persons.length === 0) {
      container.innerHTML = 
        '<div class="empty-state">' +
          '<div class="empty-state-icon">👥</div>' +
          '<p>No hay personas registradas</p>' +
          '<p style="font-size: 12px;">Crea la primera persona usando el formulario de arriba</p>' +
        '</div>';
      return;
    }

    // Calcular estadísticas de tareas por persona
    const taskCounts: { [personId: string]: number } = {};
    for (const person of this._persons) {
      taskCounts[person.id] = await this._countTasksForPerson(person.id);
    }

    const listEl = document.createElement('ul');
    listEl.className = 'person-list';

    for (const person of this._persons) {
      const taskCount = taskCounts[person.id] || 0;
      const isDeleting = this._deletingId === person.id;

      const li = document.createElement('li');
      
      const isEditing = this._editingId === person.id;

      if (isEditing) {
        // ── Formulario de edición inline ────────────────────────────────
        const isPersonEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(person.avatar);

        const editForm = document.createElement('div');
        editForm.className = 'create-form';
        editForm.style.marginBottom = '8px';

        const editTitle = document.createElement('h3');
        editTitle.textContent = '✏️ Editar persona';
        editForm.appendChild(editTitle);

        // Nombre
        const nameGroup = document.createElement('div');
        nameGroup.className = 'form-group';
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Nombre completo';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'form-input';
        nameInput.value = person.name;
        nameInput.maxLength = 60;
        nameGroup.appendChild(nameLabel);
        nameGroup.appendChild(nameInput);
        editForm.appendChild(nameGroup);

        // Avatar grid
        const avatarGroup = document.createElement('div');
        avatarGroup.className = 'form-group';
        const avatarLabel = document.createElement('label');
        avatarLabel.textContent = 'Avatar';
        avatarGroup.appendChild(avatarLabel);

        const editAvatarGrid = document.createElement('div');
        editAvatarGrid.className = 'avatar-grid';
        PRESET_AVATARS.forEach(av => {
          const opt = document.createElement('div');
          opt.className = 'avatar-option' + (av === person.avatar ? ' selected' : '');
          opt.textContent = av;
          opt.addEventListener('click', () => {
            editAvatarGrid.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
            opt.classList.add('selected');
          });
          editAvatarGrid.appendChild(opt);
        });
        avatarGroup.appendChild(editAvatarGrid);
        editForm.appendChild(avatarGroup);

        // Acciones
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '8px';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn-primary';
        saveBtn.textContent = '💾 Guardar';
        saveBtn.addEventListener('click', async () => {
          const newName = nameInput.value.trim();
          if (!newName) { nameInput.focus(); return; }
          const selectedAvatar = editAvatarGrid.querySelector<HTMLElement>('.avatar-option.selected')?.textContent || person.avatar;
          await this._handleUpdatePerson(person.id, newName, selectedAvatar);
        });

        const cancelEditBtn = document.createElement('button');
        cancelEditBtn.className = 'btn btn-secondary';
        cancelEditBtn.textContent = 'Cancelar';
        cancelEditBtn.addEventListener('click', () => {
          this._editingId = null;
          this._renderPersonList();
        });

        actions.appendChild(saveBtn);
        actions.appendChild(cancelEditBtn);
        editForm.appendChild(actions);

        li.appendChild(editForm);

      } else if (isDeleting) {
        // Mostrar confirmación de eliminación — construido con createElement (OWASP A3)
        const confirmBox = document.createElement('div');
        confirmBox.className = 'confirm-delete';

        const titleP = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = `¿Eliminar "${person.name}"?`;
        titleP.appendChild(strong);
        confirmBox.appendChild(titleP);

        const warnP = document.createElement('p');
        warnP.textContent = taskCount > 0
          ? `⚠️ Esta persona está asignada a ${taskCount} tarea${taskCount === 1 ? '' : 's'}. Se desasignará automáticamente.`
          : 'Esta persona no tiene tareas asignadas.';
        confirmBox.appendChild(warnP);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'confirm-delete-actions';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-danger btn-sm';
        confirmBtn.textContent = '🗑️ Confirmar eliminación';
        confirmBtn.addEventListener('click', () => this._confirmDeletePerson());

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary btn-sm';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.addEventListener('click', () => this._cancelDeletePerson());

        actionsDiv.appendChild(confirmBtn);
        actionsDiv.appendChild(cancelBtn);
        confirmBox.appendChild(actionsDiv);

        li.appendChild(confirmBox);

      } else {
        // Mostrar persona normal — construido con createElement (OWASP A3)
        const isEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(person.avatar);

        const personItem = document.createElement('div');
        personItem.className = 'person-item';

        const avatarEl = document.createElement('div');
        avatarEl.className = 'person-avatar';
        if (isEmoji) avatarEl.style.cssText = 'background: transparent; color: inherit; border: 1px solid var(--dojo-border, #E5E7EB);';
        avatarEl.textContent = person.avatar;

        const infoEl = document.createElement('div');
        infoEl.className = 'person-info';

        const nameEl = document.createElement('div');
        nameEl.className = 'person-name';
        nameEl.textContent = person.name;

        const statsEl = document.createElement('div');
        statsEl.className = 'person-stats';
        statsEl.textContent = `${taskCount} tarea${taskCount === 1 ? '' : 's'} asignada${taskCount === 1 ? '' : 's'}`;

        infoEl.appendChild(nameEl);
        infoEl.appendChild(statsEl);

        const actEl = document.createElement('div');
        actEl.className = 'person-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn';
        editBtn.title = 'Editar persona';
        editBtn.setAttribute('aria-label', `Editar ${person.name}`);
        editBtn.textContent = '✏️';
        editBtn.addEventListener('click', () => {
          this._editingId = person.id;
          this._renderPersonList();
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn';
        deleteBtn.title = 'Eliminar persona';
        deleteBtn.setAttribute('aria-label', `Eliminar ${person.name}`);
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', () => this._handleDeletePerson(person.id));

        actEl.appendChild(editBtn);
        actEl.appendChild(deleteBtn);

        personItem.appendChild(avatarEl);
        personItem.appendChild(infoEl);
        personItem.appendChild(actEl);

        li.appendChild(personItem);
      }

      listEl.appendChild(li);
    }

    container.innerHTML = '';
    container.appendChild(listEl);
  }
}

// Registrar el componente
customElements.define(DojoPersonManager.TAG, DojoPersonManager);