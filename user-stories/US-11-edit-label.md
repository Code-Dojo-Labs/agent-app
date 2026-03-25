# US-11 — Editar etiqueta

> **Área**: Gestión de etiquetas  
> **Prioridad**: Media  
> **Referencia**: [functional-requirements.md — RF-03.3](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** editar el nombre o el color de una etiqueta existente desde el panel de administración,  
**para** corregir errores o actualizar la clasificación sin tener que recrear la etiqueta.

---

## Criterios de aceptación

```gherkin
Feature: Edición de etiquetas existentes

  Scenario: Acceder al panel de administración de etiquetas
    Given el usuario está en el tablero Kanban
    When hace clic en el botón "Gestionar etiquetas" en el header
    Then se abre un panel o modal que lista todas las etiquetas existentes
    And cada etiqueta muestra su nombre y su chip de color

  Scenario: Editar el nombre de una etiqueta
    Given el usuario tiene el panel de administración de etiquetas abierto
    When selecciona la opción de editar en una etiqueta
    And cambia el nombre
    And confirma el cambio
    Then el nombre de la etiqueta se actualiza en IndexedDB
    And todas las tareas que la tenían asignada reflejan el nuevo nombre en sus chips

  Scenario: Editar el color de una etiqueta
    Given el usuario tiene el panel de administración de etiquetas abierto
    When selecciona la opción de editar en una etiqueta
    And cambia el color seleccionando uno de la paleta o usando el color picker
    And confirma el cambio
    Then el color de la etiqueta se actualiza en IndexedDB
    And todas las tarjetas y detalles que muestran esa etiqueta reflejan el nuevo color inmediatamente

  Scenario: Propagación automática de cambios en etiquetas
    Given una etiqueta "UX" con color azul está asignada a 5 tareas
    When el usuario cambia el nombre a "Diseño" y el color a verde
    Then las 5 tarjetas en el tablero muestran el chip "Diseño" con color verde
    And el cambio se efectúa sin necesidad de editar cada tarea manualmente
```
