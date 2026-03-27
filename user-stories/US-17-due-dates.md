# US-17 — Fechas de vencimiento y alertas

> **Área**: Gestión de tareas  
> **Prioridad**: Alta  
> **Referencia**: [improvements.md — MS-01](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** asignar fechas de vencimiento a mis tareas y recibir alertas visuales de las que estén vencidas o próximas a vencer,  
**para** gestionar plazos de entrega y priorizar mi trabajo de manera efectiva.

---

## Criterios de aceptación

```gherkin
Feature: Fechas de vencimiento y alertas visuales en tareas

  Scenario: Asignar una fecha de vencimiento al crear una tarea
    Given el usuario está creando una nueva tarea
    When completa el título y selecciona una fecha de vencimiento en el campo "dueDate"
    And confirma la creación
    Then la tarea se crea con el campo "dueDate" almacenado en formato ISO 8601
    And la fecha de vencimiento se persiste en IndexedDB

  Scenario: Asignar una fecha de vencimiento al editar una tarea
    Given el usuario abre el panel de detalle de una tarea existente
    When selecciona o modifica la fecha de vencimiento
    And guarda los cambios
    Then el campo "dueDate" se actualiza en IndexedDB
    And la tarjeta refleja la nueva fecha

  Scenario: Mostrar fecha de vencimiento en formato relativo
    Given una tarea tiene una fecha de vencimiento asignada
    When el usuario visualiza la tarjeta en el tablero
    Then la fecha se muestra en formato relativo ("en 2 días", "mañana", "ayer")

  Scenario: Resaltar visualmente una tarea vencida
    Given una tarea tiene una fecha de vencimiento anterior a la fecha actual
    When el usuario visualiza el tablero
    Then la tarjeta de la tarea muestra un borde rojo indicando que está vencida

  Scenario: Resaltar visualmente una tarea próxima a vencer
    Given una tarea tiene una fecha de vencimiento dentro de las próximas 48 horas
    When el usuario visualiza el tablero
    Then la tarjeta de la tarea muestra un borde ámbar indicando que está próxima a vencer

  Scenario: Tarea sin fecha de vencimiento
    Given una tarea no tiene fecha de vencimiento asignada
    When el usuario visualiza la tarjeta en el tablero
    Then no se muestra ningún indicador de fecha ni borde de alerta

  Scenario: Ordenar tareas por fecha de vencimiento dentro de una columna
    Given una columna contiene varias tareas con fechas de vencimiento
    When el usuario activa la opción de ordenar por fecha de vencimiento
    Then las tareas se reordenan de la más próxima a vencer a la más lejana
    And las tareas sin fecha de vencimiento aparecen al final

  Scenario: Eliminar la fecha de vencimiento de una tarea
    Given una tarea tiene una fecha de vencimiento asignada
    When el usuario abre el panel de detalle y elimina la fecha de vencimiento
    And guarda los cambios
    Then el campo "dueDate" se establece como null en IndexedDB
    And la tarjeta deja de mostrar el indicador de fecha y el borde de alerta
```

---

## Notas técnicas

- Añadir `dueDate?: string | null` a la interfaz `Task` en `models.ts`.
- El formato relativo de fecha puede calcularse con lógica nativa (`Intl.RelativeTimeFormat`).
- Los estilos de borde (rojo/ámbar) deben respetar los tokens de color definidos en UI/UX.
