# IMP-13 — Actualización del Wiki: Documentar las Nuevas Funcionalidades (US-28 a US-37)

> Versión: 1.0
> Fecha: 2026-05-12
> Estado: Propuesta

---

## Problema que Resuelve

El Wiki actual (`docs/wiki/`) fue creado con las funcionalidades del MVP y las mejoras iniciales. Desde entonces se han implementado **10+ nuevas funcionalidades** que no están documentadas para los usuarios:

| Funcionalidad | US / IMP | Estado en Wiki |
|---|---|---|
| Búsqueda global con atajos de teclado | US-28 | ❌ No documentada |
| Asignación de personas (Assignees) | US-29 | ❌ No documentada |
| Sincronización entre pestañas | US-30 | ❌ No documentada |
| Soporte PWA (instalación en escritorio/móvil) | US-31 | ❌ No documentada |
| Límites WIP por columna | US-32 / IMP-01 | ❌ No documentada |
| Vista de lista / tabla | US-33 / IMP-02 | ❌ No documentada |
| Notificaciones de vencimiento | US-34 / IMP-03 | ❌ No documentada |
| Modal de edición ampliado | US-35 / IMP-04 | ❌ No documentada |
| Templates de tareas | US-36 / IMP-05 | ❌ No documentada |
| Columnas por defecto | US-37 / IMP-06 | ❌ No documentada |

Adicionalmente, la sección de atajos de teclado (`07-atajos-teclado.md`) necesita actualizarse con los nuevos atajos añadidos en US-28.

---

## Propuesta de Solución

### 1. Nuevas Páginas del Wiki

Crear las siguientes páginas en `docs/wiki/`:

#### `08-busqueda-global.md` — Búsqueda Global y Atajos de Teclado
- Cómo activar la búsqueda global (`Ctrl/Cmd + K`).
- Sintaxis de búsqueda avanzada (filtrar por etiqueta, asignado, prioridad).
- Tabla completa de atajos de teclado (consolidar con `07-atajos-teclado.md`).
- GIF animado / capturas de la paleta de búsqueda.

#### `09-assignees.md` — Asignación de Personas
- Crear y gestionar personas en el panel de ajustes.
- Asignar una o más personas a una tarea.
- Filtrar el tablero por persona asignada.
- Visualización de avatares (relación con IMP-09).

#### `10-pwa.md` — Uso como Aplicación (PWA)
- Cómo instalar la app en escritorio (Chrome, Edge) y móvil (Android/iOS).
- Funcionamiento offline.
- Sincronización en segundo plano.
- Notificaciones push para fechas de vencimiento.

#### `11-wip-limits.md` — Límites WIP
- Qué son los límites WIP y por qué son útiles en Kanban.
- Cómo configurar el límite de una columna.
- Comportamiento visual cuando se supera el límite (alerta roja en columna).
- Cómo desactivar los límites WIP.

#### `12-vista-lista.md` — Vista de Lista / Tabla
- Cómo alternar entre vista Kanban y vista lista.
- Ordenamiento por columnas (prioridad, fecha, estado).
- Filtrado en la vista lista.
- Acciones rápidas disponibles en esta vista.

#### `13-templates.md` — Templates de Tareas
- Qué son los templates y cuándo usarlos.
- Crear un template a partir de una tarea existente.
- Crear una tarea desde un template.
- Gestionar y eliminar templates.

### 2. Actualización de Páginas Existentes

| Página | Cambio |
|---|---|
| `docs/wiki/index.md` | Añadir referencias a las 6 nuevas páginas |
| `docs/wiki/07-atajos-teclado.md` | Añadir nuevos atajos de US-28 y consolidar con tabla completa |
| `docs/wiki/03-gestion-tareas.md` | Añadir sección de notificaciones de vencimiento y modal ampliado |
| `docs/wiki/01-inicio-rapido.md` | Actualizar captura/descripción del tablero para reflejar nueva UI |

### 3. Mejoras de Formato y Accesibilidad

- Añadir un **bloque de "Consejo"** (`> 💡 **Tip:**`) en cada página con el truco más útil.
- Añadir navegación **← Anterior | Siguiente →** al pie de cada página.
- Garantizar que todas las páginas tienen tabla de contenidos (`## Contenido`) cuando superan 3 secciones.
- Añadir badges de estado visual en el índice para indicar si una función está disponible en modo offline.

---

## Criterios de Aceptación

- [ ] Existen 6 nuevas páginas de wiki, una por cada funcionalidad no documentada.
- [ ] El índice `docs/wiki/index.md` lista todas las páginas con descripción y enlace.
- [ ] Las páginas existentes afectadas están actualizadas.
- [ ] Cada nueva página contiene: descripción, pasos de uso, capturas/GIFs (placeholder) y sección de FAQ.
- [ ] La navegación entre páginas es coherente (breadcrumb o enlaces anterior/siguiente).
- [ ] No hay enlaces rotos en el wiki.

---

## Dependencias

- US-28 (Búsqueda global) debe estar implementada antes de documentar `08-busqueda-global.md`.
- US-29 (Assignees) debe estar implementada antes de documentar `09-assignees.md`.
- Resto de funcionalidades (US-31 a US-37) deben estar en estado estable.

---

## Notas de Implementación

El wiki se renderiza dentro de la propia aplicación mediante el componente `dojo-wiki` (US-27). Las imágenes/GIFs deben alojarse en `public/wiki-assets/` y referenciarse con rutas relativas.
