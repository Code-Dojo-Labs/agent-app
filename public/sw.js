// sw.js — Dojo Kanban Service Worker
// Estrategia: Cache First con Network Fallback (US-31 PWA)
// https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

const CACHE_VERSION = 'v1';
const CACHE_NAME = `dojo-kanban-${CACHE_VERSION}`;

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
  );
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
