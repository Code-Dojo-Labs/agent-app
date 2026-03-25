/**
 * column.repository.ts — CRUD de columnas sobre IndexedDB.
 *
 * Las columnas definen los estados del tablero Kanban.
 * Al inicializar la app se insertan las columnas por defecto si el store está vacío.
 */

import { idbRequest, idbTransaction, getStore } from './database.js';
import { generateUUID } from '../utils/uuid.js';
import { DEFAULT_COLUMNS } from '../types/models.js';
import type { Column } from '../types/models.js';

// ── Tipos internos ─────────────────────────────────────────────────────────

type CreateColumnInput = Omit<Column, 'id'>;
type UpdateColumnInput = Partial<Omit<Column, 'id'>>;

// ── Implementación ─────────────────────────────────────────────────────────

/** Devuelve todas las columnas ordenadas por `order` ascendente. */
export async function getAllColumns(): Promise<Column[]> {
  const { store } = await getStore('columns');
  const columns   = await idbRequest<Column[]>(store.getAll());
  return columns.sort((a, b) => a.order - b.order);
}

/** Devuelve una columna por su ID, o `undefined` si no existe. */
export async function getColumnById(id: string): Promise<Column | undefined> {
  const { store } = await getStore('columns');
  return idbRequest<Column | undefined>(store.get(id));
}

/**
 * Crea una nueva columna. Asigna `id` automáticamente.
 * Si no se especifica `order`, lo asigna como el máximo actual + 1.
 */
export async function createColumn(input: CreateColumnInput): Promise<Column> {
  const column: Column = { ...input, id: generateUUID() };

  const { store, tx } = await getStore('columns', 'readwrite');
  store.add(column);
  await idbTransaction(tx);
  return column;
}

/**
 * Actualiza una columna existente.
 * Lanza un `Error` si la columna no existe.
 */
export async function updateColumn(id: string, changes: UpdateColumnInput): Promise<Column> {
  const existing = await getColumnById(id);
  if (!existing) throw new Error(`Column not found: ${id}`);

  const updated: Column = { ...existing, ...changes, id };

  const { store, tx } = await getStore('columns', 'readwrite');
  store.put(updated);
  await idbTransaction(tx);
  return updated;
}

/**
 * Elimina una columna por su ID.
 * Nota: la lógica de negocio debe reasignar o eliminar las tareas asociadas antes de llamar a esta función.
 */
export async function deleteColumn(id: string): Promise<void> {
  const { store, tx } = await getStore('columns', 'readwrite');
  store.delete(id);
  await idbTransaction(tx);
}

/**
 * Inserta las columnas por defecto si el Object Store está vacío.
 * Se llama una sola vez durante la inicialización de la aplicación.
 */
export async function seedDefaultColumns(): Promise<void> {
  const existing = await getAllColumns();
  if (existing.length > 0) return;

  const { store, tx } = await getStore('columns', 'readwrite');
  for (const col of DEFAULT_COLUMNS) {
    store.add({ ...col, id: generateUUID() });
  }
  await idbTransaction(tx);
}
