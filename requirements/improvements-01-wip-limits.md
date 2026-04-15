# Mejora 01: Límites WIP por columna

> Estado: Propuesto  
> Fecha: 2026-04-14  
> Área: Tablero Kanban

---

## Problema

El sistema Kanban no respeta uno de sus pilares fundamentales: limitar el trabajo en curso (WIP — *Work In Progress*). Actualmente se pueden acumular tareas ilimitadas en cualquier columna sin ninguna señal visual de saturación, lo que desvirtúa el flujo Kanban y oculta cuellos de botella.

---

## Propuesta de Solución

Permitir que el usuario defina un límite máximo de tareas por columna y mostrar alertas visuales cuando se acerca o supera dicho límite.

### Comportamiento esperado

- En la pantalla de edición de columna, añadir un campo numérico opcional **"Límite WIP"**.
- El contador de tareas en la cabecera de la columna refleja el estado:
  - Normal (≤ 79% del límite): color actual.
  - Advertencia (80–99% del límite): color ámbar `⚠️`.
  - Superado (≥ 100%): color rojo con indicador `🔴`.
- El bloqueo es **suave**: se muestra una advertencia pero no impide agregar más tareas.

### Impacto en el modelo de datos

Añadir un campo opcional a la entidad `Column`:

```ts
interface Column {
  // ...campos existentes
  wipLimit?: number | null; // undefined o null = sin límite
}
```

---

## Criterios de Aceptación

- [ ] El usuario puede establecer, modificar o quitar el límite WIP al crear o editar una columna.
- [ ] Si no se define límite, el comportamiento es idéntico al actual (sin cambios visuales).
- [ ] El contador de la cabecera cambia de color según el umbral definido.
- [ ] Al superar el límite, se muestra un tooltip o badge indicando que la columna está saturada.
- [ ] El límite se persiste en IndexedDB junto al resto de datos de la columna.
- [ ] La funcionalidad es accesible vía teclado y cumple WCAG AA.
