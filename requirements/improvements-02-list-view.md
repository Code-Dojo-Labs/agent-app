# Mejora 02: Vista alternativa de lista / tabla

> Estado: Propuesto  
> Fecha: 2026-04-14  
> Área: UI/UX — Tablero

---

## Problema

El tablero Kanban es ideal para visualizar el flujo de trabajo, pero resulta ineficiente cuando se necesita revisar muchas tareas simultáneamente, comparar prioridades globales o consultar fechas de vencimiento. No existe ninguna vista alternativa que facilite estas operaciones.

---

## Propuesta de Solución

Añadir una vista alternativa de **Lista/Tabla** que muestre todas las tareas del tablero como filas ordenables, complementando la vista Kanban existente.

### Comportamiento esperado

- Añadir un toggle en el header principal para alternar entre **Vista Tablero** (Kanban) y **Vista Lista** (tabla).
- La vista lista muestra todas las tareas como filas con las siguientes columnas visibles:

| Columna | Notas |
|---|---|
| Título | Clickable para abrir el panel de edición |
| Estado | Select inline para mover la tarea entre columnas |
| Prioridad | Badge de color con select inline |
| Etiquetas | Chips de colores |
| Asignado a | Avatar(s) |
| Vencimiento | Fecha relativa con color de alerta |
| Acciones | Icono de eliminar |

- Las columnas de la tabla son **ordenables** (clic en la cabecera).
- La vista respeta todos los filtros activos (búsqueda, prioridad, etiquetas).
- La preferencia seleccionada (tablero/lista) se persiste en `localStorage`.

### Impacto en el modelo de datos

Ninguno. Se trata de una nueva representación visual de los datos existentes.

---

## Criterios de Aceptación

- [ ] El toggle Tablero/Lista es visible en el header en todo momento.
- [ ] Todas las tareas de todos los estados aparecen en la vista lista.
- [ ] Las acciones de editar, cambiar estado, cambiar prioridad y eliminar son operativas desde la vista lista.
- [ ] El ordenamiento por columna es funcional (ascendente/descendente).
- [ ] Los filtros activos en la barra de búsqueda aplican en ambas vistas.
- [ ] La vista es responsiva; en móvil se colapsan las columnas menos importantes.
- [ ] La preferencia de vista persiste al recargar la página.
