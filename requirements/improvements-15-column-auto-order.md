# Improvement 15 — Auto-orden por columna (menor a mayor)

> **Área**: Tablero Kanban  
> **Prioridad**: Alta  
> **Estado**: Propuesto  
> **Referencia**: US-46

---

## Problema que resuelve

Actualmente, al mover tareas entre columnas o dentro de la misma columna, el orden puede quedar inconsistente y percibirse como desordenado.

Esto afecta la lectura del flujo de trabajo y obliga al usuario a reordenar manualmente tareas que ya habia acomodado.

---

## Propuesta de solución

Agregar una opción de **auto-orden por columna** para mantener las tareas en orden **ascendente (menor a mayor)** usando el campo `order`.

### Comportamiento funcional

- Cada columna tendrá un toggle: **"Auto-ordenar tareas (menor a mayor)"**.
- Si el toggle está activo en una columna:
  - Al crear, mover o soltar una tarea en esa columna, se recalcula el orden.
  - La lista siempre se muestra con `order ASC`.
- Si el toggle está inactivo:
  - La columna mantiene el comportamiento manual actual.
- La configuración se guarda por columna y persiste después de recargar la aplicación.

### Reglas de negocio

- `order` es la fuente única de verdad para el orden visual.
- La normalización evita duplicados y huecos (`1, 2, 3, ... n`).
- Activar o desactivar el auto-orden no cambia de columna ninguna tarea ni elimina datos.

---

## Criterios de aceptación

```gherkin
Feature: Auto-orden por columna configurable

  Scenario: Activar auto-orden en una columna específica
    Given una columna tiene auto-orden desactivado
    When el usuario activa "Auto-ordenar tareas (menor a mayor)"
    Then la configuración queda guardada para esa columna
    And las tareas se muestran en orden ascendente por "order"

  Scenario: Mover tarea a columna con auto-orden activo
    Given la columna destino tiene auto-orden activado
    When el usuario mueve una tarea a dicha columna
    Then la tarea queda posicionada según orden ascendente
    And los valores "order" de la columna se normalizan sin huecos

  Scenario: Columna sin auto-orden
    Given la columna tiene auto-orden desactivado
    When el usuario reordena tareas manualmente
    Then el sistema respeta el orden manual aplicado

  Scenario: Persistencia por columna
    Given el usuario configura columnas con estados distintos de auto-orden
    When recarga la aplicación
    Then cada columna mantiene su configuración previamente guardada
```

---

## Alcance

- Configuración por columna.
- Orden ascendente estable por `order`.
- Persistencia local de la preferencia.

## Fuera de alcance

- Ordenamiento por múltiples criterios (prioridad, fecha, titulo).
- Regla global única para todas las columnas.
