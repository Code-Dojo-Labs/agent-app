# US-09 — Crear etiqueta

> **Área**: Gestión de etiquetas  
> **Prioridad**: Alta  
> **Referencia**: [functional-requirements.md — RF-03.1](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** crear etiquetas con nombre y color personalizados,  
**para** categorizar y clasificar visualmente mis tareas de forma reutilizable.

---

## Criterios de aceptación

```gherkin
Feature: Creación de etiquetas

  Scenario: Crear una nueva etiqueta desde el selector de etiquetas de una tarea
    Given el usuario está en el panel de detalle de una tarea
    When escribe en el campo de búsqueda de etiquetas un nombre que no existe
    Then el sistema muestra la opción "Crear etiqueta '[nombre]'"
    When el usuario la selecciona y elige un color
    And confirma la creación
    Then la etiqueta se guarda en IndexedDB con un UUID generado automáticamente
    And la etiqueta queda asignada automáticamente a la tarea actual
    And aparece como chip de color en la tarjeta y en el panel de detalle

  Scenario: Nombre de etiqueta obligatorio
    Given el usuario intenta crear una etiqueta
    When deja el nombre vacío
    Then el sistema muestra un error y no permite guardar

  Scenario: Nombre de etiqueta con máximo 30 caracteres
    Given el usuario está creando una etiqueta
    When escribe un nombre con más de 30 caracteres
    Then el sistema impide ingresar más de 30 caracteres
    O muestra un error de validación y no permite guardar

  Scenario: Color de etiqueta obligatorio
    Given el usuario está creando una etiqueta con nombre válido
    When no selecciona ningún color
    Then el sistema muestra un error y no permite guardar

  Scenario: Búsqueda en tiempo real entre etiquetas existentes
    Given existen etiquetas creadas previamente
    When el usuario escribe en el campo de búsqueda del selector de etiquetas
    Then el sistema filtra las etiquetas existentes en tiempo real mostrando las coincidencias
    And si no existe ninguna coincidencia muestra la opción de crear una nueva etiqueta
```
