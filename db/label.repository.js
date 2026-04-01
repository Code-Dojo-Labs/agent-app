/**
 * label.repository.ts — CRUD de etiquetas sobre IndexedDB.
 *
 * Las etiquetas son reutilizables y se pueden asociar a múltiples tareas.
 * El campo `name` debe ser único (case-insensitive); la validación se realiza
 * en esta capa antes de escribir en IndexedDB.
 */
import { idbRequest, idbTransaction, getStore, openDatabase } from './database.js';
import { generateUUID } from '../utils/uuid.js';
import { emitSync } from '../utils/broadcast-sync.js';
import { DEFAULT_LABELS } from '../types/models.js';
// ── Implementación ─────────────────────────────────────────────────────────
/** Devuelve todas las etiquetas, ordenadas alfabéticamente por nombre. */
export async function getAllLabels() {
    const { store } = await getStore('labels');
    const labels = await idbRequest(store.getAll());
    return labels.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}
/** Devuelve una etiqueta por su ID, o `undefined` si no existe. */
export async function getLabelById(id) {
    const { store } = await getStore('labels');
    return idbRequest(store.get(id));
}
/**
 * Busca una etiqueta por nombre de forma case-insensitive.
 * IndexedDB no soporta collations, por lo que la búsqueda se realiza en memoria.
 */
export async function findLabelByName(name) {
    const labels = await getAllLabels();
    const target = name.toLowerCase();
    return labels.find(l => l.name.toLowerCase() === target);
}
/**
 * Crea una nueva etiqueta.
 * Lanza un `Error` si ya existe una etiqueta con el mismo nombre (case-insensitive).
 */
export async function createLabel(input) {
    const duplicate = await findLabelByName(input.name);
    if (duplicate)
        throw new Error(`Label already exists: "${input.name}"`);
    const label = { ...input, id: generateUUID() };
    const { store, tx } = await getStore('labels', 'readwrite');
    store.add(label);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('label:created', label.id, label);
    return label;
}
/**
 * Actualiza una etiqueta existente.
 * Si se cambia el nombre, verifica que no exista un duplicado.
 * Lanza un `Error` si la etiqueta no existe o el nuevo nombre ya está en uso.
 */
export async function updateLabel(id, changes) {
    const existing = await getLabelById(id);
    if (!existing)
        throw new Error(`Label not found: ${id}`);
    if (changes.name && changes.name.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await findLabelByName(changes.name);
        if (duplicate)
            throw new Error(`Label already exists: "${changes.name}"`);
    }
    const updated = { ...existing, ...changes, id };
    const { store, tx } = await getStore('labels', 'readwrite');
    store.put(updated);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('label:updated', updated.id, updated);
    return updated;
}
/** Devuelve el número de tareas que tienen asignada una etiqueta. */
export async function countTasksByLabelId(labelId) {
    const db = await openDatabase();
    const tx = db.transaction('tasks', 'readonly');
    const store = tx.objectStore('tasks');
    const tasks = await idbRequest(store.getAll());
    return tasks.filter(t => (t.labelIds ?? []).includes(labelId)).length;
}
/**
 * Elimina una etiqueta y limpia su referencia en todas las tareas asociadas.
 * La operación es atómica: usa una transacción que abarca los stores
 * "labels" y "tasks" para evitar inconsistencias.
 */
export async function deleteLabel(id) {
    const db = await openDatabase();
    const tx = db.transaction(['labels', 'tasks'], 'readwrite');
    const labelStore = tx.objectStore('labels');
    const taskStore = tx.objectStore('tasks');
    // Eliminar la etiqueta
    labelStore.delete(id);
    // Quitar el ID de la etiqueta de todas las tareas que la referenciaban
    const allTasks = await idbRequest(taskStore.getAll());
    for (const task of allTasks) {
        if ((task.labelIds ?? []).includes(id)) {
            taskStore.put({
                ...task,
                labelIds: task.labelIds.filter(lid => lid !== id),
                updatedAt: new Date().toISOString(),
            });
        }
    }
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('label:deleted', id);
}
/**
 * Inserta las etiquetas por defecto si el Object Store está vacío.
 * Se llama una sola vez durante la inicialización de la aplicación.
 */
export async function seedDefaultLabels() {
    const existing = await getAllLabels();
    if (existing.length > 0)
        return;
    const { store, tx } = await getStore('labels', 'readwrite');
    for (const lbl of DEFAULT_LABELS) {
        store.add({ ...lbl, id: generateUUID() });
    }
    await idbTransaction(tx);
}
