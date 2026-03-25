/**
 * dojo-add-task-button — Átomo
 *
 * Botón compacto "＋ Agregar tarea" situado al pie de cada columna del tablero.
 * Al ser activado (clic o teclado) emite el evento `dojo:add-task` con el
 * `columnId` que toma del atributo `column-id` del elemento padre más cercano.
 *
 * ## Atributos observados
 * | Atributo   | Tipo   | Descripción                         |
 * |------------|--------|-------------------------------------|
 * | column-id  | string | ID de la columna a la que pertenece |
 *
 * ## Eventos despachados
 * | Nombre        | Detalle        | Descripción                        |
 * |---------------|----------------|------------------------------------|
 * | dojo:add-task | { columnId }   | Usuario solicitó crear nueva tarea |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-border, --dojo-text-muted, --dojo-primary, --dojo-radius-sm
 */

export class DojoAddTaskButton extends HTMLElement {
  static readonly TAG = 'dojo-add-task-button';

  static get observedAttributes(): string[] {
    return ['column-id'];
  }

  private _shadow: ShadowRoot;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (this._shadow.childElementCount === 0) this._render();
  }

  attributeChangedCallback(): void {
    // Actualizar el columnId del botón interno si cambia el atributo
    const btn = this._shadow.querySelector('button');
    if (btn) btn.dataset.columnId = this.getAttribute('column-id') ?? '';
  }

  get columnId(): string {
    return this.getAttribute('column-id') ?? '';
  }

  private _render(): void {
    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        padding: 0 0.5rem 0.5rem;
        flex-shrink: 0;
      }

      button {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        width: 100%;
        padding: 0.4375rem 0.625rem;
        background: transparent;
        border: 1px dashed var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        color: var(--dojo-text-muted, var(--dojo-text-secondary));
        font-size: 0.8125rem;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s, color 0.15s;
        text-align: left;
      }

      button:hover {
        background: color-mix(in srgb, var(--dojo-primary, #1D4ED8) 6%, transparent);
        border-color: var(--dojo-primary, #1D4ED8);
        color: var(--dojo-primary, #1D4ED8);
      }

      button:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      .icon {
        font-size: 1rem;
        line-height: 1;
        flex-shrink: 0;
      }
    `;
    this._shadow.appendChild(style);

    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Agregar tarea a esta columna');
    btn.dataset.columnId = this.columnId;

    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '+';

    const label = document.createElement('span');
    label.textContent = 'Agregar tarea';

    btn.appendChild(icon);
    btn.appendChild(label);
    this._shadow.appendChild(btn);

    btn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('dojo:add-task', {
        bubbles:  true,
        composed: true,
        detail:   { columnId: this.columnId },
      }));
    });
  }
}

customElements.define(DojoAddTaskButton.TAG, DojoAddTaskButton);
