/**
 * dojo-filter-bar — Organismo para barra de filtros con combos
 *
 * Barra de filtros moderna con componentes combo desplegables
 * para Prioridad, Etiquetas y búsqueda de texto.
 *
 * ## Atributos
 * Ninguno.
 *
 * ## Propiedades JS
 * - `searchText: string` - Texto de búsqueda actual
 * - `selectedPriorities: Set<Priority>` - Prioridades seleccionadas
 * - `selectedLabelIds: Set<string>` - IDs de etiquetas seleccionadas
 *
 * ## Métodos públicos
 * - `setLabels(labels: Label[])` - Actualizar opciones de etiquetas
 * - `clearAll()` - Limpiar todos los filtros
 *
 * ## Eventos
 * - `dojo:filter-changed` - Al cambiar filtro, detail: { type, value }
 * - `dojo:search-changed` - Al cambiar búsqueda, detail: { searchText }
 * - `dojo:filter-cleared` - Al limpiar todos
 *
 * ## CSS Custom Properties
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-primary,
 * --dojo-text-secondary, --dojo-primary, --dojo-radius-sm
 */

import type { Priority, Label } from '../../../types/models.js';
import { FilterCombo, type FilterOption } from './filter-combo.js';

export class DojoFilterBar extends HTMLElement {
  static readonly TAG = 'dojo-filter-bar';

  private _shadow: ShadowRoot;
  private _searchText = '';
  private _selectedPriorities: Set<Priority> = new Set();
  private _selectedLabelIds: Set<string> = new Set();
  private _labels: Label[] = [];

  // Referencias a componentes
  private _priorityCombo: FilterCombo | null = null;
  private _labelCombo: FilterCombo | null = null;
  private _searchInput: HTMLInputElement | null = null;
  private _searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  // ── Ciclo de vida ──────────────────────────────────────────────────────

  connectedCallback(): void {
    if (this._shadow.childElementCount === 0) {
      this._render();
      this._setupCombos();
    }
  }

  disconnectedCallback(): void {
    if (this._searchDebounceTimer !== null) {
      clearTimeout(this._searchDebounceTimer);
      this._searchDebounceTimer = null;
    }
  }

  // ── Propiedades públicas ───────────────────────────────────────────────

  get searchText(): string {
    return this._searchText;
  }

  set searchText(text: string) {
    this._searchText = text;
    if (this._searchInput) {
      this._searchInput.value = text;
    }
  }

  get selectedPriorities(): Set<Priority> {
    return new Set(this._selectedPriorities);
  }

  set selectedPriorities(priorities: Set<Priority>) {
    this._selectedPriorities = new Set(priorities);
    if (this._priorityCombo) {
      this._priorityCombo.selectedIds = new Set(Array.from(priorities));
    }
  }

  get selectedLabelIds(): Set<string> {
    return new Set(this._selectedLabelIds);
  }

  set selectedLabelIds(labelIds: Set<string>) {
    this._selectedLabelIds = new Set(labelIds);
    if (this._labelCombo) {
      this._labelCombo.selectedIds = labelIds;
    }
  }

  // ── Métodos públicos ───────────────────────────────────────────────────

  public setLabels(labels: Label[]): void {
    this._labels = labels;
    if (this._labelCombo) {
      const options = labels.map(label => ({
        id: label.id,
        label: label.name,
        icon: '◼',
      })) as FilterOption[];
      // Aplicar color inline
      this._labelCombo.options = options;
    }
  }

  public clearAll(): void {
    this._searchText = '';
    this._selectedPriorities.clear();
    this._selectedLabelIds.clear();

    if (this._searchInput) {
      this._searchInput.value = '';
    }
    if (this._priorityCombo) {
      this._priorityCombo.selectedIds = new Set();
    }
    if (this._labelCombo) {
      this._labelCombo.selectedIds = new Set();
    }

    this._dispatchEvent('dojo:filter-cleared', {});
  }

  // ── Render ─────────────────────────────────────────────────────────────

  private _render(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        background: var(--dojo-surface);
        border-bottom: 1px solid var(--dojo-border);
      }

      .filter-bar-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        flex-wrap: wrap;
      }

      .search-group {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 200px;
        gap: 0.5rem;
      }

      .search-input {
        flex: 1;
        padding: 0.4375rem 0.625rem;
        font-size: 0.8125rem;
        font-family: inherit;
        color: var(--dojo-text-primary);
        background: var(--dojo-bg);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        outline: none;
        transition: border-color 0.15s;
      }

      .search-input:focus {
        border-color: var(--dojo-primary);
      }

      .search-input::placeholder {
        color: var(--dojo-text-secondary);
      }

      .search-icon {
        color: var(--dojo-text-secondary);
        flex-shrink: 0;
      }

      .filters-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .separator {
        width: 1px;
        height: 28px;
        background: var(--dojo-border);
        flex-shrink: 0;
      }

      .clear-all-btn {
        padding: 0.375rem 0.625rem;
        font-size: 0.75rem;
        font-family: inherit;
        background: transparent;
        border: none;
        color: var(--dojo-text-secondary);
        cursor: pointer;
        text-decoration: underline;
        font-weight: 500;
        transition: color 0.15s;
        white-space: nowrap;
      }

      .clear-all-btn:hover {
        color: var(--dojo-text-primary);
      }

      .clear-all-btn:focus-visible {
        outline: 2px solid var(--dojo-primary);
        outline-offset: 2px;
      }

      .clear-all-btn.hidden {
        display: none;
      }

      /* Responsive */
      @media (max-width: 640px) {
        .filter-bar-container {
          padding: 0.5rem;
          gap: 0.375rem;
        }

        .search-group {
          width: 100%;
          min-width: auto;
        }

        .filters-group {
          width: 100%;
        }

        .separator {
          display: none;
        }
      }
    `;

    const container = document.createElement('div');
    container.className = 'filter-bar-container';
    container.setAttribute('role', 'toolbar');
    container.setAttribute('aria-label', 'Filtros');

    // Grupo de búsqueda
    const searchGroup = document.createElement('div');
    searchGroup.className = 'search-group';

    const searchIcon = document.createElement('span');
    searchIcon.className = 'search-icon';
    searchIcon.textContent = '🔍';
    searchIcon.setAttribute('aria-hidden', 'true');

    this._searchInput = document.createElement('input');
    this._searchInput.type = 'search';
    this._searchInput.className = 'search-input';
    this._searchInput.placeholder = 'Buscar tareas…';
    this._searchInput.setAttribute('aria-label', 'Buscar tareas por título o descripción');

    searchGroup.appendChild(searchIcon);
    searchGroup.appendChild(this._searchInput);
    container.appendChild(searchGroup);

    // Separador
    const sep = document.createElement('div');
    sep.className = 'separator';
    sep.setAttribute('aria-hidden', 'true');
    container.appendChild(sep);

    // Grupo de filtros
    const filtersGroup = document.createElement('div');
    filtersGroup.className = 'filters-group';

    // Combo de Prioridad
    this._priorityCombo = document.createElement('filter-combo') as FilterCombo;
    this._priorityCombo.setAttribute('label', 'Prioridad');
    this._priorityCombo.options = [
      { id: 'low', label: 'Baja', icon: '⬇️' },
      { id: 'medium', label: 'Media', icon: '➡️' },
      { id: 'high', label: 'Alta', icon: '⬆️' },
      { id: 'urgent', label: 'Urgente', icon: '🔥' },
    ];
    filtersGroup.appendChild(this._priorityCombo);

    // Combo de Etiquetas
    this._labelCombo = document.createElement('filter-combo') as FilterCombo;
    this._labelCombo.setAttribute('label', 'Etiquetas');
    filtersGroup.appendChild(this._labelCombo);

    container.appendChild(filtersGroup);

    // Botón "Limpiar todos"
    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-all-btn hidden';
    clearBtn.textContent = '✕ Limpiar';
    clearBtn.setAttribute('aria-label', 'Limpiar todos los filtros');
    this._setupClearButton(clearBtn);
    container.appendChild(clearBtn);

    this._shadow.appendChild(style);
    this._shadow.appendChild(container);
  }

  private _setupCombos(): void {
    if (!this._priorityCombo || !this._labelCombo) return;

    // Eventos de combo de prioridad
    this._priorityCombo.addEventListener('dojo:filter-changed', (evt: Event) => {
      const event = evt as CustomEvent;
      const selectedIds = (event.detail?.selectedIds ?? []) as string[];
      this._selectedPriorities = new Set(selectedIds as Priority[]);
      this._updateClearButtonVisibility();
      this._dispatchEvent('dojo:filter-changed', {
        type: 'priority',
        selectedIds,
      });
    });

    this._priorityCombo.addEventListener('dojo:filter-cleared', () => {
      this._selectedPriorities.clear();
      this._updateClearButtonVisibility();
    });

    // Eventos de combo de etiquetas
    this._labelCombo.addEventListener('dojo:filter-changed', (evt: Event) => {
      const event = evt as CustomEvent;
      const selectedIds = (event.detail?.selectedIds ?? []) as string[];
      this._selectedLabelIds = new Set(selectedIds);
      this._updateClearButtonVisibility();
      this._dispatchEvent('dojo:filter-changed', {
        type: 'labels',
        selectedIds,
      });
    });

    this._labelCombo.addEventListener('dojo:filter-cleared', () => {
      this._selectedLabelIds.clear();
      this._updateClearButtonVisibility();
    });

    // Evento de búsqueda
    if (this._searchInput) {
      this._searchInput.addEventListener('input', (e) => {
        const input = e.target as HTMLInputElement;
        this._searchText = input.value;
        this._updateClearButtonVisibility();

        // Debounce de búsqueda
        if (this._searchDebounceTimer !== null) {
          clearTimeout(this._searchDebounceTimer);
        }
        this._searchDebounceTimer = setTimeout(() => {
          this._dispatchEvent('dojo:search-changed', {
            searchText: this._searchText,
          });
        }, 300);
      });
    }
  }

  private _setupClearButton(btn: HTMLButtonElement): void {
    btn.addEventListener('click', () => {
      this.clearAll();
    });
  }

  private _updateClearButtonVisibility(): void {
    const clearBtn = this._shadow.querySelector('.clear-all-btn') as HTMLButtonElement | null;
    if (!clearBtn) return;

    const hasFilters =
      this._selectedPriorities.size > 0 ||
      this._selectedLabelIds.size > 0 ||
      this._searchText.trim().length > 0;

    if (hasFilters) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }

  private _dispatchEvent(eventName: string, detail: Record<string, unknown>): void {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }
}

// Registrar componente
if (!customElements.get(DojoFilterBar.TAG)) {
  customElements.define(DojoFilterBar.TAG, DojoFilterBar);
}
