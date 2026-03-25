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
import { getAllColumns } from '../../../db/column.repository.js';
import { getTasksByStatus } from '../../../db/task.repository.js';
import '../../molecules/dojo-kanban-column/dojo-kanban-column.js';

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

      track.appendChild(colEl);
    }

    this._setMainContent(track);
  }

  // ── Conteo con filtros ────────────────────────────────────────────────────

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
}

customElements.define(DojoKanbanBoard.TAG, DojoKanbanBoard);
