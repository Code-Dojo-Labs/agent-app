/**
 * models.ts — Interfaces y tipos del dominio Kanban
 *
 * Todas las entidades se definen aquí. No se importan librerías externas.
 * Los IDs son UUID v4 generados con `crypto.randomUUID()`.
 */

// ── Prioridad ──────────────────────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// ── Task ───────────────────────────────────────────────────────────────────

/** Representa una tarjeta del tablero Kanban. */
export interface Task {
  /** UUID v4 generado en el cliente. */
  id: string;
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
  /** Posición dentro de la columna (para ordenamiento manual). */
  order: number;
}

// ── Column ─────────────────────────────────────────────────────────────────

/** Define un estado/columna del tablero Kanban. */
export interface Column {
  /** UUID v4. */
  id: string;
  /** Nombre visible de la columna. Máx. 50 caracteres. */
  name: string;
  /** Emoji o nombre de ícono que representa el estado (ej. "✅"). */
  icon: string;
  /** Posición horizontal en el tablero. */
  order: number;
  /** Color de acento opcional en formato hexadecimal (ej. "#1D4ED8"). */
  color?: string;
}

/** Columnas por defecto que se insertan al inicializar la base de datos. */
export const DEFAULT_COLUMNS: Omit<Column, 'id'>[] = [
  { name: 'Backlog',      icon: '📋', order: 0 },
  { name: 'Por hacer',    icon: '🔲', order: 1 },
  { name: 'En progreso',  icon: '🔄', order: 2 },
  { name: 'En revisión',  icon: '🔍', order: 3 },
  { name: 'Hecho',        icon: '✅', order: 4 },
  { name: 'Bloqueado',    icon: '🚫', order: 5 },
];

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
