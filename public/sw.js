// sw.js — Dojo Kanban Service Worker
// Estrategia: Cache First con Network Fallback (US-31 PWA)
// https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

const CACHE_VERSION = 'v1';
const CACHE_NAME = `dojo-kanban-${CACHE_VERSION}`;
const NOTIFICATION_CACHE_NAME = 'dojo-task-notifications-v1';
const NOTIFICATION_TASKS_URL = new URL('./__dojo_notification_tasks__', self.location.origin).toString();
const NOTIFICATION_STATE_URL = new URL('./__dojo_notification_state__', self.location.origin).toString();

let notificationTimer = null;

// Assets esenciales a pre-cachear durante la instalación.
// Garantizan que la app cargue completamente sin conexión.
const PRECACHE_URLS = [
  './',
  './index.html',
  './main.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
];

function isNotifiableTask(task) {
  return task && typeof task.id === 'string'
    && typeof task.boardId === 'string'
    && typeof task.title === 'string'
    && typeof task.dueDate === 'string'
    && typeof task.statusName === 'string';
}

async function readNotificationJson(url, fallback) {
  const cache = await caches.open(NOTIFICATION_CACHE_NAME);
  const response = await cache.match(url);
  if (!response) return fallback;

  try {
    return await response.json();
  } catch {
    return fallback;
  }
}

async function writeNotificationJson(url, payload) {
  const cache = await caches.open(NOTIFICATION_CACHE_NAME);
  await cache.put(url, new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  }));
}

async function getStoredNotificationTasks() {
  const tasks = await readNotificationJson(NOTIFICATION_TASKS_URL, []);
  return Array.isArray(tasks) ? tasks.filter(isNotifiableTask) : [];
}

async function getStoredNotificationState() {
  const state = await readNotificationJson(NOTIFICATION_STATE_URL, { sent: {} });
  if (!state || typeof state !== 'object' || typeof state.sent !== 'object' || !state.sent) {
    return { sent: {} };
  }
  return state;
}

function getNotificationStageKeys(task) {
  const duePart = task.dueDate ? `:${task.dueDate}` : '';
  return [`${task.id}${duePart}:24h`, `${task.id}${duePart}:due`];
}

function pruneNotificationState(tasks, state) {
  const validKeys = new Set(tasks.flatMap(getNotificationStageKeys));
  const nextSent = {};

  for (const [key, value] of Object.entries(state.sent || {})) {
    if (validKeys.has(key)) nextSent[key] = value;
  }

  return { sent: nextSent };
}

function getPendingNotificationTriggers(tasks, state, now) {
  const pending = [];

  for (const task of tasks) {
    const dueAt = new Date(task.dueDate).getTime();
    if (Number.isNaN(dueAt)) continue;

    const reminderAt = dueAt - (24 * 60 * 60 * 1000);
    const [reminderKey, dueKey] = getNotificationStageKeys(task);

    if (!state.sent[reminderKey] && reminderAt > now) {
      pending.push(reminderAt);
    }

    if (!state.sent[dueKey] && dueAt > now) {
      pending.push(dueAt);
    }
  }

  return pending;
}

async function scheduleNotificationCheck() {
  if (notificationTimer) {
    clearTimeout(notificationTimer);
    notificationTimer = null;
  }

  const [tasks, state] = await Promise.all([
    getStoredNotificationTasks(),
    getStoredNotificationState(),
  ]);
  const pendingTriggers = getPendingNotificationTriggers(tasks, state, Date.now());
  if (pendingTriggers.length === 0) return;

  const nextTrigger = Math.min(...pendingTriggers);
  const MAX_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora máx para evitar overflow en setTimeout
  const delay = Math.min(Math.max(nextTrigger - Date.now(), 0), MAX_TIMEOUT_MS);

  notificationTimer = setTimeout(() => {
    notificationTimer = null;
    checkDueNotifications().catch((error) => {
      console.error('[SW] Error al comprobar notificaciones:', error);
    });
  }, delay);
}

function buildNotificationPayload(task, stage) {
  const isDue = stage === 'due';
  const title = isDue
    ? `Venció: ${task.title}`
    : `Vence pronto: ${task.title}`;
  const body = isDue
    ? `La tarea ya venció en ${task.statusName}.`
    : `La tarea vence en menos de 24 horas en ${task.statusName}.`;

  return {
    title,
    options: {
      body,
      tag: `dojo-task-${task.id}-${stage}`,
      renotify: false,
      data: {
        taskId: task.id,
        boardId: task.boardId,
      },
      actions: [
        { action: 'open-task', title: 'Abrir tarea' },
      ],
    },
  };
}

async function checkDueNotifications() {
  if (Notification.permission !== 'granted') return;

  const [tasks, rawState] = await Promise.all([
    getStoredNotificationTasks(),
    getStoredNotificationState(),
  ]);
  const state = pruneNotificationState(tasks, rawState);
  const now = Date.now();
  let stateChanged = false;

  for (const task of tasks) {
    const dueAt = new Date(task.dueDate).getTime();
    if (Number.isNaN(dueAt)) continue;

    const reminderAt = dueAt - (24 * 60 * 60 * 1000);
    const [reminderKey, dueKey] = getNotificationStageKeys(task);

    if (now < dueAt && now >= reminderAt && !state.sent[reminderKey]) {
      const payload = buildNotificationPayload(task, '24h');
      await self.registration.showNotification(payload.title, payload.options);
      state.sent[reminderKey] = now;
      stateChanged = true;
    }

    if (now >= dueAt && !state.sent[dueKey]) {
      const payload = buildNotificationPayload(task, 'due');
      await self.registration.showNotification(payload.title, payload.options);
      state.sent[dueKey] = now;
      stateChanged = true;
    }
  }

  if (stateChanged) {
    await writeNotificationJson(NOTIFICATION_STATE_URL, state);
  }

  await scheduleNotificationCheck();
}

async function syncNotificationTasks(tasks) {
  const normalizedTasks = Array.isArray(tasks) ? tasks.filter(isNotifiableTask) : [];
  const previousState = await getStoredNotificationState();
  const nextState = pruneNotificationState(normalizedTasks, previousState);

  await Promise.all([
    writeNotificationJson(NOTIFICATION_TASKS_URL, normalizedTasks),
    writeNotificationJson(NOTIFICATION_STATE_URL, nextState),
  ]);

  await checkDueNotifications();
}

// ── Install: pre-cachear assets esenciales ─────────────────────────────────
// Se ejecuta una sola vez al registrar el SW por primera vez.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: limpiar caches de versiones anteriores ──────────────────────
// Se ejecuta cuando el SW toma el control. Elimina caches obsoletas.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith('dojo-kanban-') && name !== CACHE_NAME
            )
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
      .then(() => scheduleNotificationCheck())
  );
});

self.addEventListener('message', (event) => {
  const { data } = event;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'dojo:notifications-sync') {
    event.waitUntil(syncNotificationTasks(data.tasks));
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'dojo-task-notifications') {
    event.waitUntil(checkDueNotifications());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const { taskId, boardId } = event.notification.data || {};
  if (!taskId || !boardId) return;

  const targetUrl = new URL('./', self.location.origin);
  targetUrl.searchParams.set('boardId', boardId);
  targetUrl.searchParams.set('taskId', taskId);

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        await client.navigate(targetUrl.toString());
        await client.focus();
        return;
      }
    }

    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl.toString());
    }
  })());
});

// ── Fetch: Cache First con Network Fallback ───────────────────────────────
// 1. Si el recurso está en caché → devolverlo inmediatamente (offline-ready).
// 2. Si no está en caché → buscarlo en la red y guardarlo para futuras visitas.
// Solo se interceptan requests GET del mismo origen para evitar
// interferir con peticiones cross-origin o no idempotentes.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Solo cachear respuestas exitosas de mismo origen (tipo 'basic').
        // Las respuestas opacas (cross-origin) no se cachean para evitar
        // almacenar errores silenciosos.
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }

        // Clonar la respuesta: el cuerpo de Response es un stream
        // que solo puede consumirse una vez.
        const responseToCache = networkResponse.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(event.request, responseToCache));

        return networkResponse;
      });
    })
  );
});
