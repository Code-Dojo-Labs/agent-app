# US-05 — Editar tarea

> **Área**: Gestión de tareas  
> **Prioridad**: Alta  
> **Referencia**: [functional-requirements.md — RF-02.2](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** abrir una tarea y editar todos sus campos desde un panel de detalle,  
**para** mantener la información de cada tarea actualizada conforme avanza el trabajo.

---

## Criterios de aceptación

```gherkin
Feature: Edición de tareas en el panel de detalle

  Scenario: Abrir el panel de detalle al hacer clic en una tarjeta
    Given el tablero muestra tareas en las columnas
    When el usuario hace clic sobre una tarjeta de tarea
    Then se abre un panel lateral deslizable (sidebar) a la derecha
    And muestra todos los campos editables: título, descripción, estado, prioridad y etiquetas
    And el tablero permanece visible en segundo plano

  Scenario: Editar el título de una tarea
    Given el panel de detalle de una tarea está abierto
    When el usuario modifica el campo de título
    And sale del campo (blur) o guarda explícitamente
    Then el cambio se persiste en IndexedDB
    And el campo "updatedAt" de la tarea se actualiza con la fecha y hora actual
    And la tarjeta en el tablero refleja el nuevo título

  Scenario: Editar la descripción en modo Markdown
    Given el panel de detalle está abierto con la pestaña de edición activa
    When el usuario escribe texto en formato Markdown en el campo de descripción
    And cambia a modo previsualización
    Then el sistema muestra el Markdown renderizado de forma segura
    And el modo de edición y previsualización son intercambiables con un botón

  Scenario: Cambiar el estado de una tarea desde el detalle
    Given el panel de detalle de una tarea está abierto
    When el usuario selecciona un nuevo estado en el selector desplegable
    Then la tarea se mueve visualmente a la columna correspondiente en el tablero
    And el campo "statusId" se actualiza en IndexedDB

  Scenario: Cambiar la prioridad de una tarea
    Given el panel de detalle de una tarea está abierto
    When el usuario selecciona una nueva prioridad (Baja / Media / Alta / Urgente)
    Then la tarjeta en el tablero muestra el nuevo ícono de prioridad
    And el campo "priority" se actualiza en IndexedDB

  Scenario: Añadir etiquetas a una tarea existente
    Given el panel de detalle de una tarea está abierto
    When el usuario hace clic en el selector de etiquetas
    And busca y selecciona una o más etiquetas existentes
    Then las etiquetas seleccionadas aparecen como chips en el detalle
    And el array "labelIds" de la tarea se actualiza en IndexedDB

  Scenario: Fecha de creación no editable
    Given el panel de detalle de una tarea está abierto
    When el usuario intenta modificar el campo "Creado el"
    Then el campo no responde a la edición
    And muestra la fecha original en formato legible (ej. "25 mar 2026, 10:43")
```
