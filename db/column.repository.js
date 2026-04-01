/**
 * column.repository.ts — CRUD de columnas sobre IndexedDB.
 *
 * Las columnas definen los estados del tablero Kanban.
 * Al inicializar la app se insertan las columnas por defecto si el store está vacío.
 */
import { idbRequest, idbTransaction, getStore } from './database.js';
import { generateUUID } from '../utils/uuid.js';
import { emitSync } from '../utils/broadcast-sync.js';
import { DEFAULT_COLUMNS } from '../types/models.js';
// ── Implementación ─────────────────────────────────────────────────────────
/** Devuelve todas las columnas ordenadas por `order` ascendente. */
export async function getAllColumns() {
    const { store } = await getStore('columns');
    const columns = await idbRequest(store.getAll());
    return columns.sort((a, b) => a.order - b.order);
}
/** Devuelve todas las columnas de un tablero, ordenadas por `order` ascendente (US-22). */
export async function getColumnsByBoard(boardId) {
    const { store } = await getStore('columns');
    const index = store.index('by-board');
    const columns = await idbRequest(index.getAll(boardId));
    return columns.sort((a, b) => a.order - b.order);
}
/** Devuelve una columna por su ID, o `undefined` si no existe. */
export async function getColumnById(id) {
    const { store } = await getStore('columns');
    return idbRequest(store.get(id));
}
/**
 * Crea una nueva columna. Asigna `id` automáticamente.
 * Si no se especifica `order`, lo asigna como el máximo actual + 1.
 */
export async function createColumn(input) {
    const column = { ...input, id: generateUUID() };
    const { store, tx } = await getStore('columns', 'readwrite');
    store.add(column);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('column:created', column.id, column);
    return column;
}
/**
 * Actualiza una columna existente.
 * Lanza un `Error` si la columna no existe.
 */
export async function updateColumn(id, changes) {
    const existing = await getColumnById(id);
    if (!existing)
        throw new Error(`Column not found: ${id}`);
    const updated = { ...existing, ...changes, id };
    const { store, tx } = await getStore('columns', 'readwrite');
    store.put(updated);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('column:updated', updated.id, updated);
    return updated;
}
/**
 * Elimina una columna por su ID.
 * Nota: la lógica de negocio debe reasignar o eliminar las tareas asociadas antes de llamar a esta función.
 */
export async function deleteColumn(id) {
    const { store, tx } = await getStore('columns', 'readwrite');
    store.delete(id);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('column:deleted', id);
}
/**
 * Inserta las columnas por defecto para un tablero dado.
 * @param boardId - ID del tablero al que pertenecerán las columnas.
 */
export async function seedDefaultColumns(boardId) {
    const { store, tx } = await getStore('columns', 'readwrite');
    for (const col of DEFAULT_COLUMNS) {
        store.add({ ...col, id: generateUUID(), boardId });
    }
    await idbTransaction(tx);
}
/**
 * Elimina todas las columnas de un tablero (US-22).
 */
export async function deleteColumnsByBoard(boardId) {
    const cols = await getColumnsByBoard(boardId);
    if (cols.length === 0)
        return;
    const { store, tx } = await getStore('columns', 'readwrite');
    for (const col of cols) {
        store.delete(col.id);
    }
    await idbTransaction(tx);
}
