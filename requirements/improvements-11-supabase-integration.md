# IMP-11 — Integración con Supabase: Backend, Auth y Sincronización en la Nube

> Versión: 1.0
> Fecha: 2026-05-12
> Estado: Propuesta

---

## Problema que Resuelve

La aplicación actualmente persiste todos los datos en **IndexedDB** (almacenamiento local del navegador), lo que implica:

- Los datos están atados a un solo dispositivo y navegador.
- No existe autenticación de usuarios; cualquier persona con acceso al dispositivo puede ver/modificar todos los datos.
- La colaboración en tiempo real entre múltiples usuarios o pestañas se resuelve con BroadcastChannel (US-30), pero no funciona entre dispositivos distintos.
- Un borrado de caché o cambio de navegador implica **pérdida total de datos**.

---

## Propuesta de Solución

Integrar **Supabase** como capa de backend, manteniendo IndexedDB como caché local para soporte offline, implementando un patrón **offline-first con sincronización**.

### Arquitectura propuesta

```
┌─────────────────────────────────────┐
│           Frontend (Lit + TS)       │
│                                     │
│  ┌──────────────┐  ┌─────────────┐  │
│  │  IndexedDB   │  │  Supabase   │  │
│  │ (cache/      │◄─►│  JS Client  │  │
│  │  offline)    │  │             │  │
│  └──────────────┘  └──────┬──────┘  │
└─────────────────────────  │ ────────┘
                            │
                    ┌───────▼────────┐
                    │   Supabase     │
                    │  ┌──────────┐  │
                    │  │ Auth     │  │
                    │  ├──────────┤  │
                    │  │ Postgres │  │
                    │  ├──────────┤  │
                    │  │ Realtime │  │
                    │  └──────────┘  │
                    └────────────────┘
```

### Componentes a implementar

#### 1. Autenticación (Supabase Auth)
- Login con **email + contraseña** y con **OAuth (Google, GitHub)**.
- Sesión persistida en `localStorage` vía el cliente de Supabase.
- Pantalla de login minimalista (`dojo-auth-screen` Web Component).
- Protección de rutas: tablero solo accesible con sesión activa.
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
- `IndexedDBRepository<T>` — existente, para offline.
- `SupabaseRepository<T>` — nueva, contra Supabase.
- `SyncRepository<T>` — wrapper que escribe en ambos y sincroniza al recuperar conexión.

#### 4. Sincronización en Tiempo Real
- Usar **Supabase Realtime** (Postgres Changes) para propagar cambios entre dispositivos/pestañas.
- Reemplazar el BroadcastChannel actual (US-30) por Realtime como fuente única de verdad.
- Estrategia de conflictos: **last-write-wins** basado en `updated_at`.

#### 5. Indicador de Estado de Conexión
- Banner/indicador visual cuando la app opera en modo offline.
- Cola de escrituras pendientes sincronizadas al recuperar conexión.

---

## Criterios de Aceptación

### Autenticación
- [ ] El usuario puede registrarse con email y contraseña.
- [ ] El usuario puede iniciar sesión con Google u OAuth configurado.
- [ ] La sesión persiste entre recargas de página.
- [ ] Cerrar sesión borra la sesión local y redirige al login.
- [ ] Un usuario no puede ver datos de otro usuario (RLS verificado).

### Sincronización
- [ ] Los cambios realizados en el dispositivo A aparecen en el dispositivo B en menos de 2 segundos (con conexión activa).
- [ ] En modo offline, las operaciones CRUD siguen funcionando via IndexedDB.
- [ ] Al recuperar conexión, los cambios offline se sincronizan automáticamente con Supabase.
- [ ] Los conflictos se resuelven por `updated_at` más reciente.

### Rendimiento
- [ ] La carga inicial del tablero no supera 1.5 s en conexión estándar.
- [ ] Las operaciones locales (crear, mover tarea) son inmediatas (optimistic updates).

### Migración
- [ ] Existe un proceso de migración que importa los datos de IndexedDB existente a Supabase al primer login.
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
