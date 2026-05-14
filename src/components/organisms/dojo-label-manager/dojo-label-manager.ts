/**
 * dojo-label-manager — Organismo
 *
 * Panel lateral para gestionar las etiquetas existentes.
 * Permite editar el nombre y el color de cualquier etiqueta.
 * Los cambios se persisten en IndexedDB y se propagan al tablero
 * mediante el evento `dojo:label-updated`.
 *
 * ## API pública
 * | Método  | Descripción                                        |
 * |---------|----------------------------------------------------|
 * | show()  | Abre el panel y carga las etiquetas desde IndexedDB|
 * | hide()  | Cierra el panel                                    |
 *
 * ## Eventos despachados
 * | Nombre              | Detalle       | Descripción                         |
 * |---------------------|---------------|-------------------------------------|
 * | dojo:label-updated  | { label }     | Etiqueta actualizada en IndexedDB   |
 *
 * ## Atributos observados
 * | Atributo | Valores      | Descripción        |
 * |----------|--------------|--------------------|
 * | open     | presente/ausente | Panel visible  |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-primary, --dojo-shadow, --dojo-radius
 */

import type { Label } from '../../../types/models.js';
import { getAllLabels, updateLabel, deleteLabel, countTasksByLabelId } from '../../../db/label.repository.js';
import { meetsWcagAA, suggestAccessibleColor } from '../../../utils/contrast.js';

// ── Paleta de colores WCAG AA (contraste ≥ 4.5:1 con #FFFFFF) — US-13 ─────
const PRESET_COLORS = [
  '#B91C1C', '#C2410C', '#B45309', '#15803D',
  '#1D4ED8', '#4338CA', '#6D28D9', '#BE185D',
  '#0E7490', '#374151',
] as const;

const PRESET_COLOR_NAMES = [
  'Rojo', 'Naranja', 'Ámbar', 'Verde',
  'Azul', 'Índigo', 'Violeta', 'Rosa',
  'Cian', 'Gris',
] as const;

// ── Clase ──────────────────────────────────────────────────────────────────

export class DojoLabelManager extends HTMLElement {
  static readonly TAG = 'dojo-label-manager';

  static get observedAttributes(): string[] { return ['open']; }

  private _shadow: ShadowRoot;
  private _labels: Label[] = [];
  private _editingId: string | null = null;
  private _deletingId: string | null = null;
  private _deletingAffectedCount: number = 0;

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
  }

  attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void {
    if (name === 'open') {
      const panel = this._shadow.querySelector<HTMLElement>('.panel');
      const backdrop = this._shadow.querySelector<HTMLElement>('.backdrop');
      const isOpen = newVal !== null;
      if (panel) {
        panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        // inert previene el foco por teclado cuando el panel está cerrado (WCAG 2.1 SC 2.1.2)
        if (isOpen) {
          panel.removeAttribute('inert');
        } else {
          panel.setAttribute('inert', '');
        }
      }
      if (backdrop) backdrop.classList.toggle('visible', isOpen);
    }
  }

  // ── API pública ──────────────────────────────────────────────────────────

  async show(): Promise<void> {
    this._labels = await getAllLabels();
    this._labels.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    this._editingId  = null;
    this._deletingId = null;
    this.setAttribute('open', '');
    this._buildContent();
    requestAnimationFrame(() => {
      this._shadow.querySelector<HTMLButtonElement>('.panel-close')?.focus();
    });
  }

  hide(): void {
    this.removeAttribute('open');
    this._editingId  = null;
    this._deletingId = null;
  }

  // ── Render base ──────────────────────────────────────────────────────────

  private _render(): void {
    this._shadow.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      /* Capa de oscurecimiento */
      .backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.45);
        z-index: 40;
      }
      .backdrop.visible { display: block; }

      /* Panel lateral */
      .panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(360px, 100vw);
        background: var(--dojo-surface);
        border-left: 1px solid var(--dojo-border);
        box-shadow: -4px 0 16px rgba(0,0,0,.12);
        z-index: 50;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateX(100%);
        transition: transform 0.25s ease;
      }
      :host([open]) .panel {
        transform: translateX(0);
      }

      /* Header del panel */
      .panel-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1.25rem;
        border-bottom: 1px solid var(--dojo-border);
        flex-shrink: 0;
      }
      .panel-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
        margin: 0;
        flex: 1;
      }
      .panel-close {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 1.125rem;
        color: var(--dojo-text-secondary);
        padding: 0.25rem;
        border-radius: var(--dojo-radius-sm, 4px);
        line-height: 1;
        transition: color 0.15s, background 0.15s;
      }
      .panel-close:hover { color: var(--dojo-text-primary); background: var(--dojo-bg); }
      .panel-close:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* Contenido desplazable */
      .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem 0;
      }

      /* Estado vacío */
      .empty-state {
        padding: 1.25rem;
        font-size: 0.875rem;
        color: var(--dojo-text-secondary);
        text-align: center;
        margin: 0;
      }

      /* Lista de etiquetas */
      .label-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .label-row {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.5rem 1.25rem;
        border-bottom: 1px solid var(--dojo-border);
      }
      .label-row:last-child { border-bottom: none; }

      /* Chip/punto de color */
      .label-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      /* Nombre */
      .label-name {
        flex: 1;
        font-size: 0.875rem;
        color: var(--dojo-text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Botón editar */
      .edit-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.875rem;
        color: var(--dojo-text-secondary);
        flex-shrink: 0;
        line-height: 1;
        transition: background 0.15s, color 0.15s;
      }
      .edit-btn:hover { background: var(--dojo-bg); color: var(--dojo-text-primary); }
      .edit-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* Botón eliminar */
      .delete-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.875rem;
        color: var(--dojo-text-secondary);
        flex-shrink: 0;
        line-height: 1;
        transition: background 0.15s, color 0.15s;
      }
      .delete-btn:hover { background: var(--dojo-danger-bg); color: var(--dojo-danger-hover); }
      .delete-btn:focus-visible {
        outline: 2px solid #EF4444;
        outline-offset: 2px;
      }

      /* Panel de confirmación de eliminación inline */
      .delete-confirm {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        padding: 0.5rem 0;
      }
      .delete-confirm-msg {
        font-size: 0.8125rem;
        color: var(--dojo-text-primary);
        margin: 0;
        line-height: 1.45;
      }
      .delete-confirm-warning {
        font-size: 0.75rem;
        color: var(--dojo-warning-text);
        margin: 0;
        background: var(--wiki-note-bg);
        border: 1px solid #F59E0B;
        border-radius: var(--dojo-radius-sm, 4px);
        padding: 0.3rem 0.5rem;
      }
      .delete-confirm-actions {
        display: flex;
        gap: 0.375rem;
        justify-content: flex-end;
        padding-top: 0.25rem;
      }
      .delete-btn-cancel {
        padding: 0.25rem 0.625rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.75rem;
        cursor: pointer;
        font-family: inherit;
        border: 1px solid var(--dojo-border);
        background: transparent;
        color: var(--dojo-text-secondary);
        transition: background 0.15s;
      }
      .delete-btn-cancel:hover { background: var(--dojo-bg); color: var(--dojo-text-primary); }
      .delete-btn-confirm {
        padding: 0.25rem 0.625rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.75rem;
        cursor: pointer;
        font-family: inherit;
        background: var(--dojo-danger-light);
        border: 1px solid #EF4444;
        color: var(--dojo-text-on-primary);
        font-weight: 600;
        transition: opacity 0.15s;
      }
      .delete-btn-confirm:hover { opacity: 0.88; }
      .delete-btn-confirm:disabled { opacity: 0.55; cursor: not-allowed; }
      .delete-btn-cancel:focus-visible,
      .delete-btn-confirm:focus-visible {
        outline: 2px solid #EF4444;
        outline-offset: 2px;
      }

      /* Formulario de edición inline */
      .edit-form {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 0.625rem 0;
      }

      .edit-form-label {
        font-size: 0.6875rem;
        font-weight: 700;
        color: var(--dojo-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .edit-name-input {
        font-size: 0.8125rem;
        padding: 0.375rem 0.5rem;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
        font-family: inherit;
        outline: none;
        width: 100%;
        box-sizing: border-box;
      }
      .edit-name-input:focus {
        border-color: var(--dojo-primary, #1D4ED8);
      }

      /* Paleta de colores */
      .edit-color-palette {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3125rem;
      }
      .color-swatch {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        padding: 0;
        outline: none;
        transition: border-color 0.12s, transform 0.12s;
      }
      .color-swatch.selected,
      .color-swatch:focus-visible {
        border-color: var(--dojo-text-primary, #111);
        transform: scale(1.2);
      }

      /* Fila de color personalizado */
      .edit-custom-color-row {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.8125rem;
        color: var(--dojo-text-secondary);
      }
      .edit-color-input {
        width: 36px;
        height: 22px;
        border: 1px solid var(--dojo-border);
        border-radius: 3px;
        padding: 0 2px;
        cursor: pointer;
        background: transparent;
      }

      /* Mensaje de error */
      .edit-error {
        font-size: 0.75rem;
        color: var(--dojo-danger-text);
        margin: 0;
      }

      /* Advertencia de contraste WCAG (US-13) */
      .edit-contrast-warning {
        font-size: 0.75rem;
        color: var(--dojo-warning-text-dark);
        margin: 0;
        background: var(--wiki-note-bg);
        border: 1px solid #F59E0B;
        border-radius: var(--dojo-radius-sm, 4px);
        padding: 0.3rem 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .edit-contrast-suggestion {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 0.75rem;
      }
      .edit-contrast-swatch {
        display: inline-block;
        width: 14px;
        height: 14px;
        border-radius: 3px;
        flex-shrink: 0;
        border: 1px solid rgba(0,0,0,0.2);
      }
      .edit-contrast-apply {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.75rem;
        color: var(--dojo-primary, #1D4ED8);
        padding: 0;
        font-family: inherit;
        text-decoration: underline;
      }
      .edit-contrast-apply:hover { opacity: 0.75; }

      /* Acciones del formulario */
      .edit-actions {
        display: flex;
        gap: 0.375rem;
        justify-content: flex-end;
        padding-top: 0.25rem;
      }
      .edit-btn-secondary {
        padding: 0.25rem 0.625rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.75rem;
        cursor: pointer;
        font-family: inherit;
        border: 1px solid var(--dojo-border);
        background: transparent;
        color: var(--dojo-text-secondary);
        transition: background 0.15s;
      }
      .edit-btn-secondary:hover { background: var(--dojo-bg); color: var(--dojo-text-primary); }
      .edit-btn-primary {
        padding: 0.25rem 0.625rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.75rem;
        cursor: pointer;
        font-family: inherit;
        background: var(--dojo-primary, #1D4ED8);
        border: 1px solid var(--dojo-primary, #1D4ED8);
        color: var(--dojo-text-on-primary);
        font-weight: 600;
        transition: opacity 0.15s;
      }
      .edit-btn-primary:hover { opacity: 0.88; }
      .edit-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
      .edit-btn-secondary:focus-visible,
      .edit-btn-primary:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }
    `;
    this._shadow.appendChild(style);

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', () => this.hide());
    this._shadow.appendChild(backdrop);

    // Panel
    const panel = document.createElement('aside');
    panel.className = 'panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'lm-title');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('inert', ''); // Panel inactivo por defecto (WCAG 2.1 SC 2.1.2)

    // Header
    const panelHeader = document.createElement('div');
    panelHeader.className = 'panel-header';

    const panelTitle = document.createElement('h2');
    panelTitle.id = 'lm-title';
    panelTitle.className = 'panel-title';
    panelTitle.textContent = 'Gestionar etiquetas';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'panel-close';
    closeBtn.type = 'button';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Cerrar panel de etiquetas');
    closeBtn.addEventListener('click', () => this.hide());

    panelHeader.appendChild(panelTitle);
    panelHeader.appendChild(closeBtn);
    panel.appendChild(panelHeader);

    // Contenido desplazable (se rellena en _buildContent)
    const content = document.createElement('div');
    content.className = 'panel-content';
    panel.appendChild(content);

    this._shadow.appendChild(panel);

    // Teclado: Escape cierra el panel
    this._shadow.addEventListener('keydown', ((e: Event) => {
      if ((e as KeyboardEvent).key === 'Escape' && this.hasAttribute('open')) this.hide();
    }) as EventListener);
  }

  // ── Construcción dinámica del listado ────────────────────────────────────

  private _buildContent(): void {
    const content = this._shadow.querySelector('.panel-content');
    if (!content) return;
    content.innerHTML = '';

    if (this._labels.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No hay etiquetas. Crea una desde el panel de detalle de una tarea.';
      content.appendChild(empty);
      return;
    }

    const list = document.createElement('ul');
    list.className = 'label-list';
    list.setAttribute('role', 'list');

    for (const label of this._labels) {
      list.appendChild(this._buildLabelRow(label));
    }

    content.appendChild(list);
  }

  private _buildLabelRow(label: Label): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'label-row';
    item.dataset['labelId'] = label.id;

    if (this._editingId === label.id) {
      item.appendChild(this._buildEditForm(label));
    } else if (this._deletingId === label.id) {
      item.appendChild(this._buildDeleteConfirm(label));
    } else {
      const dot = document.createElement('span');
      dot.className = 'label-dot';
      dot.style.backgroundColor = label.color;
      dot.setAttribute('aria-hidden', 'true');

      const nameEl = document.createElement('span');
      nameEl.className = 'label-name';
      nameEl.textContent = label.name;
      nameEl.setAttribute('title', label.name);

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.type = 'button';
      editBtn.textContent = '✏️';
      editBtn.setAttribute('aria-label', `Editar etiqueta "${label.name}"`);
      editBtn.addEventListener('click', () => {
        this._editingId  = label.id;
        this._deletingId = null;
        this._buildContent();
        requestAnimationFrame(() => {
          this._shadow.querySelector<HTMLInputElement>('.edit-name-input')?.focus();
        });
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.type = 'button';
      deleteBtn.textContent = '🗑️';
      deleteBtn.setAttribute('aria-label', `Eliminar etiqueta "${label.name}"`);
      deleteBtn.addEventListener('click', async () => {
        this._editingId  = null;
        this._deletingId = label.id;
        this._deletingAffectedCount = await countTasksByLabelId(label.id);
        this._buildContent();
        requestAnimationFrame(() => {
          this._shadow.querySelector<HTMLButtonElement>('.delete-btn-cancel')?.focus();
        });
      });

      item.appendChild(dot);
      item.appendChild(nameEl);
      item.appendChild(editBtn);
      item.appendChild(deleteBtn);
    }

    return item;
  }

  private _buildDeleteConfirm(label: Label): HTMLElement {
    const container = document.createElement('div');
    container.className = 'delete-confirm';

    const msg = document.createElement('p');
    msg.className = 'delete-confirm-msg';
    msg.textContent = `¿Eliminar la etiqueta "${label.name}"?`;
    container.appendChild(msg);

    if (this._deletingAffectedCount > 0) {
      const warning = document.createElement('p');
      warning.className = 'delete-confirm-warning';
      warning.setAttribute('role', 'alert');
      warning.textContent =
        `Esta etiqueta está asignada a ${this._deletingAffectedCount} ` +
        `${this._deletingAffectedCount === 1 ? 'tarea' : 'tareas'}.`;
      container.appendChild(warning);
    }

    const actions = document.createElement('div');
    actions.className = 'delete-confirm-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'delete-btn-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {
      this._deletingId = null;
      this._buildContent();
    });

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'delete-btn-confirm';
    confirmBtn.textContent = 'Eliminar';
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '…';
      try {
        await deleteLabel(label.id);
        const deletedId = label.id;
        this._labels = this._labels.filter(l => l.id !== deletedId);
        this._deletingId = null;
        this._buildContent();
        this.dispatchEvent(new CustomEvent('dojo:label-deleted', {
          bubbles: true, composed: true,
          detail: { labelId: deletedId },
        }));
      } catch (err) {
        console.error('[dojo-label-manager] Error al eliminar etiqueta:', err);
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Eliminar';
      }
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    container.appendChild(actions);

    return container;
  }

  private _buildEditForm(label: Label): HTMLElement {
    const form = document.createElement('div');
    form.className = 'edit-form';

    // Nombre
    const nameSection = document.createElement('label');
    nameSection.className = 'edit-form-label';
    nameSection.textContent = 'Nombre';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'edit-name-input';
    nameInput.value = label.name;
    nameInput.maxLength = 30;
    nameInput.setAttribute('aria-label', 'Nombre de la etiqueta');
    nameSection.appendChild(nameInput);
    form.appendChild(nameSection);

    // Color — título
    const colorTitle = document.createElement('div');
    colorTitle.className = 'edit-form-label';
    colorTitle.textContent = 'Color';
    form.appendChild(colorTitle);

    // Estado pendiente de color
    let pendingColor: string = label.color;

    // Paleta de swatches
    const palette = document.createElement('div');
    palette.className = 'edit-color-palette';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.className = 'edit-color-input';
    colorInput.value = pendingColor;
    colorInput.setAttribute('aria-label', 'Color personalizado');

    for (let i = 0; i < PRESET_COLORS.length; i++) {
      const c = PRESET_COLORS[i];
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'color-swatch' + (pendingColor === c ? ' selected' : '');
      swatch.style.backgroundColor = c;
      swatch.setAttribute('aria-label', `Color ${PRESET_COLOR_NAMES[i]}`);
      swatch.setAttribute('title', PRESET_COLOR_NAMES[i]);
      swatch.dataset['color'] = c;
      swatch.addEventListener('click', () => {
        pendingColor = c;
        colorInput.value = c;
        palette.querySelectorAll('.color-swatch').forEach(s => {
          s.classList.toggle('selected', (s as HTMLElement).dataset['color'] === c);
        });
      });
      palette.appendChild(swatch);
    }

    colorInput.addEventListener('input', () => {
      pendingColor = colorInput.value;
      palette.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.toggle('selected', (s as HTMLElement).dataset['color'] === pendingColor);
      });
      // Validación de contraste WCAG 2.1 (US-13)
      updateContrastWarning(pendingColor);
    });

    form.appendChild(palette);

    // Fila de color personalizado
    const customRow = document.createElement('div');
    customRow.className = 'edit-custom-color-row';
    const customLabel = document.createElement('span');
    customLabel.textContent = 'Personalizado:';
    customRow.appendChild(customLabel);
    customRow.appendChild(colorInput);
    form.appendChild(customRow);

    // Advertencia de contraste WCAG (US-13)
    const contrastWarning = document.createElement('div');
    contrastWarning.className = 'edit-contrast-warning';
    contrastWarning.setAttribute('role', 'alert');
    contrastWarning.style.display = 'none';
    form.appendChild(contrastWarning);

    // Helper para mostrar/ocultar la advertencia y bloquear el guardado
    const updateContrastWarning = (color: string): void => {
      const isPreset = (PRESET_COLORS as readonly string[]).includes(color);
      if (isPreset || meetsWcagAA('#FFFFFF', color)) {
        contrastWarning.style.display = 'none';
        saveBtn.disabled = false;
        return;
      }
      // Calcular sugerencia
      const suggested = suggestAccessibleColor(color, '#FFFFFF');
      contrastWarning.innerHTML = '';
      const msg = document.createElement('span');
      msg.textContent = 'El color no tiene suficiente contraste con texto blanco (mínimo 4.5:1 WCAG AA).';
      contrastWarning.appendChild(msg);

      const suggestionRow = document.createElement('span');
      suggestionRow.className = 'edit-contrast-suggestion';
      const swatch = document.createElement('span');
      swatch.className = 'edit-contrast-swatch';
      swatch.style.backgroundColor = suggested;
      swatch.setAttribute('aria-hidden', 'true');
      const applyBtn = document.createElement('button');
      applyBtn.className = 'edit-contrast-apply';
      applyBtn.type = 'button';
      applyBtn.textContent = `Usar versión accesible (${suggested})`;
      applyBtn.addEventListener('click', () => {
        pendingColor = suggested;
        colorInput.value = suggested;
        palette.querySelectorAll('.color-swatch').forEach(s => {
          s.classList.toggle('selected', (s as HTMLElement).dataset['color'] === suggested);
        });
        updateContrastWarning(suggested);
      });
      suggestionRow.appendChild(swatch);
      suggestionRow.appendChild(applyBtn);
      contrastWarning.appendChild(suggestionRow);
      contrastWarning.style.display = '';
      saveBtn.disabled = true;
    };


    // Mensaje de error
    const errorEl = document.createElement('p');
    errorEl.className = 'edit-error';
    errorEl.setAttribute('role', 'alert');
    errorEl.style.display = 'none';
    form.appendChild(errorEl);

    // Acciones
    const actions = document.createElement('div');
    actions.className = 'edit-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'edit-btn-secondary';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => {
      this._editingId = null;
      this._buildContent();
    });

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'edit-btn-primary';
    saveBtn.textContent = 'Guardar';
    saveBtn.addEventListener('click', async () => {
      const newName = nameInput.value.trim();
      if (!newName) {
        errorEl.textContent = 'El nombre no puede estar vacío.';
        errorEl.style.display = '';
        return;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = '…';
      try {
        const updated = await updateLabel(label.id, { name: newName, color: pendingColor });
        // Actualizar caché local
        this._labels = this._labels.map(l => l.id === updated.id ? updated : l);
        this._editingId = null;
        this._buildContent();
        // Notificar al tablero para que propague los cambios a las tarjetas
        this.dispatchEvent(new CustomEvent('dojo:label-updated', {
          bubbles: true, composed: true,
          detail: { label: updated },
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al guardar la etiqueta';
        errorEl.textContent = msg;
        errorEl.style.display = '';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar';
      }
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);
    form.appendChild(actions);
    // Ejecutar validación inicial (por si el color actual no cumple WCAG)
    updateContrastWarning(pendingColor);

    return form;
  }
}

customElements.define(DojoLabelManager.TAG, DojoLabelManager);
