# Notificaciones de vencimiento

Dojo Kanban puede enviarte **notificaciones del navegador** cuando una tarea está próxima a vencer o ya ha vencido, incluso si no tienes la app en pantalla.

## Activar notificaciones

La primera vez que la app detecta tareas con fecha de vencimiento, muestra una solicitud de permiso:

```
┌──────────────────────────────────────────────────┐
│  🔔 Dojo Kanban quiere enviarte recordatorios    │
│  de tareas próximas a vencer.                    │
│                                                  │
│        [ Permitir ]       [ Ahora no ]           │
└──────────────────────────────────────────────────┘
```

Haz clic en **Permitir** para activar el sistema de recordatorios.

> Si haces clic en **Ahora no**, puedes activarlo más tarde desde **Ajustes → Notificaciones**.

## Tipos de notificaciones

| Momento | Mensaje |
|---------|---------|
| **24 h antes** | "⏰ La tarea _X_ vence mañana" |
| **Al vencer** | "🔴 La tarea _X_ ha vencido" |

Cada notificación incluye un botón de acción **Abrir tarea** que lleva directamente al detalle.

## Funcionamiento técnico

Las notificaciones se gestionan mediante el **Service Worker** de la PWA:
- El Service Worker verifica periódicamente las tareas con `dueDate` próximo.
- Funciona aunque la app esté cerrada (si la PWA está instalada).
- En modo navegador normal, las notificaciones solo llegan mientras el navegador está abierto.

## Desactivar notificaciones

Ve a **Ajustes → Notificaciones** y desactiva el interruptor. También puedes revocar el permiso desde la configuración del navegador.

## FAQ

**¿Recibiré notificaciones si cierro el navegador?**  
Solo si tienes la PWA instalada en tu sistema. En modo navegador normal, el Service Worker requiere que el navegador esté en ejecución.

**¿Puedo personalizar el tiempo de antelación?**  
Actualmente el recordatorio es fijo a 24 horas antes. La personalización del intervalo está prevista en futuras versiones.

**¿Qué pasa si deniego el permiso?**  
La app funciona con normalidad; simplemente no envía notificaciones. Puedes cambiar el permiso en cualquier momento desde la configuración del navegador.
