# Plantillas de tareas

Las **plantillas** te permiten guardar una configuración predefinida de tarea (título, descripción, prioridad, etiquetas, asignados) para reutilizarla cuando crees tareas recurrentes como bug reports, features o revisiones.

## Gestionar plantillas

Ve a **Ajustes → Plantillas** para ver, crear, editar y eliminar tus plantillas.

## Crear una plantilla

1. Haz clic en **Nueva plantilla**.
2. Rellena los campos:
   - **Nombre** *(obligatorio)* — identificador de la plantilla, ej. `Bug Report`.
   - **Descripción** *(opcional)* — texto Markdown predefinido.
   - **Prioridad** *(opcional)* — valor por defecto al aplicar la plantilla.
   - **Etiquetas** *(opcional)* — etiquetas preseleccionadas.
   - **Asignados** *(opcional)* — personas asignadas por defecto.
3. Guarda. La plantilla se persiste en IndexedDB.

```
┌───────────────────────────────────────┐
│  Nueva plantilla                      │
│                                       │
│  Nombre:      Bug Report              │
│  Prioridad:   Alta                    │
│  Etiquetas:   [ bug ] [ backend ]     │
│  Descripción:                         │
│  ## Descripción del bug               │
│  ## Pasos para reproducir             │
│  ## Comportamiento esperado           │
│                                       │
│              [ Guardar ]              │
└───────────────────────────────────────┘
```

## Usar una plantilla al crear una tarea

1. Abre el diálogo de **Nueva tarea**.
2. Haz clic en **Usar plantilla** y selecciona una de la lista.
3. Los campos se rellenan automáticamente con los valores de la plantilla.
4. Ajusta lo que necesites y confirma.

## Editar y eliminar plantillas

Desde **Ajustes → Plantillas**, cada entrada tiene los botones **Editar** y **Eliminar**. La eliminación requiere confirmación y no afecta a las tareas ya creadas con esa plantilla.

## FAQ

**¿Las plantillas se aplican a todos los tableros?**  
Sí, las plantillas son globales a la aplicación.

**¿Puedo crear una plantilla desde una tarea existente?**  
Aún no. Por ahora las plantillas se crean desde cero en Ajustes. Crear plantillas desde tareas existentes está previsto en futuras versiones.

**¿Cuántas plantillas puedo crear?**  
No hay límite definido.
