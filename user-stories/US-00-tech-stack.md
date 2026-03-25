# US-00 — Stack Tecnológico

> **Área**: Infraestructura / Arquitectura  
> **Prioridad**: Alta  
> **Referencia**: [tech-stack.md](../requirements/tech-stack.md)

---

## Historia de usuario

**Como** desarrollador del proyecto,  
**quiero** definir e implementar el stack tecnológico de la aplicación Kanban basado en Web APIs nativas del navegador,  
**para** garantizar cero dependencias de producción externas, máxima compatibilidad, y una arquitectura mantenible a largo plazo.

---

## Criterios de aceptación

```gherkin
Feature: Configuración del stack tecnológico

  Scenario: Proyecto compilado sin bundler externo
    Given el repositorio contiene únicamente archivos fuente TypeScript (.ts) en /src
    When se ejecuta el compilador "tsc" con la configuración de tsconfig.json
    Then se generan archivos .js en /dist como ES Modules válidos
    And no se utiliza ningún bundler (Webpack, Vite, Rollup, esbuild)

  Scenario: Configuración estricta de TypeScript
    Given existe un archivo tsconfig.json en la raíz del proyecto
    When se revisa la configuración
    Then el target debe ser "ES2022"
    And el module debe ser "ES2022"
    And strict debe estar habilitado en true
    And el outDir debe apuntar a "./dist"
    And el rootDir debe apuntar a "./src"

  Scenario: Componentes UI implementados como Web Components
    Given la aplicación tiene un componente visual (ej. tarjeta de tarea)
    When se inspecciona su implementación
    Then debe ser una clase TypeScript que extiende HTMLElement
    And debe utilizar Shadow DOM con mode "open"
    And debe registrarse con customElements.define usando el prefijo "dojo-"

  Scenario: Persistencia implementada con IndexedDB nativo
    Given la aplicación necesita almacenar tareas, columnas y etiquetas
    When se revisa la capa de acceso a datos
    Then debe usar la API nativa IDBDatabase directamente
    And no debe existir ningún wrapper externo (idb, Dexie, etc.)
    And las operaciones IDBRequest deben estar encapsuladas en Promesas

  Scenario: Arrastre de tarjetas con API nativa HTML5
    Given el usuario arrastra una tarjeta en el tablero
    When se inspecciona la implementación del drag & drop
    Then debe usar los eventos nativos dragstart, dragover, drop
    And no debe existir ninguna librería externa de drag & drop

  Scenario: Validación de contraste WCAG implementada manualmente
    Given se necesita validar el contraste de colores de etiquetas
    When se revisa la implementación de la validación
    Then debe existir una función propia que calcule la relación de contraste según WCAG 2.1
    And no debe usarse ninguna librería externa de validación de color

  Scenario: Parser de Markdown implementado de forma propia
    Given una tarea tiene descripción en formato Markdown
    When el sistema renderiza la descripción
    Then debe usar un parser propio que soporte un subconjunto de CommonMark
    And el renderizado debe incluir sanitización contra XSS sin librerías externas (ej. DOMPurify)

  Scenario: Módulos cargados como ES Modules nativos
    Given la aplicación se sirve en el navegador
    When se revisa la carga de scripts en el HTML
    Then todos los scripts deben tener el atributo type="module"
    And no debe existir ningún script con carga global o IIFE

  Scenario: Servidor de desarrollo sin dependencias de producción
    Given el desarrollador quiere visualizar la aplicación localmente
    When levanta el entorno de desarrollo
    Then puede usar "Live Preview" de VS Code o "python3 -m http.server"
    And el servidor solo sirve archivos estáticos sin procesamiento adicional
```

---

## Notas técnicas

- El principio rector es **Zero Dependencies**: ningún paquete npm de producción.
- Las únicas herramientas externas permitidas son las de **compilación** (`tsc`), que no forman parte del bundle final.
- Todos los prefijos de Custom Elements deben seguir la convención `dojo-` para evitar colisiones con elementos HTML nativos futuros.
