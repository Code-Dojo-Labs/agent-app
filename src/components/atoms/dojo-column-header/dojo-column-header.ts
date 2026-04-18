/**
 * dojo-column-header — Átomo
 *
 * Cabecera de una columna del tablero Kanban.
 * Muestra el ícono, el nombre y el conteo de tareas de la columna.
 *
 * Cuando hay filtros activos, el conteo se muestra en formato "visibles / totales".
 *
 * ## Atributos observados
 * | Atributo      | Tipo   | Descripción                                         |
 * |---------------|--------|-----------------------------------------------------|
 * | icon          | string | Emoji o carácter que representa el estado           |
 * | column-name   | string | Nombre visible de la columna                        |
 * | count         | number | Número de tareas visibles                           |
 * | total-count   | number | Total de tareas (sin filtro). Si omitido = count    |
 * | accent-color  | string | Color hex de acento opcional (borde superior)       |
 * | wip-limit     | number | Límite WIP de la columna (US-32). Omitido = sin lím |
 *
 * ## Eventos despachados
 * Ninguno en esta versión.
 *
 * ## CSS Custom Properties heredadas
 * --dojo-text-primary, --dojo-text-secondary, --dojo-surface, --dojo-border,
 * --dojo-radius, --dojo-bg, --dojo-warning, --dojo-danger
 */

export class DojoColumnHeader extends HTMLElement {
  static readonly TAG = 'dojo-column-header';

  static get observedAttributes(): string[] {
    return ['icon', 'column-name', 'count', 'total-count', 'accent-color', 'wip-limit'];
  }

  private _shadow: ShadowRoot;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this._render();
  }

  // ── Getters de atributos ─────────────────────────────────────────────────

  private get _icon(): string         { return this.getAttribute('icon') ?? '📋'; }
  private get _columnName(): string   { return this.getAttribute('column-name') ?? ''; }
  private get _count(): number        { return Number(this.getAttribute('count') ?? 0); }
  private get _totalCount(): number   {
    const t = this.getAttribute('total-count');
    return t !== null ? Number(t) : this._count;
  }
  private get _accentColor(): string | null { return this.getAttribute('accent-color'); }
  private get _wipLimit(): number | null {
    const v = this.getAttribute('wip-limit');
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 ? n : null;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  private _render(): void {
    const hasFilter  = this._count !== this._totalCount;
    const wipLimit   = this._wipLimit;
    const totalTasks = this._totalCount;

    // US-32: determinar estado WIP
    let wipState: 'none' | 'normal' | 'warning' | 'exceeded' = 'none';
    if (wipLimit !== null) {
      if (totalTasks >= wipLimit)            wipState = 'exceeded';
      else if (totalTasks >= wipLimit * 0.8) wipState = 'warning';
      else                                    wipState = 'normal';
    }

    const countLabel = hasFilter
      ? `${this._count} / ${this._totalCount}`
      : `${this._count}`;

    const accentStyle = this._accentColor
      ? `border-top: 3px solid ${this._accentColor};`
      : 'border-top: 3px solid var(--dojo-border);';

    this._shadow.innerHTML = '';

    // ── Estilos ────────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem 0.5rem;
        background: var(--dojo-surface);
        border-radius: var(--dojo-radius) var(--dojo-radius) 0 0;
        ${accentStyle}
        user-select: none;
      }
      .icon {
        font-size: 1rem;
        line-height: 1;
        flex-shrink: 0;
      }
      .name {
        flex: 1;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--dojo-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .badge {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--dojo-text-secondary);
        background: var(--dojo-bg);
        border: 1px solid var(--dojo-border);
        border-radius: 9999px;
        padding: 0.125rem 0.5rem;
        flex-shrink: 0;
        min-width: 1.5rem;
        text-align: center;
      }
      .badge[data-filtered="true"] {
        color: var(--dojo-primary, #1D4ED8);
        border-color: var(--dojo-primary, #1D4ED8);
      }
      /* US-32: estados WIP */
      .badge[data-wip="warning"] {
        color: var(--dojo-warning, #D97706);
        border-color: var(--dojo-warning, #D97706);
        background: color-mix(in srgb, var(--dojo-warning, #D97706) 10%, var(--dojo-bg));
      }
      .badge[data-wip="exceeded"] {
        color: var(--dojo-danger, #DC2626);
        border-color: var(--dojo-danger, #DC2626);
        background: color-mix(in srgb, var(--dojo-danger, #DC2626) 10%, var(--dojo-bg));
        font-weight: 700;
      }
      .wip-indicator {
        font-size: 0.8125rem;
        flex-shrink: 0;
        cursor: default;
      }
    `;
    this._shadow.appendChild(style);

    // ── Markup ─────────────────────────────────────────────────────────────
    const header = document.createElement('header');
    header.className = 'header';
    header.setAttribute('role', 'heading');
    header.setAttribute('aria-level', '2');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = this._icon;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'name';
    nameSpan.textContent = this._columnName;

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.dataset.filtered = String(hasFilter);
    if (wipState !== 'none') badge.dataset.wip = wipState;
    badge.textContent = wipLimit !== null
      ? `${totalTasks} / ${wipLimit}`
      : countLabel;
    badge.setAttribute('aria-label',
      wipLimit !== null
        ? `${totalTasks} de ${wipLimit} tareas (límite WIP)`
        : hasFilter
          ? `${this._count} tareas visibles de ${this._totalCount} totales`
          : `${this._count} tareas`
    );

    header.appendChild(iconSpan);
    header.appendChild(nameSpan);

    // US-32: indicador visual WIP
    const wipIndicators: Record<string, { icon: string; label: string; tooltip: string }> = {
      warning:  { icon: '⚠️', label: 'Advertencia: próximo al límite WIP', tooltip: `Próximo al límite WIP (${totalTasks}/${wipLimit})` },
      exceeded: { icon: '🔴', label: 'Límite WIP superado',                tooltip: `Límite WIP superado (${totalTasks}/${wipLimit})` },
    };
    const wipCfg = wipIndicators[wipState];
    if (wipCfg) {
      const indicator = document.createElement('span');
      indicator.className = 'wip-indicator';
      indicator.textContent = wipCfg.icon;
      indicator.title = wipCfg.tooltip;
      indicator.setAttribute('aria-label', wipCfg.label);
      header.appendChild(indicator);
    }

    header.appendChild(badge);
    this._shadow.appendChild(header);
  }
}

customElements.define(DojoColumnHeader.TAG, DojoColumnHeader);
