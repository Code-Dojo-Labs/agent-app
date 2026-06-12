/**
 * sync.repository.ts — SyncRepository: wrapper offline-first que combina IndexedDB + Supabase.
 *
 * Estrategia:
 *   1. Las escrituras se aplican primero en IndexedDB (inmediatas, sin latencia).
 *   2. Si Supabase está disponible y hay conexión, se replica en tiempo real.
 *   3. Si no hay conexión, la operación se encola en `localStorage` como operación pendiente.
 *   4. Al detectar recuperación de conexión (`online` event), se ejecuta la cola de pendientes.
 *
 * Conflictos: last-write-wins basado en `updatedAt` (ISO 8601 timestamp).
 *
 * Dependencias:
 *   - IRepository<T>           → interfaz compartida
 *   - SupabaseRepository<T>    → escrituras en la nube
 *   - PendingOperation<T>      → cola de operaciones offline
 */

import type { IRepository, BaseEntity, PendingOperation } from './repository.interface.js';
import type { SupabaseRepository } from './supabase.repository.js';
import { generateUUID } from '../utils/uuid.js';

// ── Cola de pendientes (localStorage) ──────────────────────────────────────

const PENDING_KEY = 'dojo_pending_ops';

function loadPending<T extends BaseEntity>(entityName: string): PendingOperation<T>[] {
  const raw = localStorage.getItem(`${PENDING_KEY}_${entityName}`);
  if (!raw) return [];
  try { return JSON.parse(raw) as PendingOperation<T>[]; } catch { return []; }
}

function savePending<T extends BaseEntity>(entityName: string, ops: PendingOperation<T>[]): void {
  localStorage.setItem(`${PENDING_KEY}_${entityName}`, JSON.stringify(ops));
}

function enqueuePending<T extends BaseEntity>(
  entityName: string,
  op: Omit<PendingOperation<T>, 'operationId' | 'createdAt'>
): void {
  const pending = loadPending<T>(entityName);
  pending.push({
    ...op,
    operationId: generateUUID(),
    createdAt:   new Date().toISOString(),
  });
  savePending(entityName, pending);
}

function dequeuePending<T extends BaseEntity>(entityName: string, operationId: string): void {
  const pending = loadPending<T>(entityName).filter(op => op.operationId !== operationId);
  savePending(entityName, pending);
}

// ── SyncRepository ──────────────────────────────────────────────────────────

export class SyncRepository<T extends BaseEntity> implements IRepository<T> {
  private readonly _local: IRepository<T>;
  private readonly _remote: SupabaseRepository<T> | null;
  private readonly _entityName: string;
  private _syncInProgress = false;

  /**
   * @param local       Repositorio IndexedDB (siempre disponible).
   * @param remote      Repositorio Supabase (null si no está configurado).
   * @param entityName  Nombre de la entidad para identificar la cola de pendientes.
   */
  constructor(
    local: IRepository<T>,
    remote: SupabaseRepository<T> | null,
    entityName: string
  ) {
    this._local      = local;
    this._remote     = remote;
    this._entityName = entityName;

    // Escuchar recuperación de conexión para vaciar la cola de pendientes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => { void this.flushPending(); });
    }
  }

  // ── IRepository ───────────────────────────────────────────────────────────

  async findAll(): Promise<T[]> {
    // La lectura siempre va al local (IndexedDB) para garantizar velocidad offline.
    // Supabase Realtime actualiza el local automáticamente en tiempo real.
    return this._local.findAll();
  }

  async findById(id: string): Promise<T | null> {
    return this._local.findById(id);
  }

  async create(entity: T): Promise<T> {
    // 1. Escribir en local primero (optimistic)
    const created = await this._local.create(entity);

    // 2. Intentar replicar en remoto
    if (this._remote) {
      if (navigator.onLine) {
        try {
          await this._remote.create(created);
        } catch (err) {
          console.warn(`[SyncRepository] create remoto falló para ${this._entityName}:`, err);
          this._enqueue('create', created.id, created);
        }
      } else {
        this._enqueue('create', created.id, created);
      }
    }

    return created;
  }

  async update(id: string, changes: Partial<Omit<T, 'id'>>): Promise<T> {
    // 1. Actualizar local
    const updated = await this._local.update(id, changes);

    // 2. Intentar replicar en remoto
    if (this._remote) {
      if (navigator.onLine) {
        try {
          await this._remote.update(id, changes);
        } catch (err) {
          console.warn(`[SyncRepository] update remoto falló para ${this._entityName}:`, err);
          this._enqueue('update', id, updated);
        }
      } else {
        this._enqueue('update', id, updated);
      }
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    // 1. Eliminar en local
    await this._local.delete(id);

    // 2. Intentar replicar en remoto
    if (this._remote) {
      if (navigator.onLine) {
        try {
          await this._remote.delete(id);
        } catch (err) {
          console.warn(`[SyncRepository] delete remoto falló para ${this._entityName}:`, err);
          this._enqueue('delete', id, null);
        }
      } else {
        this._enqueue('delete', id, null);
      }
    }
  }

  // ── Sincronización de pendientes ──────────────────────────────────────────

  /**
   * Vacía la cola de operaciones pendientes replicándolas en Supabase.
   * Se llama automáticamente al recuperar conexión o puede invocarse manualmente.
   */
  async flushPending(): Promise<void> {
    if (!this._remote || !navigator.onLine || this._syncInProgress) return;
    this._syncInProgress = true;

    const pending = loadPending<T>(this._entityName);
    if (!pending.length) { this._syncInProgress = false; return; }

    console.info(`[SyncRepository] Sincronizando ${pending.length} operaciones pendientes de '${this._entityName}'...`);

    for (const op of pending) {
      try {
        if (op.type === 'create' && op.payload) {
          await this._remote.create(op.payload);
        } else if (op.type === 'update' && op.payload) {
          const { id, ...changes } = op.payload;
          await this._remote.update(id, changes as Partial<Omit<T, 'id'>>);
        } else if (op.type === 'delete') {
          await this._remote.delete(op.entityId);
        }
        dequeuePending<T>(this._entityName, op.operationId);
      } catch (err) {
        console.warn(`[SyncRepository] No se pudo sincronizar operación ${op.operationId}:`, err);
        // Continuar con la siguiente — no bloquear
      }
    }

    this._syncInProgress = false;
    console.info(`[SyncRepository] Sincronización de '${this._entityName}' completada.`);
  }

  /**
   * Sobrescribe los datos locales con los de Supabase.
   * Útil al conectar por primera vez o al desear un full-sync forzado.
   * Usa last-write-wins basado en `updatedAt`.
   */
  async pullFromRemote(): Promise<void> {
    if (!this._remote || !navigator.onLine) return;
    const remoteItems = await this._remote.findAll();
    for (const item of remoteItems) {
      const local = await this._local.findById(item.id);
      if (!local || local.updatedAt < item.updatedAt) {
        if (!local) {
          await this._local.create(item);
        } else {
          const { id, ...rest } = item;
          await this._local.update(id, rest as Partial<Omit<T, 'id'>>);
        }
      }
    }
  }

  // ── Realtime ──────────────────────────────────────────────────────────────

  /**
   * Aplica cambios de Realtime directamente en IndexedDB para mantener el local sincronizado.
   * Debe llamarse durante la inicialización del repositorio si Supabase está activo.
   *
   * @returns Función para cancelar las suscripciones.
   */
  setupRealtimeSync(): () => void {
    if (!this._remote) return () => {};

    const unsubInsert = this._remote.subscribe('INSERT', (change) => {
      if (change.new) {
        void this._local.findById(change.new.id).then(existing => {
          if (!existing) void this._local.create(change.new as T);
        });
      }
    });

    const unsubUpdate = this._remote.subscribe('UPDATE', (change) => {
      if (change.new) {
        const { id, ...rest } = change.new as T;
        void this._local.update(id, rest as Partial<Omit<T, 'id'>>).catch(() => {
          // Si no existe localmente, crearlo
          void this._local.create(change.new as T);
        });
      }
    });

    const unsubDelete = this._remote.subscribe('DELETE', (change) => {
      if (change.old) {
        void this._local.delete((change.old as T).id);
      }
    });

    return () => { unsubInsert(); unsubUpdate(); unsubDelete(); };
  }

  // ── Helpers privados ───────────────────────────────────────────────────────

  private _enqueue(type: 'create' | 'update' | 'delete', id: string, payload: T | null): void {
    enqueuePending<T>(this._entityName, {
      type,
      entityName: this._entityName,
      entityId:   id,
      payload,
    });
  }
}
