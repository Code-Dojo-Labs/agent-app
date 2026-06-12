/**
 * main.ts — Entry point de la aplicación Dojo Kanban.
 *
 * Responsabilidades:
 *   1. Aplicar el tema (light/dark/system).
 *   2. Inicializar cliente Supabase (si está configurado) — US-42.
 *   3. Mostrar pantalla de selección de modo si es el primer uso — US-42.
 *   4. Abrir (o crear) la base de datos IndexedDB.
 *   5. Seeds iniciales: etiquetas, proyecto y columnas por defecto (US-37).
 *   6. Inicializar sincronización multi-pestaña (US-30).
 *   7. Registrar todos los Web Components (Custom Elements).
 *   8. Montar el componente raíz <dojo-app> en el DOM.
 *
 * Este archivo es el único módulo referenciado desde public/index.html:
 *   <script type="module" src="./main.js"></script>
 */

import { openDatabase } from './db/database.js';
import { seedDefaultLabels } from './db/label.repository.js';
import { seedDefaultProject } from './db/project.repository.js';
import { getAllBoards } from './db/board.repository.js';
import { seedDefaultColumns } from './db/column.repository.js';
import { initTheme } from './utils/theme.js';
import { initializeUISync } from './utils/ui-sync.js';
import { initializeTaskNotifications } from './utils/task-notifications.js';
import { restoreThemeCustomization } from './components/organisms/dojo-theme-customizer/dojo-theme-customizer.js';
import {
  initSupabaseClient,
  hasModeBeenChosen,
  isSupabaseConfigured,
  getSupabaseClient,
} from './db/supabase-client.js';
import { pullAllFromRemote, flushAllPending } from './db/repository.factory.js';
import { syncAllLocalToSupabase } from './db/supabase-sync.js';

// ── Helpers de flujo de autenticación / modo ───────────────────────────────

/**
 * Muestra la pantalla de selección de modo y espera la decisión del usuario.
 * Resuelve con el modo elegido: 'local' | 'cloud'.
 */
function showSetupScreen(): Promise<'local' | 'cloud'> {
  return new Promise((resolve) => {
    const screen = document.createElement('dojo-setup-screen');
    document.body.appendChild(screen);
    screen.addEventListener('dojo-mode-selected', (e: Event) => {
      const { mode } = (e as CustomEvent<{ mode: 'local' | 'cloud' }>).detail;
      screen.remove();
      resolve(mode);
    }, { once: true });
  });
}

/**
 * Muestra la pantalla de login y espera que el usuario autentique.
 * Solo se llama en modo cloud cuando no hay sesión activa.
 */
function showAuthScreen(): Promise<void> {
  return new Promise((resolve) => {
    const screen = document.createElement('dojo-auth-screen');
    document.body.appendChild(screen);
    screen.addEventListener('dojo-auth-success', () => {
      screen.remove();
      resolve();
    }, { once: true });
  });
}

// ── Inicialización ─────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  try {
    // 1. Inicializar el tema (light/dark/system)
    initTheme();
    restoreThemeCustomization();

    // 2. Inicializar el cliente Supabase (si ya está configurado) — US-42
    initSupabaseClient();

    // 3. Registrar componentes de setup/auth antes de posiblemente mostrarlos
    await import('./components/organisms/dojo-setup-screen/dojo-setup-screen.js');
    await import('./components/organisms/dojo-auth-screen/dojo-auth-screen.js');

    // 4. Si el usuario nunca ha elegido un modo, mostrar la pantalla de selección
    if (!hasModeBeenChosen()) {
      await showSetupScreen();
    }

    // 5. Si está en modo cloud y no hay sesión activa, mostrar login — US-42
    if (isSupabaseConfigured()) {
      const client = getSupabaseClient();
      if (client && !client.isAuthenticated) {
        await showAuthScreen();
      }
      // Sincronizar datos locales → Supabase (respeta orden de FK)
      void syncAllLocalToSupabase();
    }

    // 6. Abrir (o crear) la base de datos
    await openDatabase();

    // 7. Seed de etiquetas por defecto (solo si el store está vacío)
    await seedDefaultLabels();

    // 7b. Seed de proyecto por defecto "General" (US-26)
    await seedDefaultProject();

    // 7c. Seed de columnas por defecto para tableros sin columnas (US-37)
    //     Cubre: primer arranque y usuarios migrados que aún no tienen columnas.
    const boards = await getAllBoards();
    await Promise.all(boards.map(b => seedDefaultColumns(b.id)));

    // 7d. Inicializar sincronización entre pestañas (US-30)
    initializeUISync();

    // 7e. Si hay Supabase activo con sesión, sincronizar datos desde la nube — US-42
    if (isSupabaseConfigured() && getSupabaseClient()?.isAuthenticated) {
      void pullAllFromRemote().catch(err =>
        console.warn('[Dojo Kanban] Pull inicial desde Supabase falló:', err)
      );
      void flushAllPending().catch(err =>
        console.warn('[Dojo Kanban] Flush de pendientes falló:', err)
      );
    }

    // 7f. Sincronizar recordatorios de vencimiento con el Service Worker (US-34)
    //     No debe bloquear el arranque: el Service Worker puede registrarse más tarde.
    void initializeTaskNotifications().catch((error) => {
      console.error('[Dojo Kanban] Error al inicializar notificaciones de tareas:', error);
    });

    // 8. Registrar Web Components — US-01 Visualización del tablero Kanban
    await import('./components/organisms/dojo-app/dojo-app.js');
    await import('./components/organisms/dojo-theme-customizer/dojo-theme-customizer.js');

    // 9. Montar la app (el elemento <dojo-app> ya está en el HTML)
    console.info('[Dojo Kanban] App inicializada correctamente.');
  } catch (error) {
    console.error('[Dojo Kanban] Error durante la inicialización:', error);

    // Mostrar mensaje de error en el DOM (WCAG 2.1 — 4.1.3 Status Messages).
    // Todo el contenido es estático — no contiene input del usuario.
    // Será reemplazado por <dojo-error> Web Component cuando esté implementado.
    const errEl = document.createElement('div');
    errEl.setAttribute('role', 'alert');
    errEl.style.cssText = 'padding:2rem;font-family:system-ui;color:var(--dojo-danger,#DC2626);text-align:center';

    const title = document.createElement('h1');
    title.style.cssText = 'margin-bottom:.5rem;font-size:1.25rem';
    title.textContent = 'Error al inicializar la aplicación';

    const msg = document.createElement('p');
    msg.textContent = error instanceof Error && error.message.includes('IndexedDB')
      ? error.message
      : 'No se pudo conectar al almacenamiento local. Comprueba que no estás en modo privado o usa otro navegador.';

    const btn = document.createElement('button');
    btn.style.cssText = 'margin-top:1rem;padding:.5rem 1rem;cursor:pointer';
    btn.textContent = 'Reintentar';
    btn.addEventListener('click', () => location.reload());

    errEl.appendChild(title);
    errEl.appendChild(msg);
    errEl.appendChild(btn);
    document.body.appendChild(errEl);
  }
}

bootstrap();
