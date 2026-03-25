/**
 * main.ts — Entry point de la aplicación Dojo Kanban.
 *
 * Responsabilidades:
 *   1. Inicializar la base de datos IndexedDB.
 *   2. Insertar columnas por defecto si es la primera ejecución.
 *   3. Registrar todos los Web Components (Custom Elements).
 *   4. Montar el componente raíz <dojo-app> en el DOM.
 *
 * Este archivo es el único módulo referenciado desde public/index.html:
 *   <script type="module" src="./main.js"></script>
 */

import { openDatabase } from './db/database.js';
import { seedDefaultColumns } from './db/column.repository.js';

// ── Inicialización ─────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  try {
    // 1. Abrir (o crear) la base de datos
    await openDatabase();

    // 2. Seed de columnas por defecto (solo si el store está vacío)
    await seedDefaultColumns();

    // 3. Registrar Web Components
    //    Los componentes se importarán aquí a medida que se implementen.
    //    Ejemplo:
    //    import './components/organisms/kanban-board/kanban-board.js';

    // 4. Montar la app (el elemento <dojo-app> ya está en el HTML)
    console.info('[Dojo Kanban] App inicializada correctamente.');
  } catch (error) {
    console.error('[Dojo Kanban] Error durante la inicialización:', error);
  }
}

bootstrap();
