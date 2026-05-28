/**
 * dojo-command-palette — Paleta de comandos global (US-46 / US-28)
 *
 * Se abre con Cmd/Ctrl+K. Permite buscar y ejecutar comandos de la aplicación
 * con búsqueda fuzzy, así como buscar tareas existentes y crear nuevas.
 *
 * ## Características
 * - Fuzzy search sobre comandos y tareas
 * - Historial de últimos 10 comandos ejecutados (localStorage)
 * - Categorías: Tablero, Vista, Tareas, Configuración
 * - Atajos de teclado visibles junto a cada comando
 * - Comandos contextuales (algunos requieren tablero activo)
 * - Navegación ↑/↓, Enter para ejecutar, Escape para cerrar
 *
 * ## Eventos emitidos
 * - `dojo:palette-command`      — { commandId: string }
 * - `dojo:palette-select-task`  — { taskId: string }
 * - `dojo:palette-create-task`  — { title: string }
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*, --dojo-primary,
 * --dojo-shadow, --dojo-radius
 */

import { getAllTasks } from '../../../db/task.repository.js';
import type { Task } from '../../../types/models.js';

// ── Tipos internos ─────────────────────────────────────────────────────────

/** Categorías de comandos disponibles en la paleta. */
export type CommandCategory = 'Tablero' | 'Vista' | 'Tareas' | 'Configuración';

/** Define una acción de la aplicación registrada en la paleta. */
export interface Command {
  id: string;
  label: string;
  icon: string;
  category: CommandCategory;
  /** Atajo de teclado en formato legible (ej. "Ctrl+K"). */
  shortcut?: string;
  /** Si true, el comando solo está disponible cuando hay un tablero activo. */
  requiresBoard?: boolean;
}

interface TaskResult {
  task: Task;
  /** Relevancia: 2 = título, 1 = descripción. */
  score: number;
}

interface CommandResult {
  command: Command;
  score: number;
}

type PaletteItem =
  | { type: 'command'; data: Command; score: number }
  | { type: 'task';    data: Task;    score: number }
  | { type: 'create';  query: string };

// ── Constantes ─────────────────────────────────────────────────────────────

const DEBOUNCE_MS       = 150;
const MAX_TASK_RESULTS  = 10;
const MAX_CMD_RESULTS   = 8;
const HISTORY_KEY       = 'dojo-palette-history';
const MAX_HISTORY       = 10;

const PRIORITY_LABELS: Record<string, string> = {
  urgent: '🔴',
  high:   '🟠',
  medium: '🟡',
  low:    '🟢',
};

/** Registro de comandos de la aplicación. */
const COMMANDS: Command[] = [
  // ── Tablero ────────────────────────────────────────────────────────────
  { id: 'board:new-task',      label: 'Nueva tarea',          icon: '➕', category: 'Tablero',      requiresBoard: true  },
  { id: 'board:selector',      label: 'Cambiar tablero',      icon: '🗂️', category: 'Tablero'                          },
  { id: 'board:export',        label: 'Exportar datos',       icon: '📤', category: 'Tablero',      requiresBoard: true  },
  { id: 'board:import',        label: 'Importar datos',       icon: '📥', category: 'Tablero'                          },

  // ── Vista ──────────────────────────────────────────────────────────────
  { id: 'view:kanban',         label: 'Vista Kanban',         icon: '📋', category: 'Vista',        requiresBoard: true  },
  { id: 'view:list',           label: 'Vista Lista',          icon: '📃', category: 'Vista',        requiresBoard: true  },
  { id: 'view:analytics',      label: 'Vista Analytics',      icon: '📊', category: 'Vista',        requiresBoard: true  },

  // ── Tareas ─────────────────────────────────────────────────────────────
  { id: 'task:new',            label: 'Crear tarea',          icon: '✏️', category: 'Tareas',       requiresBoard: true  },
  { id: 'task:templates',      label: 'Gestionar templates',  icon: '📋', category: 'Tareas'                           },

  // ── Configuración ──────────────────────────────────────────────────────
  { id: 'config:labels',       label: 'Gestionar etiquetas',  icon: '🏷️', category: 'Configuración'                    },
  { id: 'config:projects',     label: 'Gestionar proyectos',  icon: '📁', category: 'Configuración'                    },
  { id: 'config:people',       label: 'Gestionar personas',   icon: '👥', category: 'Configuración'                    },
  { id: 'config:theme',        label: 'Personalizar tema',    icon: '🎨', category: 'Configuración'                    },
  { id: 'config:wiki',         label: 'Guía de usuario',      icon: '📖', category: 'Configuración'                    },
];

// ── Fuzzy search ───────────────────────────────────────────────────────────

/**
 * Fuzzy match: devuelve un score > 0 si todos los caracteres de `query`
 * aparecen en `text` en orden. Premia caracteres consecutivos.
 */
function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let score = 0;
  let ti = 0;
  let consecutive = 0;

  for (let qi = 0; qi < q.length; qi++) {
    let found = false;
    while (ti < t.length) {
      if (t[ti] === q[qi]) {
        consecutive++;
        score += 1 + consecutive;
        ti++;
        found = true;
        break;
      }
      consecutive = 0;
      ti++;
    }
    if (!found) return 0; // todos los chars deben aparecer
  }
  return score;
}

// ── Historia de comandos ───────────────────────────────────────────────────

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch { /* noop */ }
}

function recordCommand(commandId: string): void {
  const history = loadHistory().filter(id => id !== commandId);
  history.unshift(commandId);
  saveHistory(history);
}

export class DojoCommandPalette extends HTMLElement {
  static readonly TAG = 'dojo-command-palette';

  private _shadow: ShadowRoot;
  private _tasks: Task[]      = [];
  private _items: PaletteItem[] = [];
  private _selectedIndex      = -1;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;
  /** Elemento que tenía el foco antes de abrir la paleta. */
  private _previousFocus: HTMLElement | null = null;
  /** ID del tablero activo — filtra tareas y comandos contextuales. */
  private _boardId = '';
  /** Indica que el caché de tareas debe refrescarse en la próxima apertura. */
  private _cacheDirty = true;

  // ── Refs (se asignan en _render) ───────────────────────────────────────

  private _input!: HTMLInputElement;
  private _listEl!: HTMLElement;

  // ── Keyboard handler (referencia estable para cleanup) ─────────────────

  private _onDocKeydown = (e: KeyboardEvent): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      const host = this.getRootNode() as ShadowRoot | Document;
      const openModal = host.querySelector?.('[aria-modal="true"]:not([aria-hidden="true"])');
      if (openModal && openModal !== this._shadow.querySelector('.palette')) return;

      e.preventDefault();
      this.hasAttribute('open') ? this.hide() : void this.show();
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

  /** Configura el ID del tablero activo (filtra tareas y comandos contextuales). */
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
    this._items = [];
    this._selectedIndex = -1;
    this._renderList();

    requestAnimationFrame(() => this._input.focus());
  }

  /** Cierra la paleta y devuelve el foco al elemento anterior. */
  hide(): void {
    this.removeAttribute('open');
    this._input.value = '';
    this._items = [];
    this._selectedIndex = -1;
    this._listEl.innerHTML = '';
    this._previousFocus?.focus();
  }

  // ── Búsqueda ──────────────────────────────────────────────────────────

  private _onInput(): void {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._search(), DEBOUNCE_MS);
  }

  private _search(): void {
    const query = this._input.value.trim();

    if (!query) {
      this._items = [];
      this._selectedIndex = -1;
      this._renderList();
      return;
    }

    const items: PaletteItem[] = [];

    // ── Comandos con fuzzy match ─────────────────────────────────────────
    const cmdResults: CommandResult[] = [];
    for (const cmd of COMMANDS) {
      if (cmd.requiresBoard && !this._boardId) continue;
      const score = fuzzyScore(cmd.label, query) + fuzzyScore(cmd.category, query) * 0.5;
      if (score > 0) cmdResults.push({ command: cmd, score });
    }
    cmdResults.sort((a, b) => b.score - a.score);
    for (const r of cmdResults.slice(0, MAX_CMD_RESULTS)) {
      items.push({ type: 'command', data: r.command, score: r.score });
    }

    // ── Tareas con fuzzy match ───────────────────────────────────────────
    const taskResults: TaskResult[] = [];
    for (const task of this._tasks) {
      const titleScore = fuzzyScore(task.title, query);
      const descScore  = task.description ? fuzzyScore(task.description.substring(0, 200), query) * 0.5 : 0;
      const best = Math.max(titleScore, descScore);
      if (best > 0) taskResults.push({ task, score: best });
    }
    taskResults.sort((a, b) => b.score - a.score);
    for (const r of taskResults.slice(0, MAX_TASK_RESULTS)) {
      items.push({ type: 'task', data: r.task, score: r.score });
    }

    // Opción de crear tarea siempre al final cuando hay query
    if (this._boardId) {
      items.push({ type: 'create', query });
    }

    this._items = items;
    this._selectedIndex = items.length > 0 ? 0 : -1;
    this._renderList();
  }

  // ── Navegación por teclado ────────────────────────────────────────────

  private _moveSelection(delta: number): void {
    const selectableItems = this._items.filter(i => i.type !== 'create' || !!(i as { type: 'create'; query: string }).query);
    const total = this._items.length;
    if (total === 0) return;

    this._selectedIndex = (this._selectedIndex + delta + total) % total;
    this._updateActiveDescendant();
  }

  private _confirmSelection(): void {
    const item = this._items[this._selectedIndex];
    if (!item) return;

    if (item.type === 'command') {
      this._executeCommand(item.data);
    } else if (item.type === 'task') {
      this._dispatchSelectTask(item.data);
    } else if (item.type === 'create') {
      this._dispatchCreateTask(item.query);
    }
  }

  // ── Eventos ───────────────────────────────────────────────────────────

  private _executeCommand(cmd: Command): void {
    recordCommand(cmd.id);
    this.hide();
    this.dispatchEvent(new CustomEvent('dojo:palette-command', {
      bubbles: true,
      composed: true,
      detail: { commandId: cmd.id },
    }));
  }

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
        width: 560px;
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
        flex-shrink: 0;
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

      /* ── Área scrollable ──────────────────────────────────── */
      .results {
        overflow-y: auto;
        flex: 1;
        min-height: 0;
        padding: 0.375rem 0;
      }

      /* ── Cabecera de categoría ────────────────────────────── */
      .category-header {
        font-size: 0.625rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--dojo-text-secondary);
        padding: 0.375rem 1rem 0.125rem;
        margin-top: 0.25rem;
      }
      .category-header:first-child {
        margin-top: 0;
      }

      /* ── Ítem genérico (comando, tarea, crear) ────────────── */
      .result-item {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.5rem 1rem;
        cursor: pointer;
        transition: background 0.1s;
        border-radius: 0;
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

      /* ── Ícono del ítem ───────────────────────────────────── */
      .item-icon {
        flex-shrink: 0;
        font-size: 0.875rem;
        width: 1.25rem;
        text-align: center;
      }

      /* ── Cuerpo del ítem ──────────────────────────────────── */
      .item-body {
        flex: 1;
        min-width: 0;
      }
      .item-label {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--dojo-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .item-meta {
        font-size: 0.6875rem;
        color: var(--dojo-text-secondary);
        margin-top: 0.0625rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* ── Badge de atajo de teclado ───────────────────────── */
      .item-shortcut {
        flex-shrink: 0;
        display: flex;
        gap: 0.25rem;
        align-items: center;
      }
      .item-shortcut kbd {
        font-size: 0.625rem;
        color: var(--dojo-text-secondary);
        background: var(--dojo-bg);
        border: 1px solid var(--dojo-border);
        border-radius: 3px;
        padding: 0.0625rem 0.3125rem;
        font-family: inherit;
      }

      /* ── Badge de número de tarea ─────────────────────────── */
      .task-number {
        font-family: monospace;
        font-size: 0.6875rem;
        color: var(--dojo-primary, #1D4ED8);
        flex-shrink: 0;
      }

      /* ── Estado vacío ─────────────────────────────────────── */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2rem 1rem;
        color: var(--dojo-text-secondary);
        font-size: 0.8125rem;
        gap: 0.25rem;
      }
      .empty-icon {
        font-size: 1.75rem;
        margin-bottom: 0.25rem;
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
        flex-shrink: 0;
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
    searchIcon.textContent = '⌘';

    this._input = document.createElement('input');
    this._input.className = 'search-input';
    this._input.type = 'text';
    this._input.placeholder = 'Buscar comandos y tareas…';
    this._input.setAttribute('aria-label', 'Buscar comandos y tareas');
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

    // Lista de resultados (scroll)
    this._listEl = document.createElement('div');
    this._listEl.className = 'results';
    this._listEl.id = 'palette-results';
    this._listEl.setAttribute('role', 'listbox');
    this._listEl.setAttribute('aria-label', 'Resultados de búsqueda');
    palette.appendChild(this._listEl);

    // Footer con atajos
    const footer = document.createElement('div');
    footer.className = 'footer';
    footer.innerHTML = `
      <span><kbd>↑↓</kbd> navegar</span>
      <span><kbd>↵</kbd> ejecutar</span>
      <span><kbd>Esc</kbd> cerrar</span>
    `;
    palette.appendChild(footer);

    this._shadow.appendChild(palette);

    // Mostrar comandos recientes al abrir
    this._renderList();
  }

  /**
   * Renderiza la lista de ítems. Si no hay query, muestra el historial
   * de comandos recientes o todos los comandos por categoría.
   */
  private _renderList(): void {
    this._listEl.innerHTML = '';
    const query = this._input.value.trim();
    const hasQuery = query.length > 0;
    this._input.setAttribute('aria-expanded', hasQuery ? 'true' : 'false');

    if (!hasQuery) {
      // Sin query → mostrar recientes o comandos disponibles
      this._renderDefault();
      return;
    }

    if (this._items.length === 0) {
      this._renderEmpty(query);
      return;
    }

    let globalIndex = 0;
    let lastCategory = '';

    for (const item of this._items) {
      if (item.type === 'command') {
        const cat = item.data.category;
        if (cat !== lastCategory) {
          this._appendCategoryHeader(cat);
          lastCategory = cat;
        }
        this._appendCommandItem(item.data, globalIndex);
      } else if (item.type === 'task') {
        if (lastCategory !== 'Tareas') {
          this._appendCategoryHeader('Tareas');
          lastCategory = 'Tareas';
        }
        this._appendTaskItem(item.data, globalIndex);
      } else if (item.type === 'create') {
        this._appendCreateItem(item.query, globalIndex);
        lastCategory = '';
      }
      globalIndex++;
    }

    this._updateActiveDescendant();
  }

  /** Muestra recientes (si los hay) o el listado completo de comandos. */
  private _renderDefault(): void {
    const history = loadHistory();
    const availableCommands = COMMANDS.filter(c => !(c.requiresBoard && !this._boardId));

    if (history.length > 0) {
      const recentCmds = history
        .map(id => availableCommands.find(c => c.id === id))
        .filter((c): c is Command => !!c)
        .slice(0, MAX_HISTORY);

      if (recentCmds.length > 0) {
        this._appendCategoryHeader('Recientes');
        recentCmds.forEach((cmd, i) => this._appendCommandItem(cmd, i));
        return;
      }
    }

    // Sin historial → mostrar por categorías
    const byCategory = new Map<CommandCategory, Command[]>();
    for (const cmd of availableCommands) {
      if (!byCategory.has(cmd.category)) byCategory.set(cmd.category, []);
      byCategory.get(cmd.category)!.push(cmd);
    }

    let globalIndex = 0;
    for (const [cat, cmds] of byCategory) {
      this._appendCategoryHeader(cat);
      for (const cmd of cmds) {
        this._appendCommandItem(cmd, globalIndex++);
      }
    }
  }

  private _renderEmpty(query: string): void {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <span class="empty-icon" aria-hidden="true">🔎</span>
      <span>Sin resultados para "<strong>${this._escape(query)}</strong>"</span>
    `;
    this._listEl.appendChild(empty);
  }

  private _appendCategoryHeader(label: string): void {
    const header = document.createElement('div');
    header.className = 'category-header';
    header.setAttribute('aria-hidden', 'true');
    header.textContent = label;
    this._listEl.appendChild(header);
  }

  private _appendCommandItem(cmd: Command, index: number): void {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.setAttribute('role', 'option');
    item.id = `palette-item-${index}`;
    item.setAttribute('aria-selected', index === this._selectedIndex ? 'true' : 'false');
    item.setAttribute('aria-label', `${cmd.label}${cmd.shortcut ? ', atajo: ' + cmd.shortcut : ''}`);

    const icon = document.createElement('span');
    icon.className = 'item-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = cmd.icon;

    const body = document.createElement('div');
    body.className = 'item-body';

    const label = document.createElement('div');
    label.className = 'item-label';
    label.textContent = cmd.label;

    body.appendChild(label);
    item.appendChild(icon);
    item.appendChild(body);

    if (cmd.shortcut) {
      const shortcutEl = document.createElement('span');
      shortcutEl.className = 'item-shortcut';
      shortcutEl.setAttribute('aria-hidden', 'true');
      cmd.shortcut.split('+').forEach(key => {
        const kbd = document.createElement('kbd');
        kbd.textContent = key;
        shortcutEl.appendChild(kbd);
      });
      item.appendChild(shortcutEl);
    }

    item.addEventListener('click', () => this._executeCommand(cmd));
    this._listEl.appendChild(item);
  }

  private _appendTaskItem(task: Task, index: number): void {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.setAttribute('role', 'option');
    item.id = `palette-item-${index}`;
    item.setAttribute('aria-selected', index === this._selectedIndex ? 'true' : 'false');

    const icon = document.createElement('span');
    icon.className = 'item-icon';
    icon.setAttribute('aria-label', `Prioridad: ${task.priority}`);
    icon.textContent = PRIORITY_LABELS[task.priority] ?? '📝';

    const body = document.createElement('div');
    body.className = 'item-body';

    const titleEl = document.createElement('div');
    titleEl.className = 'item-label';
    titleEl.textContent = task.title;

    body.appendChild(titleEl);

    const desc = task.description?.substring(0, 80).replace(/\n/g, ' ');
    if (desc) {
      const metaEl = document.createElement('div');
      metaEl.className = 'item-meta';
      metaEl.textContent = desc;
      body.appendChild(metaEl);
    }

    item.appendChild(icon);
    item.appendChild(body);

    if (task.taskNumber) {
      const numEl = document.createElement('span');
      numEl.className = 'task-number';
      numEl.textContent = task.taskNumber;
      item.appendChild(numEl);
    }

    item.addEventListener('click', () => this._dispatchSelectTask(task));
    this._listEl.appendChild(item);
  }

  private _appendCreateItem(query: string, index: number): void {
    const item = document.createElement('div');
    item.className = 'result-item';
    item.setAttribute('role', 'option');
    item.id = `palette-item-${index}`;
    item.setAttribute('aria-selected', index === this._selectedIndex ? 'true' : 'false');
    item.style.borderTop = '1px solid var(--dojo-border)';

    const icon = document.createElement('span');
    icon.className = 'item-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '➕';

    const body = document.createElement('div');
    body.className = 'item-body';

    const label = document.createElement('div');
    label.className = 'item-label';
    label.innerHTML = `Crear tarea: <strong>${this._escape(query)}</strong>`;

    body.appendChild(label);
    item.appendChild(icon);
    item.appendChild(body);

    item.addEventListener('click', () => this._dispatchCreateTask(query));
    this._listEl.appendChild(item);
  }

  private _updateActiveDescendant(): void {
    this._listEl.querySelectorAll<HTMLElement>('.result-item').forEach((el, i) => {
      el.setAttribute('aria-selected', i === this._selectedIndex ? 'true' : 'false');
    });

    if (this._selectedIndex >= 0) {
      const activeEl = this._listEl.querySelector<HTMLElement>(`#palette-item-${this._selectedIndex}`);
      activeEl?.scrollIntoView({ block: 'nearest' });
      this._input.setAttribute('aria-activedescendant', `palette-item-${this._selectedIndex}`);
    } else {
      this._input.removeAttribute('aria-activedescendant');
    }
  }

  private _escape(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

customElements.define(DojoCommandPalette.TAG, DojoCommandPalette);
