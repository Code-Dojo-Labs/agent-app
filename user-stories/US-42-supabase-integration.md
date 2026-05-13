# US-42 — Integración con Supabase: Auth, Backend y Sincronización en la Nube

> **Área**: Backend / Infraestructura / Auth  
> **Prioridad**: Alta  
> **Referencia**: [improvements-11-supabase-integration.md](../requirements/improvements-11-supabase-integration.md)

---

## Historia de usuario

**Como** usuario registrado,  
**quiero** que mis tareas, tableros y configuración se almacenen en la nube con autenticación,  
**para** acceder a mis datos desde cualquier dispositivo y no perderlos al limpiar el navegador.

---

## Criterios de aceptación

```gherkin
Feature: Autenticación y sincronización con Supabase

  Scenario: Registro e inicio de sesión con email
    Given el usuario accede a la aplicación sin sesión activa
    When completa el formulario de login con email y contraseña válidos
    Then Supabase Auth crea o valida su sesión
    And la sesión queda persistida en localStorage
    And el usuario es redirigido al tablero

  Scenario: Login OAuth con Google o GitHub
    Given el usuario hace clic en "Continuar con Google"
    When completa el flujo OAuth externo
    Then Supabase Auth registra la sesión
    And el usuario accede al tablero sin crear contraseña

  Scenario: Protección de rutas
    Given el usuario no tiene sesión activa
    When intenta acceder directamente a la URL del tablero
    Then es redirigido a la pantalla de login

  Scenario: Aislamiento de datos por usuario (RLS)
    Given dos usuarios registrados en la misma instancia
    When cada uno consulta sus tableros y tareas
    Then cada usuario solo ve sus propios datos
    And no existe acceso cruzado entre cuentas

  Scenario: Sincronización offline-first
    Given el usuario crea una tarea sin conexión a internet
    When recupera la conexión
    Then la tarea se sincroniza automáticamente con Supabase
    And no se producen duplicados

  Scenario: Sincronización en tiempo real entre pestañas/dispositivos
    Given el mismo usuario tiene la app abierta en dos ventanas
    When crea una tarea en la ventana A
    Then la tarea aparece en la ventana B sin necesidad de recargar
    And la sincronización usa Supabase Realtime

  Scenario: Cierre de sesión
    Given el usuario tiene una sesión activa
    When hace clic en "Cerrar sesión"
    Then la sesión se invalida en Supabase Auth
    And los datos locales de sesión se limpian
    And el usuario es redirigido al login
```

---

## Notas técnicas

- Cliente Supabase JS v2 instalado como única dependencia externa nueva.
- Row-Level Security (RLS) habilitado en todas las tablas de Postgres.
- IndexedDB sigue siendo la caché local; Supabase es la fuente de verdad remota.
- Nuevo componente `<dojo-auth-screen>` Web Component minimalista.
- Migraciones SQL versionadas en `/supabase/migrations/`.
