# IMP-12 — Design System Avanzado: CSS Custom Properties, Theming y Tokens de Diseño

> Versión: 1.0
> Fecha: 2026-05-12
> Estado: Propuesta

---

## Problema que Resuelve

La aplicación cuenta con dark mode (US-18) y mejoras de tarjetas (IMP-08), iconos (IMP-07) y animaciones (IMP-10), pero estas mejoras son **incrementales y dispersas**. No existe una capa de diseño coherente que:

- Permita cambiar el tema de forma global con mínimo esfuerzo.
- Garantice consistencia visual entre todos los componentes.
- Facilite la creación de temas personalizados por el usuario.
- Escale sin duplicar valores de color, espaciado o tipografía en múltiples archivos CSS.

---

## Propuesta de Solución

Implementar un **Design Token System** basado en CSS Custom Properties organizadas en capas, con soporte para múltiples temas (claro, oscuro, alto contraste, y personalizados).

### Arquitectura del Sistema de Tokens

```
Tokens de Nivel 1 — Primitivos (valores absolutos)
  ↓
Tokens de Nivel 2 — Semánticos (rol/intención)
  ↓
Tokens de Nivel 3 — Componente (uso específico)
```

#### Nivel 1: Tokens Primitivos

```css
/* src/styles/tokens/primitives.css */
:root {
  /* Escala de colores completa */
  --color-blue-50: #eff6ff;
  --color-blue-500: #3b82f6;
  --color-blue-900: #1e3a5f;

  /* Escala tipográfica modular (ratio 1.25) */
  --font-size-xs: 0.64rem;
  --font-size-sm: 0.8rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.563rem;

  /* Espaciado (escala de 4px) */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-4: 1rem;      /* 16px */
  --space-8: 2rem;      /* 32px */

  /* Radios de borde */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Sombras */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

#### Nivel 2: Tokens Semánticos (por tema)

```css
/* src/styles/tokens/theme-light.css */
[data-theme="light"] {
  --color-bg-primary: var(--color-gray-50);
  --color-bg-surface: #ffffff;
  --color-bg-elevated: var(--color-gray-100);
  --color-text-primary: var(--color-gray-900);
  --color-text-secondary: var(--color-gray-600);
  --color-text-disabled: var(--color-gray-400);
  --color-border: var(--color-gray-200);
  --color-accent: var(--color-blue-500);
  --color-accent-hover: var(--color-blue-600);
  --color-danger: var(--color-red-500);
  --color-success: var(--color-green-500);
  --color-warning: var(--color-amber-500);
}

/* src/styles/tokens/theme-dark.css */
[data-theme="dark"] {
  --color-bg-primary: var(--color-gray-950);
  --color-bg-surface: var(--color-gray-900);
  --color-bg-elevated: var(--color-gray-800);
  --color-text-primary: var(--color-gray-50);
  /* ... */
}
```

#### Nivel 3: Tokens de Componente

```css
/* Cada componente usa tokens semánticos, nunca primitivos */
dojo-task-card {
  --card-bg: var(--color-bg-surface);
  --card-border: var(--color-border);
  --card-radius: var(--radius-md);
  --card-shadow: var(--shadow-sm);
  --card-shadow-hover: var(--shadow-md);
}
```

### Temas Disponibles

| Tema | `data-theme` | Descripción |
|---|---|---|
| Claro | `light` | Tema por defecto, fondo blanco |
| Oscuro | `dark` | Fondo oscuro, ya existente (US-18) |
| Alto contraste | `high-contrast` | Para accesibilidad WCAG AAA |
| Personalizado | `custom` | El usuario define accent color y el sistema deriva el resto |

### Selector de Tema en la UI

- Panel de ajustes accesible desde la barra de navegación (icono de paleta).
- Selector visual con 4 opciones + color picker para modo custom.
- La preferencia se persiste en `localStorage` y se respeta al recargar.
- Si no hay preferencia guardada, se detecta `prefers-color-scheme`.

### Generación Dinámica de Temas

Para el modo **custom**, implementar una utilidad que genere una escala de colores a partir de un color base usando la librería **oklch**:

```typescript
// src/utils/theme-generator.ts
function generateThemeFromAccent(hexColor: string): Record<string, string> {
  // Convierte el color a oklch, genera escala de 9 pasos
  // Asegura contraste mínimo WCAG AA para texto
  // Devuelve un mapa de CSS custom properties
}
```

### Tipografía

- Migrar a la fuente del sistema (`system-ui, -apple-system, sans-serif`) con fallbacks para consistencia cross-platform.
- Opcionalmente: cargar **Inter** via `@fontsource` (sin dependencia de Google Fonts).
- Escala tipográfica usando `clamp()` para responsividad fluida.

---

## Criterios de Aceptación

- [ ] Todos los componentes usan exclusivamente tokens semánticos (no valores hardcodeados de color ni tamaño).
- [ ] Cambiar `data-theme` en el elemento `<html>` cambia visualmente toda la app sin recargar.
- [ ] Existen al menos 3 temas funcionales: light, dark y high-contrast.
- [ ] El usuario puede seleccionar un color de acento personalizado y la UI se adapta automáticamente manteniendo contraste WCAG AA.
- [ ] La preferencia de tema persiste entre sesiones.
- [ ] No hay regresiones visuales respecto al diseño actual (test visual snapshot).
- [ ] La migración de estilos existentes está documentada en una guía de migración.

---

## Archivos Afectados

| Ruta | Acción |
|---|---|
| `src/styles/tokens/` | Crear directorio con archivos de tokens por capa |
| `src/styles/global.css` | Refactorizar para usar tokens |
| `src/components/**/*.css` | Migrar a tokens de componente |
| `src/utils/theme-generator.ts` | Nueva utilidad para temas custom |
| `src/components/atoms/dojo-theme-picker/` | Nuevo componente selector de tema |

---

## Beneficios Adicionales

- **Accesibilidad:** El tema de alto contraste y la validación de contraste automática mejoran la accesibilidad sin esfuerzo extra.
- **Mantenibilidad:** Cambiar el color principal de la app requiere modificar 1 token, no 50 selectores CSS.
- **Escalabilidad:** Facilita añadir temas de marca (por ejemplo, si la app se usa en un contexto corporativo).
- **Developer Experience:** Los nuevos componentes usan tokens desde el primer día; no hay que memorizar valores hexadecimales.
