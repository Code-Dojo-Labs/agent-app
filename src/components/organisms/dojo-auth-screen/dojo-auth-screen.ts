/**
 * dojo-auth-screen.ts — Pantalla de login / registro para el modo Supabase.
 *
 * Web Component: <dojo-auth-screen>
 *
 * Solo se muestra cuando Supabase está configurado y no hay sesión activa.
 *
 * Modos:
 *   - 'login'    → formulario de email + contraseña
 *   - 'register' → formulario de registro (email + contraseña + confirmación)
 *
 * Eventos emitidos:
 *   - `dojo-auth-success` → el usuario inició sesión correctamente.
 *   - `dojo-auth-logout`  → el usuario cerró sesión.
 *
 * OAuth: botones para Google y GitHub que redirigen al proveedor configurado
 * en el proyecto personal del usuario (sin lógica adicional en la app).
 *
 * Theming: variables CSS --dojo-* para soporte de temas.
 * A11Y: roles ARIA, foco gestionado, mensajes de error accesibles.
 */

import { getSupabaseClient } from '../../../db/supabase-client.js';

// ── Estilos encapsulados ────────────────────────────────────────────────────

const CSS = /* css */ `
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    background: var(--dojo-bg, #0f172a);
    font-family: var(--dojo-font-family, system-ui, sans-serif);
    color: var(--dojo-text, #e2e8f0);
    padding: 1rem;
    box-sizing: border-box;
  }

  .card {
    background: var(--dojo-surface, #1e293b);
    border: 1px solid var(--dojo-border, #334155);
    border-radius: 1rem;
    padding: 2.5rem 2rem;
    max-width: 420px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0,0,0,.4);
  }

  .logo {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: .5rem;
  }

  h1 {
    font-size: 1.3rem;
    font-weight: 700;
    text-align: center;
    margin: 0 0 .375rem;
    color: var(--dojo-text, #e2e8f0);
  }

  .subtitle {
    text-align: center;
    font-size: .8125rem;
    color: var(--dojo-text-muted, #94a3b8);
    margin: 0 0 1.75rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field label {
    display: block;
    font-size: .8125rem;
    font-weight: 500;
    margin-bottom: .4rem;
    color: var(--dojo-text-muted, #94a3b8);
  }

  .field input {
    width: 100%;
    box-sizing: border-box;
    padding: .65rem .875rem;
    border-radius: .5rem;
    border: 1px solid var(--dojo-border, #334155);
    background: var(--dojo-input-bg, #0f172a);
    color: var(--dojo-text, #e2e8f0);
    font-size: .875rem;
    font-family: inherit;
    transition: border-color .2s;
  }

  .field input:focus {
    outline: none;
    border-color: var(--dojo-primary, #6366f1);
  }

  .error-msg {
    font-size: .8125rem;
    color: var(--dojo-error, #f87171);
    padding: .5rem .75rem;
    border-radius: .5rem;
    background: rgba(248,113,113,.1);
    border: 1px solid rgba(248,113,113,.2);
    display: none;
  }

  .error-msg.visible { display: block; }

  .btn {
    width: 100%;
    padding: .75rem 1rem;
    border-radius: .5rem;
    border: none;
    cursor: pointer;
    font-size: .9rem;
    font-weight: 600;
    font-family: inherit;
    transition: opacity .2s, transform .1s;
  }

  .btn:active { transform: scale(.97); }
  .btn:disabled { opacity: .5; cursor: not-allowed; }

  .btn-primary {
    background: var(--dojo-primary, #6366f1);
    color: #fff;
    margin-top: .25rem;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--dojo-primary-hover, #4f46e5);
  }

  /* ── Separador OAuth ─── */
  .divider {
    display: flex;
    align-items: center;
    gap: .75rem;
    margin: .5rem 0;
    color: var(--dojo-text-muted, #94a3b8);
    font-size: .75rem;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--dojo-border, #334155);
  }

  .oauth-buttons {
    display: flex;
    gap: .75rem;
  }

  .btn-oauth {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    padding: .6rem .875rem;
    border-radius: .5rem;
    border: 1px solid var(--dojo-border, #334155);
    background: var(--dojo-surface-raised, #273144);
    color: var(--dojo-text, #e2e8f0);
    cursor: pointer;
    font-size: .8125rem;
    font-weight: 500;
    font-family: inherit;
    transition: border-color .2s, background .2s;
  }

  .btn-oauth:hover {
    border-color: var(--dojo-primary, #6366f1);
    background: var(--dojo-surface-hover, #1e2d45);
  }

  .toggle-link {
    text-align: center;
    font-size: .8125rem;
    color: var(--dojo-text-muted, #94a3b8);
    margin-top: .25rem;
  }

  .toggle-link button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--dojo-primary, #6366f1);
    font-size: inherit;
    font-weight: 600;
    padding: 0;
    font-family: inherit;
  }

  .toggle-link button:hover { text-decoration: underline; }

  .spinner {
    display: inline-block;
    width: .875rem;
    height: .875rem;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin .6s linear infinite;
    vertical-align: middle;
    margin-right: .4rem;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 480px) {
    .card { padding: 1.75rem 1.25rem; }
    .oauth-buttons { flex-direction: column; }
  }
`;

// ── Tipos ───────────────────────────────────────────────────────────────────

type AuthMode = 'login' | 'register';

// ── Web Component ───────────────────────────────────────────────────────────

export class DojoAuthScreen extends HTMLElement {
  private _shadow: ShadowRoot;
  private _mode: AuthMode = 'login';

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  private _render(): void {
    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = CSS;
    this._shadow.appendChild(style);

    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('role', 'main');
    card.innerHTML = this._buildHTML();
    this._shadow.appendChild(card);

    this._bindEvents();

    // Enfocar primer campo
    requestAnimationFrame(() => {
      (this._shadow.getElementById('email') as HTMLInputElement | null)?.focus();
    });
  }

  private _buildHTML(): string {
    const isLogin = this._mode === 'login';
    return /* html */ `
      <div class="logo" aria-hidden="true">🥋</div>
      <h1>${isLogin ? 'Bienvenido de vuelta' : 'Crear cuenta'}</h1>
      <p class="subtitle">
        ${isLogin
          ? 'Inicia sesión en tu proyecto personal de Supabase.'
          : 'Regístrate con tu proyecto personal de Supabase.'}
      </p>

      <form id="auth-form" novalidate aria-label="${isLogin ? 'Formulario de login' : 'Formulario de registro'}">
        <div class="field">
          <label for="email">Correo electrónico</label>
          <input
            type="email"
            id="email"
            name="email"
            autocomplete="email"
            placeholder="tu@correo.com"
            required
          />
        </div>

        <div class="field">
          <label for="password">Contraseña</label>
          <input
            type="password"
            id="password"
            name="password"
            autocomplete="${isLogin ? 'current-password' : 'new-password'}"
            placeholder="••••••••"
            minlength="6"
            required
          />
        </div>

        ${!isLogin ? /* html */ `
        <div class="field">
          <label for="password-confirm">Confirmar contraseña</label>
          <input
            type="password"
            id="password-confirm"
            name="passwordConfirm"
            autocomplete="new-password"
            placeholder="••••••••"
            minlength="6"
            required
          />
        </div>` : ''}

        <div class="error-msg" id="auth-error" role="alert" aria-live="assertive"></div>

        <button type="submit" class="btn btn-primary" id="btn-submit">
          ${isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>

        <div class="divider">o continúa con</div>

        <div class="oauth-buttons">
          <button type="button" class="btn-oauth" id="btn-google" aria-label="Iniciar sesión con Google">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>

          <button type="button" class="btn-oauth" id="btn-github" aria-label="Iniciar sesión con GitHub">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub
          </button>
        </div>

        <p class="toggle-link">
          ${isLogin
            ? '¿No tienes cuenta? <button type="button" id="btn-toggle">Regístrate</button>'
            : '¿Ya tienes cuenta? <button type="button" id="btn-toggle">Inicia sesión</button>'}
        </p>
      </form>
    `;
  }

  // ── Eventos ────────────────────────────────────────────────────────────────

  private _bindEvents(): void {
    this._shadow.getElementById('auth-form')!
      .addEventListener('submit', (e: Event) => { e.preventDefault(); void this._handleSubmit(); });

    this._shadow.getElementById('btn-toggle')!
      .addEventListener('click', () => {
        this._mode = this._mode === 'login' ? 'register' : 'login';
        this._render();
      });

    this._shadow.getElementById('btn-google')!
      .addEventListener('click', () => this._oauthLogin('google'));

    this._shadow.getElementById('btn-github')!
      .addEventListener('click', () => this._oauthLogin('github'));
  }

  private async _handleSubmit(): Promise<void> {
    const emailInput    = this._shadow.getElementById('email')    as HTMLInputElement;
    const pwInput       = this._shadow.getElementById('password') as HTMLInputElement;
    const pwConfirmInput = this._shadow.getElementById('password-confirm') as HTMLInputElement | null;
    const btnSubmit     = this._shadow.getElementById('btn-submit') as HTMLButtonElement;

    const email    = emailInput.value.trim();
    const password = pwInput.value;

    if (!email || !password) {
      this._showError('Completa todos los campos.');
      return;
    }

    if (this._mode === 'register') {
      const confirm = pwConfirmInput?.value ?? '';
      if (password !== confirm) {
        this._showError('Las contraseñas no coinciden.');
        return;
      }
      if (password.length < 6) {
        this._showError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
    }

    this._clearError();
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner"></span>${this._mode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...'}`;

    const client = getSupabaseClient();
    if (!client) {
      this._showError('Supabase no está configurado. Ve a Ajustes para conectarlo.');
      btnSubmit.disabled = false;
      btnSubmit.textContent = this._mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
      return;
    }

    try {
      if (this._mode === 'login') {
        await client.signIn(email, password);
      } else {
        await client.signUp(email, password);
      }
      this._emitSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido.';
      this._showError(msg);
      btnSubmit.disabled = false;
      btnSubmit.textContent = this._mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
    }
  }

  private _oauthLogin(provider: 'google' | 'github'): void {
    const client = getSupabaseClient();
    if (!client) {
      this._showError('Supabase no está configurado.');
      return;
    }
    client.signInWithOAuth(provider);
  }

  // ── Helpers UI ─────────────────────────────────────────────────────────────

  private _showError(msg: string): void {
    const el = this._shadow.getElementById('auth-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
  }

  private _clearError(): void {
    const el = this._shadow.getElementById('auth-error');
    if (!el) return;
    el.textContent = '';
    el.classList.remove('visible');
  }

  private _emitSuccess(): void {
    this.dispatchEvent(new CustomEvent('dojo-auth-success', {
      bubbles:  true,
      composed: true,
    }));
  }
}

customElements.define('dojo-auth-screen', DojoAuthScreen);
