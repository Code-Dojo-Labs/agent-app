# US-42 — Integración con Supabase Personal (BYOS): Auth, Backend y Sincronización en la Nube

> **Área**: Backend / Infraestructura / Auth  
> **Prioridad**: Alta  
> **Referencia**: [improvements-11-supabase-integration.md](../requirements/improvements-11-supabase-integration.md)

---

## Historia de usuario

**Como** usuario de la aplicación,  
**quiero** poder conectar mi propio proyecto de Supabase o seguir usando la app en modo local,  
**para** decidir si sincronizo mis datos en la nube desde mi infraestructura personal sin depender de un backend centralizado, y sin perder la capacidad de trabajar sin conexión.

---

## Criterios de aceptación

```gherkin
Feature: Supabase personal (BYOS) con modo local offline siempre disponible

  Scenario: Elegir modo local al primer uso
    Given el usuario abre la aplicación por primera vez
    When aparece la pantalla de selección de modo
    And elige "Modo Local (offline)"
    Then la app funciona completamente usando solo IndexedDB
    And no se solicita ninguna credencial de Supabase
    And el usuario accede directamente al tablero

  Scenario: Conectar Supabase personal desde la selección inicial
    Given el usuario abre la aplicación por primera vez
    When elige "Conectar mi Supabase"
    Then se muestra un formulario con campos "Project URL" y "Anon Key"
    And hay un enlace de ayuda para obtener las credenciales desde el dashboard de Supabase

  Scenario: Validación de credenciales de Supabase
    Given el usuario ingresa su Project URL y Anon Key
    When hace clic en "Conectar"
    Then la app realiza una llamada de prueba para validar las credenciales
    And si son válidas, las guarda en localStorage y continúa al login
    And si son inválidas, muestra un mensaje de error sin guardar nada

  Scenario: Las credenciales no abandonan el navegador
    Given el usuario ha configurado su Supabase personal
    Then el Project URL y el Anon Key se almacenan únicamente en localStorage del navegador
    And la app no envía esas credenciales a ningún servidor propio

  Scenario: Conectar Supabase desde Ajustes (usuario existente)
    Given el usuario ya usa la app en modo local
    When accede a Ajustes y elige "Conectar Supabase"
    Then puede ingresar sus credenciales y conectar su proyecto
    And se ofrece migrar los datos existentes de IndexedDB a Supabase

  Scenario: Desconectar Supabase y volver a modo local
    Given el usuario tiene Supabase configurado
    When accede a Ajustes y elige "Desconectar Supabase"
    Then las credenciales se eliminan de localStorage
    And la app vuelve a operar únicamente con IndexedDB

  Scenario: Registro e inicio de sesión con email (modo conectado)
    Given el usuario ha configurado su Supabase personal
    When completa el formulario de login con email y contraseña válidos
    Then Supabase Auth crea o valida su sesión en su propio proyecto
    And la sesión queda persistida en localStorage
    And el usuario es redirigido al tablero

  Scenario: Login OAuth (modo conectado)
    Given el usuario tiene OAuth configurado en su proyecto de Supabase
    When hace clic en "Continuar con Google" u otro proveedor
    Then completa el flujo OAuth externo
    And Supabase Auth registra la sesión en su proyecto personal

  Scenario: Protección de rutas (modo conectado)
    Given el usuario tiene Supabase configurado pero no tiene sesión activa
    When intenta acceder directamente a la URL del tablero
    Then es redirigido a la pantalla de login

  Scenario: Aislamiento de datos por usuario (RLS)
    Given el proyecto de Supabase del usuario tiene RLS habilitado
    When el usuario consulta sus tableros y tareas
    Then solo ve sus propios datos
    And no existe acceso cruzado entre cuentas dentro del mismo proyecto

  Scenario: Trabajo offline con Supabase configurado
    Given el usuario tiene Supabase configurado pero pierde conexión a internet
    When crea o edita tareas
    Then las operaciones se aplican inmediatamente sobre IndexedDB
    And un indicador visual muestra que la app está en modo offline

  Scenario: Sincronización al recuperar conexión
    Given el usuario realizó cambios offline con Supabase configurado
    When recupera la conexión a internet
    Then los cambios pendientes se sincronizan automáticamente con su Supabase
    And no se producen duplicados

  Scenario: Sincronización en tiempo real entre dispositivos
    Given el mismo usuario tiene la app abierta en dos ventanas con Supabase conectado
    When crea una tarea en la ventana A
    Then la tarea aparece en la ventana B sin necesidad de recargar
    And la sincronización usa Supabase Realtime

  Scenario: Indicador de estado de conexión diferenciado
    Given el usuario tiene la app abierta
    Then el indicador de estado distingue entre:
      | Estado                                     | Indicador          |
      | Sin Supabase configurado (modo local)      | ícono local/disco  |
      | Supabase configurado y conectado           | ícono nube verde   |
      | Supabase configurado pero sin internet     | ícono nube naranja |

  Scenario: Cierre de sesión (modo conectado)
    Given el usuario tiene una sesión activa en su Supabase
    When hace clic en "Cerrar sesión"
    Then la sesión se invalida en Supabase Auth
    And los datos locales de sesión se limpian
    And el usuario es redirigido al login
```

---

## Notas técnicas

- El modelo es **BYOS (Bring Your Own Supabase)**: no existe Supabase centralizado propiedad de la app.
- Cliente Supabase JS v2 inicializado dinámicamente con las credenciales del usuario almacenadas en `localStorage`.
- `RepositoryFactory` instancia `IndexedDBRepository` (modo local) o `SyncRepository` (modo conectado) según configuración.
- Row-Level Security (RLS) habilitado en todas las tablas; se provee un script SQL de inicialización para que el usuario lo ejecute en su proyecto.
- IndexedDB es el almacenamiento primario; Supabase es la capa de sincronización remota opcional.
- Nuevo componente `<dojo-setup-screen>` para la selección de modo y configuración de credenciales.
- Nuevo componente `<dojo-auth-screen>` Web Component para el login (solo en modo conectado).
- Migraciones SQL versionadas en `/supabase/migrations/` listas para ejecutar en el proyecto personal del usuario.
