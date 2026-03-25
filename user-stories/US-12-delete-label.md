# US-12 — Eliminar etiqueta

> **Área**: Gestión de etiquetas  
> **Prioridad**: Media  
> **Referencia**: [functional-requirements.md — RF-03.4](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** eliminar etiquetas que ya no son necesarias desde el panel de administración,  
**para** mantener la lista de etiquetas organizada y libre de clasificaciones obsoletas.

---

## Criterios de aceptación

```gherkin
Feature: Eliminación de etiquetas

  Scenario: Eliminar una etiqueta sin tareas asignadas
    Given el usuario está en el panel de administración de etiquetas
    And existe una etiqueta que no está asignada a ninguna tarea
    When hace clic en el botón de eliminar esa etiqueta
    And confirma la acción en el diálogo de confirmación
    Then la etiqueta se elimina de IndexedDB
    And desaparece de la lista en el panel de administración

  Scenario: Diálogo de confirmación muestra tareas afectadas
    Given el usuario intenta eliminar una etiqueta asignada a varias tareas
    When hace clic en el botón de eliminar
    Then el sistema muestra un diálogo de confirmación
    And el diálogo indica cuántas tareas se verán afectadas (ej. "Esta etiqueta está asignada a 3 tareas")

  Scenario: Confirmar eliminación de etiqueta con tareas asignadas
    Given el diálogo de confirmación está visible con el número de tareas afectadas
    When el usuario confirma la eliminación
    Then la etiqueta se elimina del object store "labels" en IndexedDB
    And el ID de la etiqueta se elimina del array "labelIds" de todas las tareas que la tenían asignada
    And los chips de la etiqueta desaparecen de todas las tarjetas afectadas en el tablero

  Scenario: Cancelar la eliminación de una etiqueta
    Given el diálogo de confirmación de eliminación está visible
    When el usuario cancela la acción
    Then el diálogo se cierra
    And la etiqueta permanece sin cambios en IndexedDB y en el tablero
```
