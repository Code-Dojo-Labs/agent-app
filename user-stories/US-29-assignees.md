# US-29 — Asignación de personas

> **Área**: Gestión de tareas  
> **Prioridad**: Opcional  
> **Referencia**: [improvements.md — MS-08 (asignación)](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación que trabaja en equipo,  
**quiero** asignar personas a cada tarea y ver quién es responsable desde la tarjeta del tablero,  
**para** distribuir el trabajo de forma clara y saber de un vistazo quién está a cargo de cada tarea.

---

## Criterios de aceptación

```gherkin
Feature: Asignación de personas a tareas

  Scenario: Crear una persona en el directorio local
    Given el usuario accede a la gestión de personas
    When introduce un nombre y opcionalmente un avatar (emoji o inicial)
    And confirma la creación
    Then la persona se guarda en IndexedDB con un UUID generado automáticamente
    And aparece disponible en el selector de asignación de tareas

  Scenario: Asignar una persona a una tarea
    Given una tarea existe y hay personas en el directorio
    When el usuario abre el panel de detalle de la tarea
    And selecciona una o más personas del selector de asignación
    Then las personas se asignan a la tarea
    And el campo "assignees" se actualiza en IndexedDB

  Scenario: Mostrar avatar de personas asignadas en la tarjeta
    Given una tarea tiene personas asignadas
    When el usuario visualiza la tarjeta en el tablero
    Then la tarjeta muestra los avatares (emoji o inicial) de las personas asignadas

  Scenario: Desasignar una persona de una tarea
    Given una tarea tiene personas asignadas
    When el usuario elimina una persona de la lista de asignados
    Then la persona se desasocia de la tarea
    And el avatar desaparece de la tarjeta

  Scenario: Filtrar tablero por persona asignada
    Given el tablero tiene tareas asignadas a diferentes personas
    When el usuario selecciona un filtro por persona
    Then solo se muestran las tareas asignadas a la persona seleccionada
    And el conteo de tareas por columna se actualiza según el filtro

  Scenario: Tarea sin personas asignadas
    Given una tarea no tiene personas asignadas
    When el usuario visualiza la tarjeta en el tablero
    Then no se muestra ningún avatar ni indicador de asignación

  Scenario: Editar una persona del directorio
    Given existe una persona en el directorio
    When el usuario edita su nombre o avatar
    And confirma los cambios
    Then los cambios se reflejan en todas las tarjetas donde está asignada

  Scenario: Eliminar una persona del directorio
    Given existe una persona asignada a varias tareas
    When el usuario elimina la persona del directorio
    And confirma la eliminación
    Then la persona se elimina de IndexedDB
    And se desasocia automáticamente de todas las tareas
```

---

## Notas técnicas

- Nuevo object store `persons` en IndexedDB.
- Añadir `assignees: string[]` (lista de IDs de personas) a la interfaz `Task`.
- Gestión local de personas (sin autenticación externa, mantiene offline-first).
- Avatar: emoji seleccionado o inicial generada a partir del nombre.
