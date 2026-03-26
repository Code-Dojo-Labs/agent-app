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

// ── Constantes de seguridad ────────────────────────────────────────────────

/** Protocolos de URL permitidos en enlaces. */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

// ── Helpers de DOM ─────────────────────────────────────────────────────────

/** Crea un elemento HTML del tipo dado. */
function el(tag: string): HTMLElement {
  return document.createElement(tag);
}

/** Crea un nodo de texto con contenido seguro (sin riesgo XSS). */
function text(content: string): Text {
  return document.createTextNode(content);
}

/**
 * Valida que una URL sea segura (protocolo permitido).
 * Devuelve la URL si es válida, o '#' como fallback.
 */
function sanitizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? raw : '#';
  } catch {
    return '#';
  }
}

// ── Parser de inline ───────────────────────────────────────────────────────

/**
 * Procesa el contenido inline de una línea y añade los nodos resultantes
 * al elemento padre dado.
 *
 * Soporta: **negrita**, *cursiva*, `código`, [enlace](url).
 */
function parseInline(parent: HTMLElement | DocumentFragment, line: string): void {
  // Patrón que captura todos los tokens inline en orden de precedencia
  const INLINE_RE = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_RE.exec(line)) !== null) {
    // Texto plano antes del token
    if (match.index > lastIndex) {
      parent.appendChild(text(line.slice(lastIndex, match.index)));
    }

    const [full, , bold, italic, code, linkText, linkHref] = match;

    if (bold !== undefined) {
      const strong = el('strong');
      strong.appendChild(text(bold));
      parent.appendChild(strong);
    } else if (italic !== undefined) {
      const em = el('em');
      em.appendChild(text(italic));
      parent.appendChild(em);
    } else if (code !== undefined) {
      const codeEl = el('code');
      codeEl.appendChild(text(code));
      parent.appendChild(codeEl);
    } else if (linkText !== undefined && linkHref !== undefined) {
      const a = el('a') as HTMLAnchorElement;
      (a as HTMLAnchorElement).href   = sanitizeUrl(linkHref);
      (a as HTMLAnchorElement).target = '_blank';
      (a as HTMLAnchorElement).rel    = 'noopener noreferrer';
      a.appendChild(text(linkText));
      parent.appendChild(a);
    } else {
      parent.appendChild(text(full));
    }

    lastIndex = INLINE_RE.lastIndex;
  }

  // Texto restante al final
  if (lastIndex < line.length) {
    parent.appendChild(text(line.slice(lastIndex)));
  }
}

// ── Parser principal ───────────────────────────────────────────────────────

/**
 * Convierte una cadena de Markdown en un `DocumentFragment` con nodos DOM seguros.
 * El fragmento puede insertarse directamente en el DOM sin riesgo de XSS.
 *
 * @param markdown - Texto en formato Markdown.
 * @returns DocumentFragment listo para ser insertado en el DOM.
 */
export function parseMarkdown(markdown: string): DocumentFragment {
  const fragment = document.createDocumentFragment();

  // Normalizar saltos de línea
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  let i = 0;
  let currentList: HTMLUListElement | null = null;
  let pendingParagraphLines: string[]      = [];

  const flushParagraph = (): void => {
    if (pendingParagraphLines.length === 0) return;
    const p = el('p');
    parseInline(p, pendingParagraphLines.join(' '));
    fragment.appendChild(p);
    pendingParagraphLines = [];
  };

  const flushList = (): void => {
    if (!currentList) return;
    fragment.appendChild(currentList);
    currentList = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    // ── Línea en blanco: cierra párrafo o lista pendiente ──────────────
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      i++;
      continue;
    }

    // ── Bloques de código cercados (```...```) ───────────────────────
    if (line.match(/^```/)) {
      flushParagraph();
      flushList();
      // Recopilar líneas hasta el cierre ```
      const codeLines: string[] = [];
      i++; // Saltar la línea de apertura
      while (i < lines.length && !lines[i].match(/^```/)) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // Saltar la línea de cierre
      const pre  = document.createElement('pre');
      const code = document.createElement('code');
      // textContent: inserción segura sin riesgo XSS
      code.textContent = codeLines.join('\n');
      pre.appendChild(code);
      fragment.appendChild(pre);
      continue;
    }

    // ── Encabezados (# a ######) ───────────────────────────────────────
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level   = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const heading = el(`h${level}`);
      parseInline(heading, headingMatch[2].trim());
      fragment.appendChild(heading);
      i++;
      continue;
    }

    // ── Listas no ordenadas (- ítem) ───────────────────────────────────
    const listItemMatch = line.match(/^[-*]\s+(.+)$/);
    if (listItemMatch) {
      flushParagraph();
      if (!currentList) {
        currentList = el('ul') as HTMLUListElement;
      }
      const li = el('li');
      parseInline(li, listItemMatch[1].trim());
      currentList.appendChild(li);
      i++;
      continue;
    }

    // Si venimos de una lista y la línea no es item, cerramos la lista
    if (currentList) {
      flushList();
    }

    // ── Párrafo (acumulamos líneas consecutivas) ───────────────────────
    pendingParagraphLines.push(line.trim());
    i++;
  }

  // Vaciar buffers al final del input
  flushParagraph();
  flushList();

  return fragment;
}

/**
 * Convierte Markdown a un string HTML para casos donde se necesita texto plano.
 * ADVERTENCIA: Usar solo para serialización (ej. accesibilidad aria-label).
 * Para insertar en el DOM, usar siempre `parseMarkdown()`.
 */
export function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .trim();
}
