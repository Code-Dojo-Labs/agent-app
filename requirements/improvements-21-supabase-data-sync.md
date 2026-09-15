# Improvement 21 — Sincronización de Datos y Manejo de Sesiones con Supabase

## 1. Descripción del Problema

Al abrir el mismo enlace del tablero Kanban en otro navegador (o dispositivo), la aplicación no respeta los datos que ya existen en Supabase. En su lugar, inicializa un estado en blanco o duplica los datos básicos, interpretando que es una cuenta o tablero totalmente distinto. Esto rompe la compatibilidad de colaboración y la funcionalidad de trabajar sobre el mismo tablero a través de diferentes dispositivos.

## 2. Propuesta de Solución

Implementar una sincronización bidireccional y un manejo consistente de la identidad del tablero:

1. **Identificadores Únicos por Tablero:** Asegurar que la URL sea la portadora principal del ID único del tablero (ej. `?boardId=xyz` o `/board/xyz`).
2. **Re-hidratación Correcta (Hydration):** Al inicializar la app, si detecta un ID de tablero válido en la URL, **no** debe intentar hacer un "push" de la configuración local inicial a Supabase. Primero forzará un `fetch` hacia el backend y usará los datos de Supabase como estado inicial.
3. **Manejo de Realtime (Opcional/MVP+):** Utilizar las capacidades de Supabase Realtime para recibir cambios provenientes de otros clientes y actualizar el estado local (IndexedDB y memoria) en tiempo real para evitar conflictos y desactualizaciones.

## 3. Criterios de Aceptación

- **Escenario 1: Carga cruzada (Cross-device)**
  - **Dado** que tengo un tablero con 3 tareas en mi PC, y abro la URL exacta en mi dispositivo móvil.
  - **Cuando** la página móvil termina de cargar.
  - **Entonces** debo ver exactamente las mismas 3 tareas.
  - **Y** no deben insertarse "columnas o tareas por defecto" duplicadas en la base de datos de Supabase.

- **Escenario 2: Sincronización en caliente**
  - **Dado** que tengo el mismo tablero cargado en el Navegador A y en el Navegador B.
  - **Cuando** edito el título de una tarea en el Navegador A.
  - **Entonces** la tarea debe reflejar el nuevo título en el Navegador B sin interrupción de la interfaz.

## 4. Diseño y UI/UX

- Añadir un pequeño indicador de sincronización en la barra superior (ej. un ícono de la nube ☁️):
  - **Verde/Check:** Todo sincronizado.
  - **Animado/Naranja:** Guardando en Supabase...
  - **Rojo/Danger:** Error de red o conflicto.

## 5. Impacto Técnico

- Cambio en la lógica de inicialización en el store local.
- Necesidad de añadir una columna `board_id` (o llave foránea respectiva) en las tablas de Supabase si actualmente están desvinculadas.
- Integración de los canales en tiempo real de `@supabase/supabase-js`.
