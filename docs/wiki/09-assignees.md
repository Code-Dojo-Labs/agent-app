# Asignación de personas

Puedes asignar una o más personas a cada tarea para distribuir el trabajo y saber de un vistazo quién es responsable.

## Crear una persona

1. Accede a **Ajustes → Personas** (o desde el selector dentro de una tarea).
2. Haz clic en **Nueva persona**.
3. Introduce el nombre y, opcionalmente, un emoji o inicial para el avatar.
4. Confirma. La persona queda guardada localmente en IndexedDB.

```
┌──────────────────────────┐
│  Nueva persona           │
│                          │
│  Nombre: Ana García      │
│  Avatar: AG  (auto)      │
│                          │
│        [ Guardar ]       │
└──────────────────────────┘
```

## Asignar personas a una tarea

1. Abre el detalle de la tarea (clic sobre la tarjeta).
2. En la sección **Asignados**, haz clic en el selector.
3. Selecciona una o varias personas de la lista.
4. El cambio se guarda automáticamente.

## Ver asignados en el tablero

Los avatares de las personas asignadas aparecen en la esquina inferior derecha de la tarjeta. Si hay más de tres asignados se muestra `+N`.

```
┌────────────────────────┐
│  Implementar login     │
│  🔴 Alta               │
│                   AG KL│  ← avatares
└────────────────────────┘
```

## Filtrar tareas por persona

Usa el **panel de filtros** (icono embudo) y selecciona una persona para mostrar solo sus tareas asignadas en el tablero activo.

## FAQ

**¿Puedo asignar varias personas a la misma tarea?**  
Sí, no hay límite de asignados por tarea.

**¿Las personas se comparten entre tableros?**  
Sí, el directorio de personas es global a toda la aplicación.

**¿Puedo eliminar una persona?**  
Sí, desde **Ajustes → Personas → Eliminar**. Las tareas que la tenían asignada quedan sin ese asignado.
