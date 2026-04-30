/**
 * template.repository.ts — CRUD de templates de tareas sobre IndexedDB (US-36).
 *
 * Object store: taskTemplates | keyPath: id
 */

import { idbRequest, idbTransaction, getStore } from './database.js';
import { generateUUID } from '../utils/uuid.js';
import { emitSync } from '../utils/broadcast-sync.js';
import type { TaskTemplate } from '../types/models.js';

type CreateTemplateInput = Omit<TaskTemplate, 'id' | 'createdAt'>;
type UpdateTemplateInput = Partial<Omit<TaskTemplate, 'id' | 'createdAt'>>;

// ── Implementación ─────────────────────────────────────────────────────────

/** Devuelve todos los templates, ordenados alfabéticamente por nombre. */
export async function getAllTemplates(): Promise<TaskTemplate[]> {
  const { store } = await getStore('taskTemplates');
  const templates = await idbRequest<TaskTemplate[]>(store.getAll());
  return templates.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

/** Devuelve un template por su ID, o `undefined` si no existe. */
export async function getTemplateById(id: string): Promise<TaskTemplate | undefined> {
  const { store } = await getStore('taskTemplates');
  return idbRequest<TaskTemplate | undefined>(store.get(id));
}

/**
 * Crea un nuevo template.
 * Lanza un `Error` si ya existe un template con el mismo nombre (case-insensitive).
 */
export async function createTemplate(input: CreateTemplateInput): Promise<TaskTemplate> {
  const existing = await getAllTemplates();
  const nameLower = input.name.trim().toLowerCase();
  if (!nameLower) throw new Error('El nombre del template es obligatorio.');
  if (existing.some(t => t.name.toLowerCase() === nameLower)) {
    throw new Error(`Ya existe un template con el nombre "${input.name}".`);
  }

  const template: TaskTemplate = {
    ...input,
    name:      input.name.trim(),
    id:        generateUUID(),
    createdAt: new Date().toISOString(),
  };

  const { store, tx } = await getStore('taskTemplates', 'readwrite');
  store.add(template);
  await idbTransaction(tx);

  emitSync('template:created', template.id, template);
  return template;
}

/**
 * Actualiza un template existente.
 * Si se cambia el nombre, verifica que no exista un duplicado.
 */
export async function updateTemplate(id: string, changes: UpdateTemplateInput): Promise<TaskTemplate> {
  const existing = await getTemplateById(id);
  if (!existing) throw new Error(`Template not found: ${id}`);

  if (changes.name !== undefined) {
    const trimmed = changes.name.trim();
    if (!trimmed) throw new Error('El nombre del template es obligatorio.');
    const all = await getAllTemplates();
    if (all.some(t => t.id !== id && t.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Ya existe un template con el nombre "${changes.name}".`);
    }
    changes = { ...changes, name: trimmed };
  }

  const updated: TaskTemplate = { ...existing, ...changes, id };

  const { store, tx } = await getStore('taskTemplates', 'readwrite');
  store.put(updated);
  await idbTransaction(tx);

  emitSync('template:updated', id, updated);
  return updated;
}

/**
 * Elimina un template.
 * Las tareas creadas con el template no se ven afectadas.
 */
export async function deleteTemplate(id: string): Promise<void> {
  const existing = await getTemplateById(id);
  if (!existing) throw new Error(`Template not found: ${id}`);

  const { store, tx } = await getStore('taskTemplates', 'readwrite');
  store.delete(id);
  await idbTransaction(tx);

  emitSync('template:deleted', id, { id });
}
