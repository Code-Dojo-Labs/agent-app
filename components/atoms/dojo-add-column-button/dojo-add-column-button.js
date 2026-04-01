/**
 * dojo-add-column-button — Átomo
 *
 * Botón "Añadir columna" que aparece al final del tablero.
 *
 * ## Eventos despachados
 * | Nombre              | Detalle | Descripción                      |
 * |---------------------|---------|----------------------------------|
 * | dojo:add-column     | —       | El usuario solicita agregar col. |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-border, --dojo-text-secondary, --dojo-surface, --dojo-radius,
 * --dojo-primary, --dojo-text-primary
 */
export class DojoAddColumnButton extends HTMLElement {
    static TAG = 'dojo-add-column-button';
    _shadow;
    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
        if (this._shadow.childElementCount === 0)
            this._render();
    }
    _render() {
        const style = document.createElement('style');
        style.textContent = `
      :host {
        display: flex;
        flex-shrink: 0;
        align-self: flex-start;
      }

      .add-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1rem;
        background: var(--dojo-surface);
        border: 2px dashed var(--dojo-border);
        border-radius: var(--dojo-radius);
        cursor: pointer;
        color: var(--dojo-text-secondary);
        font-size: 0.875rem;
        white-space: nowrap;
        transition: border-color 0.15s, color 0.15s, background 0.15s;
        width: 200px;
        min-height: 56px;
        justify-content: center;
      }
      .add-btn:hover,
      .add-btn:focus-visible {
        border-color: var(--dojo-primary, #1D4ED8);
        color: var(--dojo-primary, #1D4ED8);
        background: var(--dojo-bg);
        outline: none;
      }
      .plus {
        font-size: 1.25rem;
        line-height: 1;
      }
    `;
        this._shadow.appendChild(style);
        const btn = document.createElement('button');
        btn.className = 'add-btn';
        btn.setAttribute('aria-label', 'Añadir nueva columna');
        const plus = document.createElement('span');
        plus.className = 'plus';
        plus.setAttribute('aria-hidden', 'true');
        plus.textContent = '+';
        const label = document.createElement('span');
        label.textContent = 'Añadir columna';
        btn.appendChild(plus);
        btn.appendChild(label);
        btn.addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('dojo:add-column', { bubbles: true, composed: true }));
        });
        this._shadow.appendChild(btn);
    }
}
customElements.define(DojoAddColumnButton.TAG, DojoAddColumnButton);
