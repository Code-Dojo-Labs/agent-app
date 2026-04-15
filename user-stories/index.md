# User Stories — Kanban To-Do App

> [← Volver al índice](../requirements/index.md)

> Versión: 2.0  
> Fecha: 2026-03-26  
> Estado: Borrador

---

## Índice de historias de usuario

### MVP

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

### Mejoras (post-MVP)

| ID | Título | Área | Prioridad | Referencia |
|---|---|---|---|---|
| [US-17](./US-17-due-dates.md) | Fechas de vencimiento y alertas | Gestión de tareas | Alta | MS-01 |
| [US-18](./US-18-dark-mode.md) | Modo oscuro automático | UI/UX | Alta | MS-02 |
| [US-19](./US-19-export-import.md) | Exportación e importación de datos | Persistencia | Media | MS-03 |
| [US-20](./US-20-activity-history.md) | Historial de actividad por tarea | Gestión de tareas | Baja | MS-04 |
| [US-21](./US-21-subtasks.md) | Subtareas (checklist) | Gestión de tareas | Media | MS-05 |
| [US-22](./US-22-multiple-boards.md) | Múltiples tableros | Tablero | Baja | MS-06 |
| [US-23](./US-23-labels-on-creation.md) | Etiquetas durante la creación de tareas | Gestión de tareas | Media | MS-07 |
| [US-24](./US-24-default-labels.md) | Etiquetas por defecto genéricas | Gestión de etiquetas | Media | MS-08 |
| [US-25](./US-25-markdown-preview-default.md) | Vista previa Markdown por defecto | Gestión de tareas | Media | MS-09 |
| [US-26](./US-26-project-grouping.md) | Agrupación de tareas por proyectos | Gestión de tareas | Baja | MS-10 |
| [US-27](./US-27-user-wiki.md) | Wiki / Guía de usuario | Documentación | Baja | MS-11 |
| [US-28](./US-28-global-search-shortcuts.md) | Búsqueda global con atajos de teclado | UI/UX | Baja | MS-07 |
| [US-29](./US-29-assignees.md) | Asignación de personas | Gestión de tareas | Opcional | MS-08 |
| [US-30](./US-30-broadcast-sync.md) | Sincronización entre pestañas | Persistencia | Opcional | MS-09 |
| [US-31](./US-31-pwa.md) | Soporte PWA | Infraestructura | Media | MS-10 |
| [US-32](./US-32-wip-limits.md) | Límites WIP por columna | Tablero Kanban | Media | IMP-01 |
| [US-33](./US-33-list-view.md) | Vista alternativa de lista / tabla | UI/UX | Media | IMP-02 |
| [US-34](./US-34-notifications.md) | Notificaciones para fechas de vencimiento | PWA | Media | IMP-03 |
| [US-35](./US-35-larger-edit-dialog.md) | Área de edición de tickets al 90% del viewport | UI/UX | Alta | IMP-04 |
| [US-36](./US-36-task-templates.md) | Templates para la creación de tickets | Gestión de tareas | Media | IMP-05 |
| [US-37](./US-37-default-columns.md) | Columnas por defecto estandarizadas | Tablero Kanban | Alta | IMP-06 |

---

## Convenciones

- **Formato de historia**: `Como [rol] / quiero [acción] / para [beneficio]`
- **Criterios de aceptación**: Escritos en Gherkin con la sintaxis `Dado / Cuando / Entonces` (`Given / When / Then`)
- **Numeración**: `US-XX` donde `XX` es un número de dos dígitos con cero a la izquierda
- **US-00** está reservada para la historia de setup de infraestructura/stack tecnológico
