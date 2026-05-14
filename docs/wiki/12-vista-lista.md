# Vista de lista / tabla

Además del tablero Kanban, puedes cambiar a una **vista de lista** que muestra todas las tareas en formato tabla con columnas ordenables y filtrables.

## Cambiar de vista

Usa los botones en la barra superior del tablero:

```
[ 📋 Tablero ]  [ ☰ Lista ]   ← selector de vista
```

La preferencia de vista se guarda automáticamente por tablero.

## Columnas de la tabla

| Columna | Descripción | Ordenable |
|---------|-------------|-----------|
| **Título** | Nombre de la tarea | ✅ |
| **Estado** | Columna a la que pertenece | ✅ |
| **Prioridad** | Urgente / Alta / Media / Baja | ✅ |
| **Etiquetas** | Chips de colores | ❌ |
| **Asignados** | Avatares | ❌ |
| **Vencimiento** | Fecha límite | ✅ |

## Ordenar por columna

Haz clic en el encabezado de cualquier columna ordenable para cambiar el orden:
- Primer clic → ascendente ↑
- Segundo clic → descendente ↓
- Tercer clic → sin orden (original)

## Acciones rápidas desde la lista

Cada fila tiene un menú contextual `···` con:
- **Abrir detalle** — abre el modal completo de la tarea.
- **Cambiar estado** — desplegable para mover a otra columna.
- **Eliminar** — elimina la tarea con confirmación.

## Filtros en vista lista

Los mismos filtros del tablero Kanban (prioridad, etiqueta, asignado, vencimiento) también aplican en la vista lista.

## FAQ

**¿Puedo editar campos directamente en la tabla?**  
El campo de estado se puede cambiar inline; los demás campos se editan abriendo el detalle completo.

**¿La vista lista muestra tareas de todas las columnas?**  
Sí, muestra todas las tareas del tablero activo independientemente de la columna.

**¿El orden que establezco se guarda?**  
No, el orden es temporal por sesión; al recargar vuelve al orden por defecto.
