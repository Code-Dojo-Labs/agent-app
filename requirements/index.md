# Requirements — Kanban To-Do App

> Versión: 1.1  
> Fecha: 2026-03-25  
> Estado: Borrador

## Descripción general

Aplicación web de gestión de tareas tipo Trello con tablero Kanban, orientada a usuarios individuales o equipos pequeños. Permite organizar tareas en columnas por estado, asignarles prioridad, etiquetas y descripciones. Toda la información se persiste localmente mediante **IndexedDB**, eliminando la necesidad de un backend.

---

## Contenido de este documento

| Archivo | Descripción |
|---|---|
| [Requerimientos Funcionales](./functional-requirements.md) | Casos de uso, reglas de negocio y comportamiento esperado del sistema |
| [Modelo de Datos](./data-model.md) | Esquema de entidades, relaciones y configuración de IndexedDB |
| [Stack Tecnológico](./tech-stack.md) | Tecnologías, herramientas de desarrollo y estructura de carpetas |
| [Historias de Usuario](./user-stories/index.md) | 11 historias en formato Como/Quiero/Para con criterios Gherkin |
| [UI/UX](./ui-ux.md) | Especificaciones del tablero Kanban, componentes y guía de estilos |
| [Mejoras Sugeridas](./improvements.md) | Propuestas de funcionalidades que potenciarían el proyecto |

### Mejoras en seguimiento

| ID | Archivo | Área | Descripción breve |
|---|---|---|---|
| IMP-01 | [improvements-01-wip-limits.md](./improvements-01-wip-limits.md) | Tablero Kanban | Límites WIP por columna con alertas visuales |
| IMP-02 | [improvements-02-list-view.md](./improvements-02-list-view.md) | UI/UX | Vista alternativa de lista/tabla con ordenamiento |
| IMP-03 | [improvements-03-notifications.md](./improvements-03-notifications.md) | PWA | Notificaciones del navegador para fechas de vencimiento |
| IMP-04 | [improvements-04-larger-edit-dialog.md](./improvements-04-larger-edit-dialog.md) | UI/UX | Modal de edición de tickets al 90% del viewport |
| IMP-05 | [improvements-05-task-templates.md](./improvements-05-task-templates.md) | Gestión de tareas | Templates reutilizables para la creación de tickets |
| IMP-06 | [improvements-06-default-columns.md](./improvements-06-default-columns.md) | Tablero Kanban | Columnas estándar predefinidas en tableros nuevos |
| IMP-07 | [improvements-07-svg-icon-system.md](./improvements-07-svg-icon-system.md) | UI / Design System | Sistema de iconos SVG personalizado que reemplaza emojis |
| IMP-08 | [improvements-08-modern-card-design.md](./improvements-08-modern-card-design.md) | UI / UX | Rediseño moderno de tarjetas con barra de prioridad, hover y progreso visual |
| IMP-09 | [improvements-09-avatar-system.md](./improvements-09-avatar-system.md) | UI / Personas | Avatares generativos coloridos con iniciales para personas asignadas |
| IMP-10 | [improvements-10-smooth-animations.md](./improvements-10-smooth-animations.md) | UI / Motion | Micro-interacciones, toasts de feedback y animaciones de drag & drop |
| IMP-11 | [improvements-11-supabase-integration.md](./improvements-11-supabase-integration.md) | Backend / Auth | Integración con Supabase **personal (BYOS)**: cada usuario conecta su propio proyecto, modo local offline siempre disponible |
| IMP-12 | [improvements-12-design-system.md](./improvements-12-design-system.md) | UI / Design System | Design Token System con CSS Custom Properties, temas múltiples y color de acento personalizable |
| IMP-13 | [improvements-13-wiki-update.md](./improvements-13-wiki-update.md) | Documentación | Actualización del wiki con las 10+ funcionalidades nuevas no documentadas (US-28 a US-37) |
| IMP-14 | [improvements-14-kanban-metrics-dashboard.md](./improvements-14-kanban-metrics-dashboard.md) | Analytics | Dashboard de métricas Kanban: Cycle Time, Throughput, CFD y tasa de cumplimiento de fechas |

---

## Resumen de funcionalidades

### Tablero Kanban
- Columnas representan el **estado** de las tareas.
- Las tareas pueden moverse entre columnas mediante **drag & drop**.
- Cada columna muestra el conteo de tareas activas.

### Tareas
Cada tarea contiene los siguientes campos:

| Campo | Tipo | Descripción |
|---|---|---|
| **Título** | Texto | Nombre corto e identificativo de la tarea |
| **Descripción** | Texto enriquecido | Detalle ampliado, acepta Markdown |
| **Estado** | Enum + icono | Columna actual de la tarea (ej. Pendiente, En progreso, Hecho) |
| **Prioridad** | Enum + icono | Nivel de urgencia: Baja, Media, Alta, Urgente |
| **Fecha de creación** | Fecha ISO 8601 | Generada automáticamente al crear la tarea |
| **Etiquetas** | Lista de referencias | Una o más etiquetas de color asociadas a la tarea |

### Etiquetas
- Las etiquetas se crean una sola vez y se **reutilizan** en múltiples tareas.
- Cada etiqueta tiene un nombre y un color que garantice **legibilidad de texto blanco** sobre él.
- El color puede seleccionarse de una **paleta de 10 colores predefinidos** o definirse de forma **dinámica** mediante un selector de color (con validación de contraste).

### Persistencia
- Toda la información se almacena en **IndexedDB** (navegador).
- No se requiere servidor ni base de datos externa.
- Se expone una API interna de acceso a datos para desacoplar el almacenamiento de la UI.

---

## Definición de estados (columnas por defecto)

| Icono | Estado | Descripción |
|---|---|---|
| 📋 | **Backlog** | Ideas o tareas aún no planificadas |
| 🔲 | **Por hacer** | Tareas listas para ser trabajadas |
| 🔄 | **En progreso** | Trabajo actualmente en curso |
| 🔍 | **En revisión** | Tarea completada pendiente de validación |
| ✅ | **Hecho** | Tarea finalizada |
| 🚫 | **Bloqueado** | Tarea detenida por una dependencia externa |

> Los estados son configurables por el usuario (ver [Modelo de Datos](./data-model.md)).

---

## Definición de prioridades

| Icono | Prioridad | Descripción |
|---|---|---|
| ⬇️ | **Baja** | Sin urgencia, puede esperar |
| ➡️ | **Media** | Importancia normal |
| ⬆️ | **Alta** | Debe atenderse pronto |
| 🔥 | **Urgente** | Bloquea avance o tiene deadline crítico |

---

## Paleta de colores para etiquetas

Los siguientes 10 colores están predefinidos y garantizan una relación de contraste ≥ 4.5:1 con texto blanco (WCAG AA):

| # | Nombre | Hex | Muestra |
|---|---|---|---|
| 1 | Rojo | `#B91C1C` | ![](https://via.placeholder.com/20/B91C1C/B91C1C) |
| 2 | Naranja | `#C2410C` | |
| 3 | Ámbar | `#B45309` | |
| 4 | Verde | `#15803D` | |
| 5 | Azul | `#1D4ED8` | |
| 6 | Índigo | `#4338CA` | |
| 7 | Violeta | `#6D28D9` | |
| 8 | Rosa | `#BE185D` | |
| 9 | Cian | `#0E7490` | |
| 10 | Gris | `#374151` | |

> Para colores personalizados se debe validar el contraste antes de guardar. Ver reglas en [Requerimientos Funcionales](./functional-requirements.md#etiquetas).

---

## Stack tecnológico

> Detalle completo en [Stack Tecnológico](./tech-stack.md).

| Capa | Tecnología | Nota |
|---|---|---|
| Lenguaje | **TypeScript 5.x** → JS ES Modules | Compilado con `tsc`, sin bundler |
| Marcado | **HTML5** + Web Components | Custom Elements, Shadow DOM, `<template>` |
| Estilos | **CSS3** con Custom Properties | Encapsulado en Shadow DOM, theming vía `--dojo-*` |
| Persistencia | **IndexedDB** nativo | Sin wrappers; API encapsulada en el patrón Repository |
| Drag & Drop | **HTML5 Drag and Drop API** | API nativa del navegador |
| Markdown | **Parser propio** en TypeScript | Subconjunto CommonMark, sanitización manual del DOM |
| Contraste | **Cálculo WCAG 2.1** propio | Fórmula de luminancia implementada en TypeScript |
| Dev server | **VS Code Live Preview** / `python3 -m http.server` | Solo para desarrollo, no es una dependencia de producción |

> **Restricción absoluta:** el proyecto tiene **Zero Dependencies** de producción. Solo se permite `typescript` en `devDependencies`. Ver [Stack Tecnológico](./tech-stack.md) para la lista completa de lo que está prohibido.

---

## Referencias

- [Requerimientos Funcionales](./functional-requirements.md)
- [Modelo de Datos](./data-model.md)
- [Stack Tecnológico](./tech-stack.md)
- [UI/UX](./ui-ux.md)
- [Mejoras Sugeridas](./improvements.md)
