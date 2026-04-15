# Mejora 03: Notificaciones del navegador para fechas de vencimiento

> Estado: Propuesto  
> Fecha: 2026-04-14  
> Área: Persistencia — PWA

---

## Problema

Las fechas de vencimiento (US-17) se muestran visualmente en la tarjeta, pero el usuario debe revisar activamente el tablero para enterarse de vencimientos próximos. No existe ningún mecanismo proactivo de alerta, lo que puede provocar que se pierdan plazos importantes.

---

## Propuesta de Solución

Integrar la **Notification API** del navegador con el **Service Worker** existente (`public/sw.js`) para enviar recordatorios automáticos de tareas próximas a vencer.

### Comportamiento esperado

- Al cargar la app por primera vez, solicitar permiso de notificaciones con un mensaje explicativo no intrusivo.
- Si el usuario deniega el permiso, la app funciona sin errores y sin reintentos agresivos.
- El Service Worker revisa periódicamente las tareas con `dueDate` y programa notificaciones en dos momentos:
  1. **24 horas antes** del vencimiento.
  2. **En el momento exacto** del vencimiento.
- Cada notificación contiene:
  - Título de la tarea.
  - Columna/estado actual.
  - Acción directa para abrir la app en el detalle de la tarea.
- El usuario puede desactivar notificaciones individualmente por tarea mediante un toggle en el panel de edición.

### Impacto en el modelo de datos

Añadir un campo opcional a la entidad `Task`:

```ts
interface Task {
  // ...campos existentes
  notifications?: boolean; // true por defecto si dueDate está definido
}
```

---

## Criterios de Aceptación

- [ ] La solicitud de permiso se muestra solo una vez y de forma no bloqueante.
- [ ] Si el permiso es denegado, no hay errores y no se vuelve a solicitar hasta que el usuario lo permita desde ajustes.
- [ ] Las notificaciones se envían correctamente con 24h de antelación y en el momento del vencimiento.
- [ ] Las notificaciones funcionan aunque la pestaña esté cerrada (via Service Worker).
- [ ] El toggle de notificaciones por tarea es visible y funcional en el panel de edición.
- [ ] Las notificaciones incluyen un link de acción que abre la tarea directamente.
- [ ] No se envían notificaciones duplicadas si la app está abierta en varias pestañas (usar `BroadcastChannel`).
