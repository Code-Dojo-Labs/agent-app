# IMP-11 — Integración con Supabase Personal: Backend, Auth y Sincronización en la Nube

> Versión: 2.0
> Fecha: 2026-05-14
> Estado: Propuesta Actualizada

---

## Problema que Resuelve

La aplicación actualmente persiste todos los datos en **IndexedDB** (almacenamiento local del navegador), lo que implica:

- Los datos están atados a un solo dispositivo y navegador.
- No existe autenticación de usuarios; cualquier persona con acceso al dispositivo puede ver/modificar todos los datos.
- La colaboración en tiempo real entre múltiples usuarios o pestañas se resuelve con BroadcastChannel (US-30), pero no funciona entre dispositivos distintos.
- Un borrado de caché o cambio de navegador implica **pérdida total de datos**.

### Decisión de Arquitectura: Supabase Personal (BYOS)

La integración **no** utiliza un proyecto de Supabase centralizado gestionado por la aplicación. En cambio, **cada usuario provee su propio proyecto de Supabase** (modelo _Bring Your Own Supabase_). Esto garantiza:

- **Privacidad total:** los datos del usuario nunca pasan por infraestructura de terceros distintos de su propio proyecto.
- **Control completo:** el usuario es dueño de su base de datos, claves y cuotas.
- **Sin costos ocultos:** el plan gratuito de Supabase es más que suficiente para uso personal.
- **Uso opcional:** la app funciona 100% en modo offline/local sin necesidad de configurar Supabase.

---

## Propuesta de Solución

Integrar **Supabase** como capa de backend opcional y personal, manteniendo IndexedDB como almacenamiento primario para soporte offline, implementando un patrón **offline-first con sincronización voluntaria**.

### Flujo de Onboarding de Supabase

Al abrir la app por primera vez (o desde Ajustes), el usuario verá dos opciones:

```
┌─────────────────────────────────────────────┐
│         ¿Cómo quieres usar la app?          │
│                                             │
│  [ 🖥  Modo Local (offline) ]               │
│    Sin cuenta, datos en este navegador      │
│                                             │
│  [ ☁️  Conectar mi Supabase ]               │
│    Sincroniza entre dispositivos con tu     │
│    propio proyecto gratuito de Supabase     │
└─────────────────────────────────────────────┘
```

Si elige **Conectar mi Supabase**, se mostrará un formulario de configuración:

```
┌─────────────────────────────────────────┐
│        Configurar Supabase Personal     │
│                                         │
│  Project URL:                           │
│  [ https://xxxx.supabase.co          ] │
│                                         │
│  Anon Key:                              │
│  [ eyJhbGciOiJIUzI1NiIs...           ] │
│                                         │
│  ¿Dónde los encuentro?  [Ver guía →]   │
│                                         │
│              [ Conectar ]               │
└─────────────────────────────────────────┘
```

Las credenciales se almacenan **exclusivamente en `localStorage` del navegador del usuario**. La app nunca las envía a ningún servidor propio.

### Arquitectura propuesta

```
┌─────────────────────────────────────────────────┐
│                Frontend (Lit + TS)              │
│                                                 │
│  ┌──────────────┐      ┌──────────────────────┐ │
│  │  IndexedDB   │      │  Supabase JS Client  │ │
│  │  (primario / │◄────►│  (Project URL +      │ │
│  │   offline)   │      │   Anon Key propios)  │ │
│  └──────────────┘      └──────────┬───────────┘ │
└──────────────────────────────────  │  ───────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  Supabase del       │
                          │  USUARIO            │
                          │  ┌───────────────┐  │
                          │  │ Auth          │  │
                          │  ├───────────────┤  │
                          │  │ Postgres (RLS)│  │
                          │  ├───────────────┤  │
                          │  │ Realtime      │  │
                          │  └───────────────┘  │
                          └─────────────────────┘
```

### Componentes a implementar

#### 0. Pantalla de Selección de Modo (nuevo)
- Componente `dojo-setup-screen` mostrado al primer uso o desde Ajustes.
- Opción **Modo Local**: continúa usando solo IndexedDB. Sin fricción adicional.
- Opción **Conectar Supabase**: muestra formulario para ingresar `Project URL` y `Anon Key`.
- Enlace a guía de ayuda para obtener las credenciales desde el dashboard de Supabase.
- Las credenciales se validan con una llamada de prueba antes de guardarlas.
- Estado de conexión visible en la barra superior de la app (ícono nube / offline).

#### 1. Autenticación (Supabase Auth) — solo en modo conectado
- Login con **email + contraseña** y con **OAuth (Google, GitHub)** configurado por el usuario en su proyecto.
- Sesión persistida en `localStorage` vía el cliente de Supabase.
- Pantalla de login minimalista (`dojo-auth-screen` Web Component).
- Protección de rutas: tablero solo accesible con sesión activa (en modo conectado).
- Row-Level Security (RLS) en Postgres para aislar datos por usuario.

#### 2. Migración del Modelo de Datos
Nuevas tablas en Supabase con RLS habilitado:

| Tabla | Descripción |
|---|---|
| `boards` | Tableros del usuario |
| `columns` | Columnas de cada tablero |
| `tasks` | Tareas con todos los campos actuales |
| `labels` | Etiquetas del usuario |
| `task_labels` | Relación many-to-many tarea-etiqueta |
| `subtasks` | Subtareas / checklist |
| `activity_log` | Historial de actividad |

La app incluirá un script SQL de inicialización que el usuario puede ejecutar en su proyecto de Supabase para crear estas tablas con RLS preconfigurado.

#### 3. Capa de Repositorios Unificada
Refactorizar los repositorios existentes (`src/db/`) para implementar una interfaz común:

```typescript
interface IRepository<T> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: string, changes: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
```

Implementaciones:
- `IndexedDBRepository<T>` — existente, para modo local/offline.
- `SupabaseRepository<T>` — nueva, contra el Supabase personal del usuario.
- `SyncRepository<T>` — wrapper que escribe en ambos y sincroniza al recuperar conexión.

Un `RepositoryFactory` instancia la implementación correcta según si Supabase está configurado o no.

#### 4. Sincronización en Tiempo Real
- Usar **Supabase Realtime** (Postgres Changes) para propagar cambios entre dispositivos/pestañas.
- Reemplazar el BroadcastChannel actual (US-30) por Realtime como fuente única de verdad (solo en modo conectado).
- Estrategia de conflictos: **last-write-wins** basado en `updated_at`.

#### 5. Indicador de Estado de Conexión
- Banner/indicador visual cuando la app opera en modo offline.
- Cola de escrituras pendientes sincronizadas al recuperar conexión.
- Indicador diferenciado entre "sin Supabase configurado" vs "Supabase configurado pero sin internet".

---

## Criterios de Aceptación

### Modo Local (offline — sin Supabase)
- [ ] La app funciona completamente sin configurar Supabase: creación, edición, eliminación y drag & drop de tareas operan sobre IndexedDB.
- [ ] El usuario puede elegir "Modo Local" al primer uso y omitir la configuración de Supabase.
- [ ] Desde Ajustes, el usuario puede conectar Supabase en cualquier momento posterior.

### Configuración de Supabase Personal
- [ ] El usuario puede ingresar su `Project URL` y `Anon Key` desde la pantalla de configuración o Ajustes.
- [ ] La app valida las credenciales con una llamada de prueba antes de guardarlas.
- [ ] Las credenciales se almacenan solo en `localStorage`; nunca se envían a servidores propios de la app.
- [ ] El usuario puede desconectar Supabase y volver a modo local en cualquier momento.
- [ ] Se muestra una guía/enlace de ayuda para obtener las credenciales desde el dashboard de Supabase.

### Autenticación (solo en modo conectado)
- [ ] El usuario puede registrarse con email y contraseña en su propio proyecto de Supabase.
- [ ] El usuario puede iniciar sesión con OAuth si lo configura en su proyecto de Supabase.
- [ ] La sesión persiste entre recargas de página.
- [ ] Cerrar sesión borra la sesión local y redirige al login.
- [ ] Un usuario no puede ver datos de otro usuario (RLS verificado).

### Sincronización
- [ ] Los cambios realizados en el dispositivo A aparecen en el dispositivo B en menos de 2 segundos (con conexión activa).
- [ ] En modo offline (sin internet pero con Supabase configurado), las operaciones CRUD siguen funcionando via IndexedDB.
- [ ] Al recuperar conexión, los cambios offline se sincronizan automáticamente con Supabase.
- [ ] Los conflictos se resuelven por `updated_at` más reciente.

### Rendimiento
- [ ] La carga inicial del tablero no supera 1.5 s en conexión estándar.
- [ ] Las operaciones locales (crear, mover tarea) son inmediatas (optimistic updates).

### Migración de Datos Existentes
- [ ] Al conectar Supabase por primera vez, se ofrece migrar los datos de IndexedDB existentes al proyecto del usuario.
- [ ] El proceso de migración es reversible / exportable.

---

## Stack Adicional Requerido

| Paquete | Versión | Uso |
|---|---|---|
| `@supabase/supabase-js` | ^2.x | Cliente oficial de Supabase |
| `@supabase/auth-ui-web` | ^0.x | UI de autenticación lista (opcional) |

---

## Impacto en Archivos Existentes

| Archivo | Cambio |
|---|---|
| `src/db/*.repository.ts` | Refactor para implementar interfaz común |
| `src/main.ts` | Inicializar cliente Supabase y guard de auth |
| `src/types/models.ts` | Añadir `user_id` a entidades sincronizadas |
| `src/components/organisms/dojo-app/` | Añadir flujo de autenticación |
| `requirements/data-model.md` | Actualizar con esquema Supabase |

---

## Fases de Implementación Sugeridas

1. **Fase 1 — Auth:** Login/registro, sesión y guard básico.
2. **Fase 2 — Migración de datos:** Repositorios unificados + migración de IndexedDB.
3. **Fase 3 — Realtime:** Sincronización entre dispositivos y reemplazo de BroadcastChannel.
4. **Fase 4 — Offline:** Cola de escrituras y reconciliación de conflictos.
