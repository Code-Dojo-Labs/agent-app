# US-30 — Sincronización entre pestañas

> **Área**: Persistencia  
> **Prioridad**: Opcional  
> **Referencia**: [improvements.md — MS-09 (sincronización)](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** que los cambios realizados en una pestaña del navegador se reflejen automáticamente en las demás pestañas abiertas,  
**para** mantener mis datos sincronizados sin necesidad de recargar manualmente la página.

---

## Criterios de aceptación

```gherkin
Feature: Sincronización entre pestañas con BroadcastChannel

  Scenario: Crear tarea en una pestaña y verla en otra
    Given el usuario tiene la aplicación abierta en dos pestañas del mismo navegador
    When crea una nueva tarea en la pestaña A
    Then la tarea aparece automáticamente en el tablero de la pestaña B
    And no es necesario recargar la pestaña B

  Scenario: Editar tarea en una pestaña y reflejar cambios en otra
    Given la aplicación está abierta en dos pestañas
    When el usuario edita el título de una tarea en la pestaña A
    Then el título actualizado se muestra en la pestaña B automáticamente

  Scenario: Eliminar tarea en una pestaña y desaparecer de otra
    Given la aplicación está abierta en dos pestañas
    When el usuario elimina una tarea en la pestaña A
    Then la tarea desaparece del tablero en la pestaña B automáticamente

  Scenario: Mover tarea entre columnas en una pestaña
    Given la aplicación está abierta en dos pestañas
    When el usuario mueve una tarea de "Por hacer" a "En progreso" en la pestaña A
    Then la tarea aparece en la columna "En progreso" en la pestaña B

  Scenario: Crear o modificar columna en una pestaña
    Given la aplicación está abierta en dos pestañas
    When el usuario crea o modifica una columna en la pestaña A
    Then los cambios se reflejan en la pestaña B automáticamente

  Scenario: Cambios en etiquetas sincronizados entre pestañas
    Given la aplicación está abierta en dos pestañas
    When el usuario crea, edita o elimina una etiqueta en la pestaña A
    Then los cambios se reflejan en la pestaña B automáticamente

  Scenario: La sincronización no afecta el rendimiento
    Given la aplicación está abierta en múltiples pestañas
    When se producen cambios frecuentes en una pestaña
    Then las demás pestañas actualizan sus datos sin degradación perceptible de rendimiento
```

---

## Notas técnicas

- Utilizar la API `BroadcastChannel` del navegador.
- Canal: `new BroadcastChannel('kanban-sync')`.
- Emitir mensajes al modificar datos en IndexedDB: `{ type: 'task:updated', taskId: '...' }`.
- Las pestañas receptoras escuchan y refrescan los datos afectados.
- No requiere servidor ni dependencias externas.
