/**
 * dojo-kanban-column — Molécula
 *
 * Columna del tablero Kanban con scroll vertical independiente.
 * Contiene un `<dojo-column-header>`, un botón de menú contextual ⋮
 * y una zona de contenido (slot) donde se colocarán las tarjetas de tareas.
 *
 * ## Atributos observados
 * | Atributo      | Tipo   | Descripción                                         |
 * |---------------|--------|-----------------------------------------------------|
 * | column-id     | string | ID de la columna en IndexedDB                       |
 * | column-name   | string | Nombre visible de la columna                        |
 * | icon          | string | Emoji representativo del estado                     |
 * | count         | number | Número de tareas visibles en la columna             |
 * | total-count   | number | Total de tareas sin filtro (opcional)               |
 * | accent-color  | string | Color hex de acento opcional                        |
 *
 * ## Slots
 * | Nombre  | Descripción                                                  |
 * |---------|--------------------------------------------------------------|
 * (default) | Tarjetas de tarea (`<dojo-task-card>`) proyectadas aquí      |
 *
 * ## Eventos despachados
 * | Nombre               | Detalle                                         | Descripción                    |
 * |----------------------|-------------------------------------------------|--------------------------------|
 * | dojo:column-drop     | { columnId, taskId, beforeTaskId: string|null } | Tarea dropeada en la columna   |
 * | dojo:column-rename   | { columnId }                                    | Usuario eligió "Renombrar"     |
 * | dojo:column-delete   | { columnId }                                    | Usuario eligió "Eliminar"      |
 * | dojo:column-reorder  | { sourceId, targetId }                          | Columna arrastrada a posición  |
 * | dojo:add-task        | { columnId }                                    | Usuario quiere crear una tarea |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-surface, --dojo-border, --dojo-radius, --dojo-bg, --dojo-shadow
 */

import '../../atoms/dojo-column-header/dojo-column-header.js';
import '../../atoms/dojo-column-menu/dojo-column-menu.js';
import '../../atoms/dojo-add-task-button/dojo-add-task-button.js';

export class DojoKanbanColumn extends HTMLElement {
  static readonly TAG = 'dojo-kanban-column';

  static get observedAttributes(): string[] {
    return ['column-id', 'column-name', 'icon', 'count', 'total-count', 'accent-color'];
  }

  private _shadow: ShadowRoot;
  /** ID de la tarjeta ante la cual se soltará la tarea en curso (null = al final) */
  private _dropBeforeId: string | null = null;
  /** Último valor enviado a _setDropIndicator para evitar mutaciones DOM redundantes */
  private _lastDropIndicatorId: string | null | undefined = undefined;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (this._shadow.childElementCount === 0) {
      this._render();
    }
    this._attachDragListeners();
    // I-1: registrar aquí (no en _render) para que funcione también al reconectar
    this._attachColumnDragListeners();
  }

  disconnectedCallback(): void {
    this._detachDragListeners();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this._updateHeader();
  }

  // ── Getters de atributos ─────────────────────────────────────────────────

  get columnId(): string      { return this.getAttribute('column-id') ?? ''; }
  private get _name(): string       { return this.getAttribute('column-name') ?? ''; }
  private get _icon(): string       { return this.getAttribute('icon') ?? '📋'; }
  private get _count(): string      { return this.getAttribute('count') ?? '0'; }
  private get _totalCount(): string { return this.getAttribute('total-count') ?? this._count; }
  private get _accentColor(): string | null { return this.getAttribute('accent-color'); }

  // ── Render ───────────────────────────────────────────────────────────────

  private _render(): void {
    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        width: 280px;
        min-height: 0;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius);
        box-shadow: var(--dojo-shadow);
        overflow: hidden;
        /* Permite que el usuario arrastre la columna */
        cursor: grab;
      }
      :host([dragging]) {
        opacity: 0.5;
        cursor: grabbing;
      }
      :host([drag-column-over]) {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* Fila superior: header + menú */
      .col-header-row {
        display: flex;
        align-items: stretch;
      }
      .col-header-row dojo-column-header {
        flex: 1;
        min-width: 0;
      }
      .col-header-row dojo-column-menu {
        padding-right: 0.5rem;
        display: flex;
        align-items: center;
      }

      /* Zona de contenido con scroll vertical independiente */
      .content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-height: 100px;
        /* Estilo del scrollbar para mayor integración visual */
        scrollbar-width: thin;
        scrollbar-color: var(--dojo-border) transparent;
      }
      .content::-webkit-scrollbar        { width: 4px; }
      .content::-webkit-scrollbar-track  { background: transparent; }
      .content::-webkit-scrollbar-thumb  { background: var(--dojo-border); border-radius: 2px; }

      /* Estado visual durante el drag-over */
      :host([drag-over]) .content {
        background: var(--dojo-bg);
        outline: 2px dashed var(--dojo-primary, #1D4ED8);
        outline-offset: -4px;
        border-radius: 0 0 var(--dojo-radius) var(--dojo-radius);
      }

      /* Mensaje cuando la columna está vacía */
      .empty-hint {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 80px;
        color: var(--dojo-text-muted);
        font-size: 0.8125rem;
        text-align: center;
        pointer-events: none;
      }

      /* Zona inferior: botón agregar tarea */
      .col-footer {
        padding: 0.375rem 0.5rem 0.5rem;
        border-top: 1px solid var(--dojo-border);
      }
    `;
    this._shadow.appendChild(style);

    // ── Fila: Header + Menú ────────────────────────────────────────────────
    const headerRow = document.createElement('div');
    headerRow.className = 'col-header-row';

    const header = document.createElement('dojo-column-header') as HTMLElement;
    header.setAttribute('icon', this._icon);
    header.setAttribute('column-name', this._name);
    header.setAttribute('count', this._count);
    header.setAttribute('total-count', this._totalCount);
    if (this._accentColor) header.setAttribute('accent-color', this._accentColor);
    headerRow.appendChild(header);

    const menu = document.createElement('dojo-column-menu');
    menu.addEventListener('dojo:column-rename', () => {
      this.dispatchEvent(new CustomEvent('dojo:column-rename', {
        bubbles: true, composed: true,
        detail: { columnId: this.columnId },
      }));
    });
    menu.addEventListener('dojo:column-delete', () => {
      this.dispatchEvent(new CustomEvent('dojo:column-delete', {
        bubbles: true, composed: true,
        detail: { columnId: this.columnId },
      }));
    });
    headerRow.appendChild(menu);
    this._shadow.appendChild(headerRow);

    // Habilitar drag de columna
    this.setAttribute('draggable', 'true');
    // (los listeners de DnD de columna se registran en connectedCallback)

    // ── Zona de contenido ──────────────────────────────────────────────────
    const content = document.createElement('div');
    content.className = 'content';
    content.setAttribute('role', 'list');
    content.setAttribute('aria-label', `Tareas de ${this._name}`);

    // Hint cuando la columna está vacía (visible solo cuando no hay slotted content)
    const hint = document.createElement('p');
    hint.className = 'empty-hint';
    hint.textContent = 'Sin tareas';
    hint.setAttribute('aria-hidden', 'true');
    content.appendChild(hint);

    const slot = document.createElement('slot');
    content.appendChild(slot);

    // Ocultar el hint cuando hay contenido en el slot
    slot.addEventListener('slotchange', () => {
      const assigned = slot.assignedElements();
      hint.style.display = assigned.length > 0 ? 'none' : '';
    });

    this._shadow.appendChild(content);

    // ── Zona inferior: botón "Agregar tarea" ──────────────────────────────
    const footer = document.createElement('div');
    footer.className = 'col-footer';

    const addTaskBtn = document.createElement('dojo-add-task-button') as HTMLElement;
    addTaskBtn.setAttribute('column-id', this.columnId);
    footer.appendChild(addTaskBtn);
    this._shadow.appendChild(footer);
  }

  // ── Actualización dinámica del header ────────────────────────────────────

  private _updateHeader(): void {
    const header = this._shadow.querySelector('dojo-column-header');
    if (!header) return;
    header.setAttribute('icon', this._icon);
    header.setAttribute('column-name', this._name);
    header.setAttribute('count', this._count);
    header.setAttribute('total-count', this._totalCount);
    if (this._accentColor) header.setAttribute('accent-color', this._accentColor);
    else header.removeAttribute('accent-color');
  }

  // ── Drag & Drop de columnas (reorder) ────────────────────────────────────

  private _onColumnDragStart = (e: DragEvent): void => {
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/dojo-column-id', this.columnId);
    }
    this.setAttribute('dragging', '');
  };

  private _onColumnDragEnd = (): void => {
    this.removeAttribute('dragging');
    this.removeAttribute('drag-column-over');
  };

  private _onColumnDragOver = (e: DragEvent): void => {
    // Solo reaccionar si hay una columna siendo arrastrada (no una tarea)
    if (e.dataTransfer?.types.includes('text/dojo-column-id')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.setAttribute('drag-column-over', '');
    }
  };

  private _onColumnDragLeave = (e: DragEvent): void => {
    if (!this.contains(e.relatedTarget as Node)) {
      this.removeAttribute('drag-column-over');
    }
  };

  private _onColumnDrop = (e: DragEvent): void => {
    e.preventDefault();
    this.removeAttribute('drag-column-over');
    const sourceId = e.dataTransfer?.getData('text/dojo-column-id');
    if (!sourceId || sourceId === this.columnId) return;
    this.dispatchEvent(new CustomEvent('dojo:column-reorder', {
      bubbles: true, composed: true,
      detail: { sourceId, targetId: this.columnId },
    }));
  };

  private _attachColumnDragListeners(): void {
    this.addEventListener('dragstart',  this._onColumnDragStart);
    this.addEventListener('dragend',    this._onColumnDragEnd);
    this.addEventListener('dragover',   this._onColumnDragOver);
    this.addEventListener('dragleave',  this._onColumnDragLeave);
    this.addEventListener('drop',       this._onColumnDrop);
  }

  // ── Drop target para tareas ──────────────────────────────────────────────

  private _onDragOver = (e: DragEvent): void => {
    // Reaccionar solo ante arrastres de tarjetas de tarea
    if (!e.dataTransfer?.types.includes('text/dojo-task-id')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.setAttribute('drag-over', '');
    // Calcular posición y actualizar indicador visual
    this._dropBeforeId = this._getDropBeforeId(e);
    this._setDropIndicator(this._dropBeforeId);
  };

  private _onDragLeave = (e: DragEvent): void => {
    if (!this.contains(e.relatedTarget as Node)) {
      this.removeAttribute('drag-over');
      this._clearDropIndicators();
      this._dropBeforeId = null;
    }
  };

  private _onDrop = (e: DragEvent): void => {
    e.preventDefault();
    this.removeAttribute('drag-over');
    this._clearDropIndicators();

    const taskId = e.dataTransfer?.getData('text/dojo-task-id');
    if (!taskId) return;

    const beforeTaskId = this._dropBeforeId;
    this._dropBeforeId = null;

    this.dispatchEvent(new CustomEvent('dojo:column-drop', {
      bubbles:  true,
      composed: true,
      detail: {
        columnId:   this.columnId,
        taskId,
        beforeTaskId,
      },
    }));
  };

  // ── Utilidades de posición de drop ────────────────────────────────────────

  /**
   * Calcula ante qué tarjeta se soltará la tarea arrastrada.
   * Cuando el puntero está por encima del centro de una tarjeta,
   * se inserta antes de esa tarjeta; si está debajo del centro de
   * la última tarjeta, se inserta al final (retorna null).
   */
  private _getDropBeforeId(e: DragEvent): string | null {
    const slot = this._shadow.querySelector('slot');
    if (!slot) return null;
    const cards = (slot as HTMLSlotElement).assignedElements() as HTMLElement[];
    for (const card of cards) {
      const rect  = card.getBoundingClientRect();
      const midY  = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        return card.getAttribute('task-id') ?? null;
      }
    }
    return null; // insertar al final
  }

  /** Pone el indicador de drop en la tarjeta correcta. */
  private _setDropIndicator(beforeId: string | null): void {
    // Guard: evitar mutaciones DOM si la posición no ha cambiado
    if (beforeId === this._lastDropIndicatorId) return;
    this._lastDropIndicatorId = beforeId;

    const slot = this._shadow.querySelector('slot');
    if (!slot) return;
    const cards = (slot as HTMLSlotElement).assignedElements();
    cards.forEach(card => card.removeAttribute('drop-indicator'));

    if (beforeId !== null) {
      const target = cards.find(c => c.getAttribute('task-id') === beforeId);
      if (target) target.setAttribute('drop-indicator', 'top');
    } else if (cards.length > 0) {
      // Insertar al final: indicador bajo la última tarjeta
      cards[cards.length - 1].setAttribute('drop-indicator', 'bottom');
    }
  }

  /** Elimina todos los indicadores de drop de las tarjetas asignadas al slot. */
  private _clearDropIndicators(): void {
    this._lastDropIndicatorId = undefined; // limpiar cache
    const slot = this._shadow.querySelector('slot');
    if (!slot) return;
    (slot as HTMLSlotElement).assignedElements()
      .forEach(card => card.removeAttribute('drop-indicator'));
  }

  private _attachDragListeners(): void {
    this.addEventListener('dragover',  this._onDragOver);
    this.addEventListener('dragleave', this._onDragLeave);
    this.addEventListener('drop',      this._onDrop);
  }

  private _detachDragListeners(): void {
    this.removeEventListener('dragover',  this._onDragOver);
    this.removeEventListener('dragleave', this._onDragLeave);
    this.removeEventListener('drop',      this._onDrop);
    // Limpiar también los listeners de drag de columna
    this.removeEventListener('dragstart', this._onColumnDragStart);
    this.removeEventListener('dragend',   this._onColumnDragEnd);
    this.removeEventListener('dragover',  this._onColumnDragOver);
    this.removeEventListener('dragleave', this._onColumnDragLeave);
    this.removeEventListener('drop',      this._onColumnDrop);
  }
}

customElements.define(DojoKanbanColumn.TAG, DojoKanbanColumn);
