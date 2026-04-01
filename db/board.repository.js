/**
 * board.repository.ts — CRUD de tableros sobre IndexedDB (US-22).
 *
 * Cada tablero agrupa un conjunto independiente de columnas y tareas.
 * Las etiquetas son globales y se comparten entre todos los tableros.
 */
import { idbRequest, idbTransaction, getStore } from './database.js';
import { generateUUID } from '../utils/uuid.js';
import { emitSync } from '../utils/broadcast-sync.js';
// ── Implementación ─────────────────────────────────────────────────────────
/** Devuelve todos los tableros ordenados por fecha de creación ascendente. */
export async function getAllBoards() {
    const { store } = await getStore('boards');
    const boards = await idbRequest(store.getAll());
    return boards.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
/** Devuelve un tablero por su ID, o `undefined` si no existe. */
export async function getBoardById(id) {
    const { store } = await getStore('boards');
    return idbRequest(store.get(id));
}
/**
 * Crea un nuevo tablero. Asigna `id` y `createdAt` automáticamente.
 */
export async function createBoard(input) {
    const board = {
        ...input,
        id: generateUUID(),
        createdAt: new Date().toISOString(),
    };
    const { store, tx } = await getStore('boards', 'readwrite');
    store.add(board);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('board:created', board.id, board);
    return board;
}
/**
 * Actualiza un tablero existente.
 * Lanza un `Error` si el tablero no existe.
 */
export async function updateBoard(id, changes) {
    const existing = await getBoardById(id);
    if (!existing)
        throw new Error(`Board not found: ${id}`);
    const updated = { ...existing, ...changes, id, createdAt: existing.createdAt };
    const { store, tx } = await getStore('boards', 'readwrite');
    store.put(updated);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('board:updated', updated.id, updated);
    return updated;
}
/**
 * Elimina un tablero por su ID.
 * La lógica de negocio debe eliminar columnas y tareas asociadas antes de llamar esta función.
 */
export async function deleteBoard(id) {
    const { store, tx } = await getStore('boards', 'readwrite');
    store.delete(id);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('board:deleted', id);
}
