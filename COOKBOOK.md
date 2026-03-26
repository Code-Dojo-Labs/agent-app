# COOKBOOK — ToDo List con Web Components

> **Versión:** 1.0.0  
> **Última actualización:** 2026-03-26  
> **Mantenido por:** Agente `documentalista`

---

## Tabla de Contenidos

1. [Filosofía del Proyecto](#1-filosofía-del-proyecto)
2. [Glosario de Términos](#2-glosario-de-términos)
3. [Registro de Decisiones de Arquitectura (ADR)](#3-registro-de-decisiones-de-arquitectura-adr)
4. [Guía de Implementación](#4-guía-de-implementación)
   - [Paso 1 — Definición de Requerimientos](#paso-1--definición-de-requerimientos)
   - [Paso 2 — Inicialización del COOKBOOK](#paso-2--inicialización-del-cookbook)
   - [Paso 3 — Definición del Stack Tecnológico](#paso-3--definición-del-stack-tecnológico)
   - [Paso 4 — Creación de Historias de Usuario](#paso-4--creación-de-historias-de-usuario)
   - [Paso 5 — Implementación del Skeleton del Proyecto (US-00 / Issue #1)](#paso-5--implementación-del-skeleton-del-proyecto-us-00--issue-1)
   - [Paso 6 — Apertura del Pull Request #18](#paso-6--apertura-del-pull-request-18)
   - [Paso 7 — Implementación de la Visualización del Tablero Kanban (US-01 / Issue #2)](#paso-7--implementación-de-la-visualización-del-tablero-kanban-us-01--issue-2)
   - [Paso 8 — Implementación de la Gestión de Columnas del Tablero (US-02 / Issue #3)](#paso-8--implementación-de-la-gestión-de-columnas-del-tablero-us-02--issue-3)
   - [Paso 9 — Implementación de la Eliminación de Tareas (US-06 / Issue #7)](#paso-9--implementación-de-la-eliminación-de-tareas-us-06--issue-7)
   - [Paso 10 — Implementación de Descripción Markdown con bloques de código (US-07 / Issue #8)](#paso-10--implementación-de-descripción-markdown-con-bloques-de-código-us-07--issue-8)
   - [Paso 11 — Implementación de Prioridad de Tarea (US-08 / Issue #9)](#paso-11--implementación-de-prioridad-de-tarea-us-08--issue-9)
   - [Paso 12 — Implementación de Crear Etiqueta (US-09 / Issue #10)](#paso-12--implementación-de-crear-etiqueta-us-09--issue-10)
   - [Paso 13 — Implementación de Reutilización de Etiquetas (US-10 / Issue #11)](#paso-13--implementación-de-reutilización-de-etiquetas-us-10--issue-11)
   - [Paso 14 — Implementación de Editar Etiqueta (US-11 / Issue #12)](#paso-14--implementación-de-editar-etiqueta-us-11--issue-12)
   - [Paso 15 — Implementación de Eliminar Etiqueta (US-12 / Issue #13)](#paso-15--implementación-de-eliminar-etiqueta-us-12--issue-13)
   - [Paso 16 — Implementación de Colores WCAG y Validación de Contraste (US-13 / Issue #14)](#paso-16--implementación-de-colores-wcag-y-validación-de-contraste-us-13--issue-14)

---

## 1. Filosofía del Proyecto

### 1.1 Visión general

Este proyecto construye una aplicación de gestión de tareas estilo Kanban (To-Do List) sin utilizar ningún framework, librería de terceros ni bundler externo. Todo el software se ejecuta directamente en el navegador apoyándose exclusivamente en **Web APIs nativas** y estándares modernos del lenguaje.

La razón de esta decisión es triple:

- **Educativa:** Comprender a fondo las primitivas del navegador sin capas de abstracción.
- **Sostenible:** Un proyecto sin dependencias nunca queda desactualizado por cambios en el ecosistema npm.
- **Transferible:** Cualquier desarrollador con conocimiento de HTML, CSS y TypeScript puede mantener el código sin curva de aprendizaje extra.

---

### 1.2 Zero Dependencies

El principio **Zero Dependencies** es una restricción de primer orden en este proyecto. Significa que está **prohibido** introducir cualquiera de los siguientes elementos:

| Categoría prohibida | Ejemplos |
|---|---|
| Frameworks de UI | React, Vue, Angular, Svelte, Lit |
| Wrappers de IndexedDB | Dexie.js, idb, localForage |
| Librerías de utilidades | Lodash, date-fns, Ramda |
| Preprocesadores CSS (externos) | Bootstrap, Tailwind CSS vía CDN |
| Bundlers no estándar | Webpack, Vite (a menos que sea exclusivo de build) |

Todo lo que la aplicación necesita debe implementarse sobre las siguientes **Web APIs nativas**:

- **Custom Elements** (`customElements.define`) — para crear componentes reutilizables.
- **Shadow DOM** (`attachShadow({ mode: 'open' })`) — para encapsular estilos y estructura.
- **IndexedDB** — para persistir datos de forma estructurada y asíncrona en el cliente.
- **HTML Templates** (`<template>` + `<slot>`) — para definir estructuras declarativas.
- **TypeScript** — compilado a ES Modules estándar, sin runtime adicional.
- **CSS Custom Properties** (`--var`) — para theming dinámico sin preprocesadores.

> **Regla de cumplimiento:** El agente **Reviewer** bloqueará cualquier PR que introduzca una dependencia externa. El agente **GitHub** auditará el árbol de archivos antes de cada commit para detectar directorios `node_modules` o archivos `package-lock.json` con entradas no autorizadas.

---

### 1.3 La Trinidad de Agentes

El desarrollo del proyecto está orquestado por tres agentes especializados que operan en etapas distintas del ciclo de vida de cada tarea. A este sistema se le denomina **Trinidad de Agentes**.

```
┌─────────────────────────────────────────────────────────────┐
│                    TRINIDAD DE AGENTES                      │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   BUILDER    │───►│   REVIEWER   │───►│    GITHUB    │  │
│  │              │    │              │    │              │  │
│  │  Construye   │    │  Valida y    │    │  Publica y   │  │
│  │  el código   │    │  audita el   │    │  gestiona el │  │
│  │  y la UI     │    │  código      │    │  repositorio │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
│                    ▲              │                         │
│                    │              ▼                         │
│              ┌─────────────────────────┐                   │
│              │      DOCUMENTALISTA     │                   │
│              │                         │                   │
│              │  Registra decisiones,   │                   │
│              │  recetas y trazabilidad │                   │
│              └─────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

#### Agente 1 — Builder

**Rol:** Senior Frontend Architect  
**Responsabilidad principal:** Diseñar e implementar cada Web Component siguiendo los principios de **Atomic Design** (Átomos → Moléculas → Organismos).

Cada componente que produce el Builder cumple invariablemente con:

1. Herencia de `HTMLElement`.
2. Shadow DOM activado para aislamiento de estilos.
3. Integración con IndexedDB cuando el componente requiere persistencia.
4. Theming completo mediante CSS Custom Properties (variables `--dojo-*`).
5. Accesibilidad WCAG 2.1 con roles ARIA semánticos.

El Builder entrega, por cada componente: arquitectura, código TypeScript, esquema de IndexedDB, CSS encapsulado, API técnica y ejemplo de uso.

---

#### Agente 2 — Reviewer

**Rol:** Senior Code Reviewer  
**Responsabilidad principal:** Auditar cada Pull Request antes de su integración a la rama principal.

Clasifica sus hallazgos en tres niveles de severidad:

| Nivel | Símbolo | Impacto |
|---|---|---|
| Bloqueante | 🔴 MUST FIX | Impide el merge. Bug crítico, vulnerabilidad de seguridad o violación de Zero Dependencies |
| Importante | 🟡 SHOULD FIX | Deuda técnica o problema de accesibilidad. Merge posible pero no recomendado |
| Sugerencia | 🔵 NICE TO HAVE | Mejora de legibilidad u optimización no crítica |

El Reviewer aplica los estándares **OWASP Top 10**, **WCAG 2.1** y los principios **SOLID** en cada revisión. Nunca aprueba un PR con hallazgos 🔴 activos.

---

#### Agente 3 — GitHub

**Rol:** Senior DevOps Engineer  
**Responsabilidad principal:** Gestionar el ciclo de vida del repositorio: ramas, commits, Issues y Pull Requests.

Convenciones que aplica de forma estricta:

- **Naming de ramas:** `[tipo]/[id-issue]-[nombre-descriptivo]`  
  Ejemplo: `feat/12-kanban-board-component`
- **Mensajes de commit:** Conventional Commits  
  Ejemplo: `feat(board): add drag-and-drop support`
- **PRs:** Siempre vinculados a un Issue con `Closes #NNN`.
- **Auditoría pre-commit:** Detecta y bloquea secretos, `node_modules` y archivos de caché.

> **Restricción absoluta:** El agente GitHub nunca hace merge de forma autónoma. El merge final siempre requiere intervención humana.

---

#### Agente de soporte — Documentalista

**Rol:** Technical Writer & Knowledge Manager  
**Responsabilidad principal:** Mantener este COOKBOOK actualizado tras cada acción relevante de los otros agentes.

Opera bajo una **estrategia de Append**: nunca sobreescribe el archivo completo; añade nuevas secciones o actualiza las existentes preservando el historial.

---

### 1.4 Flujo de trabajo entre agentes

Para cada ticket de desarrollo, el flujo estándar es el siguiente:

```
Issue creado en GitHub
        │
        ▼
[GitHub] Crea rama: feat/NNN-nombre
        │
        ▼
[Builder] Implementa el componente en la rama
        │
        ▼
[GitHub] Crea Pull Request → Closes #NNN
        │
        ▼
[Reviewer] Audita el PR
   ├─ 🔴 Bloqueante → Solicita cambios → [Builder] corrige
   └─ ✅ Aprobado → Notifica al humano
        │
        ▼
[Humano] Hace merge a main
        │
        ▼
[Documentalista] Actualiza COOKBOOK.md
```

---

### 1.5 Convenciones globales del proyecto

| Convención | Valor |
|---|---|
| Lenguaje | TypeScript (compilado a ES Modules) |
| Metodología de componentes | Atomic Design |
| Nomenclatura de variables CSS | `--dojo-[propiedad]` |
| Motor de persistencia | IndexedDB nativo (sin wrappers) |
| Estrategia de estilos | Shadow DOM + CSS Custom Properties |
| Estándar de commits | Conventional Commits |
| Base de accesibilidad | WCAG 2.1 nivel AA |
| Estándar de seguridad | OWASP Top 10 |

---

*Siguiente sección → [Glosario de Términos](#2-glosario-de-términos)*

---

## 2. Glosario de Términos

| Término | Definición en el contexto de este proyecto |
|---|---|
| **Web Component** | Elemento HTML personalizado creado con la API nativa `customElements.define`, que encapsula estructura, estilos y comportamiento. |
| **Custom Element** | Clase TypeScript que extiende `HTMLElement` y se registra como una nueva etiqueta HTML. |
| **Shadow DOM** | Árbol DOM aislado adjunto a un elemento, que impide que sus estilos internos afecten al documento principal y viceversa. Siempre se usa con `mode: 'open'` en este proyecto. |
| **Atomic Design** | Metodología de diseño de componentes propuesta por Brad Frost. Los componentes se clasifican en Átomos (mínimos, indivisibles), Moléculas (combinación de átomos) y Organismos (secciones completas de UI). |
| **Átomo** | Componente más pequeño e indivisible de la UI. Ej: un botón, un badge de prioridad, un chip de etiqueta. |
| **Molécula** | Combinación de átomos que forma una unidad funcional. Ej: una tarjeta de tarea (título + prioridad + etiquetas). |
| **Organismo** | Sección completa de la interfaz. Ej: columna del tablero Kanban, panel de detalle de tarea. |
| **IndexedDB** | Base de datos NoSQL orientada a objetos embebida en el navegador. Soporta transacciones asíncronas y grandes volúmenes de datos estructurados. En este proyecto se usa sin wrappers externos. |
| **Object Store** | Equivalente a una tabla en IndexedDB. Cada entidad del dominio (Task, Column, Label) tiene su propio Object Store. |
| **Zero Dependencies** | Restricción de arquitectura que prohíbe el uso de cualquier librería o framework externo. Todo el código se basa en Web APIs nativas del navegador. |
| **CSS Custom Properties** | Variables CSS nativas declaradas con `--nombre-variable`. Se usan para theming dinámico sin preprocesadores. Siguen el patrón `--dojo-[propiedad]`. |
| **Shadow Root** | Raíz del Shadow DOM de un componente. Es el nodo padre de todo el contenido encapsulado. |
| **Slot** | Punto de inserción declarativo en un Web Component que permite proyectar contenido del Light DOM al interior del Shadow DOM. |
| **Conventional Commits** | Estándar de mensajes de commit con el formato `tipo(alcance): descripción`. Facilita la generación de changelogs y la lectura del historial. |
| **ADR** | Architecture Decision Record. Registro formal de una decisión de arquitectura: contexto, opciones evaluadas, decisión tomada y consecuencias. |
| **Trinidad de Agentes** | Sistema de tres agentes especializados (Builder, Reviewer, GitHub) que colaboran en el ciclo de vida de cada tarea, coordinados por el Documentalista. |
| **WCAG 2.1 AA** | Web Content Accessibility Guidelines, nivel AA. Estándar de accesibilidad que exige, entre otros, una relación de contraste de color mínima de 4.5:1 para texto normal. |
| **Kanban** | Metodología de gestión visual de tareas mediante columnas que representan estados de flujo de trabajo. |

---

## 3. Registro de Decisiones de Arquitectura (ADR)

---

### ADR-001 — Zero Dependencies como restricción de primer orden

**Fecha:** 2026-03-25  
**Estado:** ✅ Aceptada  
**Agente responsable:** Builder (propone) + Reviewer (aplica)

#### Contexto

Al iniciar el proyecto se evaluó si usar un framework de UI (React, Vue) o un wrapper de IndexedDB (idb, Dexie) para acelerar el desarrollo.

#### Opciones evaluadas

| Opción | Ventajas | Desventajas |
|---|---|---|
| React + Dexie.js | Ecosistema maduro, DX alta | Dependencias externas, overhead, curva de actualización |
| Lit + idb | Ligero, cercano a estándares | Sigue siendo una abstracción externa |
| **Web APIs nativas** | Sin dependencias, durabilidad máxima, portabilidad total | Mayor verbosidad inicial |

#### Decisión

Usar exclusivamente **Web APIs nativas** del navegador. La restricción Zero Dependencies es obligatoria y su violación es causa de bloqueo en el PR review.

#### Consecuencias

- El código es más verboso al interactuar con IndexedDB directamente.
- No hay riesgo de breaking changes por actualizaciones de dependencias.
- Todos los desarrolladores pueden contribuir con solo conocer TypeScript y las APIs del navegador.

---

### ADR-002 — IndexedDB como motor de persistencia

**Fecha:** 2026-03-25  
**Estado:** ✅ Aceptada  
**Agente responsable:** Builder

#### Contexto

Se necesita persistir tareas, columnas y etiquetas en el cliente sin servidor. Se evaluaron las alternativas de almacenamiento disponibles en el navegador.

#### Opciones evaluadas

| Opción | Límite de almacenamiento | Soporte de consultas | Transacciones |
|---|---|---|---|
| `localStorage` | ~5 MB | No (solo clave-valor) | No |
| `sessionStorage` | ~5 MB | No | No |
| **IndexedDB** | Cientos de MB | Sí (índices) | Sí |
| Cache API | Sin límite fijo | No (orientado a red) | No |

#### Decisión

Usar **IndexedDB** con la API nativa (`IDBOpenDBRequest`, transacciones, índices). Tres Object Stores: `tasks`, `columns`, `labels`.

#### Consecuencias

- API asíncrona basada en eventos (se encapsulará en Promesas dentro de cada componente).
- Mayor capacidad de almacenamiento respecto a localStorage.
- Soporte de índices para consultas eficientes (ej. filtrar tareas por `statusId`).

---

### ADR-003 — Atomic Design para la arquitectura de componentes

**Fecha:** 2026-03-25  
**Estado:** ✅ Aceptada  
**Agente responsable:** Builder

#### Contexto

Se necesitaba una metodología que guíe la creación de componentes de forma escalable y consistente, sin depender de una librería de estilos externa.

#### Decisión

Adoptar **Atomic Design** con tres niveles activos:

- **Átomos:** Componentes indivisibles (botón, chip de etiqueta, badge de prioridad, ícono).
- **Moléculas:** Tarjeta de tarea (combina título, prioridad y etiquetas).
- **Organismos:** Columna Kanban, tablero completo, panel de detalle.

#### Consecuencias

- Cada componente tiene responsabilidad única y clara.
- Se favorece la reutilización: un átomo construido una vez se usa en múltiples moléculas.
- La estructura de carpetas en `src/` reflejará esta jerarquía.

---

### ADR-005 — Toolchain de desarrollo: solo `tsc`, sin bundler

**Fecha:** 2026-03-25  
**Estado:** ✅ Aceptada  
**Agente responsable:** Builder

#### Contexto

Al definir el stack se evaluó si usar un bundler moderno (Vite, Rollup, esbuild) para compilar y servir el proyecto durante el desarrollo.

#### Opciones evaluadas

| Opción | Ventajas | Desventajas |
|---|---|---|
| Vite + plugins | HMR, bundling optimizado | Dependencia extra, abstracción sobre herramientas nativas |
| Rollup | Bundles eficientes | Curva de configuración, dependencia adicional |
| **Solo `tsc` + servidor HTTP nativo** | Zero deps adicionales, transparente, reproducible | Sin HMR (live-reload manual con Live Preview) |

#### Decisión

Usar **únicamente `tsc`** como herramienta de compilación. El servidor de desarrollo puede ser VS Code Live Preview, `python3 -m http.server` o un script Node.js nativo sin dependencias. El output en `/dist` son ES Modules puros que el navegador consume directamente.

#### Consecuencias

- El `package.json` solo tendrá `typescript` en `devDependencies`. No existe `dependencies`.
- No hay paso de bundling: el código compilado es exactamente lo que corre en el navegador.
- El deploy es tan simple como copiar `/dist` a cualquier hosting estático.

---

### ADR-004 — Paleta de colores con garantía de contraste WCAG AA

**Fecha:** 2026-03-25  
**Estado:** ✅ Aceptada  
**Agente responsable:** Builder + Reviewer

#### Contexto

Las etiquetas de las tareas tienen color de fondo dinámico con texto blanco. Era necesario garantizar que cualquier color seleccionado (predefinido o personalizado) fuera legible.

#### Decisión

Definir una **paleta de 10 colores predefinidos** que superan una relación de contraste de 4.5:1 con texto blanco (`#FFFFFF`), cumpliendo WCAG 2.1 nivel AA. Para colores personalizados, el sistema valida el contraste antes de permitir el guardado y sugiere una versión más oscura si no lo cumple.

#### Paleta aprobada

| Nombre | Hex |
|---|---|
| Rojo | `#B91C1C` |
| Naranja | `#C2410C` |
| Ámbar | `#B45309` |
| Verde | `#15803D` |
| Azul | `#1D4ED8` |
| Índigo | `#4338CA` |
| Violeta | `#6D28D9` |
| Rosa | `#BE185D` |
| Cian | `#0E7490` |
| Gris | `#374151` |

---

## 4. Guía de Implementación

> Registro cronológico de cada paso ejecutado en el proyecto. Se añade una nueva entrada tras cada acción significativa.

---

### Paso 1 — Definición de Requerimientos

**Fecha:** 2026-03-25  
**Agente ejecutor:** `documentalista`  
**Estado:** ✅ Completado

#### Descripción

Se creó la carpeta `requirements/` con la documentación completa del proyecto antes de escribir una sola línea de código. Este paso sienta las bases funcionales, técnicas y de experiencia de usuario que guiarán al agente Builder.

#### Archivos generados

| Archivo | Propósito |
|---|---|
| [`requirements/index.md`](./requirements/index.md) | Punto de entrada: visión general, tabla de funcionalidades, paleta de colores y stack tecnológico recomendado |
| [`requirements/functional-requirements.md`](./requirements/functional-requirements.md) | 5 bloques de requerimientos funcionales (RF-01 a RF-05) con 23 sub-requerimientos y 7 reglas de negocio |
| [`requirements/data-model.md`](./requirements/data-model.md) | Interfaces TypeScript de `Task`, `Column` y `Label`; diagrama ER; configuración de IndexedDB; API interna de repositorios; estrategia de migración versionada |
| [`requirements/ui-ux.md`](./requirements/ui-ux.md) | Layout ASCII del tablero, especificación de 8 componentes, tokens de color modo claro/oscuro, animaciones y guía de accesibilidad |
| [`requirements/improvements.md`](./requirements/improvements.md) | 10 mejoras sugeridas con tabla de priorización (fechas de vencimiento, modo oscuro, exportación, subtareas, PWA, etc.) |

#### Decisiones clave tomadas en este paso

- Se establece **IndexedDB** como único motor de persistencia (→ ADR-002).
- Se fija la **paleta de 10 colores** con contraste WCAG AA para etiquetas (→ ADR-004).
- Se documenta el modelo de datos con tipos TypeScript antes de implementar (contrato de interfaz).
- Se incluyen **6 estados por defecto** para las columnas del tablero Kanban.
- Se definen **4 niveles de prioridad** con íconos: Baja ⬇️, Media ➡️, Alta ⬆️, Urgente 🔥.

#### Estructura resultante

```
requirements/
├── index.md
├── functional-requirements.md
├── data-model.md
├── ui-ux.md
└── improvements.md
```

---

### Paso 2 — Inicialización del COOKBOOK

**Fecha:** 2026-03-25  
**Agente ejecutor:** `documentalista`  
**Estado:** ✅ Completado

#### Descripción

Se creó el archivo `COOKBOOK.md` en la raíz del proyecto con la sección inaugural **Filosofía del Proyecto**. Este documento es la bitácora técnica del proyecto y se actualizará tras cada acción relevante de los agentes.

#### Contenido inicial documentado

- Visión general del proyecto y motivación del enfoque Zero Dependencies.
- Tabla de categorías prohibidas y Web APIs nativas que las reemplazan.
- Diagrama y descripción de la **Trinidad de Agentes** (Builder, Reviewer, GitHub, Documentalista).
- Flujo de trabajo estándar del ciclo de vida de un ticket.
- Tabla de convenciones globales del proyecto.

#### Archivos afectados

| Archivo | Acción |
|---|---|
| `COOKBOOK.md` | Creado en la raíz del proyecto |

---

---

### Paso 3 — Definición del Stack Tecnológico

**Fecha:** 2026-03-25  
**Agente ejecutor:** `documentalista` (registro) + decisiones del agente `builder`  
**Estado:** ✅ Completado

#### Descripción

Se formalizó el stack tecnológico completo del proyecto, alineándolo con el principio **Zero Dependencies** establecido en la Filosofía del Proyecto. Se creó un archivo dedicado `requirements/tech-stack.md` y se actualizaron `requirements/index.md` y `requirements/data-model.md` para eliminar todas las referencias a librerías externas que habían quedado del borrador inicial.

#### Decisiones clave tomadas en este paso

- **TypeScript 5.x** como única herramienta de build. Output: ES Modules nativos (→ ADR-005).
- **Web Components** (Custom Elements v1 + Shadow DOM v1 + `<template>`) como arquitectura de UI, sin ningún framework.
- **IndexedDB API nativa** sin wrappers (`idb`, Dexie). La asincronía se gestiona con el helper `idbRequest<T>` propio.
- **HTML5 Drag and Drop API** nativa para el drag & drop del tablero.
- **Parser de Markdown propio** en TypeScript (subconjunto CommonMark) con sanitización manual del DOM para prevenir XSS.
- **Cálculo WCAG 2.1 propio** en TypeScript para validar contraste de colores de etiquetas.
- **Tres opciones de dev server** sin instalar nada extra: VS Code Live Preview, `python3 -m http.server`, script Node.js nativo.

#### Archivos afectados

| Archivo | Acción | Cambio principal |
|---|---|---|
| `requirements/tech-stack.md` | Creado | Documento completo del stack con ejemplos de código |
| `requirements/index.md` | Actualizado | Tabla de stack reemplazada; referencia a `tech-stack.md` añadida |
| `requirements/data-model.md` | Actualizado | Eliminada referencia a `idb`; ejemplo de `openDatabase()` reescrito con API nativa |

#### Estructura del nuevo archivo

```
requirements/tech-stack.md
├── Principio rector: Zero Dependencies
├── Tabla resumen del stack (10 capas)
├── Tecnologías de producción (detalle con código)
│   ├── TypeScript + tsconfig.json
│   ├── HTML5 + Web Components
│   ├── CSS3 + Custom Properties
│   ├── IndexedDB nativo + helper idbRequest<T>
│   ├── HTML5 Drag and Drop API
│   ├── Validación de contraste WCAG 2.1
│   └── Parser de Markdown propio
├── Herramientas de desarrollo
├── Visualización durante el desarrollo (3 opciones)
├── Estructura de carpetas del proyecto
├── Flujo de build
└── Tabla de lo que está explícitamente prohibido
```

---

---

### Paso 4 — Creación de Historias de Usuario

**Fecha:** 2026-03-25  
**Agente ejecutor:** `documentalista`  
**Estado:** ✅ Completado

#### Descripción

Se creó la carpeta `user-stories/` dentro de `requirements/`, con 11 historias de usuario redactadas en formato **Como / Quiero / Para** y criterios de aceptación en **Gherkin** (`Feature` / `Scenario` / `Given-When-Then`). La historia de usuario US-00 documenta el stack tecnológico como restricción funcional del proyecto.

#### Archivos generados

| Archivo | Historia | RF / Área |
|---|---|---|
| [`user-stories/index.md`](./requirements/user-stories/index.md) | Índice con tabla de todas las historias | — |
| [`US-00-tech-stack.md`](./requirements/user-stories/US-00-tech-stack.md) | Stack Tecnológico — Zero Dependencies | Infraestructura |
| [`US-01-kanban-board.md`](./requirements/user-stories/US-01-kanban-board.md) | Visualización del tablero Kanban | RF-01 |
| [`US-02-column-management.md`](./requirements/user-stories/US-02-column-management.md) | Gestión de columnas (CRUD) | RF-02 |
| [`US-03-drag-and-drop.md`](./requirements/user-stories/US-03-drag-and-drop.md) | Arrastrar tarjetas entre columnas | RF-01 |
| [`US-04-create-task.md`](./requirements/user-stories/US-04-create-task.md) | Crear tarea con título y prioridad | RF-03 |
| [`US-05-edit-task.md`](./requirements/user-stories/US-05-edit-task.md) | Editar tarea existente | RF-03 |
| [`US-06-delete-task.md`](./requirements/user-stories/US-06-delete-task.md) | Eliminar tarea con confirmación | RF-03 |
| [`US-07-label-management.md`](./requirements/user-stories/US-07-label-management.md) | Gestión de etiquetas (CRUD) | RF-04 |
| [`US-08-label-colors.md`](./requirements/user-stories/US-08-label-colors.md) | Colores de etiqueta con garantía WCAG AA | RF-04 |
| [`US-09-persistence.md`](./requirements/user-stories/US-09-persistence.md) | Persistencia con IndexedDB | RF-05 |
| [`US-10-filter-search.md`](./requirements/user-stories/US-10-filter-search.md) | Filtrado y búsqueda de tareas | RF-05 |

#### Convenciones aplicadas

- **Nomenclatura:** `US-[número de 2 dígitos]-[slug-descriptivo].md`
- **Formato de historia:** `Como [rol] / Quiero [acción] / Para [beneficio]`
- **Formato de criterios:** Gherkin estricto con `Feature`, `Scenario`, `Given`, `When`, `Then`, `And`
- **Cobertura:** Todas las historias tienen al menos 4 escenarios; las historias críticas tienen hasta 10

#### Archivos afectados

| Archivo | Acción |
|---|---|
| `requirements/user-stories/` | Carpeta creada con 12 archivos |
| `requirements/index.md` | Actualizado a v1.1 con referencia a `user-stories/` |

---

### Paso 5 — Implementación del Skeleton del Proyecto (US-00 / Issue #1)

**Fecha:** 2026-03-25  
**Agente ejecutor:** `builder`  
**Issue asociado:** [#1 — US-00 Stack Tecnológico](https://github.com/Code-Dojo-Labs/agent-app/issues/1)  
**Rama:** `feat/1-stack-tecnologico-zero-dependencies`  
**Commit:** `feat(infra): setup Zero Dependencies project skeleton` (`2b02ba0`)  
**Estado:** ✅ Completado — pendiente de PR y revisión

#### Descripción

El agente Builder implementó la infraestructura base del proyecto conforme a la US-00 y al stack definido en `requirements/tech-stack.md`. Se estableció la estructura de carpetas completa de `src/`, la configuración de TypeScript, el HTML raíz y toda la capa de acceso a datos (IndexedDB + Repositories). La compilación es limpia (`tsc --noEmit` sin errores) y el output en `dist/` son ES Modules puros.

#### Criterios de aceptación cubiertos (US-00)

| Escenario Gherkin | Estado |
|---|---|
| Proyecto compilado sin bundler externo | ✅ Solo `tsc`, output en `/dist` como ES Modules |
| Configuración estricta de TypeScript | ✅ `tsconfig.json` con `ES2022`, `strict: true`, `outDir: ./dist` |
| Componentes UI como Web Components | 🔄 Arquitectura preparada; componentes se implementan en siguientes issues |
| Persistencia con IndexedDB nativo | ✅ `database.ts` + 3 repositories con API nativa, sin wrappers |
| Drag and drop con API nativa HTML5 | 🔄 Pendiente de issue de tablero Kanban |
| Validación de contraste WCAG implementada manualmente | ✅ `contrast.ts` con `relativeLuminance`, `contrastRatio`, `pickTextColor` |
| Parser de Markdown implementado de forma propia | ✅ `markdown.ts` XSS-safe via DOM API, sin `innerHTML` |
| Módulos cargados como ES Modules nativos | ✅ `<script type="module">` en `public/index.html` |
| Servidor de desarrollo sin dependencias de producción | ✅ Script `serve` usa `python3 -m http.server` |

#### Archivos creados

| Archivo | Propósito |
|---|---|
| `package.json` | `typescript` como única devDependency; scripts `build`, `watch`, `serve` |
| `tsconfig.json` | Target ES2022, strict mode, rootDir `./src`, outDir `./dist`, declaration |
| `public/index.html` | HTML raíz con tokens CSS globales `--dojo-*`, dark mode y `<script type="module">` |
| `src/types/models.ts` | Interfaces `Task`, `Column`, `Label`, tipo `Priority`, constante `DEFAULT_COLUMNS` |
| `src/db/database.ts` | `openDatabase()` (singleton), `idbRequest<T>()`, `idbTransaction()`, `getStore()` |
| `src/db/task.repository.ts` | CRUD completo de tareas + `reorderTasks()` para Drag and Drop |
| `src/db/column.repository.ts` | CRUD de columnas + `seedDefaultColumns()` (inserción de datos por defecto) |
| `src/db/label.repository.ts` | CRUD de etiquetas con validación de unicidad case-insensitive |
| `src/utils/uuid.ts` | `generateUUID()` wrapper sobre `crypto.randomUUID()` |
| `src/utils/contrast.ts` | Implementación WCAG 2.1: `relativeLuminance`, `contrastRatio`, `meetsWcagAA`, `pickTextColor`, `isLabelColorAccessible` |
| `src/utils/markdown.ts` | Parser de Markdown propio: headings, bold, italic, código, listas, enlaces con sanitización XSS; `markdownToPlainText()` para accesibilidad |
| `src/main.ts` | Entry point: `openDatabase()` → `seedDefaultColumns()` → registro de Web Components |

#### Archivos modificados

| Archivo | Cambio |
|---|---|
| `.gitignore` | Añadidos `dist/` y `node_modules/` (formato correcto sin prefijo `./`) |

#### Estructura resultante de `src/`

```
src/
├── types/
│   └── models.ts          # interfaces Task, Column, Label, Priority
├── db/
│   ├── database.ts         # openDatabase(), idbRequest<T>(), idbTransaction()
│   ├── task.repository.ts
│   ├── column.repository.ts
│   └── label.repository.ts
├── utils/
│   ├── uuid.ts             # crypto.randomUUID() wrapper
│   ├── contrast.ts         # WCAG 2.1 contrast ratio
│   └── markdown.ts         # Parser Markdown XSS-safe
└── main.ts                 # Entry point de la aplicación
```

#### Resultado del build

```
$ npm run build
→ tsc && cp public/index.html dist/index.html
→ 19 archivos generados en dist/
→ 0 errores TypeScript · 0 vulnerabilidades npm
```

#### Notas de seguridad (OWASP)

- **XSS (A03):** El parser de Markdown nunca usa `innerHTML` con input del usuario. Todo el contenido se inserta con `createElement` + `textContent`. Las URLs de enlaces se validan contra una lista de protocolos permitidos (`http:`, `https:`).
- **Inyección (A03):** La validación de unicidad de etiquetas opera en memoria antes de escribir en IndexedDB, evitando condiciones de carrera en escrituras concurrentes.
- **Datos sensibles (A02):** Ningún dato de configuración, credencial o token se incluye en el código fuente.

---

*El siguiente paso será la creación del Pull Request para el Issue #1 y su revisión por el agente Reviewer.*

---

### Paso 6 — Apertura del Pull Request #18

**Fecha:** 2026-03-25  
**Agente ejecutor:** `gitjmz` (PR) + `documentalista` (registro)  
**Issue asociado:** [#1 — US-00 Stack Tecnológico](https://github.com/Code-Dojo-Labs/agent-app/issues/1)  
**PR:** [#18 — feat(infra): Zero Dependencies project skeleton](https://github.com/Code-Dojo-Labs/agent-app/pull/18)  
**Estado:** 🔄 Abierto — pendiente de revisión por agente Reviewer

#### Descripción

El agente `gitjmz` creó el Pull Request formal para incorporar la rama `feat/1-stack-tecnologico-zero-dependencies` en la rama `prod`. El PR fue redactado con una descripción técnica completa que incluye tabla de cambios por capa, resultado del build, criterios de aceptación US-00 y notas de seguridad OWASP.

#### Datos del PR

| Campo | Valor |
|---|---|
| Número | #18 |
| Título | `feat(infra): Zero Dependencies project skeleton — US-00 Stack Tecnológico` |
| URL | https://github.com/Code-Dojo-Labs/agent-app/pull/18 |
| Rama origen | `feat/1-stack-tecnologico-zero-dependencies` |
| Rama destino | `prod` |
| Issue vinculado | `Closes #1` |
| Commits incluidos | `feat(infra): setup Zero Dependencies project skeleton` (`2b02ba0`)<br>`docs(cookbook): update to v0.5.0 with steps 4 and 5` (`79c2950`) |
| Archivos cambiados | 15 archivos · +979 / -1 líneas |

#### Siguiente acción

El agente **Reviewer** tiene asignada la auditoría de este PR. Debe:
1. Leer el diff completo del PR.
2. Clasificar los hallazgos en 🔴 Bloqueante / 🟡 Importante / 🔵 Sugerencia.
3. Publicar el reporte como comentario formal en [PR #18](https://github.com/Code-Dojo-Labs/agent-app/pull/18).
4. Emitir veredicto: Aprobado ✅ / Cambios solicitados 🔄 / Solo comentarios 💬.

> **Restricción:** El merge a `prod` está **bloqueado** hasta que el Reviewer emita su veredicto y el humano apruebe.

---

### Paso 7 — Implementación de la Visualización del Tablero Kanban (US-01 / Issue #2)

**Fecha:** 2026-03-25
**Agente ejecutor:** `builder`
**Issue asociado:** [#2 — US-01 Visualización del tablero Kanban](https://github.com/Code-Dojo-Labs/agent-app/issues/2)
**Rama:** `feat/2-visualizacion-tablero-kanban`
**Estado:** ✅ Implementado — pendiente de PR y revisión

#### Descripción

El agente Builder implementó los tres Web Components necesarios para la visualización del tablero Kanban (US-01), siguiendo la arquitectura **Atomic Design** (Átomo → Molécula → Organismo). Todos los componentes usan Shadow DOM, CSS Custom Properties del sistema de theming y cumplen con los criterios de accesibilidad WCAG 2.1.

#### Criterios de aceptación cubiertos (US-01)

| Escenario Gherkin | Estado |
|---|---|
| Tablero cargado con columnas por defecto | ✅ `dojo-kanban-board` carga desde IndexedDB con `getAllColumns()` |
| Cabecera de columna con ícono, nombre y conteo | ✅ `dojo-column-header` muestra los tres elementos con ARIA |
| Scroll vertical independiente por columna | ✅ `.content` en `dojo-kanban-column` con `overflow-y: auto` |
| Scroll horizontal del tablero | ✅ `.board-track` con `overflow-x: auto` |
| Conteo actualizado con filtro activo (X / Y) | ✅ `activeFilter` setter en `dojo-kanban-board` actualiza conteos en tiempo real |

#### Componentes creados (Atomic Design)

| Nivel | Componente | Tag HTML | Archivo |
|---|---|---|---|
| Átomo | Column Header | `<dojo-column-header>` | `src/components/atoms/dojo-column-header/dojo-column-header.ts` |
| Molécula | Kanban Column | `<dojo-kanban-column>` | `src/components/molecules/dojo-kanban-column/dojo-kanban-column.ts` |
| Organismo | Kanban Board | `<dojo-kanban-board>` | `src/components/organisms/dojo-kanban-board/dojo-kanban-board.ts` |
| Organismo | App Root | `<dojo-app>` | `src/components/organisms/dojo-app/dojo-app.ts` |

#### Detalles de implementación por componente

**`dojo-column-header` (Átomo)**
- Atributos observados: `icon`, `column-name`, `count`, `total-count`, `accent-color`
- Conteo en formato `X / Y` cuando `count !== total-count` (filtro activo)
- Badge con `aria-label` descriptivo para lectores de pantalla
- Borde superior de color con `accent-color` (opcional, para futura colorización de columnas)

**`dojo-kanban-column` (Molécula)**
- Scroll vertical independiente con scrollbar customizado (cross-browser)
- Estado visual `drag-over` con outline dashed cuando se arrastra una tarea sobre la columna
- Mensaje "Sin tareas" oculto automáticamente cuando el slot tiene contenido (`slotchange`)
- Evento `dojo:column-drop` con `{ columnId, taskId }` para futura implementación DnD
- Listeners de drag & drop desregistrados en `disconnectedCallback` (sin memory leaks)

**`dojo-kanban-board` (Organismo)**
- Carga columnas y tareas en paralelo con `Promise.all`
- Estados: `loading` (spinner + `aria-busy`) → `columns` → `error` (mensaje + botón reintentar)
- Setter `activeFilter` actualiza conteos en tiempo real sin recargar IndexedDB
- Eventos: `dojo:board-ready` (éxito) y `dojo:board-error` (fallo)

**`dojo-app` (Organismo raíz)**
- Header fijo con logo, título y subtítulo
- Área de tablero con `flex: 1` y `min-height: 0` para ocupar el espacio restante
- Roles ARIA: `role="banner"` en header, `role="main"` en área del tablero

#### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/main.ts` | Registro dinámico de `dojo-app` via `await import()` |

#### Estructura `src/components/`

```
src/components/
├── atoms/
│   └── dojo-column-header/
│       └── dojo-column-header.ts   # Cabecera de columna
├── molecules/
│   └── dojo-kanban-column/
│       └── dojo-kanban-column.ts   # Columna con scroll + DnD drop target
└── organisms/
    ├── dojo-kanban-board/
    │   └── dojo-kanban-board.ts    # Tablero completo + carga IndexedDB
    └── dojo-app/
        └── dojo-app.ts             # Root component (header + board area)
```

#### Resultado del build

```
$ npm run build
→ tsc && cp public/index.html dist/index.html
→ 0 errores TypeScript · build limpio
```

#### Decisión de diseño: Carga de tareas en bootstrap del board

`dojo-kanban-board` carga las tareas de **todas** las columnas en el `connectedCallback` para tener disponible el total de tareas por columna y poder mostrar el formato `X / Y` cuando se activa un filtro. Esto es aceptable para el tamaño de datos de un tablero Kanban personal (decenas o cientos de tareas), donde la consulta a IndexedDB es sub-milisegundo. Si el dataset crece, se puede memoizar por columna y recargar solo la columna afectada.

*Este PR fue creado como [PR #19](https://github.com/Code-Dojo-Labs/agent-app/pull/19) y revisado por el agente Reviewer.*

---

### Paso 8 — Implementación de la Gestión de Columnas del Tablero (US-02 / Issue #3)

**Fecha:** 2026-03-25  
**Agente ejecutor:** `builder`  
**Issue asociado:** [#3 — US-02 Gestión de columnas del tablero](https://github.com/Code-Dojo-Labs/agent-app/issues/3)  
**Rama:** `feat/3-gestion-columnas-tablero`  
**Estado:** ✅ Mergeado a `prod` — PR [#20](https://github.com/Code-Dojo-Labs/agent-app/pull/20)

#### Descripción

El agente Builder implementó la gestión completa de columnas del tablero Kanban (US-02), añadiendo 3 nuevos Web Components y modificando los 2 componentes existentes del tablero. La solución cubre todos los escenarios Gherkin: crear, renombrar, eliminar (con mover o borrar tareas) y reordenar columnas mediante drag & drop.

#### Criterios de aceptación cubiertos (US-02)

| Escenario Gherkin | Estado |
|---|---|
| Crear nueva columna (nombre + icóno + UUID) | ✅ `DojoColumnDialog.openCreate()` → `createColumn()` en IndexedDB |
| Renombrar columna existente | ✅ `DojoColumnDialog.openRename()` → `updateColumn()` + atributo DOM |
| Eliminar columna sin tareas | ✅ `DojoColumnDialog.openDelete()` → `deleteColumn()` |
| Eliminar columna con tareas — mover | ✅ `updateTask({ statusId, order })` en paralelo + `deleteColumn()` |
| Eliminar columna con tareas — eliminar | ✅ `deleteTask()` en paralelo + `deleteColumn()` |
| Reordenar columnas mediante arrastre | ✅ DnD nativo `dragstart/dragover/drop` → `updateColumn({ order })` |

#### Componentes creados

| Nivel | Componente | Tag HTML | Archivo |
|---|---|---|---|
| Átomo | Column Menu | `<dojo-column-menu>` | `src/components/atoms/dojo-column-menu/dojo-column-menu.ts` |
| Átomo | Add Column Button | `<dojo-add-column-button>` | `src/components/atoms/dojo-add-column-button/dojo-add-column-button.ts` |
| Organismo | Column Dialog | `<dojo-column-dialog>` | `src/components/organisms/dojo-column-dialog/dojo-column-dialog.ts` |

#### Componentes modificados

| Componente | Cambios |
|---|---|
| `dojo-kanban-column` | Añadido `<dojo-column-menu>` en fila de cabecera; DnD de columna (`dragstart/dragover/drop`) con atributo `[dragging]` y `[drag-column-over]`; eventos `dojo:column-rename`, `dojo:column-delete`, `dojo:column-reorder` |
| `dojo-kanban-board` | Gestiona el ciclo completo de columnas (crear / renombrar / eliminar / reordenar); mantiene `_columns: Column[]` en memoria; monta un solo `<dojo-column-dialog>` compartido; añade `<dojo-add-column-button>` al final del track |

#### Detalles de implementación

**`dojo-column-menu` (Átomo)**
- Botón trigger `⋮` con `aria-haspopup="menu"` y `aria-expanded` dinámico
- Menú flotante con posicionamiento absoluto (`right: 0`)
- Cierre automático al hacer clic fuera (`document.click`) con limpieza en `disconnectedCallback`
- Opciones: ✏️ Renombrar y 🗑️ Eliminar (coloreada con `--dojo-danger`)
- Guarda de idempotencia en `connectedCallback`

**`dojo-add-column-button` (Átomo)**
- Botón de 200 × 56 px con borde discontinuo `dashed` que se colorea al hover
- Emite `dojo:add-column` con `bubbles + composed`
- Guarda de idempotencia en `connectedCallback`

**`dojo-column-dialog` (Organismo)**
- API pública: `openCreate()`, `openRename(columnId, currentName)`, `openDelete(columnId, columnName, otherColumns[])`
- Backdrop semitransparente con `role="dialog" aria-modal="true"`
- Cierre con clic en backdrop o tecla `Escape`
- Modo *crear*: campo de nombre + grid de 12 íconos preseleccionables (`role="option"` + `aria-pressed`)
- Modo *renombrar*: campo de nombre prerelleno + focus + select al abrir
- Modo *eliminar*: alerta `role="alert"` + radiogroup (mover tareas a columna destino | eliminar tareas)
- Eventos: `dojo:dialog-create-column { name, icon }`, `dojo:dialog-rename-column { columnId, name }`, `dojo:dialog-delete-column { columnId, action, targetColumnId? }`
- Animación de entrada `dlg-in` (scale + translateY) via `@keyframes`

**Gestión de reorder en `dojo-kanban-board`**
- Al recibir `dojo:column-reorder { sourceId, targetId }`, reordena `_columns[]` en memoria usando `splice`
- Persiste con `Promise.all(columns.map((col, idx) => updateColumn(col.id, { order: idx })))`
- Si la persistencia falla, recarga el tablero desde IndexedDB para garantizar consistencia

**Gestión de eliminación en `dojo-kanban-board`**
- Acción `move`: `updateTask({ statusId: targetColumnId, order: ... })` en paralelo + `deleteColumn()`
- Acción `delete`: `deleteTask()` en paralelo + `deleteColumn()`
- Actualiza `_tasksByColumn` en memoria tras la operación

#### Estructura `src/components/` actualizada

```
src/components/
├── atoms/
│   ├── dojo-column-header/
│   ├── dojo-column-menu/          # Átomo NEW — menú contextual ⋮
│   └── dojo-add-column-button/    # Átomo NEW — botón "Añadir columna"
├── molecules/
│   └── dojo-kanban-column/        # MOD — menú + DnD columna
└── organisms/
    ├── dojo-kanban-board/         # MOD — gestión completa columnas
    ├── dojo-column-dialog/        # Organismo NEW — modal de gestión
    └── dojo-app/
```

#### Resultado del build

```
$ npm run build
→ tsc && cp public/index.html dist/index.html
→ 0 errores TypeScript · build limpio
```

#### Decisión de diseño: Un solo `<dojo-column-dialog>` por tablero

El `dojo-kanban-board` monta un único `<dojo-column-dialog>` en su shadow DOM y lo reutiliza para los tres modos (crear / renombrar / eliminar). Esto evita inflar el DOM con múltiples dialogs y centraliza la gestión de eventos, simplificando la limpieza de listeners.

---

#### Lecciones Aprendidas (extraídas del Review del PR #20)

> Sección generada por `@documentalista` tras la revisión del Reviewer.

| # | Hallazgo | Categoría | Lección |
|---|---|---|---|
| 1 | Memory leak en `document.addEventListener('keydown', ...)` con función anónima | 🔴 Bloqueante | **Todo listener en `document` o `window` debe almacenarse como propiedad de clase** (arrow function) para poder pasarla tanto a `addEventListener` como a `removeEventListener` con la misma referencia. Registrar en el momento de apertura (`_open`) y limpiar en cierre (`_close`) y en `disconnectedCallback`. Patrón ya correcto en `dojo-column-menu._onDocClick` — replicarlo en cualquier componente que escuche eventos globales. |
| 2 | El estado de `actionChoice` no se actualizaba al interactuar con el `<select>` antes del radio | 🔴 Bloqueante | **Los controles dependientes deben sincronizar el estado del control padre.** Cuando un `<select>` de columna destino cambia, el radio "Mover" debe marcarse automáticamente (`moveRadio.checked = true; actionChoice = 'move'`). La UI siempre debe reflejar la intención del usuario, no asumir que el flujo de interacción es lineal. |
| 3 | `_attachColumnDragListeners()` llamado dentro de `_render()`, no en `connectedCallback` | 🟡 Importante | **Los listeners que `disconnectedCallback` limpia deben registrarse en `connectedCallback`, no en funciones de render**. El guard de idempotencia (`childElementCount === 0`) evita que `_render()` se vuelva a llamar al reconectar, lo que dejaría sin escuchas al componente. Regla: render construye el DOM; `connectedCallback` conecta la lógica. |
| 4 | El grupo de botones de radio carecía de `role="radiogroup"` y `aria-label` | 🟡 Importante | **Los grupos de controles interactivos requieren semántica ARIA explícita** aunque el contexto parezca obvio visualmente. Añadir siempre `role="radiogroup"` con `aria-label` descriptivo a cualquier agrupación de radios dentro de Shadow DOM. Los lectores de pantalla no infieren el grupo por proximidad en el DOM. |

##### Patrones confirmados (best practices)

- ✅ **Propiedad de clase para handlers globales:** `private _onXxx = (e: Event): void => { ... }` — permite `add`/`removeEventListener` con la misma referencia.
- ✅ **Ciclo de vida claro:** `connectedCallback` para registrar listeners; `disconnectedCallback` para eliminarlos. `_render()` solo para construir markup.
- ✅ **Listeners en `document` solo mientras son necesarios:** registrar al abrir modales/menús, eliminar al cerrar (no mantenerlos activos todo el tiempo).
- ✅ **Accesibilidad en Shadow DOM:** `role`, `aria-label`, `aria-haspopup`, `aria-expanded` y `aria-modal` deben aplicarse aunque el componente esté aislado — los lectores de pantalla traversals el Shadow DOM con `composed: true`.

---

### Paso 9 — Implementación de la Eliminación de Tareas (US-06 / Issue #7)

**Issue asociado:** [#7 — US-06 Eliminar tarea](https://github.com/Code-Dojo-Labs/agent-app/issues/7)  
**PR:** ✅ Mergeado en `init` — [#24](https://github.com/Code-Dojo-Labs/agent-app/pull/24) (SHA: `4f9eafd`)  
**Branch:** `feat/7-eliminar-tarea`

#### Descripción

Implementa el flujo completo de eliminación de tareas con diálogo de confirmación. Incluye acceso desde el panel de detalle (botón en footer) y desde la tarjeta Kanban (botón rápido en hover). El diálogo es un modal `role="alertdialog"` accesible con focus trap, Escape/backdrop para cancelar y foco devuelto al disparador al cerrar.

#### Archivos creados

| Archivo | Tipo | Descripción |
|---|---|---|
| `src/components/organisms/dojo-delete-confirm-dialog/dojo-delete-confirm-dialog.ts` | Organismo NEW | Modal de confirmación de eliminación |

#### Archivos modificados

| Archivo | Cambios |
|---|---|
| `src/components/atoms/dojo-task-card/dojo-task-card.ts` | Botón `.quick-delete-btn` visible en hover; emite `dojo:task-delete-request` |
| `src/components/organisms/dojo-task-detail/dojo-task-detail.ts` | Sección footer con botón "Eliminar tarea" (rojo); getter `currentTaskId` |
| `src/components/organisms/dojo-kanban-board/dojo-kanban-board.ts` | Monta el dialog; handlers `_onTaskDeleteRequest` + `_handleTaskDeleteConfirm` |

#### Flujo de eventos

```
dojo:task-delete-request { taskId, taskTitle }
  → _onTaskDeleteRequest()
    → dialog.show(taskId, taskTitle, triggerEl)
      → (usuario confirma)
        → dojo:task-delete-confirm { taskId }
          → _handleTaskDeleteConfirm()
            → deleteTask(taskId)  [IndexedDB]
            → actualiza _tasksByColumn + refresca columna
            → cierra panel de detalle si currentTaskId === taskId
```

#### Accesibilidad (WCAG 2.1 AA)

- `aria-hidden="true"` cuando el dialog está cerrado (WCAG 4.1.2)
- `aria-hidden="false"` al abrir vía `show()`
- Focus devuelto al elemento disparador al cerrar (WCAG SC 2.4.3)
- Focus trap Tab/Shift+Tab dentro del dialog
- Escape y click en backdrop cierran sin confirmar

#### Lecciones Aprendidas

| # | Hallazgo | Lección |
|---|---|---|
| 1 | Panel de detalle cerraba aunque mostrara otra tarea | Añadir `currentTaskId` getter al componente; condición `detail.currentTaskId === taskId` antes de `close()` |
| 2 | `role="alertdialog"` expuesto a AT con el dialog cerrado | Establecer `aria-hidden` en `_render()`, `show()` y `hide()` — CSS `opacity:0` no es suficiente para ATs |
| 3 | Foco perdido tras cerrar dialog | `_triggerEl` capturado en `show()`; `requestAnimationFrame(() => trigger?.focus())` en `hide()` |

---

### Paso 10 — Implementación de Descripción Markdown con bloques de código (US-07 / Issue #8)

**Issue asociado:** [#8 — US-07 Descripción Markdown XSS](https://github.com/Code-Dojo-Labs/agent-app/issues/8)  
**PR:** ✅ Mergeado en `init` — [#25](https://github.com/Code-Dojo-Labs/agent-app/pull/25)  
**Branch:** `feat/8-descripcion-markdown`

#### Descripción

Completa la implementación del editor/previsualización Markdown en el panel de detalle de tarea. La mayoría de la historia (tabs Editar/Vista previa, inline code, negrita, cursiva, listas, enlaces, XSS-safe via DOM API) fue implementada en US-05. Este paso añade **bloques de código cercados** (`\`\`\`lang...`\`\``) que faltaban para cumplir el escenario 2 de US-07.

#### Archivos modificados

| Archivo | Cambios |
|---|---|
| `src/utils/markdown.ts` | Soporte de bloques `\`\`\`lang...`\`\`` — detecta apertura/cierre, crea `<pre><code>` con `textContent` |
| `src/components/organisms/dojo-task-detail/dojo-task-detail.ts` | Estilos CSS `.desc-preview pre` y `.desc-preview pre code` — fondo, borde, `overflow-x: auto` |

#### Seguridad XSS

Todo el parser Markdown usa manipulación DOM explícita (`document.createElement` + `textContent`), **nunca `innerHTML` con entrada del usuario**. Los bloques de código cercados usan `code.textContent = codeLines.join('\n')` — los caracteres `<`, `>`, `&` se escapan automáticamente.

#### Criterios US-07 cubiertos

| Scenario | Implementado en |
|---|---|
| 1. Textarea Markdown en modo edición | US-05 |
| 2. Tab "Vista previa" con Markdown renderizado | US-05 + este PR (bloques código) |
| 3. Alternancia sin perder contenido | US-05 |
| 4. XSS: scripts no ejecutados | US-05 / markdown.ts (`textContent`) |
| 5. Parser propio sin dependencias externas | US-05 / markdown.ts |
| 6. Descripción vacía → mensaje "Sin descripción" | US-05 |

---

### Paso 11 — Implementación de Prioridad de Tarea (US-08 / Issue #9)

**Issue asociado:** [#9 — US-08 Prioridad de tarea](https://github.com/Code-Dojo-Labs/agent-app/issues/9)  
**PR:** ✅ Mergeado en `init` — [#26](https://github.com/Code-Dojo-Labs/agent-app/pull/26) (SHA: `d0e4406`)  
**Branch:** `feat/9-prioridad-tarea`

#### Descripción

Implementa la visualización de prioridad con iconos standardizados (⬇️/➡️/⬆️/🔥) en tarjetas Kanban y el panel de detalle, y añade una barra de filtros por prioridad sobre el tablero. El tipo `Priority` y el campo en el modelo ya existían.

#### Cambios por archivo

| Archivo | Cambios |
|---|---|
| `dojo-task-card.ts` | `PRIORITY_CONFIG` actualizado con iconos US-08; `priority-dot` → `priority-icon` con emoji |
| `dojo-task-dialog.ts` | `PRIORITIES` actualizado con iconos `⬇️/➡️/⬆️/🔥` |
| `dojo-task-detail.ts` | `PRIORITIES` actualizado con iconos `⬇️/➡️/⬆️/🔥` |
| `dojo-kanban-board.ts` | `ActiveFilter.priority → priorities?: Priority[]`; `_filterTasks()` multi-prioridad; `activeFilter` setter refresca columnas; barra de filtros `_buildFilterBar()` |

#### Barra de filtros

```
[ Prioridad: ] [ ⬇️ Baja ] [ ➡️ Media ] [ ⬆️ Alta ] [ 🔥 Urgente ] [ ✕ Limpiar ]
```

- Toggle chips con `aria-pressed` — permite seleccionar 0 a 4 prioridades simultáneamente
- Al cambiar selección: `activeFilter.priorities` se actualiza → `_refreshColumnCards()` por cada columna + `_updateColumnCounts()`
- "✕ Limpiar" aparece solo cuando hay filtros activos
- `role="group"` + `aria-label` en el contenedor (accesibilidad)

#### Criterios US-08 cubiertos

| Scenario | Estado |
|---|---|
| 1. Prioridad por defecto "medium" al crear tarea | ✅ `dojo-task-dialog` (pre-existente) |
| 2. Ícono y texto en la tarjeta (⬇️/➡️/⬆️/🔥) | ✅ este PR |
| 3. Cambiar prioridad desde panel de detalle | ✅ `dojo-task-detail` (selector + auto-save pre-existente, iconos fijados aquí) |
| 4. Filtrar por una o más prioridades | ✅ este PR (`_buildFilterBar` + `_filterTasks`) |

---

### Paso 12 — Implementación de Crear Etiqueta (US-09 / Issue #10)

**Fecha:** 2026-03-26  
**Agente ejecutor:** `builder`  
**Issue asociado:** [#10 — US-09 Crear etiqueta](https://github.com/Code-Dojo-Labs/agent-app/issues/10)  
**PR:** 🔄 En revisión — [#27](https://github.com/Code-Dojo-Labs/agent-app/pull/27)  
**Branch:** `feat/10-crear-etiqueta`

#### Descripción

El agente Builder implementó el flujo completo de **búsqueda en tiempo real y creación inline de etiquetas** directamente desde el panel de detalle de tarea (`dojo-task-detail`). La infraestructura subyacente (modelo `Label`, repositorio `label.repository.ts`, Object Store en IndexedDB) ya existía; este paso añade la capa de interfaz de usuario.

#### Archivo modificado

| Archivo | Cambios |
|---|---|
| `src/components/organisms/dojo-task-detail/dojo-task-detail.ts` | Import de `createLabel`; ~90 líneas de CSS nuevas; `_buildLabelsField` refactorizado (400 → 460 líneas netas) |

#### Lógica de implementación

**Estado de cierre del picker** (variables de closure locales en `_buildLabelsField`):

| Variable | Tipo | Propósito |
|---|---|---|
| `searchTerm` | `string` | Término actual del campo de búsqueda |
| `showCreateForm` | `boolean` | Indica si el formulario inline de creación está visible |
| `pendingColor` | `string` | Color seleccionado para la nueva etiqueta |

**Flujo de creación:**

```
Usuario escribe en el campo de búsqueda
        │
        ▼
_allLabels filtrado en tiempo real (includes, case-insensitive)
        │
   ┌────┴────┐
   │ Hay     │ No hay coincidencia exacta
   │ match   │        │
   │ exacto  │        ▼
   │         │  Muestra "Crear etiqueta '[nombre]'"
   └────┬────┘        │
        │             ▼ (click)
        │        showCreateForm = true → renderPicker()
        │             │
        │             ▼
        │    Formulario inline:
        │    - 12 colores predefinidos (swatches)
        │    - <input type="color"> personalizado
        │    - Botones Cancelar / Crear
        │             │
        │             ▼ (click Crear)
        │    createLabel({ name, color }) → IndexedDB
        │    auto-assign: _save({ labelIds: [..., newLabel.id] })
        │    _allLabels actualizado en memoria
        │    renderChips() + renderPicker() + cerrar picker
        │
        ▼
   Chip de la etiqueta aparece inmediatamente en el panel
```

#### Paleta de colores predefinidos (12 colores)

| Índice | Hex | Color |
|---|---|---|
| 0 | `#EF4444` | Rojo |
| 1 | `#F97316` | Naranja |
| 2 | `#F59E0B` | Ámbar |
| 3 | `#EAB308` | Amarillo |
| 4 | `#22C55E` | Verde |
| 5 | `#10B981` | Esmeralda |
| 6 | `#3B82F6` | Azul |
| 7 | `#6366F1` | Índigo |
| 8 | `#8B5CF6` | Violeta |
| 9 | `#EC4899` | Rosa |
| 10 | `#06B6D4` | Cian |
| 11 | `#84CC16` | Lima |

#### Selectores CSS añadidos

| Selector | Propósito |
|---|---|
| `.labels-search` | Campo de búsqueda en el picker |
| `.label-create-option` | Opción "Crear etiqueta '[nombre]'" |
| `.label-create-form` | Contenedor del formulario inline |
| `.label-create-form-title` | Título del formulario ("Color para…") |
| `.label-color-palette` | Contenedor de swatches de color |
| `.color-swatch` | Botón circular de color predefinido |
| `.label-custom-color-row` | Fila con `<input type="color">` |
| `.label-color-input` | Input de color personalizado |
| `.label-error` | Mensaje de error con `role="alert"` |
| `.label-create-actions` | Fila de acciones (Cancelar / Crear) |
| `.label-btn` | Botón genérico (Cancelar) |
| `.label-btn-primary` | Botón primario (Crear) |

#### Criterios US-09 cubiertos

| Scenario Gherkin | Estado |
|---|---|
| 1. Crear etiqueta desde selector de etiquetas de una tarea | ✅ Flujo completo implementado |
| 2. Nombre de etiqueta obligatorio | ✅ Validación a nivel UI y repositorio |
| 3. Nombre de etiqueta con máximo 30 caracteres | ✅ `maxLength=30` en `searchInput` |
| 4. Color de etiqueta obligatorio | ✅ Pre-selección de color por defecto; error si `!pendingColor` |
| 5. Búsqueda en tiempo real entre etiquetas existentes | ✅ Filtrado `includes()` case-insensitive en `renderPicker()` |

#### Decisión de diseño: Import directo de `createLabel` en `dojo-task-detail`

Se evaluaron dos opciones para la creación de etiquetas:

| Opción | Descripción | Decisión |
|---|---|---|
| **A: Import directo** | `dojo-task-detail` importa `createLabel` y lo llama directamente | ✅ Elegida |
| B: Event-driven | `dojo-task-detail` despacha `dojo:label-create`; `dojo-kanban-board` lo maneja | Descartada |

**Justificación:** La creación de etiquetas es parte inherente del flujo de edición de tareas, que ya reside en `dojo-task-detail`. Añadir un event round-trip añadiría complejidad sin beneficio de desacoplamiento real, dado que la etiqueta creada se persiste en IndexedDB (accesible globalmente). La próxima vez que `_onTaskOpen` en el board llame a `getAllLabels()`, la nueva etiqueta estará disponible automáticamente.

---

### Paso 13 — Implementación de Reutilización de Etiquetas (US-10 / Issue #11)

**Fecha:** 2026-03-26  
**Agente ejecutor:** `builder`  
**Issue asociado:** [#11 — US-10 Reutilización de etiquetas](https://github.com/Code-Dojo-Labs/agent-app/issues/11)  
**Branch:** `feat/11-reutilizacion-etiquetas` (basada en `feat/10-crear-etiqueta`)

#### Descripción

Este paso añade la **visualización de chips de etiquetas en las tarjetas del tablero Kanban** y la **detección de duplicados por diferencia de capitalización** en el selector de etiquetas. El objetivo es que el usuario vea, de un vistazo en el tablero, qué etiquetas tiene cada tarea, sin necesidad de abrir el panel de detalle.

#### Archivos modificados

| Archivo | Cambios |
|---|---|
| `src/components/atoms/dojo-task-card/dojo-task-card.ts` | Imports `Label` + `pickTextColor`; campo `_labels`; getter/setter `taskLabels`; CSS `.chip-row` / `.task-label-chip`; render de chips entre título y footer |
| `src/components/organisms/dojo-kanban-board/dojo-kanban-board.ts` | `Label` en type imports; campo `_labels`; carga paralela en `_loadBoard`; setter `taskLabels` en `_renderTaskCards`; helpers `_getTaskLabels` y `_handleLabelCreated`; listener `dojo:label-created`; propagación de cambios en `_handleTaskFieldUpdated` |
| `src/components/organisms/dojo-task-detail/dojo-task-detail.ts` | Despacha `dojo:label-created` tras crear etiqueta; aviso de duplicado por diferente capitalización; CSS `.label-info-notice` |

#### Arquitectura de comunicación (US-10)

```
[dojo-task-detail] ── dojo:label-created (bubbles+composed) ──▶ [dojo-kanban-board]
                                                                         │
                                                               _handleLabelCreated()
                                                               actualiza _labels[]
                                                               (caché en memoria)

[dojo-kanban-board]
  _loadBoard()   ── Promise.all([getAllColumns(), getAllLabels()]) ──▶ IndexedDB
  _renderTaskCards() ── .taskLabels = _getTaskLabels(task) ──▶ [dojo-task-card]
  _handleTaskFieldUpdated() ── si changes.labelIds ──▶ actualiza card.taskLabels
```

#### Propiedad `taskLabels` en `dojo-task-card`

La tarjeta recibe un array de objetos `Label` mediante la propiedad JS (no atributo HTML, ya que los atributos son siempre strings). El setter llama a `_render()` si el elemento está conectado, lo que garantiza re-render reactivo ante cualquier cambio de etiquetas desde el tablero.

```typescript
set taskLabels(labels: Label[]) {
  this._labels = [...labels];
  if (this.isConnected) this._render();
}
```

#### Seguridad del color en chips

Antes de aplicar `backgroundColor`, el chip valida el color contra la expresión regular `/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/`. Si no pasa la validación (p.ej., valor corrupto en BD), usa `var(--dojo-border)` como fallback. El contraste de texto se delega a `pickTextColor()` de `utils/contrast.ts`, con `try/catch` para aislar posibles errores en valores edge.

#### Selectores CSS añadidos en `dojo-task-card`

| Selector | Propósito |
|---|---|
| `.chip-row` | Fila flex envolvente de chips de etiquetas |
| `.task-label-chip` | Chip individual: color de fondo dinámico, texto truncado a 80 px |

#### Selectores CSS añadidos en `dojo-task-detail`

| Selector | Propósito |
|---|---|
| `.label-info-notice` | Aviso informativo cuando el nombre tecleado coincide (sin distinguir mayúsculas) con una etiqueta existente |

#### Criterios US-10 cubiertos

| Scenario | Estado |
|---|---|
| S1 — Asignar etiqueta existente a una tarea (picker con scroll) | ✅ Heredado de US-09; picker funciona con lista completa |
| S2 — Prevención de duplicados por capitalización diferente | ✅ `else` branch en `renderPicker()` muestra `.label-info-notice` |
| S3 — Ver etiquetas asignadas en las tarjetas del tablero | ✅ Chips `.task-label-chip` renderizados en `dojo-task-card` |
| S4 — Etiqueta nueva visible en el tablero sin recargar | ✅ `dojo:label-created` actualiza `_labels[]` en el board; setter `taskLabels` re-renderiza la tarjeta activa |

#### Decisión de diseño: Propiedad JS vs. atributo HTML para `taskLabels`

| Opción | Descripción | Decisión |
|---|---|---|
| **A: Propiedad JS** | `card.taskLabels = Label[]` — permite pasar objetos complejos | ✅ Elegida |
| B: Atributo JSON serializado | `card.setAttribute('task-labels', JSON.stringify(...))` — más frágil y detectable en DevTools como ruido | Descartado |

**Justificación:** Los Web Components permiten comunicar estado complejo a través de propiedades JS, reservando los atributos HTML para datos primitivos (IDs, flags semánticos). Serializar/deserializar JSON en atributos añade garbage colection overhead y expone datos internos como texto en el DOM inspeccionable.

---

### Paso 14 — Implementación de Editar Etiqueta (US-11 / Issue #12)

**Fecha:** 2026-03-26  
**Agente ejecutor:** `builder`  
**Issue asociado:** [#12 — US-11 Editar etiqueta](https://github.com/Code-Dojo-Labs/agent-app/issues/12)  
**Branch:** `feat/12-editar-etiqueta` (basada en `feat/11-reutilizacion-etiquetas`)

#### Descripción

Este paso implementa el **panel de administración de etiquetas** accesible desde el header de la aplicación. El usuario puede editar el nombre o el color de cualquier etiqueta, y los cambios se propagan automáticamente a todos los chips visibles en el tablero, sin necesidad de recargar.

#### Archivos nuevos

| Archivo | Descripción |
|---|---|
| `src/components/organisms/dojo-label-manager/dojo-label-manager.ts` | Nuevo organismo: panel lateral slide-in con listado y formulario de edición inline por etiqueta |

#### Archivos modificados

| Archivo | Cambios |
|---|---|
| `src/components/organisms/dojo-app/dojo-app.ts` | Botón "Gestionar etiquetas" en header; monta `<dojo-label-manager>`; listener `dojo:label-updated` que llama a `board.refreshLabel()` |
| `src/components/organisms/dojo-kanban-board/dojo-kanban-board.ts` | Nuevo método público `refreshLabel(label)` que actualiza `_labels[]` y refresca los chips de las tarjetas afectadas |

#### Arquitectura de comunicación (US-11)

```
Usuario hace clic en "Gestionar etiquetas" (header)
            │
            ▼
  dojo-app llama a labelMgr.show()
            │
            ▼
  dojo-label-manager carga getAllLabels() → muestra lista
            │
  Usuario hace clic en ✏️ → formulario inline por etiqueta
            │
  Usuario guarda → updateLabel(id, { name, color })
            │
            ▼
  dojo:label-updated (bubbles+composed) sube hasta dojo-app Shadow Root
            │
            ▼
  dojo-app listener → board.refreshLabel(label)
            │
            ▼
  dojo-kanban-board._labels[] actualizado
  Para cada tarea con ese labelId → card.taskLabels = _getTaskLabels(task)
            │
            ▼
  dojo-task-card setter → _render() → chips actualizados sin recargar bd
```

#### `dojo-label-manager` — API pública

| Método  | Descripción |
|---|---|
| `show()` | Carga todas las etiquetas y muestra el panel con animación slide-in |
| `hide()` | Cierra el panel; también responde a clic en backdrop y tecla Escape |

#### Selectores CSS de `dojo-label-manager`

| Selector | Propósito |
|---|---|
| `.backdrop` | Capa oscura semitransparente; click cierra el panel |
| `.panel` | Drawer lateral derecho, width `min(360px, 100vw)`, slide-in |
| `.panel-header` | Título + botón de cierre (✕) |
| `.panel-content` | Área desplazable con la lista |
| `.label-list` | `<ul role="list">` de todas las etiquetas |
| `.label-row` | Fila: dot color + nombre + botón editar |
| `.edit-form` | Formulario inline de edición (nombre + paleta + acciones) |
| `.color-swatch` | Swatch de la paleta (mismo estilo que en `dojo-task-detail`) |
| `.edit-name-input` | Campo de texto para el nombre (max 30 chars) |

#### Criterios US-11 cubiertos

| Scenario Gherkin | Estado |
|---|---|
| 1. Acceder al panel de administración desde el header | ✅ Botón "Gestionar etiquetas" en `.app-header` |
| 2. Editar el nombre de una etiqueta | ✅ `updateLabel()` + detección de duplicados por repositorio |
| 3. Editar el color de una etiqueta | ✅ Paleta de 12 colores + color personalizado (`<input type="color">`) |
| 4. Propagación automática a tarjetas visibles | ✅ `board.refreshLabel()` itera `_tasksByColumn` y actualiza `.taskLabels` |

#### Decisión de diseño: Panel en `dojo-app` vs. dentro de `dojo-kanban-board`

| Opción | Descripción | Decisión |
|---|---|---|
| **A: Panel en `dojo-app`** | El botón y el panel de gestión viven en el nivel de la app raíz | ✅ Elegida |
| B: Panel dentro del board | El botón estaría en la barra de filtros, el panel en el shadow del board | Descartada |

**Justificación:** El issue especifica "botón en el header de la aplicación". El header está en `dojo-app`. Para evitar que el organismo board asuma responsabilidades de gestión global, el panel de etiquetas se monta en el shadow de `dojo-app`, que actúa como coordinador de nivel de aplicación.

---

### Paso 15 — Implementación de Eliminar Etiqueta (US-12 / Issue #13)

**Pull Request:** [#30 — [US-12] Eliminar etiqueta con limpieza atómica en IndexedDB](https://github.com/Code-Dojo-Labs/agent-app/pull/30)  
**Rama:** `feat/13-eliminar-etiqueta`  
**Fecha:** 2026-03-26

#### Resumen

Cubre la historia de usuario US-12: el usuario puede eliminar etiquetas desde el panel de gestión. La eliminación muestra primero un panel de confirmación inline que indica cuántas tareas se verán afectadas, y al confirmar realiza la limpieza de forma atómica en IndexedDB.

#### Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `src/db/label.repository.ts` | Modificado — nueva función atómica `deleteLabel`, nueva función `countTasksByLabelId` |
| `src/components/organisms/dojo-label-manager/dojo-label-manager.ts` | Modificado — botón eliminar + confirmación inline + evento `dojo:label-deleted` |
| `src/components/organisms/dojo-kanban-board/dojo-kanban-board.ts` | Modificado — nuevo método `removeLabel()` |
| `src/components/organisms/dojo-app/dojo-app.ts` | Modificado — escucha `dojo:label-deleted` y delega a `board.removeLabel()` |

#### ADR-15: Transacción atómica multi-store para eliminación

**Problema:** Al eliminar una etiqueta, el sistema debe mantener la integridad referencial entre el store `labels` y el campo `labelIds` del store `tasks`. Una solución naive (dos transacciones separadas) expone una ventana de inconsistencia si falla la segunda.

**Decisión:** Usar una única transacción `readwrite` que abarque ambos stores simultáneamente:

```typescript
const tx = db.transaction(['labels', 'tasks'], 'readwrite');
const labelStore = tx.objectStore('labels');
const taskStore  = tx.objectStore('tasks');
labelStore.delete(id);
// ... limpiar labelIds en todas las tareas afectadas ...
await idbTransaction(tx); // confirma o hace rollback de AMBOS stores
```

**Consecuencia:** Si la transacción falla, ninguno de los dos stores se modifica. La integridad es garantizada por el motor de IndexedDB.

#### ADR-16: Confirmación inline en lugar de diálogo modal separado

**Problema:** El criterio de aceptación requiere un "diálogo de confirmación". Existen dos opciones:
- Reutilizar/extender `dojo-delete-confirm-dialog` (específico de tareas).
- Implementar una confirmación inline dentro de `dojo-label-manager`.

**Decisión:** Confirmación inline en el panel lateral, siguiendo el mismo patrón del formulario de edición ya establecido.

**Justificación:** `dojo-delete-confirm-dialog` está acoplado semánticamente a tareas (`dojo:task-delete-confirm`). Extenderlo añadiría complejidad innecesaria. El patrón de "reemplazar fila con formulario" ya existe y resulta coherente con la UX del panel.

#### Flujo de eliminación

```
Usuario clic 🗑️
    │
    ▼
countTasksByLabelId() → async (carga el nº de tareas afectadas)
    │
    ▼
Panel de confirmación inline (muestra aviso si hay tareas afectadas)
    │
    ├─ "Cancelar" → resetea _deletingId, reconstruye lista
    │
    └─ "Eliminar"
           │
           ▼
       deleteLabel() [transacción atómica multi-store]
           │
           ▼
       Actualizar _labels local → _buildContent()
           │
           ▼
       CustomEvent dojo:label-deleted { labelId }
           │
           ▼
       dojo-app → board.removeLabel(labelId)
           │
           ▼
       Actualizar _labels + _tasksByColumn en caché
       Refrescar chips DOM de tarjetas afectadas
```

#### API pública actualizada de `dojo-label-manager`

| Evento despachado | Detalle | Descripción |
|---|---|---|
| `dojo:label-updated` | `{ label }` | Etiqueta editada |
| `dojo:label-deleted` | `{ labelId }` | (**nuevo**) Etiqueta eliminada confirmada |

#### `removeLabel()` en `dojo-kanban-board`

Método que complementa al ya existente `refreshLabel()`:

```typescript
removeLabel(deletedLabelId: string): void {
  this._labels = this._labels.filter(l => l.id !== deletedLabelId);
  for (const [columnId, tasks] of this._tasksByColumn) {
    for (const task of tasks) {
      if ((task.labelIds ?? []).includes(deletedLabelId)) {
        task.labelIds = task.labelIds.filter(lid => lid !== deletedLabelId);
        // refrescar chip en el DOM...
      }
    }
  }
}
```

#### Criterios US-12 cubiertos

| Scenario Gherkin | Estado |
|---|---|
| 1. Eliminar una etiqueta sin tareas asignadas | ✅ Confirmación sin aviso → eliminación directa |
| 2. Diálogo muestra tareas afectadas | ✅ `countTasksByLabelId()` → aviso visual amarillo |
| 3. Confirmar eliminación con tareas asignadas (limpieza atómica) | ✅ Transacción multi-store garantiza consistencia |
| 4. Cancelar la eliminación | ✅ Botón "Cancelar" restaura la fila original |
| 5. Chips desaparecen del tablero sin recarga | ✅ `board.removeLabel()` actualiza DOM reactivamente |

---

### Paso 16 — Implementación de Colores WCAG y Validación de Contraste (US-13 / Issue #14)

**Pull Request:** [#31 — [US-13] Colores de etiquetas con validación de contraste WCAG AA](https://github.com/Code-Dojo-Labs/agent-app/pull/31)  
**Rama:** `feat/14-colores-etiquetas-contraste-wcag`  
**Fecha:** 2026-03-26

#### Resumen

Cubre la historia de usuario US-13: la paleta de colores de etiquetas se actualiza a 10 tonos que cumplen WCAG AA (≥ 4.5:1 con texto blanco), y se implementa validación dinámica para colores personalizados que bloquea el guardado y sugiere una alternativa accesible.

#### Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `src/utils/contrast.ts` | Modificado — nueva función `suggestAccessibleColor()` |
| `src/components/organisms/dojo-label-manager/dojo-label-manager.ts` | Modificado — paleta WCAG, validación en color custom |
| `src/components/organisms/dojo-task-detail/dojo-task-detail.ts` | Modificado — misma paleta y validación WCAG en creación |
| `src/components/atoms/dojo-task-card/dojo-task-card.ts` | Modificado — texto chips siempre `#FFFFFF` |

#### ADR-17: Paleta de 10 colores obligatorios vs. paleta libre de 12 colores

**Problema:** El código anterior tenía 12 colores brillantes (`#EF4444`, `#F97316`…) que no necesariamente cumplían WCAG AA con texto blanco. El issue especifica exactamente 10 colores oscuros ya validados.

**Decisión:** Reemplazar ambas paletas (`dojo-label-manager` y `dojo-task-detail`) con los mismos 10 colores del spec.

**Consecuencia:** Las etiquetas creadas antes de este cambio que usen colores de la paleta antigua seguirán mostrándose con su color original. Solo los nuevos colores seleccionados pasarán por la validación.

#### ADR-18: `suggestAccessibleColor` — algoritmo de oscurecimiento por factor

**Algoritmo:**
```typescript
// Reducir los canales RGB un 10% por iteración hasta cumplir 4.5:1 con #FFFFFF
for (let factor = 0.90; factor >= 0; factor -= 0.05) {
  const adjusted = scale(originalRGB, factor);
  if (meetsWcagAA('#FFFFFF', adjusted)) return adjusted;
}
```

**Alternativas consideradas:**
- Conversión a HSL y reducción de Lightness: más precisa perceptualmente, pero más compleja y sin librería externa no trivial.
- Tabla de equivalencias manual: no escalable.

**Justificación:** El escalado lineal de RGB es suficientemente preciso para el rango de colores requerido y mantiene el código dentro del principio Zero Dependencies.

#### Flujo de validación WCAG en color personalizado

```
Usuario abre <input type="color"> y selecciona un color
    │
    ▼
meetsWcagAA('#FFFFFF', color)?
    │
    ├─ Sí → contrastWarning oculto, botón Guardar activo
    │
    └─ No → suggestAccessibleColor(color) → X_hex
           │
           ▼
        Advertencia visual amarilla:
        "El color no tiene suficiente contraste…"
        [swatch X_hex] [Usar versión accesible (X_hex)]
        Botón Guardar: disabled
           │
           └─ Usuario clic "Usar versión accesible"
                  │
                  ▼
              pendingColor = X_hex
              Actualizar swatch + colorInput
              Re-validar → pasa → ocultar warning, botón activo
```

#### Paleta de colores actualizada

| Nombre | Hex | Contraste con #FFFFFF |
|---|---|---|
| Rojo | `#B91C1C` | ≥ 4.5:1 ✅ |
| Naranja | `#C2410C` | ≥ 4.5:1 ✅ |
| Ámbar | `#B45309` | ≥ 4.5:1 ✅ |
| Verde | `#15803D` | ≥ 4.5:1 ✅ |
| Azul | `#1D4ED8` | ≥ 4.5:1 ✅ |
| Índigo | `#4338CA` | ≥ 4.5:1 ✅ |
| Violeta | `#6D28D9` | ≥ 4.5:1 ✅ |
| Rosa | `#BE185D` | ≥ 4.5:1 ✅ |
| Cian | `#0E7490` | ≥ 4.5:1 ✅ |
| Gris | `#374151` | ≥ 4.5:1 ✅ |

#### Criterios US-13 cubiertos

| Scenario Gherkin | Estado |
|---|---|
| 1. Seleccionar color de paleta predefinida | ✅ 10 colores sin validación adicional (ya cumplen) |
| 2. Color personalizado con contraste válido → guardar | ✅ Sin interferencia |
| 3. Color personalizado con contraste insuficiente → advertencia + sugerencia | ✅ |
| 4. Texto siempre blanco en chips | ✅ `#FFFFFF` fijo en `dojo-task-card` |
| 5. Sin dependencias externas de gestión de colores | ✅ Solo `contrast.ts` nativo |
