/**
 * supabase-sync.ts — Helper de sincronización fire-and-forget.
 *
 * Principios:
 *   - Nunca bloquea la operación local (fire-and-forget + cola offline).
 *   - Si no hay cliente Supabase, es un no-op.
 *   - Si no hay conexión, encola en localStorage y envía al recuperar.
 *
 * Mapeo camelCase (IndexedDB) → snake_case (Supabase):
 *   Los modelos internos usan camelCase; las tablas SQL usan snake_case.
 */

import { getSupabaseClient } from './supabase-client.js';
import { generateUUID } from '../utils/uuid.js';

// ── Mappers camelCase → snake_case ──────────────────────────────────────────

type Row = Record<string, unknown>;

const MAPPERS: Record<string, (d: Row) => Row> = {
  tasks: (d) => ({
    id:            d['id'],
    board_id:      d['boardId'],
    project_id:    d['projectId'] ?? null,
    status_id:     d['statusId'],
    task_number:   d['taskNumber'] ?? '',
    title:         d['title'],
    description:   d['description'] ?? '',
    priority:      d['priority'] ?? 'medium',
    due_date:      d['dueDate'] ?? null,
    notifications: d['notifications'] ?? false,
    label_ids:     d['labelIds'] ?? [],
    assignees:     d['assignees'] ?? [],
    subtasks:      d['subtasks'] ?? [],
    order:         d['order'] ?? 0,
    created_at:    d['createdAt'],
    updated_at:    d['updatedAt'],
  }),
  boards: (d) => ({
    id:          d['id'],
    name:        d['name'],
    description: d['description'] ?? '',
    icon:        d['icon'] ?? '📋',
    color:       d['color'] ?? null,
    created_at:  d['createdAt'],
    updated_at:  d['updatedAt'] ?? d['createdAt'],
  }),
  columns: (d) => ({
    id:         d['id'],
    board_id:   d['boardId'],
    name:       d['name'],
    icon:       d['icon'] ?? '📋',
    order:      d['order'] ?? 0,
    color:      d['color'] ?? null,
    is_default: d['isDefault'] ?? false,
    wip_limit:  d['wipLimit'] ?? null,
    created_at: d['createdAt'] ?? new Date().toISOString(),
    updated_at: d['updatedAt'] ?? new Date().toISOString(),
  }),
  labels: (d) => ({
    id:         d['id'],
    name:       d['name'],
    color:      d['color'] ?? '#6366f1',
    text_color: d['textColor'] ?? '#ffffff',
    created_at: d['createdAt'] ?? new Date().toISOString(),
    updated_at: d['updatedAt'] ?? new Date().toISOString(),
  }),
  persons: (d) => ({
    id:         d['id'],
    name:       d['name'],
    email:      d['email'] ?? null,
    avatar_url: d['avatarUrl'] ?? null,
    color:      d['color'] ?? '#6366f1',
    initials:   d['initials'] ?? null,
    created_at: d['createdAt'],
    updated_at: d['updatedAt'] ?? d['createdAt'],
  }),
  projects: (d) => ({
    id:          d['id'],
    name:        d['name'],
    prefix:      d['prefix'],
    description: d['description'] ?? '',
    color:       d['color'] ?? null,
    created_at:  d['createdAt'],
    updated_at:  d['updatedAt'] ?? d['createdAt'],
  }),
  taskTemplates: (d) => ({
    id:          d['id'],
    name:        d['name'],
    description: d['description'] ?? null,
    priority:    d['priority'] ?? null,
    label_ids:   d['labelIds'] ?? [],
    person_ids:  d['personIds'] ?? [],
    subtasks:    d['subtasks'] ?? [],
    created_at:  d['createdAt'],
  }),
};

function toSnakeCase(table: string, data: Row): Row {
  return MAPPERS[table] ? MAPPERS[table](data) : data;
}

/** Mapeo de nombres de store IndexedDB → nombre real de tabla en Supabase. */
const TABLE_NAMES: Record<string, string> = {
  taskTemplates: 'task_templates',
};

function toTableName(store: string): string {
  return TABLE_NAMES[store] ?? store;
}

// ── Cola offline ────────────────────────────────────────────────────────────

interface QueuedOp {
  id: string;
  table: string;
  type: 'upsert' | 'delete';
  payload: unknown;
  createdAt: string;
}

const QUEUE_KEY = 'dojo_sync_queue';

function loadQueue(): QueuedOp[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedOp[]; }
  catch { return []; }
}

function saveQueue(q: QueuedOp[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function enqueue(op: Omit<QueuedOp, 'id' | 'createdAt'>): void {
  const q = loadQueue();
  q.push({ ...op, id: generateUUID(), createdAt: new Date().toISOString() });
  saveQueue(q);
}

function dequeue(id: string): void {
  saveQueue(loadQueue().filter(op => op.id !== id));
}

// ── Flush al recuperar conexión ─────────────────────────────────────────────

async function flushQueue(): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !navigator.onLine) return;
  const queue = loadQueue();
  if (!queue.length) return;
  for (const op of queue) {
    try {
      if (op.type === 'upsert') {
        await client.upsert(op.table, op.payload as Row);
      } else {
        await client.delete(op.table, { id: `eq.${(op.payload as Row)['id']}` });
      }
      dequeue(op.id);
    } catch { /* mantener en cola */ }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void flushQueue(); });
}

// ── API pública ─────────────────────────────────────────────────────────────

/**
 * Replica un upsert en Supabase de forma asíncrona (fire-and-forget).
 * Convierte camelCase → snake_case e inyecta user_id para RLS.
 */
export function syncUpsert(table: string, payload: unknown): void {
  const client = getSupabaseClient();
  if (!client) {
    console.debug(`[Sync] No hay cliente Supabase configurado — skip '${table}'`);
    return;
  }

  const userId = client.currentUserId;
  if (!userId) {
    console.warn(`[Sync] Sin sesión activa (currentUserId=null) — no se sincroniza '${table}'`);
    console.debug('[Sync] session:', client.session);
    return;
  }

  const row: Row = { ...toSnakeCase(table, payload as Row), user_id: userId };
  const supaTable = toTableName(table);
  console.debug(`[Sync] → upsert '${supaTable}'`, row);

  if (!navigator.onLine) {
    enqueue({ table: supaTable, type: 'upsert', payload: row });
    console.warn(`[Sync] Sin conexión — encolado '${supaTable}'`);
    return;
  }

  void (async () => {
    try {
      await client.upsert(supaTable, row);
      console.info(`[Sync] ✓ upsert '${supaTable}' id=${String(row['id'])}`);
    } catch (err) {
      console.error(`[Sync] ✗ upsert '${supaTable}' falló:`, err);
      enqueue({ table: supaTable, type: 'upsert', payload: row });
    }
  })();
}

/**
 * Replica un delete en Supabase de forma asíncrona (fire-and-forget).
 */
export function syncDelete(table: string, id: string): void {
  const client = getSupabaseClient();
  if (!client || !client.currentUserId) return;

  const supaTable = toTableName(table);

  if (!navigator.onLine) {
    enqueue({ table: supaTable, type: 'delete', payload: { id } });
    return;
  }

  void (async () => {
    try {
      await client.delete(supaTable, { id: `eq.${id}` });
      console.debug(`[Sync] ✓ delete '${supaTable}' id=${id}`);
    } catch (err) {
      console.warn(`[Sync] delete '${supaTable}' id=${id} falló, encolando:`, err);
      enqueue({ table: supaTable, type: 'delete', payload: { id } });
    }
  })();
}

// ── Sincronización inicial completa ─────────────────────────────────────────

/**
 * Sube todos los datos locales (IndexedDB) a Supabase respetando el orden
 * de claves foráneas: boards → projects → columns → labels → persons → tasks.
 *
 * Debe llamarse una sola vez después de que el usuario inicia sesión.
 * Es idempotente gracias al upsert con merge-duplicates.
 */
export async function syncAllLocalToSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !client.isAuthenticated) return;

  const userId = client.currentUserId!;

  console.info('[Sync] Iniciando sincronización inicial de datos locales → Supabase...');

  try {
    // Importar repositorios locales dinámicamente para evitar dependencias circulares
    const { getAllBoards }     = await import('./board.repository.js');
    const { getAllProjects }   = await import('./project.repository.js');
    const { getAllColumns }    = await import('./column.repository.js');
    const { getAllLabels }     = await import('./label.repository.js');
    const { getAllPersons }    = await import('./person.repository.js');
    const { getAllTasks }      = await import('./task.repository.js');
    const { getAllTemplates }  = await import('./template.repository.js');

    const upsertAll = async (store: string, items: unknown[]) => {
      if (!items.length) return;
      const supaTable = toTableName(store);
      const rows = items.map(item =>
        ({ ...toSnakeCase(store, item as Row), user_id: userId })
      );
      // Supabase permite hasta 1000 filas por request
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        await client.upsert(supaTable, rows.slice(i, i + CHUNK));
      }
      console.info(`[Sync] ✓ ${rows.length} registros subidos a '${supaTable}'`);
    };

    // Respetar orden de FK: boards/projects primero, tasks al final
    await upsertAll('boards',         await getAllBoards());
    await upsertAll('projects',       await getAllProjects());
    await upsertAll('columns',        await getAllColumns());
    await upsertAll('labels',         await getAllLabels());
    await upsertAll('persons',        await getAllPersons());
    await upsertAll('tasks',          await getAllTasks());
    await upsertAll('taskTemplates',  await getAllTemplates());

    console.info('[Sync] ✓ Sincronización inicial completada.');
  } catch (err) {
    console.error('[Sync] Error en sincronización inicial:', err);
  }
}

