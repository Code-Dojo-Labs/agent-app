/**
 * board.repository.ts — CRUD de tableros sobre IndexedDB (US-22).
 *
 * Cada tablero agrupa un conjunto independiente de columnas y tareas.
 * Las etiquetas son globales y se comparten entre todos los tableros.
 */

import { idbRequest, idbTransaction, getStore } from './database.js';
import { generateUUID } from '../utils/uuid.js';
import { emitSync } from '../utils/broadcast-sync.js';
import { syncUpsert, syncDelete } from './supabase-sync.js';
import type { Board } from '../types/models.js';

// ── Tipos internos ─────────────────────────────────────────────────────────

type CreateBoardInput = Omit<Board, 'id' | 'createdAt'>;
type UpdateBoardInput = Partial<Omit<Board, 'id' | 'createdAt'>>;

// ── Implementación ─────────────────────────────────────────────────────────

/** Devuelve todos los tableros ordenados por fecha de creación ascendente. */
export async function getAllBoards(): Promise<Board[]> {
  const { store } = await getStore('boards');
  const boards    = await idbRequest<Board[]>(store.getAll());
  return boards.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Devuelve un tablero por su ID, o `undefined` si no existe. */
export async function getBoardById(id: string): Promise<Board | undefined> {
  const { store } = await getStore('boards');
  return idbRequest<Board | undefined>(store.get(id));
}

/**
 * Crea un nuevo tablero. Asigna `id` y `createdAt` automáticamente.
 */
export async function createBoard(input: CreateBoardInput): Promise<Board> {
  const board: Board = {
    ...input,
    id:        generateUUID(),
    createdAt: new Date().toISOString(),
  };

  const { store, tx } = await getStore('boards', 'readwrite');
  store.add(board);
  await idbTransaction(tx);

  // Emitir evento de sincronización (US-30)
  emitSync('board:created', board.id, board);
  // Replicar en Supabase (US-42)
  syncUpsert('boards', board);

  return board;
}

/**
 * Actualiza un tablero existente.
 * Lanza un `Error` si el tablero no existe.
 */
export async function updateBoard(id: string, changes: UpdateBoardInput): Promise<Board> {
  const existing = await getBoardById(id);
  if (!existing) throw new Error(`Board not found: ${id}`);

  const updated: Board = { ...existing, ...changes, id, createdAt: existing.createdAt };

  const { store, tx } = await getStore('boards', 'readwrite');
  store.put(updated);
  await idbTransaction(tx);

  // Emitir evento de sincronización (US-30)
  emitSync('board:updated', updated.id, updated);
  // Replicar en Supabase (US-42)
  syncUpsert('boards', updated);

  return updated;
}

/**
 * Elimina un tablero por su ID.
 * La lógica de negocio debe eliminar columnas y tareas asociadas antes de llamar esta función.
 */
export async function deleteBoard(id: string): Promise<void> {
  const { store, tx } = await getStore('boards', 'readwrite');
  store.delete(id);
  await idbTransaction(tx);

  // Emitir evento de sincronización (US-30)
  emitSync('board:deleted', id);
  // Replicar en Supabase (US-42)
  syncDelete('boards', id);
}
