/**
 * project.repository.ts — CRUD de proyectos sobre IndexedDB (US-26).
 *
 * Los proyectos agrupan tareas bajo identificadores legibles (ej. "WEB-005").
 * Cada proyecto tiene un prefijo único (máx. 5 chars, uppercase) y un contador
 * secuencial para generar taskNumbers.
 */
import { idbRequest, idbTransaction, getStore, openDatabase } from './database.js';
import { generateUUID } from '../utils/uuid.js';
import { DEFAULT_PROJECT_NAME, DEFAULT_PROJECT_PREFIX } from '../types/models.js';
// ── Validación ─────────────────────────────────────────────────────────────
const PREFIX_RE = /^[A-Z]{1,5}$/;
/** Valida que un prefijo cumpla el formato: 1-5 letras, solo mayúsculas. */
export function isValidPrefix(prefix) {
    return PREFIX_RE.test(prefix);
}
// ── Implementación ─────────────────────────────────────────────────────────
/** Devuelve todos los proyectos ordenados por fecha de creación ascendente. */
export async function getAllProjects() {
    const { store } = await getStore('projects');
    const projects = await idbRequest(store.getAll());
    return projects.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
/** Devuelve un proyecto por su ID, o `undefined` si no existe. */
export async function getProjectById(id) {
    const { store } = await getStore('projects');
    return idbRequest(store.get(id));
}
/** Devuelve un proyecto por su prefijo, o `undefined` si no existe. */
export async function getProjectByPrefix(prefix) {
    const { store } = await getStore('projects');
    const index = store.index('by-prefix');
    return idbRequest(index.get(prefix.toUpperCase()));
}
/**
 * Crea un nuevo proyecto. Asigna `id`, `nextTaskNumber` (1) y `createdAt` automáticamente.
 * Valida formato y unicidad del prefijo.
 */
export async function createProject(input) {
    const normalizedPrefix = input.prefix.toUpperCase();
    if (!isValidPrefix(normalizedPrefix)) {
        throw new Error('El prefijo debe tener entre 1 y 5 letras mayúsculas (A-Z).');
    }
    // Verificar unicidad del prefijo
    const existing = await getProjectByPrefix(normalizedPrefix);
    if (existing) {
        throw new Error(`Ya existe un proyecto con el prefijo "${normalizedPrefix}".`);
    }
    const project = {
        id: generateUUID(),
        name: input.name,
        prefix: normalizedPrefix,
        description: input.description,
        nextTaskNumber: 1,
        createdAt: new Date().toISOString(),
    };
    const { store, tx } = await getStore('projects', 'readwrite');
    store.add(project);
    await idbTransaction(tx);
    return project;
}
/**
 * Actualiza un proyecto existente. El prefijo es inmutable.
 * Lanza un `Error` si el proyecto no existe.
 */
export async function updateProject(id, changes) {
    const existing = await getProjectById(id);
    if (!existing)
        throw new Error(`Project not found: ${id}`);
    const updated = {
        ...existing,
        ...changes,
        id,
        prefix: existing.prefix, // prefijo inmutable
        nextTaskNumber: existing.nextTaskNumber,
        createdAt: existing.createdAt,
    };
    const { store, tx } = await getStore('projects', 'readwrite');
    store.put(updated);
    await idbTransaction(tx);
    return updated;
}
/**
 * Elimina un proyecto por su ID y reasigna sus tareas al proyecto "General".
 * No permite eliminar el proyecto por defecto "General".
 */
export async function deleteProject(id) {
    const db = await openDatabase();
    const tx = db.transaction(['projects', 'tasks'], 'readwrite');
    const projectStore = tx.objectStore('projects');
    const project = await idbRequest(projectStore.get(id));
    if (!project)
        return;
    if (project.prefix === DEFAULT_PROJECT_PREFIX) {
        throw new Error('No se puede eliminar el proyecto por defecto "General".');
    }
    // Buscar el proyecto General para reasignación dentro de la misma transacción
    const prefixIndex = projectStore.index('by-prefix');
    const generalProject = await idbRequest(prefixIndex.get(DEFAULT_PROJECT_PREFIX));
    if (!generalProject) {
        throw new Error('No se encontró el proyecto "General" para reasignar tareas.');
    }
    // Reasignar tareas del proyecto eliminado al proyecto General
    const taskStore = tx.objectStore('tasks');
    const taskIndex = taskStore.index('by-project');
    const tasks = await idbRequest(taskIndex.getAll(id));
    for (const task of tasks) {
        task.projectId = generalProject.id;
        // El taskNumber se mantiene como estaba (conserva trazabilidad)
        taskStore.put(task);
    }
    // Eliminar el proyecto
    projectStore.delete(id);
    await idbTransaction(tx);
}
/**
 * Obtiene el siguiente taskNumber para un proyecto y lo incrementa atómicamente.
 * Devuelve el identificador legible (ej. "WEB-005").
 */
export async function getNextTaskNumber(projectId) {
    const db = await openDatabase();
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const project = await idbRequest(store.get(projectId));
    if (!project)
        throw new Error(`Project not found: ${projectId}`);
    const num = project.nextTaskNumber;
    const taskNumber = `${project.prefix}-${String(num).padStart(3, '0')}`;
    project.nextTaskNumber = num + 1;
    store.put(project);
    await idbTransaction(tx);
    return taskNumber;
}
/**
 * Inicializa el proyecto por defecto "General" si no existe.
 * Idempotente: no hace nada si ya existe.
 */
export async function seedDefaultProject() {
    const existing = await getProjectByPrefix(DEFAULT_PROJECT_PREFIX);
    if (existing)
        return;
    const project = {
        id: generateUUID(),
        name: DEFAULT_PROJECT_NAME,
        prefix: DEFAULT_PROJECT_PREFIX,
        description: 'Proyecto por defecto para tareas sin proyecto asignado.',
        nextTaskNumber: 1,
        createdAt: new Date().toISOString(),
    };
    const { store, tx } = await getStore('projects', 'readwrite');
    store.add(project);
    await idbTransaction(tx);
}
