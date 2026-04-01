/**
 * person.repository.ts — CRUD de personas sobre IndexedDB.
 *
 * Gestión del directorio local de personas para asignación a tareas (US-29).
 * Todas las operaciones son asíncronas y devuelven Promesas.
 * Los IDs se generan con `crypto.randomUUID()` en el cliente.
 */
import { idbRequest, idbTransaction, getStore } from './database.js';
import { generateUUID } from '../utils/uuid.js';
import { emitSync } from '../utils/broadcast-sync.js';
// ── Implementación ─────────────────────────────────────────────────────────
/** Devuelve todas las personas almacenadas, ordenadas alfabéticamente. */
export async function getAllPersons() {
    const { store } = await getStore('persons');
    const persons = await idbRequest(store.getAll());
    return persons.sort((a, b) => a.name.localeCompare(b.name));
}
/** Devuelve una persona por su ID, o `undefined` si no existe. */
export async function getPersonById(id) {
    const { store } = await getStore('persons');
    return idbRequest(store.get(id));
}
/** Devuelve múltiples personas por sus IDs. Ignora IDs inexistentes. */
export async function getPersonsByIds(ids) {
    if (ids.length === 0)
        return [];
    const { store } = await getStore('persons');
    const persons = [];
    for (const id of ids) {
        const person = await idbRequest(store.get(id));
        if (person) {
            persons.push(person);
        }
    }
    return persons.sort((a, b) => a.name.localeCompare(b.name));
}
/**
 * Busca personas por nombre (case-insensitive, búsqueda parcial).
 * Útil para autocompletado en la asignación de tareas.
 */
export async function searchPersonsByName(query) {
    if (!query.trim())
        return getAllPersons();
    const allPersons = await getAllPersons();
    const normalizedQuery = query.toLowerCase().trim();
    return allPersons.filter(person => person.name.toLowerCase().includes(normalizedQuery));
}
/**
 * Crea una nueva persona. Asigna `id` y `createdAt` automáticamente.
 * Si no se proporciona avatar, se genera la inicial del nombre.
 */
export async function createPerson(input) {
    const now = new Date().toISOString();
    // Generar inicial si no se proporciona avatar
    const avatar = input.avatar || getInitialFromName(input.name);
    const person = {
        ...input,
        avatar,
        id: generateUUID(),
        createdAt: now,
    };
    const { store, tx } = await getStore('persons', 'readwrite');
    store.add(person);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('person:created', person.id, person);
    return person;
}
/**
 * Actualiza una persona existente.
 * Lanza un `Error` si la persona no existe.
 */
export async function updatePerson(id, changes) {
    const existing = await getPersonById(id);
    if (!existing)
        throw new Error(`Person not found: ${id}`);
    const updated = {
        ...existing,
        ...changes,
        id, // id nunca puede cambiar
        createdAt: existing.createdAt, // createdAt nunca puede cambiar
    };
    const { store, tx } = await getStore('persons', 'readwrite');
    store.put(updated);
    await idbTransaction(tx);
    // Emitir evento de sincronización (US-30)
    emitSync('person:updated', updated.id, updated);
    return updated;
}
/**
 * Elimina una persona por su ID. No lanza error si no existe.
 * IMPORTANTE: También desasocia automáticamente la persona de todas las tareas.
 */
export async function deletePerson(id) {
    const person = await getPersonById(id);
    if (!person)
        return; // Silencioso si no existe
    const db = await import('./database.js').then(m => m.openDatabase());
    const tx = db.transaction(['persons', 'tasks'], 'readwrite');
    try {
        // 1. Eliminar persona del store
        const personStore = tx.objectStore('persons');
        personStore.delete(id);
        // 2. Desasociar de todas las tareas
        const taskStore = tx.objectStore('tasks');
        const allTasks = await idbRequest(taskStore.getAll());
        for (const task of allTasks) {
            if (task.assignees.includes(id)) {
                const updatedTask = {
                    ...task,
                    assignees: task.assignees.filter(assigneeId => assigneeId !== id),
                    updatedAt: new Date().toISOString(),
                };
                taskStore.put(updatedTask);
                // Emitir evento de actualización por cada tarea modificada
                emitSync('task:updated', updatedTask.id, updatedTask);
            }
        }
        await idbTransaction(tx);
        // Emitir evento de eliminación de persona
        emitSync('person:deleted', id);
    }
    catch (error) {
        console.error('Error eliminando persona:', error);
        throw error;
    }
}
// ── Utilidades internas ────────────────────────────────────────────────────
/**
 * Genera la inicial de una persona a partir de su nombre.
 * Ejemplos: "Juan Pérez" → "JP", "Ana" → "A"
 */
function getInitialFromName(name) {
    if (!name.trim())
        return '?';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].charAt(0).toUpperCase();
    }
    // Tomar primera letra de cada palabra (máximo 2)
    return words
        .slice(0, 2)
        .map(word => word.charAt(0).toUpperCase())
        .join('');
}
