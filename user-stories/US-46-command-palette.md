# US-46 — Paleta de Comandos Global (Command Palette)

> **Área**: UI/UX  
> **Prioridad**: Media  
> **Referencia**: [improvements.md — Improvement 16](../requirements/improvements-16-keyboard-shortcuts.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** una paleta de comandos global activada con `Cmd/Ctrl+K` que me permita buscar tareas, ejecutar acciones y navegar con el teclado,  
**para** interactuar con el tablero de forma ágil sin depender exclusivamente del ratón.

---

## Criterios de aceptación

```gherkin
Feature: Paleta de comandos global

  Scenario: Abrir la paleta con atajo de teclado
    Given el usuario está en cualquier pantalla de la aplicación
    When presiona Cmd+K (macOS) o Ctrl+K (Windows/Linux)
    Then se abre la paleta de comandos centrada en la pantalla
    And el campo de búsqueda recibe el foco automáticamente

  Scenario: Mostrar comandos disponibles al abrir sin query
    Given la paleta de comandos está abierta sin texto en el campo
    Then se muestran los comandos usados recientemente (si existen)
    Or se muestran todos los comandos disponibles agrupados por categoría

  Scenario: Buscar comandos por nombre
    Given la paleta de comandos está abierta
    When el usuario escribe "nueva"
    Then aparecen los comandos cuyo nombre o descripción coincide con "nueva"
    And los resultados se ordenan por relevancia de búsqueda difusa (fuzzy)

  Scenario: Buscar tareas existentes
    Given el usuario está en la vista de un tablero
    When escribe un término que coincide con una tarea
    Then aparecen resultados de tipo "Tarea" con su título y columna

  Scenario: Navegar entre resultados con teclado
    Given la paleta muestra resultados
    When el usuario presiona las flechas arriba/abajo
    Then la selección se desplaza entre los resultados
    And el resultado seleccionado se resalta visualmente

  Scenario: Ejecutar un comando
    Given la paleta muestra comandos
    When el usuario selecciona un comando con Enter o clic
    Then la paleta se cierra
    And la acción correspondiente se ejecuta (abrir diálogo, cambiar vista, etc.)
    And el comando queda registrado en el historial

  Scenario: Crear tarea rápida desde la paleta
    Given la paleta está abierta con un texto que no coincide con comandos ni tareas
    When el usuario selecciona "Crear tarea: '[texto]'"
    Then se abre el diálogo de creación de tarea con el título prellenado

  Scenario: Cerrar la paleta
    Given la paleta de comandos está abierta
    When el usuario presiona Escape o hace clic fuera de la paleta
    Then la paleta se cierra sin ejecutar ninguna acción

  Scenario: Comandos que requieren tablero
    Given el usuario está en la vista de selección de tableros
    When abre la paleta de comandos
    Then los comandos que requieren un tablero activo no aparecen en los resultados

  Scenario: Atajos de teclado en los comandos
    Given la paleta muestra la lista de comandos
    Then cada comando que tiene un atajo de teclado muestra la combinación de teclas
```

---

## Notas técnicas

- Activación: `Cmd/Ctrl + K`.
- Componente: `dojo-command-palette` (organismo).
- Búsqueda difusa (fuzzy): algoritmo propio sin dependencias externas; los caracteres del query deben aparecer en orden en el texto objetivo con bonificación por coincidencias consecutivas.
- Historial de comandos: almacenado en `localStorage` bajo la clave `dojo-palette-history` (máximo 10 entradas).
- Comandos organizados en 4 categorías: **Tablero**, **Vista**, **Tareas**, **Configuración**.
- Eventos emitidos:
  - `dojo:palette-command` → `{ commandId: string }` — acción de paleta
  - `dojo:palette-select-task` → `{ taskId: string }` — abrir tarea
  - `dojo:palette-create-task` → `{ title: string }` — crear tarea con título
- Sin dependencias externas; todo implementado con Web APIs nativas y Shadow DOM.
