# US-03 — Drag & Drop de tareas

> **Área**: Tablero  
> **Prioridad**: Alta  
> **Referencia**: [functional-requirements.md — RF-01.3](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** arrastrar y soltar tareas entre columnas y dentro de la misma columna,  
**para** cambiar su estado o reordenarlas de forma visual e intuitiva sin abrir el detalle de la tarea.

---

## Criterios de aceptación

```gherkin
Feature: Arrastre y soltar (Drag & Drop) de tareas

  Scenario: Mover una tarea a otra columna mediante arrastre
    Given el usuario visualiza el tablero con tareas en distintas columnas
    When arrastra una tarjeta de la columna "Por hacer" hacia la columna "En progreso"
    And la suelta sobre esa columna
    Then la tarjeta aparece en la columna "En progreso"
    And el campo "statusId" de la tarea se actualiza en IndexedDB
    And el conteo de tareas de ambas columnas se actualiza visualmente

  Scenario: Indicador visual durante el arrastre
    Given el usuario comienza a arrastrar una tarjeta
    When la tarjeta está siendo arrastrada
    Then el cursor cambia a "grab"
    And la zona de destino válida se resalta visualmente al pasar sobre ella

  Scenario: Reordenar tareas dentro de la misma columna
    Given una columna tiene varias tareas
    When el usuario arrastra una tarjeta a una posición diferente dentro de la misma columna
    And la suelta en la nueva posición
    Then el orden de las tarjetas en la columna se actualiza visualmente
    And el campo "order" de las tareas afectadas se actualiza en IndexedDB

  Scenario: Uso de la API HTML5 nativa de Drag & Drop
    Given la funcionalidad de arrastre está implementada
    When se inspecciona el código fuente
    Then se usan los eventos nativos dragstart, dragover, dragleave y drop
    And no se emplea ninguna librería externa de drag & drop
```
