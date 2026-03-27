# US-26 — Agrupación de tareas por proyectos

> **Área**: Gestión de tareas  
> **Prioridad**: Baja  
> **Referencia**: [improvements.md — MS-10 (proyectos)](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** agrupar mis tareas bajo proyectos con identificadores legibles,  
**para** organizar el trabajo por contexto y localizar tareas rápidamente usando prefijos como "WEB-001".

---

## Criterios de aceptación

```gherkin
Feature: Agrupación de tareas por proyectos

  Scenario: Crear un nuevo proyecto
    Given el usuario accede a la sección de gestión de proyectos
    When introduce un nombre, un prefijo (máximo 5 caracteres, uppercase) y una descripción
    And confirma la creación
    Then el proyecto se crea con un UUID y "nextTaskNumber" inicializado en 1
    And se persiste en IndexedDB en el object store "projects"

  Scenario: Prefijo de proyecto debe ser único
    Given ya existe un proyecto con el prefijo "WEB"
    When el usuario intenta crear otro proyecto con el mismo prefijo "WEB"
    Then el sistema muestra un error indicando que el prefijo ya existe
    And no se crea el proyecto

  Scenario: Prefijo con formato inválido
    Given el usuario está creando un proyecto
    When introduce un prefijo con más de 5 caracteres o con caracteres no alfabéticos
    Then el sistema muestra un error de validación
    And no permite guardar el proyecto

  Scenario: Asignar tarea a un proyecto genera identificador legible
    Given existe un proyecto "Web App" con prefijo "WEB" y nextTaskNumber en 5
    When el usuario crea una tarea asignada a ese proyecto
    Then la tarea recibe el taskNumber "WEB-005"
    And el campo "nextTaskNumber" del proyecto se incrementa a 6
    And la tarea se persiste con "projectId" apuntando al proyecto

  Scenario: Proyecto por defecto "General"
    Given el usuario abre la aplicación por primera vez
    When se inicializa la base de datos
    Then se crea un proyecto por defecto llamado "General" con prefijo "GEN"
    And las tareas creadas sin proyecto específico se asignan a "General"

  Scenario: Filtrar tablero por proyecto
    Given existen tareas en los proyectos "WEB" y "API"
    When el usuario selecciona el filtro de proyecto "WEB"
    Then solo se muestran las tareas del proyecto "WEB" en el tablero
    And el conteo de tareas por columna se actualiza según el filtro

  Scenario: Mostrar identificador de proyecto en la tarjeta
    Given una tarea pertenece al proyecto "WEB" con taskNumber "WEB-003"
    When el usuario visualiza la tarjeta en el tablero
    Then la tarjeta muestra el identificador "WEB-003" de forma visible

  Scenario: Editar un proyecto
    Given existe un proyecto "Web App"
    When el usuario edita su nombre o descripción
    And confirma los cambios
    Then el proyecto se actualiza en IndexedDB
    And el prefijo no puede ser modificado (es inmutable)

  Scenario: Eliminar un proyecto reasigna tareas al proyecto General
    Given existe un proyecto "API" con tareas asignadas
    When el usuario elimina el proyecto "API"
    And confirma la eliminación
    Then las tareas de "API" se reasignan al proyecto "General"
    And el proyecto "API" se elimina de IndexedDB
```

---

## Notas técnicas

- Nuevo object store `projects` en IndexedDB con índice `by-prefix` (unique).
- Interfaz `Project`: `{ id, name, prefix, description, nextTaskNumber, createdAt }`.
- Añadir `projectId: string` y `taskNumber: string` a la interfaz `Task`.
- Nuevo índice `by-project` en el store `tasks`.
- Migración de base de datos `v1 → v2`.
