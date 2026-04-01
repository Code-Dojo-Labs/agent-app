/**
 * label.repository.ts — CRUD de etiquetas sobre IndexedDB.
 *
 * Las etiquetas son reutilizables y se pueden asociar a múltiples tareas.
 * El campo `name` debe ser único (case-insensitive); la validación se realiza
 * en esta capa antes de escribir en IndexedDB.
 */
import type { Label } from '../types/models.js';
type CreateLabelInput = Omit<Label, 'id'>;
type UpdateLabelInput = Partial<Omit<Label, 'id'>>;
/** Devuelve todas las etiquetas, ordenadas alfabéticamente por nombre. */
export declare function getAllLabels(): Promise<Label[]>;
/** Devuelve una etiqueta por su ID, o `undefined` si no existe. */
export declare function getLabelById(id: string): Promise<Label | undefined>;
/**
 * Busca una etiqueta por nombre de forma case-insensitive.
 * IndexedDB no soporta collations, por lo que la búsqueda se realiza en memoria.
 */
export declare function findLabelByName(name: string): Promise<Label | undefined>;
/**
 * Crea una nueva etiqueta.
 * Lanza un `Error` si ya existe una etiqueta con el mismo nombre (case-insensitive).
 */
export declare function createLabel(input: CreateLabelInput): Promise<Label>;
/**
 * Actualiza una etiqueta existente.
 * Si se cambia el nombre, verifica que no exista un duplicado.
 * Lanza un `Error` si la etiqueta no existe o el nuevo nombre ya está en uso.
 */
export declare function updateLabel(id: string, changes: UpdateLabelInput): Promise<Label>;
/** Devuelve el número de tareas que tienen asignada una etiqueta. */
export declare function countTasksByLabelId(labelId: string): Promise<number>;
/**
 * Elimina una etiqueta y limpia su referencia en todas las tareas asociadas.
 * La operación es atómica: usa una transacción que abarca los stores
 * "labels" y "tasks" para evitar inconsistencias.
 */
export declare function deleteLabel(id: string): Promise<void>;
/**
 * Inserta las etiquetas por defecto si el Object Store está vacío.
 * Se llama una sola vez durante la inicialización de la aplicación.
 */
export declare function seedDefaultLabels(): Promise<void>;
export {};
