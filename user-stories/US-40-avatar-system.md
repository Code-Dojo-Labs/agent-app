# US-40 — Sistema de Avatares Generativos por Iniciales

> **Área**: UI / Gestión de Personas  
> **Prioridad**: Media  
> **Referencia**: [improvements-09-avatar-system.md](../requirements/improvements-09-avatar-system.md)

---

## Historia de usuario

**Como** usuario que gestiona personas en el tablero,  
**quiero** que cada persona tenga un avatar circular con sus iniciales y un color único generado automáticamente,  
**para** identificar visualmente a los asignados en las tarjetas sin necesidad de configuración manual.

---

## Criterios de aceptación

```gherkin
Feature: Avatares generativos por iniciales en <dojo-avatar>

  Scenario: Generación de iniciales desde el nombre completo
    Given una persona con nombre "Ana Torres"
    When se renderiza su avatar
    Then el avatar muestra las iniciales "AT"
    And el avatar es circular

  Scenario: Color determinístico por nombre
    Given una persona con nombre "Ana Torres"
    When su avatar se renderiza en distintas sesiones o dispositivos
    Then el color de fondo es siempre el mismo valor HSL derivado de su nombre
    And el color tiene saturación 65% y luminosidad 45%

  Scenario: Contraste de texto accesible (WCAG AA)
    Given cualquier color de fondo generado
    When el avatar se renderiza
    Then el texto de las iniciales es blanco (#ffffff) o negro (#1d1d1f)
    And el contraste cumple con WCAG AA (ratio mínimo 4.5:1)

  Scenario: Visualización de múltiples asignados en tarjeta
    Given una tarea con 3 personas asignadas
    When se renderiza la tarjeta
    Then se muestran 3 avatares apilados horizontalmente (overlap)
    And si hay más de 3, se muestra "+N" con el conteo adicional

  Scenario: Soporte para nombre de un solo segmento
    Given una persona con nombre "Carlos"
    When se renderiza su avatar
    Then el avatar muestra la inicial "C"

  Scenario: Componente reutilizable en toda la app
    Given <dojo-avatar name="Juan Méndez" size="32">
    When se usa en cualquier componente de la aplicación
    Then el avatar tiene 32x32px
    And hereda el color generado correctamente
```

---

## Notas técnicas

- Nuevo átomo `<dojo-avatar>` en `src/components/atoms/`.
- Algoritmo de hash: `hash = (hash * 31 + charCode) & 0xFFFFFF`, `hue = hash % 360`.
- Color final: `hsl(hue, 65%, 45%)`.
- Props: `name` (string), `size` (number, default 28), `src` (string opcional para foto real).
