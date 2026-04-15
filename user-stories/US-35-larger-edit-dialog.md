# US-35 — Área de edición de tickets más grande (90% del viewport)

> **Área**: UI/UX — Edición de tareas  
> **Prioridad**: Alta  
> **Referencia**: [improvements-04-larger-edit-dialog.md](../requirements/improvements-04-larger-edit-dialog.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** que el panel de edición de una tarea se muestre como un modal amplio centrado en pantalla,  
**para** trabajar cómodamente con descripciones extensas, subtareas e historial sin sentirme limitado por el espacio.

---

## Criterios de aceptación

```gherkin
Feature: Modal de edición de tickets al 90% del viewport

  Scenario: Abrir el panel de edición como modal centrado
    Given el tablero muestra tareas en las columnas
    When el usuario hace clic sobre una tarjeta de tarea
    Then se abre un modal centrado en pantalla
    And el modal ocupa el 90% del ancho (90vw) y el 90% del alto (90vh) del viewport
    And el fondo queda oscurecido por un backdrop semitransparente

  Scenario: Animación de apertura fade + scale
    Given el usuario hace clic sobre una tarjeta de tarea
    When el modal comienza a abrirse
    Then aparece con una animación de fade y escala (scale 0.96 → 1, opacity 0 → 1)
    And la transición dura aproximadamente 220ms con curva ease

  Scenario: Contenido interno con scroll independiente
    Given el modal de edición está abierto con contenido extenso
    When el usuario hace scroll dentro del modal
    Then solo el contenido interno se desplaza
    And el header y footer del modal permanecen fijos y siempre visibles

  Scenario: Cerrar el modal haciendo clic en el backdrop
    Given el modal de edición está abierto
    When el usuario hace clic fuera del modal (sobre el backdrop)
    Then el modal se cierra con la animación inversa
    And el foco vuelve al elemento que disparó la apertura (tarjeta en el tablero)

  Scenario: Cerrar el modal con el botón de cierre
    Given el modal de edición está abierto
    When el usuario hace clic en el botón "✕" del header
    Then el modal se cierra correctamente
    And el foco vuelve al elemento disparador

  Scenario: Cerrar el modal con la tecla Escape
    Given el modal de edición está abierto
    When el usuario presiona la tecla Escape
    Then el modal se cierra correctamente

  Scenario: Foco atrapado dentro del modal mientras está abierto
    Given el modal de edición está abierto
    When el usuario navega con la tecla Tab
    Then el foco cicla únicamente entre los elementos interactivos del modal
    And no es posible enfocar elementos del tablero que quedan detrás

  Scenario: Modal responsivo en dispositivos móviles
    Given el usuario accede desde un dispositivo con pantalla menor a 768px
    When abre el panel de edición de una tarea
    Then el modal ocupa el 100% del ancho y alto del viewport (pantalla completa)
    And las columnas internas (si las hay) colapsan a una sola columna vertical

  Scenario: Cumplimiento de accesibilidad ARIA
    Given el modal de edición está abierto
    When se inspecciona el DOM del componente
    Then el elemento contenedor tiene role="dialog"
    And tiene el atributo aria-modal="true"
    And tiene aria-labelledby apuntando al elemento del título de la tarea
```
