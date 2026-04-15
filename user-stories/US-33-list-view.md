# US-33 — Vista alternativa de lista / tabla

> **Área**: UI/UX — Tablero  
> **Prioridad**: Media  
> **Referencia**: [improvements-02-list-view.md](../requirements/improvements-02-list-view.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** poder cambiar entre una vista de tablero Kanban y una vista de lista/tabla,  
**para** revisar y gestionar todas mis tareas de forma más eficiente cuando necesito una perspectiva global.

---

## Criterios de aceptación

```gherkin
Feature: Vista alternativa de lista / tabla

  Scenario: Toggle visible en el header
    Given el usuario está en cualquier tablero
    When visualiza el header principal
    Then puede ver un control para alternar entre "Vista Tablero" y "Vista Lista"
    And el control indica claramente cuál vista está activa

  Scenario: Cambiar a vista lista
    Given el usuario está en la vista Kanban
    When hace clic en el toggle "Vista Lista"
    Then la vista Kanban se oculta
    And se muestra una tabla con todas las tareas del tablero
    And las columnas visibles son: Título, Estado, Prioridad, Etiquetas, Asignado a, Vencimiento

  Scenario: Las tareas de todos los estados aparecen en la lista
    Given el tablero tiene tareas en distintas columnas
    When el usuario cambia a vista lista
    Then todas las tareas de todos los estados aparecen como filas en la tabla
    And cada fila muestra el estado correspondiente de la tarea

  Scenario: Abrir edición desde la vista lista
    Given el usuario está en la vista lista
    When hace clic sobre el título de una tarea
    Then se abre el panel de edición de la tarea (dojo-task-detail)
    And al cerrar el panel, el usuario regresa a la vista lista

  Scenario: Cambiar el estado de una tarea desde la vista lista
    Given el usuario está en la vista lista
    When hace clic en el selector de estado de una fila
    And selecciona un nuevo estado
    Then el cambio se persiste en IndexedDB
    And la fila actualiza el estado visualmente sin recargar

  Scenario: Ordenar la tabla por columna
    Given el usuario está en la vista lista
    When hace clic en la cabecera de una columna (ej. "Prioridad")
    Then las filas se ordenan según ese criterio de forma ascendente
    And un segundo clic invierte el orden a descendente
    And un tercer clic elimina el ordenamiento

  Scenario: Los filtros activos aplican en la vista lista
    Given el usuario tiene activos filtros de búsqueda o prioridad
    When cambia a la vista lista
    Then la tabla solo muestra las tareas que cumplen los filtros activos
    And la barra de filtros permanece visible y funcional

  Scenario: La preferencia de vista persiste al recargar
    Given el usuario cambió a la vista lista
    When recarga la página
    Then la aplicación vuelve a mostrar la vista lista
    And la preferencia queda guardada en localStorage

  Scenario: Vista responsiva en móvil
    Given el usuario accede desde un dispositivo con pantalla menor a 768px
    When activa la vista lista
    Then las columnas menos importantes (Etiquetas, Asignado a) se ocultan automáticamente
    And la tabla sigue siendo funcional con las columnas principales (Título, Estado, Prioridad)
```
