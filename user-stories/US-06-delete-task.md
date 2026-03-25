# US-06 — Eliminar tarea

> **Área**: Gestión de tareas  
> **Prioridad**: Alta  
> **Referencia**: [functional-requirements.md — RF-02.3](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** eliminar una tarea con confirmación previa,  
**para** mantener el tablero limpio sin riesgo de borrar tareas importantes por accidente.

---

## Criterios de aceptación

```gherkin
Feature: Eliminación de tareas

  Scenario: Eliminar una tarea desde el panel de detalle
    Given el usuario tiene abierto el panel de detalle de una tarea
    When hace clic en el botón "Eliminar tarea"
    Then el sistema muestra un diálogo de confirmación
    And el diálogo menciona el título de la tarea a eliminar

  Scenario: Confirmar la eliminación de una tarea
    Given el sistema muestra el diálogo de confirmación de eliminación
    When el usuario confirma la acción
    Then la tarea se elimina de IndexedDB
    And la tarjeta desaparece del tablero en la columna correspondiente
    And el panel de detalle se cierra
    And el conteo de tareas de la columna se actualiza

  Scenario: Cancelar la eliminación de una tarea
    Given el sistema muestra el diálogo de confirmación de eliminación
    When el usuario cancela la acción
    Then el diálogo se cierra
    And la tarea permanece sin cambios en el tablero y en IndexedDB

  Scenario: Eliminar una tarea mediante acción contextual en la tarjeta
    Given el usuario hace hover sobre una tarjeta en el tablero
    When aparece el botón de acción rápida de eliminación
    And el usuario hace clic en él
    Then el sistema muestra el diálogo de confirmación
    And el flujo es idéntico al de eliminación desde el panel de detalle
```
