/**
 * dojo-toast — Átomo de Notificación
 * 
 * Notificación flotante con auto-dismiss y animación de slide-up.
 * Soporta 4 variantes: success, warning, error, info.
 */

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

export class DojoToast extends HTMLElement {
  static readonly TAG = 'dojo-toast';

  static get observedAttributes(): string[] {
    return ['variant', 'duration', 'dismissible'];
  }

  private _shadow: ShadowRoot;
  private _timeoutId: ReturnType<typeof setTimeout> | null = null;
  private _isShowing = false;
  private _dismissBtn: HTMLButtonElement | null = null;
  private _undoBtn: HTMLButtonElement | null = null;
  private _container: HTMLElement | null = null;

  get isShowing(): boolean { return this._isShowing; }

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (this._shadow.childElementCount === 0) {
      this._render();
    }
    this._scheduleAutoClose();
  }

  disconnectedCallback(): void {
    // Limpiar timeout
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    
    // Limpiar event listeners de botones
    if (this._dismissBtn) {
      this._dismissBtn.removeEventListener('click', this._onClickDismiss);
      this._dismissBtn = null;
    }
    if (this._undoBtn) {
      this._undoBtn.removeEventListener('click', this._onClickUndo);
      this._undoBtn = null;
    }
    
    // Limpiar referencias de contenedor
    this._container = null;
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this._render();
  }

  // ── Getters ────────────────────────────────────────────────────────────

  get variant(): ToastVariant { 
    const v = this.getAttribute('variant');
    return (v === 'success' || v === 'warning' || v === 'error' || v === 'info') 
      ? v 
      : 'info';
  }

  get duration(): number {
    const d = this.getAttribute('duration');
    const parsed = d ? parseInt(d, 10) : 3000;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
  }

  get isDismissible(): boolean {
    return this.hasAttribute('dismissible');
  }

  get undoLabel(): string {
    return this.getAttribute('undo-label') ?? 'Deshacer';
  }

  // ── Métodos públicos ───────────────────────────────────────────────────

  dismiss(): void {
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    this._performDismiss();
  }

  show(): void {
    if (!this._isShowing) {
      this._isShowing = true;
      if (this.isConnected) {
        this._render();
        this._scheduleAutoClose();
      }
    }
  }

  // ── Métodos privados ───────────────────────────────────────────────────

  private _scheduleAutoClose(): void {
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
    }
    const duration = this.duration;
    if (duration > 0) {
      this._timeoutId = setTimeout(() => {
        if (this._isShowing) {
          this._performDismiss();
        }
      }, duration);
    }
  }

  private _performDismiss(): void {
    this._isShowing = false;
    const container = this._container || this._shadow.querySelector('.toast-container');
    if (container) {
      container.classList.add('dismissing');
      
      // Esperar a que la animación termine ANTES de remover el elemento
      const removeToast = () => {
        this.dispatchEvent(new CustomEvent('dojo:toast-dismiss', {
          bubbles: true,
          composed: true,
        }));
        if (this.parentElement) {
          this.parentElement.removeChild(this);
        }
      };
      
      // Escuchar el evento de fin de animación
      const handleAnimationEnd = () => {
        container.removeEventListener('animationend', handleAnimationEnd);
        removeToast();
      };
      container.addEventListener('animationend', handleAnimationEnd, { once: true });
      
      // Fallback en caso de que animationend no dispare (170ms es buffer de seguridad)
      setTimeout(removeToast, 170);
    }
  }

  private _onClickDismiss = (): void => {
    this.dismiss();
  };

  private _onClickUndo = (): void => {
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    this.dispatchEvent(new CustomEvent('dojo:toast-undo', {
      bubbles: true,
      composed: true,
    }));
    this.dismiss();
  };

  // ── Configuración de variantes ──────────────────────────────────────────

  private static readonly VARIANT_CONFIG: Record<ToastVariant, { icon: string; color: string }> = {
    success: { icon: '✅', color: 'var(--dojo-toast-success, #10B981)' },
    warning: { icon: '⚠️', color: 'var(--dojo-toast-warning, #F59E0B)' },
    error:   { icon: '❌', color: 'var(--dojo-toast-error, #EF4444)' },
    info:    { icon: 'ℹ️', color: 'var(--dojo-toast-info, #3B82F6)' },
  } as const;

  // ── Render ──────────────────────────────────────────────────────────────

  private _render(): void {
    const vConfig = DojoToast.VARIANT_CONFIG[this.variant];

    // Limpiar referencias previas de botones
    if (this._dismissBtn) {
      this._dismissBtn.removeEventListener('click', this._onClickDismiss);
      this._dismissBtn = null;
    }
    if (this._undoBtn) {
      this._undoBtn.removeEventListener('click', this._onClickUndo);
      this._undoBtn = null;
    }

    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        z-index: 9999;
        font-family: inherit;
        animation: slide-up-in 0.2s ease forwards;
      }

      @keyframes slide-up-in {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slide-down-out {
        from {
          opacity: 1;
          transform: translateY(0);
        }
        to {
          opacity: 0;
          transform: translateY(8px);
        }
      }

      .toast-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-left: 4px solid ${vConfig.color};
        border-radius: var(--dojo-radius, 6px);
        padding: 0.875rem 1rem;
        box-shadow: 0 4px 12px rgba(0,0,0,.15);
        min-width: 300px;
        max-width: 400px;
      }

      .toast-container.dismissing {
        animation: slide-down-out 0.15s ease forwards;
      }

      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none;
        }
        .toast-container,
        .toast-container.dismissing {
          animation: none;
        }
      }

      .toast-icon {
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      .toast-content {
        flex: 1;
        min-width: 0;
      }

      .toast-message {
        font-size: 0.9375rem;
        color: var(--dojo-text-primary);
        margin: 0;
        line-height: 1.4;
      }

      .toast-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
      }

      .toast-undo-btn,
      .toast-dismiss-btn {
        background: transparent;
        border: 1px solid var(--dojo-border);
        padding: 0.375rem 0.75rem;
        border-radius: 4px;
        font-size: 0.8125rem;
        font-weight: 500;
        cursor: pointer;
        color: var(--dojo-text-secondary);
        transition: background 0.15s, color 0.15s;
        font-family: inherit;
      }

      .toast-undo-btn {
        color: ${vConfig.color};
        border-color: ${vConfig.color};
      }

      .toast-undo-btn:hover {
        background: ${vConfig.color}20;
      }

      .toast-dismiss-btn:hover {
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
      }

      .toast-undo-btn:focus-visible,
      .toast-dismiss-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      @media (max-width: 480px) {
        :host {
          bottom: 0.5rem;
          right: 0.5rem;
          left: 0.5rem;
        }
        .toast-container {
          min-width: auto;
          max-width: none;
        }
      }
    `;
    this._shadow.appendChild(style);

    const container = document.createElement('div');
    this._container = container;  // Guardar referencia
    container.className = 'toast-container';
    container.role = 'status';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = vConfig.icon;
    container.appendChild(icon);

    const content = document.createElement('div');
    content.className = 'toast-content';
    const message = document.createElement('p');
    message.className = 'toast-message';
    message.appendChild(document.createElement('slot'));
    content.appendChild(message);
    container.appendChild(content);

    const actions = document.createElement('div');
    actions.className = 'toast-actions';

    if (this.variant === 'warning' && this.hasAttribute('show-undo')) {
      const undoBtn = document.createElement('button');
      this._undoBtn = undoBtn;  // Guardar referencia para cleanup
      undoBtn.className = 'toast-undo-btn';
      undoBtn.type = 'button';
      undoBtn.textContent = this.undoLabel;
      undoBtn.setAttribute('aria-label', this.undoLabel);
      undoBtn.addEventListener('click', this._onClickUndo);
      actions.appendChild(undoBtn);
    }

    if (this.isDismissible) {
      const dismissBtn = document.createElement('button');
      this._dismissBtn = dismissBtn;  // Guardar referencia para cleanup
      dismissBtn.className = 'toast-dismiss-btn';
      dismissBtn.type = 'button';
      dismissBtn.textContent = '✕';
      dismissBtn.setAttribute('aria-label', 'Cerrar notificación');
      dismissBtn.addEventListener('click', this._onClickDismiss);
      actions.appendChild(dismissBtn);
    }

    if (actions.children.length > 0) {
      container.appendChild(actions);
    }

    this._shadow.appendChild(container);
  }
}

customElements.define(DojoToast.TAG, DojoToast);
