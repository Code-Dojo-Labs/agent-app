# Límites WIP por columna

Los **límites WIP** (Work In Progress) te permiten establecer un máximo de tareas por columna para identificar cuellos de botella y mantener un flujo de trabajo sostenible.

## ¿Qué es un límite WIP?

Es un número máximo de tareas que puede contener una columna al mismo tiempo. Cuando se supera, la columna emite una alerta visual para que tomes acción antes de añadir más trabajo.

## Configurar el límite al crear una columna

1. Haz clic en **+ Nueva columna**.
2. En el campo **Límite WIP** (opcional), introduce un número entero positivo.
3. Confirma la creación.

## Configurar el límite en una columna existente

1. Haz clic en el menú `···` de la columna.
2. Selecciona **Editar columna**.
3. Modifica el campo **Límite WIP**.
4. Guarda.

## Estados visuales del contador

```
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│  En progreso  3/5   │   │  En progreso  5/5   │   │  En progreso  7/5 ⚠ │
│  (normal)           │   │  (límite justo)     │   │  (superado - rojo)  │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘
```

| Estado | Color del contador | Comportamiento |
|--------|-------------------|----------------|
| Dentro del límite | Normal (gris/blanco) | Sin restricción |
| En el límite exacto | Amarillo / advertencia | Se permite mover pero se avisa |
| Superado | Rojo | Banner de alerta visible |

## Eliminar el límite

Para desactivar el límite WIP, edita la columna y deja el campo **Límite WIP** vacío.

## FAQ

**¿Puedo tener columnas sin límite WIP?**  
Sí, el campo es opcional. Las columnas sin límite no muestran contador.

**¿El límite WIP bloquea el drag & drop?**  
No bloquea, pero muestra una alerta visual al superar el límite.

**¿El límite WIP se guarda por tablero?**  
Sí, cada columna tiene su propio límite independiente.
