# Sincronización en la nube (BYOS)

Dojo Kanban funciona **100% offline** por defecto — todos los datos se almacenan en IndexedDB del navegador. Si quieres acceder a tus tableros desde distintos dispositivos o navegadores, puedes conectar tu propio proyecto de **Supabase** (modelo BYOS: *Bring Your Own Supabase*).

## ¿Qué se sincroniza?

| Datos | Sincronizado |
|-------|:---:|
| Tableros | ✅ |
| Columnas | ✅ |
| Tareas | ✅ |
| Etiquetas | ✅ |
| Proyectos | ✅ |
| Personas | ✅ |
| Plantillas de tareas | ✅ |

## Configurar la sincronización

### 1. Crear un proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Crea un nuevo proyecto. Anota la **URL del proyecto** y la **clave anónima** (`anon key`).

### 2. Inicializar las tablas

Ejecuta el script SQL incluido en el repositorio:

```
docs/dojo-kanban-supabase-init.sql
```

Puedes pegarlo en el **Editor SQL** de Supabase → *New query* → *Run*.

### 3. Conectar la app

Al abrir Dojo Kanban por primera vez (o si aún no elegiste modo), verás la pantalla de configuración:

```
┌─────────────────────────────────────────┐
│         ¿Cómo quieres usar la app?      │
│                                         │
│  [  Modo local  ]  [  Modo nube  ]      │
└─────────────────────────────────────────┘
```

1. Selecciona **Modo nube**.
2. Introduce la **URL** y la **clave anónima** de tu proyecto Supabase.
3. Haz clic en **Validar y continuar**.
4. Inicia sesión o crea una cuenta con tu correo.

### 4. Sincronización inicial

Al iniciar sesión, la app sube automáticamente todos los datos locales a Supabase. Verás en la consola del navegador mensajes como:

```
[Sync] ✓ 6 registros subidos a 'columns'
[Sync] ✓ 8 registros subidos a 'labels'
[Sync] ✓ Sincronización inicial completada.
```

## Cómo funciona la sincronización

La arquitectura es **offline-first**:

```
Acción del usuario
      │
      ▼
  IndexedDB   ←── fuente de verdad local (inmediata)
      │
      ▼  fire-and-forget (no bloquea la UI)
  Supabase    ←── réplica en la nube
```

- Cada escritura (crear, editar, eliminar) se persiste en IndexedDB **primero**.
- Luego se envía a Supabase en segundo plano sin bloquear la interfaz.
- Si no hay conexión, la operación se encola en `localStorage` y se reenvía automáticamente al recuperar la conexión.

## Seguridad (Row Level Security)

Cada tabla tiene RLS activado: **solo tú puedes leer y modificar tus datos**. Ni otros usuarios ni el equipo de Supabase pueden acceder a ellos.

## Trabajar sin conexión

La app funciona con normalidad sin internet. Al volver a conectarse, la cola pendiente se vacía automáticamente.

## FAQ

**¿Puedo cambiar de modo local a modo nube después de configurar la app?**
Por ahora el modo se elige la primera vez. Para cambiarlo, borra los datos de la aplicación en las herramientas del navegador (*Application → Storage → Clear site data*) y vuelve a abrir la app.

**¿Mis datos están seguros en Supabase?**
Sí. Las tablas tienen Row Level Security (RLS) basado en tu `user_id`. Solo tu cuenta puede acceder a tus datos.

**¿Cuántos dispositivos puedo sincronizar?**
Los que quieras, siempre que inicies sesión con la misma cuenta en cada dispositivo.

**¿Qué pasa si edito la misma tarea en dos dispositivos sin conexión?**
La última escritura gana (estrategia *last-write-wins* vía `upsert`). No hay resolución de conflictos por ahora.
