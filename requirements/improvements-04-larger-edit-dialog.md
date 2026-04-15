# Mejora 04: Área de edición de tickets más grande (90% del viewport)

> Estado: Propuesto  
> Fecha: 2026-04-14  
> Área: UI/UX — Edición de tareas

---

## Problema

El panel de edición de tareas (`dojo-task-detail`) es actualmente un sidebar lateral con un ancho fijo de `400px`. Esta dimensión resulta insuficiente para trabajar cómodamente con descripciones extensas en Markdown, subtareas, historial de actividad o múltiples asignados, especialmente en pantallas de escritorio donde hay espacio disponible.

---

## Propuesta de Solución

Transformar el panel lateral en un **modal centrado** que ocupe el **90% del ancho y alto del viewport**, ofreciendo un espacio de trabajo amplio y cómodo indistintamente del tamaño del contenido.

### Comportamiento esperado

**Layout del modal:**
- Posición: centrado en pantalla (`position: fixed`, `top: 50%`, `left: 50%`, `transform: translate(-50%, -50%)`).
- Dimensiones: `width: 90vw`, `height: 90vh`.
- `max-width` y `max-height` al 100% del viewport para garantizar que nunca sobrepase la pantalla.
- El contenido interno hace scroll de forma independiente (columna derecha e izquierda si se optar por layout de dos columnas).

**Animación de entrada:**
- Reemplazar el slide desde la derecha por una animación de **fade + scale**: aparece desde `scale(0.96), opacity: 0` hasta `scale(1), opacity: 1` con una transición de `0.22s ease`.

**Layout interno (dos columnas en escritorio):**

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER: [Título editable]                      [Cerrar ✕]  │
├─────────────────────────────────┬────────────────────────────┤
│  COLUMNA PRINCIPAL (flex: 2)    │  COLUMNA LATERAL (flex: 1) │
│  - Descripción (Markdown)       │  - Estado                  │
│  - Subtareas                    │  - Prioridad               │
│  - Historial de actividad       │  - Etiquetas               │
│                                 │  - Asignados               │
│                                 │  - Fecha de vencimiento    │
│                                 │  - Proyecto                │
├─────────────────────────────────┴────────────────────────────┤
│  FOOTER: [Eliminar tarea]                   [Metadatos]      │
└──────────────────────────────────────────────────────────────┘
```

**Responsivo (móvil):**
- En pantallas < 768px, el modal ocupa `100vw × 100vh` con estilo pantalla completa.
- Las dos columnas colapsan a una sola columna vertical.

### Impacto en el modelo de datos

Ninguno. Es un cambio exclusivo de presentación/estilos.

---

## Criterios de Aceptación

- [ ] El modal ocupa el 90% del ancho y alto del viewport en pantallas de escritorio.
- [ ] La animación de apertura es `fade + scale` (reemplaza el slide lateral).
- [ ] El contenido interno hace scroll sin que el resto del modal se mueva.
- [ ] En dispositivos móviles (< 768px), el modal ocupa el 100% de la pantalla.
- [ ] El backdrop sigue oscureciendo el fondo y al hacer clic en él se cierra el modal.
- [ ] El foco se gestiona correctamente al abrir/cerrar (trap focus, retorno al elemento disparador).
- [ ] Cumple WCAG AA: rol `dialog`, `aria-modal="true"`, `aria-labelledby` apuntando al título.
