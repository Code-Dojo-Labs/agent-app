/**
 * activity.repository.ts — CRUD de eventos de actividad sobre IndexedDB.
 *
 * Registra y consulta el historial de cambios de cada tarea (US-20).
 * Los eventos se almacenan en el object store `activity` con índice `by-taskId`.
 */

import { idbRequest, idbTransaction, getStore, openDatabase } from './database.js';
import { generateUUID } from '../utils/uuid.js';
import type { ActivityEvent, ActivityEventType } from '../types/models.js';

// ── Tipos internos ─────────────────────────────────────────────────────────

type CreateActivityInput = {
  taskId:  string;
  type:    ActivityEventType;
  payload: Record<string, unknown>;
};

// ── Implementación ─────────────────────────────────────────────────────────

/**
 * Registra un nuevo evento de actividad asociado a una tarea.
 * Asigna `id` y `createdAt` automáticamente.
 */
export async function addActivityEvent(input: CreateActivityInput): Promise<ActivityEvent> {
  const event: ActivityEvent = {
    id:        generateUUID(),
    taskId:    input.taskId,
    type:      input.type,
    payload:   input.payload,
    createdAt: new Date().toISOString(),
  };

  const { store, tx } = await getStore('activity', 'readwrite');
  store.add(event);
  await idbTransaction(tx);
  return event;
}

/**
 * Devuelve todos los eventos de actividad de una tarea,
 * ordenados del más reciente al más antiguo.
 */
export async function getActivitiesByTaskId(taskId: string): Promise<ActivityEvent[]> {
  const { store } = await getStore('activity');
  const index     = store.index('by-taskId');
  const events    = await idbRequest<ActivityEvent[]>(index.getAll(taskId));
  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Elimina todos los eventos de actividad asociados a una tarea.
 * Útil al eliminar la tarea para no dejar registros huérfanos.
 */
export async function deleteActivitiesByTaskId(taskId: string): Promise<void> {
  const db    = await openDatabase();
  const tx    = db.transaction('activity', 'readwrite');
  const store = tx.objectStore('activity');
  const index = store.index('by-taskId');
  const keys  = await idbRequest<IDBValidKey[]>(index.getAllKeys(taskId));

  for (const key of keys) {
    store.delete(key);
  }

  await idbTransaction(tx);
}
