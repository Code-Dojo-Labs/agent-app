/**
 * dojo-command-palette — Paleta de comandos global (US-28)
 *
 * Se abre con Cmd/Ctrl+K. Busca tareas por título y descripción con
 * ordenamiento por relevancia (título > descripción). Soporta navegación
 * por teclado (↑/↓, Enter, Escape) y creación rápida de tareas.
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*, --dojo-primary,
 * --dojo-shadow, --dojo-radius
 */

import { getAllTasks } from '../../../db/task.repository.js';
import type { Task } from '../../../types/models.js';

// ── Tipos internos ─────────────────────────────────────────────────────────

interface SearchResult {
  task: Task;
  /** Relevancia: 2 = título, 1 = descripción. */
  score: number;
}

// ── Constantes ─────────────────────────────────────────────────────────────

const DEBOUNCE_MS     = 150;
const MAX_RESULTS     = 20;
const PRIORITY_LABELS: Record<string, string> = {
  urgent: '🔴',
  high:   '🟠',
  medium: '🟡',
  low:    '🟢',
};

export class DojoCommandPalette extends HTMLElement {
  static readonly TAG = 'dojo-command-palette';

  private _shadow: ShadowRoot;
  private _tasks: Task[] = [];
  private _results: SearchResult[] = [];
  private _selectedIndex = -1;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  /** Elemento que tenía el foco antes de abrir la paleta. */
  private _previousFocus: HTMLElement | null = null;
  /** ID del tablero activo para filtrar tareas. */
  private _boardId = '';
  /** Indica que el caché de tareas debe refrescarse en la próxima apertura. */
  private _cacheDirty = true;

  // ── Refs (se asignan en _render) ───────────────────────────────────────

  private _input!: HTMLInputElement;
  private _listEl!: HTMLElement;
  private _emptyEl!: HTMLElement;
  private _createOption!: HTMLElement;

  // ── Keyboard handler (referencia estable para cleanup) ─────────────────

  private _onDocKeydown = (e: KeyboardEvent): void => {
    // Cmd/Ctrl+K para abrir
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      // No abrir si hay otro modal activo (import dialog, task detail, etc.)
      const host = this.getRootNode() as ShadowRoot | Document;
      const openModal = host.querySelector?.('[aria-modal="true"]:not([aria-hidden="true"])');
      if (openModal && openModal !== this._shadow.querySelector('.palette')) return;

      e.preventDefault();
      if (this.hasAttribute('open')) {
        this.hide();
      } else {
        this.show();
      }
      return;
    }

    if (!this.hasAttribute('open')) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.hide();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this._moveSelection(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._moveSelection(-1);
        break;
      case 'Enter':
        e.preventDefault();
        this._confirmSelection();
        break;
    }
  };

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (this._shadow.childElementCount > 0) return;
    this._render();
    document.addEventListener('keydown', this._onDocKeydown);
  }

  disconnectedCallback(): void {
    document.removeEventListener('keydown', this._onDocKeydown);
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
  }

  // ── API pública ────────────────────────────────────────────────────────

  /** Configura el ID del tablero activo (filtra tareas). */
  set boardId(id: string) {
    if (this._boardId !== id) this._cacheDirty = true;
    this._boardId = id;
  }

  /** Marca el caché de tareas como sucio para refrescarlo en la próxima apertura. */
  invalidateCache(): void {
    this._cacheDirty = true;
  }

  /** Abre la paleta y carga las tareas. */
  async show(): Promise<void> {
    this._previousFocus = (this._shadow.activeElement ?? document.activeElement) as HTMLElement | null;
    this.setAttribute('open', '');

    if (this._cacheDirty) {
      try {
        const allTasks = await getAllTasks();
        this._tasks = this._boardId
          ? allTasks.filter(t => t.boardId === this._boardId)
          : allTasks;
      } catch {
        this._tasks = [];
      }
      this._cacheDirty = false;
    }

    this._input.value = '';
    this._results = [];
    this._selectedIndex = -1;
    this._renderResults();

    requestAnimationFrame(() => this._input.focus());
  }

  /** Cierra la paleta y devuelve el foco al elemento anterior. */
  hide(): void {
    this.removeAttribute('open');
    this._input.value = '';
    this._results = [];
    this._selectedIndex = -1;
    this._renderResults();
    this._previousFocus?.focus();
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────

  private _onInput(): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._search(), DEBOUNCE_MS);
  }

  private _search(): void {
    const query = this._input.value.trim().toLowerCase();

    if (!query) {
      this._results = [];
      this._selectedIndex = -1;
      this._renderResults();
      return;
    }

    const results: SearchResult[] = [];

    for (const task of this._tasks) {
      const titleMatch = task.title.toLowerCase().includes(query);
      const descMatch  = (task.description ?? '').toLowerCase().includes(query);

      if (titleMatch) {
        results.push({ task, score: 2 });
      } else if (descMatch) {
        results.push({ task, score: 1 });
      }
    }

    // Ordenar por relevancia descendente, luego por updatedAt más reciente
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.task.updatedAt.localeCompare(a.task.updatedAt);
    });

    this._results = results.slice(0, MAX_RESULTS);
    this._selectedIndex = this._results.length > 0 ? 0 : -1;
    this._renderResults();
  }

  // ── Navegación por teclado ────────────────────────────────────────────

  private _moveSelection(delta: number): void {
    const total = this._getSelectableCount();
    if (total === 0) return;

    this._selectedIndex = (this._selectedIndex + delta + total) % total;
    this._updateActiveDescendant();
  }

  /** Cuenta total: resultados + opción "crear" (si visible). */
  private _getSelectableCount(): number {
    const hasCreateOption = this._input.value.trim().length > 0;
    return this._results.length + (hasCreateOption ? 1 : 0);
  }

  private _confirmSelection(): void {
    const query = this._input.value.trim();
    if (!query) return;

    // Si está seleccionada la opción "Crear tarea"
    if (this._selectedIndex === this._results.length) {
      this._dispatchCreateTask(query);
      return;
    }

    const result = this._results[this._selectedIndex];
    if (result) {
      this._dispatchSelectTask(result.task);
    }
  }

  // ── Eventos ───────────────────────────────────────────────────────────

  private _dispatchSelectTask(task: Task): void {
    this.hide();
    this.dispatchEvent(new CustomEvent('dojo:palette-select-task', {
      bubbles: true,
      composed: true,
      detail: { taskId: task.id },
    }));
  }

  private _dispatchCreateTask(title: string): void {
    this.hide();
    this.dispatchEvent(new CustomEvent('dojo:palette-create-task', {
      bubbles: true,
      composed: true,
      detail: { title },
    }));
  }

  // ── Renderizado ───────────────────────────────────────────────────────

  private _render(): void {
    const style = document.createElement('style');
    style.textContent = /* css */`
      :host {
        display: contents;
      }

      /* ── Backdrop ─────────────────────────────────────────── */
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 500;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
      }
      :host([open]) .backdrop {
        opacity: 1;
        pointer-events: auto;
      }

      /* ── Paleta ───────────────────────────────────────────── */
      .palette {
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translateX(-50%) translateY(-8px);
        z-index: 501;
        width: 520px;
        max-width: calc(100vw - 2rem);
        max-height: 70vh;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: calc(var(--dojo-radius, 6px) * 1.5);
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.24);
        display: flex;
        flex-direction: column;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease, transform 0.15s ease;
        overflow: hidden;
      }
      :host([open]) .palette {
        opacity: 1;
        pointer-events: auto;
        transform: translateX(-50%) translateY(0);
      }

      /* ── Campo de búsqueda ────────────────────────────────── */
      .search-wrapper {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--dojo-border);
      }
      .search-icon {
        font-size: 1rem;
        color: var(--dojo-text-secondary);
        flex-shrink: 0;
      }
      .search-input {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        color: var(--dojo-text-primary);
        font-size: 0.9375rem;
        font-family: inherit;
        line-height: 1.5;
      }
      .search-input::placeholder {
        color: var(--dojo-text-secondary);
        opacity: 0.7;
      }
      .shortcut-hint {
        font-size: 0.6875rem;
        color: var(--dojo-text-secondary);
        background: var(--dojo-bg);
        border: 1px solid var(--dojo-border);
        border-radius: 3px;
        padding: 0.125rem 0.375rem;
        font-family: inherit;
        flex-shrink: 0;
      }

      /* ── Lista de resultados ──────────────────────────────── */
      .results {
        overflow-y: auto;
        padding: 0.375rem 0;
        flex: 1;
        min-height: 0;
      }
      .result-item {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.5rem 1rem;
        cursor: pointer;
        transition: background 0.1s;
      }
      .result-item:hover,
      .result-item[aria-selected="true"] {
        background: var(--dojo-bg);
      }
      .result-item[aria-selected="true"] {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: -2px;
        border-radius: 4px;
      }
      .result-priority {
        flex-shrink: 0;
        font-size: 0.75rem;
        width: 1rem;
        text-align: center;
      }
      .result-body {
        flex: 1;
        min-width: 0;
      }
      .result-title {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--dojo-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .result-meta {
        font-size: 0.6875rem;
        color: var(--dojo-text-secondary);
        margin-top: 0.125rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .result-task-number {
        font-family: monospace;
        font-size: 0.6875rem;
        color: var(--dojo-primary, #1D4ED8);
        flex-shrink: 0;
      }

      /* ── Opción "Crear tarea" ─────────────────────────────── */
      .create-option {
        display: none;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        cursor: pointer;
        border-top: 1px solid var(--dojo-border);
        transition: background 0.1s;
        font-size: 0.8125rem;
        color: var(--dojo-text-secondary);
      }
      .create-option.visible {
        display: flex;
      }
      .create-option:hover,
      .create-option[aria-selected="true"] {
        background: var(--dojo-bg);
      }
      .create-option[aria-selected="true"] {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: -2px;
        border-radius: 4px;
      }
      .create-option-icon {
        font-size: 0.875rem;
      }
      .create-option-text {
        color: var(--dojo-text-primary);
        font-weight: 500;
      }

      /* ── Estado vacío ─────────────────────────────────────── */
      .empty-state {
        display: none;
        flex-direction: column;
        align-items: center;
        padding: 1.5rem 1rem;
        color: var(--dojo-text-secondary);
        font-size: 0.8125rem;
      }
      .empty-state.visible {
        display: flex;
      }
      .empty-icon {
        font-size: 1.5rem;
        margin-bottom: 0.375rem;
      }

      /* ── Footer ───────────────────────────────────────────── */
      .footer {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 0.5rem 1rem;
        border-top: 1px solid var(--dojo-border);
        font-size: 0.6875rem;
        color: var(--dojo-text-secondary);
      }
      .footer kbd {
        background: var(--dojo-bg);
        border: 1px solid var(--dojo-border);
        border-radius: 3px;
        padding: 0.0625rem 0.3125rem;
        font-family: inherit;
        font-size: 0.625rem;
      }
    `;
    this._shadow.appendChild(style);

    // ── Backdrop ──────────────────────────────────────────────────────────
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.addEventListener('click', () => this.hide());
    this._shadow.appendChild(backdrop);

    // ── Paleta ───────────────────────────────────────────────────────────
    const palette = document.createElement('div');
    palette.className = 'palette';
    palette.setAttribute('role', 'dialog');
    palette.setAttribute('aria-label', 'Paleta de comandos');
    palette.setAttribute('aria-modal', 'true');

    // Campo de búsqueda
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'search-wrapper';

    const searchIcon = document.createElement('span');
    searchIcon.className = 'search-icon';
    searchIcon.setAttribute('aria-hidden', 'true');
    searchIcon.textContent = '🔍';

    this._input = document.createElement('input');
    this._input.className = 'search-input';
    this._input.type = 'text';
    this._input.placeholder = 'Buscar tareas…';
    this._input.setAttribute('aria-label', 'Buscar tareas');
    this._input.setAttribute('aria-autocomplete', 'list');
    this._input.setAttribute('aria-controls', 'palette-results');
    this._input.setAttribute('role', 'combobox');
    this._input.setAttribute('aria-expanded', 'false');
    this._input.addEventListener('input', () => this._onInput());

    const shortcutHint = document.createElement('span');
    shortcutHint.className = 'shortcut-hint';
    shortcutHint.textContent = 'Esc';

    searchWrapper.appendChild(searchIcon);
    searchWrapper.appendChild(this._input);
    searchWrapper.appendChild(shortcutHint);
    palette.appendChild(searchWrapper);

    // Lista de resultados
    this._listEl = document.createElement('div');
    this._listEl.className = 'results';
    this._listEl.id = 'palette-results';
    this._listEl.setAttribute('role', 'listbox');
    this._listEl.setAttribute('aria-label', 'Resultados de búsqueda');
    palette.appendChild(this._listEl);

    // Estado vacío
    this._emptyEl = document.createElement('div');
    this._emptyEl.className = 'empty-state';
    this._emptyEl.innerHTML = `
      <span class="empty-icon" aria-hidden="true">🔎</span>
      <span>Sin resultados</span>
    `;
    palette.appendChild(this._emptyEl);

    // Opción "Crear tarea"
    this._createOption = document.createElement('div');
    this._createOption.className = 'create-option';
    this._createOption.setAttribute('role', 'option');
    this._createOption.id = 'palette-create';
    this._createOption.innerHTML = `
      <span class="create-option-icon" aria-hidden="true">➕</span>
      <span>Crear tarea: <span class="create-option-text"></span></span>
    `;
    this._createOption.addEventListener('click', () => {
      const query = this._input.value.trim();
      if (query) this._dispatchCreateTask(query);
    });
    palette.appendChild(this._createOption);

    // Footer con atajos
    const footer = document.createElement('div');
    footer.className = 'footer';
    footer.innerHTML = `
      <span><kbd>↑↓</kbd> navegar</span>
      <span><kbd>↵</kbd> seleccionar</span>
      <span><kbd>esc</kbd> cerrar</span>
    `;
    palette.appendChild(footer);

    this._shadow.appendChild(palette);
  }

  private _renderResults(): void {
    const query = this._input.value.trim();
    const hasQuery = query.length > 0;
    const hasResults = this._results.length > 0;

    // Limpiar lista
    this._listEl.innerHTML = '';

    // Mostrar/ocultar estados
    this._emptyEl.classList.toggle('visible', hasQuery && !hasResults);
    this._createOption.classList.toggle('visible', hasQuery);
    this._input.setAttribute('aria-expanded', hasResults ? 'true' : 'false');

    // Texto de crear tarea
    const createText = this._createOption.querySelector('.create-option-text');
    if (createText) createText.textContent = `'${query}'`;

    // Renderizar resultados
    this._results.forEach((result, index) => {
      const item = document.createElement('div');
      item.className = 'result-item';
      item.setAttribute('role', 'option');
      item.id = `palette-item-${index}`;
      item.setAttribute('aria-selected', index === this._selectedIndex ? 'true' : 'false');

      const priority = document.createElement('span');
      priority.className = 'result-priority';
      priority.setAttribute('aria-label', `Prioridad: ${result.task.priority}`);
      priority.textContent = PRIORITY_LABELS[result.task.priority] ?? '';

      const body = document.createElement('div');
      body.className = 'result-body';

      const titleEl = document.createElement('div');
      titleEl.className = 'result-title';
      titleEl.textContent = result.task.title;

      const metaEl = document.createElement('div');
      metaEl.className = 'result-meta';
      const desc = result.task.description
        ? result.task.description.substring(0, 80).replace(/\n/g, ' ')
        : '';
      metaEl.textContent = desc;

      body.appendChild(titleEl);
      if (desc) body.appendChild(metaEl);

      item.appendChild(priority);
      item.appendChild(body);

      if (result.task.taskNumber) {
        const taskNum = document.createElement('span');
        taskNum.className = 'result-task-number';
        taskNum.textContent = result.task.taskNumber;
        item.appendChild(taskNum);
      }

      item.addEventListener('click', () => this._dispatchSelectTask(result.task));
      this._listEl.appendChild(item);
    });

    // Actualizar "crear" selected state
    this._createOption.setAttribute('aria-selected',
      this._selectedIndex === this._results.length && hasQuery ? 'true' : 'false'
    );

    this._updateActiveDescendant();
  }

  private _updateActiveDescendant(): void {
    // Desmarcar todos
    this._listEl.querySelectorAll('.result-item').forEach((el, i) => {
      el.setAttribute('aria-selected', i === this._selectedIndex ? 'true' : 'false');
    });

    // "Crear" option
    const isCreateSelected = this._selectedIndex === this._results.length && this._input.value.trim().length > 0;
    this._createOption.setAttribute('aria-selected', isCreateSelected ? 'true' : 'false');

    // Scroll into view
    if (this._selectedIndex >= 0 && this._selectedIndex < this._results.length) {
      const activeEl = this._listEl.querySelector(`#palette-item-${this._selectedIndex}`);
      activeEl?.scrollIntoView({ block: 'nearest' });
      this._input.setAttribute('aria-activedescendant', `palette-item-${this._selectedIndex}`);
    } else if (isCreateSelected) {
      this._createOption.scrollIntoView({ block: 'nearest' });
      this._input.setAttribute('aria-activedescendant', 'palette-create');
    } else {
      this._input.removeAttribute('aria-activedescendant');
    }
  }
}

customElements.define(DojoCommandPalette.TAG, DojoCommandPalette);
