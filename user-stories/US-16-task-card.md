# US-16 — Tarjeta de tarea en el tablero

> **Área**: UI / Experiencia de usuario  
> **Prioridad**: Alta  
> **Referencia**: [ui-ux.md — Tarjeta de tarea](../requirements/ui-ux.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** ver las tarjetas de las tareas con su información más relevante directamente en el tablero,  
**para** evaluar el estado del trabajo sin necesidad de abrir el detalle de cada tarea.

---

## Criterios de aceptación

```gherkin
Feature: Visualización de tarjetas de tarea en el tablero

  Scenario: Contenido visible en la tarjeta
    Given el tablero tiene tareas en alguna columna
    When el usuario observa una tarjeta
    Then debe ver en la parte superior los chips de etiquetas (nombre con fondo de color y texto blanco)
    And debe ver el título de la tarea (máximo 2 líneas, con ellipsis si excede)
    And debe ver el ícono y texto de prioridad en la parte inferior izquierda
    And debe ver la fecha de creación en formato corto (ej. "25 mar 2026") en la parte inferior derecha

  Scenario: Tarjeta sin etiquetas asignadas
    Given una tarea no tiene etiquetas
    When se renderiza su tarjeta en el tablero
    Then no se muestra ningún chip de etiqueta en la parte superior de la tarjeta

  Scenario: Acciones rápidas al hacer hover
    Given el usuario pasa el cursor sobre una tarjeta
    When aparece el estado de hover
    Then se muestran los botones de acción rápida (ícono de eliminar e ícono de arrastre)
    And las acciones solo son visibles en hover para no sobrecargar la interfaz

  Scenario: Abrir detalle al hacer clic
    Given el usuario hace clic sobre el cuerpo de una tarjeta
    When el evento de clic se procesa
    Then se abre el panel lateral de detalle de esa tarea
    And el tablero permanece visible en segundo plano

  Scenario: Fecha de creación en formato legible
    Given una tarea fue creada el 25 de marzo de 2026 a las 10:43
    When se renderiza la tarjeta
    Then la fecha mostrada es "25 mar 2026" en la tarjeta
    And en el panel de detalle se muestra "25 mar 2026, 10:43"
```
