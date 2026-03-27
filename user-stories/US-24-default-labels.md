# US-24 — Etiquetas por defecto genéricas

> **Área**: Gestión de etiquetas  
> **Prioridad**: Media  
> **Referencia**: [improvements.md — MS-08 (etiquetas por defecto)](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** que al iniciar la aplicación por primera vez se creen automáticamente un conjunto de etiquetas genéricas,  
**para** poder clasificar tareas inmediatamente sin tener que crear etiquetas básicas desde cero.

---

## Criterios de aceptación

```gherkin
Feature: Etiquetas por defecto al inicializar la aplicación

  Scenario: Etiquetas por defecto creadas en la primera ejecución
    Given el usuario abre la aplicación por primera vez
    When no existen etiquetas previas en IndexedDB
    Then el sistema crea automáticamente las siguientes etiquetas:
      | Nombre          | Color     |
      | Bug             | #B91C1C   |
      | Feature         | #1D4ED8   |
      | Mejora          | #15803D   |
      | Documentación   | #6D28D9   |
      | Diseño          | #BE185D   |
      | Investigación   | #B45309   |
      | Testing         | #0E7490   |
      | Infraestructura | #374151   |
    And las etiquetas se persisten en IndexedDB
    And están disponibles en el selector de etiquetas de cualquier tarea

  Scenario: No duplicar etiquetas en ejecuciones posteriores
    Given las etiquetas por defecto ya fueron creadas previamente
    When el usuario abre la aplicación nuevamente
    Then no se crean etiquetas duplicadas
    And las etiquetas existentes permanecen sin cambios

  Scenario: Las etiquetas por defecto son editables
    Given las etiquetas por defecto existen en el sistema
    When el usuario edita el nombre o color de una etiqueta por defecto
    Then los cambios se guardan correctamente
    And la etiqueta funciona como cualquier otra etiqueta creada por el usuario

  Scenario: Las etiquetas por defecto son eliminables
    Given las etiquetas por defecto existen en el sistema
    When el usuario elimina una etiqueta por defecto
    Then la etiqueta se elimina correctamente de IndexedDB
    And se desasocia de todas las tareas que la tenían asignada
```

---

## Notas técnicas

- Añadir función `seedDefaultLabels()` en `label.repository.ts`.
- Definir constante `DEFAULT_LABELS` en `models.ts`.
- La función se ejecuta durante el bootstrap, similar a `seedDefaultColumns`.
