# US-18 — Modo oscuro automático

> **Área**: UI/UX  
> **Prioridad**: Alta  
> **Referencia**: [improvements.md — MS-02](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** que el tablero se adapte automáticamente al modo oscuro de mi sistema operativo y poder sobreescribir esa preferencia manualmente,  
**para** trabajar cómodamente en entornos de baja luminosidad sin forzar la vista.

---

## Criterios de aceptación

```gherkin
Feature: Modo oscuro automático y manual

  Scenario: Detección automática de preferencia del sistema
    Given el usuario tiene configurado el modo oscuro en su sistema operativo
    When abre la aplicación por primera vez
    Then la interfaz se muestra en modo oscuro
    And los colores utilizan los tokens de color definidos para modo oscuro

  Scenario: Detección automática de modo claro del sistema
    Given el usuario tiene configurado el modo claro en su sistema operativo
    When abre la aplicación por primera vez
    Then la interfaz se muestra en modo claro

  Scenario: Sobreescribir la preferencia a modo oscuro
    Given la aplicación está en modo claro (automático o manual)
    When el usuario selecciona la opción "Oscuro" en el selector de tema
    Then la interfaz cambia inmediatamente a modo oscuro
    And la preferencia "oscuro" se persiste en localStorage

  Scenario: Sobreescribir la preferencia a modo claro
    Given la aplicación está en modo oscuro (automático o manual)
    When el usuario selecciona la opción "Claro" en el selector de tema
    Then la interfaz cambia inmediatamente a modo claro
    And la preferencia "claro" se persiste en localStorage

  Scenario: Restablecer a preferencia del sistema
    Given el usuario ha sobreescrito la preferencia de tema manualmente
    When selecciona la opción "Sistema" en el selector de tema
    Then la interfaz se adapta a la preferencia actual del sistema operativo
    And la preferencia "sistema" se persiste en localStorage

  Scenario: Persistencia de la preferencia entre sesiones
    Given el usuario ha seleccionado manualmente el modo oscuro
    When cierra y vuelve a abrir la aplicación
    Then la interfaz se muestra en modo oscuro según la preferencia guardada en localStorage

  Scenario: Cambio dinámico de preferencia del sistema
    Given el usuario tiene la preferencia establecida en "Sistema"
    When el sistema operativo cambia de modo claro a oscuro (o viceversa)
    Then la interfaz se actualiza automáticamente sin necesidad de recargar la página
```

---

## Notas técnicas

- Implementar detección con `window.matchMedia('(prefers-color-scheme: dark)')`.
- Opciones del selector: Claro / Oscuro / Sistema.
- Persistir la elección en `localStorage` bajo una clave como `theme-preference`.
- Utilizar los tokens de color definidos en [ui-ux.md](../requirements/ui-ux.md).
