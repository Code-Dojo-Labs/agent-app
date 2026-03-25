# US-07 — Descripción en Markdown con seguridad XSS

> **Área**: Gestión de tareas  
> **Prioridad**: Alta  
> **Referencia**: [functional-requirements.md — RF-02.5](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** escribir la descripción de mis tareas en formato Markdown y ver una previsualización renderizada,  
**para** documentar el trabajo con formato enriquecido (listas, negrita, código, etc.) de forma segura.

---

## Criterios de aceptación

```gherkin
Feature: Descripción de tarea en formato Markdown

  Scenario: Modo edición de la descripción
    Given el usuario abre el panel de detalle de una tarea
    When observa el campo de descripción en modo edición
    Then puede escribir texto en formato Markdown (listas, negrita, cursiva, código)
    And el campo acepta texto enriquecido sin restricciones de longitud mínima

  Scenario: Modo previsualización de la descripción
    Given el usuario ha escrito Markdown en el campo de descripción
    When hace clic en el botón "Ver" o "Preview"
    Then el sistema renderiza el Markdown como HTML formateado
    And muestra el resultado de forma legible (encabezados, listas, bloques de código, etc.)

  Scenario: Alternancia entre modo edición y previsualización
    Given el panel de detalle está abierto
    When el usuario alterna entre "Editar" y "Ver"
    Then el sistema cambia entre el textarea de Markdown y el HTML renderizado
    And no pierde el contenido escrito al alternar

  Scenario: Sanitización del HTML generado (prevención de XSS)
    Given el usuario escribe contenido malicioso en la descripción (ej. <script>alert('xss')</script>)
    When el sistema renderiza la descripción en modo previsualización
    Then el script no se ejecuta
    And el contenido potencialmente peligroso es eliminado o escapado antes de insertarse en el DOM

  Scenario: Parser Markdown implementado sin dependencias externas
    Given el sistema renderiza descripciones Markdown
    When se inspecciona el código fuente
    Then el parser es una implementación propia que soporta un subconjunto de CommonMark
    And no existe ningún import de librerías externas de Markdown (marked, markdown-it, etc.)

  Scenario: Descripción vacía
    Given el usuario deja el campo de descripción vacío
    When guarda la tarea
    Then la tarea se guarda correctamente con descripción vacía
    And en el panel de detalle no muestra error ni contenido residual
```
