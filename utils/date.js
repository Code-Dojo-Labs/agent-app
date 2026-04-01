/**
 * date.ts — Utilidades de fecha de vencimiento (US-17)
 *
 * Calcula el estado de vencimiento y genera texto relativo
 * usando `Intl.RelativeTimeFormat`. Zero dependencies.
 */
// ── Constantes ─────────────────────────────────────────────────────────────
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const DUE_SOON_MS = 48 * MS_PER_HOUR; // 48 horas
// ── Formatter singleton ────────────────────────────────────────────────────
let _rtf = null;
function getFormatter() {
    if (!_rtf)
        _rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
    return _rtf;
}
// ── API pública ────────────────────────────────────────────────────────────
/**
 * Determina el estado de vencimiento de una tarea.
 * - `'overdue'`   → ya venció
 * - `'due-soon'`  → vence dentro de 48 h
 * - `'normal'`    → vence en más de 48 h
 * - `'none'`      → sin fecha asignada
 */
export function getDueStatus(dueDate) {
    if (!dueDate)
        return 'none';
    const diff = new Date(dueDate).getTime() - Date.now();
    if (isNaN(diff))
        return 'none';
    if (diff < 0)
        return 'overdue';
    if (diff <= DUE_SOON_MS)
        return 'due-soon';
    return 'normal';
}
/**
 * Devuelve una cadena relativa legible: "mañana", "en 3 días", "hace 2 días", etc.
 * Retorna cadena vacía si la fecha es inválida o no se proporciona.
 */
export function formatRelativeDate(iso) {
    if (!iso)
        return '';
    const target = new Date(iso).getTime();
    if (isNaN(target))
        return '';
    const diff = target - Date.now();
    const absDiff = Math.abs(diff);
    const rtf = getFormatter();
    if (absDiff < MS_PER_MINUTE)
        return 'ahora';
    if (absDiff < MS_PER_HOUR) {
        const mins = Math.round(diff / MS_PER_MINUTE);
        return rtf.format(mins, 'minute');
    }
    if (absDiff < MS_PER_DAY) {
        const hours = Math.round(diff / MS_PER_HOUR);
        return rtf.format(hours, 'hour');
    }
    const days = Math.round(diff / MS_PER_DAY);
    return rtf.format(days, 'day');
}
