# US-19 — Exportación e importación de datos

> **Área**: Persistencia  
> **Prioridad**: Media  
> **Referencia**: [improvements.md — MS-03](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** exportar e importar los datos de mi tablero en formato JSON,  
**para** hacer copias de seguridad y transferir mi información entre navegadores o dispositivos.

---

## Criterios de aceptación

```gherkin
Feature: Exportación e importación de datos del tablero

  Scenario: Exportar datos del tablero completo
    Given el usuario tiene columnas, tareas y etiquetas en su tablero
    When hace clic en el botón "Exportar"
    Then se descarga un archivo JSON con la snapshot completa del tablero
    And el archivo incluye un campo "version" para soportar migraciones futuras
    And el archivo incluye un campo "exportedAt" con la fecha y hora actual en formato ISO 8601
    And el archivo contiene las colecciones "columns", "tasks" y "labels"

  Scenario: Formato del archivo exportado
    Given el usuario exporta los datos del tablero
    When abre el archivo JSON descargado
    Then el formato del archivo es válido y contiene la estructura:
      """
      {
        "version": 1,
        "exportedAt": "<ISO 8601>",
        "columns": [...],
        "labels": [...],
        "tasks": [...]
      }
      """

  Scenario: Importar datos reemplazando los existentes
    Given el usuario tiene un archivo JSON previamente exportado
    When hace clic en el botón "Importar" y selecciona el archivo
    And el sistema muestra un diálogo de confirmación indicando que los datos actuales serán reemplazados
    And el usuario confirma la importación
    Then los datos actuales se reemplazan con los del archivo importado
    And el tablero se actualiza mostrando los datos importados

  Scenario: Cancelar importación antes de reemplazar datos
    Given el usuario selecciona un archivo JSON para importar
    When el sistema muestra el diálogo de confirmación
    And el usuario cancela la operación
    Then los datos actuales no se modifican
    And el tablero permanece sin cambios

  Scenario: Importar un archivo con formato inválido
    Given el usuario selecciona un archivo que no es JSON válido o no tiene la estructura esperada
    When intenta importarlo
    Then el sistema muestra un mensaje de error indicando que el formato es inválido
    And los datos actuales no se modifican

  Scenario: Importar un archivo con versión no soportada
    Given el usuario selecciona un archivo JSON con un campo "version" no soportado
    When intenta importarlo
    Then el sistema muestra un mensaje de error indicando que la versión no es compatible
    And los datos actuales no se modifican

  Scenario: Exportar tablero vacío
    Given el tablero no contiene tareas ni etiquetas personalizadas
    When el usuario hace clic en "Exportar"
    Then se descarga un archivo JSON válido con las colecciones vacías o con las columnas por defecto
```

---

## Notas técnicas

- El formato de exportación debe ser versionado (`"version": 1`) para soportar migraciones futuras.
- La importación debe validar la estructura del JSON antes de procesar.
- Considerar validación de tipos en los objetos importados para evitar corrupción de datos.
