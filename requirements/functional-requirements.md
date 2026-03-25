# Requerimientos Funcionales

> [← Volver al índice](./index.md)

---

## RF-01: Tablero Kanban

### RF-01.1 — Visualización del tablero
- El sistema debe mostrar un tablero con columnas horizontales, donde cada columna representa un **estado** de las tareas.
- Cada columna debe mostrar su nombre, su ícono y el número de tareas que contiene.
- Las columnas deben permitir scroll vertical independiente cuando superen la altura visible.

### RF-01.2 — Gestión de columnas
- El sistema debe mostrar los 6 estados por defecto al inicializar la aplicación (si no existen datos previos).
- El usuario puede **crear** nuevas columnas (estados), indicando nombre e ícono.
- El usuario puede **renombrar** o **eliminar** columnas existentes.
  - Al eliminar una columna, el sistema debe preguntar al usuario qué hacer con las tareas que contiene: moverlas a otra columna o eliminarlas.
- El usuario puede **reordenar** las columnas mediante arrastre.

### RF-01.3 — Drag & drop de tareas
- El usuario puede arrastrar una tarea de una columna a otra para cambiar su estado.
- Al soltar la tarea, el campo `status` de la misma se actualiza en IndexedDB de forma inmediata.
- El reordenamiento vertical dentro de la misma columna también debe ser soportado.

---

## RF-02: Gestión de Tareas

### RF-02.1 — Crear tarea
- El usuario puede crear una tarea desde cualquier columna usando un botón **"+ Agregar tarea"**.
- La columna de origen establece el estado inicial de la tarea.
- Campos accesibles en la creación:
  - Título (obligatorio)
  - Descripción (opcional)
  - Prioridad (opcional, valor por defecto: Media)
  - Etiquetas (opcional)
- La `createdAt` se asigna automáticamente con la fecha/hora actual en formato ISO 8601.

### RF-02.2 — Editar tarea
- Al hacer clic sobre una tarjeta, se abre un panel de detalle (modal o sidebar) con todos los campos editables:
  - Título
  - Descripción (con soporte de Markdown)
  - Estado (puede cambiarse desde el detalle, mueve la tarea a la columna correspondiente)
  - Prioridad
  - Etiquetas
- Los cambios se guardan en tiempo real o mediante un botón explícito de guardado.

### RF-02.3 — Eliminar tarea
- El usuario puede eliminar una tarea desde su vista de detalle o mediante una acción contextual en la tarjeta.
- Se debe solicitar confirmación antes de eliminar.

### RF-02.4 — Campo: Título
- Texto libre, máximo 120 caracteres.
- No puede estar vacío al guardar.

### RF-02.5 — Campo: Descripción
- Texto enriquecido en formato **Markdown**.
- El sistema debe renderizar la descripción de forma segura (sanitización contra XSS).
- Debe ofrecer un modo de edición y un modo de previsualización.

### RF-02.6 — Campo: Estado
- El estado se refleja en la columna donde está ubicada la tarea en el tablero.
- En la vista de detalle, el estado puede cambiarse desde un selector desplegable.
- Cada estado tiene un nombre y un ícono asignado.

### RF-02.7 — Campo: Prioridad
- Valores posibles: `low`, `medium`, `high`, `urgent`.
- Cada valor tiene un ícono y una etiqueta de texto:

  | Valor | Etiqueta | Ícono |
  |---|---|---|
  | `low` | Baja | ⬇️ |
  | `medium` | Media | ➡️ |
  | `high` | Alta | ⬆️ |
  | `urgent` | Urgente | 🔥 |

- La prioridad se muestra visualmente en la tarjeta del tablero.

### RF-02.8 — Campo: Fecha de creación
- Generada automáticamente, no editable por el usuario.
- Debe mostrarse en formato local legible (ej. `25 mar 2026`) en la tarjeta y en el detalle.

### RF-02.9 — Campo: Etiquetas
- Una tarea puede tener **cero o más** etiquetas.
- Las etiquetas se seleccionan desde un componente de búsqueda y selección múltiple.
- Desde ese mismo componente se puede crear una nueva etiqueta si no existe.

---

## RF-03: Gestión de Etiquetas

### RF-03.1 — Creación de etiquetas
- El usuario puede crear una nueva etiqueta indicando:
  - Nombre (obligatorio, máximo 30 caracteres)
  - Color (obligatorio)
- Al escribir en el selector de etiquetas, el sistema debe **buscar en tiempo real** entre las etiquetas existentes.
- Si no existe ninguna coincidencia, se ofrece la opción de crear una nueva.

### RF-03.2 — Reutilización de etiquetas
- Una etiqueta creada es global y puede asignarse a **cualquier tarea**.
- Si el usuario intenta crear una etiqueta con el mismo nombre (insensible a mayúsculas/minúsculas) que una existente, el sistema debe **alertar y reutilizar** la etiqueta existente en lugar de crear un duplicado.

### RF-03.3 — Edición de etiquetas
- El usuario puede editar el nombre o el color de una etiqueta existente desde un panel de administración de etiquetas.
- El cambio se refleja automáticamente en todas las tareas que la usan.

### RF-03.4 — Eliminación de etiquetas
- El usuario puede eliminar una etiqueta desde el panel de administración.
- Al eliminar, la etiqueta se desasocia de todas las tareas que la tenían asignada.
- Se debe solicitar confirmación mostrando cuántas tareas se verán afectadas.

### RF-03.5 — Colores de etiquetas
- El color puede elegirse de dos formas:
  1. **Paleta predefinida**: 10 colores que garantizan contraste ≥ 4.5:1 con texto blanco (WCAG AA).
  2. **Color personalizado**: Mediante un color picker (input `type="color"` o librería equivalente). El sistema debe validar que el color elegido cumple el requisito de contraste; si no lo cumple, debe avisar al usuario y sugerir una versión más oscura del mismo tono.
- El texto sobre la etiqueta siempre será **blanco**.

#### Paleta predefinida

| Nombre | Hex |
|---|---|
| Rojo | `#B91C1C` |
| Naranja | `#C2410C` |
| Ámbar | `#B45309` |
| Verde | `#15803D` |
| Azul | `#1D4ED8` |
| Índigo | `#4338CA` |
| Violeta | `#6D28D9` |
| Rosa | `#BE185D` |
| Cian | `#0E7490` |
| Gris | `#374151` |

---

## RF-04: Persistencia de Datos

### RF-04.1 — Almacenamiento local
- Toda la información de la aplicación (tareas, columnas, etiquetas) debe almacenarse en **IndexedDB**.
- No se requiere conexión a internet ni servidor.

### RF-04.2 — Inicialización
- En el primer uso (base de datos vacía), el sistema debe crear automáticamente los 6 estados por defecto.

### RF-04.3 — Capa de acceso a datos
- El acceso a IndexedDB debe encapsularse en una capa de servicio/repositorio dedicada, separada de la lógica de UI.
- La capa debe exponer operaciones CRUD asíncronas para cada entidad.

### RF-04.4 — Manejo de errores de almacenamiento
- Si IndexedDB no está disponible (modo privado en ciertos navegadores), el sistema debe mostrar un aviso claro al usuario.
- Las operaciones de escritura deben manejar errores de cuota de almacenamiento.

---

## RF-05: Filtrado y búsqueda

### RF-05.1 — Filtrar por etiqueta
- El usuario puede filtrar las tareas visibles en el tablero seleccionando una o más etiquetas.
- El filtro es acumulativo (AND): solo se muestran tareas que tengan **todas** las etiquetas seleccionadas.

### RF-05.2 — Filtrar por prioridad
- El usuario puede filtrar tareas por uno o más niveles de prioridad.

### RF-05.3 — Búsqueda por texto
- El usuario puede buscar tareas por texto en el título o descripción.
- La búsqueda se aplica de forma transversal a todas las columnas.

---

## Reglas de negocio generales

| ID | Regla |
|---|---|
| RN-01 | Una tarea siempre debe pertenecer a un estado (columna) |
| RN-02 | El título de una tarea es obligatorio |
| RN-03 | La `createdAt` es inmutable una vez creada la tarea |
| RN-04 | No pueden existir dos etiquetas con el mismo nombre (case-insensitive) |
| RN-05 | Los colores de etiquetas deben tener contraste ≥ 4.5:1 con blanco (#FFFFFF) |
| RN-06 | Al eliminar un estado, las tareas deben ser reasignadas o eliminadas explícitamente |
| RN-07 | Los estados y las etiquetas son compartidos por todas las tareas del tablero |
