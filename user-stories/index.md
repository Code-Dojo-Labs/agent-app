# User Stories — Kanban To-Do App

> Versión: 1.0  
> Fecha: 2026-03-25  
> Estado: Borrador

---

## Índice de historias de usuario

| ID | Título | Área | Prioridad | Referencia |
|---|---|---|---|---|
| [US-00](./US-00-tech-stack.md) | Stack tecnológico | Infraestructura | Alta | tech-stack.md |
| [US-01](./US-01-kanban-board-view.md) | Visualización del tablero Kanban | Tablero | Alta | RF-01.1 |
| [US-02](./US-02-column-management.md) | Gestión de columnas | Tablero | Alta | RF-01.2 |
| [US-03](./US-03-drag-and-drop.md) | Drag & Drop de tareas | Tablero | Alta | RF-01.3 |
| [US-04](./US-04-create-task.md) | Crear tarea | Gestión de tareas | Alta | RF-02.1 |
| [US-05](./US-05-edit-task.md) | Editar tarea | Gestión de tareas | Alta | RF-02.2 |
| [US-06](./US-06-delete-task.md) | Eliminar tarea | Gestión de tareas | Alta | RF-02.3 |
| [US-07](./US-07-markdown-description.md) | Descripción en Markdown con seguridad XSS | Gestión de tareas | Alta | RF-02.5 |
| [US-08](./US-08-task-priority.md) | Prioridad de tarea | Gestión de tareas | Media | RF-02.7 |
| [US-09](./US-09-create-label.md) | Crear etiqueta | Gestión de etiquetas | Alta | RF-03.1 |
| [US-10](./US-10-label-reuse.md) | Reutilización de etiquetas | Gestión de etiquetas | Media | RF-03.2 |
| [US-11](./US-11-edit-label.md) | Editar etiqueta | Gestión de etiquetas | Media | RF-03.3 |
| [US-12](./US-12-delete-label.md) | Eliminar etiqueta | Gestión de etiquetas | Media | RF-03.4 |
| [US-13](./US-13-label-colors.md) | Colores de etiquetas con validación de contraste | Gestión de etiquetas | Media | RF-03.5 |
| [US-14](./US-14-data-persistence.md) | Persistencia de datos con IndexedDB | Persistencia | Alta | RF-04 |
| [US-15](./US-15-search-and-filter.md) | Búsqueda y filtrado de tareas | UI/UX | Media | ui-ux.md |
| [US-16](./US-16-task-card.md) | Tarjeta de tarea en el tablero | UI/UX | Alta | ui-ux.md |

---

## Convenciones

- **Formato de historia**: `Como [rol] / quiero [acción] / para [beneficio]`
- **Criterios de aceptación**: Escritos en Gherkin con la sintaxis `Dado / Cuando / Entonces` (`Given / When / Then`)
- **Numeración**: `US-XX` donde `XX` es un número de dos dígitos con cero a la izquierda
- **US-00** está reservada para la historia de setup de infraestructura/stack tecnológico
