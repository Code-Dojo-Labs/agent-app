# Improvement 20 — Recomendaciones para mejorar UX general

> **Área**: UI / UX / Product  
> **Prioridad**: Media  
> **Estado**: Propuesto  
> **Referencia**: Multiple (feedback de testing)

---

## Resumen ejecutivo

Este documento consolidaa recomendaciones de UX identificadas durante testing de la aplicación. Cada recomendación incluye el **problema**, la **propuesta** y el **impacto estimado**.

---

## 1. Confirmaciones claras para acciones destructivas

### Problema
Eliminar tareas, etiquetas o columnas es muy fácil y no hay confirmación clara. Usuarios pueden borrar contenido por accidente.

### Propuesta
- Agregar diálogos de confirmación con **lenguaje claro**: "¿Eliminar tarea? Esta acción no se puede deshacer"
- Mostrar información relevante: cantidad de subtareas, etiquetas asociadas
- Botón "Eliminar" en color rojo con ícono de advertencia
- Opción "No, cancelar" destacada como default

### Impacto
- ✅ Reduce accidentes de eliminación
- ✅ Mejora confianza del usuario
- ⚠️ Agrega 1-2 clics a flujos de eliminación

---

## 2. Undo/Redo (Deshacer/Rehacer)

### Problema
No hay forma de recuperar acciones. Si el usuario elimina algo por error, debe recrearlo manualmente.

### Propuesta
- Implementar stack de undo/redo
- Atajo: `Ctrl+Z` / `Cmd+Z` para deshacer
- Atajo: `Ctrl+Y` / `Cmd+Y` para rehacer
- Toast: "Tarea eliminada. [Deshacer]" con botón clickeable
- Máximo 20 acciones en el historial

### Impacto
- ✅ Aumenta confianza y productividad
- ✅ Reduce fricción en edición
- ⚠️ Complejidad técnica media (requiere snapshot del estado)

---

## 3. Feedback visual mejorado para carga y guardado

### Problema
No hay indicación clara de cuándo se están guardando datos o si una acción fue exitosa.

### Propuesta
- **Skeleton loaders**: Mientras carga datos
- **Spinners**: En botones durante acciones async
- **Toast notifications**: "✅ Tarea guardada" (verde, 2s)
- **Checkmark animado**: Feedback de éxito
- **Error toasts**: En rojo si algo falla

### Impacto
- ✅ Reduce incertidumbre del usuario
- ✅ Mejora percepción de velocidad
- ✅ Fácil de implementar con Web Components

---

## 4. Indicadores de progreso para tareas con subtareas

### Problema
No hay forma de ver rápidamente cuántos subtasks están completados.

### Propuesta
- Agregar una **barra de progreso** en la tarjeta de tarea
- Mostrar: "3 de 5 subtareas completadas"
- Actualizar en tiempo real al marcar subtareas
- Hacer clickeable para expandir y editar subtareas

### Ejemplo:
```
┌──────────────────────────┐
│ Implementar auth         │
│ 🔥 ⬆️  [Feature, WIP]   │
│                          │
│ Subtareas: 3 de 5 ▓░░░░ │
│                          │
│ Debido: 2024-12-25       │
└──────────────────────────┘
```

### Impacto
- ✅ Mejora visibilidad del progreso
- ✅ Reduce necesidad de abrir la tarea
- ✅ Fácil de implementar

---

## 5. Búsqueda global con atajos

### Problema
Para buscar una tarea, el usuario debe navegar al filtro y escribir. En tareas grandes es tedioso.

### Propuesta
- **Atajo global**: `Ctrl+K` / `Cmd+K` abre búsqueda global
- Busca en: títulos, descripciones, etiquetas, asignados
- Resultados instantáneos mientras escribe
- Muestra el tablero/columna de donde viene cada resultado
- Permite navegar con flechas ↑↓ y Enter

### Impacto
- ✅ Mejora discoverabilidad
- ✅ Reduce pasos para encontrar tareas
- ⚠️ Requiere indexación del contenido

---

## 6. Preferencias de usuario (Perfil)

### Problema
No hay forma de persistir preferencias como:
- Tema (claro/oscuro) - aunque existe dark mode
- Columnas por defecto
- Filtros por defecto
- Orden preferido de campos en modal

### Propuesta
- Crear página `/settings/preferences`
- Guardar en localStorage o en IndexedDB
- Opciones:
  - Tema por defecto (light, dark, system)
  - Mostrar/ocultar campos en vista
  - Columnas predefinidas para nuevos tableros
  - Avatar y nombre de usuario

### Impacto
- ✅ Personalización
- ✅ Mejora retención
- ✅ Simple de implementar

---

## 7. Drag & Drop mejorado con visual feedback

### Problema
El drag & drop actual funciona pero falta feedback visual claro de dónde se puede soltar.

### Propuesta
- **Drag image personalizado**: Mostrar una preview de la tarjeta siendo arrastrada
- **Drop zones destacadas**: Al arrastrar, resaltar las columnas válidas
- **Animación de drop**: Pequeña animación al soltar
- **Scroll automático**: Si arrastras hacia los bordes, scroll suave

### Impacto
- ✅ Mejora experiencia de drag & drop
- ✅ Reduce confusión
- ⚠️ Requiere refactor del código de drag & drop

---

## 8. Validaciones en tiempo real con mensajes claros

### Problema
Si ingreso datos inválidos, solo veo el error al intentar guardar.

### Propuesta
- Validar mientras escribo (debounced)
- Mensajes de error claros bajo el campo: "⚠️ Título es requerido"
- Cambiar borde del input a rojo si hay error
- Botón guardara deshabilitado si hay errores

### Impacto
- ✅ Mejora UX de formularios
- ✅ Reduce errores de guardado
- ✅ Fácil de implementar

---

## 9. Breadcrumbs y navegación clara

### Problema
En vistas profundas (ej: edit modal), el usuario no sabe dónde está.

### Propuesta
- Mostrar breadcrumbs: "Tablero > Backlog > Mi Tarea"
- O títulos claros: "Editando: Implementar login"
- Botón "← Volver" visible siempre

### Impacto
- ✅ Mejora orientación
- ✅ Reduce fricción de navegación
- ✅ Simple de agregar

---

## 10. Soporte para markdown en descripciones con vista previa

### Problema
Las descripciones soportan markdown pero no hay vista previa en tiempo real.

### Propuesta
- Editor split-screen: **Izq: Markdown | Der: Preview**
- Syntax highlighting para markdown
- Atajo: `Cmd+B` para bold, `Cmd+I` para italic, etc.
- Referencia de markdown disponible

### Impacto
- ✅ Mejora edición de contenido rico
- ✅ Reduce errores de formato
- ⚠️ Requiere editor markdown (ej: CodeMirror)

---

## 11. Soporte para teclado y accesibilidad

### Problema
No todas las acciones se pueden hacer con teclado.

### Propuesta
- **Atajos principales**:
  - `N`: Nueva tarea
  - `E`: Editar tarea seleccionada
  - `D`: Eliminar tarea
  - `L`: Abrir gestión de etiquetas
  - `?`: Mostrar ayuda de atajos
- **Tab navigation**: Recorrer botones y campos
- **Enter**: Confirmar acciones
- **Escape**: Cerrar modales

### Impacto
- ✅ Accesibilidad para usuarios con discapacidades
- ✅ Power users más productivos
- ✅ Cumplimiento WCAG

---

## 12. Documentación en contexto (Help)

### Problema
Nuevos usuarios no saben cómo usar algunas features.

### Propuesta
- Icono "?" en esquinas de la interfaz
- Tooltip con explicación breve
- Link a documentación completa
- Primer uso: onboarding interactivo mostrando features principales

### Impacto
- ✅ Mejora adopción
- ✅ Reduce soporte
- ✅ Simple de agregar

---

## Roadmap de implementación recomendado

### P0 (Crítica)
1. IMP-16: Resolución de sprite path en prod
2. IMP-18: Diseño responsivo
3. Confirmaciones para acciones destructivas (#3)

### P1 (Alta)
4. IMP-17: Filtros con combo
5. IMP-19: Gestión de etiquetas
6. Feedback visual mejorado (#2, #3)
7. Atajos de teclado (#11)

### P2 (Media)
8. Undo/Redo (#2)
9. Búsqueda global (#5)
10. Preferencias de usuario (#6)
11. Indicadores de progreso (#4)

### P3 (Mejora)
12. Drag & drop mejorado (#7)
13. Validaciones en tiempo real (#8)
14. Breadcrumbs (#9)
15. Markdown preview (#10)
16. Help contextual (#12)

---

## Conclusión

Estas mejoras priorizan:
- **Confiabilidad**: Confirmaciones, undo, validación
- **Usabilidad**: Búsqueda, atajos, ayuda
- **Accesibilidad**: Teclado, contraste, responsive
- **Productividad**: Filtros mejores, editor, progress

Implementadas gradualmente, convertirán la app en una herramienta profesional de gestión de tareas.
