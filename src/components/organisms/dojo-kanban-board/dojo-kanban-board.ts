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

import type { Column, Task } from '../../../types/models.js';
import { getAllColumns, createColumn, updateColumn, deleteColumn } from '../../../db/column.repository.js';
import { getTasksByStatus, createTask, updateTask, deleteTask, reorderTasks } from '../../../db/task.repository.js';
import '../../molecules/dojo-kanban-column/dojo-kanban-column.js';
import '../../atoms/dojo-task-card/dojo-task-card.js';
import '../../atoms/dojo-add-column-button/dojo-add-column-button.js';
import '../../organisms/dojo-column-dialog/dojo-column-dialog.js';
import '../../organisms/dojo-task-dialog/dojo-task-dialog.js';

// ── Tipos internos ─────────────────────────────────────────────────────────

interface ActiveFilter {
  priority?: string;
  labelIds?: string[];
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
    this._updateColumnCounts();
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
    `;
    this._shadow.appendChild(style);

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
      const columns = await getAllColumns();

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
    const sorted = [...tasks].sort((a, b) => a.order - b.order);
    for (const task of sorted) {
      const card = document.createElement('dojo-task-card');
      card.setAttribute('task-id',       task.id);
      card.setAttribute('task-title',    task.title);
      card.setAttribute('task-priority', task.priority);
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

  private _filterTasks(tasks: Task[]): Task[] {
    const { priority, labelIds } = this._activeFilter;
    return tasks.filter(task => {
      if (priority && task.priority !== priority) return false;
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
}

customElements.define(DojoKanbanBoard.TAG, DojoKanbanBoard);
