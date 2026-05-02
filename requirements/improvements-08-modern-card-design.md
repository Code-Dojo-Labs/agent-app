# IMP-08 — Diseño Moderno de Tarjetas de Tarea

> **Área:** UI / UX  
> **Prioridad:** Alta  
> **Estado:** Propuesta  
> **Fecha:** 2026-05-01

---

## Problema que resuelve

Las tarjetas de tarea actuales (`dojo-task-card`) tienen un diseño funcional pero visualmente plano y anticuado:

- Borde sólido de 1px en color único sin distinción visual de prioridad a nivel de tarjeta.
- No hay jerarquía visual clara entre título, metadatos y etiquetas.
- El efecto hover es mínimo (solo sombra básica).
- Las etiquetas de prioridad son texto pequeño con un emoji, no un indicador visual prominente.
- No se aprovecha el espacio en la tarjeta para comunicar la urgencia o estado de completitud de la tarea.
- La densidad informativa es alta pero sin un orden visual atractivo.

Apps de referencia como **Linear**, **GitHub Projects** y **Height** usan tarjetas con mayor jerarquía visual, colores funcionales y transiciones cuidadas.

---

## Propuesta de Solución

Rediseñar `dojo-task-card` con los siguientes cambios:

### 1. Borde de acento por prioridad (Priority Accent Bar)

Añadir una barra vertical de 3px en el lado izquierdo de la tarjeta con el color de la prioridad:

```
┌─┬──────────────────────────────────┐
│ │ [etiqueta1] [etiqueta2]          │  ← chips de etiquetas
│ │                                  │
│█│ Título de la tarea               │  ← barra color prioridad
│ │                                  │
│ │  ● Alta     📅 25 mar  👤 2      │  ← metadatos en fila
└─┴──────────────────────────────────┘
```

El color de la barra sigue la misma paleta actual:
- Baja: `#3B82F6` (azul)
- Media: `#F59E0B` (ámbar)
- Alta: `#F97316` (naranja)
- Urgente: `#DC2626` (rojo)

### 2. Hover y focus más elaborados

- Elevación suave con `transform: translateY(-2px)` en hover.
- Sombra más profunda en hover (`box-shadow` multicapa).
- Borde de focus visible con `outline` en color primario (ya presente pero mejorar radio).
- Transición `transition: transform 0.15s ease, box-shadow 0.15s ease`.

### 3. Layout interno mejorado (3 zonas)

```
┌──────────────────────────────────────┐
│ ZONA 1: Etiquetas (chips compactos)   │
│ [bug] [feature] [+1]                  │
├──────────────────────────────────────┤
│ ZONA 2: Título                        │
│ Título de la tarea con máx 2 líneas   │
├──────────────────────────────────────┤
│ ZONA 3: Metadatos en fila             │
│ [prioridad] · [fecha] · [asignados]  │
│ [progreso subtareas ████░░ 3/5]       │
└──────────────────────────────────────┘
```

Separadores implícitos con `gap` y `padding`, sin líneas físicas.

### 4. Chips de etiquetas compactos con overflow

Cuando hay más de 2 etiquetas, mostrar las primeras 2 y un chip `+N` con el conteo:

```
[bug] [feature] [+3]  → al hacer hover expande o abre tooltip
```

### 5. Barra de progreso de subtareas visual

Reemplazar el texto `3/5` por una barra de progreso delgada:

```
░░████████░░  3 / 5 subtareas
```

Con color verde cuando está al 100%, ámbar al 50-99%, gris en 0%.

### 6. Badge de número de tarea

El `taskNumber` (ej. `GEN-042`) como badge discreto en la esquina superior derecha, con tipografía monoespaciada y color secundario.

---

## Especificación Visual

### CSS Custom Properties nuevas propuestas

```css
--dojo-card-accent-width: 3px;
--dojo-card-hover-lift: -2px;
--dojo-card-radius: 8px;
--dojo-card-progress-height: 4px;
```

### Estados de la tarjeta

| Estado | Visual |
|---|---|
| Default | Sombra suave, borde barra prioridad |
| Hover | Elevación +2px, sombra más profunda |
| Dragging | Opacidad 0.6, sombra grande, rotación leve 2deg |
| Focus visible | Outline 2px color primario |
| Overdue (vencida) | Borde rojo pulsante, fecha en rojo |

---

## Criterios de Aceptación

- [ ] La tarjeta muestra una barra vertical de acento izquierdo con el color de prioridad.
- [ ] El hover anima la tarjeta con `translateY(-2px)` y sombra aumentada.
- [ ] Las etiquetas con overflow muestran un chip `+N` adicionales.
- [ ] La barra de progreso de subtareas reemplaza al texto numérico simple.
- [ ] El `taskNumber` se muestra como badge en esquina superior derecha.
- [ ] El estado "dragging" tiene opacidad 0.6 y rotación leve.
- [ ] Todas las animaciones respetan `prefers-reduced-motion`.
- [ ] El contraste de todos los textos cumple WCAG AA (4.5:1).
- [ ] El rediseño es compatible con modo oscuro.

---

## Impacto Estimado

| Aspecto | Impacto |
|---|---|
| Atractivo visual | ⬆️ Alto — tarjetas más expresivas e informativas |
| Legibilidad | ⬆️ Alto — jerarquía visual clara |
| UX de prioridad | ⬆️ Medio — barra de acento visible sin abrir la tarea |
| Accesibilidad | ↔️ Neutro — ya cumple; mejora motion |
| Esfuerzo de implementación | Bajo — solo CSS + pequeños cambios en render |
