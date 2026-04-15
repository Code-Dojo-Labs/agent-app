# US-36 — Templates para la creación de tickets

> **Área**: Gestión de tareas  
> **Prioridad**: Media  
> **Referencia**: [improvements-05-task-templates.md](../requirements/improvements-05-task-templates.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** crear y reutilizar plantillas predefinidas al crear nuevas tareas,  
**para** acelerar la creación de tareas recurrentes (bug reports, features, etc.) sin repetir el mismo relleno manual cada vez.

---

## Criterios de aceptación

```gherkin
Feature: Templates para la creación de tickets

  Scenario: Crear un nuevo template
    Given el usuario accede a la sección de gestión de templates
    When hace clic en "Nuevo template"
    And introduce un nombre obligatorio para el template (ej. "Bug Report")
    And opcionalmente rellena: descripción Markdown, prioridad, etiquetas, asignados
    And confirma la creación
    Then el template se persiste en el object store "taskTemplates" de IndexedDB
    And aparece en la lista de templates disponibles

  Scenario: Ver la lista de templates existentes
    Given existen templates creados por el usuario
    When accede a la sección de gestión de templates
    Then se muestra una lista con el nombre de cada template
    And cada entrada muestra las opciones de editar y eliminar

  Scenario: Editar un template existente
    Given el usuario está en la lista de templates
    When hace clic en "Editar" sobre un template
    And modifica uno o más campos
    And guarda los cambios
    Then el template actualizado se persiste en IndexedDB
    And la lista refleja los nuevos valores

  Scenario: Eliminar un template
    Given el usuario está en la lista de templates
    When hace clic en "Eliminar" sobre un template
    And confirma la eliminación en el diálogo de confirmación
    Then el template se elimina del object store "taskTemplates" en IndexedDB
    And desaparece de la lista de templates
    And las tareas creadas previamente con ese template no se ven afectadas

  Scenario: Selector de template en el diálogo de creación de tarea
    Given el usuario abre el diálogo de creación de tarea
    And existen templates definidos
    When visualiza el formulario
    Then aparece un selector "Usar template" en la parte superior del formulario
    And el selector lista todos los templates disponibles

  Scenario: Selector de template oculto si no hay templates
    Given no existe ningún template creado
    When el usuario abre el diálogo de creación de tarea
    Then el selector "Usar template" no aparece en el formulario
    And el formulario se muestra vacío como de costumbre

  Scenario: Aplicar un template al formulario de creación
    Given el diálogo de creación de tarea está abierto
    And existen templates disponibles
    When el usuario selecciona un template del selector
    Then los campos del formulario se auto-rellenan con los valores del template:
      descripción, prioridad, etiquetas y asignados
    And el campo título permanece vacío para ser rellenado manualmente

  Scenario: El usuario puede modificar los campos pre-rellenados por el template
    Given el usuario ha seleccionado un template
    And los campos del formulario están auto-rellenados
    When modifica cualquiera de los campos pre-rellenados
    Then los cambios se aceptan sin restricciones
    And solo los valores modificados finales se guardan en la nueva tarea

  Scenario: Crear tarea sin seleccionar ningún template
    Given el diálogo de creación de tarea está abierto
    When el usuario no selecciona ningún template
    And rellena el formulario manualmente
    And confirma la creación
    Then la tarea se crea con los datos introducidos manualmente
    And el comportamiento es idéntico al existente
```
