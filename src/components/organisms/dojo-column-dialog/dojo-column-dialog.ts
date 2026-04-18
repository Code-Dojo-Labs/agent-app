/**
 * dojo-column-dialog — Organismo
 *
 * Diálogo modal para gestión de columnas: crear, renombrar y eliminar.
 *
 * ## Modos
 * | Modo     | Descripción                                             |
 * |----------|---------------------------------------------------------|
 * | create   | Formulario para nombre + ícono de nueva columna        |
 * | rename   | Formulario para cambiar el nombre de una columna       |
 * | delete   | Confirmación: mover tareas a otra columna o eliminarlas|
 *
 * ## API Pública
 * | Método                                              | Descripción              |
 * |-----------------------------------------------------|--------------------------|
 * | openCreate()                                        | Abre en modo "crear"     |
 * | openRename(columnId, currentName)                   | Abre en modo "renombrar" |
 * | openDelete(columnId, columnName, otherColumns)      | Abre en modo "eliminar"  |
 *
 * ## Eventos despachados
 * | Nombre                     | Detalle                                     |
 * |----------------------------|---------------------------------------------|
 * | dojo:dialog-create-column  | { name, icon }                              |
 * | dojo:dialog-rename-column  | { columnId, name }                          |
 * | dojo:dialog-delete-column  | { columnId, action: 'move'|'delete', targetColumnId? } |
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*, --dojo-primary,
 * --dojo-danger, --dojo-radius, --dojo-shadow
 */

import type { Column } from '../../../types/models.js';

// Íconos predefinidos seleccionables al crear una columna
const PRESET_ICONS = ['📋', '🔲', '🔄', '🔍', '✅', '🚫', '⭐', '🎯', '🔥', '💡', '🛠️', '📌'];

type DialogMode = 'create' | 'rename' | 'delete';

export class DojoColumnDialog extends HTMLElement {
  static readonly TAG = 'dojo-column-dialog';

  private _shadow: ShadowRoot;
  private _mode: DialogMode = 'create';
  private _columnId = '';
  private _currentName = '';
  private _currentWipLimit: number | null = null;
  private _otherColumns: Column[] = [];

  // B-1: referencia estable para poder añadir y quitar el listener
  private _onDocKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this._isOpen()) this._close();
  };

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    if (this._shadow.childElementCount === 0) this._render();
  }

  disconnectedCallback(): void {
    // B-1: garantizar limpieza aunque el dialog se desconecte mientras está abierto
    document.removeEventListener('keydown', this._onDocKeydown);
  }

  // ── API pública ───────────────────────────────────────────────────────────

  openCreate(): void {
    this._mode = 'create';
    this._columnId = '';
    this._currentName = '';
    this._currentWipLimit = null;
    this._otherColumns = [];
    this._buildContent();
    this._open();
  }

  openRename(columnId: string, currentName: string, currentWipLimit?: number | null): void {
    this._mode = 'rename';
    this._columnId = columnId;
    this._currentName = currentName;
    this._currentWipLimit = currentWipLimit ?? null;
    this._otherColumns = [];
    this._buildContent();
    this._open();
  }

  openDelete(columnId: string, columnName: string, otherColumns: Column[]): void {
    this._mode = 'delete';
    this._columnId = columnId;
    this._currentName = columnName;
    this._otherColumns = otherColumns;
    this._buildContent();
    this._open();
  }

  // ── Render base (solo backdrop + contenedor) ──────────────────────────────

  private _render(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: contents;
      }

      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 200;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .backdrop[aria-hidden="false"] { display: flex; }

      .dialog {
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius);
        box-shadow: var(--dojo-shadow);
        width: 100%;
        max-width: 420px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        animation: dlg-in 0.18s ease;
      }
      @keyframes dlg-in {
        from { opacity: 0; transform: scale(0.96) translateY(-8px); }
        to   { opacity: 1; transform: none; }
      }

      .dialog-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
        margin: 0;
      }

      /* Formulario */
      .field { display: flex; flex-direction: column; gap: 0.375rem; }
      .field label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--dojo-text-secondary);
      }
      .field input,
      .field select {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.9375rem;
        color: var(--dojo-text-primary);
        background: var(--dojo-bg);
        width: 100%;
        box-sizing: border-box;
        transition: border-color 0.15s;
      }
      .field input:focus,
      .field select:focus {
        outline: none;
        border-color: var(--dojo-primary, #1D4ED8);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--dojo-primary, #1D4ED8) 20%, transparent);
      }

      /* Íconos */
      .icon-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
      }
      .icon-opt {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.125rem;
        border: 2px solid transparent;
        border-radius: var(--dojo-radius-sm, 4px);
        cursor: pointer;
        background: var(--dojo-bg);
        transition: border-color 0.1s;
      }
      .icon-opt:hover { border-color: var(--dojo-border); }
      .icon-opt[aria-pressed="true"] {
        border-color: var(--dojo-primary, #1D4ED8);
        background: color-mix(in srgb, var(--dojo-primary, #1D4ED8) 10%, transparent);
      }

      /* Delete options */
      .delete-warning {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.75rem;
        background: color-mix(in srgb, var(--dojo-danger, #DC2626) 8%, transparent);
        border: 1px solid color-mix(in srgb, var(--dojo-danger, #DC2626) 30%, transparent);
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.875rem;
        color: var(--dojo-danger, #DC2626);
      }

      .radio-group { display: flex; flex-direction: column; gap: 0.625rem; }
      .radio-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--dojo-text-primary);
        cursor: pointer;
      }
      .radio-option input { cursor: pointer; }

      /* Botones */
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.625rem;
        margin-top: 0.25rem;
      }
      .btn {
        padding: 0.4375rem 1rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        border: 1px solid transparent;
        transition: opacity 0.15s;
      }
      .btn:hover { opacity: 0.85; }
      .btn:focus-visible { outline: 2px solid var(--dojo-primary, #1D4ED8); outline-offset: 2px; }
      .btn-cancel {
        background: transparent;
        border-color: var(--dojo-border);
        color: var(--dojo-text-secondary);
      }
      .btn-primary {
        background: var(--dojo-primary, #1D4ED8);
        color: #fff;
      }
      .btn-danger {
        background: var(--dojo-danger, #DC2626);
        color: #fff;
      }
    `;
    this._shadow.appendChild(style);

    // Backdrop contenedor
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-hidden', 'true');

    // Cerrar al hacer clic en el backdrop (fuera del dialog)
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this._close();
    });

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    backdrop.appendChild(dialog);
    this._shadow.appendChild(backdrop);
  }

  // ── Construye el contenido según el modo ────────────────────────────────

  private _buildContent(): void {
    const dialog = this._shadow.querySelector<HTMLElement>('.dialog');
    if (!dialog) return;
    dialog.innerHTML = '';

    if (this._mode === 'create')  this._buildCreateForm(dialog);
    if (this._mode === 'rename')  this._buildRenameForm(dialog);
    if (this._mode === 'delete')  this._buildDeleteConfirm(dialog);
  }

  // ── Formulario: Crear columna ─────────────────────────────────────────────

  private _buildCreateForm(container: HTMLElement): void {
    const title = document.createElement('h2');
    title.className = 'dialog-title';
    title.textContent = 'Nueva columna';
    container.appendChild(title);

    // Campo nombre
    const nameField = document.createElement('div');
    nameField.className = 'field';
    const nameLbl = document.createElement('label');
    nameLbl.textContent = 'Nombre';
    nameLbl.setAttribute('for', 'col-name-input');
    const nameInput = document.createElement('input');
    nameInput.id = 'col-name-input';
    nameInput.type = 'text';
    nameInput.placeholder = 'Ej. En cola';
    nameInput.maxLength = 50;
    nameInput.setAttribute('aria-required', 'true');
    nameField.appendChild(nameLbl);
    nameField.appendChild(nameInput);
    container.appendChild(nameField);

    // Campo ícono
    let selectedIcon = PRESET_ICONS[0];
    const iconField = document.createElement('div');
    iconField.className = 'field';
    const iconLbl = document.createElement('label');
    iconLbl.textContent = 'Ícono';
    iconField.appendChild(iconLbl);

    const iconGrid = document.createElement('div');
    iconGrid.className = 'icon-grid';
    iconGrid.setAttribute('role', 'listbox');
    iconGrid.setAttribute('aria-label', 'Seleccionar ícono');

    PRESET_ICONS.forEach((icon, idx) => {
      const opt = document.createElement('button');
      opt.className = 'icon-opt';
      opt.textContent = icon;
      opt.setAttribute('role', 'option');
      opt.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');
      opt.setAttribute('aria-label', `Ícono ${icon}`);
      opt.addEventListener('click', () => {
        selectedIcon = icon;
        iconGrid.querySelectorAll('.icon-opt').forEach(o => o.setAttribute('aria-pressed', 'false'));
        opt.setAttribute('aria-pressed', 'true');
      });
      iconGrid.appendChild(opt);
    });
    iconField.appendChild(iconGrid);
    container.appendChild(iconField);

    // Campo límite WIP (US-32)
    const wipField = this._buildWipField(null);
    container.appendChild(wipField.container);

    // Acciones
    const actions = document.createElement('div');
    actions.className = 'actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => this._close());

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = 'Crear columna';
    confirmBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      const wipValue = wipField.getValue();
      this.dispatchEvent(new CustomEvent('dojo:dialog-create-column', {
        bubbles: true, composed: true,
        detail: { name, icon: selectedIcon, wipLimit: wipValue },
      }));
      this._close();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    container.appendChild(actions);

    // Focus trap: foco inicial en el input
    setTimeout(() => nameInput.focus(), 50);
  }

  // ── Formulario: Renombrar columna ────────────────────────────────────────

  private _buildRenameForm(container: HTMLElement): void {
    const title = document.createElement('h2');
    title.className = 'dialog-title';
    title.textContent = 'Renombrar columna';
    container.appendChild(title);

    const nameField = document.createElement('div');
    nameField.className = 'field';
    const nameLbl = document.createElement('label');
    nameLbl.textContent = 'Nuevo nombre';
    nameLbl.setAttribute('for', 'col-rename-input');
    const nameInput = document.createElement('input');
    nameInput.id = 'col-rename-input';
    nameInput.type = 'text';
    nameInput.value = this._currentName;
    nameInput.maxLength = 50;
    nameInput.setAttribute('aria-required', 'true');
    nameField.appendChild(nameLbl);
    nameField.appendChild(nameInput);
    container.appendChild(nameField);

    // Campo límite WIP (US-32)
    const wipField = this._buildWipField(this._currentWipLimit);
    container.appendChild(wipField.container);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => this._close());

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = 'Guardar';
    confirmBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      const wipValue = wipField.getValue();
      this.dispatchEvent(new CustomEvent('dojo:dialog-rename-column', {
        bubbles: true, composed: true,
        detail: { columnId: this._columnId, name, wipLimit: wipValue },
      }));
      this._close();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    container.appendChild(actions);

    setTimeout(() => { nameInput.focus(); nameInput.select(); }, 50);
  }

  // ── Confirmación: Eliminar columna ───────────────────────────────────────

  private _buildDeleteConfirm(container: HTMLElement): void {
    const title = document.createElement('h2');
    title.className = 'dialog-title';
    title.textContent = 'Eliminar columna';
    container.appendChild(title);

    const warning = document.createElement('div');
    warning.className = 'delete-warning';
    warning.setAttribute('role', 'alert');
    warning.textContent = `¿Seguro que quieres eliminar "${this._currentName}"?`;
    container.appendChild(warning);

    let actionChoice: 'delete' | 'move' = 'delete';
    let targetColumnId = this._otherColumns[0]?.id ?? '';

    const radioGroup = document.createElement('div');
    radioGroup.className = 'radio-group';
    // I-2: semántica ARIA para lectores de pantalla
    radioGroup.setAttribute('role', 'radiogroup');
    radioGroup.setAttribute('aria-label', 'Qué hacer con las tareas');

    if (this._otherColumns.length > 0) {
      // Opción: Mover tareas
      const moveLabel = document.createElement('label');
      moveLabel.className = 'radio-option';
      const moveRadio = document.createElement('input');
      moveRadio.type = 'radio';
      moveRadio.name = 'delete-action';
      moveRadio.value = 'move';
      moveLabel.appendChild(moveRadio);
      moveLabel.appendChild(document.createTextNode('Mover tareas a:'));
      radioGroup.appendChild(moveLabel);

      // Select de columna destino
      const targetField = document.createElement('div');
      targetField.className = 'field';
      const targetSelect = document.createElement('select');
      targetSelect.setAttribute('aria-label', 'Columna destino');
      this._otherColumns.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col.id;
        opt.textContent = `${col.icon} ${col.name}`;
        targetSelect.appendChild(opt);
      });
      // B-2: seleccionar una columna destino activa automáticamente la opción "mover"
      targetSelect.addEventListener('change', () => {
        targetColumnId = targetSelect.value;
        moveRadio.checked = true;
        actionChoice = 'move';
      });
      targetField.appendChild(targetSelect);
      radioGroup.appendChild(targetField);

      moveRadio.addEventListener('change', () => {
        if (moveRadio.checked) { actionChoice = 'move'; targetColumnId = targetSelect.value; }
      });

      // Opción: Eliminar tareas
      const delLabel = document.createElement('label');
      delLabel.className = 'radio-option';
      const delRadio = document.createElement('input');
      delRadio.type = 'radio';
      delRadio.name = 'delete-action';
      delRadio.value = 'delete';
      delRadio.checked = true;
      actionChoice = 'delete';
      delLabel.appendChild(delRadio);
      delLabel.appendChild(document.createTextNode('Eliminar todas las tareas'));
      radioGroup.appendChild(delLabel);

      delRadio.addEventListener('change', () => {
        if (delRadio.checked) actionChoice = 'delete';
      });
    } else {
      const p = document.createElement('p');
      p.style.cssText = 'font-size:0.875rem;color:var(--dojo-text-secondary);margin:0;';
      p.textContent = 'La columna no tiene tareas.';
      radioGroup.appendChild(p);
    }
    container.appendChild(radioGroup);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-cancel';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => this._close());

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = 'Eliminar';
    confirmBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('dojo:dialog-delete-column', {
        bubbles: true, composed: true,
        detail: {
          columnId: this._columnId,
          action: actionChoice,
          targetColumnId: actionChoice === 'move' ? targetColumnId : undefined,
        },
      }));
      this._close();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    container.appendChild(actions);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _open(): void {
    const backdrop = this._shadow.querySelector<HTMLElement>('.backdrop');
    if (backdrop) {
      backdrop.setAttribute('aria-hidden', 'false');
      backdrop.setAttribute('aria-label',
        this._mode === 'create'  ? 'Crear columna' :
        this._mode === 'rename'  ? 'Renombrar columna' :
                                   'Eliminar columna'
      );
    }
    // B-1: registrar listener de Escape solo mientras el dialog está abierto
    document.addEventListener('keydown', this._onDocKeydown);
  }

  private _close(): void {
    const backdrop = this._shadow.querySelector<HTMLElement>('.backdrop');
    if (backdrop) backdrop.setAttribute('aria-hidden', 'true');
    // B-1: limpiar listener al cerrar
    document.removeEventListener('keydown', this._onDocKeydown);
  }

  private _isOpen(): boolean {
    const backdrop = this._shadow.querySelector<HTMLElement>('.backdrop');
    return backdrop?.getAttribute('aria-hidden') === 'false';
  }

  // ── Campo reutilizable: Límite WIP (US-32) ────────────────────────────────

  private _buildWipField(currentValue: number | null): { container: HTMLElement; getValue: () => number | null } {
    const field = document.createElement('div');
    field.className = 'field';
    const lbl = document.createElement('label');
    lbl.textContent = 'Límite WIP';
    const inputId = `col-wip-input-${this._mode}`;
    const hintId = `wip-hint-${this._mode}`;
    lbl.setAttribute('for', inputId);
    const input = document.createElement('input');
    input.id = inputId;
    input.type = 'number';
    input.min = '1';
    input.placeholder = 'Sin límite';
    input.setAttribute('aria-describedby', hintId);
    if (currentValue !== null && currentValue !== undefined) {
      input.value = String(currentValue);
    }
    const hint = document.createElement('span');
    hint.id = hintId;
    hint.style.cssText = 'font-size:0.75rem;color:var(--dojo-text-secondary);';
    hint.textContent = 'Máximo de tareas permitidas. Vacío = sin límite.';
    field.appendChild(lbl);
    field.appendChild(input);
    field.appendChild(hint);
    return {
      container: field,
      getValue: (): number | null => {
        const v = input.value.trim();
        if (!v) return null;
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n >= 1 ? n : null;
      },
    };
  }
}

customElements.define(DojoColumnDialog.TAG, DojoColumnDialog);
