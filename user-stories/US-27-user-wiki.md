# US-27 — Wiki / Guía de usuario del proyecto

> **Área**: Documentación  
> **Prioridad**: Baja  
> **Referencia**: [improvements.md — MS-11](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario nuevo de la aplicación,  
**quiero** acceder a una guía de usuario con documentación de las funcionalidades y flujos principales,  
**para** aprender a utilizar la aplicación de forma autónoma y eficiente.

---

## Criterios de aceptación

```gherkin
Feature: Wiki / Guía de usuario del proyecto

  Scenario: Acceder a la guía de usuario desde la aplicación
    Given el usuario está en cualquier pantalla de la aplicación
    When hace clic en el botón "Ayuda" o "Guía" del header
    Then se abre la guía de usuario con el índice de secciones disponibles

  Scenario: Sección de inicio rápido
    Given el usuario accede a la guía de usuario
    When navega a la sección "Inicio rápido"
    Then se muestra una guía paso a paso de los primeros pasos tras abrir la app

  Scenario: Sección de gestión de columnas
    Given el usuario accede a la guía de usuario
    When navega a la sección "Gestión de columnas"
    Then se muestra documentación sobre crear, renombrar, eliminar y reordenar columnas

  Scenario: Sección de gestión de tareas
    Given el usuario accede a la guía de usuario
    When navega a la sección "Gestión de tareas"
    Then se muestra documentación sobre crear, editar, eliminar, mover y filtrar tareas

  Scenario: Sección de etiquetas
    Given el usuario accede a la guía de usuario
    When navega a la sección "Etiquetas"
    Then se muestra documentación sobre crear, asignar, editar y eliminar etiquetas

  Scenario: Sección de Drag & Drop
    Given el usuario accede a la guía de usuario
    When navega a la sección "Drag & Drop"
    Then se muestra documentación sobre cómo mover tareas entre columnas y reordenar

  Scenario: Sección de filtros y búsqueda
    Given el usuario accede a la guía de usuario
    When navega a la sección "Filtros y búsqueda"
    Then se muestra documentación sobre el uso de la barra de filtros

  Scenario: Sección de atajos de teclado
    Given el usuario accede a la guía de usuario
    When navega a la sección "Atajos de teclado"
    Then se muestra una tabla con las teclas disponibles (Escape, Tab, Enter, etc.)
```

---

## Notas técnicas

- Archivos Markdown en `docs/wiki/`, enlazados desde `docs/wiki/index.md`.
- Enlazar la wiki desde el header de la aplicación con un botón de ayuda.
- Incluir capturas de pantalla o diagramas cuando sea relevante.
