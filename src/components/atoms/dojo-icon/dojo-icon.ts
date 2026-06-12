/**
 * dojo-icon — Átomo de Iconografía SVG
 * 
 * Componente para renderizar iconos SVG desde un sprite centralizado.
 * Soporta personalización de tamaño y color mediante atributos.
 * 
 * @example
 * <dojo-icon name="edit" size="lg" color="var(--dojo-primary)"></dojo-icon>
 */

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type IconName = 
  // Prioridad
  | 'priority-low' | 'priority-medium' | 'priority-high' | 'priority-urgent'
  // Acciones
  | 'edit' | 'delete' | 'close' | 'add' | 'drag-handle'
  // Estado
  | 'calendar' | 'label' | 'assignee' | 'subtask'
  // Navegación
  | 'chevron-down' | 'search' | 'filter' | 'board-view' | 'list-view'
  // Sistema
  | 'check' | 'warning' | 'info';

export class DojoIcon extends HTMLElement {
  static readonly TAG = 'dojo-icon';

  static get observedAttributes(): string[] {
    return ['name', 'size', 'color'];
  }

  private _shadow: ShadowRoot;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (this._shadow.childElementCount === 0) {
      this._render();
    }
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this._render();
  }

  // ── Getters ────────────────────────────────────────────────────────────

  get name(): IconName {
    const n = this.getAttribute('name');
    return this._isValidIconName(n) ? (n as IconName) : 'info';
  }

  get size(): IconSize {
    const s = this.getAttribute('size');
    return (s === 'xs' || s === 'sm' || s === 'md' || s === 'lg' || s === 'xl' || s === '2xl')
      ? s
      : 'md';
  }

  get color(): string {
    return this.getAttribute('color') ?? 'currentColor';
  }

  // ── Validación ──────────────────────────────────────────────────────────

  private _isValidIconName(name: string | null): boolean {
    const validNames: IconName[] = [
      'priority-low', 'priority-medium', 'priority-high', 'priority-urgent',
      'edit', 'delete', 'close', 'add', 'drag-handle',
      'calendar', 'label', 'assignee', 'subtask',
      'chevron-down', 'search', 'filter', 'board-view', 'list-view',
      'check', 'warning', 'info'
    ];
    return validNames.includes(name as IconName);
  }

  private _getSizeClasses(): Record<IconSize, { width: string; height: string }> {
    return {
      xs: { width: '12px', height: '12px' },
      sm: { width: '16px', height: '16px' },
      md: { width: '20px', height: '20px' },
      lg: { width: '24px', height: '24px' },
      xl: { width: '32px', height: '32px' },
      '2xl': { width: '40px', height: '40px' }
    };
  }

  // ── Render ──────────────────────────────────────────────────────────────

  private _render(): void {
    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      svg {
        width: 100%;
        height: 100%;
        display: block;
        color: ${this.color};
        stroke: ${this.color};
        fill: ${this.color};
      }

      @media (prefers-reduced-motion: reduce) {
        svg {
          animation: none !important;
        }
      }
    `;
    this._shadow.appendChild(style);

    // Obtener dimensiones según tamaño
    const sizeConfig = this._getSizeClasses()[this.size];

    // Crear SVG que referencia el sprite
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', sizeConfig.width);
    svg.setAttribute('height', sizeConfig.height);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.color = this.color;
    svg.style.stroke = this.color;
    svg.style.fill = this.color;

    // Crear elemento use que referencia el símbolo del sprite
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    const path = document.location.pathname;
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `${path}icons/sprite.svg#icon-${this.name}`);
    
    svg.appendChild(use);
    this._shadow.appendChild(svg);
  }
}

customElements.define(DojoIcon.TAG, DojoIcon);
