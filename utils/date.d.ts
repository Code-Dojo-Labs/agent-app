/**
 * date.ts — Utilidades de fecha de vencimiento (US-17)
 *
 * Calcula el estado de vencimiento y genera texto relativo
 * usando `Intl.RelativeTimeFormat`. Zero dependencies.
 */
export type DueStatus = 'overdue' | 'due-soon' | 'normal' | 'none';
/**
 * Determina el estado de vencimiento de una tarea.
 * - `'overdue'`   → ya venció
 * - `'due-soon'`  → vence dentro de 48 h
 * - `'normal'`    → vence en más de 48 h
 * - `'none'`      → sin fecha asignada
 */
export declare function getDueStatus(dueDate?: string | null): DueStatus;
/**
 * Devuelve una cadena relativa legible: "mañana", "en 3 días", "hace 2 días", etc.
 * Retorna cadena vacía si la fecha es inválida o no se proporciona.
 */
export declare function formatRelativeDate(iso?: string | null): string;
