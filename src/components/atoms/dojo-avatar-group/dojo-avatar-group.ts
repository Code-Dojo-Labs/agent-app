/**
 * dojo-avatar-group — Átomo para mostrar un grupo de avatares apilados (IMP-09)
 *
 * Renderiza una fila de avatares circulares solapados. Si el número de personas
 * supera `max`, muestra un badge `+N` con el mismo estilo.
 *
 * ## Propiedad JS
 * - `persons` → `{ id: string; name: string; src?: string }[]`
 *
 * ## Atributos
 * - `max`  → number — máximo de avatares visibles antes del badge (default: 3)
 * - `size` → 'sm'|'md'|'lg' — tamaño de cada avatar (default: 'sm')
 *
 * ## CSS Custom Properties
 * --dojo-surface, --dojo-border (heredadas por dojo-person-avatar)
 */

import { DojoPersonAvatar } from '../dojo-person-avatar/dojo-person-avatar.js';

type PersonLike = { id: string; name: string; src?: string };

export class DojoAvatarGroup extends HTMLElement {
  static readonly TAG = 'dojo-avatar-group';

  private _shadow: ShadowRoot;
  private _persons: PersonLike[] = [];

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
  }

  static get observedAttributes(): string[] {
    return ['max', 'size'];
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this._render();
  }

  // ── Propiedad JS para pasar personas ────────────────────────────────────

  get persons(): PersonLike[] {
    return this._persons;
  }

  set persons(value: PersonLike[]) {
    this._persons = value ?? [];
    if (this.isConnected) this._render();
  }

  // ── Getters de atributos ─────────────────────────────────────────────────

  get max(): number {
    return parseInt(this.getAttribute('max') ?? '3', 10) || 3;
  }

  get size(): 'sm' | 'md' | 'lg' {
    const v = this.getAttribute('size');
    return v === 'md' || v === 'lg' ? v : 'sm';
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private _render(): void {
    const persons  = this._persons;
    const max      = this.max;
    const size     = this.size;

    const visible   = persons.slice(0, max);
    const remaining = persons.length - visible.length;

    // Tamaño en px según el size elegido
    const sizePx = size === 'lg' ? 40 : size === 'md' ? 28 : 20;
    // Solapamiento: ~35 % del diámetro
    const overlap = Math.round(sizePx * 0.35);

    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-flex;
        align-items: center;
      }

      .group {
        display: flex;
        align-items: center;
        flex-direction: row-reverse; /* para que el z-index tenga efecto natural */
      }

      /* Cada avatar (o badge) tiene margen negativo a la derecha  */
      .group > * {
        margin-right: -${overlap}px;
        transition: transform 0.12s ease;
      }
      .group > *:last-child {
        margin-right: 0;
      }

      /* Hover: el grupo se expande ligeramente */
      .group:hover > * {
        margin-right: -${Math.round(overlap * 0.4)}px;
      }
      .group:hover > *:last-child {
        margin-right: 0;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: ${sizePx}px;
        height: ${sizePx}px;
        border-radius: 50%;
        background: var(--dojo-border, #E5E7EB);
        color: var(--dojo-text-secondary, #6B7280);
        font-size: ${size === 'lg' ? '13px' : size === 'md' ? '10px' : '8px'};
        font-weight: 700;
        border: 2px solid var(--dojo-surface, #FFFFFF);
        box-shadow: 0 0 0 1px rgba(0,0,0,.08);
        cursor: default;
        flex-shrink: 0;
        user-select: none;
      }
    `;
    this._shadow.appendChild(style);

    const group = document.createElement('div');
    group.className = 'group';
    group.setAttribute('role', 'list');
    group.setAttribute(
      'aria-label',
      `${persons.length} persona${persons.length !== 1 ? 's' : ''} asignada${persons.length !== 1 ? 's' : ''}`,
    );

    // Badge "+N" — al estar en row-reverse, va primero en el DOM
    if (remaining > 0) {
      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = `+${remaining}`;
      badge.setAttribute('title', `${remaining} persona${remaining !== 1 ? 's' : ''} más`);
      badge.setAttribute('aria-hidden', 'true');
      group.appendChild(badge);
    }

    // Avatares (en orden inverso para que el primero quede encima)
    const reversed = [...visible].reverse();
    for (const person of reversed) {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('role', 'listitem');

      const avatar = document.createElement('dojo-person-avatar') as DojoPersonAvatar;
      avatar.setAttribute('name', person.name);
      avatar.setAttribute('size', size);
      if (person.src) avatar.setAttribute('src', person.src);

      wrapper.appendChild(avatar);
      group.appendChild(wrapper);
    }

    this._shadow.appendChild(group);
  }
}

customElements.define(DojoAvatarGroup.TAG, DojoAvatarGroup);
