# US-15 — Búsqueda y filtrado de tareas

> **Área**: UI / Experiencia de usuario  
> **Prioridad**: Media  
> **Referencia**: [ui-ux.md — Toolbar de filtros](../requirements/ui-ux.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** buscar tareas por texto y filtrarlas por prioridad o etiqueta,  
**para** encontrar rápidamente las tareas relevantes cuando el tablero contiene muchas tarjetas.

---

## Criterios de aceptación

```gherkin
Feature: Búsqueda y filtrado de tareas en el tablero

  Scenario: Búsqueda de texto en tiempo real
    Given el toolbar de filtros está visible
    When el usuario escribe texto en el campo "Buscar..."
    Then el sistema filtra las tareas cuyo título o descripción contiene el texto escrito
    And el filtro se aplica con un debounce de 300ms (sin búsqueda en cada tecla)
    And las tareas que no coinciden se ocultan en el tablero

  Scenario: Filtrar por prioridad
    Given el toolbar de filtros está visible
    When el usuario selecciona una o más prioridades en el selector correspondiente
    Then solo se muestran las tareas que tienen alguna de las prioridades seleccionadas
    And el filtro afecta a todas las columnas del tablero simultáneamente

  Scenario: Filtrar por etiqueta
    Given el toolbar de filtros está visible
    When el usuario selecciona una o más etiquetas en el selector de etiquetas del filtro
    Then solo se muestran las tareas que tienen al menos una de las etiquetas seleccionadas
    And el filtro afecta a todas las columnas del tablero simultáneamente

  Scenario: Combinar múltiples filtros
    Given el toolbar de filtros está visible
    When el usuario aplica búsqueda por texto Y prioridad Y etiqueta al mismo tiempo
    Then solo se muestran las tareas que cumplen todos los criterios simultáneamente

  Scenario: Limpiar todos los filtros
    Given hay filtros activos (texto, prioridad o etiqueta)
    When el usuario hace clic en el botón "Limpiar filtros"
    Then todos los filtros se resetean
    And el tablero vuelve a mostrar todas las tareas sin restricción
    And el botón "Limpiar filtros" desaparece (solo visible cuando hay filtros activos)

  Scenario: Conteo de tareas actualizado con filtros activos
    Given hay filtros activos
    When el tablero renderiza las columnas
    Then cada columna muestra el conteo en formato "X / Y" (visibles / totales)
    And al limpiar los filtros el conteo vuelve a mostrar solo el total

  Scenario: Toolbar colapsable
    Given el usuario está en el tablero
    When hace clic en el botón de filtro (ícono de embudo)
    Then el toolbar de filtros se expande o colapsa
    And si se colapsa con filtros activos, los filtros siguen aplicados
```
