# Mejora 05: Templates para la creación de tickets

> Estado: Propuesto  
> Fecha: 2026-04-14  
> Área: Gestión de tareas

---

## Problema

Cada vez que se crea una tarea de tipo recurrente (bug report, feature request, reunión, etc.), el usuario debe rellenar manualmente los mismos campos repetidos: descripción estructurada, prioridad habitual, etiquetas estándar, etc. No existe ningún mecanismo para pre-poblados los campos con contenido predefinido.

---

## Propuesta de Solución

Implementar un sistema de **templates de tareas** que permita al usuario definir, guardar y reutilizar plantillas con valores preconfigurados para acelerar la creación de tareas repetitivas.

### Comportamiento esperado

**Gestión de templates:**
- Acceso desde el menú del tablero o desde el propio diálogo de creación de tareas.
- El usuario puede **crear, editar y eliminar** templates.
- Cada template puede definir los siguientes campos pre-poblados:
  - Nombre del template (obligatorio, ej. "Bug Report").
  - Descripción con estructura Markdown (ej. `## Pasos para reproducir\n## Comportamiento esperado\n## Comportamiento actual`).
  - Prioridad por defecto.
  - Etiquetas por defecto.
  - Asignados por defecto.

**Uso en la creación de tareas:**
- En el diálogo `dojo-task-dialog`, añadir un selector **"Usar template"** en la parte superior.
- Al seleccionar un template, los campos del formulario se auto-rellenan con los valores del template.
- El usuario puede modificar cualquier campo antes de confirmar la creación.
- Si no se selecciona ningún template, el formulario funciona como ahora (vacío).

### Impacto en el modelo de datos

Nuevo object store en IndexedDB:

```ts
interface TaskTemplate {
  id: string;           // UUID
  name: string;         // Nombre del template
  description?: string; // Markdown pre-definido
  priority?: Priority;  // Prioridad por defecto
  labelIds?: string[];  // Etiquetas por defecto (referencias)
  personIds?: string[]; // Asignados por defecto (referencias)
  createdAt: string;    // ISO 8601
}
```

**Object store:** `taskTemplates`, key path: `id`.

---

## Criterios de Aceptación

- [ ] El usuario puede crear un template con nombre, descripción Markdown, prioridad y etiquetas.
- [ ] Los templates se listan y son editables y eliminables desde la sección de gestión.
- [ ] En el diálogo de creación de tarea, el selector de templates se muestra solo si existen templates definidos.
- [ ] Al aplicar un template, todos los campos configurados en él se auto-rellenan en el formulario.
- [ ] La selección de un template no bloquea la edición manual posterior de ningún campo.
- [ ] Los templates se persisten en IndexedDB y sobreviven a recargas.
- [ ] La eliminación de un template no afecta a las tareas ya creadas con él.
