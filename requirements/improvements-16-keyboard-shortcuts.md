# Improvement 16 — Paleta de Comandos Global con Atajos de Teclado

> **Área**: UI/UX  
> **Prioridad**: Media  
> **Estado**: Implementado  
> **Referencia**: US-46, Issue #113

---

## Problema que resuelve

La aplicación carecía de una forma rápida de ejecutar acciones sin abandonar el teclado. Los usuarios debían hacer clic en múltiples botones para abrir diálogos, cambiar de vista o gestionar configuraciones.

---

## Propuesta de solución

Implementar una **paleta de comandos global** (al estilo VS Code / Linear) accesible con `Cmd/Ctrl+K` que permita:

- Buscar y ejecutar comandos de la aplicación.
- Buscar tareas existentes del tablero activo.
- Crear tareas nuevas rápidamente.
- Ver el historial de comandos usados recientemente.

### Comandos disponibles

| Categoría     | ID                 | Acción                 | Atajo |
| ------------- | ------------------ | ---------------------- | ----- |
| Tablero       | `board:new`        | Nuevo tablero          | —     |
| Tablero       | `board:export`     | Exportar tablero       | —     |
| Tablero       | `board:import`     | Importar tablero       | —     |
| Vista         | `view:kanban`      | Cambiar a vista Kanban | —     |
| Vista         | `view:list`        | Cambiar a vista Lista  | —     |
| Vista         | `view:boards`      | Volver a tableros      | —     |
| Tareas        | `task:new`         | Nueva tarea            | `N`   |
| Tareas        | `task:search`      | Buscar tareas          | `/`   |
| Configuración | `config:labels`    | Gestionar etiquetas    | —     |
| Configuración | `config:projects`  | Gestionar proyectos    | —     |
| Configuración | `config:people`    | Gestionar personas     | —     |
| Configuración | `config:templates` | Gestionar plantillas   | —     |
| Configuración | `config:theme`     | Personalizar tema      | —     |
| Configuración | `config:wiki`      | Abrir guía de usuario  | `?`   |

### Búsqueda difusa (fuzzy search)

- Algoritmo propio, sin dependencias externas.
- Los caracteres del query deben aparecer en orden en el texto destino.
- Bonificación por coincidencias consecutivas para priorizar resultados compactos.
- Resultados mixtos: comandos + tareas (en vista de tablero) + opción de crear tarea.

### Historial

- Se almacena en `localStorage` con la clave `dojo-palette-history`.
- Máximo 10 comandos recientes.
- Se muestra al abrir la paleta sin query (si hay historial previo).

---

## Criterios de aceptación

```gherkin
Feature: Paleta de comandos global con atajos de teclado

  Scenario: Abrir paleta con Cmd+K / Ctrl+K
    Given el usuario está en cualquier pantalla
    When presiona Cmd+K o Ctrl+K
    Then se abre la paleta de comandos con el foco en el campo de búsqueda

  Scenario: Navegar con teclado y ejecutar comando
    Given la paleta está abierta y muestra comandos
    When el usuario navega con flechas y presiona Enter
    Then la acción correspondiente al comando se ejecuta

  Scenario: Historial persistente entre sesiones
    Given el usuario ha ejecutado comandos en sesiones anteriores
    When abre la paleta sin escribir nada
    Then ve los comandos que ejecutó recientemente (máximo 10)

  Scenario: Filtrado combinado comandos + tareas
    Given el usuario está en un tablero y escribe en la paleta
    Then los resultados incluyen comandos y tareas coincidentes
    And se muestra la opción de crear tarea si no hay coincidencia exacta
```

---

## Alcance

- Paleta de comandos con 14 acciones agrupadas en 4 categorías.
- Búsqueda difusa en nombres de comandos y títulos de tareas.
- Historial de comandos recientes en localStorage.
- Badges de atajos de teclado en la UI.
- Integración con todos los managers existentes del app.

## Fuera de alcance

- Comandos configurables por el usuario.
- Atajos de teclado personalizables.
- Sincronización del historial en la nube.
