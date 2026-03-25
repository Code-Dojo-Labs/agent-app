# Especificaciones UI/UX

> [← Volver al índice](./index.md)

---

## Principios de diseño

1. **Claridad**: La información más importante (título, estado, prioridad) debe ser visible en la tarjeta sin necesidad de abrir el detalle.
2. **Eficiencia**: Las acciones más comunes (crear tarea, mover, filtrar) deben requerir el menor número de clics posible.
3. **Consistencia**: Colores, íconos y tipografía deben seguir un sistema unificado.
4. **Accesibilidad**: Contraste mínimo WCAG AA (4.5:1) en todos los textos. Soporte de navegación por teclado.
5. **Retroalimentación**: Toda acción destructiva o irreversible debe solicitar confirmación.

---

## Layout general

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER (barra superior)                                            │
│  [Logo] [Título del tablero]          [Filtros] [+ Nueva etiqueta]  │
├─────────────────────────────────────────────────────────────────────┤
│  TOOLBAR DE FILTROS (colapsable)                                    │
│  [Buscar...] [Prioridad ▾] [Etiquetas ▾]        [Limpiar filtros]  │
├─────────┬─────────┬─────────┬─────────┬─────────┬─────────────────┤
│ Backlog │Por hacer│En progre│En revis.│  Hecho  │   Bloqueado     │
│   (3)   │   (5)   │   (2)   │   (1)   │   (8)   │      (1)        │
│─────────│─────────│─────────│─────────│─────────│─────────────────│
│ [Tarjet]│ [Tarjet]│ [Tarjet]│ [Tarjet]│ [Tarjet]│    [Tarjet]     │
│ [Tarjet]│ [Tarjet]│         │         │ [Tarjet]│                 │
│ [Tarjet]│ [Tarjet]│         │         │   ...   │                 │
│         │ [Tarjet]│         │         │         │                 │
│         │ [Tarjet]│         │         │         │                 │
│         │─────────│         │         │         │                 │
│         │[+Agregar│         │         │[+Agregar│[+Agregar tarea] │
│[+Agrega]│  tarea] │[+Agrega]│[+Agrega]│  tarea] │                 │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────────────┘
```

---

## Componentes

### 1. Header

- **Logo / Nombre de la app**: A la izquierda.
- **Título del tablero**: Editable con doble clic.
- **Botón "Gestionar etiquetas"**: Abre el panel de administración de etiquetas.
- El header permanece fijo al hacer scroll horizontal.

---

### 2. Toolbar de filtros

- Colapsable/expandible mediante un botón de filtro (ícono de embudo).
- Componentes:
  - **Búsqueda de texto**: Input con ícono de lupa. Busca en título y descripción en tiempo real (debounce 300ms).
  - **Selector de prioridad**: Dropdown multi-selección con íconos de prioridad.
  - **Selector de etiquetas**: Dropdown multi-selección con chips de colores.
  - **Botón "Limpiar filtros"**: Solo visible cuando hay filtros activos.
- Cuando los filtros están activos, el número de tareas visibles vs. totales se muestra en la cabecera de cada columna.

---

### 3. Columna (Column)

```
┌───────────────────────┐
│ 🔄 En progreso  (2) ⋮ │  ← Cabecera con ícono, nombre, conteo y menú
├───────────────────────┤
│  [ Tarjeta de tarea ] │
│  [ Tarjeta de tarea ] │
│                       │
│  + Agregar tarea      │  ← Botón al fondo de la columna
└───────────────────────┘
```

- **Cabecera**: Fija en la parte superior de la columna. Incluye ícono, nombre, conteo y menú contextual (⋮) con opciones: Renombrar, Cambiar ícono, Eliminar.
- **Área de tarjetas**: Scrollable verticalmente.
- **Botón "+ Agregar tarea"**: Al final de la columna. Al hacer clic, abre un mini-formulario inline o el modal de creación.
- Las columnas tienen un ancho fijo (ej. 280px) y el tablero hace scroll horizontal.

---

### 4. Tarjeta de tarea (Task Card)

```
┌───────────────────────────────┐
│ 🏷️ [etiqueta1] [etiqueta2]    │
│                               │
│ Título de la tarea            │
│                               │
│  ⬆️ Alta   📅 25 mar 2026      │
└───────────────────────────────┘
```

#### Elementos visibles en la tarjeta:
| Elemento | Posición | Notas |
|---|---|---|
| Etiquetas | Superior | Chips con nombre y color de fondo; texto blanco |
| Título | Centro | Máx. 2 líneas visibles, ellipsis si excede |
| Ícono de prioridad + texto | Inferior izquierda | Ícono + texto corto (ej. ⬆️ Alta) |
| Fecha de creación | Inferior derecha | Formato corto (25 mar 2026) |

#### Interacciones de la tarjeta:
- **Clic**: Abre el panel de detalle.
- **Hover**: Muestra acciones rápidas (botón de eliminar, ícono de arrastre).
- **Arrastre**: Cursor cambia a `grab`; la tarjeta sigue al puntero y una zona de "drop" se resalta en la columna destino.

---

### 5. Panel de detalle de tarea (Modal / Sidebar)

Se recomienda un **panel lateral deslizable** (sidebar a la derecha) sobre un modal, para mantener visible el tablero mientras se edita.

```
┌─────────────────────────────────────┐
│ ✕  Detalle de tarea                 │
├─────────────────────────────────────┤
│ Título                              │
│ ┌─────────────────────────────────┐ │
│ │ Implementar login con OAuth     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Descripción            [Editar|Ver] │
│ ┌─────────────────────────────────┐ │
│ │ Texto en Markdown / Preview     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Estado          Prioridad           │
│ [🔄 En progreso▾] [⬆️ Alta ▾]       │
│                                     │
│ Etiquetas                           │
│ [🏷️ frontend] [🏷️ bug] [+ Añadir]  │
│                                     │
│ Creado el: 25 mar 2026, 10:43       │
│ Actualizado: hace 5 minutos         │
├─────────────────────────────────────┤
│              [Eliminar tarea]       │
└─────────────────────────────────────┘
```

- Los cambios en **título, descripción, estado y prioridad** se guardan automáticamente al salir del campo (blur) o mediante un botón explícito.
- El campo de **descripción** alterna entre modo edición (textarea con Markdown) y modo previsualización renderizada.
- El campo de **etiquetas** usa un autocomplete que filtra las etiquetas existentes y permite crear nuevas.

---

### 6. Selector de etiquetas (Label Picker)

```
┌─────────────────────────────┐
│ 🔍 Buscar etiqueta...       │
│─────────────────────────────│
│ ✓ [● frontend]              │
│   [● backend]               │
│   [● bug]                   │
│─────────────────────────────│
│ + Crear "nueva etiqueta"    │
└─────────────────────────────┘
```

- Muestra todas las etiquetas existentes con su color.
- Las etiquetas ya asignadas a la tarea aparecen marcadas (✓).
- Si el texto escrito no coincide con ninguna etiqueta, aparece la opción de crear una nueva.
- Al crear una nueva, se abre un mini-formulario inline para elegir nombre y color.

---

### 7. Panel de administración de etiquetas

- Accesible desde el Header.
- Lista todas las etiquetas con su nombre y color.
- Permite editar nombre/color o eliminar cada etiqueta.
- Muestra cuántas tareas tienen asignada cada etiqueta.

---

### 8. Selector de color de etiqueta

```
Elige un color:
[●] [●] [●] [●] [●]   ← Fila 1 de paleta (5 colores)
[●] [●] [●] [●] [●]   ← Fila 2 de paleta (5 colores)

─── O elige un color personalizado: ────
[######## input color picker ########]
⚠ El color seleccionado tiene bajo contraste con texto blanco.
  Se recomienda usar: #8B2020
```

- La paleta predefinida muestra los 10 colores como swatches clicables.
- El color personalizado usa `<input type="color">`.
- Si el color no pasa la validación de contraste, se muestra un aviso con una sugerencia.

---

## Guía de estilos

### Tipografía
- Usar una fuente del sistema o familia **sans-serif** (ej. Inter, System UI).
- **Títulos de columna**: 14px, semibold.
- **Título de tarea en tarjeta**: 14px, medium.
- **Metadatos (prioridad, fecha)**: 12px, regular, color secundario.

### Colores del sistema (modo claro)

| Token | Valor sugerido | Uso |
|---|---|---|
| `surface` | `#F7F8FA` | Fondo general de la app |
| `column-bg` | `#EBECF0` | Fondo de cada columna |
| `card-bg` | `#FFFFFF` | Fondo de las tarjetas |
| `border` | `#DFE1E6` | Bordes de tarjetas y columnas |
| `text-primary` | `#172B4D` | Títulos y texto principal |
| `text-secondary` | `#5E6C84` | Metadatos, etiquetas de campo |
| `accent` | `#0052CC` | Botones de acción principal |
| `danger` | `#DE350B` | Acciones destructivas |

### Colores del sistema (modo oscuro)

| Token | Valor sugerido | Uso |
|---|---|---|
| `surface` | `#1D2125` | Fondo general |
| `column-bg` | `#282E33` | Fondo de columnas |
| `card-bg` | `#22272B` | Fondo de tarjetas |
| `border` | `#3D4348` | Bordes |
| `text-primary` | `#C7D1DB` | Texto principal |
| `text-secondary` | `#8C9BAB` | Texto secundario |
| `accent` | `#579DFF` | Botones de acción principal |
| `danger` | `#FF5630` | Acciones destructivas |

---

## Animaciones y transiciones

| Elemento | Animación recomendada |
|---|---|
| Apertura del sidebar de detalle | Slide-in desde la derecha, 200ms ease-out |
| Cierre del sidebar | Slide-out, 150ms ease-in |
| Drag & drop | La tarjeta arrastrada tiene leve sombra y escala 1.03 |
| Zona de drop activa | Borde punteado con color de acento |
| Tarjeta creada / movida | Highlight breve (flash de fondo) por 500ms |
| Filtros aplicados | Tarjetas no coincidentes se atenúan (opacity 0.3) |

---

## Accesibilidad

- Todos los botones e íconos interactivos deben tener atributo `aria-label`.
- Las tarjetas deben ser enfocables con teclado y navegables con `Tab`.
- El drag & drop debe tener un mecanismo alternativo de teclado (ej. menú contextual "Mover a...").
- Los mensajes de confirmación deben ser manejados con `role="dialog"` y foco atrapado.
- Los chips de etiquetas deben tener contraste de texto verificado (ver [Requerimientos Funcionales](./functional-requirements.md#rf-035--colores-de-etiquetas)).
