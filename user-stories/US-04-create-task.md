# US-04 — Crear tarea

> **Área**: Gestión de tareas  
> **Prioridad**: Alta  
> **Referencia**: [functional-requirements.md — RF-02.1](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** crear una nueva tarea desde cualquier columna del tablero,  
**para** registrar rápidamente trabajo pendiente y asignarle un estado inicial de forma inmediata.

---

## Criterios de aceptación

```gherkin
Feature: Creación de tareas en el tablero Kanban

  Scenario: Crear una tarea con solo el título
    Given el usuario hace clic en el botón "+ Agregar tarea" de la columna "Por hacer"
    When introduce un título válido (máximo 120 caracteres)
    And confirma la creación
    Then la tarea se crea con estado "Por hacer"
    And la prioridad se asigna automáticamente como "Media" (valor por defecto)
    And el campo "createdAt" se asigna con la fecha y hora actual en formato ISO 8601
    And la tarea se persiste en IndexedDB con un UUID generado automáticamente
    And la nueva tarjeta aparece al final de la columna "Por hacer"

  Scenario: Crear una tarea con todos los campos opcionales
    Given el usuario abre el formulario de creación desde una columna
    When completa el título, descripción, prioridad y etiquetas
    And confirma la creación
    Then la tarea se crea con todos los valores indicados
    And se persiste correctamente en IndexedDB

  Scenario: Intentar crear una tarea sin título
    Given el usuario abre el formulario de creación de tarea
    When deja el campo de título vacío
    And intenta confirmar la creación
    Then el sistema muestra un mensaje de error indicando que el título es obligatorio
    And no se crea ni persiste ninguna tarea

  Scenario: Título con más de 120 caracteres
    Given el usuario está creando una nueva tarea
    When introduce un título con más de 120 caracteres
    Then el sistema impide ingresar más de 120 caracteres
    O muestra un error de validación y no permite guardar

  Scenario: La columna origen establece el estado inicial
    Given el usuario hace clic en "+ Agregar tarea" en la columna "Backlog"
    When crea la tarea
    Then el campo "statusId" de la tarea corresponde al ID de la columna "Backlog"
```
