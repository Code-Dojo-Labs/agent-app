# US-31 — Soporte PWA (Progressive Web App)

> **Área**: Infraestructura  
> **Prioridad**: Media  
> **Referencia**: [improvements.md — MS-10 (PWA)](../requirements/improvements.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** instalar la aplicación en mi escritorio o dispositivo móvil como una app nativa y que funcione sin conexión,  
**para** acceder a mi tablero Kanban en cualquier momento sin depender del navegador ni de una conexión a internet.

---

## Criterios de aceptación

```gherkin
Feature: Soporte PWA (Progressive Web App)

  Scenario: Instalar la aplicación en escritorio
    Given el usuario está en un navegador compatible con PWA (Chrome, Edge, etc.)
    When accede a la aplicación
    Then el navegador muestra la opción de instalar la aplicación
    When el usuario acepta la instalación
    Then la aplicación se instala como una app de escritorio con su propio ícono

  Scenario: Instalar la aplicación en dispositivo móvil
    Given el usuario accede a la aplicación desde un navegador móvil
    When el navegador detecta el manifest.json válido
    Then se muestra la opción "Añadir a pantalla de inicio"
    When el usuario acepta
    Then la aplicación se instala con ícono y se abre en modo standalone

  Scenario: Funcionalidad offline completa
    Given la aplicación está instalada y fue cargada previamente
    When el usuario pierde la conexión a internet
    Then la aplicación sigue funcionando correctamente
    And puede crear, editar, eliminar y mover tareas
    And los datos se persisten en IndexedDB normalmente

  Scenario: Carga de la app sin conexión
    Given la aplicación fue cargada al menos una vez con conexión
    When el usuario abre la aplicación sin conexión
    Then la aplicación carga desde la caché del Service Worker
    And todos los assets (HTML, CSS, JS) están disponibles offline

  Scenario: Actualización del Service Worker
    Given existe una nueva versión del Service Worker disponible
    When el usuario abre la aplicación
    Then el Service Worker se actualiza en segundo plano
    And la nueva versión se activa en la siguiente recarga

  Scenario: Manifest.json bien configurado
    Given la aplicación tiene un archivo manifest.json
    When un navegador lo procesa
    Then contiene los campos requeridos: name, short_name, start_url, display, icons
    And el campo "display" está configurado como "standalone"
    And los íconos están disponibles en los tamaños requeridos (192x192, 512x512)
```

---

## Notas técnicas

- Crear `manifest.json` con la configuración de la PWA.
- Implementar un Service Worker con estrategia **Cache First**.
- Los datos ya están en IndexedDB, por lo que la experiencia offline es completa.
- No requiere esfuerzo adicional de sincronización.
