# US-51 — Auto-orden por columna en tareas movidas

> **Área**: Tablero Kanban  
> **Prioridad**: Alta  
> **Referencia**: [improvements-15-column-auto-order.md](../requirements/improvements-15-column-auto-order.md)

---

## Historia de usuario

**Como** usuario del tablero,
**quiero** que las tareas se ordenen de menor a mayor automáticamente al moverlas,
**para** mantener cada columna organizada sin tener que corregir el orden manualmente todo el tiempo.

---

## Criterios de aceptación

```gherkin
Feature: Auto-orden por columna al mover tareas

  Scenario: Ordenar automáticamente al mover tareas
    Given una columna tiene activada la opción de auto-orden
    When el usuario mueve una tarea dentro de esa columna o hacia ella
    Then las tareas se muestran de menor a mayor por el campo "order"
    And el orden queda persistido en IndexedDB

  Scenario: Habilitar la opción por columna específica
    Given el usuario abre la configuración de una columna
    When activa la opción "Auto-ordenar tareas (menor a mayor)"
    Then solo esa columna usa auto-orden
    And las demás columnas mantienen su comportamiento actual

  Scenario: Desactivar auto-orden en una columna
    Given una columna tiene auto-orden activado
    When el usuario desactiva la opción
    Then la columna vuelve a permitir ordenamiento manual
    And no se modifica la configuración de otras columnas

  Scenario: Persistencia de la configuración
    Given el usuario ha configurado auto-orden en una o más columnas
    When cierra y vuelve a abrir la aplicación
    Then el estado de auto-orden por columna se restaura correctamente
```

---

## Notas técnicas

- Reutilizar la lógica actual de actualización de `order` del drag & drop.
- Añadir una propiedad booleana por columna para habilitar/deshabilitar auto-orden.
- Mantener compatibilidad con columnas existentes sin migraciones destructivas.
