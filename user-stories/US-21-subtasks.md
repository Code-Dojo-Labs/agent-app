# US-21 — Subtareas (checklist)

> **Área**: Gestión de tareas  
> **Prioridad**: Media  
> **Referencia**: [improvements.md — MS-05](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** añadir una lista de subtareas (checklist) a cada tarea,  
**para** desglosar tareas complejas en pasos más pequeños y rastrear el progreso de cada una.

---

## Criterios de aceptación

```gherkin
Feature: Subtareas (checklist) en tareas

  Scenario: Añadir una subtarea a una tarea
    Given el usuario está en el panel de detalle de una tarea
    When escribe el texto de una nueva subtarea y la añade
    Then la subtarea aparece en la lista con estado "pendiente"
    And se persiste en IndexedDB como parte del campo "subtasks" de la tarea

  Scenario: Marcar una subtarea como completada
    Given una tarea tiene subtareas pendientes
    When el usuario marca una subtarea como completada
    Then la subtarea cambia a estado "completada" con indicador visual (tachado o check)
    And el progreso se actualiza inmediatamente

  Scenario: Desmarcar una subtarea completada
    Given una tarea tiene una subtarea marcada como completada
    When el usuario desmarca la subtarea
    Then la subtarea vuelve a estado "pendiente"
    And el progreso se actualiza inmediatamente

  Scenario: Mostrar progreso de subtareas en la tarjeta del tablero
    Given una tarea tiene 5 subtareas de las cuales 3 están completadas
    When el usuario visualiza la tarjeta en el tablero
    Then la tarjeta muestra "3 / 5 completadas"
    And se muestra una barra de progreso proporcional (60%)

  Scenario: Tarjeta sin subtareas no muestra indicador de progreso
    Given una tarea no tiene subtareas
    When el usuario visualiza la tarjeta en el tablero
    Then no se muestra ningún indicador de progreso ni barra

  Scenario: Eliminar una subtarea
    Given una tarea tiene varias subtareas
    When el usuario elimina una subtarea
    Then la subtarea se elimina de la lista
    And el progreso se recalcula y actualiza
    And los cambios se persisten en IndexedDB

  Scenario: Añadir múltiples subtareas
    Given el usuario está en el panel de detalle de una tarea
    When añade varias subtareas secuencialmente
    Then todas las subtareas aparecen en el orden en que fueron creadas
    And el progreso muestra "0 / N completadas"
```

---

## Notas técnicas

- Las subtareas se almacenan como campo embebido en la entidad `Task`: `subtasks: Subtask[]`.
- Interfaz `Subtask`: `{ id: string, text: string, completed: boolean }`.
- No requiere un nuevo object store, solo ampliar la interfaz `Task` en `models.ts`.
