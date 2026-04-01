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
export declare class DojoColumnDialog extends HTMLElement {
    static readonly TAG = "dojo-column-dialog";
    private _shadow;
    private _mode;
    private _columnId;
    private _currentName;
    private _otherColumns;
    private _onDocKeydown;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    openCreate(): void;
    openRename(columnId: string, currentName: string): void;
    openDelete(columnId: string, columnName: string, otherColumns: Column[]): void;
    private _render;
    private _buildContent;
    private _buildCreateForm;
    private _buildRenameForm;
    private _buildDeleteConfirm;
    private _open;
    private _close;
    private _isOpen;
}
