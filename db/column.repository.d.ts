/**
 * column.repository.ts — CRUD de columnas sobre IndexedDB.
 *
 * Las columnas definen los estados del tablero Kanban.
 * Al inicializar la app se insertan las columnas por defecto si el store está vacío.
 */
import type { Column } from '../types/models.js';
type CreateColumnInput = Omit<Column, 'id'>;
type UpdateColumnInput = Partial<Omit<Column, 'id' | 'boardId'>>;
/** Devuelve todas las columnas ordenadas por `order` ascendente. */
export declare function getAllColumns(): Promise<Column[]>;
/** Devuelve todas las columnas de un tablero, ordenadas por `order` ascendente (US-22). */
export declare function getColumnsByBoard(boardId: string): Promise<Column[]>;
/** Devuelve una columna por su ID, o `undefined` si no existe. */
export declare function getColumnById(id: string): Promise<Column | undefined>;
/**
 * Crea una nueva columna. Asigna `id` automáticamente.
 * Si no se especifica `order`, lo asigna como el máximo actual + 1.
 */
export declare function createColumn(input: CreateColumnInput): Promise<Column>;
/**
 * Actualiza una columna existente.
 * Lanza un `Error` si la columna no existe.
 */
export declare function updateColumn(id: string, changes: UpdateColumnInput): Promise<Column>;
/**
 * Elimina una columna por su ID.
 * Nota: la lógica de negocio debe reasignar o eliminar las tareas asociadas antes de llamar a esta función.
 */
export declare function deleteColumn(id: string): Promise<void>;
/**
 * Inserta las columnas por defecto para un tablero dado.
 * @param boardId - ID del tablero al que pertenecerán las columnas.
 */
export declare function seedDefaultColumns(boardId: string): Promise<void>;
/**
 * Elimina todas las columnas de un tablero (US-22).
 */
export declare function deleteColumnsByBoard(boardId: string): Promise<void>;
export {};
