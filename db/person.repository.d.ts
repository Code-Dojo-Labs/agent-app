/**
 * person.repository.ts — CRUD de personas sobre IndexedDB.
 *
 * Gestión del directorio local de personas para asignación a tareas (US-29).
 * Todas las operaciones son asíncronas y devuelven Promesas.
 * Los IDs se generan con `crypto.randomUUID()` en el cliente.
 */
import type { Person } from '../types/models.js';
type CreatePersonInput = Omit<Person, 'id' | 'createdAt'>;
type UpdatePersonInput = Partial<Omit<Person, 'id' | 'createdAt'>>;
/** Devuelve todas las personas almacenadas, ordenadas alfabéticamente. */
export declare function getAllPersons(): Promise<Person[]>;
/** Devuelve una persona por su ID, o `undefined` si no existe. */
export declare function getPersonById(id: string): Promise<Person | undefined>;
/** Devuelve múltiples personas por sus IDs. Ignora IDs inexistentes. */
export declare function getPersonsByIds(ids: string[]): Promise<Person[]>;
/**
 * Busca personas por nombre (case-insensitive, búsqueda parcial).
 * Útil para autocompletado en la asignación de tareas.
 */
export declare function searchPersonsByName(query: string): Promise<Person[]>;
/**
 * Crea una nueva persona. Asigna `id` y `createdAt` automáticamente.
 * Si no se proporciona avatar, se genera la inicial del nombre.
 */
export declare function createPerson(input: CreatePersonInput): Promise<Person>;
/**
 * Actualiza una persona existente.
 * Lanza un `Error` si la persona no existe.
 */
export declare function updatePerson(id: string, changes: UpdatePersonInput): Promise<Person>;
/**
 * Elimina una persona por su ID. No lanza error si no existe.
 * IMPORTANTE: También desasocia automáticamente la persona de todas las tareas.
 */
export declare function deletePerson(id: string): Promise<void>;
export {};
