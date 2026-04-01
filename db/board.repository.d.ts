/**
 * board.repository.ts — CRUD de tableros sobre IndexedDB (US-22).
 *
 * Cada tablero agrupa un conjunto independiente de columnas y tareas.
 * Las etiquetas son globales y se comparten entre todos los tableros.
 */
import type { Board } from '../types/models.js';
type CreateBoardInput = Omit<Board, 'id' | 'createdAt'>;
type UpdateBoardInput = Partial<Omit<Board, 'id' | 'createdAt'>>;
/** Devuelve todos los tableros ordenados por fecha de creación ascendente. */
export declare function getAllBoards(): Promise<Board[]>;
/** Devuelve un tablero por su ID, o `undefined` si no existe. */
export declare function getBoardById(id: string): Promise<Board | undefined>;
/**
 * Crea un nuevo tablero. Asigna `id` y `createdAt` automáticamente.
 */
export declare function createBoard(input: CreateBoardInput): Promise<Board>;
/**
 * Actualiza un tablero existente.
 * Lanza un `Error` si el tablero no existe.
 */
export declare function updateBoard(id: string, changes: UpdateBoardInput): Promise<Board>;
/**
 * Elimina un tablero por su ID.
 * La lógica de negocio debe eliminar columnas y tareas asociadas antes de llamar esta función.
 */
export declare function deleteBoard(id: string): Promise<void>;
export {};
