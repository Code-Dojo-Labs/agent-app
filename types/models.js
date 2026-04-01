/**
 * models.ts — Interfaces y tipos del dominio Kanban
 *
 * Todas las entidades se definen aquí. No se importan librerías externas.
 * Los IDs son UUID v4 generados con `crypto.randomUUID()`.
 */
/** Columnas por defecto que se insertan al inicializar la base de datos. */
export const DEFAULT_COLUMNS = [
    { name: 'Backlog', icon: '📋', order: 0 },
    { name: 'Por hacer', icon: '🔲', order: 1 },
    { name: 'En progreso', icon: '🔄', order: 2 },
    { name: 'En revisión', icon: '🔍', order: 3 },
    { name: 'Hecho', icon: '✅', order: 4 },
    { name: 'Bloqueado', icon: '🚫', order: 5 },
];
/** Nombre del tablero por defecto creado en la migración. */
export const DEFAULT_BOARD_NAME = 'Mi tablero';
/** Nombre del proyecto por defecto. */
export const DEFAULT_PROJECT_NAME = 'General';
/** Prefijo del proyecto por defecto. */
export const DEFAULT_PROJECT_PREFIX = 'GEN';
/** Etiquetas por defecto que se insertan al inicializar la base de datos. */
export const DEFAULT_LABELS = [
    { name: 'Bug', color: '#B91C1C' },
    { name: 'Feature', color: '#1D4ED8' },
    { name: 'Mejora', color: '#15803D' },
    { name: 'Documentación', color: '#6D28D9' },
    { name: 'Diseño', color: '#BE185D' },
    { name: 'Investigación', color: '#B45309' },
    { name: 'Testing', color: '#0E7490' },
    { name: 'Infraestructura', color: '#374151' },
];
