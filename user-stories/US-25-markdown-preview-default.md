# US-25 — Vista previa Markdown por defecto

> **Área**: Gestión de tareas  
> **Prioridad**: Media  
> **Referencia**: [improvements.md — MS-09 (vista previa)](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** que al abrir el panel de detalle de una tarea la descripción se muestre en modo vista previa (Markdown renderizado) por defecto,  
**para** leer la descripción de forma legible sin tener que cambiar manualmente de pestaña.

---

## Criterios de aceptación

```gherkin
Feature: Vista previa Markdown por defecto en el panel de detalle

  Scenario: Abrir tarea con descripción muestra vista previa
    Given una tarea tiene una descripción con contenido Markdown
    When el usuario abre el panel de detalle de la tarea
    Then la descripción se muestra en modo "Vista previa" (Markdown renderizado)
    And el tab "Vista previa" está activo por defecto

  Scenario: Cambiar a modo edición desde vista previa
    Given el usuario está viendo la descripción de una tarea en modo vista previa
    When hace clic en el tab "Editar"
    Then la descripción se muestra en un textarea editable con el contenido Markdown sin renderizar
    And el usuario puede modificar el texto

  Scenario: Volver a modo vista previa después de editar
    Given el usuario está editando la descripción en el tab "Editar"
    When hace clic en el tab "Vista previa"
    Then la descripción se renderiza nuevamente como Markdown
    And los cambios realizados se reflejan en la vista previa

  Scenario: Tarea con descripción vacía muestra modo edición
    Given una tarea no tiene descripción (campo vacío)
    When el usuario abre el panel de detalle de la tarea
    Then se muestra directamente el modo edición con el textarea visible
    And el textarea muestra un placeholder indicando que puede escribir una descripción

  Scenario: Tarea con descripción de solo espacios muestra modo edición
    Given una tarea tiene una descripción que contiene solo espacios o saltos de línea
    When el usuario abre el panel de detalle
    Then se muestra el modo edición con el textarea visible
```

---

## Notas técnicas

- Componente afectado: `dojo-task-detail` (método `_buildDescriptionField`).
- La lógica de decisión: si `description` está vacía o solo contiene whitespace, mostrar modo edición; de lo contrario, mostrar vista previa.
