/**
 * filter-combo — Molécula de filtro con combo desplegable
 *
 * Componente reutilizable para filtros de múltiple selección con dropdown colapsable.
 * Estado colapsado muestra resumen (ej: "Prioridad ▼ (2 seleccionadas)")
 * Al expandir muestra lista con checkboxes.
 *
 * ## Atributos
 * | Atributo      | Tipo   | Descripción                           |
 * |---------------|--------|---------------------------------------|
 * | label         | string | Etiqueta visible (ej: "Prioridad")   |
 * | placeholder   | string | Texto cuando ninguno seleccionado     |
 *
 * ## Propiedades JS
 * - `options: Array<{ id: string; label: string; icon?: string }>` - Opciones disponibles
 * - `selectedIds: Set<string>` - IDs seleccionados
 *
 * ## Eventos
 * - `dojo:filter-changed` - Al cambiar selección, detail: { selectedIds: string[] }
 * - `dojo:filter-cleared` - Al limpiar filtro
 *
 * ## CSS Custom Properties
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-primary,
 * --dojo-text-secondary, --dojo-primary, --dojo-radius-sm
 */

export interface FilterOption {
  id: string;
  label: string;
  icon?: string;
}

export class FilterCombo extends HTMLElement {
  static readonly TAG = 'filter-combo';

  private _shadow: ShadowRoot;
  private _label = '';
  private _placeholder = '(Ninguno)';
  private _options: FilterOption[] = [];
  private _selectedIds: Set<string> = new Set();
  private _expanded = false;

  // Referencias UI
  private _toggleBtn: HTMLButtonElement | null = null;
  private _dropdown: HTMLElement | null = null;
  private _checkboxes: Map<string, HTMLInputElement> = new Map();

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
    this._handleDocumentClick = this._handleDocumentClick.bind(this);
  }

  // ── Ciclo de vida ──────────────────────────────────────────────────────

  connectedCallback(): void {
    this._label = this.getAttribute('label') ?? '';
    this._placeholder = this.getAttribute('placeholder') ?? '(Ninguno)';

    this._render();
    this._attachListeners();
  }

  disconnectedCallback(): void {
    document.removeEventListener('click', this._handleDocumentClick);
  }

  // ── Propiedades públicas ───────────────────────────────────────────────

  set options(opts: FilterOption[]) {
    this._options = opts;
    this._renderOptions();
  }

  get options(): FilterOption[] {
    return this._options;
  }

  set selectedIds(ids: Set<string>) {
    this._selectedIds = new Set(ids);
    this._updateCheckboxes();
    this._updateButtonLabel();
  }

  get selectedIds(): Set<string> {
    return new Set(this._selectedIds);
  }

  get selectedIdsList(): string[] {
    return Array.from(this._selectedIds);
  }

  // ── Métodos públicos ───────────────────────────────────────────────────

  public clear(): void {
    this._selectedIds.clear();
    this._updateCheckboxes();
    this._updateButtonLabel();
    this._dispatchEvent('dojo:filter-cleared', {});
  }

  public toggle(): void {
    this._expanded ? this._collapse() : this._expand();
  }

  // ── Render ─────────────────────────────────────────────────────────────

  private _render(): void {
    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-block;
        position: relative;
      }

      .combo-container {
        position: relative;
        display: inline-block;
        min-width: 180px;
      }

      .toggle-btn {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.375rem 0.75rem;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.8125rem;
        color: var(--dojo-text-secondary);
        cursor: pointer;
        font-family: inherit;
        font-weight: 500;
        transition: all 0.15s ease;
        white-space: nowrap;
        outline: none;
      }

      .toggle-btn:hover {
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
        border-color: var(--dojo-text-secondary);
      }

      .toggle-btn:focus-visible {
        outline: 2px solid var(--dojo-primary);
        outline-offset: 2px;
      }

      .toggle-btn.has-selection {
        color: var(--dojo-primary);
        border-color: var(--dojo-primary);
        font-weight: 600;
      }

      .toggle-label {
        font-weight: inherit;
      }

      .toggle-indicator {
        margin-left: auto;
        flex-shrink: 0;
        display: inline-block;
        transition: transform 0.2s ease;
      }

      .toggle-btn.expanded .toggle-indicator {
        transform: rotate(180deg);
      }

      .dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-top: none;
        border-radius: 0 0 var(--dojo-radius-sm, 4px) var(--dojo-radius-sm, 4px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        max-height: 60vh;
        overflow-y: auto;
        margin-top: -1px;
        display: none;
      }

      .dropdown.visible {
        display: block;
      }

      .dropdown-content {
        padding: 0.5rem 0;
      }

      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        color: var(--dojo-text-primary);
        font-size: 0.8125rem;
        cursor: pointer;
        transition: background 0.1s ease;
      }

      .checkbox-item:hover {
        background: var(--dojo-bg);
      }

      .checkbox-item input[type="checkbox"] {
        cursor: pointer;
        flex-shrink: 0;
      }

      .checkbox-label {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 0.375rem;
        cursor: pointer;
      }

      .checkbox-icon {
        font-size: 1rem;
        line-height: 1;
        flex-shrink: 0;
      }

      .dropdown-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.75rem;
        border-top: 1px solid var(--dojo-border);
        font-size: 0.75rem;
      }

      .clear-btn {
        background: transparent;
        border: none;
        color: var(--dojo-primary);
        cursor: pointer;
        font-family: inherit;
        text-decoration: underline;
        padding: 0;
        font-weight: 500;
      }

      .clear-btn:hover {
        color: var(--dojo-primary);
        opacity: 0.8;
      }

      .selection-count {
        color: var(--dojo-text-secondary);
      }
    `;

    const container = document.createElement('div');
    container.className = 'combo-container';

    this._toggleBtn = document.createElement('button');
    this._toggleBtn.className = 'toggle-btn';
    this._toggleBtn.setAttribute('aria-haspopup', 'listbox');
    this._toggleBtn.setAttribute('aria-expanded', 'false');
    this._updateButtonLabel();

    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'toggle-label';
    toggleLabel.textContent = this._label;

    const toggleIndicator = document.createElement('span');
    toggleIndicator.className = 'toggle-indicator';
    toggleIndicator.textContent = '▼';

    this._toggleBtn.appendChild(toggleLabel);
    this._toggleBtn.appendChild(toggleIndicator);

    this._dropdown = document.createElement('div');
    this._dropdown.className = 'dropdown';
    this._dropdown.setAttribute('role', 'listbox');

    const dropdownContent = document.createElement('div');
    dropdownContent.className = 'dropdown-content';
    this._dropdown.appendChild(dropdownContent);

    const dropdownFooter = document.createElement('div');
    dropdownFooter.className = 'dropdown-footer';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-btn';
    clearBtn.textContent = 'Limpiar';

    const selectionCount = document.createElement('span');
    selectionCount.className = 'selection-count';

    dropdownFooter.appendChild(clearBtn);
    dropdownFooter.appendChild(selectionCount);

    this._dropdown.appendChild(dropdownFooter);

    container.appendChild(this._toggleBtn);
    container.appendChild(this._dropdown);

    this._shadow.appendChild(style);
    this._shadow.appendChild(container);

    this._renderOptions();
  }

  private _renderOptions(): void {
    const dropdownContent = this._shadow.querySelector('.dropdown-content');
    if (!dropdownContent) return;

    dropdownContent.innerHTML = '';
    this._checkboxes.clear();

    this._options.forEach(option => {
      const item = document.createElement('label');
      item.className = 'checkbox-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = option.id;
      checkbox.checked = this._selectedIds.has(option.id);
      checkbox.setAttribute('role', 'option');

      const labelDiv = document.createElement('div');
      labelDiv.className = 'checkbox-label';

      if (option.icon) {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'checkbox-icon';
        iconSpan.textContent = option.icon;
        labelDiv.appendChild(iconSpan);
      }

      const labelSpan = document.createElement('span');
      labelSpan.textContent = option.label;
      labelDiv.appendChild(labelSpan);

      item.appendChild(checkbox);
      item.appendChild(labelDiv);

      dropdownContent.appendChild(item);
      this._checkboxes.set(option.id, checkbox);
    });
  }

  private _updateButtonLabel(): void {
    if (!this._toggleBtn) return;

    const labelSpan = this._toggleBtn.querySelector('.toggle-label');
    if (!labelSpan) return;

    let summary = this._placeholder;
    if (this._selectedIds.size > 0) {
      if (this._selectedIds.size === 1) {
        const selectedId = Array.from(this._selectedIds)[0];
        const selectedOption = this._options.find(o => o.id === selectedId);
        summary = selectedOption?.label ?? selectedId;
      } else {
        summary = `${this._selectedIds.size} seleccionadas`;
      }
      this._toggleBtn.classList.add('has-selection');
    } else {
      this._toggleBtn.classList.remove('has-selection');
    }

    labelSpan.textContent = `${this._label} ${summary}`;
  }

  private _updateCheckboxes(): void {
    this._checkboxes.forEach((checkbox, id) => {
      checkbox.checked = this._selectedIds.has(id);
    });
    this._updateSelectionCount();
  }

  private _updateSelectionCount(): void {
    const countSpan = this._shadow.querySelector('.selection-count');
    if (countSpan) {
      const count = this._selectedIds.size;
      countSpan.textContent = count === 0 ? '' : `${count} activo${count === 1 ? '' : 's'}`;
    }
  }

  // ── Event handlers ────────────────────────────────────────────────────

  private _attachListeners(): void {
    if (!this._toggleBtn) return;

    this._toggleBtn.addEventListener('click', () => this.toggle());

    const clearBtn = this._shadow.querySelector('.clear-btn') as HTMLButtonElement | null;
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clear();
      });
    }

    this._checkboxes.forEach((checkbox, id) => {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          this._selectedIds.add(id);
        } else {
          this._selectedIds.delete(id);
        }
        this._updateButtonLabel();
        this._updateSelectionCount();
        this._dispatchEvent('dojo:filter-changed', {
          selectedIds: Array.from(this._selectedIds),
        });
      });
    });

    document.addEventListener('click', this._handleDocumentClick);
  }

  private _handleDocumentClick = (event: MouseEvent): void => {
    if (!this.contains(event.target as Node)) {
      this._collapse();
    }
  };

  // ── Métodos privados ───────────────────────────────────────────────────

  private _expand(): void {
    this._expanded = true;
    if (this._dropdown) {
      this._dropdown.classList.add('visible');
    }
    if (this._toggleBtn) {
      this._toggleBtn.classList.add('expanded');
      this._toggleBtn.setAttribute('aria-expanded', 'true');
    }
  }

  private _collapse(): void {
    this._expanded = false;
    if (this._dropdown) {
      this._dropdown.classList.remove('visible');
    }
    if (this._toggleBtn) {
      this._toggleBtn.classList.remove('expanded');
      this._toggleBtn.setAttribute('aria-expanded', 'false');
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
if (!customElements.get(FilterCombo.TAG)) {
  customElements.define(FilterCombo.TAG, FilterCombo);
}
