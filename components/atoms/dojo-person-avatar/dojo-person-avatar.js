/**
 * dojo-person-avatar — Átomo avatar de persona
 *
 * Muestra el avatar (emoji o inicial) de una persona asignada a tareas.
 * Soporta tooltips con el nombre completo y indicating si es emoji o inicial generada.
 *
 * ## Atributos
 * - `avatar`  → string  — emoji o inicial(es) de la persona
 * - `name`    → string  — nombre completo para tooltip
 * - `size`    → 'sm' | 'md' | 'lg' — tamaño del avatar (default: 'md')
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-primary,
 * --dojo-radius-sm, --dojo-primary
 */
export class DojoPersonAvatar extends HTMLElement {
    static TAG = 'dojo-person-avatar';
    _shadow;
    constructor() {
        super();
        this._shadow = this.attachShadow({ mode: 'open' });
    }
    connectedCallback() {
        if (this._shadow.childElementCount > 0)
            return;
        this._render();
    }
    static get observedAttributes() {
        return ['avatar', 'name', 'size'];
    }
    attributeChangedCallback() {
        if (this._shadow.childElementCount > 0) {
            this._render();
        }
    }
    // ── Getters de atributos ─────────────────────────────────────────────────
    get avatar() {
        return this.getAttribute('avatar') || '?';
    }
    set avatar(value) {
        this.setAttribute('avatar', value);
    }
    get name() {
        return this.getAttribute('name') || 'Persona sin nombre';
    }
    set name(value) {
        this.setAttribute('name', value);
    }
    get size() {
        const value = this.getAttribute('size');
        return value === 'sm' || value === 'lg' ? value : 'md';
    }
    set size(value) {
        this.setAttribute('size', value);
    }
    // ── Render ────────────────────────────────────────────────────────────────
    _render() {
        const avatar = this.avatar;
        const name = this.name;
        const size = this.size;
        // Detectar si es emoji o iniciales
        const isEmoji = this._isEmoji(avatar);
        const style = document.createElement('style');
        style.textContent = `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--dojo-radius-sm, 6px);
        background: ${isEmoji ? 'transparent' : 'var(--dojo-primary, #3B82F6)'};
        color: ${isEmoji ? 'inherit' : '#FFFFFF'};
        font-weight: 600;
        cursor: default;
        position: relative;
        border: 1px solid var(--dojo-border, #E5E7EB);
        transition: all 0.15s ease;
      }

      .avatar:hover {
        transform: scale(1.05);
        border-color: var(--dojo-primary, #3B82F6);
      }

      /* Tamaños */
      .avatar--sm {
        width: 20px;
        height: 20px;
        font-size: 10px;
        line-height: 1;
      }

      .avatar--md {
        width: 28px;
        height: 28px;
        font-size: ${isEmoji ? '14px' : '12px'};
        line-height: 1;
      }

      .avatar--lg {
        width: 36px;
        height: 36px;
        font-size: ${isEmoji ? '18px' : '14px'};
        line-height: 1;
      }

      /* Tooltip */
      .avatar::after {
        content: attr(title);
        position: absolute;
        bottom: 110%;
        left: 50%;
        transform: translateX(-50%);
        background: var(--dojo-surface, #1F2937);
        color: #FFFFFF;
        padding: 4px 8px;
        border-radius: var(--dojo-radius-sm, 6px);
        font-size: 12px;
        font-weight: 400;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
        z-index: 1000;
      }

      .avatar:hover::after {
        opacity: 1;
      }

      /* Responsive */
      @media (max-width: 640px) {
        .avatar--md {
          width: 24px;
          height: 24px;
          font-size: ${isEmoji ? '12px' : '10px'};
        }
      }
    `;
        const avatarEl = document.createElement('div');
        avatarEl.className = `avatar avatar--${size}`;
        avatarEl.textContent = avatar;
        avatarEl.title = name;
        this._shadow.innerHTML = '';
        this._shadow.appendChild(style);
        this._shadow.appendChild(avatarEl);
    }
    // ── Utilidades ────────────────────────────────────────────────────────────
    /**
     * Detecta si un string contiene emojis.
     * Regex simplificado que cubre la mayoría de emojis Unicode.
     */
    _isEmoji(str) {
        const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
        return emojiRegex.test(str);
    }
}
// Registrar el componente
customElements.define(DojoPersonAvatar.TAG, DojoPersonAvatar);
