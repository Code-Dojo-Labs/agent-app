# Búsqueda global y paleta de comandos

La **paleta de comandos** permite buscar tareas, navegar entre columnas y ejecutar acciones del tablero sin usar el ratón.

## Abrir y cerrar la paleta

| Acción | Atajo |
|--------|-------|
| Abrir paleta | `Cmd + K` (macOS) · `Ctrl + K` (Windows/Linux) |
| Cerrar paleta | `Escape` o clic fuera |

Al abrirse, el foco va automáticamente al campo de búsqueda.

## Búsqueda de tareas

Escribe cualquier texto para buscar en tiempo real:

- **Por título** — coincidencias resaltadas, ordenadas por relevancia.
- **Por descripción** — resultados secundarios tras los de título.
- **Por etiqueta** — escribe `#nombre-etiqueta` para filtrar por etiqueta.

```
┌─────────────────────────────────────┐
│  🔍  Busca tareas, columnas...      │
├─────────────────────────────────────┤
│  ✅  Implementar login              │  ← coincidencia en título
│  🐛  Bug en el formulario login     │  ← coincidencia en título
│  📋  Revisar flujo de autenticación │  ← coincidencia en descripción
└─────────────────────────────────────┘
```

## Navegación entre resultados

| Atajo | Acción |
|-------|--------|
| `↑` / `↓` | Mover selección |
| `Enter` | Abrir la tarea seleccionada |
| `Escape` | Cerrar y volver al tablero |

## Acciones rápidas

Cuando no hay texto, la paleta muestra acciones recientes y comandos globales (crear tarea, cambiar tablero, etc.).

## FAQ

**¿La búsqueda es en tiempo real?**  
Sí, los resultados se actualizan con cada pulsación de tecla.

**¿Busca en todos los tableros?**  
Sí, la búsqueda es global y abarca todos los tableros y columnas.

**¿Distingue mayúsculas?**  
No, la búsqueda es insensible a mayúsculas/minúsculas.
