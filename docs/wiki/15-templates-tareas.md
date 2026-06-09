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
   - **Subtareas** *(opcional)* — lista de subtareas predefinidas que se insertarán automáticamente en cada tarea creada con la plantilla.
3. Guarda. La plantilla se persiste en IndexedDB y se sincroniza a la nube si tienes el [modo nube](./17-sincronizacion-nube.md) activo.

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

## Exportar e importar plantillas

Las plantillas se incluyen automáticamente en el archivo JSON al usar **📤 Exportar**. Al importar un archivo que contiene plantillas, se restauran junto con el resto de datos.

## FAQ

**¿Las plantillas se aplican a todos los tableros?**  
Sí, las plantillas son globales a la aplicación.

**¿Puedo crear una plantilla desde una tarea existente?**  
Aún no. Por ahora las plantillas se crean desde cero en Ajustes. Crear plantillas desde tareas existentes está previsto en futuras versiones.

**¿Cuántas plantillas puedo crear?**  
No hay límite definido.

**¿Las plantillas se sincronizan entre dispositivos?**  
Sí, si tienes el [modo nube](./17-sincronizacion-nube.md) activo, las plantillas se sincronizan a Supabase al crearlas, editarlas o eliminarlas.
