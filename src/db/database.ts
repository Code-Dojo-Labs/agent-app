/**
 * database.ts — Inicialización de IndexedDB y helpers de bajo nivel.
 *
 * Se usa la API nativa de IndexedDB directamente, sin wrappers externos.
 * Toda la asincronía basada en eventos (IDBRequest) se encapsula en Promesas.
 *
 * Object Stores:
 *   - tasks    : keyPath = 'id'  | índices: by-status, by-priority, by-created, by-board, by-project
 *   - columns  : keyPath = 'id'  | índice: by-board
 *   - labels   : keyPath = 'id'  | índice: by-name (unique)
 *   - activity : keyPath = 'id'  | índice: by-taskId (US-20)
 *   - boards   : keyPath = 'id'  (US-22)
 *   - projects : keyPath = 'id'  | índice: by-prefix (unique) (US-26)
 *   - persons  : keyPath = 'id'  (US-29)
 */

const DB_NAME    = 'kanban-app-db';
const DB_VERSION = 5;

/** Instancia singleton de la base de datos (se inicializa una sola vez). */
let _db: IDBDatabase | null = null;

/** Promesa en vuelo de apertura — evita abrir múltiples conexiones concurrentes. */
let _openPromise: Promise<IDBDatabase> | null = null;

/**
 * Abre (o reutiliza) la conexión a IndexedDB.
 * Memoiza la promesa en vuelo para que llamadas concurrentes esperen
 * la misma conexión en lugar de abrir varias en paralelo.
 *
 * @throws {Error} Si IndexedDB no está disponible en el entorno actual
 *   (p.ej. modo privado restringido en Safari/Firefox).
 */
export function openDatabase(): Promise<IDBDatabase> {
  if (_db)          return Promise.resolve(_db);
  if (_openPromise) return _openPromise;   // todas las llamadas concurrentes esperan la misma promesa

  // Verificación explícita de disponibilidad (modo privado en algunos navegadores)
  if (!('indexedDB' in globalThis) || !globalThis.indexedDB) {
    return Promise.reject(
      new Error('IndexedDB no está disponible en este contexto. Por favor, sal del modo privado o usa otro navegador.')
    );
  }

  _openPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      _openPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      _db = request.result;

      // Manejar cierre inesperado de la conexión
      _db.onclose = () => { _db = null; _openPromise = null; };

      // Propagar errores globales de la instancia DB
      _db.onerror = (event) => console.error('[IndexedDB] Error global:', event);

      // Cerrar la conexión cuando otra pestaña solicite una actualización de versión
      // para evitar que quede bloqueada indefinidamente en el evento `blocked`.
      _db.onversionchange = () => {
        _db?.close();
        _db = null;
        _openPromise = null;
        console.warn('[IndexedDB] Base de datos actualizada en otra pestaña. Recarga la página.');
      };

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
      // v1 → v2: object store de actividad (US-20)
      if (oldVersion < 2) {
        const activityStore = db.createObjectStore('activity', { keyPath: 'id' });
        activityStore.createIndex('by-taskId', 'taskId', { unique: false });
      }

      // v2 → v3: múltiples tableros (US-22)
      if (oldVersion < 3) {
        // Nuevo store 'boards'
        db.createObjectStore('boards', { keyPath: 'id' });

        // Crear tablero por defecto y asignar boardId a datos existentes.
        // Usamos crypto.randomUUID() directamente aquí porque generateUUID es
        // un import externo y onupgradeneeded debe ser synchronous.
        const defaultBoardId = crypto.randomUUID();
        const now            = new Date().toISOString();

        const tx = (event.target as IDBOpenDBRequest).transaction!;

        // Insertar tablero por defecto
        const boardStore = tx.objectStore('boards');
        boardStore.add({
          id: defaultBoardId,
          name: 'Mi tablero',
          emoji: '🥋',
          createdAt: now,
        });

        // Añadir índice by-board a columns y asignar boardId a columnas existentes
        const colStore = tx.objectStore('columns');
        colStore.createIndex('by-board', 'boardId', { unique: false });
        const colReq = colStore.openCursor();
        colReq.onsuccess = () => {
          const cursor = colReq.result;
          if (cursor) {
            const col = cursor.value;
            if (!col.boardId) {
              col.boardId = defaultBoardId;
              cursor.update(col);
            }
            cursor.continue();
          }
        };

        // Añadir índice by-board a tasks y asignar boardId a tareas existentes
        const taskStore = tx.objectStore('tasks');
        taskStore.createIndex('by-board', 'boardId', { unique: false });
        const taskReq = taskStore.openCursor();
        taskReq.onsuccess = () => {
          const cursor = taskReq.result;
          if (cursor) {
            const task = cursor.value;
            if (!task.boardId) {
              task.boardId = defaultBoardId;
              cursor.update(task);
            }
            cursor.continue();
          }
        };
      }

      // v3 → v4: proyectos — agrupación de tareas (US-26)
      if (oldVersion < 4) {
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        const now = new Date().toISOString();

        // Nuevo store 'projects' con índice único por prefijo
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('by-prefix', 'prefix', { unique: true });

        // Crear proyecto por defecto "General" con prefijo "GEN"
        const defaultProjectId = crypto.randomUUID();
        projectStore.add({
          id:             defaultProjectId,
          name:           'General',
          prefix:         'GEN',
          description:    'Proyecto por defecto para tareas sin proyecto asignado.',
          nextTaskNumber: 1,
          createdAt:      now,
        });

        // Añadir índice by-project en tasks y asignar projectId + taskNumber a tareas existentes
        const taskStore = tx.objectStore('tasks');
        taskStore.createIndex('by-project', 'projectId', { unique: false });
        let counter = 0;
        const taskReq = taskStore.openCursor();
        taskReq.onsuccess = () => {
          const cursor = taskReq.result;
          if (cursor) {
            const task = cursor.value;
            if (!task.projectId) {
              counter++;
              task.projectId  = defaultProjectId;
              task.taskNumber = `GEN-${String(counter).padStart(3, '0')}`;
              cursor.update(task);
            }
            cursor.continue();
          } else {
            // Actualizar nextTaskNumber del proyecto General
            const projReq = tx.objectStore('projects').get(defaultProjectId);
            projReq.onsuccess = () => {
              const proj = projReq.result;
              if (proj) {
                proj.nextTaskNumber = counter + 1;
                tx.objectStore('projects').put(proj);
              }
            };
          }
        };
      }

      // v4 → v5: personas — directorio local de assignees (US-29)
      if (oldVersion < 5) {
        // Nuevo store 'persons' para el directorio local
        db.createObjectStore('persons', { keyPath: 'id' });

        // Asegurar que todas las tareas existentes tengan el campo assignees vacío
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        const taskStore = tx.objectStore('tasks');
        const taskReq = taskStore.openCursor();
        taskReq.onsuccess = () => {
          const cursor = taskReq.result;
          if (cursor) {
            const task = cursor.value;
            if (!task.assignees) {
              task.assignees = [];  // Inicializar como array vacío
              cursor.update(task);
            }
            cursor.continue();
          }
        };
      }

      // if (oldVersion < 6) { ... }
    };
  });

  return _openPromise;
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
