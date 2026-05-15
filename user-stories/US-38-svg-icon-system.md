# US-38 — Sistema de Iconos SVG Personalizado

> **Área**: UI / Design System  
> **Prioridad**: Alta  
> **Referencia**: [improvements-07-svg-icon-system.md](../requirements/improvements-07-svg-icon-system.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** que todos los iconos sean SVG vectoriales consistentes,  
**para** tener una interfaz visualmente coherente en cualquier sistema operativo y poder personalizar su color y tamaño con CSS.

---

## Criterios de aceptación

```gherkin
Feature: Sistema de Iconos SVG mediante Web Component <dojo-icon>

  Scenario: Renderizado de un icono por nombre
    Given el desarrollador utiliza <dojo-icon name="priority-high" size="16">
    When el componente se renderiza en el DOM
    Then el icono correspondiente se muestra como SVG inline desde el sprite
    And su color hereda de "currentColor"
    And su tamaño es exactamente 16x16px

  Scenario: Cobertura mínima del conjunto de iconos
    Given el sistema de iconos está implementado
    Then existen definiciones SVG para al menos los siguientes iconos:
      | Nombre           | Reemplaza |
      | priority-low     | ⬇️        |
      | priority-medium  | ➡️        |
      | priority-high    | ⬆️        |
      | priority-urgent  | 🔥        |
      | edit             | ✏️        |
      | delete           | 🗑️        |
      | close            | ✕         |
      | add              | +         |
      | drag-handle      | ⠿         |
      | calendar         | 📅        |
      | label            | 🏷️        |
      | assignee         | 👤        |
      | subtask          | ☑️        |
      | chevron-down     | ▾         |
      | search           | 🔍        |
      | check            | ✓         |
      | warning          | ⚠️        |
      | info             | ℹ️        |

  Scenario: Accesibilidad del icono
    Given un icono de acción (edit, delete)
    When el lector de pantalla lo procesa
    Then el icono tiene aria-label descriptivo o está marcado con aria-hidden="true"
    And no se lee el nombre del emoji original

  Scenario: Control de color mediante CSS
    Given <dojo-icon name="edit"> dentro de un botón rojo
    When el botón tiene color: red en CSS
    Then el icono SVG también se renderiza en color rojo (currentColor)

  Scenario: Reemplazo total de emojis funcionales
    Given la aplicación desplegada
    When el usuario navega por el tablero
    Then no se visualiza ningún emoji Unicode en elementos de acción, prioridad o estado
    And todos han sido reemplazados por los iconos SVG correspondientes
```

---

## Notas técnicas

- Sprite SVG cargado desde `/public/icons/sprite.svg`.
- Web Component `<dojo-icon>` como átomo en `src/components/atoms/`.
- Set de iconos basado en **Heroicons** o **Lucide Icons** (MIT License).
- Variables CSS `--icon-size` y `currentColor` para control total desde el exterior.
