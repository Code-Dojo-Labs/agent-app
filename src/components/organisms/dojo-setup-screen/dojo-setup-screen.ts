/**
 * dojo-setup-screen.ts — Pantalla de selección de modo al primer uso.
 *
 * Web Component: <dojo-setup-screen>
 *
 * Muestra dos opciones al usuario:
 *   A) Modo Local   → datos en IndexedDB, sin cuenta, sin internet requerido.
 *   B) Conectar Supabase → formulario de Project URL + Anon Key con validación.
 *
 * Al completar la elección emite el evento personalizado `dojo-mode-selected`
 * con el detalle { mode: 'local' | 'cloud' } para que el componente raíz
 * oculte esta pantalla y muestre el tablero.
 *
 * Storage:
 *   - localStorage['dojo_mode_chosen']    → 'local' cuando elige modo local.
 *   - localStorage['dojo_supabase_config'] → JSON con { projectUrl, anonKey }.
 *
 * Theming: variables CSS --dojo-* para soporte de temas.
 * A11Y: roles ARIA, foco gestionado, mensajes de error accesibles.
 */

import {
  SupabaseClient,
  saveSupabaseConfig,
  setLocalModeChosen,
} from '../../../db/supabase-client.js';

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
    max-width: 480px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0,0,0,.4);
  }

  .logo {
    text-align: center;
    font-size: 2.5rem;
    margin-bottom: .5rem;
  }

  h1 {
    font-size: 1.4rem;
    font-weight: 700;
    text-align: center;
    margin: 0 0 .5rem;
    color: var(--dojo-text, #e2e8f0);
  }

  .subtitle {
    text-align: center;
    font-size: .875rem;
    color: var(--dojo-text-muted, #94a3b8);
    margin: 0 0 2rem;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .option-btn {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.25rem 1rem;
    border-radius: .75rem;
    border: 2px solid var(--dojo-border, #334155);
    background: var(--dojo-surface-raised, #273144);
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: border-color .2s, background .2s;
    color: inherit;
  }

  .option-btn:hover,
  .option-btn:focus-visible {
    border-color: var(--dojo-primary, #6366f1);
    background: var(--dojo-surface-hover, #1e2d45);
    outline: none;
  }

  .option-icon {
    font-size: 1.75rem;
    line-height: 1;
    flex-shrink: 0;
    margin-top: .1rem;
  }

  .option-text h2 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 .25rem;
    color: var(--dojo-text, #e2e8f0);
  }

  .option-text p {
    font-size: .8125rem;
    color: var(--dojo-text-muted, #94a3b8);
    margin: 0;
    line-height: 1.5;
  }

  /* ── Formulario Supabase ─── */
  .form-section {
    margin-top: 1.5rem;
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

  .help-link {
    font-size: .8rem;
    color: var(--dojo-primary, #6366f1);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: .25rem;
  }

  .help-link:hover { text-decoration: underline; }

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

  .success-msg {
    font-size: .8125rem;
    color: var(--dojo-success, #4ade80);
    padding: .5rem .75rem;
    border-radius: .5rem;
    background: rgba(74,222,128,.1);
    border: 1px solid rgba(74,222,128,.2);
    display: none;
  }

  .success-msg.visible { display: block; }

  .btn-row {
    display: flex;
    gap: .75rem;
  }

  .btn {
    flex: 1;
    padding: .75rem 1rem;
    border-radius: .5rem;
    border: none;
    cursor: pointer;
    font-size: .875rem;
    font-weight: 600;
    font-family: inherit;
    transition: opacity .2s, transform .1s;
  }

  .btn:active { transform: scale(.97); }
  .btn:disabled { opacity: .5; cursor: not-allowed; }

  .btn-primary {
    background: var(--dojo-primary, #6366f1);
    color: #fff;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--dojo-primary-hover, #4f46e5);
  }

  .btn-secondary {
    background: transparent;
    color: var(--dojo-text-muted, #94a3b8);
    border: 1px solid var(--dojo-border, #334155);
  }

  .btn-secondary:hover:not(:disabled) {
    color: var(--dojo-text, #e2e8f0);
    border-color: var(--dojo-text-muted, #94a3b8);
  }

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

  /* ── Responsive ─── */
  @media (max-width: 480px) {
    .card { padding: 1.75rem 1.25rem; }
  }
`;

// ── Template HTML ───────────────────────────────────────────────────────────

const TEMPLATE = /* html */ `
  <div class="card" role="main">
    <div class="logo" aria-hidden="true">🥋</div>
    <h1>¿Cómo quieres usar Dojo Kanban?</h1>
    <p class="subtitle">Elige tu modo de trabajo. Puedes cambiarlo más adelante desde Ajustes.</p>

    <div class="options" id="mode-options">
      <button class="option-btn" id="btn-local" type="button" aria-describedby="desc-local">
        <span class="option-icon" aria-hidden="true">🖥️</span>
        <span class="option-text">
          <h2>Modo Local</h2>
          <p id="desc-local">Sin cuenta. Todos tus datos quedan en este navegador. Funciona sin internet.</p>
        </span>
      </button>

      <button class="option-btn" id="btn-cloud" type="button" aria-describedby="desc-cloud" aria-expanded="false">
        <span class="option-icon" aria-hidden="true">☁️</span>
        <span class="option-text">
          <h2>Conectar mi Supabase</h2>
          <p id="desc-cloud">Sincroniza entre dispositivos usando tu propio proyecto gratuito de Supabase.</p>
        </span>
      </button>
    </div>

    <form class="form-section" id="supabase-form" hidden aria-label="Configuración de Supabase">
      <div class="field">
        <label for="project-url">Project URL</label>
        <input
          type="url"
          id="project-url"
          name="projectUrl"
          placeholder="https://xxxx.supabase.co"
          autocomplete="off"
          spellcheck="false"
          required
        />
      </div>

      <div class="field">
        <label for="anon-key">Anon Key</label>
        <input
          type="password"
          id="anon-key"
          name="anonKey"
          placeholder="eyJhbGciOiJIUzI1NiIs..."
          autocomplete="off"
          spellcheck="false"
          required
        />
      </div>

      <a
        class="help-link"
        href="https://supabase.com/dashboard"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir el dashboard de Supabase para obtener las credenciales (se abre en nueva pestaña)"
      >
        ¿Dónde encuentro estos valores? →
      </a>

      <div class="error-msg" id="form-error" role="alert" aria-live="assertive"></div>
      <div class="success-msg" id="form-success" role="status" aria-live="polite"></div>

      <div class="btn-row">
        <button type="button" class="btn btn-secondary" id="btn-back">Volver</button>
        <button type="submit" class="btn btn-primary" id="btn-connect">Conectar</button>
      </div>
    </form>
  </div>
`;

// ── Web Component ───────────────────────────────────────────────────────────

export class DojoSetupScreen extends HTMLElement {
  private _shadow: ShadowRoot;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
    this._bindEvents();
  }

  private _render(): void {
    const style = document.createElement('style');
    style.textContent = CSS;

    const tpl = document.createElement('template');
    tpl.innerHTML = TEMPLATE;

    this._shadow.appendChild(style);
    this._shadow.appendChild(tpl.content.cloneNode(true));
  }

  private _bindEvents(): void {
    this._shadow.getElementById('btn-local')!
      .addEventListener('click', () => this._chooseLocal());

    this._shadow.getElementById('btn-cloud')!
      .addEventListener('click', () => this._showSupabaseForm());

    this._shadow.getElementById('btn-back')!
      .addEventListener('click', () => this._hideSupabaseForm());

    this._shadow.getElementById('supabase-form')!
      .addEventListener('submit', (e: Event) => {
        e.preventDefault();
        void this._handleConnect();
      });
  }

  // ── Acciones ───────────────────────────────────────────────────────────────

  private _chooseLocal(): void {
    setLocalModeChosen();
    this._emit('local');
  }

  private _showSupabaseForm(): void {
    const options = this._shadow.getElementById('mode-options')!;
    const form    = this._shadow.getElementById('supabase-form')!;
    const btnCloud = this._shadow.getElementById('btn-cloud')!;

    options.style.display = 'none';
    form.removeAttribute('hidden');
    btnCloud.setAttribute('aria-expanded', 'true');
    (this._shadow.getElementById('project-url') as HTMLInputElement).focus();
  }

  private _hideSupabaseForm(): void {
    const options = this._shadow.getElementById('mode-options')!;
    const form    = this._shadow.getElementById('supabase-form')!;
    const btnCloud = this._shadow.getElementById('btn-cloud')!;

    options.style.display = '';
    form.setAttribute('hidden', '');
    btnCloud.setAttribute('aria-expanded', 'false');
    this._clearMessages();
  }

  private async _handleConnect(): Promise<void> {
    const urlInput  = this._shadow.getElementById('project-url') as HTMLInputElement;
    const keyInput  = this._shadow.getElementById('anon-key')   as HTMLInputElement;
    const btnSubmit = this._shadow.getElementById('btn-connect') as HTMLButtonElement;

    const projectUrl = urlInput.value.trim();
    const anonKey    = keyInput.value.trim();

    if (!projectUrl || !anonKey) {
      this._showError('Completa ambos campos antes de continuar.');
      return;
    }

    this._clearMessages();
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner"></span>Verificando...';

    const valid = await SupabaseClient.validateCredentials({ projectUrl, anonKey });

    if (!valid) {
      this._showError('No se pudo conectar. Verifica que la URL y el Anon Key sean correctos.');
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Conectar';
      return;
    }

    this._showSuccess('¡Conexión exitosa! Guardando configuración...');
    saveSupabaseConfig({ projectUrl, anonKey });

    // Pequeña pausa para que el usuario vea el mensaje de éxito
    await new Promise(res => setTimeout(res, 800));
    this._emit('cloud');
  }

  // ── Helpers UI ─────────────────────────────────────────────────────────────

  private _showError(msg: string): void {
    const el = this._shadow.getElementById('form-error')!;
    el.textContent = msg;
    el.classList.add('visible');
  }

  private _showSuccess(msg: string): void {
    const el = this._shadow.getElementById('form-success')!;
    el.textContent = msg;
    el.classList.add('visible');
  }

  private _clearMessages(): void {
    this._shadow.getElementById('form-error')!.classList.remove('visible');
    this._shadow.getElementById('form-success')!.classList.remove('visible');
  }

  private _emit(mode: 'local' | 'cloud'): void {
    this.dispatchEvent(new CustomEvent('dojo-mode-selected', {
      detail:  { mode },
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('dojo-setup-screen', DojoSetupScreen);
