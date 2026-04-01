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
import type { Column, Task, Label, ActivityEvent, Board, Project } from '../types/models.js';
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
/**
 * Genera una snapshot completa del tablero en formato `BoardExport`.
 * Lee los tres object stores (columns, tasks, labels) en una sola transacción
 * readonly para garantizar consistencia.
 */
export declare function exportBoardData(): Promise<BoardExport>;
/**
 * Descarga la snapshot como un archivo `.json` usando un link temporal.
 */
export declare function downloadBoardExport(data: BoardExport): void;
/**
 * Lee un `File` seleccionado por el usuario y lo parsea como JSON.
 * Devuelve el contenido parseado o lanza un error descriptivo.
 */
export declare function readImportFile(file: File): Promise<unknown>;
/**
 * Valida que un objeto desconocido tenga la estructura esperada de `BoardExport`.
 * Verifica: version, exportedAt, columns, tasks, labels.
 */
export declare function validateImportData(raw: unknown): ValidateResult;
/**
 * Reemplaza todos los datos del tablero con los datos importados.
 * Opera en una única transacción readwrite atómica: si algún paso falla,
 * IndexedDB revierte los cambios automáticamente.
 */
export declare function importBoardData(data: BoardExport): Promise<void>;
export {};
