# US-39 — Diseño Moderno de Tarjetas de Tarea

> **Área**: UI / UX  
> **Prioridad**: Alta  
> **Referencia**: [improvements-08-modern-card-design.md](../requirements/improvements-08-modern-card-design.md)

---

## Historia de usuario

**Como** usuario del tablero Kanban,  
**quiero** que las tarjetas de tarea tengan un diseño visual moderno con jerarquía clara y animaciones de hover,  
**para** identificar rápidamente la prioridad, estado y metadatos de cada tarea de un solo vistazo.

---

## Criterios de aceptación

```gherkin
Feature: Diseño moderno de dojo-task-card

  Scenario: Barra de acento por prioridad
    Given una tarea con prioridad "Alta"
    When se renderiza su tarjeta en el tablero
    Then aparece una barra vertical de 3px en el lado izquierdo
    And el color de la barra es #F97316 (naranja, prioridad Alta)
    And los colores por prioridad son:
      | Prioridad | Color   |
      | Baja      | #3B82F6 |
      | Media     | #F59E0B |
      | Alta      | #F97316 |
      | Urgente   | #DC2626 |

  Scenario: Efecto hover de elevación
    Given una tarjeta en reposo
    When el usuario pasa el cursor sobre ella
    Then la tarjeta aplica transform: translateY(-2px)
    And la sombra se profundiza (box-shadow multicapa)
    And la transición dura 0.15s con easing ease

  Scenario: Layout interno en 3 zonas
    Given una tarea con etiquetas, título y metadatos
    When se renderiza la tarjeta
    Then la zona superior muestra los chips de etiquetas
    And la zona central muestra el título con tipografía prominente
    And la zona inferior muestra metadatos (prioridad, fecha, asignados) en fila horizontal

  Scenario: Focus accesible
    Given el usuario navega con teclado
    When llega a una tarjeta mediante Tab
    Then el outline de focus es visible con el color primario del design system
    And el radio del outline coincide con el radio de la tarjeta

  Scenario: Sin regresión en drag & drop
    Given la tarjeta con el nuevo diseño
    When el usuario la arrastra a otra columna
    Then la funcionalidad de drag & drop sigue operativa sin errores
```

---

## Notas técnicas

- Modificar `dojo-task-card` en `src/components/`.
- Usar tokens CSS de `design-tokens.css` (colores, sombras, radios).
- La barra de prioridad se implementa como `::before` pseudo-elemento o `<div>` interno.
- Transiciones con `prefers-reduced-motion` como salvaguarda de accesibilidad.
