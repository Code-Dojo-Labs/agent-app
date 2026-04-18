/**
 * models.ts — Interfaces y tipos del dominio Kanban
 *
 * Todas las entidades se definen aquí. No se importan librerías externas.
 * Los IDs son UUID v4 generados con `crypto.randomUUID()`.
 */

// ── Prioridad ──────────────────────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// ── Subtask (US-21) ────────────────────────────────────────────────────────

/** Elemento de checklist embebido en una tarea. */
export interface Subtask {
  /** UUID v4. */
  id: string;
  /** Texto descriptivo de la subtarea. */
  text: string;
  /** Si la subtarea está completada. */
  completed: boolean;
}

// ── Task ───────────────────────────────────────────────────────────────────

/** Representa una tarjeta del tablero Kanban. */
export interface Task {
  /** UUID v4 generado en el cliente. */
  id: string;
  /** FK → Board.id — tablero al que pertenece (US-22). */
  boardId: string;
  /** FK → Project.id — proyecto al que pertenece (US-26). */
  projectId: string;
  /** Identificador legible del proyecto, ej. "WEB-005" (US-26). */
  taskNumber: string;
  /** Título visible de la tarea. Máx. 120 caracteres. */
  title: string;
  /** Descripción en formato Markdown. Puede estar vacío. */
  description: string;
  /** FK → Column.id — estado actual de la tarea. */
  statusId: string;
  /** Nivel de prioridad de la tarea. */
  priority: Priority;
  /** Lista de FK → Label.id asociadas a la tarea (relación N:M). */
  labelIds: string[];
  /** Fecha de creación en formato ISO 8601. */
  createdAt: string;
  /** Fecha de última modificación en formato ISO 8601. */
  updatedAt: string;
  /** Fecha de vencimiento en formato ISO 8601. Null/undefined = sin vencimiento (US-17). */
  dueDate?: string | null;
  /** Lista de subtareas (checklist). Puede estar vacía (US-21). */
  subtasks?: Subtask[];
  /** Lista de FK → Person.id asignadas a la tarea (US-29). */
  assignees: string[];
  /** Posición dentro de la columna (para ordenamiento manual). */
  order: number;
}

// ── Column ─────────────────────────────────────────────────────────────────

/** Define un estado/columna del tablero Kanban. */
export interface Column {
  /** UUID v4. */
  id: string;
  /** FK → Board.id — tablero al que pertenece (US-22). */
  boardId: string;
  /** Nombre visible de la columna. Máx. 50 caracteres. */
  name: string;
  /** Emoji o nombre de ícono que representa el estado (ej. "✅"). */
  icon: string;
  /** Posición horizontal en el tablero. */
  order: number;
  /** Color de acento opcional en formato hexadecimal (ej. "#1D4ED8"). */
  color?: string;
  /** Indica que la columna fue creada por el seed inicial (US-37). No bloquea edición ni eliminación. */
  isDefault?: boolean;
  /** Límite máximo de tareas (WIP). undefined/null = sin límite (US-32). */
  wipLimit?: number | null;
}

/** Columnas por defecto que se insertan al inicializar la base de datos (US-37). */
export const DEFAULT_COLUMNS: Omit<Column, 'id' | 'boardId'>[] = [
  { name: 'Backlog',      icon: '📋', order: 0, isDefault: true },
  { name: 'Por Hacer',    icon: '🔲', order: 1, isDefault: true },
  { name: 'En Progreso',  icon: '🔄', order: 2, isDefault: true },
  { name: 'En Revisión',  icon: '🔍', order: 3, isDefault: true },
  { name: 'Hecho',        icon: '✅', order: 4, isDefault: true },
  { name: 'Bloqueado',    icon: '🚫', order: 5, isDefault: true },
];

// ── Board (US-22) ──────────────────────────────────────────────────────────

/** Representa un tablero Kanban independiente. */
export interface Board {
  /** UUID v4. */
  id: string;
  /** Nombre visible del tablero. Máx. 60 caracteres. */
  name: string;
  /** Emoji decorativo opcional del tablero. */
  emoji?: string;
  /** Fecha de creación en formato ISO 8601. */
  createdAt: string;
}

/** Nombre del tablero por defecto creado en la migración. */
export const DEFAULT_BOARD_NAME = 'Mi tablero';

// ── Project (US-26) ────────────────────────────────────────────────────────

/** Representa un proyecto que agrupa tareas con identificadores legibles. */
export interface Project {
  /** UUID v4. */
  id: string;
  /** Nombre visible del proyecto. Máx. 60 caracteres. */
  name: string;
  /** Prefijo único (máx. 5 caracteres, uppercase, solo letras). Inmutable tras creación. */
  prefix: string;
  /** Descripción opcional del proyecto. */
  description: string;
  /** Siguiente número secuencial para asignar a la próxima tarea. */
  nextTaskNumber: number;
  /** Fecha de creación en formato ISO 8601. */
  createdAt: string;
}

/** Nombre del proyecto por defecto. */
export const DEFAULT_PROJECT_NAME = 'General';
/** Prefijo del proyecto por defecto. */
export const DEFAULT_PROJECT_PREFIX = 'GEN';

// ── Label ──────────────────────────────────────────────────────────────────

/** Etiqueta reutilizable que puede asociarse a múltiples tareas. */
export interface Label {
  /** UUID v4. */
  id: string;
  /** Nombre de la etiqueta. Máx. 30 caracteres. Único (case-insensitive). */
  name: string;
  /**
   * Color de fondo en formato hexadecimal (ej. "#B91C1C").
   * Debe garantizar un ratio de contraste ≥ 4.5:1 contra #FFFFFF.
   */
  color: string;
}

/** Etiquetas por defecto que se insertan al inicializar la base de datos. */
export const DEFAULT_LABELS: Omit<Label, 'id'>[] = [
  { name: 'Bug',             color: '#B91C1C' },
  { name: 'Feature',         color: '#1D4ED8' },
  { name: 'Mejora',          color: '#15803D' },
  { name: 'Documentación',   color: '#6D28D9' },
  { name: 'Diseño',          color: '#BE185D' },
  { name: 'Investigación',   color: '#B45309' },
  { name: 'Testing',         color: '#0E7490' },
  { name: 'Infraestructura', color: '#374151' },
];

// ── ActivityEvent (US-20) ──────────────────────────────────────────────────

/** Tipos de evento registrados en el historial de actividad. */
export type ActivityEventType =
  | 'created'
  | 'status_change'
  | 'priority_change'
  | 'label_added'
  | 'label_removed';

/** Registro de un evento de actividad asociado a una tarea. */
export interface ActivityEvent {
  /** UUID v4. */
  id: string;
  /** FK → Task.id. */
  taskId: string;
  /** Tipo de evento. */
  type: ActivityEventType;
  /** Datos adicionales del evento (varían según el tipo). */
  payload: Record<string, unknown>;
  /** Fecha del evento en formato ISO 8601. */
  createdAt: string;
}

// ── Person (US-29) ─────────────────────────────────────────────────────────

/** Representa una persona del directorio local que puede asignarse a tareas. */
export interface Person {
  /** UUID v4. */
  id: string;
  /** Nombre completo de la persona. Máx. 60 caracteres. */
  name: string;
  /** Avatar: emoji seleccionado o inicial generada del nombre. */
  avatar: string;
  /** Fecha de creación en formato ISO 8601. */
  createdAt: string;
}
