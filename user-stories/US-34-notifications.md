# US-34 — Notificaciones del navegador para fechas de vencimiento

> **Área**: PWA — Gestión de tareas  
> **Prioridad**: Media  
> **Referencia**: [improvements-03-notifications.md](../requirements/improvements-03-notifications.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** recibir notificaciones del navegador cuando una tarea está próxima a vencer o ha vencido,  
**para** no perder plazos importantes aunque no tenga el tablero activo en pantalla.

---

## Criterios de aceptación

```gherkin
Feature: Notificaciones del navegador para fechas de vencimiento

  Scenario: Solicitar permiso de notificaciones al primer uso
    Given el usuario utiliza la aplicación por primera vez
    When la app detecta que existen tareas con fecha de vencimiento
    Then muestra un mensaje no intrusivo solicitando permiso para enviar notificaciones
    And el mensaje explica brevemente por qué se solicita el permiso

  Scenario: Usuario concede permiso de notificaciones
    Given se ha mostrado la solicitud de permiso
    When el usuario hace clic en "Permitir"
    Then el permiso queda registrado en el navegador
    And la app activa el sistema de recordatorios via Service Worker

  Scenario: Usuario deniega el permiso de notificaciones
    Given se ha mostrado la solicitud de permiso
    When el usuario hace clic en "Bloquear" o cierra el diálogo
    Then la app funciona sin errores y sin reintentos
    And no se vuelve a solicitar el permiso en la misma sesión

  Scenario: Notificación 24 horas antes del vencimiento
    Given el usuario concedió permiso de notificaciones
    And existe una tarea con fecha de vencimiento en las próximas 24 horas
    When el Service Worker ejecuta su verificación periódica
    Then envía una notificación con el título de la tarea y su estado actual
    And la notificación incluye una acción para abrir la tarea directamente

  Scenario: Notificación en el momento exacto del vencimiento
    Given el usuario concedió permiso de notificaciones
    And una tarea llega a su fecha y hora de vencimiento
    When el Service Worker ejecuta su verificación
    Then envía una notificación indicando que la tarea ha vencido
    And la notificación incluye una acción para abrir la tarea directamente

  Scenario: Notificaciones en segundo plano (pestaña cerrada)
    Given el Service Worker está activo
    And el usuario ha cerrado la pestaña de la aplicación
    When una tarea llega a su momento de notificación
    Then el Service Worker envía la notificación igualmente
    And al hacer clic en la notificación se abre la aplicación en el detalle de la tarea

  Scenario: Sin notificaciones duplicadas en múltiples pestañas
    Given el usuario tiene la aplicación abierta en dos pestañas
    When una tarea alcanza su momento de notificación
    Then se envía una única notificación (sin duplicados)
    And se utiliza BroadcastChannel para coordinar entre pestañas

  Scenario: Desactivar notificaciones para una tarea específica
    Given el panel de edición de una tarea está abierto
    And la tarea tiene fecha de vencimiento definida
    When el usuario desactiva el toggle "Notificaciones" de esa tarea
    Then el campo "notifications" de la tarea se actualiza a false en IndexedDB
    And no se envían notificaciones para esa tarea específica

  Scenario: Tarea sin fecha de vencimiento no genera notificaciones
    Given existe una tarea sin campo "dueDate" definido
    When el Service Worker ejecuta su verificación
    Then no se genera ninguna notificación para esa tarea
```
