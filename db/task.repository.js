/**
 * task.repository.ts — CRUD de tareas sobre IndexedDB.
 *
 * Todas las operaciones son asíncronas y devuelven Promesas.
 * Los IDs se generan con `crypto.randomUUID()` en el cliente.
 */
import { idbRequest, idbTransaction, getStore, openDatabase } from './database.js';
import { generateUUID } from '../utils/uuid.js';
import { emitSync } from '../utils/broadcast-sync.js';
// ── Implementación ─────────────────────────────────────────────────────────
/** Devuelve todas las tareas almacenadas. */
export async function getAllTasks() {
    const { store } = await getStore('tasks');
    return idbRequest(store.getAll());
}
/**
 * Devuelve todas las tareas de una columna específica,
 * ordenadas por su campo `order` ascendente.
 */
export async function getTasksByStatus(statusId) {
    const { store } = await getStore('tasks');
    const index = store.index('by-status');
    const tasks = await idbRequest(index.getAll(statusId));
    return tasks.sort((a, b) => a.order - b.order);
}
/** Devuelve una tarea por su ID, o `undefined` si no existe. */
export async function getTaskById(id) {
    const { store } = await getStore('tasks');
    return idbRequest(store.get(id));
}
/** Devuelve todas las tareas que coincidan con una prioridad. */
export async function getTasksByPriority(priority) {
    const { store } = await getStore('tasks');
    const index = store.index('by-priority');
    const tasks = await idbRequest(index.getAll(priority));
    return tasks.sort((a, b) => a.order - b.order);
}
/**
 * Crea una nueva tarea. Asigna `id`, `createdAt` y `updatedAt` automáticamente.
 * El campo `order` se calcula como el máximo actual + 1 dentro de la columna.
 */
export async function createTask(input) {
    const now = new Date().toISOString();
    const task = {
        ...input,
        id: generateUUID(),
        createdAt: now,
        updatedAt: now,
    };
    const { store, tx } = await getStore('tasks', 'readwrite');
    store.add(task);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('task:created', task.id, task);
    return task;
}
/**
 * Actualiza una tarea existente. Actualiza `updatedAt` automáticamente.
 * Lanza un `Error` si la tarea no existe.
 */
export async function updateTask(id, changes) {
    const existing = await getTaskById(id);
    if (!existing)
        throw new Error(`Task not found: ${id}`);
    const updated = {
        ...existing,
        ...changes,
        id, // id nunca puede cambiar
        createdAt: existing.createdAt, // createdAt nunca puede cambiar
        updatedAt: new Date().toISOString(),
    };
    const { store, tx } = await getStore('tasks', 'readwrite');
    store.put(updated);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('task:updated', updated.id, updated);
    return updated;
}
/** Elimina una tarea por su ID. No lanza error si no existe. */
export async function deleteTask(id) {
    const { store, tx } = await getStore('tasks', 'readwrite');
    store.delete(id);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('task:deleted', id);
}
/**
 * Reordena las tareas dentro de una columna.
 * @param statusId   - ID de la columna.
 * @param orderedIds - IDs de las tareas en el nuevo orden deseado.
 */
export async function reorderTasks(statusId, orderedIds) {
    // Una única transacción readwrite para eliminar la ventana de inconsistencia
    // que existía al usar getTasksByStatus() (readonly) + getStore() (readwrite) por separado.
    const db = await openDatabase();
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const index = store.index('by-status');
    const tasks = await idbRequest(index.getAll(statusId));
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const now = new Date().toISOString();
    orderedIds.forEach((id, order) => {
        const task = taskMap.get(id);
        if (task)
            store.put({ ...task, order, updatedAt: now });
    });
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('task:reordered', statusId, { orderedIds });
}
/**
 * Devuelve los IDs de todas las tareas de un tablero (US-22).
 */
export async function getTaskIdsByBoard(boardId) {
    const { store } = await getStore('tasks');
    const index = store.index('by-board');
    const tasks = await idbRequest(index.getAll(boardId));
    return tasks.map(t => t.id);
}
/**
 * Elimina todas las tareas de un tablero (US-22).
 */
export async function deleteTasksByBoard(boardId) {
    const db = await openDatabase();
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const index = store.index('by-board');
    const tasks = await idbRequest(index.getAll(boardId));
    for (const task of tasks) {
        store.delete(task.id);
    }
    await idbTransaction(tx);
}
