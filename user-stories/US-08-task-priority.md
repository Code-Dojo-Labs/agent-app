# US-08 — Prioridad de tarea

> **Área**: Gestión de tareas  
> **Prioridad**: Media  
> **Referencia**: [functional-requirements.md — RF-02.7](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** asignar un nivel de prioridad a cada tarea y verlo reflejado visualmente en la tarjeta,  
**para** identificar de un vistazo qué trabajo requiere atención inmediata.

---

## Criterios de aceptación

```gherkin
Feature: Prioridad de las tareas

  Scenario: Valor de prioridad por defecto al crear una tarea
    Given el usuario crea una tarea sin especificar prioridad
    When la tarea se guarda
    Then la prioridad asignada es "Media" (medium)

  Scenario: Visualización del ícono de prioridad en la tarjeta
    Given el tablero muestra tarjetas de tareas
    When el usuario observa una tarjeta
    Then ve el ícono y texto de su prioridad en la parte inferior izquierda:
      | Prioridad | Ícono | Texto   |
      | low       | ⬇️    | Baja    |
      | medium    | ➡️    | Media   |
      | high      | ⬆️    | Alta    |
      | urgent    | 🔥    | Urgente |

  Scenario: Cambiar la prioridad desde el panel de detalle
    Given el panel de detalle de una tarea está abierto
    When el usuario despliega el selector de prioridad
    And selecciona "Urgente"
    Then el campo "priority" se actualiza a "urgent" en IndexedDB
    And la tarjeta en el tablero muestra el ícono 🔥 y el texto "Urgente"

  Scenario: Filtrar tareas por prioridad
    Given el usuario activa el toolbar de filtros
    When selecciona una o más prioridades en el selector correspondiente
    Then solo se muestran las tareas que coinciden con las prioridades seleccionadas en todas las columnas
    And el conteo de tareas visibles en cada columna se actualiza
```
