# US-43 — Design System Avanzado con CSS Custom Properties y Theming

> **Área**: UI / Design System  
> **Prioridad**: Alta  
> **Referencia**: [improvements-12-design-system.md](../requirements/improvements-12-design-system.md)

---

## Historia de usuario

**Como** desarrollador y usuario de la aplicación,  
**quiero** un sistema de tokens de diseño organizado en capas (primitivos, semánticos, componente),  
**para** garantizar consistencia visual en todos los componentes y poder aplicar temas personalizados de forma global.

---

## Criterios de aceptación

```gherkin
Feature: Design Token System en tres capas de CSS Custom Properties

  Scenario: Tokens primitivos disponibles globalmente
    Given el archivo src/styles/tokens/primitives.css está cargado
    Then las variables --color-blue-500, --font-size-base, --space-4 y --radius-md
    And están disponibles en cualquier componente de la aplicación

  Scenario: Tokens semánticos referencian primitivos
    Given el archivo src/styles/tokens/semantic.css está cargado
    Then --color-surface-primary referencia un token primitivo de color
    And --color-text-action referencia --color-blue-500
    And un cambio en el primitivo se propaga automáticamente al semántico

  Scenario: Tokens de componente usan tokens semánticos
    Given el componente dojo-task-card
    When se lee su CSS interno
    Then usa únicamente variables semánticas (--color-surface-*, --color-text-*)
    And no tiene valores de color codeados (#hexadecimal) en línea

  Scenario: Cambio de tema claro a oscuro
    Given el tema por defecto es claro
    When el usuario activa el modo oscuro (US-18)
    Then todos los tokens semánticos de color cambian sus valores automáticamente
    And no es necesario modificar ningún componente individual

  Scenario: Tema personalizado por el usuario
    Given el usuario accede al panel de personalización
    When selecciona un color primario diferente
    Then la variable --color-accent se actualiza globalmente
    And todos los botones, links y elementos interactivos reflejan el nuevo color

  Scenario: Compatibilidad con design-tokens.css existente
    Given design-tokens.css ya generado en src/styles/
    When se implementa el sistema de tres capas
    Then design-tokens.css se refactoriza o extiende (no se elimina) para no romper componentes existentes
```

---

## Notas técnicas

- Estructura de archivos:
  - `src/styles/tokens/primitives.css` — valores absolutos.
  - `src/styles/tokens/semantic.css` — roles e intenciones.
  - `src/styles/tokens/components.css` — overrides por componente.
- Los tokens de IMP-12 complementan y extienden `design-tokens.css` (IMP-12).
- Respetar la filosofía Zero Deps: solo CSS Custom Properties nativas, sin preprocesadores.
