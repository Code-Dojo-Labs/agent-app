/**
 * database.ts — Inicialización de IndexedDB y helpers de bajo nivel.
 *
 * Se usa la API nativa de IndexedDB directamente, sin wrappers externos.
 * Toda la asincronía basada en eventos (IDBRequest) se encapsula en Promesas.
 *
 * Object Stores:
 *   - tasks   : keyPath = 'id'  | índices: by-status, by-priority, by-created
 *   - columns : keyPath = 'id'
 *   - labels  : keyPath = 'id'  | índice: by-name (unique)
 */

const DB_NAME    = 'kanban-app-db';
const DB_VERSION = 1;

/** Instancia singleton de la base de datos (se inicializa una sola vez). */
let _db: IDBDatabase | null = null;

/**
 * Abre (o reutiliza) la conexión a IndexedDB.
 * Crea el esquema en `onupgradeneeded` si la base de datos es nueva.
 */
export function openDatabase(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      _db = request.result;

      // Manejar cierre inesperado de la conexión (ej. otra pestaña actualiza la versión)
      _db.onclose = () => { _db = null; };
      _db.onerror = (event) => console.error('[IndexedDB] Error global:', event);

      resolve(_db);
    };

    request.onupgradeneeded = (event) => {
      const db          = (event.target as IDBOpenDBRequest).result;
      const oldVersion  = event.oldVersion;

      // ── v0 → v1: esquema inicial ────────────────────────────────────
      if (oldVersion < 1) {
        // Store: tasks
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('by-status',   'statusId',  { unique: false });
        taskStore.createIndex('by-priority', 'priority',  { unique: false });
        taskStore.createIndex('by-created',  'createdAt', { unique: false });

        // Store: columns
        db.createObjectStore('columns', { keyPath: 'id' });

        // Store: labels
        const labelStore = db.createObjectStore('labels', { keyPath: 'id' });
        labelStore.createIndex('by-name', 'name', { unique: true });
      }

      // ── Migraciones futuras ─────────────────────────────────────────
      // if (oldVersion < 2) { ... }
    };
  });
}

/**
 * Convierte un `IDBRequest` en una `Promise`.
 * Uso:
 * ```ts
 * const task = await idbRequest(store.get(id));
 * ```
 */
export function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Convierte una transacción IDB en una `Promise` que resuelve al completarse.
 * Útil para operaciones de escritura que no devuelven valor.
 */
export function idbTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
    tx.onabort    = () => reject(new DOMException('Transaction aborted', 'AbortError'));
  });
}

/**
 * Obtiene un `IDBObjectStore` de una transacción con el modo indicado.
 * @param storeName - Nombre del Object Store.
 * @param mode      - 'readonly' (default) | 'readwrite'.
 */
export async function getStore(
  storeName: string,
  mode: IDBTransactionMode = 'readonly',
): Promise<{ store: IDBObjectStore; tx: IDBTransaction }> {
  const db    = await openDatabase();
  const tx    = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  return { store, tx };
}
