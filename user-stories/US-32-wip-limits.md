# US-32 — Límites WIP por columna

> **Área**: Tablero Kanban  
> **Prioridad**: Media  
> **Referencia**: [improvements-01-wip-limits.md](../requirements/improvements-01-wip-limits.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** definir un límite máximo de tareas por columna (límite WIP),  
**para** identificar cuellos de botella en el flujo de trabajo y mantener un ritmo sostenible.

---

## Criterios de aceptación

```gherkin
Feature: Límites WIP por columna

  Scenario: Configurar el límite WIP al crear una columna
    Given el usuario abre el diálogo de creación de nueva columna
    When introduce un valor numérico en el campo opcional "Límite WIP"
    And confirma la creación
    Then la columna se crea con el límite WIP persistido en IndexedDB
    And el campo "wipLimit" queda asociado a la columna

  Scenario: Configurar el límite WIP en una columna existente
    Given el usuario abre el menú de opciones de una columna existente
    When selecciona "Editar columna"
    And establece o modifica el valor del campo "Límite WIP"
    And guarda los cambios
    Then el límite queda actualizado en IndexedDB
    And el cambio se refleja visualmente en la cabecera de la columna

  Scenario: Columna dentro del límite WIP
    Given una columna tiene un límite WIP de 5 tareas
    When la columna contiene 3 tareas
    Then el contador de tareas se muestra con el color normal
    And no se muestra ningún indicador de advertencia

  Scenario: Columna próxima a alcanzar el límite WIP
    Given una columna tiene un límite WIP de 5 tareas
    When la columna contiene 4 tareas (80% del límite)
    Then el contador de tareas se muestra en color ámbar
    And se muestra un icono o badge de advertencia "⚠️" en la cabecera

  Scenario: Columna que supera el límite WIP
    Given una columna tiene un límite WIP de 5 tareas
    When la columna contiene 5 o más tareas
    Then el contador de tareas se muestra en color rojo
    And se muestra un badge "🔴" en la cabecera indicando saturación
    And al pasar el cursor sobre el badge se muestra un tooltip explicativo

  Scenario: Agregar tarea a una columna saturada (bloqueo suave)
    Given una columna supera su límite WIP
    When el usuario intenta agregar una nueva tarea a dicha columna
    Then el sistema muestra una advertencia indicando que se ha superado el límite
    And permite continuar igualmente (bloqueo suave, no impeditivo)

  Scenario: Columna sin límite WIP definido
    Given una columna no tiene configurado el campo "wipLimit"
    When el usuario agrega tareas a dicha columna
    Then no se muestra ningún indicador WIP
    And el comportamiento es idéntico al actual

  Scenario: Quitar el límite WIP de una columna
    Given una columna tiene configurado un límite WIP
    When el usuario edita la columna y deja el campo "Límite WIP" vacío
    And guarda los cambios
    Then el campo "wipLimit" queda como null en IndexedDB
    And desaparecen todos los indicadores visuales WIP de esa columna
```
