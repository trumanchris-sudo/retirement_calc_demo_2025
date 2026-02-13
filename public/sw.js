"use strict";
(() => {
  // lib/service-worker.ts
  var CACHE_VERSION = "v1";
  var STATIC_CACHE = `retirement-calc-static-${CACHE_VERSION}`;
  var CALCULATION_CACHE = `retirement-calc-calculations-${CACHE_VERSION}`;
  var SCENARIO_CACHE = `retirement-calc-scenarios-${CACHE_VERSION}`;
  var PRECACHE_ASSETS = [
    "/",
    "/monte-carlo-worker.js"
    // Add other critical static assets as needed
  ];
  var CACHEABLE_API_PATTERNS = [
    /\/api\/wallet/
  ];
  var MAX_CALCULATION_CACHE_ITEMS = 50;
  var MAX_SCENARIO_CACHE_ITEMS = 20;
  self.addEventListener("install", (event) => {
    console.log("[ServiceWorker] Installing...");
    event.waitUntil(
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("[ServiceWorker] Precaching static assets");
        return cache.addAll(PRECACHE_ASSETS);
      }).then(() => {
        console.log("[ServiceWorker] Install complete");
        return self.skipWaiting();
      }).catch((error) => {
        console.error("[ServiceWorker] Precache failed:", error);
      })
    );
  });
  self.addEventListener("activate", (event) => {
    console.log("[ServiceWorker] Activating...");
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.filter((cacheName) => {
            return cacheName.startsWith("retirement-calc-") && !cacheName.endsWith(CACHE_VERSION);
          }).map((cacheName) => {
            console.log("[ServiceWorker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log("[ServiceWorker] Claiming clients");
        return self.clients.claim();
      })
    );
  });
  self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== "GET") {
      return;
    }
    if (!url.protocol.startsWith("http")) {
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      event.respondWith(handleApiRequest(request));
      return;
    }
    if (isStaticAsset(url.pathname)) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }
    if (request.mode === "navigate") {
      event.respondWith(networkFirst(request, STATIC_CACHE));
      return;
    }
    event.respondWith(networkFirst(request, STATIC_CACHE));
  });
  function isStaticAsset(pathname) {
    return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(pathname);
  }
  async function cacheFirst(request, cacheName) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      updateCacheInBackground(request, cacheName);
      return cachedResponse;
    }
    return fetchAndCache(request, cacheName);
  }
  async function networkFirst(request, cacheName) {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      if (request.mode === "navigate") {
        return createOfflineResponse();
      }
      throw error;
    }
  }
  async function handleApiRequest(request) {
    const url = new URL(request.url);
    const isCacheable = CACHEABLE_API_PATTERNS.some((pattern) => pattern.test(url.pathname));
    if (!isCacheable) {
      return fetch(request);
    }
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(CALCULATION_CACHE);
        cache.put(request, networkResponse.clone());
        trimCache(CALCULATION_CACHE, MAX_CALCULATION_CACHE_ITEMS);
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log("[ServiceWorker] Serving cached API response");
        return cachedResponse;
      }
      return new Response(
        JSON.stringify({
          error: "offline",
          message: "You are offline. This request has been queued and will be processed when you reconnect."
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
  async function fetchAndCache(request, cacheName) {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  }
  function updateCacheInBackground(request, cacheName) {
    fetch(request).then((response) => {
      if (response.ok) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, response);
        });
      }
    }).catch(() => {
    });
  }
  async function trimCache(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const deleteCount = keys.length - maxItems;
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(keys[i]);
      }
    }
  }
  function createOfflineResponse() {
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
      headers: { "Content-Type": "text/html" }
    });
  }
  self.addEventListener("message", (event) => {
    const { type, payload } = event.data || {};
    switch (type) {
      case "SKIP_WAITING":
        self.skipWaiting();
        break;
      case "CACHE_SCENARIO":
        cacheScenario(payload);
        break;
      case "GET_CACHED_SCENARIOS":
        getCachedScenarios().then((scenarios) => {
          event.ports[0]?.postMessage({ type: "CACHED_SCENARIOS", scenarios });
        });
        break;
      case "CLEAR_CALCULATION_CACHE":
        caches.delete(CALCULATION_CACHE);
        break;
      case "GET_CACHE_STATUS":
        getCacheStatus().then((status) => {
          event.ports[0]?.postMessage({ type: "CACHE_STATUS", status });
        });
        break;
    }
  });
  async function cacheScenario(scenario) {
    const cache = await caches.open(SCENARIO_CACHE);
    const scenarioData = scenario;
    const key = new Request(`/scenarios/${scenarioData.id || "temp"}`);
    const response = new Response(JSON.stringify(scenario), {
      headers: { "Content-Type": "application/json" }
    });
    await cache.put(key, response);
    await trimCache(SCENARIO_CACHE, MAX_SCENARIO_CACHE_ITEMS);
  }
  async function getCachedScenarios() {
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
  async function getCacheStatus() {
    const [staticCache, calcCache, scenarioCache] = await Promise.all([
      caches.open(STATIC_CACHE).then((c) => c.keys()),
      caches.open(CALCULATION_CACHE).then((c) => c.keys()).catch(() => []),
      caches.open(SCENARIO_CACHE).then((c) => c.keys()).catch(() => [])
    ]);
    return {
      staticCount: staticCache.length,
      calculationCount: calcCache.length,
      scenarioCount: scenarioCache.length
    };
  }
  self.addEventListener("sync", (event) => {
    if (event.tag === "sync-calculations") {
      event.waitUntil(syncQueuedCalculations());
    }
  });
  async function syncQueuedCalculations() {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: "SYNC_QUEUED_CALCULATIONS" });
    });
  }
})();
