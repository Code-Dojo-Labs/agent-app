# IMP-10 — Animaciones y Micro-interacciones Modernas

> **Área:** UI / Motion Design  
> **Prioridad:** Media  
> **Estado:** Propuesta  
> **Fecha:** 2026-05-01

---

## Problema que resuelve

La aplicación actualmente presenta transiciones mínimas o nulas en la mayoría de sus interacciones:

- Los modales aparecen instantáneamente sin animación de entrada (o con una animación básica `scale + fade`).
- Al crear una tarea, la tarjeta aparece en el tablero sin ninguna animación de inserción.
- Al eliminar una tarea, desaparece instantáneamente sin confirmación visual del éxito.
- El drag & drop no tiene indicadores visuales ricos (sombra de destino, "ghost" de la tarjeta).
- Los cambios de estado (columna, prioridad) no tienen transiciones.
- No existe feedback visual de éxito/error en las operaciones (toasts o snackbars).

Las micro-interacciones son uno de los factores que más influyen en la percepción de calidad y modernidad de una aplicación. Apps como **Linear** y **Notion** son apreciadas en parte por su fluidez visual.

---

## Propuesta de Solución

### 1. Sistema de Animaciones CSS centralizado

Definir un conjunto de animaciones reutilizables en un archivo de estilos compartido:

```css
/* src/styles/animations.css */

@keyframes slide-up-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes slide-down-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(8px); }
}

@keyframes pop-in {
  0%   { opacity: 0; transform: scale(0.85); }
  70%  { transform: scale(1.04); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-4px); }
  60%       { transform: translateX(4px); }
}

/* Respeto a prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 2. Animación de entrada de tarjetas nuevas

Cuando se crea una nueva tarea, la tarjeta entra con animación `pop-in` (150ms):

```
[tarjeta existente]       [tarjeta existente]
[tarjeta existente]  →    [tarjeta existente]
                          [✨ NUEVA tarjeta]  ← escala de 0.85→1 + fade
```

### 3. Animación de eliminación de tarjetas

Al confirmar la eliminación, la tarjeta colapsa verticalmente antes de desaparecer:

```css
.task-card.removing {
  animation: collapse-out 200ms ease forwards;
}

@keyframes collapse-out {
  from { opacity: 1; max-height: 200px; margin-bottom: 0.5rem; }
  to   { opacity: 0; max-height: 0;     margin-bottom: 0; }
}
```

### 4. Drag & Drop enriquecido

Mejoras al arrastrar tarjetas:

- **Ghost card**: La tarjeta original queda semitransparente (opacidad 0.4) mientras se arrastra.
- **Drop placeholder**: Un placeholder punteado del mismo tamaño de la tarjeta aparece en la posición de destino.
- **Animación de "aterrizaje"**: Al soltar, la tarjeta hace un pequeño `bounce` antes de posicionarse.

```
[ ghost 40% opacidad ]    |  columna destino  |
                          |  [tarjeta A]      |
                          |  - - - - - - - -  | ← placeholder
                          |  [tarjeta B]      |
```

### 5. Sistema de Toast Notifications

Nuevo átomo `<dojo-toast>` para feedback de operaciones:

| Operación | Toast |
|---|---|
| Tarea creada | ✅ "Tarea creada correctamente" (verde, 3s) |
| Tarea eliminada | 🗑️ "Tarea eliminada" + botón **Deshacer** (ámbar, 5s) |
| Template aplicado | 📋 "Template 'Bug Report' aplicado" (azul, 3s) |
| Error de IndexedDB | ❌ "No se pudo guardar. Intenta de nuevo." (rojo, 8s) |
| Importación exitosa | ✅ "X tareas importadas correctamente" (verde, 4s) |

El toast aparece desde abajo con `slide-up-in` y desaparece con `slide-down-out`. Se apila verticalmente si hay múltiples.

### 6. Animaciones en Modales y Paneles

| Componente | Animación entrada | Animación salida |
|---|---|---|
| `dojo-task-dialog` | `scale(0.96) + fadeIn` 180ms | `scale(0.98) + fadeOut` 120ms |
| `dojo-task-detail` | `translateX(100%) → 0` 220ms (slide desde derecha) | `translateX(100%)` 180ms |
| `dojo-label-manager` | `scale(0.96) + fadeIn` 180ms | Inmediato (ya implementado) |
| `dojo-template-manager` | `scale(0.96) + fadeIn` 180ms | Inmediato |
| Toast | `translateY(20px) + fadeIn` 200ms | `translateY(20px) + fadeOut` 150ms |

### 7. Indicadores de carga skeleton

Para el estado de carga del tablero, en lugar de un spinner de texto, mostrar tarjetas "skeleton" con animación de pulso:

```
┌───────────────────────┐
│ ░░░░░░░░░░            │  ← título skeleton (animación shimmer)
│                       │
│ ░░░░░  ░░░░░░░        │  ← metadatos skeleton
└───────────────────────┘
```

```css
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--dojo-border) 25%, var(--dojo-surface) 50%, var(--dojo-border) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## Criterios de Aceptación

- [ ] Las tarjetas nuevas entran con animación `pop-in` de 150ms.
- [ ] Al eliminar una tarjeta, colapsa verticalmente en 200ms antes de desaparecer del DOM.
- [ ] El drag & drop muestra un placeholder punteado en la posición de destino.
- [ ] La tarjeta en drag tiene opacidad 0.4 mientras está siendo arrastrada.
- [ ] Existe el componente `<dojo-toast>` con variantes `success`, `warning`, `error`, `info`.
- [ ] Las operaciones CRUD de tareas disparan toasts informativos.
- [ ] La eliminación de tareas dispara un toast con botón "Deshacer" activo 5 segundos.
- [ ] Los modales tienen animación de entrada y salida suave.
- [ ] El estado de carga del tablero muestra tarjetas skeleton con efecto shimmer.
- [ ] Todas las animaciones respetan `prefers-reduced-motion: reduce`.
- [ ] No hay saltos de layout (`layout shift`) durante las animaciones.
- [ ] El rendimiento de animaciones usa `transform` y `opacity` (GPU-accelerated), no `height` o `top`.

---

## Impacto Estimado

| Aspecto | Impacto |
|---|---|
| Percepción de calidad | ⬆️ Alto — sensación de app pulida y profesional |
| Feedback de operaciones | ⬆️ Alto — el usuario sabe cuándo algo funcionó |
| UX drag & drop | ⬆️ Medio — interacción más clara y menos errores |
| Accesibilidad motion | ↔️ Neutro — `prefers-reduced-motion` mitiga impacto |
| Performance | ↔️ Neutro — animaciones GPU-accelerated sin JS |
| Esfuerzo de implementación | Medio-Alto — requiere `<dojo-toast>` nuevo + CSS global |
