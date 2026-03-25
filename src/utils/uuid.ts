/**
 * uuid.ts — Wrapper tipado para la generación de UUIDs.
 *
 * Se usa la API nativa `crypto.randomUUID()` del navegador (y Node.js ≥ 19).
 * No se importa ninguna librería de terceros.
 */

/**
 * Genera un UUID v4 usando la API criptográfica del navegador.
 * @returns String con formato "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
