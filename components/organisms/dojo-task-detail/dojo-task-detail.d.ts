/**
 * dojo-task-detail — Organismo
 *
 * Panel lateral deslizable (sidebar) para editar todos los campos de una tarea.
 * Implementa los criterios de aceptación de US-05 (Editar tarea).
 *
 * ## API Pública
 * | Método                                    | Descripción                           |
 * |-------------------------------------------|---------------------------------------|
 * | openTask(task, columns, labels): void     | Abre el panel con la tarea indicada   |
 * | close(): void                             | Cierra el panel                       |
 *
 * ## Eventos despachados
 * | Nombre                   | Detalle                              | Descripción               |
 * |--------------------------|--------------------------------------|---------------------------|
 * | dojo:task-field-updated  | { taskId, changes: Partial<Task> }   | Campo editado — auto-save |
 *
 * ## Comportamiento de guardado (US-05)
 * - Título / Descripción  → blur (pierde el foco)
 * - Estado / Prioridad    → change (selección inmediata)
 * - Etiquetas             → click en chip/opción (inmediato)
 * - createdAt             → solo lectura, no editable
 *
 * ## CSS Custom Properties heredadas
 * --dojo-bg, --dojo-surface, --dojo-border, --dojo-text-*,
 * --dojo-primary, --dojo-radius, --dojo-radius-sm, --dojo-shadow
 */
import type { Task, Column, Label } from '../../../types/models.js';
export declare class DojoTaskDetail extends HTMLElement {
    static readonly TAG = "dojo-task-detail";
    private _shadow;
    /** Snapshot local de la tarea en edición. */
    private _task;
    private _columns;
    private _allLabels;
    private _labelsPickerOpen;
    /** Preserva el overflow del body antes de abrir el panel (se restaura al cerrar). Fix #5 */
    private _prevOverflow;
    /** Referencia estable para poder eliminar el listener de teclado. */
    private _onDocKeydown;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** Id de la tarea actualmente en edición (null si el panel está cerrado). */
    get currentTaskId(): string | null;
    openTask(task: Task, columns: Column[], labels: Label[]): void;
    close(): void;
    private _isOpen;
    private _openPanel;
    private _closePanel;
    private _save;
    private _render;
    private _buildContent;
    private _buildTitleField;
    private _buildStatusPriorityRow;
    private _buildDescriptionField;
    private _buildLabelsField;
    /** Campo de fecha de vencimiento con auto-save (US-17). */
    private _buildDueDateField;
    private _buildSubtasksField;
    private _buildSubtaskItem;
    /** Reconstruye la sección de subtareas in-place para reflejar progreso actualizado. */
    private _rebuildSubtasksSection;
    private _loadActivitySection;
    private _renderActivityEvents;
    private _activityIcon;
    private _activityDescription;
    private _priorityLabel;
    private _formatRelativeTime;
    private _buildMetadata;
    private _formatDate;
}
