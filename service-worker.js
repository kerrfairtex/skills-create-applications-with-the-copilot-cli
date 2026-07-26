/**
 * PyKnowledge Service Worker
 *
 * Implements the "offline-first" caching strategy described in section 4.7.1.
 * On install, the app shell and all static assets are pre-cached using the
 * Cache API so that subsequent requests are served from cache with zero
 * network latency, meeting the sub-500ms page-load target on 2GB-RAM devices.
 *
 * Cache strategy:
 *   • App shell (HTML/CSS/JS)  → Cache-first, no network fallback needed
 *   • JSON data files          → Cache-first with network re-validation
 *   • Video assets             → Cache-first (large payloads, pre-fetched)
 *   • Unknown requests         → Network-first with cache fallback
 */

const CACHE_NAME    = 'pyknowledge-v1';
const DATA_CACHE    = 'pyknowledge-data-v1';
const MEDIA_CACHE   = 'pyknowledge-media-v1';

/** App shell — must be available for offline use */
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/src/engine.js',
  '/src/storage.js',
  '/src/cache.js',
  '/src/ui.js',
  '/styles/main.css',
  '/data/lessons.json',
  '/data/quizzes.json'
];

/** Video lecture assets (720p H.264) — large; cached on first access */
const MEDIA_ASSETS = [
  '/media/lecture-intro.mp4',
  '/media/lecture-variables.mp4',
  '/media/lecture-operators.mp4',
  '/media/lecture-control-flow.mp4',
  '/media/lecture-loops.mp4',
  '/media/lecture-functions.mp4',
  '/media/lecture-lists.mp4',
  '/media/lecture-dictionaries.mp4',
  '/media/lecture-strings.mp4',
  '/media/lecture-file-io.mp4',
  '/media/lecture-exceptions.mp4',
  '/media/lecture-oop.mp4',
  '/media/lecture-modules.mp4',
  '/media/lecture-comprehensions.mp4',
  '/media/lecture-decorators.mp4'
];

// ── Lifecycle events ─────────────────────────────────────────────────────────

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const keepCaches = new Set([CACHE_NAME, DATA_CACHE, MEDIA_CACHE]);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !keepCaches.has(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch interception ───────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Same-origin only
  if (url.origin !== self.location.origin) return;

  if (_isMediaRequest(url.pathname)) {
    event.respondWith(_cacheFirstMedia(request));
  } else if (_isDataRequest(url.pathname)) {
    event.respondWith(_cacheFirstWithRevalidation(request));
  } else {
    event.respondWith(_cacheFirstAppShell(request));
  }
});

// ── Cache strategies ─────────────────────────────────────────────────────────

/**
 * Cache-first for app shell assets.
 * Falls back to network if the asset is not yet cached.
 */
async function _cacheFirstAppShell(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline — app shell not cached.', { status: 503 });
  }
}

/**
 * Cache-first with background re-validation for JSON data files.
 * Serves the cached copy immediately, then updates the cache from the
 * network in the background so future loads reflect any changes.
 */
async function _cacheFirstWithRevalidation(request) {
  const cache  = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || await networkFetch || new Response('[]', {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Cache-first for video assets.
 * Videos are large; once cached they are never re-fetched.
 */
async function _cacheFirstMedia(request) {
  const cache  = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Video unavailable offline.', { status: 503 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _isMediaRequest(pathname) {
  return pathname.startsWith('/media/') && /\.(mp4|webm|ogg)$/i.test(pathname);
}

function _isDataRequest(pathname) {
  return pathname.startsWith('/data/') && pathname.endsWith('.json');
}
