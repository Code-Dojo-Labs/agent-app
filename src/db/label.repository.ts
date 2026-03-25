/**
 * label.repository.ts — CRUD de etiquetas sobre IndexedDB.
 *
 * Las etiquetas son reutilizables y se pueden asociar a múltiples tareas.
 * El campo `name` debe ser único (case-insensitive); la validación se realiza
 * en esta capa antes de escribir en IndexedDB.
 */

import { idbRequest, idbTransaction, getStore } from './database.js';
import { generateUUID } from '../utils/uuid.js';
import type { Label } from '../types/models.js';

// ── Tipos internos ─────────────────────────────────────────────────────────

type CreateLabelInput = Omit<Label, 'id'>;
type UpdateLabelInput = Partial<Omit<Label, 'id'>>;

// ── Implementación ─────────────────────────────────────────────────────────

/** Devuelve todas las etiquetas, ordenadas alfabéticamente por nombre. */
export async function getAllLabels(): Promise<Label[]> {
  const { store }  = await getStore('labels');
  const labels     = await idbRequest<Label[]>(store.getAll());
  return labels.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}

/** Devuelve una etiqueta por su ID, o `undefined` si no existe. */
export async function getLabelById(id: string): Promise<Label | undefined> {
  const { store } = await getStore('labels');
  return idbRequest<Label | undefined>(store.get(id));
}

/**
 * Busca una etiqueta por nombre de forma case-insensitive.
 * IndexedDB no soporta collations, por lo que la búsqueda se realiza en memoria.
 */
export async function findLabelByName(name: string): Promise<Label | undefined> {
  const labels = await getAllLabels();
  const target = name.toLowerCase();
  return labels.find(l => l.name.toLowerCase() === target);
}

/**
 * Crea una nueva etiqueta.
 * Lanza un `Error` si ya existe una etiqueta con el mismo nombre (case-insensitive).
 */
export async function createLabel(input: CreateLabelInput): Promise<Label> {
  const duplicate = await findLabelByName(input.name);
  if (duplicate) throw new Error(`Label already exists: "${input.name}"`);

  const label: Label = { ...input, id: generateUUID() };

  const { store, tx } = await getStore('labels', 'readwrite');
  store.add(label);
  await idbTransaction(tx);
  return label;
}

/**
 * Actualiza una etiqueta existente.
 * Si se cambia el nombre, verifica que no exista un duplicado.
 * Lanza un `Error` si la etiqueta no existe o el nuevo nombre ya está en uso.
 */
export async function updateLabel(id: string, changes: UpdateLabelInput): Promise<Label> {
  const existing = await getLabelById(id);
  if (!existing) throw new Error(`Label not found: ${id}`);

  if (changes.name && changes.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await findLabelByName(changes.name);
    if (duplicate) throw new Error(`Label already exists: "${changes.name}"`);
  }

  const updated: Label = { ...existing, ...changes, id };

  const { store, tx } = await getStore('labels', 'readwrite');
  store.put(updated);
  await idbTransaction(tx);
  return updated;
}

/** Elimina una etiqueta por su ID. No lanza error si no existe. */
export async function deleteLabel(id: string): Promise<void> {
  const { store, tx } = await getStore('labels', 'readwrite');
  store.delete(id);
  await idbTransaction(tx);
}
