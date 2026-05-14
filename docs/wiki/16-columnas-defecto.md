# Columnas por defecto

Cuando creas un **nuevo tablero**, Dojo Kanban lo inicializa automáticamente con un conjunto de columnas estandarizadas listas para usar, sin necesidad de configuración manual.

## Columnas predefinidas

| Orden | Nombre | Descripción |
|-------|--------|-------------|
| 1 | **Backlog** | Tareas pendientes de planificar |
| 2 | **En progreso** | Tareas actualmente en desarrollo |
| 3 | **En revisión** | Tareas completadas esperando revisión |
| 4 | **Hecho** | Tareas finalizadas y validadas |

```
┌──────────┐  ┌─────────────┐  ┌────────────┐  ┌────────┐
│ Backlog  │  │ En progreso │  │ En revisión│  │ Hecho  │
│          │  │             │  │            │  │        │
│  (vacío) │  │   (vacío)   │  │  (vacío)   │  │(vacío) │
└──────────┘  └─────────────┘  └────────────┘  └────────┘
           ← tablero recién creado →
```

## Personalizar las columnas

Las columnas por defecto son solo un punto de partida. Puedes:

- **Renombrar** cualquier columna desde su menú `···` → **Editar**.
- **Eliminar** columnas que no necesites.
- **Añadir** nuevas columnas con el botón **+ Nueva columna**.
- **Reordenar** columnas arrastrándolas.

## Tableros creados antes de esta funcionalidad

Los tableros existentes no se ven afectados. Las columnas por defecto solo aplican a tableros **nuevos** creados a partir de esta versión.

## FAQ

**¿Puedo cambiar las columnas por defecto para futuros tableros?**  
Actualmente las columnas por defecto son fijas. La personalización de la plantilla de tablero está prevista en futuras versiones.

**¿Las columnas por defecto tienen límite WIP?**  
No, se crean sin límite WIP. Puedes configurarlo manualmente desde cada columna.

**¿Puedo crear un tablero vacío (sin columnas)?**  
No directamente. El tablero siempre se inicializa con las cuatro columnas estándar, pero puedes eliminarlas una a una después de crearlo.
