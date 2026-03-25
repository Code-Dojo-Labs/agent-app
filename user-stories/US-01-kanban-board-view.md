# US-01 — Visualización del tablero Kanban

> **Área**: Tablero  
> **Prioridad**: Alta  
> **Referencia**: [functional-requirements.md — RF-01.1](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** ver un tablero Kanban con columnas que representan los estados de mis tareas,  
**para** tener una visión general del estado de todo mi trabajo de un solo vistazo.

---

## Criterios de aceptación

```gherkin
Feature: Visualización del tablero Kanban

  Scenario: Tablero cargado con columnas por defecto
    Given el usuario abre la aplicación por primera vez
    When no existen datos previos en IndexedDB
    Then el tablero debe mostrar las 6 columnas por defecto: Backlog, Por hacer, En progreso, En revisión, Hecho, Bloqueado
    And cada columna debe mostrar su ícono correspondiente
    And cada columna debe mostrar el conteo de tareas (0 al inicio)

  Scenario: Cabecera de columna con información completa
    Given el tablero está cargado con columnas y tareas
    When el usuario observa la cabecera de una columna
    Then debe ver el ícono de la columna
    And debe ver el nombre de la columna
    And debe ver el número de tareas que contiene entre paréntesis

  Scenario: Scroll vertical independiente por columna
    Given una columna contiene más tareas de las que caben en la pantalla
    When el usuario hace scroll dentro de esa columna
    Then solo esa columna desplaza su contenido verticalmente
    And las demás columnas permanecen en su posición

  Scenario: Scroll horizontal del tablero
    Given el tablero tiene más columnas de las que caben en pantalla
    When el usuario hace scroll horizontal en el tablero
    Then todas las columnas se desplazan horizontalmente
    And el header de la aplicación permanece fijo

  Scenario: Conteo de tareas actualizado tras filtro activo
    Given el usuario tiene filtros activos (por prioridad o etiqueta)
    When se aplica el filtro
    Then la cabecera de cada columna muestra "X / Y" (visibles / totales)
    And el conteo se actualiza en tiempo real al cambiar los filtros
```
