/**
 * main.ts — Entry point de la aplicación Dojo Kanban.
 *
 * Responsabilidades:
 *   1. Aplicar el tema (light/dark/system).
 *   2. Abrir (o crear) la base de datos IndexedDB.
 *   3. Seeds iniciales: etiquetas, proyecto y columnas por defecto (US-37).
 *   4. Inicializar sincronización multi-pestaña (US-30).
 *   5. Registrar todos los Web Components (Custom Elements).
 *   6. Montar el componente raíz <dojo-app> en el DOM.
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

// ── Inicialización ─────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  try {
    // 1. Inicializar el tema (light/dark/system)
    initTheme();
    restoreThemeCustomization();

    // 2. Abrir (o crear) la base de datos
    await openDatabase();

    // 3. Seed de etiquetas por defecto (solo si el store está vacío)
    await seedDefaultLabels();

    // 3b. Seed de proyecto por defecto "General" (US-26)
    await seedDefaultProject();

    // 3c. Seed de columnas por defecto para tableros sin columnas (US-37)
    //     Cubre: primer arranque y usuarios migrados que aún no tienen columnas.
    const boards = await getAllBoards();
    await Promise.all(boards.map(b => seedDefaultColumns(b.id)));

    // 3d. Inicializar sincronización entre pestañas (US-30)
    initializeUISync();

    // 3e. Sincronizar recordatorios de vencimiento con el Service Worker (US-34)
    //     No debe bloquear el arranque: el Service Worker puede registrarse más tarde.
    void initializeTaskNotifications().catch((error) => {
      console.error('[Dojo Kanban] Error al inicializar notificaciones de tareas:', error);
    });

    // 4. Registrar Web Components — US-01 Visualización del tablero Kanban
    await import('./components/organisms/dojo-app/dojo-app.js');
    await import('./components/organisms/dojo-theme-customizer/dojo-theme-customizer.js');

    // 6. Montar la app (el elemento <dojo-app> ya está en el HTML)
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
