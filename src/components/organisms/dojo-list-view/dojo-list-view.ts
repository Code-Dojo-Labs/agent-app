/**
 * dojo-list-view — Organismo (US-33)
 *
 * Vista alternativa de lista/tabla para el tablero Kanban.
 * Muestra todas las tareas de todos los estados en una tabla sortable.
 *
 * ## Atributos observados
 * | Atributo   | Tipo   | Descripción                     |
 * |------------|--------|---------------------------------|
 * | board-id   | string | ID del tablero activo            |
 *
 * ## Columnas visibles
 * Título, Estado, Prioridad, Etiquetas, Asignado a, Vencimiento, Acciones
 * En móvil (< 768 px) se ocultan Etiquetas y Asignado a.
 *
 * ## Comportamiento
 * - Clic en cabecera ordena asc → desc → sin orden
 * - Estado y Prioridad son editables inline con <select>
 * - Clic en título abre dojo-task-detail
 * - Barra de filtros propia (búsqueda, prioridad, etiquetas)
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-primary, --dojo-radius, --dojo-radius-sm, --dojo-shadow
 */

import type { Task, Column, Label, Priority, Person } from '../../../types/models.js';
import { getColumnsByBoard } from '../../../db/column.repository.js';
import { getTasksByStatus, updateTask, deleteTask } from '../../../db/task.repository.js';
import { getAllLabels } from '../../../db/label.repository.js';
import { getAllPersons } from '../../../db/person.repository.js';
import { deleteActivitiesByTaskId } from '../../../db/activity.repository.js';
import { getDueStatus, formatRelativeDate } from '../../../utils/date.js';
import { pickTextColor } from '../../../utils/contrast.js';
import '../dojo-task-detail/dojo-task-detail.js';
import '../dojo-delete-confirm-dialog/dojo-delete-confirm-dialog.js';

// ── Tipos internos ─────────────────────────────────────────────────────────

type SortColumn = 'title' | 'status' | 'priority' | 'dueDate' | null;
type SortDir = 'asc' | 'desc';

interface ActiveFilter {
  priorities?: Priority[];
  labelIds?: string[];
  searchText?: string;
}

const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 4,
  high:   3,
  medium: 2,
  low:    1,
};

const PRIORITY_META: Record<Priority, { icon: string; label: string; cls: string }> = {
  urgent: { icon: '🔥', label: 'Urgente', cls: 'priority-urgent' },
  high:   { icon: '⬆️', label: 'Alta',    cls: 'priority-high'   },
  medium: { icon: '➡️', label: 'Media',   cls: 'priority-medium' },
  low:    { icon: '⬇️', label: 'Baja',    cls: 'priority-low'    },
};

// ── Clase ──────────────────────────────────────────────────────────────────

export class DojoListView extends HTMLElement {
  static readonly TAG = 'dojo-list-view';
  static get observedAttributes(): string[] { return ['board-id']; }

  private _shadow: ShadowRoot;
  private _boardId = '';

  // Datos cargados
  private _columns: Column[] = [];
  private _allTasks: Task[] = [];
  private _labels: Label[] = [];
  private _persons: Person[] = [];

  // Estado de filtros
  private _activeFilter: ActiveFilter = {};
  private _selectedPriorities: Set<Priority> = new Set();
  private _selectedLabelIds: Set<string> = new Set();
  private _filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Estado de ordenamiento
  private _sortColumn: SortColumn = null;
  private _sortDir: SortDir = 'asc';

  // Referencias UI de la barra de filtros
  private _filterToggleBtn: HTMLButtonElement | null = null;
  private _filterBarContent: HTMLElement | null = null;
  private _filterSearchInput: HTMLInputElement | null = null;
  private _filterClearAllBtn: HTMLButtonElement | null = null;
  private _filterLabelSection: HTMLElement | null = null;
  private _filterLabelChipsContainer: HTMLElement | null = null;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    // Guarda de idempotencia: evita re-render al mover el elemento en el DOM
    if (this._shadow.childElementCount > 0) {
      this._boardId = this.getAttribute('board-id') ?? '';
      if (this._boardId) this._loadData();
      return;
    }
    this._boardId = this.getAttribute('board-id') ?? '';
    this._render();
    if (this._boardId) this._loadData();
  }

  disconnectedCallback(): void {
    if (this._filterDebounceTimer !== null) {
      clearTimeout(this._filterDebounceTimer);
      this._filterDebounceTimer = null;
    }
  }

  attributeChangedCallback(name: string, _old: string | null, newVal: string | null): void {
    if (name === 'board-id' && newVal && newVal !== this._boardId) {
      this._boardId = newVal;
      if (this._shadow.childElementCount > 0) this._loadData();
    }
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  private async _loadData(): Promise<void> {
    this._showLoading();
    try {
      const [columns, labels, persons] = await Promise.all([
        getColumnsByBoard(this._boardId),
        getAllLabels(),
        getAllPersons(),
      ]);
      this._columns = columns;
      this._labels  = labels;
      this._persons = persons;

      // Cargar tareas de todas las columnas en paralelo
      const taskArrays = await Promise.all(columns.map(c => getTasksByStatus(c.id)));
      this._allTasks = taskArrays.flat();

      this._rebuildLabelFilterChips();
      this._renderTable();
    } catch (err) {
      this._showError(err instanceof Error ? err.message : 'Error al cargar la vista lista');
    }
  }

  /** Recarga los datos tras un cambio (edición/eliminación inline). */
  public async refresh(): Promise<void> {
    await this._loadData();
  }

  // ── Render principal ──────────────────────────────────────────────────────

  private _render(): void {
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
        color: var(--dojo-text-on-primary);
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
      .filter-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        flex: 1;
      }
      .filter-content.collapsed { display: none; }
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
      .filter-sep {
        width: 1px;
        height: 1rem;
        background: var(--dojo-border);
        flex-shrink: 0;
      }
      .filter-chips-group {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.375rem;
      }

      /* ── Área de la tabla ── */
      .list-container {
        flex: 1;
        overflow: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--dojo-border) transparent;
      }
      .list-container::-webkit-scrollbar       { width: 6px; height: 6px; }
      .list-container::-webkit-scrollbar-track { background: transparent; }
      .list-container::-webkit-scrollbar-thumb { background: var(--dojo-border); border-radius: 3px; }

      /* ── Tabla ── */
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
        color: var(--dojo-text-primary);
      }
      thead {
        position: sticky;
        top: 0;
        z-index: 2;
        background: var(--dojo-surface);
      }
      thead th {
        padding: 0.625rem 0.75rem;
        text-align: left;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--dojo-text-secondary);
        border-bottom: 1px solid var(--dojo-border);
        white-space: nowrap;
        user-select: none;
      }
      thead th.sortable {
        cursor: pointer;
      }
      thead th.sortable:hover {
        color: var(--dojo-text-primary);
        background: var(--dojo-bg);
      }
      thead th.sortable:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: -2px;
      }
      thead th .sort-icon {
        display: inline-block;
        margin-left: 0.25rem;
        opacity: 0.4;
        font-style: normal;
        font-size: 0.7rem;
      }
      thead th[aria-sort="ascending"] .sort-icon,
      thead th[aria-sort="descending"] .sort-icon {
        opacity: 1;
        color: var(--dojo-primary, #1D4ED8);
      }

      tbody tr {
        border-bottom: 1px solid var(--dojo-border);
        transition: background 0.1s;
      }
      tbody tr:hover {
        background: var(--dojo-bg);
      }
      tbody td {
        padding: 0.5rem 0.75rem;
        vertical-align: middle;
      }

      /* ── Celda: Título ── */
      .task-title-btn {
        background: none;
        border: none;
        color: var(--dojo-text-primary);
        font-size: 0.875rem;
        font-family: inherit;
        cursor: pointer;
        padding: 0;
        text-align: left;
        font-weight: 500;
        transition: color 0.14s;
        max-width: 260px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        display: block;
      }
      .task-title-btn:hover {
        color: var(--dojo-primary, #1D4ED8);
        text-decoration: underline;
      }
      .task-title-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
        border-radius: 2px;
      }
      .task-number {
        font-size: 0.7rem;
        color: var(--dojo-text-secondary);
        margin-top: 0.1rem;
      }

      /* ── Celda: Estado/Prioridad (select inline) ── */
      .inline-select {
        padding: 0.1875rem 0.375rem;
        font-size: 0.75rem;
        font-family: inherit;
        color: var(--dojo-text-primary);
        background: var(--dojo-bg);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        cursor: pointer;
        max-width: 140px;
        transition: border-color 0.14s;
      }
      .inline-select:focus {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        border-color: var(--dojo-primary, #1D4ED8);
      }

      /* ── Celda: Prioridad badge ── */
      .priority-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.1875rem 0.5rem;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .priority-urgent { background: var(--dojo-danger-bg); color: var(--dojo-danger); }
      .priority-high   { background: var(--dojo-warning-bg); color: var(--dojo-warning); }
      .priority-medium { background: var(--dojo-warning-bg); color: var(--dojo-warning); }
      .priority-low    { background: var(--dojo-success-bg); color: var(--dojo-success); }
      /* Compatibilidad modo oscuro via custom props */
      @media (prefers-color-scheme: dark) {
        .priority-urgent { background: color-mix(in srgb, var(--dojo-danger) 15%, transparent); color: var(--dojo-danger-light); }
        .priority-high   { background: color-mix(in srgb, var(--dojo-warning) 15%, transparent); color: var(--dojo-warning); }
        .priority-medium { background: color-mix(in srgb, var(--dojo-warning) 15%, transparent); color: var(--dojo-code-accent); }
        .priority-low    { background: color-mix(in srgb, var(--dojo-success) 15%, transparent); color: var(--dojo-success); }
      }

      /* ── Celda: Etiquetas ── */
      .label-chip {
        display: inline-block;
        padding: 0.125rem 0.5rem;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        margin: 0.0625rem;
        white-space: nowrap;
      }
      .labels-cell {
        display: flex;
        flex-wrap: wrap;
        gap: 0.125rem;
        min-width: 80px;
      }

      /* ── Celda: Asignados ── */
      .assignees-cell {
        display: flex;
        gap: 0.25rem;
        flex-wrap: wrap;
        min-width: 60px;
      }
      .assignee-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: var(--dojo-border);
        font-size: 0.8rem;
        border: 1px solid var(--dojo-surface);
        overflow: hidden;
      }

      /* ── Celda: Vencimiento ── */
      .due-none    { color: var(--dojo-text-secondary); font-size: 0.8rem; }
      .due-normal  { color: var(--dojo-text-secondary); font-size: 0.8rem; }
      .due-soon    { color: var(--dojo-warning); font-weight: 600; font-size: 0.8rem; }
      .due-overdue { color: var(--dojo-danger); font-weight: 600; font-size: 0.8rem; }

      /* ── Celda: Acciones ── */
      .delete-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--dojo-radius-sm, 4px);
        cursor: pointer;
        font-size: 0.875rem;
        color: var(--dojo-text-secondary);
        transition: background 0.14s, color 0.14s, border-color 0.14s;
        flex-shrink: 0;
      }
      .delete-btn:hover {
        background: var(--dojo-danger-bg);
        border-color: var(--dojo-danger-border);
        color: var(--dojo-danger);
      }
      .delete-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* ── Estado: vacío ── */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 3rem 1rem;
        color: var(--dojo-text-secondary);
        font-size: 0.9375rem;
        text-align: center;
      }
      .empty-icon { font-size: 2.5rem; }

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
        max-width: 360px;
        margin: 2rem auto;
        padding: 1.5rem;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius, 6px);
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }
      .error-icon  { font-size: 2rem; }
      .error-title { font-weight: 600; color: var(--dojo-text-primary); }
      .error-msg   { font-size: 0.875rem; color: var(--dojo-text-secondary); }
      .retry-btn {
        margin-top: 0.5rem;
        padding: 0.4rem 1rem;
        background: var(--dojo-primary, #1D4ED8);
        color: var(--dojo-text-on-primary);
        border: none;
        border-radius: var(--dojo-radius-sm, 4px);
        cursor: pointer;
        font-size: 0.875rem;
      }

      /* ── Responsive: ocultar columnas en móvil ── */
      @media (max-width: 768px) {
        .col-labels,
        .col-assignees {
          display: none;
        }
        .task-title-btn { max-width: 180px; }
      }

      /* ── Accesibilidad: contenido solo para lectores de pantalla ── */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `;
    this._shadow.appendChild(style);

    // Barra de filtros
    this._shadow.appendChild(this._buildFilterBar());

    // Contenedor principal (loading por defecto)
    this._showLoading();

    // Panel de edición de tarea (US-05)
    const taskDetail = document.createElement('dojo-task-detail');
    this._shadow.appendChild(taskDetail);

    // Diálogo de confirmación de eliminación (US-06)
    const deleteDialog = document.createElement('dojo-delete-confirm-dialog');
    this._shadow.appendChild(deleteDialog);

    // Región aria-live para anunciar cambios de tabla a lectores de pantalla (WCAG 2.1 SC 4.1.3)
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    this._shadow.appendChild(liveRegion);

    // Escuchar evento de campo actualizado (desde dojo-task-detail)
    this._shadow.addEventListener('dojo:task-field-updated', async (e: Event) => {
      const { taskId, changes } = (e as CustomEvent).detail as { taskId: string; changes: Partial<Task> };
      // Actualizar caché local
      const idx = this._allTasks.findIndex(t => t.id === taskId);
      if (idx !== -1) {
        this._allTasks[idx] = { ...this._allTasks[idx], ...changes };
        // Si el status cambió, recargar desde DB para tener el nuevo statusId correcto
        if (changes.statusId) await this._loadData();
        else this._renderTable();
      }
    });

    // Escuchar evento de confirmación de eliminación (desde dojo-delete-confirm-dialog)
    this._shadow.addEventListener('dojo:task-delete-confirm', async (e: Event) => {
      const { taskId } = (e as CustomEvent).detail as { taskId: string };
      try {
        await deleteActivitiesByTaskId(taskId);
        await deleteTask(taskId);
        this._allTasks = this._allTasks.filter(t => t.id !== taskId);
        this._renderTable();
      } catch (err) {
        console.error('[dojo-list-view] Error al eliminar tarea:', err);
      }
    });
  }

  // ── Barra de filtros ──────────────────────────────────────────────────────

  private _buildFilterBar(): HTMLElement {
    const FILTER_PRIORITIES: { value: Priority; icon: string; label: string }[] = [
      { value: 'low',    icon: '⬇️', label: 'Baja'    },
      { value: 'medium', icon: '➡️', label: 'Media'   },
      { value: 'high',   icon: '⬆️', label: 'Alta'    },
      { value: 'urgent', icon: '🔥', label: 'Urgente' },
    ];

    const bar = document.createElement('div');
    bar.className = 'filter-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Filtros de la vista lista');

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'filter-toggle-btn';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.textContent = 'Filtros';
    this._filterToggleBtn = toggleBtn;
    bar.appendChild(toggleBtn);

    const content = document.createElement('div');
    content.className = 'filter-content';
    this._filterBarContent = content;
    bar.appendChild(content);

    // Input de búsqueda
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'filter-search';
    searchInput.placeholder = 'Buscar…';
    searchInput.setAttribute('aria-label', 'Buscar tareas por título o descripción');
    this._filterSearchInput = searchInput;
    content.appendChild(searchInput);

    // Separador
    const sep1 = document.createElement('div');
    sep1.className = 'filter-sep';
    sep1.setAttribute('aria-hidden', 'true');
    content.appendChild(sep1);

    // Chips de prioridad
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
        } else {
          this._selectedPriorities.add(p.value);
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        }
        this._activeFilter = {
          ...this._activeFilter,
          priorities: this._selectedPriorities.size > 0 ? [...this._selectedPriorities] : undefined,
        };
        this._updateClearAllVisibility();
        this._renderTable();
      });
      content.appendChild(btn);
    }

    // Sección de etiquetas (dinámica)
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

    // Botón "Limpiar filtros"
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'filter-clear';
    clearAllBtn.type = 'button';
    clearAllBtn.textContent = '✕ Limpiar filtros';
    clearAllBtn.setAttribute('aria-label', 'Limpiar todos los filtros activos');
    clearAllBtn.style.display = 'none';
    this._filterClearAllBtn = clearAllBtn;
    clearAllBtn.addEventListener('click', () => this._clearAllFilters());
    content.appendChild(clearAllBtn);

    // Toggle colapsar/expandir
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = content.classList.contains('collapsed');
      content.classList.toggle('collapsed');
      toggleBtn.setAttribute('aria-expanded', String(isCollapsed));
      this._updateClearAllVisibility();
    });

    // Búsqueda con debounce 300 ms
    searchInput.addEventListener('input', () => {
      if (this._filterDebounceTimer !== null) clearTimeout(this._filterDebounceTimer);
      this._filterDebounceTimer = setTimeout(() => {
        this._filterDebounceTimer = null;
        const text = searchInput.value.trim();
        this._activeFilter = { ...this._activeFilter, searchText: text || undefined };
        this._updateClearAllVisibility();
        this._renderTable();
      }, 300);
    });

    return bar;
  }

  private _rebuildLabelFilterChips(): void {
    if (!this._filterLabelSection || !this._filterLabelChipsContainer) return;

    const existingIds = new Set(this._labels.map(l => l.id));
    for (const id of [...this._selectedLabelIds]) {
      if (!existingIds.has(id)) this._selectedLabelIds.delete(id);
    }

    this._filterLabelChipsContainer.innerHTML = '';

    if (this._labels.length === 0) {
      this._filterLabelSection.style.display = 'none';
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
      if (isActive) btn.classList.add('active');

      btn.addEventListener('click', () => {
        const active = this._selectedLabelIds.has(lbl.id);
        if (active) {
          this._selectedLabelIds.delete(lbl.id);
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        } else {
          this._selectedLabelIds.add(lbl.id);
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        }
        this._activeFilter = {
          ...this._activeFilter,
          labelIds: this._selectedLabelIds.size > 0 ? [...this._selectedLabelIds] : undefined,
        };
        this._updateClearAllVisibility();
        this._renderTable();
      });

      this._filterLabelChipsContainer.appendChild(btn);
    }

    this._updateClearAllVisibility();
  }

  private _updateClearAllVisibility(): void {
    if (!this._filterClearAllBtn || !this._filterToggleBtn) return;
    const hasActive =
      (this._activeFilter.priorities?.length ?? 0) > 0 ||
      (this._activeFilter.labelIds?.length ?? 0) > 0 ||
      !!(this._activeFilter.searchText);
    this._filterClearAllBtn.style.display = hasActive ? '' : 'none';
    this._filterToggleBtn.classList.toggle('has-active', hasActive);
  }

  private _clearAllFilters(): void {
    this._selectedPriorities.clear();
    this._selectedLabelIds.clear();
    if (this._filterDebounceTimer !== null) {
      clearTimeout(this._filterDebounceTimer);
      this._filterDebounceTimer = null;
    }
    if (this._filterSearchInput) this._filterSearchInput.value = '';
    if (this._filterBarContent) {
      this._filterBarContent.querySelectorAll<HTMLButtonElement>('[data-priority]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      this._filterBarContent.querySelectorAll<HTMLButtonElement>('[data-label-id]').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
    }
    this._activeFilter = {};
    this._updateClearAllVisibility();
    this._renderTable();
  }

  // ── Filtrado y ordenamiento ───────────────────────────────────────────────

  private _getFilteredSortedTasks(): Task[] {
    let tasks = [...this._allTasks];

    // Filtrar
    const { priorities, labelIds, searchText } = this._activeFilter;
    if (priorities && priorities.length > 0) {
      tasks = tasks.filter(t => priorities.includes(t.priority));
    }
    if (labelIds && labelIds.length > 0) {
      tasks = tasks.filter(t => labelIds.some(id => (t.labelIds ?? []).includes(id)));
    }
    if (searchText) {
      const lower = searchText.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(lower) ||
        (t.description ?? '').toLowerCase().includes(lower)
      );
    }

    // Ordenar
    if (this._sortColumn) {
      const dir = this._sortDir === 'asc' ? 1 : -1;
      tasks.sort((a, b) => {
        switch (this._sortColumn) {
          case 'title':
            return dir * a.title.localeCompare(b.title, 'es');
          case 'status': {
            const colA = this._columns.find(c => c.id === a.statusId)?.name ?? '';
            const colB = this._columns.find(c => c.id === b.statusId)?.name ?? '';
            return dir * colA.localeCompare(colB, 'es');
          }
          case 'priority':
            return dir * ((PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0));
          case 'dueDate': {
            const dA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const dB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return dir * (dA - dB);
          }
          default:
            return 0;
        }
      });
    }

    return tasks;
  }

  // ── Render de la tabla ────────────────────────────────────────────────────

  private _renderTable(): void {
    // Eliminar contenedor anterior
    const old = this._shadow.querySelector('.list-container');
    if (old) old.remove();

    const tasks = this._getFilteredSortedTasks();

    const container = document.createElement('div');
    container.className = 'list-container';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Lista de tareas');

    if (tasks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const icon = document.createElement('span');
      icon.className = 'empty-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '📋';
      const msg = document.createElement('p');
      msg.textContent = this._allTasks.length === 0
        ? 'No hay tareas en este tablero'
        : 'Ninguna tarea coincide con los filtros activos';
      empty.appendChild(icon);
      empty.appendChild(msg);
      container.appendChild(empty);
      this._insertMainContent(container);
      this._updateLiveRegion(0);
      return;
    }

    const table = document.createElement('table');
    table.setAttribute('aria-label', 'Tareas del tablero');

    // ── Cabecera ──────────────────────────────────────────────────────────
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');

    const headers: Array<{
      key: SortColumn;
      label: string;
      cls?: string;
    }> = [
      { key: 'title',    label: 'Título'     },
      { key: 'status',   label: 'Estado'     },
      { key: 'priority', label: 'Prioridad'  },
      { key: null,       label: 'Etiquetas',  cls: 'col-labels'    },
      { key: null,       label: 'Asignado a', cls: 'col-assignees' },
      { key: 'dueDate',  label: 'Vencimiento' },
      { key: null,       label: 'Acciones'    },
    ];

    for (const h of headers) {
      const th = document.createElement('th');
      if (h.cls) th.className = h.cls;
      if (h.key) {
        th.className = (h.cls ? h.cls + ' ' : '') + 'sortable';
        th.setAttribute('tabindex', '0');
        th.setAttribute('aria-sort', 'none');

        const sortIcon = document.createElement('i');
        sortIcon.className = 'sort-icon';
        sortIcon.setAttribute('aria-hidden', 'true');
        sortIcon.textContent = '↕';

        th.appendChild(document.createTextNode(h.label));
        th.appendChild(sortIcon);

        // Actualizar si es la columna de ordenamiento activa
        if (this._sortColumn === h.key) {
          th.setAttribute('aria-sort', this._sortDir === 'asc' ? 'ascending' : 'descending');
          sortIcon.textContent = this._sortDir === 'asc' ? '↑' : '↓';
        }

        const handleSort = (): void => {
          if (this._sortColumn !== h.key) {
            this._sortColumn = h.key;
            this._sortDir = 'asc';
          } else if (this._sortDir === 'asc') {
            this._sortDir = 'desc';
          } else {
            this._sortColumn = null;
          }
          this._renderTable();
        };
        th.addEventListener('click', handleSort);
        th.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSort();
          }
        });
      } else {
        th.textContent = h.label;
      }
      headRow.appendChild(th);
    }

    thead.appendChild(headRow);
    table.appendChild(thead);

    // ── Cuerpo ────────────────────────────────────────────────────────────
    const tbody = document.createElement('tbody');

    for (const task of tasks) {
      const tr = this._buildTaskRow(task);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    container.appendChild(table);
    this._insertMainContent(container);
    this._updateLiveRegion(tasks.length);
  }

  private _buildTaskRow(task: Task): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.setAttribute('data-task-id', task.id);

    // ── Columna: Título ────────────────────────────────────────────────────
    const tdTitle = document.createElement('td');
    const titleBtn = document.createElement('button');
    titleBtn.className = 'task-title-btn';
    titleBtn.type = 'button';
    titleBtn.setAttribute('aria-label', `Editar tarea: ${task.title}`);
    titleBtn.textContent = task.title;
    titleBtn.addEventListener('click', () => this._openTaskDetail(task));
    tdTitle.appendChild(titleBtn);
    if (task.taskNumber) {
      const numEl = document.createElement('div');
      numEl.className = 'task-number';
      numEl.textContent = task.taskNumber;
      tdTitle.appendChild(numEl);
    }
    tr.appendChild(tdTitle);

    // ── Columna: Estado (select inline) ───────────────────────────────────
    const tdStatus = document.createElement('td');
    const statusSelect = document.createElement('select');
    statusSelect.className = 'inline-select';
    statusSelect.setAttribute('aria-label', `Estado de la tarea: ${task.title}`);

    for (const col of this._columns) {
      const opt = document.createElement('option');
      opt.value = col.id;
      opt.textContent = `${col.icon} ${col.name}`;
      if (col.id === task.statusId) opt.selected = true;
      statusSelect.appendChild(opt);
    }

    statusSelect.addEventListener('change', async () => {
      const newStatusId = statusSelect.value;
      try {
        const updated = await updateTask(task.id, { statusId: newStatusId });
        const idx = this._allTasks.findIndex(t => t.id === task.id);
        if (idx !== -1) this._allTasks[idx] = updated;
      } catch (err) {
        console.error('[dojo-list-view] Error al actualizar estado:', err);
        statusSelect.value = task.statusId; // revertir
      }
    });

    tdStatus.appendChild(statusSelect);
    tr.appendChild(tdStatus);

    // ── Columna: Prioridad (badge + select inline) ─────────────────────────
    const tdPriority = document.createElement('td');
    const meta = PRIORITY_META[task.priority] ?? PRIORITY_META.low;

    const badge = document.createElement('div');
    badge.style.display = 'flex';
    badge.style.flexDirection = 'column';
    badge.style.gap = '0.25rem';

    const badgeInner = document.createElement('span');
    badgeInner.className = `priority-badge ${meta.cls}`;
    badgeInner.textContent = `${meta.icon} ${meta.label}`;
    badge.appendChild(badgeInner);

    const prioritySelect = document.createElement('select');
    prioritySelect.className = 'inline-select';
    prioritySelect.setAttribute('aria-label', `Prioridad de la tarea: ${task.title}`);

    const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
    for (const pVal of PRIORITIES) {
      const pm = PRIORITY_META[pVal];
      const opt = document.createElement('option');
      opt.value = pVal;
      opt.textContent = `${pm.icon} ${pm.label}`;
      if (pVal === task.priority) opt.selected = true;
      prioritySelect.appendChild(opt);
    }

    prioritySelect.addEventListener('change', async () => {
      const newPriority = prioritySelect.value as Priority;
      try {
        const updated = await updateTask(task.id, { priority: newPriority });
        const idx = this._allTasks.findIndex(t => t.id === task.id);
        if (idx !== -1) this._allTasks[idx] = updated;
        // Actualizar badge visual
        const newMeta = PRIORITY_META[newPriority];
        badgeInner.className = `priority-badge ${newMeta.cls}`;
        badgeInner.textContent = `${newMeta.icon} ${newMeta.label}`;
      } catch (err) {
        console.error('[dojo-list-view] Error al actualizar prioridad:', err);
        prioritySelect.value = task.priority; // revertir
      }
    });

    badge.appendChild(prioritySelect);
    tdPriority.appendChild(badge);
    tr.appendChild(tdPriority);

    // ── Columna: Etiquetas ─────────────────────────────────────────────────
    const tdLabels = document.createElement('td');
    tdLabels.className = 'col-labels';
    const labelsCell = document.createElement('div');
    labelsCell.className = 'labels-cell';

    for (const labelId of task.labelIds ?? []) {
      const lbl = this._labels.find(l => l.id === labelId);
      if (!lbl) continue;
      const chip = document.createElement('span');
      chip.className = 'label-chip';
      chip.textContent = lbl.name;
      chip.style.background = lbl.color ?? '#e5e7eb';
      chip.style.color = pickTextColor(lbl.color ?? '#e5e7eb');
      labelsCell.appendChild(chip);
    }

    if (labelsCell.childElementCount === 0) {
      labelsCell.textContent = '—';
    }
    tdLabels.appendChild(labelsCell);
    tr.appendChild(tdLabels);

    // ── Columna: Asignados ─────────────────────────────────────────────────
    const tdAssignees = document.createElement('td');
    tdAssignees.className = 'col-assignees';
    const assigneesCell = document.createElement('div');
    assigneesCell.className = 'assignees-cell';

    for (const personId of task.assignees ?? []) {
      const person = this._persons.find(p => p.id === personId);
      if (!person) continue;
      const avatar = document.createElement('span');
      avatar.className = 'assignee-avatar';
      avatar.setAttribute('title', person.name);
      avatar.setAttribute('aria-label', person.name);
      avatar.textContent = person.avatar ?? person.name.charAt(0).toUpperCase();
      assigneesCell.appendChild(avatar);
    }

    if (assigneesCell.childElementCount === 0) {
      assigneesCell.textContent = '—';
    }
    tdAssignees.appendChild(assigneesCell);
    tr.appendChild(tdAssignees);

    // ── Columna: Vencimiento ───────────────────────────────────────────────
    const tdDue = document.createElement('td');
    const dueStatus = getDueStatus(task.dueDate);
    const dueText   = formatRelativeDate(task.dueDate);

    const dueEl = document.createElement('span');
    dueEl.textContent = dueText || '—';
    switch (dueStatus) {
      case 'overdue':  dueEl.className = 'due-overdue'; break;
      case 'due-soon': dueEl.className = 'due-soon';    break;
      case 'normal':   dueEl.className = 'due-normal';  break;
      default:         dueEl.className = 'due-none';    break;
    }
    if (task.dueDate && dueStatus !== 'none') {
      dueEl.setAttribute('title', new Date(task.dueDate).toLocaleDateString('es'));
    }
    tdDue.appendChild(dueEl);
    tr.appendChild(tdDue);

    // ── Columna: Acciones ──────────────────────────────────────────────────
    const tdActions = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', `Eliminar tarea: ${task.title}`);
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', () => {
      const dialog = this._shadow.querySelector('dojo-delete-confirm-dialog') as any;
      if (dialog?.show) dialog.show(task.id, task.title);
    });
    tdActions.appendChild(deleteBtn);
    tr.appendChild(tdActions);

    return tr;
  }

  // ── Abrir panel de detalle ────────────────────────────────────────────────

  private _openTaskDetail(task: Task): void {
    const detail = this._shadow.querySelector('dojo-task-detail') as any;
    if (detail?.openTask) {
      detail.openTask(task, this._columns, this._labels, this._persons);
    }
  }

  // ── Helpers de layout ─────────────────────────────────────────────────────

  private _insertMainContent(el: HTMLElement): void {
    const current = this._shadow.querySelector('.list-container, .state-container, .error-box');
    if (current) current.replaceWith(el);
    else {
      // Insertar antes de dojo-task-detail
      const detail = this._shadow.querySelector('dojo-task-detail');
      if (detail) this._shadow.insertBefore(el, detail);
      else this._shadow.appendChild(el);
    }
  }

  /** Actualiza la región aria-live con el conteo de tareas visibles. */
  private _updateLiveRegion(count: number): void {
    const live = this._shadow.querySelector<HTMLElement>('.sr-only[aria-live]');
    if (!live) return;
    live.textContent = count === 0
      ? 'Sin resultados'
      : `Mostrando ${count} tarea${count !== 1 ? 's' : ''}`;
  }

  private _showLoading(): void {
    const container = document.createElement('div');
    container.className = 'state-container';
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.setAttribute('aria-hidden', 'true');
    const label = document.createElement('p');
    label.textContent = 'Cargando vista lista…';
    container.appendChild(spinner);
    container.appendChild(label);
    this._insertMainContent(container);
  }

  private _showError(message: string): void {
    const box = document.createElement('div');
    box.className = 'error-box';
    box.setAttribute('role', 'alert');
    const icon = document.createElement('span');
    icon.className = 'error-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⚠️';
    const title = document.createElement('p');
    title.className = 'error-title';
    title.textContent = 'Error al cargar la lista';
    const msg = document.createElement('p');
    msg.className = 'error-msg';
    msg.textContent = message;
    const btn = document.createElement('button');
    btn.className = 'retry-btn';
    btn.type = 'button';
    btn.textContent = 'Reintentar';
    btn.addEventListener('click', () => this._loadData());
    box.appendChild(icon);
    box.appendChild(title);
    box.appendChild(msg);
    box.appendChild(btn);
    this._insertMainContent(box);
  }

}


// ── Registro ──────────────────────────────────────────────────────────────

if (!customElements.get(DojoListView.TAG)) {
  customElements.define(DojoListView.TAG, DojoListView);
}
