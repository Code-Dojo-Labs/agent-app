# US-45 — Dashboard de Métricas Kanban: Cycle Time, Throughput y CFD

> **Área**: Analytics / Reporting  
> **Prioridad**: Media  
> **Referencia**: [improvements-14-kanban-metrics-dashboard.md](../requirements/improvements-14-kanban-metrics-dashboard.md)

---

## Historia de usuario

**Como** usuario que gestiona proyectos con la aplicación,  
**quiero** acceder a un dashboard con métricas de mi flujo de trabajo (cycle time, throughput, cumulative flow),  
**para** identificar cuellos de botella, mejorar mis estimaciones y optimizar mi proceso continuamente.

---

## Criterios de aceptación

```gherkin
Feature: Dashboard de métricas Kanban

  Scenario: Acceso desde la navegación principal
    Given el usuario está en el tablero
    When hace clic en el icono/enlace de "Analytics" en la barra de navegación
    Then se muestra la pantalla de dashboard de métricas
    And la URL cambia a /analytics o equivalente

  Scenario: Cycle Time — gráfico de dispersión
    Given el tablero tiene tareas completadas en los últimos 30 días
    When el usuario abre el dashboard
    Then ve un gráfico de dispersión con los cycle times de cada tarea
    And se muestran líneas de percentil P50, P85 y P95
    And puede filtrar por etiqueta, asignado o rango de fechas

  Scenario: Throughput — gráfico de barras semanal
    Given el historial de actividad tiene eventos de tareas completadas
    When el usuario visualiza el gráfico de Throughput
    Then ve barras por semana con el número de tareas completadas
    And hay una línea de tendencia (media móvil de 4 semanas)

  Scenario: Cumulative Flow Diagram (CFD)
    Given el tablero tiene historial de cambios de columna
    When el usuario selecciona el rango "último mes"
    Then el CFD muestra áreas apiladas por columna a lo largo del tiempo
    And las áreas que crecen desproporcionadamente indican cuellos de botella

  Scenario: Tasa de cumplimiento de fechas límite
    Given tareas con due_date definida
    When el usuario consulta esta métrica
    Then ve el porcentaje de tareas completadas antes de su fecha límite
    And una lista de tareas vencidas pendientes con enlace directo a cada una

  Scenario: Sin historial suficiente
    Given el tablero tiene menos de 5 tareas completadas
    When el usuario abre el dashboard
    Then ve un estado vacío con mensaje explicativo
    And se sugiere completar más tareas para obtener métricas significativas

  Scenario: Rendimiento con datasets grandes
    Given el tablero tiene más de 500 tareas completadas en el historial
    When el usuario carga el dashboard
    Then todas las métricas se calculan y renderizan en menos de 2 segundos
```

---

## Notas técnicas

- Los datos se extraen del `activity_log` existente en IndexedDB.
- Gráficos implementados con **SVG nativo** o con una librería ligera (Chart.js, uPlot) sin romper Zero Deps.
- Nuevo componente de página `<dojo-analytics-view>`.
- Cycle Time: delta entre evento `moved_to:En Progreso` y `moved_to:Hecho` en activity_log.
- Los filtros se aplican en memoria sobre los datos de IndexedDB.
