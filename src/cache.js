/**
 * ServiceWorkerProxy (CacheProxy)
 *
 * Provides a JavaScript-side interface for requesting assets through
 * the registered Service Worker's Cache API. All asset fetches are
 * routed through this proxy so that the execution engine remains
 * decoupled from the underlying caching strategy.
 */
class ServiceWorkerProxy {
  constructor() {
    this._cacheName = 'pyknowledge-v1';
    this._swRegistration = null;
  }

  /**
   * Register the Service Worker and store the registration reference.
   * Call once on application startup.
   * @returns {Promise<ServiceWorkerRegistration|null>}
   */
  async register() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[ServiceWorkerProxy] Service Workers are not supported in this browser.');
      return null;
    }
    try {
      this._swRegistration = await navigator.serviceWorker.register('/service-worker.js');
      console.info('[ServiceWorkerProxy] Service Worker registered:', this._swRegistration.scope);
      return this._swRegistration;
    } catch (err) {
      console.error('[ServiceWorkerProxy] Registration failed:', err);
      return null;
    }
  }

  /**
   * Fetch an asset URL, attempting the Cache API first.
   * Falls back to a network request if the cache returns no match.
   * @param {string} url — the asset URL to retrieve
   * @returns {Promise<Response|null>}
   */
  async fetchAsset(url) {
    const cached = await this.matchCache(url);
    if (cached) {
      return cached;
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        await this._cacheResponse(url, response.clone());
      }
      return response;
    } catch (err) {
      console.error('[ServiceWorkerProxy] Network fetch failed for:', url, err);
      return null;
    }
  }

  /**
   * Check whether a URL is already stored in the Cache API.
   * @param {string} url
   * @returns {Promise<Response|undefined>}
   */
  async matchCache(url) {
    try {
      const cache = await caches.open(this._cacheName);
      return await cache.match(url);
    } catch {
      return undefined;
    }
  }

  /**
   * Pre-cache a list of asset URLs (used during Service Worker install).
   * @param {string[]} urls
   * @returns {Promise<void>}
   */
  async precacheAssets(urls) {
    try {
      const cache = await caches.open(this._cacheName);
      await cache.addAll(urls);
      console.info('[ServiceWorkerProxy] Pre-cached', urls.length, 'assets.');
    } catch (err) {
      console.error('[ServiceWorkerProxy] Pre-cache failed:', err);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  async _cacheResponse(url, response) {
    try {
      const cache = await caches.open(this._cacheName);
      await cache.put(url, response);
    } catch {
      // Non-critical: silently ignore cache write failures
    }
  }
}
