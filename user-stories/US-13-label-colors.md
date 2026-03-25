# US-13 — Colores de etiquetas con validación de contraste

> **Área**: Gestión de etiquetas  
> **Prioridad**: Media  
> **Referencia**: [functional-requirements.md — RF-03.5](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** elegir el color de una etiqueta desde una paleta predefinida o un selector libre,  
**para** identificar visualmente las categorías de mis tareas garantizando siempre la legibilidad del texto blanco sobre el fondo de color.

---

## Criterios de aceptación

```gherkin
Feature: Selección y validación de colores de etiquetas

  Scenario: Seleccionar un color de la paleta predefinida
    Given el usuario está creando o editando una etiqueta
    When abre el selector de color
    Then puede ver los 10 colores predefinidos:
      | Nombre  | Hex       |
      | Rojo    | #B91C1C   |
      | Naranja | #C2410C   |
      | Ámbar   | #B45309   |
      | Verde   | #15803D   |
      | Azul    | #1D4ED8   |
      | Índigo  | #4338CA   |
      | Violeta | #6D28D9   |
      | Rosa    | #BE185D   |
      | Cian    | #0E7490   |
      | Gris    | #374151   |
    When selecciona uno de esos colores
    Then el color se asigna a la etiqueta sin necesidad de validación adicional (ya cumplen WCAG AA)

  Scenario: Seleccionar un color personalizado con contraste válido
    Given el usuario está creando o editando una etiqueta
    When abre el color picker y selecciona un color personalizado con relación de contraste ≥ 4.5:1 con #FFFFFF
    And confirma la selección
    Then el color se asigna a la etiqueta correctamente
    And se guarda en IndexedDB

  Scenario: Seleccionar un color personalizado con contraste insuficiente
    Given el usuario está creando o editando una etiqueta
    When selecciona un color personalizado con relación de contraste < 4.5:1 con texto blanco (#FFFFFF)
    Then el sistema muestra un aviso de contraste insuficiente
    And sugiere una versión más oscura del mismo tono que sí cumpla el requisito
    And no permite guardar el color original hasta que el contraste sea válido

  Scenario: Texto siempre blanco sobre los chips de etiqueta
    Given existen etiquetas con distintos colores asignados
    When se muestran los chips de etiqueta en las tarjetas y en el panel de detalle
    Then el texto de todas las etiquetas es de color blanco (#FFFFFF)
    And todos los colores de fondo cumplen una relación de contraste ≥ 4.5:1 con blanco (WCAG AA)

  Scenario: Validación de contraste implementada sin dependencias externas
    Given el sistema necesita calcular el contraste de un color
    When se inspecciona el código fuente
    Then existe una función propia de cálculo de luminancia y contraste según WCAG 2.1
    And no se importa ninguna librería externa de gestión de colores
```
