/**
 * dojo-board-selector — Organismo
 *
 * Pantalla de selección de tableros. Muestra una grid con los tableros
 * disponibles y permite crear, renombrar y eliminar tableros.
 *
 * ## Eventos despachados
 * | Nombre                  | Detalle           | Descripción                       |
 * |-------------------------|-------------------|-----------------------------------|
 * | dojo:board-selected     | { boardId }       | Usuario seleccionó un tablero     |
 * | dojo:boards-changed     | —                 | Tablero creado/eliminado/editado  |
 *
 * ## CSS Custom Properties
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-radius,
 * --dojo-text-primary, --dojo-text-secondary, --dojo-primary, --dojo-shadow
 */

import { getAllBoards, createBoard, updateBoard, deleteBoard } from '../../../db/board.repository.js';
import { seedDefaultColumns, deleteColumnsByBoard } from '../../../db/column.repository.js';
import { deleteTasksByBoard, getTaskIdsByBoard } from '../../../db/task.repository.js';
import { deleteActivitiesByTaskId } from '../../../db/activity.repository.js';
import type { Board } from '../../../types/models.js';

export class DojoBoardSelector extends HTMLElement {
  static readonly TAG = 'dojo-board-selector';

  private _shadow: ShadowRoot;
  private _boards: Board[] = [];

  constructor() {
    super();
    this._shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this._render();
    this._loadBoards();
  }

  /** Recarga la lista de tableros externamente. */
  async refresh(): Promise<void> {
    await this._loadBoards();
  }

  // ── Carga de datos ───────────────────────────────────────────────────────

  private async _loadBoards(): Promise<void> {
    try {
      this._boards = await getAllBoards();
      this._renderBoardGrid();
    } catch (err) {
      console.error('[dojo-board-selector] Error cargando tableros:', err);
    }
  }

  // ── Render base ──────────────────────────────────────────────────────────

  private _render(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--dojo-bg);
        overflow-y: auto;
      }

      .selector-header {
        padding: 2rem 2rem 0;
        text-align: center;
      }
      .selector-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
        margin: 0 0 0.25rem;
      }
      .selector-subtitle {
        font-size: 0.875rem;
        color: var(--dojo-text-secondary);
        margin: 0;
      }

      .board-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 1rem;
        padding: 2rem;
        max-width: 960px;
        margin: 0 auto;
        width: 100%;
        box-sizing: border-box;
      }

      .board-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius, 6px);
        padding: 1.5rem 1rem;
        cursor: pointer;
        transition: box-shadow 0.15s, border-color 0.15s, transform 0.1s;
        position: relative;
        min-height: 120px;
      }
      .board-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border-color: var(--dojo-primary, #1D4ED8);
        transform: translateY(-2px);
      }
      .board-card:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      .board-emoji {
        font-size: 2rem;
        line-height: 1;
        margin-bottom: 0.5rem;
      }
      .board-name {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--dojo-text-primary);
        text-align: center;
        word-break: break-word;
        max-width: 100%;
      }
      .board-date {
        font-size: 0.6875rem;
        color: var(--dojo-text-secondary);
        margin-top: 0.375rem;
      }

      .board-actions {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        display: flex;
        gap: 0.25rem;
        opacity: 0;
        transition: opacity 0.15s;
      }
      .board-card:hover .board-actions,
      .board-card:focus-within .board-actions {
        opacity: 1;
      }
      .board-action-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0.2rem 0.35rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.8125rem;
        line-height: 1;
        color: var(--dojo-text-secondary);
        transition: background 0.15s, color 0.15s;
      }
      .board-action-btn:hover {
        background: var(--dojo-bg);
        color: var(--dojo-text-primary);
      }
      .board-action-btn.delete:hover {
        background: #FEE2E2;
        color: #EF4444;
      }
      .board-action-btn:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }

      /* Card de "nuevo tablero" */
      .new-board-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: 2px dashed var(--dojo-border);
        border-radius: var(--dojo-radius, 6px);
        padding: 1.5rem 1rem;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
        min-height: 120px;
        color: var(--dojo-text-secondary);
        font-family: inherit;
        font-size: 0.9375rem;
        font-weight: 500;
      }
      .new-board-card:hover {
        background: var(--dojo-surface);
        border-color: var(--dojo-primary, #1D4ED8);
        color: var(--dojo-primary, #1D4ED8);
      }
      .new-board-card:focus-visible {
        outline: 2px solid var(--dojo-primary, #1D4ED8);
        outline-offset: 2px;
      }
      .new-board-icon {
        font-size: 1.5rem;
        margin-bottom: 0.375rem;
      }

      /* Inline form (create/rename) */
      .inline-form {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        background: var(--dojo-surface);
        border: 2px solid var(--dojo-primary, #1D4ED8);
        border-radius: var(--dojo-radius, 6px);
        min-height: 120px;
      }
      .inline-input {
        padding: 0.4375rem 0.625rem;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.875rem;
        font-family: inherit;
        color: var(--dojo-text-primary);
        background: var(--dojo-bg);
        outline: none;
      }
      .inline-input:focus {
        border-color: var(--dojo-primary, #1D4ED8);
      }
      .inline-row {
        display: flex;
        gap: 0.375rem;
      }
      .inline-btn {
        padding: 0.3125rem 0.75rem;
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius-sm, 4px);
        background: var(--dojo-primary, #1D4ED8);
        color: #fff;
        font-size: 0.8125rem;
        font-family: inherit;
        cursor: pointer;
        font-weight: 600;
      }
      .inline-btn.cancel {
        background: transparent;
        color: var(--dojo-text-secondary);
      }

      /* Diálogo de confirmación de eliminación */
      .delete-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
        z-index: 300;
        display: none;
      }
      .delete-backdrop.visible { display: block; }
      .delete-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 301;
        background: var(--dojo-surface);
        border: 1px solid var(--dojo-border);
        border-radius: var(--dojo-radius, 6px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        padding: 1.5rem;
        width: 380px;
        max-width: calc(100vw - 2rem);
        display: none;
      }
      .delete-dialog.visible { display: block; }
      .delete-dialog-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--dojo-text-primary);
        margin: 0 0 0.5rem;
      }
      .delete-dialog-body {
        font-size: 0.875rem;
        color: var(--dojo-text-secondary);
        margin: 0 0 1.25rem;
        line-height: 1.5;
      }
      .delete-dialog-actions {
        display: flex;
        gap: 0.625rem;
        justify-content: flex-end;
      }
      .delete-cancel-btn,
      .delete-confirm-btn {
        padding: 0.4375rem 1rem;
        border-radius: var(--dojo-radius-sm, 4px);
        font-size: 0.8125rem;
        font-family: inherit;
        cursor: pointer;
      }
      .delete-cancel-btn {
        background: transparent;
        border: 1px solid var(--dojo-border);
        color: var(--dojo-text-primary);
      }
      .delete-confirm-btn {
        background: #DC2626;
        border: 1px solid transparent;
        color: #fff;
        font-weight: 600;
      }
    `;
    this._shadow.appendChild(style);

    // Header
    const header = document.createElement('div');
    header.className = 'selector-header';
    const title = document.createElement('h1');
    title.className = 'selector-title';
    title.textContent = '🥋 Dojo Kanban';
    const subtitle = document.createElement('p');
    subtitle.className = 'selector-subtitle';
    subtitle.textContent = 'Selecciona un tablero para comenzar';
    header.appendChild(title);
    header.appendChild(subtitle);
    this._shadow.appendChild(header);

    // Grid container (populated by _renderBoardGrid)
    const grid = document.createElement('div');
    grid.className = 'board-grid';
    grid.setAttribute('role', 'list');
    grid.setAttribute('aria-label', 'Tableros disponibles');
    this._shadow.appendChild(grid);

    // Delete confirmation dialog
    const backdrop = document.createElement('div');
    backdrop.className = 'delete-backdrop';
    backdrop.addEventListener('click', () => this._hideDeleteDialog());

    const dialog = document.createElement('div');
    dialog.className = 'delete-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-labelledby', 'bs-delete-title');

    const dTitle = document.createElement('h2');
    dTitle.className = 'delete-dialog-title';
    dTitle.id = 'bs-delete-title';
    dTitle.textContent = '⚠️ Eliminar tablero';

    const dBody = document.createElement('p');
    dBody.className = 'delete-dialog-body';

    const dActions = document.createElement('div');
    dActions.className = 'delete-dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'delete-cancel-btn';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => this._hideDeleteDialog());

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'delete-confirm-btn';
    confirmBtn.type = 'button';
    confirmBtn.textContent = 'Eliminar';

    dActions.appendChild(cancelBtn);
    dActions.appendChild(confirmBtn);
    dialog.appendChild(dTitle);
    dialog.appendChild(dBody);
    dialog.appendChild(dActions);

    this._shadow.appendChild(backdrop);
    this._shadow.appendChild(dialog);
  }

  // ── Render de la grid ────────────────────────────────────────────────────

  private _renderBoardGrid(): void {
    const grid = this._shadow.querySelector('.board-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (const board of this._boards) {
      grid.appendChild(this._createBoardCard(board));
    }

    // Card para crear nuevo tablero
    const newCard = document.createElement('button');
    newCard.className = 'new-board-card';
    newCard.type = 'button';
    newCard.setAttribute('role', 'listitem');
    newCard.setAttribute('aria-label', 'Crear nuevo tablero');

    const newIcon = document.createElement('span');
    newIcon.className = 'new-board-icon';
    newIcon.textContent = '➕';
    const newText = document.createElement('span');
    newText.textContent = 'Nuevo tablero';

    newCard.appendChild(newIcon);
    newCard.appendChild(newText);
    newCard.addEventListener('click', () => this._showCreateForm(grid as HTMLElement));
    grid.appendChild(newCard);
  }

  private _createBoardCard(board: Board): HTMLElement {
    const card = document.createElement('div');
    card.className = 'board-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Tablero: ${board.name}`);

    const emoji = document.createElement('span');
    emoji.className = 'board-emoji';
    emoji.setAttribute('aria-hidden', 'true');
    emoji.textContent = board.emoji || '📋';

    const name = document.createElement('span');
    name.className = 'board-name';
    name.textContent = board.name;

    const date = document.createElement('span');
    date.className = 'board-date';
    date.textContent = new Date(board.createdAt).toLocaleDateString('es', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'board-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'board-action-btn';
    renameBtn.type = 'button';
    renameBtn.setAttribute('aria-label', `Renombrar tablero: ${board.name}`);
    renameBtn.textContent = '✏️';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._showRenameForm(card, board);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'board-action-btn delete';
    deleteBtn.type = 'button';
    deleteBtn.setAttribute('aria-label', `Eliminar tablero: ${board.name}`);
    deleteBtn.textContent = '🗑️';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._showDeleteDialog(board);
    });

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    card.appendChild(emoji);
    card.appendChild(name);
    card.appendChild(date);

    // Click → select board
    card.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('dojo:board-selected', {
        bubbles: true, composed: true,
        detail: { boardId: board.id },
      }));
    });
    card.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });

    return card;
  }

  // ── Crear tablero (inline form) ──────────────────────────────────────────

  private _showCreateForm(grid: HTMLElement): void {
    const newCard = grid.querySelector('.new-board-card');
    if (!newCard) return;

    const form = document.createElement('div');
    form.className = 'inline-form';
    form.setAttribute('role', 'listitem');

    const nameInput = document.createElement('input');
    nameInput.className = 'inline-input';
    nameInput.type = 'text';
    nameInput.placeholder = 'Nombre del tablero';
    nameInput.maxLength = 60;
    nameInput.setAttribute('aria-label', 'Nombre del nuevo tablero');

    const emojiInput = document.createElement('input');
    emojiInput.className = 'inline-input';
    emojiInput.type = 'text';
    emojiInput.placeholder = 'Emoji (opcional, ej. 🚀)';
    emojiInput.maxLength = 4;
    emojiInput.setAttribute('aria-label', 'Emoji del tablero');

    const row = document.createElement('div');
    row.className = 'inline-row';

    const createBtn = document.createElement('button');
    createBtn.className = 'inline-btn';
    createBtn.type = 'button';
    createBtn.textContent = 'Crear';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'inline-btn cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => this._renderBoardGrid());

    const doCreate = async (): Promise<void> => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      createBtn.disabled = true;
      try {
        const board = await createBoard({ name, emoji: emojiInput.value.trim() || undefined });
        await seedDefaultColumns(board.id);
        this._boards.push(board);
        this._renderBoardGrid();
        this.dispatchEvent(new CustomEvent('dojo:boards-changed', { bubbles: true, composed: true }));
      } catch (err) {
        console.error('[dojo-board-selector] Error creando tablero:', err);
        createBtn.disabled = false;
      }
    };

    createBtn.addEventListener('click', doCreate);
    nameInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); doCreate(); }
      if (e.key === 'Escape') { e.preventDefault(); this._renderBoardGrid(); }
    });
    emojiInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); doCreate(); }
      if (e.key === 'Escape') { e.preventDefault(); this._renderBoardGrid(); }
    });

    row.appendChild(createBtn);
    row.appendChild(cancelBtn);
    form.appendChild(nameInput);
    form.appendChild(emojiInput);
    form.appendChild(row);

    newCard.replaceWith(form);
    requestAnimationFrame(() => nameInput.focus());
  }

  // ── Renombrar tablero (inline form) ──────────────────────────────────────

  private _showRenameForm(card: HTMLElement, board: Board): void {
    const form = document.createElement('div');
    form.className = 'inline-form';
    form.setAttribute('role', 'listitem');

    const nameInput = document.createElement('input');
    nameInput.className = 'inline-input';
    nameInput.type = 'text';
    nameInput.value = board.name;
    nameInput.maxLength = 60;
    nameInput.setAttribute('aria-label', 'Nuevo nombre del tablero');

    const emojiInput = document.createElement('input');
    emojiInput.className = 'inline-input';
    emojiInput.type = 'text';
    emojiInput.value = board.emoji ?? '';
    emojiInput.maxLength = 4;
    emojiInput.setAttribute('aria-label', 'Nuevo emoji del tablero');

    const row = document.createElement('div');
    row.className = 'inline-row';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'inline-btn';
    saveBtn.type = 'button';
    saveBtn.textContent = 'Guardar';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'inline-btn cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.addEventListener('click', () => this._renderBoardGrid());

    const doRename = async (): Promise<void> => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      saveBtn.disabled = true;
      try {
        const updated = await updateBoard(board.id, { name, emoji: emojiInput.value.trim() || undefined });
        const idx = this._boards.findIndex(b => b.id === board.id);
        if (idx !== -1) this._boards[idx] = updated;
        this._renderBoardGrid();
        this.dispatchEvent(new CustomEvent('dojo:boards-changed', { bubbles: true, composed: true }));
      } catch (err) {
        console.error('[dojo-board-selector] Error renombrando tablero:', err);
        saveBtn.disabled = false;
      }
    };

    saveBtn.addEventListener('click', doRename);
    nameInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); doRename(); }
      if (e.key === 'Escape') { e.preventDefault(); this._renderBoardGrid(); }
    });

    row.appendChild(saveBtn);
    row.appendChild(cancelBtn);
    form.appendChild(nameInput);
    form.appendChild(emojiInput);
    form.appendChild(row);

    card.replaceWith(form);
    requestAnimationFrame(() => { nameInput.focus(); nameInput.select(); });
  }

  // ── Eliminar tablero ─────────────────────────────────────────────────────

  private _pendingDeleteId: string | null = null;

  private _showDeleteDialog(board: Board): void {
    if (this._boards.length <= 1) {
      // No permitir eliminar el último tablero
      const body = this._shadow.querySelector('.delete-dialog-body');
      if (body) body.textContent = 'No se puede eliminar el único tablero. Debe existir al menos un tablero.';
      const confirmBtn = this._shadow.querySelector<HTMLButtonElement>('.delete-confirm-btn');
      if (confirmBtn) confirmBtn.style.display = 'none';
      this._showDeleteDialogUI();
      return;
    }

    this._pendingDeleteId = board.id;
    const body = this._shadow.querySelector('.delete-dialog-body');
    if (body) body.textContent = `Se eliminará el tablero "${board.name}" junto con todas sus columnas y tareas. Esta acción no se puede deshacer.`;
    const confirmBtn = this._shadow.querySelector<HTMLButtonElement>('.delete-confirm-btn');
    if (confirmBtn) {
      confirmBtn.style.display = '';
      confirmBtn.onclick = () => this._confirmDelete();
    }
    this._showDeleteDialogUI();
  }

  private _showDeleteDialogUI(): void {
    this._shadow.querySelector('.delete-backdrop')?.classList.add('visible');
    this._shadow.querySelector('.delete-dialog')?.classList.add('visible');
    document.addEventListener('keydown', this._onDeleteKeydown);
    requestAnimationFrame(() => {
      this._shadow.querySelector<HTMLButtonElement>('.delete-cancel-btn')?.focus();
    });
  }

  private _hideDeleteDialog(): void {
    this._shadow.querySelector('.delete-backdrop')?.classList.remove('visible');
    this._shadow.querySelector('.delete-dialog')?.classList.remove('visible');
    document.removeEventListener('keydown', this._onDeleteKeydown);
    this._pendingDeleteId = null;
  }

  /** Focus trap + Escape para el diálogo de eliminación (WCAG 2.1 SC 2.1.2). */
  private _onDeleteKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this._hideDeleteDialog();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = Array.from(
        this._shadow.querySelectorAll<HTMLElement>('.delete-dialog button:not([style*="display: none"])')
      ).filter(el => el.offsetParent !== null);
      if (focusable.length < 2) return;
      const first  = focusable[0];
      const last   = focusable[focusable.length - 1];
      const active = this._shadow.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  private async _confirmDelete(): Promise<void> {
    const boardId = this._pendingDeleteId;
    if (!boardId) return;

    try {
      // Limpiar actividad asociada a las tareas del tablero (evita datos huérfanos)
      const taskIds = await getTaskIdsByBoard(boardId);
      await Promise.all(taskIds.map(id => deleteActivitiesByTaskId(id)));
      await deleteTasksByBoard(boardId);
      await deleteColumnsByBoard(boardId);
      await deleteBoard(boardId);
      this._boards = this._boards.filter(b => b.id !== boardId);
      this._hideDeleteDialog();
      this._renderBoardGrid();
      this.dispatchEvent(new CustomEvent('dojo:boards-changed', { bubbles: true, composed: true }));
    } catch (err) {
      console.error('[dojo-board-selector] Error eliminando tablero:', err);
      this._hideDeleteDialog();
    }
  }
}

customElements.define(DojoBoardSelector.TAG, DojoBoardSelector);
