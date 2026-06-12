/**
 * repository.factory.ts — Fábrica de repositorios según el modo de operación.
 *
 * Selecciona automáticamente la implementación correcta:
 *   - Modo local  → SyncRepository con remote=null (solo IndexedDB)
 *   - Modo cloud  → SyncRepository con remote=SupabaseRepository (IndexedDB + Supabase)
 *
 * Cada entidad tiene su propia instancia cacheada para evitar suscripciones duplicadas.
 *
 * Tabla de entidades y sus repositorios IndexedDB:
 *   boards       → board.repository.ts functions → adaptador inline
 *   tasks        → task.repository.ts functions  → adaptador inline
 *   columns      → column.repository.ts          → adaptador inline
 *   labels       → label.repository.ts           → adaptador inline
 *   persons      → person.repository.ts          → adaptador inline
 *   projects     → project.repository.ts         → adaptador inline
 *
 * Nota: Los repositorios IndexedDB existentes exponen funciones sueltas.
 * Este archivo los adapta a la interfaz IRepository<T> mediante adaptadores ligeros.
 */

import type { IRepository, BaseEntity } from './repository.interface.js';
import { SyncRepository } from './sync.repository.js';
import { SupabaseRepository } from './supabase.repository.js';
import { getSupabaseClient } from './supabase-client.js';

// ── Adaptador genérico de funciones sueltas a IRepository ──────────────────

/**
 * Convierte un conjunto de funciones sueltas (estilo funcional) en un objeto IRepository<T>.
 * Permite reutilizar los repositorios IndexedDB existentes sin reescribirlos.
 */
export function createFunctionalAdapter<T extends BaseEntity>(fns: {
  findAll: () => Promise<T[]>;
  findById: (id: string) => Promise<T | undefined>;
  create: (entity: T) => Promise<T>;
  update: (id: string, changes: Partial<Omit<T, 'id'>>) => Promise<T>;
  delete: (id: string) => Promise<void>;
}): IRepository<T> {
  return {
    findAll:   fns.findAll,
    findById:  (id) => fns.findById(id).then(v => v ?? null),
    create:    fns.create,
    update:    fns.update,
    delete:    fns.delete,
  };
}

// ── Mapeo de nombre de entidad → tabla de Supabase ─────────────────────────

const SUPABASE_TABLE_MAP: Record<string, string> = {
  boards:        'boards',
  tasks:         'tasks',
  columns:       'columns',
  labels:        'labels',
  persons:       'persons',
  projects:      'projects',
  taskTemplates: 'task_templates',
  activity:      'activity_log',
};

// ── Caché de instancias ────────────────────────────────────────────────────

const _cache = new Map<string, SyncRepository<BaseEntity>>();

// Canceladores de suscripciones Realtime activas
const _unsubscribers = new Map<string, () => void>();

/**
 * Devuelve (o crea) un SyncRepository para la entidad indicada.
 *
 * @param entityName  Clave del mapa (ej: 'tasks', 'boards').
 * @param localRepo   Implementación IndexedDB adaptada a IRepository<T>.
 */
export function getRepository<T extends BaseEntity>(
  entityName: string,
  localRepo: IRepository<T>
): SyncRepository<T> {
  if (_cache.has(entityName)) {
    return _cache.get(entityName) as SyncRepository<T>;
  }

  const client       = getSupabaseClient();
  const tableName    = SUPABASE_TABLE_MAP[entityName] ?? entityName;
  const remoteRepo   = client ? new SupabaseRepository<T>(client, tableName) : null;
  const syncRepo     = new SyncRepository<T>(localRepo, remoteRepo, entityName);

  // Si hay cliente Supabase, activar sincronización en tiempo real
  if (remoteRepo) {
    const unsub = syncRepo.setupRealtimeSync();
    _unsubscribers.set(entityName, unsub);
  }

  _cache.set(entityName, syncRepo as unknown as SyncRepository<BaseEntity>);
  return syncRepo;
}

/**
 * Reinicia todos los repositorios cacheados y sus suscripciones.
 * Debe llamarse al cambiar de modo (local ↔ cloud) o al cerrar sesión.
 */
export function resetRepositories(): void {
  for (const unsub of _unsubscribers.values()) {
    unsub();
  }
  _unsubscribers.clear();
  _cache.clear();
}

/**
 * Ejecuta un full-pull desde Supabase para todas las entidades en caché.
 * Llámalo al conectar Supabase por primera vez o al iniciar sesión.
 */
export async function pullAllFromRemote(): Promise<void> {
  const pulls: Promise<void>[] = [];
  for (const repo of _cache.values()) {
    pulls.push((repo as unknown as SyncRepository<BaseEntity>).pullFromRemote());
  }
  await Promise.allSettled(pulls);
}

/**
 * Vacía la cola de pendientes de todas las entidades en caché.
 * Llámalo al recuperar conexión a internet o al iniciar sesión.
 */
export async function flushAllPending(): Promise<void> {
  const flushes: Promise<void>[] = [];
  for (const repo of _cache.values()) {
    flushes.push((repo as unknown as SyncRepository<BaseEntity>).flushPending());
  }
  await Promise.allSettled(flushes);
}
