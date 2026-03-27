# US-28 — Búsqueda global con atajos de teclado

> **Área**: UI/UX  
> **Prioridad**: Baja  
> **Referencia**: [improvements.md — MS-07 (búsqueda global)](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** abrir una paleta de comandos con un atajo de teclado para buscar tareas, navegar a columnas y ejecutar acciones rápidas,  
**para** interactuar con el tablero de forma ágil sin depender exclusivamente del ratón.

---

## Criterios de aceptación

```gherkin
Feature: Búsqueda global con paleta de comandos

  Scenario: Abrir la paleta de comandos con atajo de teclado
    Given el usuario está en cualquier pantalla de la aplicación
    When presiona Cmd+K (macOS) o Ctrl+K (Windows/Linux)
    Then se abre una paleta de comandos centrada en la pantalla
    And el campo de búsqueda tiene el foco automáticamente

  Scenario: Cerrar la paleta de comandos
    Given la paleta de comandos está abierta
    When el usuario presiona Escape o hace clic fuera de la paleta
    Then la paleta se cierra
    And el foco regresa al elemento anterior

  Scenario: Buscar tareas por título
    Given la paleta de comandos está abierta
    When el usuario escribe "login"
    Then se muestran las tareas cuyo título contiene "login"
    And los resultados están ordenados por relevancia (coincidencia en título primero)

  Scenario: Buscar tareas por descripción
    Given la paleta de comandos está abierta
    When el usuario escribe un término que aparece en la descripción de una tarea
    Then se muestran las tareas cuya descripción contiene el término
    And las coincidencias en título tienen mayor prioridad que las de descripción

  Scenario: Navegar a una tarea desde los resultados
    Given la paleta muestra resultados de búsqueda
    When el usuario selecciona una tarea (clic o Enter)
    Then la paleta se cierra
    And se abre el panel de detalle de la tarea seleccionada

  Scenario: Navegar entre resultados con teclado
    Given la paleta de comandos muestra resultados
    When el usuario presiona las flechas arriba/abajo
    Then la selección se desplaza entre los resultados
    And el resultado seleccionado se resalta visualmente

  Scenario: Crear tarea rápida desde la paleta
    Given la paleta de comandos está abierta
    When el usuario escribe un texto que no coincide con tareas existentes
    Then se muestra la opción "Crear tarea: '[texto]'"
    When el usuario selecciona esa opción
    Then se abre el diálogo de creación de tarea con el título prellenado

  Scenario: Búsqueda sin resultados
    Given la paleta de comandos está abierta
    When el usuario escribe un término que no coincide con ninguna tarea
    Then se muestra un mensaje "Sin resultados"
    And se ofrece la opción de crear una nueva tarea con ese texto
```

---

## Notas técnicas

- Estilo inspirado en la paleta de comandos de VS Code o Linear.
- Activación: `Cmd/Ctrl + K`.
- Resultados ordenados por relevancia: título > descripción.
- Considerar debounce para la búsqueda en tiempo real.
