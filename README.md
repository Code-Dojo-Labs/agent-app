# 📋 Agent App - Kanban Board

> **Una aplicación Kanban moderna construida con Web Components nativos y cero dependencias**

[![🌐 Demo en vivo](https://img.shields.io/badge/🌐_Demo-En_vivo-blue?style=for-the-badge)](https://code-dojo-labs.github.io/agent-app/)
[![Version](https://img.shields.io/github/package-json/v/Code-Dojo-Labs/agent-app/init?style=for-the-badge&label=version&color=brightgreen)](https://github.com/Code-Dojo-Labs/agent-app/blob/init/package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Web Components](https://img.shields.io/badge/Web_Components-29ABE2?style=for-the-badge&logo=webcomponents.org&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
[![Zero Dependencies](https://img.shields.io/badge/Zero_Dependencies-✨-green?style=for-the-badge)]()

## 🚀 Acerca del Proyecto

**Agent App** es una aplicación web de gestión de tareas tipo Trello que implementa un tablero Kanban completamente funcional. Diseñada para usuarios individuales y equipos pequeños, permite organizar tareas en columnas por estado, asignarles prioridades, etiquetas y descripciones enriquecidas.

### ✨ Características Principales

- **📊 Tablero Kanban dinámico** - Organiza tareas por estados con drag & drop
- **🏷️ Sistema de etiquetas** - Crea y reutiliza etiquetas con colores personalizados
- **👥 Asignación de personas** - Asigna tareas a miembros del equipo
- **📝 Descripciones enriquecidas** - Soporte completo para Markdown
- **🎨 Tema claro/oscuro** - Interfaz adaptable a preferencias del usuario
- **💾 Persistencia local** - Todos los datos se guardan en IndexedDB
- **📱 Diseño responsivo** - Funciona en desktop, tablet y móvil
- **🔍 Búsqueda y filtros** - Encuentra tareas rápidamente
- **📊 Múltiples proyectos** - Organiza diferentes tableros por proyecto

## 🌐 Demo en Vivo

**[👉 Probar la aplicación](https://code-dojo-labs.github.io/agent-app/)**

## 🛠️ Stack Tecnológico

Esta aplicación sigue el principio **Zero Dependencies** - todo el código de producción se ejecuta sobre Web APIs nativas del navegador.

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **TypeScript** | 5.x | Lógica de la aplicación y tipado |
| **Web Components** | Nativo | Arquitectura de componentes sin framework |
| **Shadow DOM** | v1 | Encapsulamiento de estilos |
| **IndexedDB** | Nativo | Base de datos local |
| **CSS3** | Custom Properties, Grid, Flexbox | Estilos y animaciones |
| **HTML5** | Living Standard | Estructura y templates |

### 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    LO QUE CORRE EN EL NAVEGADOR             │
│                                                             │
│   HTML5  +  CSS3  +  TypeScript→JS  +  Web APIs nativas    │
│                                                             │
│   ✗ React   ✗ Vue   ✗ Tailwind   ✗ idb   ✗ DOMPurify      │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Desarrollo Local

### Prerrequisitos

- **Node.js** 16+ (para TypeScript)
- **Python 3** (para servidor local)

### Instalación y Ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/Code-Dojo-Labs/agent-app.git
cd agent-app

# 2. Instalar dependencias de desarrollo
npm install

# 3. Compilar TypeScript y servir la aplicación
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

### Scripts Disponibles

```bash
npm run build    # Compilar para producción
npm run watch    # Compilar en modo watch
npm run serve    # Servir archivos compilados
npm run dev      # Desarrollo (watch + serve)
```

## 📚 Documentación

| Documento | Descripción |
|-----------|-------------|
| [📖 COOKBOOK](COOKBOOK.md) | Guía de desarrollo y patrones |
| [📋 Requerimientos](requirements/index.md) | Especificaciones funcionales |
| [📊 Modelo de Datos](requirements/data-model.md) | Esquema de IndexedDB |
| [🎨 UI/UX](requirements/ui-ux.md) | Guía de diseño |
| [📖 Historias de Usuario](user-stories/index.md) | Casos de uso detallados |

## 🤖 Desarrollo con IA

Este proyecto ha sido desarrollado usando un enfoque innovador de **desarrollo dirigido por agentes IA**, donde diferentes agentes especializados colaboran:

- **🏗️ Builder** - Implementación de componentes y funcionalidades
- **👁️ Reviewer** - Auditoría de código, seguridad y calidad
- **📝 Documentalista** - Creación de documentación
- **🔧 gitjmz** - Gestión de Git y despliegue

📖 **[Ver modelo completo →](AI-AGENTS-MODEL.md)** - Análisis detallado del proceso colaborativo, métricas de efectividad y metodologías aplicadas

## 🎯 Funcionalidades Implementadas

- ✅ Tablero Kanban con drag & drop
- ✅ Gestión completa de tareas (crear, editar, eliminar)
- ✅ Sistema de etiquetas con colores personalizados
- ✅ Asignación de personas a tareas
- ✅ Descripciones con Markdown
- ✅ Filtros y búsqueda avanzada
- ✅ Múltiples proyectos/tableros
- ✅ Tema claro y oscuro
- ✅ Persistencia local (IndexedDB)
- ✅ Diseño responsivo
- ✅ PWA (Progressive Web App)

## 📄 Licencia

Este proyecto es de **código abierto** y está disponible bajo licencia MIT.

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork del repositorio
2. Crear una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit de cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

---

<div align="center">

**[🌐 Probar la Aplicación](https://code-dojo-labs.github.io/agent-app/)** | **[📚 Documentación](requirements/index.md)** | **[🐛 Reportar Bug](../../issues)**

</div>