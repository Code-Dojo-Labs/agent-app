/**
 * dojo-kanban-column — Molécula
 *
 * Columna del tablero Kanban con scroll vertical independiente.
 * Contiene un `<dojo-column-header>` y una zona de contenido (slot)
 * donde se colocarán las tarjetas de tareas (`<dojo-task-card>`).
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
 * | Nombre            | Detalle                      | Descripción              |
 * |-------------------|------------------------------|--------------------------|
 * | dojo:column-drop  | { columnId, taskId, order }  | Tarea dropeada en columna|
 *
 * ## CSS Custom Properties heredadas
 * --dojo-surface, --dojo-border, --dojo-radius, --dojo-bg, --dojo-shadow
 */

import '../../atoms/dojo-column-header/dojo-column-header.js';

export class DojoKanbanColumn extends HTMLElement {
  static readonly TAG = 'dojo-kanban-column';

  static get observedAttributes(): string[] {
    return ['column-id', 'column-name', 'icon', 'count', 'total-count', 'accent-color'];
  }

  private _shadow: ShadowRoot;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
    this._attachDragListeners();
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
    `;
    this._shadow.appendChild(style);

    // ── Header ─────────────────────────────────────────────────────────────
    const header = document.createElement('dojo-column-header') as HTMLElement;
    header.setAttribute('icon', this._icon);
    header.setAttribute('column-name', this._name);
    header.setAttribute('count', this._count);
    header.setAttribute('total-count', this._totalCount);
    if (this._accentColor) header.setAttribute('accent-color', this._accentColor);
    this._shadow.appendChild(header);

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

  // ── Drag & Drop (drop target) ─────────────────────────────────────────────

  private _onDragOver = (e: DragEvent): void => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    this.setAttribute('drag-over', '');
  };

  private _onDragLeave = (e: DragEvent): void => {
    // Solo quitar el atributo cuando el puntero sale del host o de sus hijos
    if (!this.contains(e.relatedTarget as Node)) {
      this.removeAttribute('drag-over');
    }
  };

  private _onDrop = (e: DragEvent): void => {
    e.preventDefault();
    this.removeAttribute('drag-over');

    const taskId = e.dataTransfer?.getData('text/plain');
    if (!taskId) return;

    this.dispatchEvent(new CustomEvent('dojo:column-drop', {
      bubbles:  true,
      composed: true,
      detail: {
        columnId: this.columnId,
        taskId,
      },
    }));
  };

  private _attachDragListeners(): void {
    this.addEventListener('dragover',   this._onDragOver);
    this.addEventListener('dragleave',  this._onDragLeave);
    this.addEventListener('drop',       this._onDrop);
  }

  private _detachDragListeners(): void {
    this.removeEventListener('dragover',  this._onDragOver);
    this.removeEventListener('dragleave', this._onDragLeave);
    this.removeEventListener('drop',      this._onDrop);
  }
}

customElements.define(DojoKanbanColumn.TAG, DojoKanbanColumn);
