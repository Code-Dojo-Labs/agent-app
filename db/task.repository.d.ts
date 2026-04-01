/**
 * task.repository.ts — CRUD de tareas sobre IndexedDB.
 *
 * Todas las operaciones son asíncronas y devuelven Promesas.
 * Los IDs se generan con `crypto.randomUUID()` en el cliente.
 */
import type { Task, Priority } from '../types/models.js';
type CreateTaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateTaskInput = Partial<Omit<Task, 'id' | 'createdAt'>>;
/** Devuelve todas las tareas almacenadas. */
export declare function getAllTasks(): Promise<Task[]>;
/**
 * Devuelve todas las tareas de una columna específica,
 * ordenadas por su campo `order` ascendente.
 */
export declare function getTasksByStatus(statusId: string): Promise<Task[]>;
/** Devuelve una tarea por su ID, o `undefined` si no existe. */
export declare function getTaskById(id: string): Promise<Task | undefined>;
/** Devuelve todas las tareas que coincidan con una prioridad. */
export declare function getTasksByPriority(priority: Priority): Promise<Task[]>;
/**
 * Crea una nueva tarea. Asigna `id`, `createdAt` y `updatedAt` automáticamente.
 * El campo `order` se calcula como el máximo actual + 1 dentro de la columna.
 */
export declare function createTask(input: CreateTaskInput): Promise<Task>;
/**
 * Actualiza una tarea existente. Actualiza `updatedAt` automáticamente.
 * Lanza un `Error` si la tarea no existe.
 */
export declare function updateTask(id: string, changes: UpdateTaskInput): Promise<Task>;
/** Elimina una tarea por su ID. No lanza error si no existe. */
export declare function deleteTask(id: string): Promise<void>;
/**
 * Reordena las tareas dentro de una columna.
 * @param statusId   - ID de la columna.
 * @param orderedIds - IDs de las tareas en el nuevo orden deseado.
 */
export declare function reorderTasks(statusId: string, orderedIds: string[]): Promise<void>;
/**
 * Devuelve los IDs de todas las tareas de un tablero (US-22).
 */
export declare function getTaskIdsByBoard(boardId: string): Promise<string[]>;
/**
 * Elimina todas las tareas de un tablero (US-22).
 */
export declare function deleteTasksByBoard(boardId: string): Promise<void>;
export {};
