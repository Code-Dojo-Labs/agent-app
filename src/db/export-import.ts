/**
 * export-import.ts — Exportación e importación de datos del tablero.
 *
 * Permite generar una snapshot completa del tablero en formato JSON
 * (columnas, tareas, etiquetas) y restaurarla reemplazando los datos actuales.
 *
 * El formato incluye un campo `version` para soportar migraciones futuras
 * y un campo `exportedAt` con la fecha de exportación en ISO 8601.
 *
 * US-19: Exportación e importación de datos.
 */

import { openDatabase, idbRequest, idbTransaction } from './database.js';
import type { Column, Task, Label, ActivityEvent, Board, Project } from '../types/models.js';

// ── Tipos ──────────────────────────────────────────────────────────────────

/** Versión actual del formato de exportación. */
const CURRENT_VERSION = 1;

/** Versiones soportadas para importación. */
const SUPPORTED_VERSIONS = new Set([1]);

/** Estructura del archivo exportado. */
export interface BoardExport {
  version: number;
  exportedAt: string;
  columns: Column[];
  tasks: Task[];
  labels: Label[];
  activity?: ActivityEvent[];
  boards?: Board[];
  projects?: Project[];
}

/** Resultado de la validación de un archivo importado. */
interface ValidationResult {
  ok: true;
  data: BoardExport;
}

interface ValidationError {
  ok: false;
  message: string;
}

type ValidateResult = ValidationResult | ValidationError;

// ── Exportación ────────────────────────────────────────────────────────────

/**
 * Genera una snapshot completa del tablero en formato `BoardExport`.
 * Lee los tres object stores (columns, tasks, labels) en una sola transacción
 * readonly para garantizar consistencia.
 */
export async function exportBoardData(): Promise<BoardExport> {
  const db = await openDatabase();
  const storeNames = ['columns', 'tasks', 'labels'] as const;
  // Incluir activity si el store existe (DB v2+)
  const allNames = db.objectStoreNames;
  const hasActivity = allNames.contains('activity');
  const hasBoards   = allNames.contains('boards');
  const hasProjects = allNames.contains('projects');
  const txStores = [
    ...storeNames,
    ...(hasActivity ? ['activity'] : []),
    ...(hasBoards   ? ['boards']   : []),
    ...(hasProjects ? ['projects'] : []),
  ];
  const tx = db.transaction(txStores, 'readonly');
  const columns  = await idbRequest<Column[]>(tx.objectStore('columns').getAll());
  const tasks    = await idbRequest<Task[]>(tx.objectStore('tasks').getAll());
  const labels   = await idbRequest<Label[]>(tx.objectStore('labels').getAll());
  const activity = hasActivity
    ? await idbRequest<ActivityEvent[]>(tx.objectStore('activity').getAll())
    : [];
  const boards   = hasBoards
    ? await idbRequest<Board[]>(tx.objectStore('boards').getAll())
    : [];
  const projects = hasProjects
    ? await idbRequest<Project[]>(tx.objectStore('projects').getAll())
    : [];

  return {
    version:    CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    columns:    columns.sort((a, b) => a.order - b.order),
    tasks,
    labels:     labels.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    activity:   activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    boards:     boards.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    projects:   projects.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

/**
 * Descarga la snapshot como un archivo `.json` usando un link temporal.
 */
export function downloadBoardExport(data: BoardExport): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = `dojo-kanban-export-${_fileTimestamp()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Importación ────────────────────────────────────────────────────────────

/**
 * Lee un `File` seleccionado por el usuario y lo parsea como JSON.
 * Devuelve el contenido parseado o lanza un error descriptivo.
 */
export async function readImportFile(file: File): Promise<unknown> {
  const text = await file.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('El archivo seleccionado no contiene JSON válido.');
  }
}

/**
 * Valida que un objeto desconocido tenga la estructura esperada de `BoardExport`.
 * Verifica: version, exportedAt, columns, tasks, labels.
 */
export function validateImportData(raw: unknown): ValidateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'El archivo no tiene la estructura esperada.' };
  }

  const obj = raw as Record<string, unknown>;

  // version
  if (typeof obj.version !== 'number') {
    return { ok: false, message: 'El archivo no contiene un campo "version" válido.' };
  }
  if (!SUPPORTED_VERSIONS.has(obj.version)) {
    return { ok: false, message: `La versión ${obj.version} no es compatible. Versiones soportadas: ${[...SUPPORTED_VERSIONS].join(', ')}.` };
  }

  // exportedAt
  if (typeof obj.exportedAt !== 'string') {
    return { ok: false, message: 'El archivo no contiene un campo "exportedAt" válido.' };
  }

  // columns
  if (!Array.isArray(obj.columns)) {
    return { ok: false, message: 'El archivo no contiene la colección "columns".' };
  }
  for (const col of obj.columns) {
    if (!_isValidColumn(col)) {
      return { ok: false, message: 'Una o más columnas tienen un formato inválido.' };
    }
  }

  // tasks
  if (!Array.isArray(obj.tasks)) {
    return { ok: false, message: 'El archivo no contiene la colección "tasks".' };
  }
  for (const task of obj.tasks) {
    if (!_isValidTask(task)) {
      return { ok: false, message: 'Una o más tareas tienen un formato inválido.' };
    }
  }

  // labels
  if (!Array.isArray(obj.labels)) {
    return { ok: false, message: 'El archivo no contiene la colección "labels".' };
  }
  for (const label of obj.labels) {
    if (!_isValidLabel(label)) {
      return { ok: false, message: 'Una o más etiquetas tienen un formato inválido.' };
    }
  }

  return {
    ok: true,
    data: {
      version:    obj.version as number,
      exportedAt: obj.exportedAt as string,
      columns:    obj.columns as Column[],
      tasks:      obj.tasks as Task[],
      labels:     obj.labels as Label[],
    },
  };
}

/**
 * Reemplaza todos los datos del tablero con los datos importados.
 * Opera en una única transacción readwrite atómica: si algún paso falla,
 * IndexedDB revierte los cambios automáticamente.
 */
export async function importBoardData(data: BoardExport): Promise<void> {
  const db = await openDatabase();
  const allNames = db.objectStoreNames;
  const hasActivity = allNames.contains('activity');
  const hasBoards   = allNames.contains('boards');
  const hasProjects = allNames.contains('projects');
  const storeNames = [
    'columns', 'tasks', 'labels',
    ...(hasActivity ? ['activity'] : []),
    ...(hasBoards   ? ['boards']   : []),
    ...(hasProjects ? ['projects'] : []),
  ];
  const tx = db.transaction(storeNames, 'readwrite');

  const colStore   = tx.objectStore('columns');
  const taskStore  = tx.objectStore('tasks');
  const labelStore = tx.objectStore('labels');

  // 1. Limpiar stores existentes
  colStore.clear();
  taskStore.clear();
  labelStore.clear();

  // 2. Insertar datos importados
  for (const col of data.columns)   colStore.add(col);
  for (const task of data.tasks)    taskStore.add(task);
  for (const label of data.labels)  labelStore.add(label);

  // 3. Importar actividad si existe en el archivo y el store está disponible
  if (hasActivity) {
    const activityStore = tx.objectStore('activity');
    activityStore.clear();
    if (data.activity) {
      for (const evt of data.activity) activityStore.add(evt);
    }
  }

  // 4. Importar tableros si existen en el archivo y el store está disponible (US-22)
  if (hasBoards) {
    const boardStore = tx.objectStore('boards');
    boardStore.clear();
    if (data.boards && data.boards.length > 0) {
      for (const board of data.boards) boardStore.add(board);
    } else {
      // Si no hay boards en los datos importados (export antiguo),
      // crear un tablero por defecto para las columnas/tareas importadas.
      const defaultId = crypto.randomUUID();
      boardStore.add({ id: defaultId, name: 'Mi tablero', emoji: '🥋', createdAt: new Date().toISOString() });
      // Asignar boardId a columnas y tareas que no lo tienen
      for (const col of data.columns) {
        if (!col.boardId) colStore.put({ ...col, boardId: defaultId });
      }
      for (const task of data.tasks) {
        if (!task.boardId) taskStore.put({ ...task, boardId: defaultId });
      }
    }
  }

  // 5. Importar proyectos si existen en el archivo y el store está disponible (US-26)
  if (hasProjects) {
    const projectStore = tx.objectStore('projects');
    projectStore.clear();
    if (data.projects && data.projects.length > 0) {
      for (const project of data.projects) projectStore.add(project);
    } else {
      // Si no hay projects en los datos importados (export antiguo),
      // crear un proyecto General por defecto.
      const defaultProjId = crypto.randomUUID();
      projectStore.add({
        id: defaultProjId,
        name: 'General',
        prefix: 'GEN',
        description: 'Proyecto por defecto para tareas sin proyecto asignado.',
        nextTaskNumber: 1,
        createdAt: new Date().toISOString(),
      });
    }
  }

  await idbTransaction(tx);
}

// ── Helpers privados ───────────────────────────────────────────────────────

function _fileTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function _isValidColumn(obj: unknown): obj is Column {
  if (obj === null || typeof obj !== 'object') return false;
  const c = obj as Record<string, unknown>;
  return (
    typeof c.id    === 'string' &&
    typeof c.name  === 'string' &&
    typeof c.icon  === 'string' &&
    typeof c.order === 'number'
  );
}

function _isValidTask(obj: unknown): obj is Task {
  if (obj === null || typeof obj !== 'object') return false;
  const t = obj as Record<string, unknown>;
  return (
    typeof t.id          === 'string' &&
    typeof t.title       === 'string' &&
    typeof t.description === 'string' &&
    typeof t.statusId    === 'string' &&
    typeof t.priority    === 'string' &&
    Array.isArray(t.labelIds) &&
    typeof t.createdAt   === 'string' &&
    typeof t.updatedAt   === 'string' &&
    typeof t.order       === 'number'
  );
}

function _isValidLabel(obj: unknown): obj is Label {
  if (obj === null || typeof obj !== 'object') return false;
  const l = obj as Record<string, unknown>;
  return (
    typeof l.id    === 'string' &&
    typeof l.name  === 'string' &&
    typeof l.color === 'string'
  );
}
