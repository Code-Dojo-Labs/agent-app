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

import type { Column, Task, Label, Priority } from '../../../types/models.js';
import { getAllColumns, createColumn, updateColumn, deleteColumn } from '../../../db/column.repository.js';
import { getTasksByStatus, createTask, updateTask, deleteTask, reorderTasks } from '../../../db/task.repository.js';
import { getAllLabels } from '../../../db/label.repository.js';
import '../../molecules/dojo-kanban-column/dojo-kanban-column.js';
import '../../atoms/dojo-task-card/dojo-task-card.js';
import '../../atoms/dojo-add-column-button/dojo-add-column-button.js';
import '../../organisms/dojo-column-dialog/dojo-column-dialog.js';
import '../../organisms/dojo-task-dialog/dojo-task-dialog.js';
import '../../organisms/dojo-task-detail/dojo-task-detail.js';
import '../../organisms/dojo-delete-confirm-dialog/dojo-delete-confirm-dialog.js';

// ── Tipos internos ─────────────────────────────────────────────────────────

interface ActiveFilter {
  priorities?: Priority[];
  labelIds?: string[];
}

/** Contrato de la propiedad taskLabels expuesta por dojo-task-card (US-10). */
interface TaskCardElement extends HTMLElement {
  taskLabels: Label[];
}

// ── Clase ──────────────────────────────────────────────────────────────────

export class DojoKanbanBoard extends HTMLElement {
  static readonly TAG = 'dojo-kanban-board';

  private _shadow: ShadowRoot;
  private _activeFilter: ActiveFilter = {};
  /** columnId → lista de todas las tareas de esa columna (sin filtrar) */
  private _tasksByColumn: Map<string, Task[]> = new Map();
  /** Lista ordenada de columnas actualmente cargadas */
  private _columns: Column[] = [];
  /** Lista completa de etiquetas (US-10) */
  private _labels: Label[] = [];

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
    this._loadBoard();
  }

  // ── API pública ──────────────────────────────────────────────────────────

  get activeFilter(): ActiveFilter { return this._activeFilter; }

  /**
   * Aplica un filtro al tablero. Actualiza los conteos de todas las columnas
   * en tiempo real sin necesidad de recargar desde IndexedDB.
   */
  set activeFilter(filter: ActiveFilter) {
    this._activeFilter = filter;
    this._columns.forEach(col => this._refreshColumnCards(col.id));
    this._updateColumnCounts();
  }

  /**
   * Actualiza una etiqueta en el caché local y refresca los chips de todas las
   * tarjetas visibles que la tienen asignada. Llamado por dojo-app tras recibir
   * el evento `dojo:label-updated` desde dojo-label-manager (US-11).
   */
  refreshLabel(updatedLabel: Label): void {
    this._labels = this._labels.map(l => l.id === updatedLabel.id ? updatedLabel : l);
    for (const [columnId, tasks] of this._tasksByColumn) {
      for (const task of tasks) {
        if ((task.labelIds ?? []).includes(updatedLabel.id)) {
          const colEl = this._shadow.querySelector(
            `dojo-kanban-column[column-id="${CSS.escape(columnId)}"]`
          );
          if (colEl) {
            const cardEl = colEl.querySelector(`dojo-task-card[task-id="${CSS.escape(task.id)}"]`);
            if (cardEl) (cardEl as any).taskLabels = this._getTaskLabels(task);
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
  removeLabel(deletedLabelId: string): void {
    this._labels = this._labels.filter(l => l.id !== deletedLabelId);
    for (const [columnId, tasks] of this._tasksByColumn) {
      for (const task of tasks) {
        if ((task.labelIds ?? []).includes(deletedLabelId)) {
          // Actualizar el caché local de tareas
          task.labelIds = task.labelIds.filter(lid => lid !== deletedLabelId);
          const colEl = this._shadow.querySelector(
            `dojo-kanban-column[column-id="${CSS.escape(columnId)}"]`
          );
          if (colEl) {
            const cardEl = colEl.querySelector(`dojo-task-card[task-id="${CSS.escape(task.id)}"]`);
            if (cardEl) (cardEl as any).taskLabels = this._getTaskLabels(task);
          }
        }
      }
    }
  }

  // ── Render inicial (estructura vacía con loading) ─────────────────────────

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
      }
      .filter-clear:hover { color: var(--dojo-text-primary); }
    `;
    this._shadow.appendChild(style);

    // Barra de filtros de prioridad (US-08)
    this._shadow.appendChild(this._buildFilterBar());

    // Área principal — empieza en estado loading
    this._showLoading();

    // Diálogo de gestión de columnas (montado una sola vez)
    const dialog = document.createElement('dojo-column-dialog');
    this._shadow.appendChild(dialog);
    this._shadow.addEventListener('dojo:dialog-create-column', (e) => this._handleCreate(e as CustomEvent));
    this._shadow.addEventListener('dojo:dialog-rename-column', (e) => this._handleRename(e as CustomEvent));
    this._shadow.addEventListener('dojo:dialog-delete-column', (e) => this._handleDelete(e as CustomEvent));
    this._shadow.addEventListener('dojo:column-rename',        (e) => this._onColumnRenameRequest(e as CustomEvent));
    this._shadow.addEventListener('dojo:column-delete',        (e) => this._onColumnDeleteRequest(e as CustomEvent));
    this._shadow.addEventListener('dojo:column-reorder',       (e) => this._handleReorder(e as CustomEvent));
    this._shadow.addEventListener('dojo:add-column',           () => this._onAddColumnRequest());
    // US-03: Drag & Drop de tareas
    this._shadow.addEventListener('dojo:column-drop',          (e) => this._handleTaskDrop(e as CustomEvent));
    // US-04: Crear tarea
    const taskDialog = document.createElement('dojo-task-dialog');
    this._shadow.appendChild(taskDialog);
    this._shadow.addEventListener('dojo:add-task',             (e) => this._onAddTaskRequest(e as CustomEvent));
    this._shadow.addEventListener('dojo:dialog-create-task',   (e) => this._handleCreateTask(e as CustomEvent));
    // US-05: Editar tarea
    const taskDetail = document.createElement('dojo-task-detail');
    this._shadow.appendChild(taskDetail);
    this._shadow.addEventListener('dojo:task-open',            (e) => this._onTaskOpen(e as CustomEvent));
    this._shadow.addEventListener('dojo:task-field-updated',   (e) => this._handleTaskFieldUpdated(e as CustomEvent));
    // US-06: Eliminar tarea
    const deleteDialog = document.createElement('dojo-delete-confirm-dialog');
    this._shadow.appendChild(deleteDialog);
    this._shadow.addEventListener('dojo:task-delete-request',  (e) => this._onTaskDeleteRequest(e as CustomEvent));
    this._shadow.addEventListener('dojo:task-delete-confirm',  (e) => this._handleTaskDeleteConfirm(e as CustomEvent));
    // US-10: sincronizar etiquetas nuevas creadas desde el panel de detalle
    this._shadow.addEventListener('dojo:label-created',        (e) => this._handleLabelCreated(e as CustomEvent));
  }

  // ── Barra de filtros (US-08) ─────────────────────────────────────────────

  private _buildFilterBar(): HTMLElement {
    const FILTER_PRIORITIES: { value: Priority; icon: string; label: string }[] = [
      { value: 'low',    icon: '⬇️', label: 'Baja'    },
      { value: 'medium', icon: '➡️', label: 'Media'   },
      { value: 'high',   icon: '⬆️', label: 'Alta'    },
      { value: 'urgent', icon: '🔥', label: 'Urgente' },
    ];

    const bar = document.createElement('div');
    bar.className = 'filter-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', 'Filtrar por prioridad');

    const lbl = document.createElement('span');
    lbl.className = 'filter-label';
    lbl.textContent = 'Prioridad:';
    bar.appendChild(lbl);

    const selectedPriorities = new Set<Priority>();

    const clearBtn = document.createElement('button');
    clearBtn.className = 'filter-clear';
    clearBtn.type = 'button';
    clearBtn.textContent = '✕ Limpiar';
    clearBtn.setAttribute('aria-label', 'Limpiar filtros de prioridad');
    clearBtn.style.display = 'none';

    for (const p of FILTER_PRIORITIES) {
      const btn = document.createElement('button');
      btn.className = 'filter-chip';
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('data-priority', p.value);
      btn.textContent = `${p.icon} ${p.label}`;
      btn.addEventListener('click', () => {
        const isActive = selectedPriorities.has(p.value);
        if (isActive) {
          selectedPriorities.delete(p.value);
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        } else {
          selectedPriorities.add(p.value);
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        }
        clearBtn.style.display = selectedPriorities.size > 0 ? '' : 'none';
        const newPriorities = selectedPriorities.size > 0
          ? (Array.from(selectedPriorities) as Priority[])
          : undefined;
        this.activeFilter = { ...this._activeFilter, priorities: newPriorities };
      });
      bar.appendChild(btn);
    }

    clearBtn.addEventListener('click', () => {
      selectedPriorities.clear();
      bar.querySelectorAll<HTMLButtonElement>('.filter-chip').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      clearBtn.style.display = 'none';
      this.activeFilter = { ...this._activeFilter, priorities: undefined };
    });
    bar.appendChild(clearBtn);

    return bar;
  }

  // ── Estados visuales ─────────────────────────────────────────────────────

  private _showLoading(): void {
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

  private _showError(message: string): void {
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

  private _setMainContent(node: HTMLElement): void {
    const existing = this._shadow.querySelector('.board-track, .state-container, .error-box');
    if (existing) existing.remove();
    this._shadow.appendChild(node);
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  private async _loadBoard(): Promise<void> {
    this._showLoading();
    // Limpiar datos previos para evitar entradas stale ante reintentos o cambios de columnas
    this._tasksByColumn.clear();

    try {
      const [columns, labels] = await Promise.all([
        getAllColumns(),
        getAllLabels(),
      ]);
      this._labels = labels;

      // Cargar tareas de todas las columnas en paralelo
      const taskResults = await Promise.all(
        columns.map(col => getTasksByStatus(col.id))
      );
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      this._showError(message);
    }
  }

  // ── Renderizado de columnas ───────────────────────────────────────────────

  private _renderColumns(columns: Column[]): void {
    const track = document.createElement('div');
    track.className = 'board-track';
    track.setAttribute('role', 'region');
    track.setAttribute('aria-label', 'Tablero Kanban');

    for (const col of columns) {
      const { visible, total } = this._getColumnCounts(col.id);

      const colEl = document.createElement('dojo-kanban-column') as HTMLElement;
      colEl.setAttribute('column-id', col.id);
      colEl.setAttribute('column-name', col.name);
      colEl.setAttribute('icon', col.icon);
      colEl.setAttribute('count', String(visible));
      colEl.setAttribute('total-count', String(total));
      if (col.color) colEl.setAttribute('accent-color', col.color);

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
  private _renderTaskCards(colEl: Element, tasks: Task[]): void {
    const sorted   = [...tasks].sort((a, b) => a.order - b.order);
    const filtered = this._filterTasks(sorted);
    for (const task of filtered) {
      const card = document.createElement('dojo-task-card');
      card.setAttribute('task-id',       task.id);
      card.setAttribute('task-title',    task.title);
      card.setAttribute('task-priority', task.priority);
      (card as TaskCardElement).taskLabels = this._getTaskLabels(task);
      colEl.appendChild(card);
    }
  }

  /**
   * Reemplaza las tarjetas de una columna ya renderizada sin recrear el elemento columna.
   */
  private _refreshColumnCards(columnId: string): void {
    const colEl = this._shadow.querySelector(
      `dojo-kanban-column[column-id="${CSS.escape(columnId)}"]`
    );
    if (!colEl) return;
    colEl.querySelectorAll('dojo-task-card').forEach(el => el.remove());
    const tasks = this._tasksByColumn.get(columnId) ?? [];
    this._renderTaskCards(colEl, tasks);
  }

  // ── Conteo con filtros ──────────────────────────────────────────────────────────────────────────

  private _getColumnCounts(columnId: string): { visible: number; total: number } {
    const tasks = this._tasksByColumn.get(columnId) ?? [];
    const total = tasks.length;
    const visible = this._filterTasks(tasks).length;
    return { visible, total };
  }

  /** Resuelve los objetos Label para una tarea a partir del caché local (US-10). */
  private _getTaskLabels(task: Task): Label[] {
    return (task.labelIds ?? [])
      .map(id => this._labels.find(l => l.id === id))
      .filter((l): l is Label => l !== undefined);
  }

  /** Añade una etiqueta recién creada al caché local para que los chips se muestren sin recargar (US-10). */
  private _handleLabelCreated(e: CustomEvent): void {
    const { label } = e.detail as { label: Label };
    if (!this._labels.find(l => l.id === label.id)) {
      this._labels = [...this._labels, label].sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      );
    }
  }

  private _filterTasks(tasks: Task[]): Task[] {
    const { priorities, labelIds } = this._activeFilter;
    return tasks.filter(task => {
      if (priorities && priorities.length > 0 && !priorities.includes(task.priority)) return false;
      if (labelIds && labelIds.length > 0) {
        const taskLabelIds = task.labelIds ?? [];
        const hasLabel = labelIds.some(id => taskLabelIds.includes(id));
        if (!hasLabel) return false;
      }
      return true;
    });
  }

  /** Actualiza los conteos en las columnas ya renderizadas sin re-renderizar. */
  private _updateColumnCounts(): void {
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
  private async _handleTaskDrop(e: CustomEvent): Promise<void> {
    const { columnId: targetColumnId, taskId, beforeTaskId } = e.detail as {
      columnId:     string;
      taskId:       string;
      beforeTaskId: string | null;
    };

    // Localizar la columna origen desde el caché
    let sourceColumnId: string | null = null;
    for (const [colId, tasks] of this._tasksByColumn) {
      if (tasks.some(t => t.id === taskId)) {
        sourceColumnId = colId;
        break;
      }
    }
    if (!sourceColumnId) return;

    try {
      if (sourceColumnId === targetColumnId) {
        // ── Reordenamiento dentro de la misma columna ─────────────────────
        const tasks      = this._tasksByColumn.get(targetColumnId) ?? [];
        const orderedIds = this._computeReorderedIds(tasks, taskId, beforeTaskId);
        await reorderTasks(targetColumnId, orderedIds);
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        this._tasksByColumn.set(
          targetColumnId,
          orderedIds.map((id, order) => ({ ...taskMap.get(id)!, order })),
        );
      } else {
        // ── Movimiento entre columnas ──────────────────────────────────────
        const sourceTasks = this._tasksByColumn.get(sourceColumnId) ?? [];
        const targetTasks = this._tasksByColumn.get(targetColumnId) ?? [];
        const movedTask   = sourceTasks.find(t => t.id === taskId);
        if (!movedTask) return;

        const newTargetTasks = this._insertAtPosition(
          [...targetTasks],
          { ...movedTask, statusId: targetColumnId },
          beforeTaskId,
        );
        const newSourceTasks = sourceTasks.filter(t => t.id !== taskId);

        await updateTask(taskId, { statusId: targetColumnId });
        await reorderTasks(targetColumnId, newTargetTasks.map(t => t.id));
        if (newSourceTasks.length > 0) {
          await reorderTasks(sourceColumnId, newSourceTasks.map(t => t.id));
        }

        this._tasksByColumn.set(
          sourceColumnId,
          newSourceTasks.map((t, i) => ({ ...t, order: i })),
        );
        this._tasksByColumn.set(
          targetColumnId,
          newTargetTasks.map((t, i) => ({ ...t, order: i, statusId: targetColumnId })),
        );

        this._refreshColumnCards(sourceColumnId);
      }

      this._refreshColumnCards(targetColumnId);
      this._updateColumnCounts();
    } catch (err) {
      console.error('[dojo-kanban-board] Error al procesar drop de tarea:', err);
    }
  }

  /**
   * Calcula el array de IDs resultante al mover `movingId` antes de `beforeId`.
   * Si `beforeId` es null, la tarea se añade al final.
   */
  private _computeReorderedIds(
    tasks:    Task[],
    movingId: string,
    beforeId: string | null,
  ): string[] {
    const others = tasks.filter(t => t.id !== movingId);
    if (beforeId === null) return [...others.map(t => t.id), movingId];
    const idx = others.findIndex(t => t.id === beforeId);
    if (idx === -1)        return [...others.map(t => t.id), movingId];
    const result = others.map(t => t.id);
    result.splice(idx, 0, movingId);
    return result;
  }

  /**
   * Inserta `task` en `tasks` antes del elemento con id `beforeId`.
   * Si `beforeId` es null o no existe, inserta al final.
   */
  private _insertAtPosition(tasks: Task[], task: Task, beforeId: string | null): Task[] {
    if (beforeId === null) return [...tasks, task];
    const idx = tasks.findIndex(t => t.id === beforeId);
    if (idx === -1)        return [...tasks, task];
    const result = [...tasks];
    result.splice(idx, 0, task);
    return result;
  }

  // ── Handlers de gestión de columnas ────────────────────────────────────────

  private _getDialog(): HTMLElement | null {
    return this._shadow.querySelector('dojo-column-dialog');
  }
  private _getTaskDialog(): HTMLElement | null {
    return this._shadow.querySelector('dojo-task-dialog');
  }

  private _getTaskDetail(): HTMLElement | null {
    return this._shadow.querySelector('dojo-task-detail');
  }

  private _getDeleteDialog(): HTMLElement | null {
    return this._shadow.querySelector('dojo-delete-confirm-dialog');
  }
  private _onAddColumnRequest(): void {
    const dialog = this._getDialog() as any;
    if (dialog?.openCreate) dialog.openCreate();
  }

  private _onColumnRenameRequest(e: CustomEvent): void {
    const { columnId } = e.detail as { columnId: string };
    const col = this._columns.find(c => c.id === columnId);
    if (!col) return;
    const dialog = this._getDialog() as any;
    if (dialog?.openRename) dialog.openRename(col.id, col.name);
  }

  private _onColumnDeleteRequest(e: CustomEvent): void {
    const { columnId } = e.detail as { columnId: string };
    const col = this._columns.find(c => c.id === columnId);
    if (!col) return;
    const otherColumns = this._columns.filter(c => c.id !== columnId);
    const dialog = this._getDialog() as any;
    if (dialog?.openDelete) dialog.openDelete(col.id, col.name, otherColumns);
  }

  private async _handleCreate(e: CustomEvent): Promise<void> {
    const { name, icon } = e.detail as { name: string; icon: string };
    const nextOrder = this._columns.length > 0
      ? Math.max(...this._columns.map(c => c.order)) + 1
      : 0;
    try {
      const newCol = await createColumn({ name, icon, order: nextOrder });
      this._columns.push(newCol);
      this._tasksByColumn.set(newCol.id, []);
      this._renderColumns(this._columns);
    } catch (err) {
      console.error('[dojo-kanban-board] Error al crear columna:', err);
    }
  }

  private async _handleRename(e: CustomEvent): Promise<void> {
    const { columnId, name } = e.detail as { columnId: string; name: string };
    try {
      const updated = await updateColumn(columnId, { name });
      const idx = this._columns.findIndex(c => c.id === columnId);
      if (idx !== -1) this._columns[idx] = updated;
      // Actualizar solo el atributo del elemento del DOM
      const colEl = this._shadow.querySelector(`dojo-kanban-column[column-id="${columnId}"]`);
      if (colEl) colEl.setAttribute('column-name', name);
    } catch (err) {
      console.error('[dojo-kanban-board] Error al renombrar columna:', err);
    }
  }

  private async _handleDelete(e: CustomEvent): Promise<void> {
    const { columnId, action, targetColumnId } = e.detail as {
      columnId: string;
      action: 'move' | 'delete';
      targetColumnId?: string;
    };
    try {
      const tasks = this._tasksByColumn.get(columnId) ?? [];

      if (action === 'move' && targetColumnId) {
        // Mover todas las tareas a la columna destino
        const targetTasks = this._tasksByColumn.get(targetColumnId) ?? [];
        const startOrder  = targetTasks.length;
        await Promise.all(
          tasks.map((t, i) => updateTask(t.id, { statusId: targetColumnId, order: startOrder + i }))
        );
        // Actualizar cache
        this._tasksByColumn.set(targetColumnId, [
          ...targetTasks,
          ...tasks.map((t, i) => ({ ...t, statusId: targetColumnId, order: startOrder + i })),
        ]);
      } else {
        // Eliminar todas las tareas de la columna
        await Promise.all(tasks.map(t => deleteTask(t.id)));
      }

      await deleteColumn(columnId);
      this._columns = this._columns.filter(c => c.id !== columnId);
      this._tasksByColumn.delete(columnId);
      this._renderColumns(this._columns);
    } catch (err) {
      console.error('[dojo-kanban-board] Error al eliminar columna:', err);
    }
  }

  private async _handleReorder(e: CustomEvent): Promise<void> {
    const { sourceId, targetId } = e.detail as { sourceId: string; targetId: string };
    const srcIdx = this._columns.findIndex(c => c.id === sourceId);
    const tgtIdx = this._columns.findIndex(c => c.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;

    // Reordenar en memoria
    const moved = this._columns.splice(srcIdx, 1)[0];
    this._columns.splice(tgtIdx, 0, moved);

    // Persistir nuevos values de `order`
    try {
      await Promise.all(
        this._columns.map((col, idx) => updateColumn(col.id, { order: idx }))
      );
      this._columns = this._columns.map((col, idx) => ({ ...col, order: idx }));
      this._renderColumns(this._columns);
    } catch (err) {
      console.error('[dojo-kanban-board] Error al reordenar columnas:', err);
      // Recargar desde IndexedDB para mantener consistencia
      await this._loadBoard();
    }
  }

  // ── Handlers de creación de tarea (US-04) ─────────────────────────

  private _onAddTaskRequest(e: CustomEvent): void {
    const { columnId } = e.detail as { columnId: string };
    const col = this._columns.find(c => c.id === columnId);
    if (!col) return;
    const taskDialog = this._getTaskDialog() as any;
    if (taskDialog?.openCreate) taskDialog.openCreate(col.id, col.name);
  }

  private async _handleCreateTask(e: CustomEvent): Promise<void> {
    const { statusId, title, description, priority } = e.detail as {
      statusId:    string;
      title:       string;
      description: string;
      priority:    string;
    };
    // Validar que la columna exista (puede haberse eliminado mientras el diálogo estaba abierto)
    if (!this._columns.some(c => c.id === statusId)) {
      console.warn('[dojo-kanban-board] statusId no corresponde a ninguna columna activa:', statusId);
      return;
    }
    const tasks = this._tasksByColumn.get(statusId) ?? [];
    try {
      const newTask = await createTask({
        title,
        description,
        statusId,
        priority:  priority as Task['priority'],
        labelIds:  [],
        order:     tasks.length,
      });
      this._tasksByColumn.set(statusId, [...tasks, newTask]);
      this._refreshColumnCards(statusId);
      this._updateColumnCounts();
    } catch (err) {
      console.error('[dojo-kanban-board] Error al crear tarea:', err);
    }
  }

  // ── Handlers de edición de tarea (US-05) ──────────────────────────────────

  private async _onTaskOpen(e: CustomEvent): Promise<void> {
    const { taskId } = e.detail as { taskId: string };
    // Buscar la tarea en el caché (ruta rápida — evita hit a IndexedDB)
    let task: Task | undefined;
    for (const tasks of this._tasksByColumn.values()) {
      task = tasks.find(t => t.id === taskId);
      if (task) break;
    }
    if (!task) return;
    try {
      const labels = await getAllLabels();
      const detail = this._getTaskDetail() as any;
      if (detail?.openTask) detail.openTask(task, this._columns, labels);
    } catch (err) {
      console.error('[dojo-kanban-board] Error al abrir detalle de tarea:', err);
    }
  }

  private async _handleTaskFieldUpdated(e: CustomEvent): Promise<void> {
    const { taskId, changes } = e.detail as {
      taskId:  string;
      changes: Partial<Task>;
    };

    // Localizar columna origen desde el caché
    let sourceColumnId: string | null = null;
    for (const [colId, tasks] of this._tasksByColumn) {
      if (tasks.some(t => t.id === taskId)) { sourceColumnId = colId; break; }
    }
    if (!sourceColumnId) return;

    // Guard: validar que el statusId destino existe (previene race condition — Fix #1)
    if (changes.statusId && !this._columns.some(c => c.id === changes.statusId)) {
      console.warn('[dojo-kanban-board] Intento de mover tarea a columna inexistente:', changes.statusId);
      return;
    }

    try {
      const updated = await updateTask(taskId, changes);
      const targetColumnId = updated.statusId;

      if (changes.statusId && changes.statusId !== sourceColumnId) {
        // ── Cambio de columna (movimiento) ────────────────────────────────
        const sourceTasks = (this._tasksByColumn.get(sourceColumnId) ?? []).filter(t => t.id !== taskId);
        const targetTasks = this._tasksByColumn.get(targetColumnId) ?? [];
        this._tasksByColumn.set(sourceColumnId, sourceTasks.map((t, i) => ({ ...t, order: i })));
        this._tasksByColumn.set(targetColumnId, [...targetTasks, updated]);
        this._refreshColumnCards(sourceColumnId);
        this._refreshColumnCards(targetColumnId);
      } else {
        // ── Actualización en la misma columna ─────────────────────────────
        const tasks = this._tasksByColumn.get(sourceColumnId) ?? [];
        this._tasksByColumn.set(
          sourceColumnId,
          tasks.map(t => t.id === taskId ? updated : t),
        );
        // Refresco de tarjeta en la misma columna:
        // Si hay filtro de prioridades activo y cambió la prioridad, refrescamos la columna
        // completa para que las tarjetas que ya no cumplan el filtro desaparezcan (US-08 S4).
        // En cualquier otro caso actualizamos solo los atributos para evitar re-render completo.
        if (changes.priority !== undefined && this._activeFilter.priorities?.length) {
          this._refreshColumnCards(sourceColumnId);
        } else if (changes.labelIds !== undefined && this._activeFilter.labelIds?.length) {
          // Etiquetas cambiaron y hay filtro activo — puede que la tarjeta deba desaparecer
          this._refreshColumnCards(sourceColumnId);
        } else if (changes.title !== undefined || changes.priority !== undefined || changes.labelIds !== undefined) {
          const colEl = this._shadow.querySelector(
            `dojo-kanban-column[column-id="${CSS.escape(sourceColumnId)}"]`
          );
          if (colEl) {
            const cardEl = colEl.querySelector(`dojo-task-card[task-id="${CSS.escape(taskId)}"]`);
            if (cardEl) {
              if (changes.title    !== undefined) cardEl.setAttribute('task-title',    updated.title);
              if (changes.priority !== undefined) cardEl.setAttribute('task-priority', updated.priority);
              if (changes.labelIds !== undefined) (cardEl as TaskCardElement).taskLabels = this._getTaskLabels(updated);
            }
          }
        }
      }
      this._updateColumnCounts();
    } catch (err) {
      console.error('[dojo-kanban-board] Error al actualizar tarea:', err);
    }
  }
  // ── Handlers de eliminación de tarea (US-06) ─────────────────────────────

  private _onTaskDeleteRequest(e: CustomEvent): void {
    const { taskId, taskTitle } = e.detail as { taskId: string; taskTitle: string };
    // Guardar referencia al elemento disparador para devolver el foco al cerrar (Fix #3)
    const trigger = e.composedPath()
      .find((el): el is HTMLElement => el instanceof HTMLElement && typeof (el as HTMLElement).focus === 'function'
      ) ?? null;
    const dialog = this._getDeleteDialog() as any;
    if (dialog?.show) dialog.show(taskId, taskTitle, trigger);
  }

  private async _handleTaskDeleteConfirm(e: CustomEvent): Promise<void> {
    const { taskId } = e.detail as { taskId: string };

    // Localizar columna desde el caché
    let columnId: string | null = null;
    for (const [colId, tasks] of this._tasksByColumn) {
      if (tasks.some(t => t.id === taskId)) { columnId = colId; break; }
    }
    if (!columnId) return;

    try {
      await deleteTask(taskId);

      // Actualizar caché
      const remaining = (this._tasksByColumn.get(columnId) ?? []).filter(t => t.id !== taskId);
      this._tasksByColumn.set(columnId, remaining.map((t, i) => ({ ...t, order: i })));

      // Cerrar panel de detalle solo si estaba mostrando la tarea eliminada (Fix #1)
      const detail = this._getTaskDetail() as any;
      if (detail?.currentTaskId === taskId && detail?.close) detail.close();

      // Refrescar columna + conteos
      this._refreshColumnCards(columnId);
      this._updateColumnCounts();
    } catch (err) {
      console.error('[dojo-kanban-board] Error al eliminar tarea:', err);
    }
  }
}

customElements.define(DojoKanbanBoard.TAG, DojoKanbanBoard);
