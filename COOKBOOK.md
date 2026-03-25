# COOKBOOK — ToDo List con Web Components

> **Versión:** 0.3.0  
> **Última actualización:** 2026-03-25  
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

*El siguiente paso registrado aquí será la implementación del primer componente por el agente Builder.*
