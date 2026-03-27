# US-20 — Historial de actividad por tarea

> **Área**: Gestión de tareas  
> **Prioridad**: Baja  
> **Referencia**: [improvements.md — MS-04](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** consultar un historial de cambios realizados en cada tarea,  
**para** tener trazabilidad de las modificaciones y entender la evolución de mi trabajo.

---

## Criterios de aceptación

```gherkin
Feature: Historial de actividad por tarea

  Scenario: Registrar evento de creación de tarea
    Given el usuario crea una nueva tarea
    When la tarea se persiste en IndexedDB
    Then se registra un evento de actividad de tipo "created" asociado a la tarea
    And el evento incluye la fecha y hora de creación

  Scenario: Registrar cambio de columna (estado)
    Given una tarea existente está en la columna "Por hacer"
    When el usuario mueve la tarea a la columna "En progreso"
    Then se registra un evento de tipo "status_change"
    And el evento indica la columna origen y la columna destino

  Scenario: Registrar cambio de prioridad
    Given una tarea tiene prioridad "Media"
    When el usuario cambia la prioridad a "Alta"
    Then se registra un evento de tipo "priority_change"
    And el evento indica la prioridad anterior y la nueva prioridad

  Scenario: Registrar adición de etiqueta
    Given una tarea no tiene etiquetas asignadas
    When el usuario asigna la etiqueta "Bug"
    Then se registra un evento de tipo "label_added"
    And el evento contiene el ID y nombre de la etiqueta añadida

  Scenario: Registrar eliminación de etiqueta
    Given una tarea tiene la etiqueta "Feature" asignada
    When el usuario elimina la etiqueta "Feature" de la tarea
    Then se registra un evento de tipo "label_removed"
    And el evento contiene el ID y nombre de la etiqueta eliminada

  Scenario: Visualizar historial de actividad en el panel de detalle
    Given una tarea tiene múltiples eventos de actividad registrados
    When el usuario abre el panel de detalle de la tarea
    Then se muestra la sección "Actividad" con la lista de eventos
    And los eventos se ordenan del más reciente al más antiguo
    And cada evento muestra una descripción legible y la fecha relativa

  Scenario: Tarea sin actividad registrada
    Given una tarea recién creada solo tiene el evento de creación
    When el usuario abre el panel de detalle
    Then la sección "Actividad" muestra únicamente el evento "Tarea creada"
```

---

## Notas técnicas

- Nuevo object store `activity` en IndexedDB con índice por `taskId`.
- Interfaz `ActivityEvent`: `{ id, taskId, type, payload, createdAt }`.
- Tipos de evento: `created`, `status_change`, `priority_change`, `label_added`, `label_removed`.
- Migración de la base de datos requerida.
