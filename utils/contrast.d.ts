/**
 * contrast.ts — Cálculo de contraste WCAG 2.1.
 *
 * Implementación propia sin librerías externas.
 * Referencia: https://www.w3.org/TR/WCAG21/#contrast-minimum
 *
 * Para las etiquetas del tablero, el mínimo aceptable es 4.5:1
 * (nivel AA, texto normal) evaluado contra el color de texto (#FFFFFF o #000000).
 */
/**
 * Calcula la luminancia relativa de un color hex.
 * Fórmula WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export declare function relativeLuminance(hex: string): number;
/**
 * Calcula el ratio de contraste entre dos colores hexadecimales.
 * El ratio va de 1:1 (sin contraste) a 21:1 (máximo contraste negro/blanco).
 *
 * @param hex1 - Color 1 en formato hex (ej. "#B91C1C").
 * @param hex2 - Color 2 en formato hex (ej. "#FFFFFF").
 * @returns Ratio de contraste (número ≥ 1).
 */
export declare function contrastRatio(hex1: string, hex2: string): number;
/**
 * Verifica si un par de colores cumple WCAG 2.1 nivel AA para texto normal.
 * Uso principal: validar el contraste del texto de una etiqueta sobre su color de fondo.
 */
export declare function meetsWcagAA(foreground: string, background: string): boolean;
/**
 * Elige automáticamente el color de texto (#FFFFFF o #000000) que ofrece
 * mayor contraste sobre un color de fondo dado.
 *
 * @param background - Color de fondo en formato hex.
 * @returns "#FFFFFF" o "#000000" según cuál ofrezca mayor contraste.
 */
export declare function pickTextColor(background: string): '#FFFFFF' | '#000000';
/**
 * Valida si un color de etiqueta es accesible.
 * Calcula el contraste contra blanco y negro; aprueba si al menos uno supera 4.5:1.
 */
export declare function isLabelColorAccessible(bgColor: string): boolean;
/**
 * Sugiere una versión más oscura de `bgColor` que cumpla contraste ≥ 4.5:1 con `foreground`.
 * Si el color ya cumple el requisito, lo devuelve sin cambios.
 * El ajuste reduce progresivamente la luminosidad escalando los componentes RGB hacia negro.
 *
 * @param bgColor    - Color de fondo en formato hex que puede no pasar el ratio.
 * @param foreground - Color de texto a evaluar (por defecto "#FFFFFF").
 * @returns El color original si ya es accesible, o el ajuste más oscuro que lo cumpla.
 */
export declare function suggestAccessibleColor(bgColor: string, foreground?: string): string;
