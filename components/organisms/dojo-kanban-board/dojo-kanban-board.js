/**
 * dojo-kanban-board — Organismo
 *
 * Tablero Kanban completo. Carga columnas desde IndexedDB, instancia
 * `<dojo-kanban-column>` por cada una y gestiona el scroll horizontal.
 *
 * Criterios US-01 cubiertos:
 * - Muestra las 6 columnas por defecto (o las existentes en IndexedDB)
 * - Scroll horizontal del tablero con header fijo
 * - Scroll vertical independiente por columna (delegado a dojo-kanban-column)
 * - Conteo de tareas por columna (y formato "X / Y" si hay filtros activos)
 * - Estado `loading` con indicador visual y `aria-busy`
 * - Estado `error` con mensaje descriptivo accesible
 *
 * ## Propiedades públicas
 * | Propiedad    | Tipo     | Descripción                                         |
 * |--------------|----------|-----------------------------------------------------|
 * | activeFilter | object   | Filtro activo { labelIds?, priority? }              |
 *
 * ## Eventos despachados
 * | Nombre               | Detalle          | Descripción                     |
 * |----------------------|------------------|---------------------------------|
 * | dojo:board-ready     | { columnCount }  | Tablero cargado con sus columnas|
 * | dojo:board-error     | { message }      | Error de carga                  |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-shadow, --dojo-radius, --dojo-primary
 */
import { getColumnsByBoard, createColumn, updateColumn, deleteColumn } from '../../../db/column.repository.js';
import { getTasksByStatus, createTask, updateTask, deleteTask, reorderTasks } from '../../../db/task.repository.js';
import { getAllLabels } from '../../../db/label.repository.js';
import { getAllPersons } from '../../../db/person.repository.js';
import { getAllProjects, getNextTaskNumber, getProjectByPrefix } from '../../../db/project.repository.js';
import { addActivityEvent, deleteActivitiesByTaskId } from '../../../db/activity.repository.js';
import '../../molecules/dojo-kanban-column/dojo-kanban-column.js';
import '../../atoms/dojo-task-card/dojo-task-card.js';
import '../../atoms/dojo-add-column-button/dojo-add-column-button.js';
import '../../organisms/dojo-column-dialog/dojo-column-dialog.js';
import '../../organisms/dojo-task-dialog/dojo-task-dialog.js';
import '../../organisms/dojo-task-detail/dojo-task-detail.js';
import '../../organisms/dojo-delete-confirm-dialog/dojo-delete-confirm-dialog.js';
// ── Clase ──────────────────────────────────────────────────────────────────
export class DojoKanbanBoard extends HTMLElement {
    static TAG = 'dojo-kanban-board';
    static get observedAttributes() { return ['board-id']; }
    _shadow;
    _boardId = '';
    _activeFilter = {};
    /** columnId → lista de todas las tareas de esa columna (sin filtrar) */
    _tasksByColumn = new Map();
    /** Lista ordenada de columnas actualmente cargadas */
    _columns = [];
    /** Lista completa de etiquetas (US-10) */
    _labels = [];
    /** Lista completa de proyectos (US-26) */
    _projects = [];
    /** Lista completa de personas (US-29) */
    _persons = [];
    // Referencias UI del toolbar de filtros (US-15)
    _filterBarContent = null;
    _filterClearAllBtn = null;
    _filterLabelSection = null;
    _filterLabelChipsContainer = null;
    _filterToggleBtn = null;
    _filterSearchInput = null;
    _selectedLabelIds = new Set();
    _selectedPriorities = new Set();
    _filterDebounceTimer = null;
    // US-26: referencia UI del filtro de proyecto
    _filterProjectSelect = null;
    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
        this._boardId = this.getAttribute('board-id') ?? '';
        this._render();
        if (this._boardId)
            this._loadBoard();
    }
    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'board-id' && newVal && newVal !== oldVal) {
            this._boardId = newVal;
            if (this._shadow.childElementCount > 0)
                this._loadBoard();
        }
    }
    get boardId() { return this._boardId; }
    /** US-28: Abre el panel de detalle de una tarea por su ID (para la paleta de comandos). */
    async openTaskById(taskId) {
        let task;
        for (const tasks of this._tasksByColumn.values()) {
            task = tasks.find(t => t.id === taskId);
            if (task)
                break;
        }
        if (!task)
            return;
        try {
            const labels = await getAllLabels();
            const detail = this._getTaskDetail();
            if (detail?.openTask)
                detail.openTask(task, this._columns, labels);
        }
        catch (err) {
            console.error('[dojo-kanban-board] Error al abrir detalle de tarea:', err);
        }
    }
    /** US-28: Abre el diálogo de creación con título prellenado (para la paleta de comandos). */
    openCreateTaskWithTitle(title) {
        const col = this._columns[0];
        if (!col)
            return;
        const taskDialog = this._getTaskDialog();
        if (taskDialog?.openCreate)
            taskDialog.openCreate(col.id, col.name, title);
    }
    // ── API pública ──────────────────────────────────────────────────────────
    get activeFilter() { return this._activeFilter; }
    /**
     * Aplica un filtro al tablero. Actualiza los conteos de todas las columnas
     * en tiempo real sin necesidad de recargar desde IndexedDB.
     */
    set activeFilter(filter) {
        this._activeFilter = filter;
        this._columns.forEach(col => this._refreshColumnCards(col.id));
        this._updateColumnCounts();
    }
    /**
     * Actualiza una etiqueta en el caché local y refresca los chips de todas las
     * tarjetas visibles que la tienen asignada. Llamado por dojo-app tras recibir
     * el evento `dojo:label-updated` desde dojo-label-manager (US-11).
     */
    refreshLabel(updatedLabel) {
        this._labels = this._labels.map(l => l.id === updatedLabel.id ? updatedLabel : l);
        for (const [columnId, tasks] of this._tasksByColumn) {
            for (const task of tasks) {
                if ((task.labelIds ?? []).includes(updatedLabel.id)) {
                    const colEl = this._shadow.querySelector(`dojo-kanban-column[column-id="${CSS.escape(columnId)}"]`);
                    if (colEl) {
                        const cardEl = colEl.querySelector(`dojo-task-card[task-id="${CSS.escape(task.id)}"]`);
                        if (cardEl)
                            cardEl.taskLabels = this._getTaskLabels(task);
                    }
                }
            }
        }
    }
    /**
     * Elimina una etiqueta del caché local y actualiza los chips de todas
     * las tarjetas que la tenían asignada. Llamado por dojo-app tras recibir
     * el evento `dojo:label-deleted` desde dojo-label-manager (US-12).
     */
    removeLabel(deletedLabelId) {
        this._labels = this._labels.filter(l => l.id !== deletedLabelId);
        for (const [columnId, tasks] of this._tasksByColumn) {
            for (const task of tasks) {
                if ((task.labelIds ?? []).includes(deletedLabelId)) {
                    // Actualizar el caché local de tareas
                    task.labelIds = task.labelIds.filter(lid => lid !== deletedLabelId);
                    const colEl = this._shadow.querySelector(`dojo-kanban-column[column-id="${CSS.escape(columnId)}"]`);
                    if (colEl) {
                        const cardEl = colEl.querySelector(`dojo-task-card[task-id="${CSS.escape(task.id)}"]`);
                        if (cardEl)
                            cardEl.taskLabels = this._getTaskLabels(task);
                    }
                }
            }
        }
        // Limpiar estado del filtro para la etiqueta eliminada (US-15)
        this._selectedLabelIds.delete(deletedLabelId);
        if (this._activeFilter.labelIds) {
            const newLabelIds = this._activeFilter.labelIds.filter(id => id !== deletedLabelId);
            if (newLabelIds.length !== this._activeFilter.labelIds.length) {
                this._activeFilter = {
                    ...this._activeFilter,
                    labelIds: newLabelIds.length > 0 ? newLabelIds : undefined,
                };
            }
        }
        this._rebuildLabelFilterChips();
        this._updateClearAllVisibility();
    }
    /**
     * Refresca completamente el tablero recargando datos desde IndexedDB.
     * Utilizado para sincronización entre pestañas (US-30).
     */
    async refresh() {
        try {
            console.log('[Kanban Board] Refrescando datos desde IndexedDB (US-30)');
            // Recargar todas las entidades desde la base de datos
            const boardId = this.boardId || this._boardId;
            // Ejecutar recargas en paralelo para mejor rendimiento
            const [columns, labels, persons] = await Promise.all([
                getColumnsByBoard(boardId),
                getAllLabels(),
                getAllPersons()
            ]);
            // Actualizar caches locales
            this._columns = columns;
            this._labels = labels;
            this._persons = persons;
            // Recargar tareas por columna
            this._tasksByColumn.clear();
            for (const column of columns) {
                const tasks = await getTasksByStatus(column.id);
                this._tasksByColumn.set(column.id, tasks.sort((a, b) => a.order - b.order));
            }
            // Re-renderizar columnas
            this._renderColumns(columns);
            // Re-renderizar todas las tarjetas
            for (const column of columns) {
                this._refreshColumnCards(column.id);
            }
            // Actualizar contadores
            this._updateColumnCounts();
            console.log('[Kanban Board] Refresco completado correctamente');
        }
        catch (error) {
            console.error('[Kanban Board] Error al refrescar:', error);
        }
    }
    // ── Render inicial (estructura vacía con loading) ─────────────────────────
    _render() {
        this._shadow.innerHTML = '';
        const style = document.createElement('style');
        style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        background: var(--dojo-bg);
      }

      /* Área de columnas con scroll horizontal */
      .board-track {
        display: flex;
        flex: 1;
        gap: 1rem;
        padding: 1rem;
        overflow-x: auto;
        overflow-y: hidden;
        align-items: flex-start;
        /* Scroll suave en Webkit */
        scroll-behavior: smooth;
        scrollbar-width: thin;
        scrollbar-color: var(--dojo-border) transparent;
      }
      .board-track::-webkit-scrollbar       { height: 6px; }
      .board-track::-webkit-scrollbar-track { background: transparent; }
      .board-track::-webkit-scrollbar-thumb { background: var(--dojo-border); border-radius: 3px; }

      /* Las columnas ocupan la altura disponible */
      .board-track dojo-kanban-column {
        align-self: stretch;
      }

      /* ── Estado: cargando ── */
      .state-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        flex: 1;
        color: var(--dojo-text-secondary);
        font-size: 0.9375rem;
      }
      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--dojo-border);
        border-top-color: var(--dojo-primary, #1D4ED8);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* ── Estado: error ── */
      .error-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1.5rem;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius);
        text-align: center;
        max-width: 360px;
        margin: auto;
      }
      .error-icon  { font-size: 2rem; }
      .error-title { font-weight: 600; color: var(--dojo-text-primary); }
      .error-msg   { font-size: 0.875rem; color: var(--dojo-text-secondary); }
      .retry-btn {
        margin-top: 0.5rem;
        padding: 0.4rem 1rem;
        background: var(--dojo-primary, #1D4ED8);
        color: #fff;
        border: none;
        border-radius: var(--dojo-radius-sm, 4px);
        cursor: pointer;
        font-size: 0.875rem;
      }
      .retry-btn:hover { opacity: 0.9; }

      /* ── Barra de filtros ── */
      .filter-bar {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-bottom: 1px solid var(--dojo-border);
        background: var(--dojo-surface);
        flex-wrap: wrap;
        flex-shrink: 0;
        min-height: 40px;
      }
      .filter-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--dojo-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }
      .filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.625rem;
        background: transparent;
        border: 1px solid var(--dojo-border);
        border-radius: 999px;
        font-size: 0.75rem;
        color: var(--dojo-text-secondary);
        cursor: pointer;
        font-family: inherit;
        transition: background 0.14s, color 0.14s, border-color 0.14s;
        white-space: nowrap;
      }
      .filter-chip:hover {
        background: var(--dojo-bg);
        border-color: var(--dojo-text-secondary);
        color: var(--dojo-text-primary);
      }
      .filter-chip.active {
        background: var(--dojo-primary, #1D4ED8);
        border-color: var(--dojo-primary, #1D4ED8);
        color: #fff;
        font-weight: 600;
      }
      .filter-chip:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }
      .filter-clear {
        padding: 0.25rem 0.5rem;
        background: transparent;
        border: none;
        font-size: 0.75rem;
        color: var(--dojo-text-secondary);
        cursor: pointer;
        font-family: inherit;
        text-decoration: underline;
        white-space: nowrap;
      }
      .filter-clear:hover { color: var(--dojo-text-primary); }

      /* ── Toggle de filtros (US-15) ── */
      .filter-toggle-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.625rem;
        background: transparent;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.8125rem;
        color: var(--dojo-text-secondary);
        cursor: pointer;
        font-family: inherit;
        transition: background 0.14s, color 0.14s, border-color 0.14s;
        flex-shrink: 0;
        white-space: nowrap;
      }
      .filter-toggle-btn:hover {
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
      }
      .filter-toggle-btn.has-active {
        color: var(--dojo-primary, #1D4ED8);
        border-color: var(--dojo-primary, #1D4ED8);
      }
      .filter-toggle-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }
      /* ── Contenido colapsable ── */
      .filter-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        flex: 1;
      }
      .filter-content.collapsed { display: none; }
      /* ── Input de búsqueda ── */
      .filter-search {
        padding: 0.25rem 0.5rem;
        font-size: 0.8125rem;
        font-family: inherit;
        color: var(--dojo-text-primary);
        background: var(--dojo-bg);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        min-width: 160px;
        outline: none;
        transition: border-color 0.14s;
      }
      .filter-search:focus { border-color: var(--dojo-primary, #1D4ED8); }
      .filter-search::placeholder { color: var(--dojo-text-secondary); }
      /* ── Separador vertical ── */
      .filter-sep {
        width: 1px;
        height: 1rem;
        background: var(--dojo-border);
        flex-shrink: 0;
      }
      /* ── Grupo de chips de etiquetas ── */
      .filter-chips-group {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.375rem;
      }
    `;
        this._shadow.appendChild(style);
        // Toolbar de filtros (US-08, US-15)
        this._shadow.appendChild(this._buildFilterBar());
        // Área principal — empieza en estado loading
        this._showLoading();
        // Diálogo de gestión de columnas (montado una sola vez)
        const dialog = document.createElement('dojo-column-dialog');
        this._shadow.appendChild(dialog);
        this._shadow.addEventListener('dojo:dialog-create-column', (e) => this._handleCreate(e));
        this._shadow.addEventListener('dojo:dialog-rename-column', (e) => this._handleRename(e));
        this._shadow.addEventListener('dojo:dialog-delete-column', (e) => this._handleDelete(e));
        this._shadow.addEventListener('dojo:column-rename', (e) => this._onColumnRenameRequest(e));
        this._shadow.addEventListener('dojo:column-delete', (e) => this._onColumnDeleteRequest(e));
        this._shadow.addEventListener('dojo:column-reorder', (e) => this._handleReorder(e));
        this._shadow.addEventListener('dojo:add-column', () => this._onAddColumnRequest());
        // US-03: Drag & Drop de tareas
        this._shadow.addEventListener('dojo:column-drop', (e) => this._handleTaskDrop(e));
        // US-04: Crear tarea
        const taskDialog = document.createElement('dojo-task-dialog');
        this._shadow.appendChild(taskDialog);
        this._shadow.addEventListener('dojo:add-task', (e) => this._onAddTaskRequest(e));
        this._shadow.addEventListener('dojo:dialog-create-task', (e) => this._handleCreateTask(e));
        // US-05: Editar tarea
        const taskDetail = document.createElement('dojo-task-detail');
        this._shadow.appendChild(taskDetail);
        this._shadow.addEventListener('dojo:task-open', (e) => this._onTaskOpen(e));
        this._shadow.addEventListener('dojo:task-field-updated', (e) => this._handleTaskFieldUpdated(e));
        // US-06: Eliminar tarea
        const deleteDialog = document.createElement('dojo-delete-confirm-dialog');
        this._shadow.appendChild(deleteDialog);
        this._shadow.addEventListener('dojo:task-delete-request', (e) => this._onTaskDeleteRequest(e));
        this._shadow.addEventListener('dojo:task-delete-confirm', (e) => this._handleTaskDeleteConfirm(e));
        // US-10: sincronizar etiquetas nuevas creadas desde el panel de detalle
        this._shadow.addEventListener('dojo:label-created', (e) => this._handleLabelCreated(e));
    }
    // ── Toolbar de filtros (US-08, US-15) ───────────────────────────────────
    _buildFilterBar() {
        const FILTER_PRIORITIES = [
            { value: 'low', icon: '⬇️', label: 'Baja' },
            { value: 'medium', icon: '➡️', label: 'Media' },
            { value: 'high', icon: '⬆️', label: 'Alta' },
            { value: 'urgent', icon: '🔥', label: 'Urgente' },
        ];
        // ── Contenedor externo ────────────────────────────────────────────────
        const bar = document.createElement('div');
        bar.className = 'filter-bar';
        bar.setAttribute('role', 'toolbar');
        bar.setAttribute('aria-label', 'Filtros del tablero');
        // ── Botón toggle (siempre visible) ────────────────────────────────────
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'filter-toggle-btn';
        toggleBtn.type = 'button';
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.textContent = 'Filtros';
        this._filterToggleBtn = toggleBtn;
        bar.appendChild(toggleBtn);
        // ── Contenido colapsable ──────────────────────────────────────────────
        const content = document.createElement('div');
        content.className = 'filter-content';
        this._filterBarContent = content;
        bar.appendChild(content);
        // ── Input de búsqueda ─────────────────────────────────────────────────
        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.className = 'filter-search';
        searchInput.placeholder = 'Buscar...';
        searchInput.setAttribute('aria-label', 'Buscar tareas por título o descripción');
        this._filterSearchInput = searchInput;
        content.appendChild(searchInput);
        // ── Selector de ordenamiento (US-17) ──────────────────────────────────
        const sortLabel = document.createElement('label');
        sortLabel.className = 'filter-label';
        sortLabel.textContent = 'Orden:';
        sortLabel.setAttribute('for', 'sort-select');
        content.appendChild(sortLabel);
        const sortSelect = document.createElement('select');
        sortSelect.id = 'sort-select';
        sortSelect.className = 'filter-search';
        sortSelect.setAttribute('aria-label', 'Ordenar tareas');
        const optOrder = document.createElement('option');
        optOrder.value = 'order';
        optOrder.textContent = 'Manual';
        const optDue = document.createElement('option');
        optDue.value = 'due-date';
        optDue.textContent = 'Fecha de vencimiento';
        sortSelect.appendChild(optOrder);
        sortSelect.appendChild(optDue);
        sortSelect.addEventListener('change', () => {
            this.activeFilter = { ...this._activeFilter, sortBy: sortSelect.value };
        });
        content.appendChild(sortSelect);
        // ── Separador ─────────────────────────────────────────────────────────
        const sep1 = document.createElement('div');
        sep1.className = 'filter-sep';
        sep1.setAttribute('aria-hidden', 'true');
        content.appendChild(sep1);
        // ── Chips de prioridad ────────────────────────────────────────────────
        const priorityLabel = document.createElement('span');
        priorityLabel.className = 'filter-label';
        priorityLabel.textContent = 'Prioridad:';
        content.appendChild(priorityLabel);
        for (const p of FILTER_PRIORITIES) {
            const btn = document.createElement('button');
            btn.className = 'filter-chip';
            btn.type = 'button';
            btn.setAttribute('aria-pressed', 'false');
            btn.setAttribute('data-priority', p.value);
            btn.textContent = `${p.icon} ${p.label}`;
            btn.addEventListener('click', () => {
                const isActive = this._selectedPriorities.has(p.value);
                if (isActive) {
                    this._selectedPriorities.delete(p.value);
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                }
                else {
                    this._selectedPriorities.add(p.value);
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');
                }
                const newPriorities = this._selectedPriorities.size > 0
                    ? Array.from(this._selectedPriorities)
                    : undefined;
                this.activeFilter = { ...this._activeFilter, priorities: newPriorities };
                this._updateClearAllVisibility();
            });
            content.appendChild(btn);
        }
        // ── Sección de etiquetas (se rellena tras cargar las etiquetas) ────────
        const labelSection = document.createElement('div');
        labelSection.style.display = 'none';
        this._filterLabelSection = labelSection;
        const sep2 = document.createElement('div');
        sep2.className = 'filter-sep';
        sep2.setAttribute('aria-hidden', 'true');
        labelSection.appendChild(sep2);
        const labelsLabelEl = document.createElement('span');
        labelsLabelEl.className = 'filter-label';
        labelsLabelEl.textContent = 'Etiquetas:';
        labelSection.appendChild(labelsLabelEl);
        const labelChipsContainer = document.createElement('div');
        labelChipsContainer.className = 'filter-chips-group';
        this._filterLabelChipsContainer = labelChipsContainer;
        labelSection.appendChild(labelChipsContainer);
        content.appendChild(labelSection);
        // ── Selector de proyecto (US-26) ──────────────────────────────────────
        const projectSep = document.createElement('div');
        projectSep.className = 'filter-sep';
        projectSep.setAttribute('aria-hidden', 'true');
        content.appendChild(projectSep);
        const projectLabel = document.createElement('span');
        projectLabel.className = 'filter-label';
        projectLabel.textContent = 'Proyecto:';
        content.appendChild(projectLabel);
        const projectSelect = document.createElement('select');
        projectSelect.className = 'filter-search';
        projectSelect.setAttribute('aria-label', 'Filtrar por proyecto');
        const allOpt = document.createElement('option');
        allOpt.value = '';
        allOpt.textContent = 'Todos';
        projectSelect.appendChild(allOpt);
        this._filterProjectSelect = projectSelect;
        projectSelect.addEventListener('change', () => {
            this.activeFilter = { ...this._activeFilter, projectId: projectSelect.value || undefined };
            this._updateClearAllVisibility();
        });
        content.appendChild(projectSelect);
        // ── Botón "Limpiar filtros" ───────────────────────────────────────────
        const clearAllBtn = document.createElement('button');
        clearAllBtn.className = 'filter-clear';
        clearAllBtn.type = 'button';
        clearAllBtn.textContent = '✕ Limpiar filtros';
        clearAllBtn.setAttribute('aria-label', 'Limpiar todos los filtros activos');
        clearAllBtn.style.display = 'none';
        this._filterClearAllBtn = clearAllBtn;
        clearAllBtn.addEventListener('click', () => this._clearAllFilters());
        content.appendChild(clearAllBtn);
        // ── Comportamiento toggle ─────────────────────────────────────────────
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = content.classList.contains('collapsed');
            content.classList.toggle('collapsed');
            toggleBtn.setAttribute('aria-expanded', String(isCollapsed));
            this._updateClearAllVisibility();
        });
        // ── Búsqueda con debounce 300ms ───────────────────────────────────────
        searchInput.addEventListener('input', () => {
            if (this._filterDebounceTimer !== null)
                clearTimeout(this._filterDebounceTimer);
            this._filterDebounceTimer = setTimeout(() => {
                this._filterDebounceTimer = null;
                const text = searchInput.value.trim();
                this.activeFilter = { ...this._activeFilter, searchText: text || undefined };
                this._updateClearAllVisibility();
            }, 300);
        });
        return bar;
    }
    /** Reconstruye los chips de etiquetas del toolbar. Se llama tras cargar/cambiar etiquetas. */
    _rebuildLabelFilterChips() {
        if (!this._filterLabelSection || !this._filterLabelChipsContainer)
            return;
        // Limpiar IDs seleccionados de etiquetas que ya no existen
        const existingIds = new Set(this._labels.map(l => l.id));
        for (const id of [...this._selectedLabelIds]) {
            if (!existingIds.has(id))
                this._selectedLabelIds.delete(id);
        }
        // Sincronizar activeFilter.labelIds con etiquetas que siguen existiendo
        if (this._activeFilter.labelIds) {
            const cleaned = this._activeFilter.labelIds.filter(id => existingIds.has(id));
            if (cleaned.length !== this._activeFilter.labelIds.length) {
                this._activeFilter = {
                    ...this._activeFilter,
                    labelIds: cleaned.length > 0 ? cleaned : undefined,
                };
            }
        }
        this._filterLabelChipsContainer.innerHTML = '';
        if (this._labels.length === 0) {
            this._filterLabelSection.style.display = 'none';
            this._updateClearAllVisibility();
            return;
        }
        this._filterLabelSection.style.display = 'contents';
        for (const lbl of this._labels) {
            const btn = document.createElement('button');
            btn.className = 'filter-chip';
            btn.type = 'button';
            btn.setAttribute('data-label-id', lbl.id);
            const isActive = this._selectedLabelIds.has(lbl.id);
            btn.setAttribute('aria-pressed', String(isActive));
            btn.textContent = lbl.name;
            if (isActive)
                btn.classList.add('active');
            btn.addEventListener('click', () => {
                const active = this._selectedLabelIds.has(lbl.id);
                if (active) {
                    this._selectedLabelIds.delete(lbl.id);
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                }
                else {
                    this._selectedLabelIds.add(lbl.id);
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');
                }
                const newLabelIds = this._selectedLabelIds.size > 0
                    ? Array.from(this._selectedLabelIds)
                    : undefined;
                this.activeFilter = { ...this._activeFilter, labelIds: newLabelIds };
                this._updateClearAllVisibility();
            });
            this._filterLabelChipsContainer.appendChild(btn);
        }
        this._updateClearAllVisibility();
    }
    /** Reconstruye las opciones del selector de proyectos (US-26). */
    _rebuildProjectFilterSelect() {
        if (!this._filterProjectSelect)
            return;
        // Preservar selección actual
        const currentValue = this._filterProjectSelect.value;
        // Limpiar opciones (excepto "Todos")
        while (this._filterProjectSelect.options.length > 1) {
            this._filterProjectSelect.remove(1);
        }
        for (const proj of this._projects) {
            const opt = document.createElement('option');
            opt.value = proj.id;
            opt.textContent = `${proj.prefix} — ${proj.name}`;
            this._filterProjectSelect.appendChild(opt);
        }
        // Restaurar selección si sigue existiendo
        if (this._projects.some(p => p.id === currentValue)) {
            this._filterProjectSelect.value = currentValue;
        }
        else {
            this._filterProjectSelect.value = '';
            if (this._activeFilter.projectId) {
                this._activeFilter = { ...this._activeFilter, projectId: undefined };
            }
        }
    }
    /** Muestra/oculta el botón "Limpiar filtros" y actualiza el estado visual del toggle. */
    _updateClearAllVisibility() {
        if (!this._filterClearAllBtn || !this._filterToggleBtn)
            return;
        const hasActive = (this._activeFilter.priorities?.length ?? 0) > 0 ||
            (this._activeFilter.labelIds?.length ?? 0) > 0 ||
            !!(this._activeFilter.searchText) ||
            !!(this._activeFilter.projectId);
        this._filterClearAllBtn.style.display = hasActive ? '' : 'none';
        this._filterToggleBtn.classList.toggle('has-active', hasActive);
    }
    /** Resetea todos los filtros activos y actualiza la UI del toolbar. */
    _clearAllFilters() {
        this._selectedPriorities.clear();
        this._selectedLabelIds.clear();
        if (this._filterDebounceTimer !== null) {
            clearTimeout(this._filterDebounceTimer);
            this._filterDebounceTimer = null;
        }
        if (this._filterSearchInput)
            this._filterSearchInput.value = '';
        if (this._filterProjectSelect)
            this._filterProjectSelect.value = '';
        if (this._filterBarContent) {
            this._filterBarContent.querySelectorAll('[data-priority]').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            this._filterBarContent.querySelectorAll('[data-label-id]').forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
        }
        this.activeFilter = {};
        this._updateClearAllVisibility();
    }
    // ── Estados visuales ─────────────────────────────────────────────────────
    _showLoading() {
        this.setAttribute('aria-busy', 'true');
        const container = document.createElement('div');
        container.className = 'state-container';
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        spinner.setAttribute('aria-hidden', 'true');
        const label = document.createElement('p');
        label.textContent = 'Cargando tablero…';
        container.appendChild(spinner);
        container.appendChild(label);
        this._setMainContent(container);
    }
    _showError(message) {
        this.removeAttribute('aria-busy');
        const box = document.createElement('div');
        box.className = 'error-box';
        box.setAttribute('role', 'alert');
        const icon = document.createElement('span');
        icon.className = 'error-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '⚠️';
        const title = document.createElement('p');
        title.className = 'error-title';
        title.textContent = 'Error al cargar el tablero';
        const msg = document.createElement('p');
        msg.className = 'error-msg';
        msg.textContent = message;
        const btn = document.createElement('button');
        btn.className = 'retry-btn';
        btn.textContent = 'Reintentar';
        btn.addEventListener('click', () => this._loadBoard());
        box.appendChild(icon);
        box.appendChild(title);
        box.appendChild(msg);
        box.appendChild(btn);
        this._setMainContent(box);
        this.dispatchEvent(new CustomEvent('dojo:board-error', {
            bubbles: true, composed: true,
            detail: { message },
        }));
    }
    _setMainContent(node) {
        const existing = this._shadow.querySelector('.board-track, .state-container, .error-box');
        if (existing)
            existing.remove();
        this._shadow.appendChild(node);
    }
    // ── Carga de datos ────────────────────────────────────────────────────────
    async _loadBoard() {
        this._showLoading();
        // Limpiar datos previos para evitar entradas stale ante reintentos o cambios de columnas
        this._tasksByColumn.clear();
        try {
            const [columns, labels, projects, persons] = await Promise.all([
                getColumnsByBoard(this._boardId),
                getAllLabels(),
                getAllProjects(),
                getAllPersons(),
            ]);
            this._labels = labels;
            this._projects = projects;
            this._persons = persons;
            this._rebuildLabelFilterChips(); // Poblar chips de etiquetas en el toolbar (US-15)
            this._rebuildProjectFilterSelect(); // Poblar selector de proyectos (US-26)
            // Cargar tareas de todas las columnas en paralelo
            const taskResults = await Promise.all(columns.map(col => getTasksByStatus(col.id)));
            columns.forEach((col, i) => {
                this._tasksByColumn.set(col.id, taskResults[i]);
            });
            this._columns = columns;
            this._renderColumns(columns);
            this.removeAttribute('aria-busy');
            this.dispatchEvent(new CustomEvent('dojo:board-ready', {
                bubbles: true, composed: true,
                detail: { columnCount: columns.length },
            }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            this._showError(message);
        }
    }
    // ── Renderizado de columnas ───────────────────────────────────────────────
    _renderColumns(columns) {
        const track = document.createElement('div');
        track.className = 'board-track';
        track.setAttribute('role', 'region');
        track.setAttribute('aria-label', 'Tablero Kanban');
        for (const col of columns) {
            const { visible, total } = this._getColumnCounts(col.id);
            const colEl = document.createElement('dojo-kanban-column');
            colEl.setAttribute('column-id', col.id);
            colEl.setAttribute('column-name', col.name);
            colEl.setAttribute('icon', col.icon);
            colEl.setAttribute('count', String(visible));
            colEl.setAttribute('total-count', String(total));
            if (col.color)
                colEl.setAttribute('accent-color', col.color);
            // US-03: Renderizar tarjetas de tarea en la columna
            const tasks = this._tasksByColumn.get(col.id) ?? [];
            this._renderTaskCards(colEl, tasks);
            track.appendChild(colEl);
        }
        // Botón "Añadir columna" al final del track
        const addBtn = document.createElement('dojo-add-column-button');
        track.appendChild(addBtn);
        this._setMainContent(track);
    }
    // ── Renderizado y refresco de tarjetas de tarea (US-03) ───────────────────────────────────────
    /**
     * Crea y agrega `dojo-task-card` como hijos directos del elemento de columna.
     * Las tarjetas se proyectan en el default slot del componente.
     */
    _renderTaskCards(colEl, tasks) {
        const sortMode = this._activeFilter.sortBy ?? 'order';
        const sorted = [...tasks].sort((a, b) => {
            if (sortMode === 'due-date') {
                const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                if (aDate !== bDate)
                    return aDate - bDate;
            }
            return a.order - b.order;
        });
        const filtered = this._filterTasks(sorted);
        for (const task of filtered) {
            const card = document.createElement('dojo-task-card');
            card.setAttribute('task-id', task.id);
            card.setAttribute('task-title', task.title);
            card.setAttribute('task-priority', task.priority);
            card.setAttribute('task-created-at', task.createdAt);
            if (task.taskNumber)
                card.setAttribute('task-number', task.taskNumber);
            if (task.dueDate)
                card.setAttribute('task-due-date', task.dueDate);
            card.taskLabels = this._getTaskLabels(task);
            card.taskAssignees = this._getTaskAssignees(task);
            const subs = task.subtasks ?? [];
            if (subs.length > 0) {
                card.setSubtaskProgress(subs.filter(s => s.completed).length, subs.length);
            }
            colEl.appendChild(card);
        }
    }
    /**
     * Reemplaza las tarjetas de una columna ya renderizada sin recrear el elemento columna.
     */
    _refreshColumnCards(columnId) {
        const colEl = this._shadow.querySelector(`dojo-kanban-column[column-id="${CSS.escape(columnId)}"]`);
        if (!colEl)
            return;
        colEl.querySelectorAll('dojo-task-card').forEach(el => el.remove());
        const tasks = this._tasksByColumn.get(columnId) ?? [];
        this._renderTaskCards(colEl, tasks);
    }
    // ── Conteo con filtros ──────────────────────────────────────────────────────────────────────────
    _getColumnCounts(columnId) {
        const tasks = this._tasksByColumn.get(columnId) ?? [];
        const total = tasks.length;
        const visible = this._filterTasks(tasks).length;
        return { visible, total };
    }
    /** Resuelve los objetos Label para una tarea a partir del caché local (US-10). */
    _getTaskLabels(task) {
        return (task.labelIds ?? [])
            .map(id => this._labels.find(l => l.id === id))
            .filter((l) => l !== undefined);
    }
    /** Resuelve los objetos Person para una tarea a partir del caché local (US-29). */
    _getTaskAssignees(task) {
        return (task.assignees ?? [])
            .map(id => this._persons.find(p => p.id === id))
            .filter((p) => p !== undefined);
    }
    /** Añade una etiqueta recién creada al caché local para que los chips se muestren sin recargar (US-10). */
    _handleLabelCreated(e) {
        const { label } = e.detail;
        if (!this._labels.find(l => l.id === label.id)) {
            this._labels = [...this._labels, label].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
            this._rebuildLabelFilterChips();
        }
    }
    _filterTasks(tasks) {
        const { priorities, labelIds, searchText, projectId } = this._activeFilter;
        const lowerSearch = searchText ? searchText.toLowerCase() : null;
        return tasks.filter(task => {
            if (priorities && priorities.length > 0 && !priorities.includes(task.priority))
                return false;
            if (labelIds && labelIds.length > 0) {
                const taskLabelIds = task.labelIds ?? [];
                const hasLabel = labelIds.some(id => taskLabelIds.includes(id));
                if (!hasLabel)
                    return false;
            }
            if (projectId && task.projectId !== projectId)
                return false;
            if (lowerSearch) {
                const titleMatch = task.title.toLowerCase().includes(lowerSearch);
                const descMatch = (task.description ?? '').toLowerCase().includes(lowerSearch);
                if (!titleMatch && !descMatch)
                    return false;
            }
            return true;
        });
    }
    /** Actualiza los conteos en las columnas ya renderizadas sin re-renderizar. */
    _updateColumnCounts() {
        const columns = this._shadow.querySelectorAll('dojo-kanban-column');
        columns.forEach(col => {
            const columnId = col.getAttribute('column-id') ?? '';
            const { visible, total } = this._getColumnCounts(columnId);
            col.setAttribute('count', String(visible));
            col.setAttribute('total-count', String(total));
        });
    }
    // ── Handler: Drop de tarea (US-03) ───────────────────────────────────────
    /**
     * Maneja `dojo:column-drop` para mover tareas entre columnas o reordenarlas
     * dentro de la misma. Detecta el tipo de operación por comparación de columnId.
     */
    async _handleTaskDrop(e) {
        const { columnId: targetColumnId, taskId, beforeTaskId } = e.detail;
        // Localizar la columna origen desde el caché
        let sourceColumnId = null;
        for (const [colId, tasks] of this._tasksByColumn) {
            if (tasks.some(t => t.id === taskId)) {
                sourceColumnId = colId;
                break;
            }
        }
        if (!sourceColumnId)
            return;
        try {
            if (sourceColumnId === targetColumnId) {
                // ── Reordenamiento dentro de la misma columna ─────────────────────
                const tasks = this._tasksByColumn.get(targetColumnId) ?? [];
                const orderedIds = this._computeReorderedIds(tasks, taskId, beforeTaskId);
                await reorderTasks(targetColumnId, orderedIds);
                const taskMap = new Map(tasks.map(t => [t.id, t]));
                this._tasksByColumn.set(targetColumnId, orderedIds.map((id, order) => ({ ...taskMap.get(id), order })));
            }
            else {
                // ── Movimiento entre columnas ──────────────────────────────────────
                const sourceTasks = this._tasksByColumn.get(sourceColumnId) ?? [];
                const targetTasks = this._tasksByColumn.get(targetColumnId) ?? [];
                const movedTask = sourceTasks.find(t => t.id === taskId);
                if (!movedTask)
                    return;
                const newTargetTasks = this._insertAtPosition([...targetTasks], { ...movedTask, statusId: targetColumnId }, beforeTaskId);
                const newSourceTasks = sourceTasks.filter(t => t.id !== taskId);
                await updateTask(taskId, { statusId: targetColumnId });
                // US-20: registrar cambio de estado por drag & drop
                const fromName = this._columns.find(c => c.id === sourceColumnId)?.name ?? sourceColumnId;
                const toName = this._columns.find(c => c.id === targetColumnId)?.name ?? targetColumnId;
                addActivityEvent({ taskId, type: 'status_change', payload: { from: fromName, to: toName } });
                await reorderTasks(targetColumnId, newTargetTasks.map(t => t.id));
                if (newSourceTasks.length > 0) {
                    await reorderTasks(sourceColumnId, newSourceTasks.map(t => t.id));
                }
                this._tasksByColumn.set(sourceColumnId, newSourceTasks.map((t, i) => ({ ...t, order: i })));
                this._tasksByColumn.set(targetColumnId, newTargetTasks.map((t, i) => ({ ...t, order: i, statusId: targetColumnId })));
                this._refreshColumnCards(sourceColumnId);
            }
            this._refreshColumnCards(targetColumnId);
            this._updateColumnCounts();
        }
        catch (err) {
            console.error('[dojo-kanban-board] Error al procesar drop de tarea:', err);
        }
    }
    /**
     * Calcula el array de IDs resultante al mover `movingId` antes de `beforeId`.
     * Si `beforeId` es null, la tarea se añade al final.
     */
    _computeReorderedIds(tasks, movingId, beforeId) {
        const others = tasks.filter(t => t.id !== movingId);
        if (beforeId === null)
            return [...others.map(t => t.id), movingId];
        const idx = others.findIndex(t => t.id === beforeId);
        if (idx === -1)
            return [...others.map(t => t.id), movingId];
        const result = others.map(t => t.id);
        result.splice(idx, 0, movingId);
        return result;
    }
    /**
     * Inserta `task` en `tasks` antes del elemento con id `beforeId`.
     * Si `beforeId` es null o no existe, inserta al final.
     */
    _insertAtPosition(tasks, task, beforeId) {
        if (beforeId === null)
            return [...tasks, task];
        const idx = tasks.findIndex(t => t.id === beforeId);
        if (idx === -1)
            return [...tasks, task];
        const result = [...tasks];
        result.splice(idx, 0, task);
        return result;
    }
    // ── Handlers de gestión de columnas ────────────────────────────────────────
    _getDialog() {
        return this._shadow.querySelector('dojo-column-dialog');
    }
    _getTaskDialog() {
        return this._shadow.querySelector('dojo-task-dialog');
    }
    _getTaskDetail() {
        return this._shadow.querySelector('dojo-task-detail');
    }
    _getDeleteDialog() {
        return this._shadow.querySelector('dojo-delete-confirm-dialog');
    }
    _onAddColumnRequest() {
        const dialog = this._getDialog();
        if (dialog?.openCreate)
            dialog.openCreate();
    }
    _onColumnRenameRequest(e) {
        const { columnId } = e.detail;
        const col = this._columns.find(c => c.id === columnId);
        if (!col)
            return;
        const dialog = this._getDialog();
        if (dialog?.openRename)
            dialog.openRename(col.id, col.name);
    }
    _onColumnDeleteRequest(e) {
        const { columnId } = e.detail;
        const col = this._columns.find(c => c.id === columnId);
        if (!col)
            return;
        const otherColumns = this._columns.filter(c => c.id !== columnId);
        const dialog = this._getDialog();
        if (dialog?.openDelete)
            dialog.openDelete(col.id, col.name, otherColumns);
    }
    async _handleCreate(e) {
        const { name, icon } = e.detail;
        const nextOrder = this._columns.length > 0
            ? Math.max(...this._columns.map(c => c.order)) + 1
            : 0;
        try {
            const newCol = await createColumn({ name, icon, order: nextOrder, boardId: this._boardId });
            this._columns.push(newCol);
            this._tasksByColumn.set(newCol.id, []);
            this._renderColumns(this._columns);
        }
        catch (err) {
            console.error('[dojo-kanban-board] Error al crear columna:', err);
        }
    }
    async _handleRename(e) {
        const { columnId, name } = e.detail;
        try {
            const updated = await updateColumn(columnId, { name });
            const idx = this._columns.findIndex(c => c.id === columnId);
            if (idx !== -1)
                this._columns[idx] = updated;
            // Actualizar solo el atributo del elemento del DOM
            const colEl = this._shadow.querySelector(`dojo-kanban-column[column-id="${columnId}"]`);
            if (colEl)
                colEl.setAttribute('column-name', name);
        }
        catch (err) {
            console.error('[dojo-kanban-board] Error al renombrar columna:', err);
        }
    }
    async _handleDelete(e) {
        const { columnId, action, targetColumnId } = e.detail;
        try {
            const tasks = this._tasksByColumn.get(columnId) ?? [];
            if (action === 'move' && targetColumnId) {
                // Mover todas las tareas a la columna destino
                const targetTasks = this._tasksByColumn.get(targetColumnId) ?? [];
                const startOrder = targetTasks.length;
                await Promise.all(tasks.map((t, i) => updateTask(t.id, { statusId: targetColumnId, order: startOrder + i })));
                // Actualizar cache
                this._tasksByColumn.set(targetColumnId, [
                    ...targetTasks,
                    ...tasks.map((t, i) => ({ ...t, statusId: targetColumnId, order: startOrder + i })),
                ]);
            }
            else {
                // Eliminar todas las tareas de la columna
                await Promise.all(tasks.map(t => deleteTask(t.id)));
                // US-20: limpiar historial de actividad de todas las tareas eliminadas
                tasks.forEach(t => deleteActivitiesByTaskId(t.id));
            }
            await deleteColumn(columnId);
            this._columns = this._columns.filter(c => c.id !== columnId);
            this._tasksByColumn.delete(columnId);
            this._renderColumns(this._columns);
        }
        catch (err) {
            console.error('[dojo-kanban-board] Error al eliminar columna:', err);
        }
    }
    async _handleReorder(e) {
        const { sourceId, targetId } = e.detail;
        const srcIdx = this._columns.findIndex(c => c.id === sourceId);
        const tgtIdx = this._columns.findIndex(c => c.id === targetId);
        if (srcIdx === -1 || tgtIdx === -1)
            return;
        // Reordenar en memoria
        const moved = this._columns.splice(srcIdx, 1)[0];
        this._columns.splice(tgtIdx, 0, moved);
        // Persistir nuevos values de `order`
        try {
            await Promise.all(this._columns.map((col, idx) => updateColumn(col.id, { order: idx })));
            this._columns = this._columns.map((col, idx) => ({ ...col, order: idx }));
            this._renderColumns(this._columns);
        }
        catch (err) {
            console.error('[dojo-kanban-board] Error al reordenar columnas:', err);
            // Recargar desde IndexedDB para mantener consistencia
            await this._loadBoard();
        }
    }
    // ── Handlers de creación de tarea (US-04) ─────────────────────────
    _onAddTaskRequest(e) {
        const { columnId } = e.detail;
        const col = this._columns.find(c => c.id === columnId);
        if (!col)
            return;
        const taskDialog = this._getTaskDialog();
        if (taskDialog?.openCreate)
            taskDialog.openCreate(col.id, col.name);
    }
    async _handleCreateTask(e) {
        const { statusId, title, description, priority, dueDate, labelIds, projectId } = e.detail;
        // Validar que la columna exista (puede haberse eliminado mientras el diálogo estaba abierto)
        if (!this._columns.some(c => c.id === statusId)) {
            console.warn('[dojo-kanban-board] statusId no corresponde a ninguna columna activa:', statusId);
            return;
        }
        const tasks = this._tasksByColumn.get(statusId) ?? [];
        try {
            // US-26: resolver proyecto y obtener taskNumber
            let resolvedProjectId = projectId || '';
            let taskNumber = '';
            if (resolvedProjectId) {
                taskNumber = await getNextTaskNumber(resolvedProjectId);
            }
            else {
                // Asignar al proyecto General si no se especificó proyecto
                const general = await getProjectByPrefix('GEN');
                if (!general) {
                    throw new Error('No se encontró el proyecto "General" (GEN). Ejecute seedDefaultProject().');
                }
                resolvedProjectId = general.id;
                taskNumber = await getNextTaskNumber(general.id);
            }
            const newTask = await createTask({
                title,
                description,
                statusId,
                boardId: this._boardId,
                projectId: resolvedProjectId,
                taskNumber,
                priority: priority,
                labelIds: labelIds ?? [],
                assignees: [], // Sin personas asignadas inicialmente (US-29)
                order: tasks.length,
                dueDate: dueDate ?? null,
            });
            // US-20: registrar evento de creación
            addActivityEvent({ taskId: newTask.id, type: 'created', payload: {} });
            this._tasksByColumn.set(statusId, [...tasks, newTask]);
            this._refreshColumnCards(statusId);
            this._updateColumnCounts();
        }
        catch (err) {
            console.error('[dojo-kanban-board] Error al crear tarea:', err);
        }
    }
    // ── Handlers de edición de tarea (US-05) ──────────────────────────────────
    async _onTaskOpen(e) {
        const { taskId } = e.detail;
        // Buscar la tarea en el caché (ruta rápida — evita hit a IndexedDB)
        let task;
        for (const tasks of this._tasksByColumn.values()) {
            task = tasks.find(t => t.id === taskId);
            if (task)
                break;
        }
        if (!task)
            return;
        try {
            const labels = await getAllLabels();
            const detail = this._getTaskDetail();
            if (detail?.openTask)
                detail.openTask(task, this._columns, labels);
        }
        catch (err) {
            console.error('[dojo-kanban-board] Error al abrir detalle de tarea:', err);
        }
    }
    async _handleTaskFieldUpdated(e) {
        const { taskId, changes } = e.detail;
        // Localizar columna origen y tarea anterior desde el caché
        let sourceColumnId = null;
        let oldTask;
        for (const [colId, tasks] of this._tasksByColumn) {
            const found = tasks.find(t => t.id === taskId);
            if (found) {
                sourceColumnId = colId;
                oldTask = found;
                break;
            }
        }
        if (!sourceColumnId || !oldTask)
            return;
        // Guard: validar que el statusId destino existe (previene race condition — Fix #1)
        if (changes.statusId && !this._columns.some(c => c.id === changes.statusId)) {
            console.warn('[dojo-kanban-board] Intento de mover tarea a columna inexistente:', changes.statusId);
            return;
        }
        try {
            const updated = await updateTask(taskId, changes);
            const targetColumnId = updated.statusId;
            // US-20: registrar eventos de actividad según los campos que cambiaron
            if (changes.statusId && changes.statusId !== sourceColumnId) {
                const fromName = this._columns.find(c => c.id === sourceColumnId)?.name ?? sourceColumnId;
                const toName = this._columns.find(c => c.id === changes.statusId)?.name ?? changes.statusId;
                addActivityEvent({ taskId, type: 'status_change', payload: { from: fromName, to: toName } });
            }
            if (changes.priority !== undefined && changes.priority !== oldTask.priority) {
                addActivityEvent({ taskId, type: 'priority_change', payload: { from: oldTask.priority, to: changes.priority } });
            }
            if (changes.labelIds !== undefined) {
                const oldSet = new Set(oldTask.labelIds);
                const newSet = new Set(changes.labelIds);
                for (const id of changes.labelIds) {
                    if (!oldSet.has(id)) {
                        const lbl = this._labels.find(l => l.id === id);
                        addActivityEvent({ taskId, type: 'label_added', payload: { labelId: id, labelName: lbl?.name ?? id } });
                    }
                }
                for (const id of oldTask.labelIds) {
                    if (!newSet.has(id)) {
                        const lbl = this._labels.find(l => l.id === id);
                        addActivityEvent({ taskId, type: 'label_removed', payload: { labelId: id, labelName: lbl?.name ?? id } });
                    }
                }
            }
            if (changes.statusId && changes.statusId !== sourceColumnId) {
                // ── Cambio de columna (movimiento) ────────────────────────────────
                const sourceTasks = (this._tasksByColumn.get(sourceColumnId) ?? []).filter(t => t.id !== taskId);
                const targetTasks = this._tasksByColumn.get(targetColumnId) ?? [];
                this._tasksByColumn.set(sourceColumnId, sourceTasks.map((t, i) => ({ ...t, order: i })));
                this._tasksByColumn.set(targetColumnId, [...targetTasks, updated]);
                this._refreshColumnCards(sourceColumnId);
                this._refreshColumnCards(targetColumnId);
            }
            else {
                // ── Actualización en la misma columna ─────────────────────────────
                const tasks = this._tasksByColumn.get(sourceColumnId) ?? [];
                this._tasksByColumn.set(sourceColumnId, tasks.map(t => t.id === taskId ? updated : t));
                // Refresco de tarjeta en la misma columna:
                // Si hay filtro de prioridades activo y cambió la prioridad, refrescamos la columna
                // completa para que las tarjetas que ya no cumplan el filtro desaparezcan (US-08 S4).
                // En cualquier otro caso actualizamos solo los atributos para evitar re-render completo.
                if (changes.priority !== undefined && this._activeFilter.priorities?.length) {
                    this._refreshColumnCards(sourceColumnId);
                }
                else if (changes.labelIds !== undefined && this._activeFilter.labelIds?.length) {
                    // Etiquetas cambiaron y hay filtro activo — puede que la tarjeta deba desaparecer
                    this._refreshColumnCards(sourceColumnId);
                }
                else if (changes.title !== undefined || changes.priority !== undefined || changes.labelIds !== undefined || changes.assignees !== undefined || changes.dueDate !== undefined || changes.subtasks !== undefined) {
                    const colEl = this._shadow.querySelector(`dojo-kanban-column[column-id="${CSS.escape(sourceColumnId)}"]`);
                    if (colEl) {
                        const cardEl = colEl.querySelector(`dojo-task-card[task-id="${CSS.escape(taskId)}"]`);
                        if (cardEl) {
                            if (changes.title !== undefined)
                                cardEl.setAttribute('task-title', updated.title);
                            if (changes.priority !== undefined)
                                cardEl.setAttribute('task-priority', updated.priority);
                            if (changes.labelIds !== undefined)
                                cardEl.taskLabels = this._getTaskLabels(updated);
                            if (changes.assignees !== undefined)
                                cardEl.taskAssignees = this._getTaskAssignees(updated);
                            if (changes.dueDate !== undefined) {
                                if (updated.dueDate) {
                                    cardEl.setAttribute('task-due-date', updated.dueDate);
                                }
                                else {
                                    cardEl.removeAttribute('task-due-date');
                                }
                            }
                            if (changes.subtasks !== undefined) {
                                const subs = updated.subtasks ?? [];
                                cardEl.setSubtaskProgress(subs.filter(s => s.completed).length, subs.length);
                            }
                        }
                    }
                }
            }
            this._updateColumnCounts();
        }
        catch (err) {
            console.error('[dojo-kanban-board] Error al actualizar tarea:', err);
        }
    }
    // ── Handlers de eliminación de tarea (US-06) ─────────────────────────────
    _onTaskDeleteRequest(e) {
        const { taskId, taskTitle } = e.detail;
        // Guardar referencia al elemento disparador para devolver el foco al cerrar (Fix #3)
        const trigger = e.composedPath()
            .find((el) => el instanceof HTMLElement && typeof el.focus === 'function') ?? null;
        const dialog = this._getDeleteDialog();
        if (dialog?.show)
            dialog.show(taskId, taskTitle, trigger);
    }
    async _handleTaskDeleteConfirm(e) {
        const { taskId } = e.detail;
        // Localizar columna desde el caché
        let columnId = null;
        for (const [colId, tasks] of this._tasksByColumn) {
            if (tasks.some(t => t.id === taskId)) {
                columnId = colId;
                break;
            }
        }
        if (!columnId)
            return;
        try {
            await deleteTask(taskId);
            // US-20: limpiar historial de actividad de la tarea eliminada
            deleteActivitiesByTaskId(taskId);
            // Actualizar caché
            const remaining = (this._tasksByColumn.get(columnId) ?? []).filter(t => t.id !== taskId);
            this._tasksByColumn.set(columnId, remaining.map((t, i) => ({ ...t, order: i })));
            // Cerrar panel de detalle solo si estaba mostrando la tarea eliminada (Fix #1)
            const detail = this._getTaskDetail();
            if (detail?.currentTaskId === taskId && detail?.close)
                detail.close();
            // Refrescar columna + conteos
            this._refreshColumnCards(columnId);
            this._updateColumnCounts();
        }
        catch (err) {
            console.error('[dojo-kanban-board] Error al eliminar tarea:', err);
        }
    }
}
customElements.define(DojoKanbanBoard.TAG, DojoKanbanBoard);
