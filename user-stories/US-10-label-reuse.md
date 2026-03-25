# US-10 — Reutilización de etiquetas

> **Área**: Gestión de etiquetas  
> **Prioridad**: Media  
> **Referencia**: [functional-requirements.md — RF-03.2](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** reutilizar etiquetas existentes en múltiples tareas,  
**para** mantener una clasificación consistente sin duplicar información.

---

## Criterios de aceptación

```gherkin
Feature: Reutilización de etiquetas globales

  Scenario: Asignar una etiqueta existente a una tarea
    Given existen etiquetas creadas previamente en el sistema
    And el usuario abre el selector de etiquetas en el detalle de una tarea
    When busca el nombre de una etiqueta existente
    And la selecciona
    Then el ID de la etiqueta se añade al array "labelIds" de la tarea en IndexedDB
    And el chip de la etiqueta aparece en la tarjeta y en el panel de detalle

  Scenario: Prevención de duplicados por nombre (case-insensitive)
    Given existe una etiqueta con el nombre "Frontend"
    When el usuario escribe "frontend" (en minúsculas) en el selector de etiquetas
    And intenta crear una nueva etiqueta con ese nombre
    Then el sistema alerta al usuario de que ya existe una etiqueta con ese nombre
    And reutiliza la etiqueta existente "Frontend" en lugar de crear un duplicado

  Scenario: Una etiqueta asignada a múltiples tareas
    Given una etiqueta "Bug" ha sido creada previamente
    When el usuario la asigna a tres tareas distintas
    Then las tres tareas muestran el chip "Bug" en el tablero
    And la etiqueta existe como un único registro en el object store "labels" de IndexedDB

  Scenario: Tarea sin etiquetas
    Given el usuario crea una tarea sin asignar etiquetas
    When la tarjeta aparece en el tablero
    Then no muestra ningún chip de etiqueta
    And el campo "labelIds" en IndexedDB contiene un array vacío
```
