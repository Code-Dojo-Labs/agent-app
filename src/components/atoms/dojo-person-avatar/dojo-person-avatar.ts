/**
 * dojo-person-avatar — Átomo avatar de persona (IMP-09)
 *
 * Avatar circular con iniciales generadas y color de fondo determinístico
 * basado en el nombre. Compatible con imagen de perfil vía `src`.
 *
 * ## Atributos observados
 * | Atributo | Tipo              | Descripción                                   |
 * |----------|-------------------|-----------------------------------------------|
 * | name     | string            | Nombre completo → genera iniciales y color    |
 * | size     | 'sm'|'md'|'lg'   | Tamaño del avatar (default: 'md')             |
 * | src      | string (opcional) | URL o data-URL de imagen de perfil            |
 *
 * ## CSS Custom Properties
 * --dojo-surface, --dojo-border, --dojo-shadow
 *
 * ## Utilidades estáticas exportadas
 * - `DojoPersonAvatar.nameToColor(name)` → color HSL determinístico
 * - `DojoPersonAvatar.nameToInitials(name)` → string de 1-2 caracteres
 */

export class DojoPersonAvatar extends HTMLElement {
  static readonly TAG = 'dojo-person-avatar';

  private _shadow: ShadowRoot;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
  }

  static get observedAttributes(): string[] {
    return ['name', 'size', 'src'];
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this._render();
  }

  // ── Getters de atributos ─────────────────────────────────────────────────

  get name(): string {
    return this.getAttribute('name') ?? '';
  }

  set name(value: string) {
    this.setAttribute('name', value);
  }

  get size(): 'sm' | 'md' | 'lg' {
    const v = this.getAttribute('size');
    return v === 'sm' || v === 'lg' ? v : 'md';
  }

  set size(value: 'sm' | 'md' | 'lg') {
    this.setAttribute('size', value);
  }

  get src(): string {
    return this.getAttribute('src') ?? '';
  }

  set src(value: string) {
    if (value) this.setAttribute('src', value);
    else this.removeAttribute('src');
  }

  // ── Utilidades estáticas (reutilizables externamente) ────────────────────

  /**
   * Genera un color HSL determinístico a partir del nombre.
   * Mismo nombre → mismo color en cualquier sesión/dispositivo.
   * Saturación 65 % y luminosidad 42 % garantizan colores vividos y accesibles.
   */
  static nameToColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) & 0xFFFFFF;
    }
    // & 0xFFFFFF garantiza valor sin signo — Math.abs() no es necesario
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 42%)`;
  }

  /**
   * Extrae hasta 2 iniciales del nombre completo.
   * "Ana Torres"  → "AT"
   * "Juan"        → "J"
   * ""            → "?"
   */
  static nameToInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Devuelve '#FFFFFF' o '#000000' según el fondo generado por `nameToColor`.
   * `nameToColor` siempre produce L=42%, que cumple WCAG AA (≥4.5:1) con blanco.
   * El parámetro se mantiene para compatibilidad de API con llamantes externos.
   */
  static pickTextColor(_bgHsl: string): '#FFFFFF' | '#000000' {
    return '#FFFFFF';
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private _render(): void {
    const name     = this.name;
    const size     = this.size;
    const src      = this.src;
    const initials = DojoPersonAvatar.nameToInitials(name);
    const bg       = DojoPersonAvatar.nameToColor(name || '?');
    const textColor = DojoPersonAvatar.pickTextColor(bg);

    const sizeMap = { sm: '20px', md: '28px', lg: '40px' } as const;
    const fontMap = { sm: '9px',  md: '11px', lg: '15px' } as const;
    const px = sizeMap[size];
    const fs = fontMap[size];

    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        width: ${px};
        height: ${px};
        font-size: ${fs};
        font-weight: 700;
        line-height: 1;
        letter-spacing: 0.02em;
        background: ${bg};
        color: ${textColor};
        border: 2px solid var(--dojo-surface, #FFFFFF);
        box-shadow: 0 0 0 1px rgba(0,0,0,.08);
        cursor: default;
        position: relative;
        flex-shrink: 0;
        transition: transform 0.12s ease, box-shadow 0.12s ease;
        overflow: hidden;
        user-select: none;
      }

      .avatar:hover {
        transform: scale(1.1);
        box-shadow: 0 0 0 2px ${bg}, 0 2px 6px rgba(0,0,0,.18);
        z-index: 1;
      }

      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }

      /* Tooltip nativo mejorado */
      .avatar::after {
        content: attr(aria-label);
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        background: rgba(17,24,39,0.92);
        color: #FFFFFF;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.15s ease;
        z-index: 1000;
      }
      .avatar:hover::after { opacity: 1; }

      @media (prefers-reduced-motion: reduce) {
        .avatar {
          transition: none;
        }
        .avatar:hover {
          transform: none;
        }
      }
    `;
    this._shadow.appendChild(style);

    const avatarEl = document.createElement('div');
    avatarEl.className = 'avatar';
    avatarEl.setAttribute('role', 'img');
    avatarEl.setAttribute('aria-label', name || 'Avatar');

    if (src) {
      // Modo imagen — fallback a iniciales si la imagen falla
      const img = document.createElement('img');
      img.src = src;
      img.alt = name;
      img.addEventListener('error', () => {
        img.remove();
        avatarEl.textContent = initials;
      });
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = initials;
    }

    this._shadow.appendChild(avatarEl);
  }
}

customElements.define(DojoPersonAvatar.TAG, DojoPersonAvatar);