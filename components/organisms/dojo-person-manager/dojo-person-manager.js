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
import { getAllPersons, createPerson, updatePerson, deletePerson } from '../../../db/person.repository.js';
import { getAllTasks } from '../../../db/task.repository.js';
// ── Emojis predeterminados para avatares ───────────────────────────────────
const PRESET_AVATARS = [
    '👤', '👨‍💻', '👩‍💻', '🧑‍💼', '👨‍🔬', '👩‍🔬',
    '🧑‍🎨', '👨‍🏫', '👩‍🏫', '🧑‍🔧', '👨‍⚕️', '👩‍⚕️',
    '🧙‍♂️', '🧙‍♀️', '🥷', '🦸‍♂️', '🦸‍♀️', '🤖',
    '👽', '🐱', '🐶', '🦄', '🐧', '🦁',
];
// ── Clase ──────────────────────────────────────────────────────────────────
export class DojoPersonManager extends HTMLElement {
    static TAG = 'dojo-person-manager';
    static get observedAttributes() { return ['open']; }
    _shadow;
    _persons = [];
    _editingId = null;
    _deletingId = null;
    _deletingAffectedCount = 0;
    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
        this._render();
    }
    attributeChangedCallback(name, _oldVal, newVal) {
        if (name === 'open') {
            const panel = this._shadow.querySelector('.panel');
            const isOpen = newVal !== null;
            if (panel) {
                panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
                // Gestión de inert para accesibilidad
                if (isOpen) {
                    panel.removeAttribute('inert');
                }
                else {
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
    show() {
        this.setAttribute('open', '');
    }
    /** Cierra el panel. */
    hide() {
        this.removeAttribute('open');
    }
    /** Refresca la lista de personas desde IndexedDB (para sincronización). */
    async refresh() {
        await this._loadPersons();
    }
    // ── Lógica interna ─────────────────────────────────────────────────────────
    /** Carga todas las personas desde IndexedDB y re-renderiza la lista. */
    async _loadPersons() {
        try {
            this._persons = await getAllPersons();
            this._renderPersonList();
        }
        catch (error) {
            console.error('[Person Manager] Error cargando personas:', error);
        }
    }
    /** Maneja la creación de una nueva persona. */
    async _handleCreatePerson(name, avatar) {
        try {
            const person = await createPerson({ name: name.trim(), avatar });
            // Emitir evento de nivel aplicación
            this.dispatchEvent(new CustomEvent('dojo:person-created', {
                bubbles: true,
                detail: { person }
            }));
            await this._loadPersons();
        }
        catch (error) {
            console.error('[Person Manager] Error creando persona:', error);
            alert('Error al crear la persona. Inténtalo de nuevo.');
        }
    }
    /** Maneja la actualización de una persona existente. */
    async _handleUpdatePerson(id, name, avatar) {
        try {
            const person = await updatePerson(id, { name: name.trim(), avatar });
            // Emitir evento de nivel aplicación
            this.dispatchEvent(new CustomEvent('dojo:person-updated', {
                bubbles: true,
                detail: { person }
            }));
            this._editingId = null;
            await this._loadPersons();
        }
        catch (error) {
            console.error('[Person Manager] Error actualizando persona:', error);
            alert('Error al actualizar la persona. Inténtalo de nuevo.');
        }
    }
    /** Calcula cuántas tareas tiene asignadas una persona. */
    async _countTasksForPerson(personId) {
        try {
            const allTasks = await getAllTasks();
            return allTasks.filter(task => task.assignees.includes(personId)).length;
        }
        catch (error) {
            console.error('[Person Manager] Error contando tareas:', error);
            return 0;
        }
    }
    /** Maneja la eliminación de una persona (con confirmación). */
    async _handleDeletePerson(id) {
        try {
            // Contar tareas afectadas
            const affectedCount = await this._countTasksForPerson(id);
            this._deletingId = id;
            this._deletingAffectedCount = affectedCount;
            this._renderPersonList(); // Re-render para mostrar confirmación
        }
        catch (error) {
            console.error('[Person Manager] Error iniciando eliminación:', error);
        }
    }
    /** Confirma la eliminación de una persona. */
    async _confirmDeletePerson() {
        if (!this._deletingId)
            return;
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
        }
        catch (error) {
            console.error('[Person Manager] Error eliminando persona:', error);
            alert('Error al eliminar la persona. Inténtalo de nuevo.');
        }
    }
    /** Cancela la eliminación de una persona. */
    _cancelDeletePerson() {
        this._deletingId = null;
        this._deletingAffectedCount = 0;
        this._renderPersonList();
    }
    // ── Render ─────────────────────────────────────────────────────────────────
    _render() {
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
    }
    /** Configura los event listeners del panel. */
    _setupEventListeners() {
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
        const nameInput = this._shadow.querySelector('#create-name');
        const createBtn = this._shadow.querySelector('#create-btn');
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
                if (nameInput)
                    nameInput.value = '';
                this._shadow.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
                validateCreateForm();
            }
        });
    }
    /** Genera la grilla de avatares predeterminados. */
    _generateAvatarGrid() {
        const grid = this._shadow.querySelector('#avatar-grid');
        if (!grid)
            return;
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
                const createBtn = this._shadow.querySelector('#create-btn');
                const nameInput = this._shadow.querySelector('#create-name');
                if (createBtn && nameInput) {
                    createBtn.disabled = !nameInput.value.trim();
                }
            });
            grid.appendChild(option);
        });
    }
    /** Re-renderiza la lista de personas. */
    async _renderPersonList() {
        const container = this._shadow.querySelector('#person-list-container');
        if (!container)
            return;
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
        const taskCounts = {};
        for (const person of this._persons) {
            taskCounts[person.id] = await this._countTasksForPerson(person.id);
        }
        const listEl = document.createElement('ul');
        listEl.className = 'person-list';
        for (const person of this._persons) {
            const taskCount = taskCounts[person.id] || 0;
            const isDeleting = this._deletingId === person.id;
            const li = document.createElement('li');
            if (isDeleting) {
                // Mostrar confirmación de eliminación
                li.innerHTML =
                    '<div class="confirm-delete">' +
                        '<p><strong>¿Eliminar "' + person.name + '"?</strong></p>' +
                        (taskCount > 0 ?
                            '<p>⚠️ Esta persona está asignada a ' + taskCount + ' tarea' + (taskCount === 1 ? '' : 's') + '. Se desasignará automáticamente.</p>' :
                            '<p>Esta persona no tiene tareas asignadas.</p>') +
                        '<div class="confirm-delete-actions">' +
                        '<button class="btn btn-danger btn-sm" id="confirm-delete-' + person.id + '">' +
                        '🗑️ Confirmar eliminación' +
                        '</button>' +
                        '<button class="btn btn-secondary btn-sm" id="cancel-delete-' + person.id + '">' +
                        'Cancelar' +
                        '</button>' +
                        '</div>' +
                        '</div>';
                // Event listeners para confirmación
                li.querySelector('#confirm-delete-' + person.id)?.addEventListener('click', () => {
                    this._confirmDeletePerson();
                });
                li.querySelector('#cancel-delete-' + person.id)?.addEventListener('click', () => {
                    this._cancelDeletePerson();
                });
            }
            else {
                // Mostrar persona normal
                const isEmoji = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(person.avatar);
                li.innerHTML =
                    '<div class="person-item">' +
                        '<div class="person-avatar" style="' + (isEmoji ? 'background: transparent; color: inherit; border: 1px solid var(--dojo-border, #E5E7EB);' : '') + '">' + person.avatar + '</div>' +
                        '<div class="person-info">' +
                        '<div class="person-name">' + person.name + '</div>' +
                        '<div class="person-stats">' + taskCount + ' tarea' + (taskCount === 1 ? '' : 's') + ' asignada' + (taskCount === 1 ? '' : 's') + '</div>' +
                        '</div>' +
                        '<div class="person-actions">' +
                        '<button class="action-btn" id="edit-' + person.id + '" title="Editar persona">' +
                        '✏️' +
                        '</button>' +
                        '<button class="action-btn" id="delete-' + person.id + '" title="Eliminar persona">' +
                        '🗑️' +
                        '</button>' +
                        '</div>' +
                        '</div>';
                // Event listeners para acciones
                li.querySelector('#edit-' + person.id)?.addEventListener('click', () => {
                    // TODO: Implementar edición inline
                    console.log('Editar persona:', person.id);
                });
                li.querySelector('#delete-' + person.id)?.addEventListener('click', () => {
                    this._handleDeletePerson(person.id);
                });
            }
            listEl.appendChild(li);
        }
        container.innerHTML = '';
        container.appendChild(listEl);
    }
}
// Registrar el componente
customElements.define(DojoPersonManager.TAG, DojoPersonManager);
