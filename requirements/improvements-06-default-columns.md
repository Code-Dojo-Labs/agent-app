# Mejora 06: Columnas por defecto estandarizadas en tableros nuevos

> Estado: Propuesto  
> Fecha: 2026-04-14  
> Área: Tablero Kanban — Inicialización

---

## Problema

Actualmente los tableros nuevos se inicializan con un conjunto de columnas por defecto que puede no coincidir con la nomenclatura estándar esperada por los usuarios. La falta de un estándar claro genera inconsistencias entre tableros y obliga al usuario a renombrar o reconfigurar las columnas manualmente cada vez que crea un tablero nuevo.

---

## Propuesta de Solución

Establecer un conjunto de **6 columnas estándar predefinidas** que se crean automáticamente al inicializar la aplicación o al crear un nuevo tablero, siguiendo una nomenclatura y un orden de flujo Kanban reconocible.

### Columnas estándar definidas

| Orden | Ícono | Nombre | Descripción |
|---|---|---|---|
| 1 | 📋 | **Backlog** | Ideas y tareas sin planificar todavía |
| 2 | 🔲 | **Por Hacer** | Tareas listas y priorizadas para trabajar |
| 3 | 🔄 | **En Progreso** | Trabajo actualmente en curso |
| 4 | 🔍 | **En Revisión** | Tarea completada pendiente de validación |
| 5 | ✅ | **Hecho** | Tarea finalizada y aceptada |
| 6 | 🚫 | **Bloqueado** | Tarea detenida por una dependencia externa |

### Comportamiento esperado

- Al crear un nuevo tablero, se generan automáticamente las 6 columnas en el orden definido.
- Si el usuario ya tiene datos en la base de datos (migración), no se sobreescriben ni duplican.
- El usuario puede renombrar, reordenar o eliminar cualquier columna después de la inicialización (comportamiento existente sin cambios).
- Las columnas por defecto deben tener un flag `isDefault: true` para identificarlas y poder distinguirlas en futuros reportes o acciones.

### Impacto en el modelo de datos

Añadir un campo opcional al modelo `Column`:

```ts
interface Column {
  // ...campos existentes
  isDefault?: boolean; // true en las columnas generadas automáticamente
}
```

La semilla de datos (seed) queda definida así:

```ts
const DEFAULT_COLUMNS: Omit<Column, 'id'>[] = [
  { name: 'Backlog',      icon: '📋', order: 0, isDefault: true },
  { name: 'Por Hacer',    icon: '🔲', order: 1, isDefault: true },
  { name: 'En Progreso',  icon: '🔄', order: 2, isDefault: true },
  { name: 'En Revisión',  icon: '🔍', order: 3, isDefault: true },
  { name: 'Hecho',        icon: '✅', order: 4, isDefault: true },
  { name: 'Bloqueado',    icon: '🚫', order: 5, isDefault: true },
];
```

---

## Criterios de Aceptación

- [ ] Al inicializar la app sin datos previos, se crean exactamente las 6 columnas en el orden definido.
- [ ] Al crear un tablero nuevo desde la UI de múltiples tableros, se aplican las mismas 6 columnas por defecto.
- [ ] Si ya existen datos en la base de datos, la inicialización no crea columnas duplicadas.
- [ ] Las columnas creadas son completamente editables (nombre, ícono, orden, eliminación).
- [ ] La lógica de seed no genera columnas duplicadas si se llama más de una vez.
