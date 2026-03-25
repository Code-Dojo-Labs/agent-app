# Mejoras Sugeridas

> [← Volver al índice](./index.md)

Esta sección recoge propuestas de funcionalidades que van más allá del MVP, pero que potenciarían significativamente la utilidad y la experiencia de usuario de la aplicación. Están ordenadas de mayor a menor impacto estimado.

---

## MS-01: Fechas de vencimiento y alertas

**Problema que resuelve**: El campo `createdAt` informa cuándo se creó la tarea, pero no cuándo debe completarse.

**Propuesta**:
- Añadir un campo `dueDate` (fecha y hora opcional) a la entidad `Task`.
- Mostrar la fecha de vencimiento en la tarjeta con formato relativo ("en 2 días", "ayer").
- Resaltar visualmente las tarjetas vencidas (borde rojo) y las próximas a vencer (borde ámbar).
- Ordenar opcionalmente las tareas por fecha de vencimiento dentro de cada columna.

**Impacto en el modelo de datos**: Añadir `dueDate?: string | null` a la interfaz `Task`.

---

## MS-02: Modo oscuro automático

**Problema que resuelve**: Los usuarios que trabajan en entornos de baja luminosidad necesitan un modo oscuro.

**Propuesta**:
- Implementar modo oscuro completo con los tokens de color definidos en [UI/UX](./ui-ux.md).
- Detectar automáticamente la preferencia del sistema (`prefers-color-scheme`).
- Permitir al usuario sobreescribir la preferencia (claro / oscuro / sistema) y persistir la elección en `localStorage`.

---

## MS-03: Exportación e importación de datos

**Problema que resuelve**: IndexedDB no es fácilmente portable entre navegadores/dispositivos.

**Propuesta**:
- Botón **"Exportar"**: Descarga un archivo `.json` con la snapshot completa del tablero (tareas, columnas, etiquetas).
- Botón **"Importar"**: Carga un archivo `.json` previamente exportado y lo fusiona con los datos actuales (o reemplaza con confirmación).
- El formato de exportación debe ser versionado para soportar migraciones futuras.

```json
{
  "version": 1,
  "exportedAt": "2026-03-25T10:00:00.000Z",
  "columns": [...],
  "labels": [...],
  "tasks": [...]
}
```

---

## MS-04: Historial de actividad por tarea

**Problema que resuelve**: No hay trazabilidad de los cambios realizados en una tarea.

**Propuesta**:
- Añadir una sección "Actividad" al panel de detalle de la tarea.
- Registrar automáticamente eventos como:
  - Cambio de estado ("Movida de *En progreso* a *Hecho*")
  - Cambio de prioridad ("Prioridad cambiada de *Media* a *Alta*")
  - Adición/eliminación de etiquetas
- Los eventos se almacenan en un nuevo object store `activity` en IndexedDB.

**Nuevo objeto**:
```ts
interface ActivityEvent {
  id: string;
  taskId: string;
  type: 'status_change' | 'priority_change' | 'label_added' | 'label_removed' | 'created';
  payload: Record<string, unknown>;
  createdAt: string;
}
```

---

## MS-05: Subtareas (checklist)

**Problema que resuelve**: Las tareas complejas necesitan desglosarse en pasos accionables.

**Propuesta**:
- Añadir una lista de subtareas (checklist) a cada tarea.
- Cada subtarea tiene: texto y estado (pendiente / completada).
- La tarjeta muestra el progreso: "3 / 5 completadas" con una barra de progreso.
- Las subtareas se almacenan como campo embebido en la entidad `Task`.

```ts
interface Subtask {
  id: string;
  text: string;
  completed: boolean;
}
// En Task:
subtasks: Subtask[];
```

---

## MS-06: Múltiples tableros

**Problema que resuelve**: Un solo tablero limita el uso para proyectos distintos.

**Propuesta**:
- Soportar múltiples tableros, cada uno con su propio conjunto de columnas y tareas.
- Las etiquetas pueden ser globales (compartidas entre tableros) o locales (por tablero).
- Agregar un nuevo object store `boards` y asociar tareas y columnas a un `boardId`.
- La pantalla principal muestra una lista/grid de tableros disponibles.

**Nuevo objeto**:
```ts
interface Board {
  id: string;
  name: string;
  emoji?: string;    // Ícono del tablero
  createdAt: string;
}
```

---

## MS-07: Búsqueda global con atajos de teclado

**Problema que resuelve**: En tableros con muchas tareas, la navegación puede volverse lenta.

**Propuesta**:
- Implementar una paleta de comandos al estilo de VS Code o Linear, activable con `Cmd/Ctrl + K`.
- Permite buscar tareas, navegar a columnas, crear tareas rápidas o cambiar filtros.
- Resultados ordenados por relevancia (coincidencia en título > descripción).

---

## MS-08: Asignación de personas

**Problema que resuelve**: En equipos, es necesario saber quién es responsable de cada tarea.

**Propuesta**:
- Añadir un campo `assignees` (lista de IDs de personas) a la tarea.
- Gestionar un directorio local de personas (nombre + avatar emoji o inicial).
- Mostrar el avatar en la tarjeta del tablero.
- Filtrar el tablero por persona asignada.

> Esta funcionalidad mantiene el espíritu "offline-first" al no requerir autenticación externa.

---

## MS-09: Sincronización entre pestañas con BroadcastChannel

**Problema que resuelve**: Si el usuario abre la app en dos pestañas del mismo navegador, los cambios en una no se reflejan en la otra.

**Propuesta**:
- Usar la API `BroadcastChannel` del navegador para emitir mensajes cuando se produce una modificación en IndexedDB.
- Las otras pestañas escuchan los mensajes y actualizan su estado local.
- Es liviano, no requiere servidor y es nativo del navegador.

```ts
const channel = new BroadcastChannel('kanban-sync');
// Al modificar un dato:
channel.postMessage({ type: 'task:updated', taskId: '...' });
// En otras pestañas:
channel.onmessage = (event) => { /* refrescar datos */ };
```

---

## MS-10: Soporte PWA (Progressive Web App)

**Problema que resuelve**: La app solo funciona mientras hay conexión o el navegador está abierto; no se puede instalar como app nativa.

**Propuesta**:
- Añadir un `manifest.json` para permitir la instalación en escritorio y móvil.
- Implementar un Service Worker con estrategia **Cache First** para que la app funcione sin conexión.
- Dado que los datos ya están en IndexedDB, la experiencia offline es completa sin esfuerzo adicional de sincronización.

---

## Resumen de priorización sugerida

| Prioridad | Mejora | Justificación |
|---|---|---|
| 🔥 Alta | MS-02 — Modo oscuro | Bajo coste, alto impacto en usabilidad |
| 🔥 Alta | MS-01 — Fechas de vencimiento | Funcionalidad crítica para gestión real de tareas |
| ⬆️ Media | MS-03 — Exportación/importación | Resuelve la portabilidad de datos |
| ⬆️ Media | MS-05 — Subtareas | Aumenta la granularidad de gestión |
| ⬆️ Media | MS-10 — PWA | Muy bajo coste con IndexedDB ya implementado |
| ➡️ Baja | MS-04 — Historial de actividad | Valioso pero costoso en almacenamiento |
| ➡️ Baja | MS-07 — Paleta de comandos | Mejora UX en tableros grandes |
| ➡️ Baja | MS-06 — Múltiples tableros | Implica refactor importante del modelo |
| ⬇️ Opcional | MS-08 — Asignación de personas | Solo relevante para equipos |
| ⬇️ Opcional | MS-09 — Sincronización entre pestañas | Caso de uso de nicho |
