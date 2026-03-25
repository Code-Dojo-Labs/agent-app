# Stack Tecnológico

> [← Volver al índice](./index.md)

---

## Principio rector: Zero Dependencies

Todo el código de producción se ejecuta sobre **Web APIs nativas del navegador**. No se instalan frameworks, librerías de UI, wrappers de base de datos ni utilidades externas. Las únicas herramientas externas permitidas son las de **desarrollo y compilación**, que no forman parte del bundle final entregado al navegador.

```
┌─────────────────────────────────────────────────────────────┐
│                    LO QUE CORRE EN EL NAVEGADOR             │
│                                                             │
│   HTML5  +  CSS3  +  TypeScript→JS  +  Web APIs nativas    │
│                                                             │
│   ✗ React   ✗ Vue   ✗ Tailwind   ✗ idb   ✗ DOMPurify      │
└─────────────────────────────────────────────────────────────┘
```

---

## Tabla resumen del stack

| Capa | Tecnología | Versión / Especificación | Rol |
|---|---|---|---|
| Lenguaje | **TypeScript** | 5.x | Lógica de la aplicación, tipado de modelos e interfaces |
| Marcado | **HTML5** | Living Standard | Estructura de la página y plantillas de componentes (`<template>`) |
| Estilos | **CSS3** | Custom Properties, Grid, Flexbox, Animations | Presentación visual, theming y encapsulamiento en Shadow DOM |
| Componentes | **Web Components** | Custom Elements v1 + Shadow DOM v1 | Arquitectura de UI sin framework |
| Persistencia | **IndexedDB** | API nativa del navegador | Almacenamiento estructurado de tareas, columnas y etiquetas |
| Arrastre | **Drag and Drop API** | HTML5 nativo | Mover tarjetas entre columnas |
| Routing | **History API** | `pushState` / `popstate` | Navegación SPA sin recarga (si se requiere multi-vista) |
| Módulos | **ES Modules** | `type="module"` | Organización del código sin bundler |
| Contraste | **Cálculo WCAG** | Implementación manual WCAG 2.1 | Validación de colores de etiquetas |
| Markdown | **Parser propio** | Subconjunto de CommonMark | Renderizado seguro de descripciones |
| Dev server | **Live Preview** / `http.server` | VS Code extension / Python 3 | Visualización durante el desarrollo |
| Compilador | **tsc** | TypeScript Compiler | Transpilación TS → JS ES Modules |

---

## Tecnologías de producción (detalle)

### 1. TypeScript

- **Versión:** 5.x (solo como herramienta de build, el output es JS vanilla).
- **Configuración (`tsconfig.json`):**
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ES2022",
      "moduleResolution": "bundler",
      "strict": true,
      "outDir": "./dist",
      "rootDir": "./src",
      "declaration": true,
      "lib": ["ES2022", "DOM", "DOM.Iterable"]
    },
    "include": ["src/**/*"]
  }
  ```
- **Uso:** Todos los archivos fuente tienen extensión `.ts`. El compilador genera archivos `.js` en `/dist` que el navegador consumirá directamente como ES Modules.
- **No se usa ningún bundler** (Webpack, Vite, Rollup, esbuild). Solo `tsc`.

---

### 2. HTML5 + Web Components

La UI se construye íntegramente con **Custom Elements** y **Shadow DOM**, las dos APIs centrales de Web Components:

```
Web Components =  Custom Elements
               +  Shadow DOM
               +  HTML Templates (<template> + <slot>)
```

#### Custom Elements
Cada componente es una clase TypeScript que extiende `HTMLElement` y se registra con `customElements.define`:

```ts
// src/components/atoms/priority-badge/priority-badge.ts
class PriorityBadge extends HTMLElement {
  connectedCallback() { /* renderizar */ }
  static get observedAttributes() { return ['level']; }
  attributeChangedCallback(name: string, _: string, newVal: string) { /* actualizar */ }
}
customElements.define('dojo-priority-badge', PriorityBadge);
```

#### Shadow DOM
Cada componente crea su propio árbol DOM aislado. Los estilos no se filtran hacia fuera ni hacia dentro:

```ts
this.attachShadow({ mode: 'open' });
```

#### HTML Templates
Estructura declarativa reutilizable sin renderizado inmediato:

```html
<template id="task-card-template">
  <div class="card">
    <slot name="labels"></slot>
    <slot name="title"></slot>
  </div>
</template>
```

---

### 3. CSS3

- **Encapsulamiento:** Todos los estilos viven dentro del Shadow DOM de cada componente. No existen hojas de estilo globales salvo las variables de tema y el reset base mínimo.
- **Theming con CSS Custom Properties:** Todas las propiedades visuales (colores, tipografía, espaciados) se exponen como variables bajo el prefijo `--dojo-`:
  ```css
  :host {
    --dojo-primary:        #1D4ED8;
    --dojo-surface:        #F7F8FA;
    --dojo-text-primary:   #172B4D;
    --dojo-text-secondary: #5E6C84;
    --dojo-radius:         8px;
  }
  ```
- **Layout:** CSS Grid para el tablero (columnas horizontales), Flexbox para las tarjetas y los componentes internos.
- **Animaciones:** `@keyframes` y `transition` nativas. Sin librerías de animación.
- **Modo oscuro:** `@media (prefers-color-scheme: dark)` + override manual con atributo `data-theme="dark"` en el `<html>`.

---

### 4. IndexedDB (API nativa)

Se usa la **API de IndexedDB directamente**, sin wrappers. Toda la asincronía se encapsula en Promesas dentro del patrón Repository:

```ts
// Patrón helper para convertir requests IDB a Promesas
function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror  = () => reject(request.error);
  });
}
```

Los tres Object Stores son: `tasks`, `columns`, `labels`. Ver esquema completo en [Modelo de Datos](./data-model.md).

---

### 5. HTML5 Drag and Drop API

Se usa la API nativa de arrastre del navegador para mover tarjetas entre columnas:

```ts
// En la tarjeta (draggable)
card.draggable = true;
card.addEventListener('dragstart', (e) => {
  e.dataTransfer!.setData('text/plain', task.id);
  e.dataTransfer!.effectAllowed = 'move';
});

// En la columna (drop target)
column.addEventListener('dragover', (e) => { e.preventDefault(); });
column.addEventListener('drop', (e) => {
  const taskId = e.dataTransfer!.getData('text/plain');
  // actualizar statusId en IndexedDB
});
```

---

### 6. Validación de contraste WCAG 2.1 (implementación propia)

La fórmula de contraste se implementa en TypeScript puro, sin librerías:

```ts
function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrastRatio(hex1: string, hex2: string): number {
  const L1 = relativeLuminance(hex1);
  const L2 = relativeLuminance(hex2);
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

// Uso: contrastRatio('#B91C1C', '#FFFFFF') → ≥ 4.5 ✅
```

---

### 7. Parser de Markdown (implementación propia)

Se implementa un subconjunto mínimo de Markdown para las descripciones de tareas. No se usa ninguna librería:

| Sintaxis | Result |
|---|---|
| `**texto**` | `<strong>texto</strong>` |
| `*texto*` | `<em>texto</em>` |
| `` `código` `` | `<code>código</code>` |
| `# Título` | `<h1>Título</h1>` (hasta `######`) |
| `- ítem` | `<ul><li>ítem</li></ul>` |
| `[texto](url)` | `<a href="url">texto</a>` |
| Línea en blanco | Separador de párrafos `<p>` |

**Sanitización XSS:** El HTML generado se inserta mediante manipulación del DOM (createElement + textContent), nunca via `innerHTML` con entrada directa del usuario. Los atributos de URL en `<a>` son validados contra una lista de protocolos permitidos (`http:`, `https:`).

---

## Herramientas de desarrollo

Las siguientes herramientas son exclusivamente de desarrollo y **no se incluyen en el código de producción**:

| Herramienta | Propósito | Instalación |
|---|---|---|
| **TypeScript compiler** (`tsc`) | Compilar `.ts` → `.js` ES Modules | `npm install -D typescript` (devDependency) |
| **VS Code Live Preview** | Servidor local con hot-reload para visualizar la app | Extensión VS Code: `ms-vscode.live-server` |
| **Python http.server** | Alternativa al Live Preview sin instalar nada | `python3 -m http.server 3000` (Python ya instalado) |

> `typescript` es la única devDependency del proyecto. El `package.json` no tendrá `dependencies`, solo `devDependencies`.

---

## Visualización durante el desarrollo

Dado el uso de ES Modules (`type="module"` en los scripts), los archivos **no pueden abrirse directamente** como `file://` en el navegador (restricción CORS). Se requiere un servidor HTTP local:

### Opción A — VS Code Live Preview (recomendada)

1. Instalar la extensión **Live Preview** (`ms-vscode.live-server`) en VS Code.
2. Abrir el comando `Live Preview: Start Server` sobre `dist/index.html`.
3. La página se recarga automáticamente al recompilar con `tsc --watch`.

### Opción B — Python (sin instalar nada extra)

```bash
# Desde la raíz del proyecto, después de compilar:
cd dist
python3 -m http.server 3000
# Abrir http://localhost:3000
```

### Opción C — Node.js nativo (sin npm)

```js
// scripts/serve.mjs — servidor estático mínimo (Node.js built-in, sin deps)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
};

createServer(async (req, res) => {
  const url  = req.url === '/' ? '/index.html' : req.url;
  const path = join('dist', url);
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] ?? 'text/plain' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).listen(3000, () => console.log('http://localhost:3000'));
```

```bash
node scripts/serve.mjs
```

---

## Estructura de carpetas del proyecto

```
agent-app/
├── src/                        # Código fuente TypeScript
│   ├── components/
│   │   ├── atoms/              # Átomos: badge, chip, button, icon…
│   │   ├── molecules/          # Moléculas: task-card, label-picker…
│   │   └── organisms/          # Organismos: kanban-board, task-detail…
│   ├── db/
│   │   ├── database.ts         # openDatabase(), helpers de IDB
│   │   ├── task.repository.ts
│   │   ├── column.repository.ts
│   │   └── label.repository.ts
│   ├── utils/
│   │   ├── contrast.ts         # Cálculo WCAG de contraste
│   │   ├── markdown.ts         # Parser de Markdown propio
│   │   └── uuid.ts             # crypto.randomUUID() wrapper tipado
│   ├── types/
│   │   └── models.ts           # interfaces Task, Column, Label, Priority
│   └── main.ts                 # Entry point: registra componentes e inicializa DB
├── dist/                       # Output del compilador tsc (no versionado)
│   ├── index.html
│   └── …
├── public/
│   └── index.html              # HTML raíz con <script type="module">
├── requirements/               # Documentación de requerimientos
├── agents/                     # Definiciones de agentes
├── COOKBOOK.md                 # Bitácora técnica del proyecto
├── tsconfig.json
└── package.json                # Solo devDependencies: { "typescript": "^5.x" }
```

---

## Flujo de build

```bash
# 1. Compilar (una sola vez)
npx tsc

# 2. Compilar en modo watch (durante el desarrollo)
npx tsc --watch

# 3. Visualizar (en otra terminal)
python3 -m http.server 3000 --directory dist
# ó
node scripts/serve.mjs
```

El resultado final en `dist/` son archivos `.html`, `.js` y `.css` puros, sin dependencias en tiempo de ejecución. El proyecto puede desplegarse en cualquier hosting estático (GitHub Pages, Netlify, un servidor Nginx) simplemente copiando la carpeta `dist/`.

---

## Lo que está explícitamente prohibido

| Categoría | Ejemplos |
|---|---|
| Frameworks de UI | React, Vue, Angular, Svelte, Lit |
| Wrappers de IndexedDB | idb, Dexie.js, localForage |
| Librerías de utilidades | Lodash, date-fns, UUID (npm) |
| Librerías CSS | Tailwind (CDN/npm), Bootstrap, Bulma |
| Bundlers (en producción) | Webpack, Vite, Rollup, Parcel |
| Librerías de Markdown | marked, markdown-it, showdown |
| Librerías de contraste | wcag-contrast, color.js |
| Librerías de DnD | dnd-kit, SortableJS, interact.js |
| Librerías de sanitización | DOMPurify (se usa DOM API nativa) |

> **Regla de cumplimiento:** El agente **Reviewer** bloqueará cualquier PR que introduzca una entrada en `dependencies` del `package.json`.
