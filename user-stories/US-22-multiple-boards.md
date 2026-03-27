# US-22 — Múltiples tableros

> **Área**: Tablero  
> **Prioridad**: Baja  
> **Referencia**: [improvements.md — MS-06](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** crear y gestionar múltiples tableros independientes,  
**para** organizar proyectos distintos de forma separada sin mezclar información.

---

## Criterios de aceptación

```gherkin
Feature: Múltiples tableros

  Scenario: Ver lista de tableros disponibles
    Given el usuario abre la aplicación
    When accede a la pantalla principal
    Then se muestra una lista o grid de tableros disponibles
    And cada tablero muestra su nombre y emoji (si tiene)

  Scenario: Crear un nuevo tablero
    Given el usuario está en la pantalla principal de tableros
    When hace clic en "Nuevo tablero"
    And introduce un nombre para el tablero
    And opcionalmente selecciona un emoji
    And confirma la creación
    Then el tablero se crea con las columnas por defecto
    And se persiste en IndexedDB con un UUID generado automáticamente
    And aparece en la lista de tableros

  Scenario: Acceder a un tablero específico
    Given existen múltiples tableros
    When el usuario hace clic en uno de ellos
    Then se muestra el tablero Kanban con sus columnas y tareas propias
    And las tareas y columnas corresponden únicamente a ese tablero

  Scenario: Cada tablero tiene columnas y tareas independientes
    Given existen dos tableros: "Proyecto A" y "Proyecto B"
    When el usuario crea una tarea en "Proyecto A"
    Then la tarea solo aparece en el tablero "Proyecto A"
    And no es visible en el tablero "Proyecto B"

  Scenario: Eliminar un tablero
    Given el usuario está en la lista de tableros
    When selecciona eliminar un tablero
    And confirma la eliminación en el diálogo de confirmación
    Then el tablero, sus columnas y sus tareas se eliminan de IndexedDB
    And el tablero desaparece de la lista

  Scenario: No permitir eliminar el último tablero
    Given solo existe un tablero en la aplicación
    When el usuario intenta eliminarlo
    Then el sistema muestra un mensaje indicando que debe existir al menos un tablero

  Scenario: Etiquetas compartidas entre tableros
    Given existen múltiples tableros y etiquetas creadas
    When el usuario asigna una etiqueta a una tarea en cualquier tablero
    Then las etiquetas son globales y están disponibles en todos los tableros

  Scenario: Renombrar un tablero
    Given el usuario está en la lista de tableros
    When edita el nombre de un tablero existente
    And confirma los cambios
    Then el nombre se actualiza en IndexedDB y en la interfaz
```

---

## Notas técnicas

- Nuevo object store `boards` en IndexedDB.
- Interfaz `Board`: `{ id: string, name: string, emoji?: string, createdAt: string }`.
- Asociar tareas y columnas a un `boardId`.
- Las etiquetas son globales (compartidas entre tableros).
- Requiere migración de la base de datos.
