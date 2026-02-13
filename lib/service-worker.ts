/**
 * Service Worker for Retirement Calculator
 *
 * Provides offline support for financial planning:
 * - Caches static assets (JS, CSS, images)
 * - Caches calculation results
 * - Enables offline scenario planning
 * - Queues sync requests for when back online
 *
 * "Financial planning should work anywhere, even on a plane!"
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// SyncEvent type for background sync API (not in standard TS lib types)
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

// Cache names with version for easy invalidation
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `retirement-calc-static-${CACHE_VERSION}`;
const CALCULATION_CACHE = `retirement-calc-calculations-${CACHE_VERSION}`;
const SCENARIO_CACHE = `retirement-calc-scenarios-${CACHE_VERSION}`;

// Static assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/monte-carlo-worker.js',
  // Add other critical static assets as needed
];

// API routes that can be cached
const CACHEABLE_API_PATTERNS = [
  /\/api\/wallet/,
];

// Maximum items in each cache
const MAX_CALCULATION_CACHE_ITEMS = 50;
const MAX_SCENARIO_CACHE_ITEMS = 20;

/**
 * Install event - precache static assets
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Install complete');
        // Activate immediately without waiting
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Precache failed:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old version caches
              return cacheName.startsWith('retirement-calc-') &&
                     !cacheName.endsWith(CACHE_VERSION);
            })
            .map((cacheName) => {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Claiming clients');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - serve from cache, fallback to network
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (they'll be queued separately)
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Handle navigation requests (pages) with network-first
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  // Default: network-first for other requests
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

/**
 * Check if pathname is a static asset
 */
function isStaticAsset(pathname: string): boolean {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(pathname);
}

/**
 * Cache-first strategy: try cache, then network
 */
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached response, but update cache in background
    updateCacheInBackground(request, cacheName);
    return cachedResponse;
  }

  return fetchAndCache(request, cacheName);
}

/**
 * Network-first strategy: try network, then cache
 */
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return createOfflineResponse();
    }

    throw error;
  }
}

/**
 * Handle API requests with caching
 */
async function handleApiRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Check if this API route is cacheable
  const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));

  if (!isCacheable) {
    return fetch(request);
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CALCULATION_CACHE);
      cache.put(request, networkResponse.clone());

      // Trim cache if too large
      trimCache(CALCULATION_CACHE, MAX_CALCULATION_CACHE_ITEMS);
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log('[ServiceWorker] Serving cached API response');
      return cachedResponse;
    }

    // Return offline error response
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'You are offline. This request has been queued and will be processed when you reconnect.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Fetch and cache a request
 */
async function fetchAndCache(request: Request, cacheName: string): Promise<Response> {
  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }

  return response;
}

/**
 * Update cache in background (stale-while-revalidate)
 */
function updateCacheInBackground(request: Request, cacheName: string): void {
  fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, response);
        });
      }
    })
    .catch(() => {
      // Silently fail - we already have a cached version
    });
}

/**
 * Trim cache to maximum items (LRU-style: delete oldest)
 */
async function trimCache(cacheName: string, maxItems: number): Promise<void> {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    // Delete oldest items (first in the list)
    const deleteCount = keys.length - maxItems;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

/**
 * Create offline fallback response
 */
function createOfflineResponse(): Response {
  const offlineHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Retirement Calculator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #000;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 500px;
      text-align: center;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #00FF7F;
    }
    p {
      color: #888;
      margin-bottom: 1.5rem;
      line-height: 1.6;
    }
    .features {
      text-align: left;
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .features h2 {
      font-size: 0.875rem;
      color: #00FF7F;
      margin-bottom: 1rem;
    }
    .features ul {
      list-style: none;
    }
    .features li {
      padding: 0.5rem 0;
      color: #ccc;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .features li::before {
      content: "\\2713";
      color: #00FF7F;
    }
    button {
      background: #00FF7F;
      color: #000;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#9992;</div>
    <h1>You're Offline</h1>
    <p>
      No worries! Financial planning works anywhere, even on a plane.
      Your cached scenarios and calculations are still available.
    </p>
    <div class="features">
      <h2>AVAILABLE OFFLINE</h2>
      <ul>
        <li>View saved scenarios</li>
        <li>Run local calculations</li>
        <li>Modify retirement parameters</li>
        <li>Review past projections</li>
      </ul>
    </div>
    <p style="font-size: 0.875rem;">
      Any changes will sync automatically when you reconnect.
    </p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>
  `;

  return new Response(offlineHTML, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * Message handler for communication with main thread
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CACHE_SCENARIO':
      cacheScenario(payload);
      break;

    case 'GET_CACHED_SCENARIOS':
      getCachedScenarios().then((scenarios) => {
        event.ports[0]?.postMessage({ type: 'CACHED_SCENARIOS', scenarios });
      });
      break;

    case 'CLEAR_CALCULATION_CACHE':
      caches.delete(CALCULATION_CACHE);
      break;

    case 'GET_CACHE_STATUS':
      getCacheStatus().then((status) => {
        event.ports[0]?.postMessage({ type: 'CACHE_STATUS', status });
      });
      break;
  }
});

/**
 * Cache a scenario for offline access
 */
async function cacheScenario(scenario: unknown): Promise<void> {
  const cache = await caches.open(SCENARIO_CACHE);
  const scenarioData = scenario as { id?: string };
  const key = new Request(`/scenarios/${scenarioData.id || 'temp'}`);
  const response = new Response(JSON.stringify(scenario), {
    headers: { 'Content-Type': 'application/json' },
  });

  await cache.put(key, response);
  await trimCache(SCENARIO_CACHE, MAX_SCENARIO_CACHE_ITEMS);
}

/**
 * Get all cached scenarios
 */
async function getCachedScenarios(): Promise<unknown[]> {
  const cache = await caches.open(SCENARIO_CACHE);
  const keys = await cache.keys();

  const scenarios = await Promise.all(
    keys.map(async (key) => {
      const response = await cache.match(key);
      if (response) {
        return response.json();
      }
      return null;
    })
  );

  return scenarios.filter(Boolean);
}

/**
 * Get cache status for debugging/UI
 */
async function getCacheStatus(): Promise<{
  staticCount: number;
  calculationCount: number;
  scenarioCount: number;
}> {
  const [staticCache, calcCache, scenarioCache] = await Promise.all([
    caches.open(STATIC_CACHE).then(c => c.keys()),
    caches.open(CALCULATION_CACHE).then(c => c.keys()).catch(() => []),
    caches.open(SCENARIO_CACHE).then(c => c.keys()).catch(() => []),
  ]);

  return {
    staticCount: staticCache.length,
    calculationCount: calcCache.length,
    scenarioCount: scenarioCache.length,
  };
}

// Sync event for background sync (when supported).
// The Background Sync API 'sync' event isn't in standard TS lib types,
// so we use the generic string overload with a properly typed handler.
self.addEventListener('sync', ((event: SyncEvent) => {
  if (event.tag === 'sync-calculations') {
    event.waitUntil(syncQueuedCalculations());
  }
}) as EventListener);

/**
 * Sync queued calculations when back online
 */
async function syncQueuedCalculations(): Promise<void> {
  // This will be handled by the offline queue in lib/offline-queue.ts
  // The service worker just triggers the sync event
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_QUEUED_CALCULATIONS' });
  });
}

export {};
