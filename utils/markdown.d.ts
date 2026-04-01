/**
 * markdown.ts — Parser de Markdown propio (subconjunto CommonMark).
 *
 * Implementación sin librerías externas.
 * La sanitización XSS se realiza mediante manipulación del DOM (createElement +
 * textContent), nunca via innerHTML con entrada directa del usuario.
 *
 * Sintaxis soportada:
 *   # Títulos (h1–h6)
 *   **negrita**
 *   *cursiva*
 *   `código inline`
 *   ```lang\ncódigo\n``` — bloques de código cercados
 *   - Listas no ordenadas
 *   [texto](url) — solo protocolos http: y https:
 *   Párrafos separados por líneas en blanco
 */
/**
 * Convierte una cadena de Markdown en un `DocumentFragment` con nodos DOM seguros.
 * El fragmento puede insertarse directamente en el DOM sin riesgo de XSS.
 *
 * @param markdown - Texto en formato Markdown.
 * @returns DocumentFragment listo para ser insertado en el DOM.
 */
export declare function parseMarkdown(markdown: string): DocumentFragment;
/**
 * Convierte Markdown a un string HTML para casos donde se necesita texto plano.
 * ADVERTENCIA: Usar solo para serialización (ej. accesibilidad aria-label).
 * Para insertar en el DOM, usar siempre `parseMarkdown()`.
 */
export declare function markdownToPlainText(markdown: string): string;
