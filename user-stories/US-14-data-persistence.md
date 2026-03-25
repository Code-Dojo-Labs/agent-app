# US-14 — Persistencia de datos con IndexedDB

> **Área**: Persistencia  
> **Prioridad**: Alta  
> **Referencia**: [functional-requirements.md — RF-04](../requirements/functional-requirements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** que toda mi información (tareas, columnas y etiquetas) se almacene localmente en el navegador,  
**para** acceder a mis datos sin necesidad de servidor, cuenta de usuario ni conexión a internet.

---

## Criterios de aceptación

```gherkin
Feature: Persistencia local de datos con IndexedDB

  Scenario: Datos almacenados automáticamente al operar
    Given el usuario crea, edita o elimina una tarea, columna o etiqueta
    When el sistema procesa la operación
    Then el cambio se persiste en IndexedDB de forma inmediata y asíncrona
    And al recargar la página los datos permanecen intactos

  Scenario: Inicialización con columnas por defecto
    Given el usuario abre la aplicación por primera vez en un navegador
    When IndexedDB no contiene datos previos (primera ejecución)
    Then el sistema crea automáticamente los 6 estados por defecto en el object store "columns":
      | Nombre       | Ícono | Orden |
      | Backlog      | 📋    | 0     |
      | Por hacer    | 🔲    | 1     |
      | En progreso  | 🔄    | 2     |
      | En revisión  | 🔍    | 3     |
      | Hecho        | ✅    | 4     |
      | Bloqueado    | 🚫    | 5     |

  Scenario: Capa de acceso a datos desacoplada de la UI
    Given el sistema accede a IndexedDB
    When se inspecciona la arquitectura del código
    Then existe una capa de repositorio/servicio dedicada (ej. src/db/)
    And expone operaciones CRUD asíncronas (create, read, update, delete) para cada entidad
    And los componentes de UI no acceden directamente a la API de IndexedDB

  Scenario: IndexedDB no disponible (modo privado restringido)
    Given el usuario abre la aplicación en un contexto donde IndexedDB no está disponible
    When el sistema intenta abrir la base de datos
    Then se muestra un mensaje claro al usuario indicando que el almacenamiento local no está disponible
    And se le recomienda salir del modo privado o usar otro navegador

  Scenario: Nombre y versión de la base de datos correctos
    Given la aplicación inicializa IndexedDB
    When se abre la base de datos
    Then el nombre es "kanban-app-db"
    And la versión es 1
    And existen los tres object stores: "tasks", "columns" y "labels"

  Scenario: Índices de consulta en el object store de tareas
    Given existen tareas almacenadas en IndexedDB
    When el sistema consulta tareas por columna
    Then usa el índice "by-status" sobre el campo "statusId"
    When el sistema consulta tareas por prioridad
    Then usa el índice "by-priority" sobre el campo "priority"
```
