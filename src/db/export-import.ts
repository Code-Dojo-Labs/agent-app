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
import type { Column, Task, Label } from '../types/models.js';

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
  const tx = db.transaction(['columns', 'tasks', 'labels'], 'readonly');
  const columns = await idbRequest<Column[]>(tx.objectStore('columns').getAll());
  const tasks   = await idbRequest<Task[]>(tx.objectStore('tasks').getAll());
  const labels  = await idbRequest<Label[]>(tx.objectStore('labels').getAll());

  return {
    version:    CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    columns:    columns.sort((a, b) => a.order - b.order),
    tasks,
    labels:     labels.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
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
  const tx = db.transaction(['columns', 'tasks', 'labels'], 'readwrite');

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
