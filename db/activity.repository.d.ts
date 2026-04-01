/**
 * activity.repository.ts — CRUD de eventos de actividad sobre IndexedDB.
 *
 * Registra y consulta el historial de cambios de cada tarea (US-20).
 * Los eventos se almacenan en el object store `activity` con índice `by-taskId`.
 */
import type { ActivityEvent, ActivityEventType } from '../types/models.js';
type CreateActivityInput = {
    taskId: string;
    type: ActivityEventType;
    payload: Record<string, unknown>;
};
/**
 * Registra un nuevo evento de actividad asociado a una tarea.
 * Asigna `id` y `createdAt` automáticamente.
 */
export declare function addActivityEvent(input: CreateActivityInput): Promise<ActivityEvent>;
/**
 * Devuelve todos los eventos de actividad de una tarea,
 * ordenados del más reciente al más antiguo.
 */
export declare function getActivitiesByTaskId(taskId: string): Promise<ActivityEvent[]>;
/**
 * Elimina todos los eventos de actividad asociados a una tarea.
 * Útil al eliminar la tarea para no dejar registros huérfanos.
 */
export declare function deleteActivitiesByTaskId(taskId: string): Promise<void>;
export {};
