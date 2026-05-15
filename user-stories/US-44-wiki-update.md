# US-44 — Actualización del Wiki: Documentar Funcionalidades US-28 a US-37

> **Área**: Documentación / UX  
> **Prioridad**: Media  
> **Referencia**: [improvements-13-wiki-update.md](../requirements/improvements-13-wiki-update.md)

---

## Historia de usuario

**Como** usuario nuevo o existente de la aplicación,  
**quiero** encontrar documentación actualizada sobre todas las funcionalidades disponibles,  
**para** aprender a usar las características avanzadas sin necesidad de explorar por prueba y error.

---

## Criterios de aceptación

```gherkin
Feature: Wiki actualizado con funcionalidades US-28 a US-37

  Scenario: Página de búsqueda global y atajos de teclado
    Given el archivo docs/wiki/08-busqueda-global.md existe
    Then documenta cómo activar la búsqueda global con Ctrl/Cmd+K
    And incluye tabla completa de atajos de teclado
    And menciona la sintaxis de filtros avanzados (etiqueta, asignado, prioridad)

  Scenario: Página de asignación de personas
    Given el archivo docs/wiki/09-assignees.md existe
    Then documenta cómo crear y gestionar personas desde ajustes
    And explica cómo asignar personas a una tarea
    And describe cómo filtrar el tablero por persona asignada

  Scenario: Página de uso como PWA
    Given el archivo docs/wiki/10-pwa.md existe
    Then documenta los pasos de instalación en Chrome, Edge, Android e iOS
    And explica el funcionamiento offline
    And menciona la sincronización en segundo plano

  Scenario: Página de límites WIP
    Given el archivo docs/wiki/11-wip-limits.md existe
    Then explica el concepto de WIP y su utilidad en Kanban
    And documenta cómo configurar el límite de una columna
    And describe el comportamiento visual al superar el límite

  Scenario: Página de vista de lista
    Given el archivo docs/wiki/12-vista-lista.md existe
    Then explica cómo cambiar entre vista tablero y vista lista
    And documenta las columnas disponibles en la tabla
    And describe las opciones de ordenación y filtrado

  Scenario: Páginas adicionales para US-34 a US-37
    Then existen páginas en docs/wiki/ para:
      | Archivo                   | Funcionalidad              |
      | 13-notificaciones.md      | Notificaciones vencimiento |
      | 14-modal-edicion.md       | Modal ampliado de edición  |
      | 15-templates-tareas.md    | Plantillas de tareas       |
      | 16-columnas-defecto.md    | Columnas por defecto       |

  Scenario: Índice del wiki actualizado
    Given el archivo docs/wiki/ tiene nuevas páginas
    When el usuario abre el índice del wiki
    Then aparecen listadas todas las páginas nuevas con su descripción
    And los enlaces son funcionales
```

---

## Notas técnicas

- Todas las páginas deben tener: introducción, capturas o diagramas ASCII, pasos de uso, FAQ breve.
- El agente **documentalista** es el responsable de redactar el contenido de cada página.
- Las capturas de pantalla se pueden sustituir inicialmente por diagramas ASCII o descripciones.
