# Modal ampliado de edición de tareas

El panel de edición de tareas se abre como un **modal de pantalla completa** (90% del viewport) para trabajar cómodamente con descripciones extensas, subtareas e historial.

## Abrir el modal

Haz clic sobre cualquier tarjeta del tablero o sobre una fila en la vista lista.

```
┌──────────────────────────────────────────────────────┐ ← 90vh
│  ✕                    Implementar login              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Descripción (Markdown)                              │
│  ┌──────────────────────────────────────────────┐   │
│  │                                              │   │
│  │  # Autenticación                             │   │ ← scroll
│  │  Implementar email + contraseña...           │   │   independiente
│  │                                              │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Subtareas · Asignados · Etiquetas · Vencimiento     │
├──────────────────────────────────────────────────────┤
│  [ Guardar ]                          [ Cancelar ]   │
└──────────────────────────────────────────────────────┘
← 90vw →
```

## Animación de apertura y cierre

El modal aparece y desaparece con una animación suave de **fade + escala** (~220 ms), sin saltos bruscos.

## Scroll interno

El contenido del modal tiene su propio scroll. El **header** (con título y botón de cierre) y el **footer** (con los botones de acción) permanecen siempre visibles.

## Cerrar el modal

| Acción | Resultado |
|--------|-----------|
| Clic en **✕** | Cierra el modal |
| Clic en el backdrop oscuro | Cierra el modal |
| Tecla `Escape` | Cierra el modal |

Al cerrarse, el foco regresa a la tarjeta que originó la apertura.

## FAQ

**¿El modal guarda automáticamente los cambios?**  
Los cambios se guardan al hacer clic en **Guardar** o al salir de cada campo individualmente (autosave por campo). Cerrar con `Escape` o el backdrop sin guardar muestra un aviso si hay cambios pendientes.

**¿Funciona correctamente en móvil?**  
Sí. En pantallas pequeñas el modal ocupa el 100% del viewport para maximizar el espacio de edición.
