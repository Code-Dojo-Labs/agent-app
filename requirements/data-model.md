# Modelo de Datos e IndexedDB

> [← Volver al índice](./index.md)

---

## Introducción

La aplicación utiliza **IndexedDB** como motor de persistencia del lado del cliente. IndexedDB es una base de datos NoSQL orientada a objetos, disponible en todos los navegadores modernos, que permite almacenar grandes volúmenes de datos estructurados de forma asíncrona.

Se usa la **API nativa de IndexedDB** directamente, sin wrappers externos. Toda la asincronía basada en eventos (`IDBRequest`) se encapsula en Promesas dentro de la capa Repository. Ver el patrón de abstracción en la sección [Capa de acceso a datos](#capa-de-acceso-a-datos-api-interna) más abajo.

---

## Entidades

### 1. `Task` — Tarea

Representa una tarjeta del tablero Kanban.

```ts
interface Task {
  id: string;           // UUID v4, generado en el cliente
  title: string;        // Máx. 120 caracteres, obligatorio
  description: string;  // Markdown, puede ser vacío
  statusId: string;     // FK → Column.id
  priority: Priority;   // 'low' | 'medium' | 'high' | 'urgent'
  labelIds: string[];   // Lista de FK → Label.id
  createdAt: string;    // ISO 8601, ej. "2026-03-25T10:00:00.000Z"
  updatedAt: string;    // ISO 8601, actualizado en cada modificación
  order: number;        // Posición dentro de la columna (para ordenamiento)
}

type Priority = 'low' | 'medium' | 'high' | 'urgent';
```

#### Índices de `Task`

| Índice | Campo | Tipo | Propósito |
|---|---|---|---|
| `by-status` | `statusId` | No único | Consultar tareas de una columna |
| `by-priority` | `priority` | No único | Filtrar por prioridad |
| `by-created` | `createdAt` | No único | Ordenar cronológicamente |

---

### 2. `Column` — Estado / Columna

Define los estados posibles de las tareas.

```ts
interface Column {
  id: string;     // UUID v4
  name: string;   // Máx. 50 caracteres
  icon: string;   // Emoji o nombre de ícono (ej. "✅" o "check-circle")
  order: number;  // Posición horizontal en el tablero
  color?: string; // Color de acento opcional (hex), útil para cabecera de columna
}
```

#### Estados por defecto (seed)

```ts
const DEFAULT_COLUMNS: Column[] = [
  { id: crypto.randomUUID(), name: 'Backlog',      icon: '📋', order: 0 },
  { id: crypto.randomUUID(), name: 'Por hacer',    icon: '🔲', order: 1 },
  { id: crypto.randomUUID(), name: 'En progreso',  icon: '🔄', order: 2 },
  { id: crypto.randomUUID(), name: 'En revisión',  icon: '🔍', order: 3 },
  { id: crypto.randomUUID(), name: 'Hecho',        icon: '✅', order: 4 },
  { id: crypto.randomUUID(), name: 'Bloqueado',    icon: '🚫', order: 5 },
];
```

---

### 3. `Label` — Etiqueta

Etiqueta reutilizable que puede asociarse a múltiples tareas.

```ts
interface Label {
  id: string;    // UUID v4
  name: string;  // Máx. 30 caracteres, único (case-insensitive)
  color: string; // Hex, ej. "#B91C1C" — contraste ≥ 4.5:1 con #FFFFFF
}
```

#### Índices de `Label`

| Índice | Campo | Tipo | Propósito |
|---|---|---|---|
| `by-name` | `name` | Único | Evitar duplicados, búsqueda rápida |

> **Nota:** La unicidad por nombre debe verificarse de forma case-insensitive en la capa de lógica de negocio antes de escribir en IndexedDB, ya que IndexedDB no soporta collations.

---

## Diagrama de relaciones

```
┌─────────────┐        ┌──────────────┐        ┌──────────────┐
│   Column    │        │     Task     │        │    Label     │
│─────────────│        │──────────────│        │──────────────│
│ id (PK)     │◄───────│ statusId(FK) │        │ id (PK)      │
│ name        │  1:N   │ id (PK)      │  N:M   │ name (unique)│
│ icon        │        │ title        │───────►│ color        │
│ order       │        │ description  │        └──────────────┘
│ color?      │        │ priority     │
└─────────────┘        │ labelIds[]   │
                       │ createdAt    │
                       │ updatedAt    │
                       │ order        │
                       └──────────────┘
```

> La relación N:M entre `Task` y `Label` se gestiona mediante el array `labelIds` embebido en cada `Task`. No se utiliza tabla de unión.

---

## Configuración de IndexedDB

### Nombre de la base de datos
```
kanban-app-db
```

### Versión inicial
```
1
```

### Object Stores

| Store | Key Path | Auto Increment | Descripción |
|---|---|---|---|
| `tasks` | `id` | No | Tareas del tablero |
| `columns` | `id` | No | Columnas / estados |
| `labels` | `id` | No | Etiquetas globales |

### Inicialización (onupgradeneeded)

```ts
// src/db/database.ts — API nativa, sin dependencias externas
const DB_NAME = 'kanban-app-db';
const DB_VERSION = 1;

let _db: IDBDatabase | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      _db = request.result;
      resolve(_db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

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
    };
  });
}

/** Helper: convierte un IDBRequest en Promise */
export function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}
```

---

## Capa de acceso a datos (API interna)

Se expone un conjunto de funciones asíncronas organizadas por entidad. Toda la lógica de IndexedDB debe vivir en esta capa.

### `TaskRepository`

```ts
interface TaskRepository {
  getAll(): Promise<Task[]>;
  getByStatus(statusId: string): Promise<Task[]>;
  getById(id: string): Promise<Task | undefined>;
  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  update(id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task>;
  delete(id: string): Promise<void>;
  reorder(statusId: string, orderedIds: string[]): Promise<void>;
}
```

### `ColumnRepository`

```ts
interface ColumnRepository {
  getAll(): Promise<Column[]>;
  getById(id: string): Promise<Column | undefined>;
  create(column: Omit<Column, 'id'>): Promise<Column>;
  update(id: string, changes: Partial<Omit<Column, 'id'>>): Promise<Column>;
  delete(id: string): Promise<void>;
}
```

### `LabelRepository`

```ts
interface LabelRepository {
  getAll(): Promise<Label[]>;
  getById(id: string): Promise<Label | undefined>;
  findByName(name: string): Promise<Label | undefined>; // búsqueda case-insensitive
  create(label: Omit<Label, 'id'>): Promise<Label>;
  update(id: string, changes: Partial<Omit<Label, 'id'>>): Promise<Label>;
  delete(id: string): Promise<void>;
}
```

---

## Estrategia de migración

Cuando se requieran cambios en el esquema de la base de datos, se incrementará `DB_VERSION` y se añadirá lógica al bloque `onupgradeneeded`:

```ts
request.onupgradeneeded = (event) => {
  const db = (event.target as IDBOpenDBRequest).result;
  const oldVersion = event.oldVersion;

  if (oldVersion < 1) {
    // Esquema inicial (ver arriba)
  }
  if (oldVersion < 2) {
    // Migraciones de versión 1 → 2
    // Ejemplo: añadir índice multiEntry para buscar por etiqueta
    const transaction = (event.target as IDBOpenDBRequest).transaction!;
    const taskStore = transaction.objectStore('tasks');
    taskStore.createIndex('by-label', 'labelIds', { multiEntry: true });
  }
};
```

> **Buenas prácticas:**
> - Nunca bajar la versión de la base de datos.
> - Las migraciones deben ser idempotentes (no crear un índice que ya existe).
> - Documentar cada versión con su changelog aquí mismo.

---

## Changelog de versiones

| Versión | Fecha | Cambios |
|---|---|---|
| 1 | 2026-03-25 | Esquema inicial: stores `tasks`, `columns`, `labels` con índices base |
