/**
 * project.repository.ts — CRUD de proyectos sobre IndexedDB (US-26).
 *
 * Los proyectos agrupan tareas bajo identificadores legibles (ej. "WEB-005").
 * Cada proyecto tiene un prefijo único (máx. 5 chars, uppercase) y un contador
 * secuencial para generar taskNumbers.
 */
import type { Project } from '../types/models.js';
type CreateProjectInput = Omit<Project, 'id' | 'nextTaskNumber' | 'createdAt'>;
type UpdateProjectInput = Partial<Pick<Project, 'name' | 'description'>>;
/** Valida que un prefijo cumpla el formato: 1-5 letras, solo mayúsculas. */
export declare function isValidPrefix(prefix: string): boolean;
/** Devuelve todos los proyectos ordenados por fecha de creación ascendente. */
export declare function getAllProjects(): Promise<Project[]>;
/** Devuelve un proyecto por su ID, o `undefined` si no existe. */
export declare function getProjectById(id: string): Promise<Project | undefined>;
/** Devuelve un proyecto por su prefijo, o `undefined` si no existe. */
export declare function getProjectByPrefix(prefix: string): Promise<Project | undefined>;
/**
 * Crea un nuevo proyecto. Asigna `id`, `nextTaskNumber` (1) y `createdAt` automáticamente.
 * Valida formato y unicidad del prefijo.
 */
export declare function createProject(input: CreateProjectInput): Promise<Project>;
/**
 * Actualiza un proyecto existente. El prefijo es inmutable.
 * Lanza un `Error` si el proyecto no existe.
 */
export declare function updateProject(id: string, changes: UpdateProjectInput): Promise<Project>;
/**
 * Elimina un proyecto por su ID y reasigna sus tareas al proyecto "General".
 * No permite eliminar el proyecto por defecto "General".
 */
export declare function deleteProject(id: string): Promise<void>;
/**
 * Obtiene el siguiente taskNumber para un proyecto y lo incrementa atómicamente.
 * Devuelve el identificador legible (ej. "WEB-005").
 */
export declare function getNextTaskNumber(projectId: string): Promise<string>;
/**
 * Inicializa el proyecto por defecto "General" si no existe.
 * Idempotente: no hace nada si ya existe.
 */
export declare function seedDefaultProject(): Promise<void>;
export {};
