/**
 * dojo-task-card — Átomo
 *
 * Tarjeta arrastrable que representa una tarea en el tablero Kanban.
 * Implementa la API nativa HTML5 Drag & Drop requerida por US-03.
 *
 * ## Atributos observados
 * | Atributo       | Tipo   | Descripción                             |
 * |----------------|--------|-----------------------------------------|
 * | task-id        | string | UUID de la tarea en IndexedDB           |
 * | task-title     | string | Título visible (máx. 120 chars)         |
 * | task-priority  | string | low | medium | high | urgent             |
 *
 * ## Propiedades públicas
 * | Propiedad   | Tipo     | Descripción                                     |
 * |-------------|----------|-------------------------------------------------|
 * | taskLabels  | Label[]  | Etiquetas asociadas; re-renderiza automáticamente|
 *
 * ## Eventos despachados
 * | Nombre          | Detalle          | Descripción                      |
 * |-----------------|------------------|----------------------------------|
 * | dojo:task-open  | { taskId }       | Usuario hizo clic en la tarjeta  |
 *
 * ## CSS Custom Properties
 * --dojo-surface, --dojo-border, --dojo-radius, --dojo-text-*,
 * --dojo-primary, --dojo-shadow,
 * --dojo-priority-low, --dojo-priority-medium,
 * --dojo-priority-high, --dojo-priority-urgent
 */
import type { Label, Person } from '../../../types/models.js';
export declare class DojoTaskCard extends HTMLElement {
    static readonly TAG = "dojo-task-card";
    static get observedAttributes(): string[];
    private _shadow;
    /** Etiquetas asociadas a esta tarjeta (US-10) */
    private _labels;
    /** Personas asignadas a esta tarjeta (US-29) */
    private _assignees;
    get taskLabels(): Label[];
    set taskLabels(labels: Label[]);
    get taskAssignees(): Person[];
    set taskAssignees(assignees: Person[]);
    /** Progreso de subtareas (US-21): [completadas, total] */
    private _subtasksDone;
    private _subtasksTotal;
    get subtasksDone(): number;
    get subtasksTotal(): number;
    setSubtaskProgress(done: number, total: number): void;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    get taskId(): string;
    get taskTitle(): string;
    get priority(): string;
    get createdAt(): string;
    get dueDate(): string;
    get taskNumber(): string;
    private _onDragStart;
    private _onDragEnd;
    private _onClick;
    private static readonly PRIORITY_CONFIG;
    /** Mapeo estado → clase CSS para borde de alerta de vencimiento (US-17). */
    private static readonly DUE_STATUS_CLASS;
    private _render;
    /** Formatea una fecha ISO a "25 mar 2026" para uso en tarjetas. */
    private static readonly MONTHS_ES;
    private static _formatCardDate;
    /**
     * Detecta si un string contiene emojis.
     * Regex simplificado que cubre la mayoría de emojis Unicode.
     */
    private _isEmoji;
}
