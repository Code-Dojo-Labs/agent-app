/**
 * repository.interface.ts — Contrato genérico para todas las implementaciones de repositorio.
 *
 * Define la interfaz `IRepository<T>` que deben implementar:
 *   - IndexedDBRepository<T>  (almacenamiento local, offline-first)
 *   - SupabaseRepository<T>   (almacenamiento en la nube personal del usuario)
 *   - SyncRepository<T>       (escribe en ambos y reconcilia al recuperar conexión)
 */

// ── Interfaz base ───────────────────────────────────────────────────────────

/**
 * Entidad mínima esperada por los repositorios.
 * Toda entidad del dominio debe tener al menos `id` y `updatedAt` para permitir
 * la estrategia de conflictos last-write-wins basada en timestamp.
 */
export interface BaseEntity {
  id: string;
  updatedAt: string; // ISO 8601
}

/**
 * Contrato CRUD genérico que todas las implementaciones de repositorio deben cumplir.
 *
 * @typeParam T - Tipo de entidad del dominio (Task, Board, Column, etc.)
 */
export interface IRepository<T extends BaseEntity> {
  /**
   * Devuelve todos los registros de la colección/tabla.
   */
  findAll(): Promise<T[]>;

  /**
   * Devuelve un registro por su ID, o `null` si no existe.
   */
  findById(id: string): Promise<T | null>;

  /**
   * Persiste un nuevo registro.
   * El `id` y `updatedAt` deben ser asignados por el llamador antes de invocar este método.
   */
  create(entity: T): Promise<T>;

  /**
   * Actualiza un registro existente con los campos proporcionados.
   * La implementación debe mezclar `changes` con el estado actual (patch semántico).
   * @throws Error si el registro no existe.
   */
  update(id: string, changes: Partial<Omit<T, 'id'>>): Promise<T>;

  /**
   * Elimina un registro por su ID.
   * No lanza error si el registro no existe (operación idempotente).
   */
  delete(id: string): Promise<void>;
}

// ── Tipos auxiliares ────────────────────────────────────────────────────────

/**
 * Resultado de una operación de sincronización pendiente.
 * Usado por SyncRepository para rastrear escrituras offline.
 */
export interface PendingOperation<T extends BaseEntity> {
  /** Identificador único de la operación pendiente. */
  operationId: string;
  /** Tipo de operación que debe replicarse a Supabase. */
  type: 'create' | 'update' | 'delete';
  /** Nombre de la tabla/entidad afectada. */
  entityName: string;
  /** ID de la entidad afectada. */
  entityId: string;
  /** Payload completo para create/update. Null para delete. */
  payload: T | null;
  /** Timestamp ISO de cuando se generó la operación offline. */
  createdAt: string;
}
