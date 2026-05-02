# IMP-07 — Sistema de Iconos SVG Personalizado

> **Área:** UI / Design System  
> **Prioridad:** Alta  
> **Estado:** Propuesta  
> **Fecha:** 2026-05-01

---

## Problema que resuelve

El sistema actual usa **emojis de Unicode** (⬇️, ➡️, ⬆️, 🔥, 📅, ✕, ✏️, 🗑️, etc.) como iconografía en toda la aplicación. Esto genera los siguientes problemas:

- **Inconsistencia visual**: Los emojis se renderizan de forma diferente en cada sistema operativo (Windows, macOS, Linux, Android, iOS), rompiendo la identidad del producto.
- **Control limitado**: No es posible controlar el color, grosor o tamaño exacto de un emoji con CSS.
- **Apariencia poco profesional**: Las apps modernas de gestión de proyectos (Linear, Notion, Jira, GitHub) usan iconos SVG vectoriales, no emojis.
- **Accesibilidad deficiente**: Los emojis son leídos literalmente por los lectores de pantalla ("cohete", "fuego"), generando ruido para usuarios con discapacidades visuales.

---

## Propuesta de Solución

Implementar un **sistema de iconos SVG inline** basado en un sprite o componente `<dojo-icon>` que:

1. Cargue iconos desde un **sprite SVG** (`/public/icons/sprite.svg`) para máximo rendimiento.
2. Exponga un Web Component `<dojo-icon name="priority-high" size="16" color="currentColor">` como átomo reutilizable.
3. Reemplace todos los emojis funcionales (acciones, prioridades, estados) por iconos SVG.
4. Permita control total de color mediante `currentColor` y variables CSS.

### Iconos propuestos (conjunto mínimo)

| Categoría | Nombre | Uso actual (emoji) |
|---|---|---|
| Prioridad | `priority-low` | ⬇️ |
| Prioridad | `priority-medium` | ➡️ |
| Prioridad | `priority-high` | ⬆️ |
| Prioridad | `priority-urgent` | 🔥 |
| Acciones | `edit` | ✏️ |
| Acciones | `delete` | 🗑️ |
| Acciones | `close` | ✕ |
| Acciones | `add` | + |
| Acciones | `drag-handle` | ⠿ |
| Estado | `calendar` | 📅 |
| Estado | `label` | 🏷️ |
| Estado | `assignee` | 👤 |
| Estado | `subtask` | ☑️ |
| Navegación | `chevron-down` | ▾ |
| Navegación | `search` | 🔍 |
| Navegación | `filter` | — |
| Navegación | `board-view` | — |
| Navegación | `list-view` | — |
| Sistema | `check` | ✓ |
| Sistema | `warning` | ⚠️ |
| Sistema | `info` | ℹ️ |

### Fuente de iconos recomendada

Utilizar el set **Heroicons** (MIT License, de Tailwind Labs) o **Lucide Icons** (MIT License). Ambos son:
- Diseñados para interfaces de software
- Disponibles como SVG con `viewBox="0 0 24 24"`
- Ampliamente reconocidos por usuarios de apps de productividad
- Consistentes en grosor y estilo visual

---

## Arquitectura del Componente

```typescript
// src/components/atoms/dojo-icon/dojo-icon.ts
export class DojoIcon extends HTMLElement {
  static readonly TAG = 'dojo-icon';
  static get observedAttributes() { return ['name', 'size', 'color']; }

  // Renderiza <svg> inline desde el sprite o desde paths embebidos
  // Soporta: name (string), size (number, default 16), color (CSS color)
  // Expone: aria-hidden por defecto, aria-label opcional
}
```

### Uso en otros componentes

```html
<!-- Antes (emoji) -->
<span aria-hidden="true">⬆️</span> Alta

<!-- Después (SVG) -->
<dojo-icon name="priority-high" size="14" aria-hidden="true"></dojo-icon> Alta
```

---

## Criterios de Aceptación

- [ ] Existe el átomo `<dojo-icon>` con atributos `name`, `size` y `color`.
- [ ] El set de iconos mínimo (tabla anterior) está disponible.
- [ ] Los iconos SVG se renderizan de forma idéntica en Chrome, Firefox y Safari.
- [ ] El color del icono responde a `currentColor` y puede sobreescribirse con el atributo `color`.
- [ ] Todos los iconos usados como acciones tienen `aria-hidden="true"` y el texto adyacente visible o `aria-label` en el botón padre.
- [ ] Se eliminan los emojis funcionales de `dojo-task-card`, `dojo-kanban-column`, `dojo-task-dialog` y `dojo-template-manager`.
- [ ] El tamaño de los SVG exportados no supera 4KB por icono.
- [ ] La performance de render no se degrada (medir con Lighthouse antes/después).

---

## Impacto Estimado

| Aspecto | Impacto |
|---|---|
| Consistencia visual | ⬆️ Alto — mismo look en todos los SO/navegadores |
| Profesionalismo | ⬆️ Alto — estética de app moderna |
| Accesibilidad | ⬆️ Medio — lectores de pantalla mejoran |
| Bundle size | ↔️ Neutro — SVG inline similar peso a emojis |
| Esfuerzo de implementación | Medio — 1-2 sprints para migración completa |
