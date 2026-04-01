/**
 * database.ts — Inicialización de IndexedDB y helpers de bajo nivel.
 *
 * Se usa la API nativa de IndexedDB directamente, sin wrappers externos.
 * Toda la asincronía basada en eventos (IDBRequest) se encapsula en Promesas.
 *
 * Object Stores:
 *   - tasks    : keyPath = 'id'  | índices: by-status, by-priority, by-created, by-board
 *   - columns  : keyPath = 'id'  | índice: by-board
 *   - labels   : keyPath = 'id'  | índice: by-name (unique)
 *   - activity : keyPath = 'id'  | índice: by-taskId (US-20)
 *   - boards   : keyPath = 'id'  (US-22)
 */
/**
 * Abre (o reutiliza) la conexión a IndexedDB.
 * Memoiza la promesa en vuelo para que llamadas concurrentes esperen
 * la misma conexión en lugar de abrir varias en paralelo.
 *
 * @throws {Error} Si IndexedDB no está disponible en el entorno actual
 *   (p.ej. modo privado restringido en Safari/Firefox).
 */
export declare function openDatabase(): Promise<IDBDatabase>;
/**
 * Convierte un `IDBRequest` en una `Promise`.
 * Uso:
 * ```ts
 * const task = await idbRequest(store.get(id));
 * ```
 */
export declare function idbRequest<T>(req: IDBRequest<T>): Promise<T>;
/**
 * Convierte una transacción IDB en una `Promise` que resuelve al completarse.
 * Útil para operaciones de escritura que no devuelven valor.
 */
export declare function idbTransaction(tx: IDBTransaction): Promise<void>;
/**
 * Obtiene un `IDBObjectStore` de una transacción con el modo indicado.
 * @param storeName - Nombre del Object Store.
 * @param mode      - 'readonly' (default) | 'readwrite'.
 */
export declare function getStore(storeName: string, mode?: IDBTransactionMode): Promise<{
    store: IDBObjectStore;
    tx: IDBTransaction;
}>;
