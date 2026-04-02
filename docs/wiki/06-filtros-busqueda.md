# Filtros y búsqueda

Dojo Kanban ofrece dos mecanismos de búsqueda: la **barra de filtros** del tablero y la **paleta de comandos** global.

## Barra de filtros del tablero

Situada en la parte superior del tablero, permite filtrar las tareas visibles en tiempo real.

### Filtrar por texto

Escribe en el campo de búsqueda para filtrar tareas cuyo **título o descripción** contengan el texto introducido.  
El filtrado es instantáneo (debounce de 200 ms) y no distingue mayúsculas.

### Filtrar por etiqueta

Haz clic en una o varias etiquetas del selector para mostrar solo las tareas que las tengan asignadas.  
Los filtros de etiqueta son acumulativos (AND).

### Filtrar por prioridad

Selecciona un nivel de prioridad (`Urgente`, `Alta`, `Media`, `Baja`) para limitar las tareas mostradas.

### Limpiar filtros

Haz clic en **"Limpiar"** o vacía el campo de texto para restablecer la vista completa.

---

## Paleta de comandos global

Abre la paleta con **`Cmd + K`** (Mac) o **`Ctrl + K`** (Windows/Linux).

- Escribe para buscar tareas por título o descripción en **todos los tableros**.
- Usa las flechas **↑ / ↓** para navegar entre resultados.
- Pulsa **Enter** para abrir la tarea seleccionada.
- Pulsa **Escape** para cerrar la paleta.
- Desde la paleta también puedes **crear una tarea nueva** con el título buscado si no existe ninguna coincidencia.
