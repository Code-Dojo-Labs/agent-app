/**
 * contrast.ts — Cálculo de contraste WCAG 2.1.
 *
 * Implementación propia sin librerías externas.
 * Referencia: https://www.w3.org/TR/WCAG21/#contrast-minimum
 *
 * Para las etiquetas del tablero, el mínimo aceptable es 4.5:1
 * (nivel AA, texto normal) evaluado contra el color de texto (#FFFFFF o #000000).
 */

// ── Helpers de color ───────────────────────────────────────────────────────

/**
 * Convierte un color hexadecimal a sus componentes RGB (0-255).
 * Acepta formatos "#RRGGBB" y "#RGB".
 * Lanza un `Error` si el formato es inválido.
 */
function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace(/^#/, '');

  // Validar formato antes de parsear — evita NaN silencioso por caracteres no-hex (OWASP A03)
  if (!/^[0-9a-fA-F]{3}$/.test(cleaned) && !/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    throw new Error(`Invalid hex color: "${hex}"`);
  }

  if (cleaned.length === 3) {
    const [r, g, b] = cleaned.split('').map(c => parseInt(c + c, 16));
    return [r, g, b];
  }

  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return [r, g, b];
  }

  throw new Error(`Invalid hex color: "${hex}"`);
}

// ── Luminancia relativa ────────────────────────────────────────────────────

/**
 * Calcula la luminancia relativa de un color hex.
 * Fórmula WCAG 2.1: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ── Ratio de contraste ─────────────────────────────────────────────────────

/**
 * Calcula el ratio de contraste entre dos colores hexadecimales.
 * El ratio va de 1:1 (sin contraste) a 21:1 (máximo contraste negro/blanco).
 *
 * @param hex1 - Color 1 en formato hex (ej. "#B91C1C").
 * @param hex2 - Color 2 en formato hex (ej. "#FFFFFF").
 * @returns Ratio de contraste (número ≥ 1).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const L1 = relativeLuminance(hex1);
  const L2 = relativeLuminance(hex2);
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Validaciones WCAG ──────────────────────────────────────────────────────

/** Umbral mínimo WCAG 2.1 nivel AA para texto normal (≥ 4.5:1). */
const WCAG_AA_NORMAL = 4.5;

/** Umbral mínimo WCAG 2.1 nivel AA para texto grande (≥ 3:1). */
const WCAG_AA_LARGE  = 3.0;

/**
 * Verifica si un par de colores cumple WCAG 2.1 nivel AA para texto normal.
 * Uso principal: validar el contraste del texto de una etiqueta sobre su color de fondo.
 */
export function meetsWcagAA(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= WCAG_AA_NORMAL;
}

/**
 * Elige automáticamente el color de texto (#FFFFFF o #000000) que ofrece
 * mayor contraste sobre un color de fondo dado.
 *
 * @param background - Color de fondo en formato hex.
 * @returns "#FFFFFF" o "#000000" según cuál ofrezca mayor contraste.
 */
export function pickTextColor(background: string): '#FFFFFF' | '#000000' {
  const onWhite = contrastRatio(background, '#FFFFFF');
  const onBlack = contrastRatio(background, '#000000');
  return onWhite >= onBlack ? '#FFFFFF' : '#000000';
}

/**
 * Valida si un color de etiqueta es accesible.
 * Calcula el contraste contra blanco y negro; aprueba si al menos uno supera 4.5:1.
 */
export function isLabelColorAccessible(bgColor: string): boolean {
  return meetsWcagAA('#FFFFFF', bgColor) || meetsWcagAA('#000000', bgColor);
}
