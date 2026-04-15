# Supabase Sync — POC multi-dispositivo

> **Estado**: En espera — pendiente de mejoras previas  
> **Rama**: `feat/supabase-sync-poc`  
> **Fecha**: 15 de abril de 2026  
> **Autor**: builder

---

## Contexto

El proyecto usa `IndexedDB` como única fuente de verdad local y `BroadcastChannel` (US-30) para sincronizar pestañas del mismo navegador. Ambas APIs son de dispositivo único, por lo que **no hay sincronización entre el laptop y el iPhone**.

Se evaluaron varias opciones para sincronización multi-dispositivo:

| Opción | Realtime | Zero Dependencies | Costo | Offline |
|---|---|---|---|---|
| **Supabase** ✅ | WebSocket nativo | ✅ `fetch` + `WebSocket` | Free tier | ✅ |
| Firebase Firestore | WebSocket | ⚠️ REST complejo | Free tier | ✅ |
| Cloudflare Workers + KV | Polling | ✅ | Free tier | ❌ |
| PocketBase (self-hosted) | SSE nativo | ✅ | Gratis | ✅ |
| Export/Import manual | ❌ | ✅ | Gratis | ✅ |

**Supabase fue elegido** porque:
- Se conecta únicamente con `fetch` y `WebSocket` del navegador (respeta Zero Dependencies)
- Realtime nativo via WebSocket (protocolo Phoenix)
- Free tier suficiente para uso personal (500 MB DB, 2M requests/mes)
- La PWA (US-31) ya instalable en iPhone se conectaría automáticamente
- Los UUIDs del cliente y el campo `updatedAt` son compatibles directamente con PostgreSQL

---

## Arquitectura

```
Laptop (IndexedDB)  ─── fetch/WebSocket ───┐
                                           Supabase PostgreSQL + Realtime
iPhone PWA (IndexedDB) ─ fetch/WebSocket ──┘
```

### Flujo de escritura (PUSH)
1. El usuario modifica algo → se escribe en **IndexedDB** (local, offline-first)
2. `emitSync()` → **BroadcastChannel** (otras pestañas del mismo navegador)
3. `supabaseSync.push()` → **REST API de Supabase** (otros dispositivos)

### Flujo de lectura (PULL — Realtime)
1. Supabase emite evento `postgres_changes` via **WebSocket**
2. `SupabaseSyncService` recibe el evento
3. Aplica merge en **IndexedDB** (Last-Write-Wins por `updatedAt`)
4. `emitSync()` notifica a la UI para re-renderizar

### Resolución de conflictos
**Last-Write-Wins (LWW)** por el campo `updatedAt` / `createdAt`:
- Si el registro local es igual o más reciente → se descarta el remoto
- Si el remoto es más reciente → se sobreescribe el local

### Loop-prevention
Cada `push()` registra una clave `{tabla}:{id}:{updatedAt}` en un `Set` con TTL de 15 s. Cuando llega el eco del propio cambio via Realtime, se descarta silenciosamente.

---

## Archivos creados / modificados

### Nuevos
| Archivo | Descripción |
|---|---|
| `src/config.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SYNC_ENABLED` |
| `src/utils/supabase-sync.ts` | Servicio completo: REST + WebSocket Realtime + pull inicial |
| `supabase/schema.sql` | DDL para ejecutar en Supabase: 6 tablas + Realtime habilitado |

### Modificados
| Archivo | Cambio |
|---|---|
| `src/db/task.repository.ts` | `+supabaseSync.push/remove` en `createTask`, `updateTask`, `deleteTask` |
| `src/main.ts` | `+initSupabaseSync()` en el bootstrap (paso 3d) |

> **Nota**: Solo se modificó `task.repository.ts`. Los repositorios restantes (`board`, `column`, `label`, `project`, `person`) **aún no tienen la llamada a `supabaseSync`** — esto está pendiente de completar cuando se reactive la rama.

---

## Cómo activar la sincronización

1. Crear proyecto gratuito en [https://supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/schema.sql`
3. Copiar los valores desde **Settings → API**
4. Editar `src/config.ts`:

```typescript
export const SUPABASE_URL          = 'https://<ref>.supabase.co';
export const SUPABASE_ANON_KEY     = '<tu-anon-key>';
export const SUPABASE_SYNC_ENABLED = true;
```

Mientras `SUPABASE_SYNC_ENABLED = false` (valor por defecto), la app funciona exactamente igual que antes.

---

## Pendiente antes de integrar a `development`

- [ ] Completar integración en los repositorios restantes: `board`, `column`, `label`, `project`, `person`
- [ ] Aplicar las mejoras previas planeadas sobre la rama `development`
- [ ] Habilitar Row Level Security (RLS) en Supabase para producción
- [ ] Prueba end-to-end: laptop ↔ iPhone con la PWA instalada
- [ ] Documentar US correspondiente (ej. US-38 o extensión de US-30)

---

## Schema SQL resumido

```sql
-- 6 tablas con columnas camelCase (compatibles con los modelos TypeScript)
tasks    (id, boardId, projectId, title, statusId, priority, updatedAt, ...)
columns  (id, boardId, name, icon, order)
boards   (id, name, emoji, createdAt)
labels   (id, name, color)
projects (id, name, prefix, nextTaskNumber, createdAt)
persons  (id, name, avatar, createdAt)

-- Realtime habilitado en todas las tablas
alter publication supabase_realtime add table public.tasks;
-- ... (ver supabase/schema.sql para el DDL completo)
```

---

## Decisiones técnicas clave

- **Sin SDK de Supabase** (`@supabase/supabase-js`) — usa `fetch` + `WebSocket` nativos
- **Protocolo Phoenix Channel** implementado manualmente (join, heartbeat, reconnect)
- **IndexedDB sigue siendo la fuente de verdad local** — la app funciona offline sin cambios
- **UUIDs generados en el cliente** con `crypto.randomUUID()` — compatibles con PostgreSQL `text` PK
- **Campos `updatedAt`/`createdAt` en formato ISO 8601** — comparables lexicográficamente para LWW
