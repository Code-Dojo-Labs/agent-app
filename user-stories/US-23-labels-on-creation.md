# US-23 — Etiquetas durante la creación de tareas

> **Área**: Gestión de tareas  
> **Prioridad**: Media  
> **Referencia**: [improvements.md — MS-07 (etiquetas)](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** asignar etiquetas a una tarea directamente desde el diálogo de creación,  
**para** clasificar mis tareas desde el momento en que las creo sin necesidad de un segundo paso.

---

## Criterios de aceptación

```gherkin
Feature: Asignar etiquetas al crear una tarea

  Scenario: Seleccionar etiquetas existentes durante la creación
    Given el usuario está en el diálogo de creación de tarea
    And existen etiquetas previamente creadas
    When selecciona una o más etiquetas del selector
    And completa el título y confirma la creación
    Then la tarea se crea con las etiquetas seleccionadas asignadas
    And el campo "labelIds" del evento de creación incluye los IDs de las etiquetas

  Scenario: Crear una etiqueta nueva inline durante la creación de tarea
    Given el usuario está en el diálogo de creación de tarea
    When escribe un nombre de etiqueta que no existe en el selector
    And selecciona la opción "Crear etiqueta '[nombre]'"
    And elige un color y confirma
    Then la nueva etiqueta se crea y se persiste en IndexedDB
    And la etiqueta queda seleccionada automáticamente en el diálogo de creación

  Scenario: Crear tarea sin etiquetas (opcional)
    Given el usuario está en el diálogo de creación de tarea
    When completa el título sin seleccionar ninguna etiqueta
    And confirma la creación
    Then la tarea se crea correctamente sin etiquetas asignadas

  Scenario: Quitar una etiqueta seleccionada antes de confirmar
    Given el usuario ha seleccionado etiquetas en el diálogo de creación
    When hace clic en la "X" de una etiqueta seleccionada
    Then la etiqueta se deselecciona del listado
    And no se incluirá en la tarea al confirmar la creación

  Scenario: El diálogo se adapta para mostrar el selector de etiquetas
    Given el usuario abre el diálogo de creación de tarea
    When el diálogo se renderiza
    Then el diálogo tiene un ancho máximo de 560px
    And el textarea de descripción tiene un mínimo de 120px de altura y 5 filas
    And el selector de etiquetas es visible dentro del formulario
```

---

## Notas técnicas

- Componente afectado: `dojo-task-dialog`.
- El evento `dojo:dialog-create-task` debe incluir `labelIds: string[]`.
- El handler de creación en `dojo-kanban-board` debe procesar `labelIds`.
- Ampliar el diálogo: `max-width: 560px`, textarea `rows: 5`, `min-height: 120px`.
