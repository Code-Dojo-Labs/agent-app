# US-37 — Columnas por defecto estandarizadas en tableros nuevos

> **Área**: Tablero Kanban — Inicialización  
> **Prioridad**: Alta  
> **Referencia**: [improvements-06-default-columns.md](../requirements/improvements-06-default-columns.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** que todos los tableros nuevos incluyan automáticamente un conjunto estándar de columnas predefinidas,  
**para** empezar a trabajar de inmediato sin tener que configurar el flujo Kanban desde cero.

---

## Criterios de aceptación

```gherkin
Feature: Columnas por defecto estandarizadas en tableros nuevos

  Scenario: Inicialización de la app sin datos previos
    Given el usuario abre la aplicación por primera vez
    And no existen datos en IndexedDB
    When la aplicación completa su inicialización
    Then se crean automáticamente las siguientes 6 columnas en orden:
      | Orden | Icono | Nombre       |
      | 1     | 📋    | Backlog      |
      | 2     | 🔲    | Por Hacer    |
      | 3     | 🔄    | En Progreso  |
      | 4     | 🔍    | En Revisión  |
      | 5     | ✅    | Hecho        |
      | 6     | 🚫    | Bloqueado    |
    And cada columna tiene el flag "isDefault" establecido a true

  Scenario: No duplicar columnas al reinicializar
    Given el usuario ya tiene datos en IndexedDB con columnas configuradas
    When la aplicación se recarga o reinicializa
    Then el sistema detecta que ya existen columnas
    And no crea nuevas columnas por defecto
    And los datos existentes permanecen intactos

  Scenario: Crear un nuevo tablero desde la UI de múltiples tableros
    Given el usuario está en la pantalla de gestión de tableros
    When crea un nuevo tablero
    Then el tablero nuevo se inicializa con las mismas 6 columnas estándar
    And las columnas quedan asociadas únicamente a ese tablero

  Scenario: Las columnas por defecto son totalmente editables
    Given la aplicación ha creado las 6 columnas estándar
    When el usuario edita el nombre de la columna "Backlog"
    Then el nombre se actualiza correctamente en IndexedDB
    And el flag "isDefault" no impide ninguna operación de edición

  Scenario: Las columnas por defecto son eliminables
    Given la aplicación ha creado las 6 columnas estándar
    When el usuario elimina la columna "Bloqueado"
    And confirma la eliminación
    Then la columna se elimina de IndexedDB
    And el tablero muestra las 5 columnas restantes sin errores

  Scenario: Las columnas por defecto son reordenables
    Given la aplicación tiene las 6 columnas estándar
    When el usuario arrastra la columna "Backlog" a otra posición
    Then el nuevo orden se persiste en IndexedDB
    And el tablero refleja el orden actualizado

  Scenario: El seed no genera columnas duplicadas si se llama más de una vez
    Given la función de seed se invoca dos veces consecutivas
    When la segunda invocación se ejecuta
    Then el sistema comprueba que ya existen columnas
    And no se crean registros duplicados en IndexedDB
```
