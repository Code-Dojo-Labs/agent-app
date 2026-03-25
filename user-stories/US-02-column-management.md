# US-02 — Gestión de columnas

> **Área**: Tablero  
> **Prioridad**: Alta  
> **Referencia**: [functional-requirements.md — RF-01.2](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** crear, renombrar, eliminar y reordenar las columnas del tablero,  
**para** adaptar los estados del flujo de trabajo a mis necesidades específicas.

---

## Criterios de aceptación

```gherkin
Feature: Gestión de columnas del tablero Kanban

  Scenario: Crear una nueva columna
    Given el usuario está en el tablero Kanban
    When hace clic en el botón de añadir nueva columna
    And introduce un nombre y selecciona un ícono
    And confirma la creación
    Then la nueva columna aparece al final del tablero
    And se persiste en IndexedDB con un UUID generado automáticamente
    And el conteo inicial de tareas es 0

  Scenario: Renombrar una columna existente
    Given el usuario abre el menú contextual (⋮) de una columna
    When selecciona la opción "Renombrar"
    And escribe el nuevo nombre
    And confirma el cambio
    Then la cabecera de la columna muestra el nuevo nombre
    And el cambio se persiste en IndexedDB

  Scenario: Eliminar una columna sin tareas
    Given el usuario abre el menú contextual de una columna vacía
    When selecciona la opción "Eliminar"
    And confirma la acción
    Then la columna desaparece del tablero
    And se elimina de IndexedDB

  Scenario: Eliminar una columna con tareas — mover tareas
    Given el usuario intenta eliminar una columna que contiene tareas
    When selecciona la opción "Eliminar"
    Then el sistema muestra un diálogo de confirmación
    And ofrece la opción de mover las tareas a otra columna existente
    When el usuario elige una columna destino y confirma
    Then las tareas se mueven a la columna destino
    And la columna eliminada desaparece del tablero
    And los cambios se persisten en IndexedDB

  Scenario: Eliminar una columna con tareas — eliminar tareas
    Given el usuario intenta eliminar una columna que contiene tareas
    When selecciona la opción "Eliminar"
    Then el sistema muestra un diálogo de confirmación
    And ofrece la opción de eliminar todas las tareas que contiene
    When el usuario elige eliminar las tareas y confirma
    Then las tareas se eliminan de IndexedDB
    And la columna eliminada desaparece del tablero

  Scenario: Reordenar columnas mediante arrastre
    Given el tablero muestra varias columnas
    When el usuario arrastra una columna a una nueva posición
    And la suelta sobre la posición destino
    Then las columnas se reorganizan visualmente en el nuevo orden
    And el campo "order" de cada columna afectada se actualiza en IndexedDB
```
