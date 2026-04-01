/**
 * dojo-column-menu — Átomo
 *
 * Botón ⋮ con menú contextual flotante para acciones de columna.
 * Admite las acciones "Renombrar" y "Eliminar".
 *
 * ## Atributos observados
 * Ninguno — es un componente puramente interactivo.
 *
 * ## Eventos despachados
 * | Nombre                    | Detalle | Descripción                        |
 * |---------------------------|---------|------------------------------------|
 * | dojo:column-rename        | —       | El usuario elige "Renombrar"       |
 * | dojo:column-delete        | —       | El usuario elige "Eliminar"        |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-surface, --dojo-border, --dojo-text-primary, --dojo-text-secondary,
 * --dojo-radius, --dojo-shadow, --dojo-danger (fallback: #DC2626)
 */
export class DojoColumnMenu extends HTMLElement {
    static TAG = 'dojo-column-menu';
    _shadow;
    _open = false;
    _onDocClick = (e) => {
        if (!this.contains(e.target))
            this._close();
    };
    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
        if (this._shadow.childElementCount === 0)
            this._render();
    }
    disconnectedCallback() {
        document.removeEventListener('click', this._onDocClick);
    }
    // ── Render ───────────────────────────────────────────────────────────────
    _render() {
        const style = document.createElement('style');
        style.textContent = `
      :host {
        position: relative;
        display: inline-flex;
      }

      .trigger {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        border-radius: var(--dojo-radius-sm, 4px);
        cursor: pointer;
        color: var(--dojo-text-secondary);
        font-size: 1rem;
        line-height: 1;
        padding: 0;
        transition: background 0.15s;
      }
      .trigger:hover,
      .trigger:focus-visible {
        background: var(--dojo-border);
        color: var(--dojo-text-primary);
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 1px;
      }

      .menu {
        position: absolute;
        top: calc(100% + 4px);
        right: 0;
        min-width: 140px;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius);
        box-shadow: var(--dojo-shadow);
        z-index: 100;
        overflow: hidden;
        display: none;
      }
      .menu[aria-hidden="false"] { display: block; }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 0.875rem;
        color: var(--dojo-text-primary);
        text-align: left;
        transition: background 0.1s;
      }
      .menu-item:hover,
      .menu-item:focus-visible {
        background: var(--dojo-bg);
        outline: none;
      }
      .menu-item.danger { color: var(--dojo-danger, #DC2626); }
      .menu-item .icon  { font-size: 0.875rem; }
    `;
        this._shadow.appendChild(style);
        // Botón trigger ⋮
        const trigger = document.createElement('button');
        trigger.className = 'trigger';
        trigger.setAttribute('aria-label', 'Opciones de columna');
        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.textContent = '⋮';
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggle();
        });
        this._shadow.appendChild(trigger);
        // Menú desplegable
        const menu = document.createElement('div');
        menu.className = 'menu';
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-hidden', 'true');
        const renameBtn = this._createMenuItem('✏️', 'Renombrar', false, () => {
            this._close();
            this.dispatchEvent(new CustomEvent('dojo:column-rename', { bubbles: true, composed: true }));
        });
        const deleteBtn = this._createMenuItem('🗑️', 'Eliminar', true, () => {
            this._close();
            this.dispatchEvent(new CustomEvent('dojo:column-delete', { bubbles: true, composed: true }));
        });
        menu.appendChild(renameBtn);
        menu.appendChild(deleteBtn);
        this._shadow.appendChild(menu);
    }
    _createMenuItem(icon, label, isDanger, onClick) {
        const btn = document.createElement('button');
        btn.className = `menu-item${isDanger ? ' danger' : ''}`;
        btn.setAttribute('role', 'menuitem');
        const iconSpan = document.createElement('span');
        iconSpan.className = 'icon';
        iconSpan.setAttribute('aria-hidden', 'true');
        iconSpan.textContent = icon;
        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        btn.appendChild(iconSpan);
        btn.appendChild(labelSpan);
        btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
        return btn;
    }
    // ── Toggle / Open / Close ─────────────────────────────────────────────────
    _toggle() {
        this._open ? this._close() : this._openMenu();
    }
    _openMenu() {
        this._open = true;
        const trigger = this._shadow.querySelector('.trigger');
        const menu = this._shadow.querySelector('.menu');
        if (trigger)
            trigger.setAttribute('aria-expanded', 'true');
        if (menu)
            menu.setAttribute('aria-hidden', 'false');
        document.addEventListener('click', this._onDocClick);
    }
    _close() {
        this._open = false;
        const trigger = this._shadow.querySelector('.trigger');
        const menu = this._shadow.querySelector('.menu');
        if (trigger)
            trigger.setAttribute('aria-expanded', 'false');
        if (menu)
            menu.setAttribute('aria-hidden', 'true');
        document.removeEventListener('click', this._onDocClick);
    }
}
customElements.define(DojoColumnMenu.TAG, DojoColumnMenu);
