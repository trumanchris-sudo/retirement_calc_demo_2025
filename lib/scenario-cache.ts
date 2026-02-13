/**
 * Scenario Cache Manager
 *
 * Caches recent scenarios locally using IndexedDB for offline access.
 * Integrates with the service worker for persistent storage.
 */

import type { PlanConfig } from '@/types/plan-config';
import type { SavedScenario } from '@/lib/scenarioManager';

// Constants
const DB_NAME = 'retirement-calc-cache';
const DB_VERSION = 1;
const SCENARIO_STORE = 'cached-scenarios';
const RESULT_STORE = 'cached-results';
const MAX_CACHED_SCENARIOS = 10;
const MAX_CACHED_RESULTS = 20;
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Cached calculation result
 */
export interface CachedResult {
  id: string;
  configHash: string;
  config: PlanConfig;
  result: unknown; // The calculation result
  timestamp: number;
  expiresAt: number;
}

/**
 * Scenario cache entry
 */
export interface CachedScenario extends SavedScenario {
  cachedAt: number;
  lastAccessed: number;
}

/**
 * Scenario Cache Manager Class
 */
class ScenarioCacheManager {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[ScenarioCache] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[ScenarioCache] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Scenario store
        if (!db.objectStoreNames.contains(SCENARIO_STORE)) {
          const scenarioStore = db.createObjectStore(SCENARIO_STORE, { keyPath: 'id' });
          scenarioStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          scenarioStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Result store
        if (!db.objectStoreNames.contains(RESULT_STORE)) {
          const resultStore = db.createObjectStore(RESULT_STORE, { keyPath: 'id' });
          resultStore.createIndex('configHash', 'configHash', { unique: false });
          resultStore.createIndex('timestamp', 'timestamp', { unique: false });
          resultStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };
    });
  }

  /**
   * Generate a hash for a config object (for result caching)
   */
  private generateConfigHash(config: PlanConfig): string {
    // Create a deterministic hash from key config values
    const keyFields = [
      config.age1,
      config.age2,
      config.marital,
      config.retirementAge,
      config.primaryIncome,
      config.spouseIncome,
      config.taxableBalance,
      config.pretaxBalance,
      config.rothBalance,
      config.cTax1,
      config.cPre1,
      config.cPost1,
      config.retRate,
      config.inflationRate,
      config.wdRate,
      config.returnMode,
      config.seed,
    ].join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < keyFields.length; i++) {
      const char = keyFields.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Cache a scenario for offline access
   */
  async cacheScenario(scenario: SavedScenario): Promise<void> {
    await this.init();

    const cachedScenario: CachedScenario = {
      ...scenario,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([SCENARIO_STORE], 'readwrite');
      const store = transaction.objectStore(SCENARIO_STORE);
      const request = store.put(cachedScenario);

      request.onsuccess = async () => {
        console.log('[ScenarioCache] Scenario cached:', scenario.id);
        await this.trimScenarioCache();
        resolve();
      };

      request.onerror = () => {
        console.error('[ScenarioCache] Failed to cache scenario:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a cached scenario
   */
  async getCachedScenario(id: string): Promise<CachedScenario | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([SCENARIO_STORE], 'readwrite');
      const store = transaction.objectStore(SCENARIO_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const scenario = request.result;
        if (scenario) {
          // Update last accessed time
          scenario.lastAccessed = Date.now();
          store.put(scenario);
        }
        resolve(scenario || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all cached scenarios
   */
  async getAllCachedScenarios(): Promise<CachedScenario[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([SCENARIO_STORE], 'readonly');
      const store = transaction.objectStore(SCENARIO_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const scenarios = request.result || [];
        // Sort by last accessed (most recent first)
        scenarios.sort((a, b) => b.lastAccessed - a.lastAccessed);
        resolve(scenarios);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Remove a cached scenario
   */
  async removeCachedScenario(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([SCENARIO_STORE], 'readwrite');
      const store = transaction.objectStore(SCENARIO_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[ScenarioCache] Scenario removed from cache:', id);
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Trim scenario cache to max size (LRU)
   */
  private async trimScenarioCache(): Promise<void> {
    const scenarios = await this.getAllCachedScenarios();

    if (scenarios.length > MAX_CACHED_SCENARIOS) {
      // Remove oldest accessed scenarios
      const toRemove = scenarios.slice(MAX_CACHED_SCENARIOS);
      for (const scenario of toRemove) {
        await this.removeCachedScenario(scenario.id);
      }
    }
  }

  /**
   * Cache a calculation result
   */
  async cacheResult(config: PlanConfig, result: unknown): Promise<void> {
    await this.init();

    const configHash = this.generateConfigHash(config);
    const now = Date.now();

    const cachedResult: CachedResult = {
      id: `result-${configHash}-${now}`,
      configHash,
      config,
      result,
      timestamp: now,
      expiresAt: now + CACHE_EXPIRY_MS,
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([RESULT_STORE], 'readwrite');
      const store = transaction.objectStore(RESULT_STORE);
      const request = store.put(cachedResult);

      request.onsuccess = async () => {
        console.log('[ScenarioCache] Result cached:', cachedResult.id);
        await this.trimResultCache();
        await this.cleanExpiredResults();
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get a cached result for a config
   */
  async getCachedResult(config: PlanConfig): Promise<unknown | null> {
    await this.init();

    const configHash = this.generateConfigHash(config);

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([RESULT_STORE], 'readonly');
      const store = transaction.objectStore(RESULT_STORE);
      const index = store.index('configHash');
      const request = index.getAll(configHash);

      request.onsuccess = () => {
        const results = request.result || [];
        const now = Date.now();

        // Find most recent non-expired result
        const validResult = results
          .filter((r) => r.expiresAt > now)
          .sort((a, b) => b.timestamp - a.timestamp)[0];

        if (validResult) {
          console.log('[ScenarioCache] Cache hit for config hash:', configHash);
          resolve(validResult.result);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Trim result cache to max size
   */
  private async trimResultCache(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([RESULT_STORE], 'readwrite');
      const store = transaction.objectStore(RESULT_STORE);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Newest first

      let count = 0;
      const toDelete: string[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          count++;
          if (count > MAX_CACHED_RESULTS) {
            toDelete.push(cursor.value.id);
          }
          cursor.continue();
        } else {
          // Delete excess items
          Promise.all(toDelete.map((id) => {
            return new Promise<void>((res) => {
              const deleteReq = store.delete(id);
              deleteReq.onsuccess = () => res();
              deleteReq.onerror = () => res();
            });
          })).then(() => resolve());
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clean expired results
   */
  private async cleanExpiredResults(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const now = Date.now();
      const transaction = this.db!.transaction([RESULT_STORE], 'readwrite');
      const store = transaction.objectStore(RESULT_STORE);
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          console.log('[ScenarioCache] Removing expired result:', cursor.value.id);
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([SCENARIO_STORE, RESULT_STORE], 'readwrite');

      transaction.objectStore(SCENARIO_STORE).clear();
      transaction.objectStore(RESULT_STORE).clear();

      transaction.oncomplete = () => {
        console.log('[ScenarioCache] All caches cleared');
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    scenarioCount: number;
    resultCount: number;
    totalSize: number;
  }> {
    await this.init();

    const scenarios = await this.getAllCachedScenarios();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([RESULT_STORE], 'readonly');
      const store = transaction.objectStore(RESULT_STORE);
      const request = store.count();

      request.onsuccess = () => {
        // Estimate size (rough calculation)
        const scenarioSize = JSON.stringify(scenarios).length;
        const estimatedResultSize = request.result * 5000; // ~5KB per result estimate

        resolve({
          scenarioCount: scenarios.length,
          resultCount: request.result,
          totalSize: scenarioSize + estimatedResultSize,
        });
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Sync scenarios from localStorage to cache
   * Call this when the app loads to ensure offline access
   */
  async syncFromLocalStorage(): Promise<void> {
    try {
      const { getAllScenarios } = await import('@/lib/scenarioManager');
      const scenarios = getAllScenarios();

      for (const scenario of scenarios.slice(0, MAX_CACHED_SCENARIOS)) {
        await this.cacheScenario(scenario);
      }

      console.log(`[ScenarioCache] Synced ${scenarios.length} scenarios from localStorage`);
    } catch (error) {
      console.error('[ScenarioCache] Failed to sync from localStorage:', error);
    }
  }
}

// Singleton instance
export const scenarioCache = new ScenarioCacheManager();

/**
 * Initialize scenario cache
 */
export async function initScenarioCache(): Promise<void> {
  if (typeof window === 'undefined') return;

  await scenarioCache.init();
  await scenarioCache.syncFromLocalStorage();

  // Notify service worker about cached scenarios
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    const scenarios = await scenarioCache.getAllCachedScenarios();
    scenarios.forEach((scenario) => {
      navigator.serviceWorker.controller?.postMessage({
        type: 'CACHE_SCENARIO',
        payload: scenario,
      });
    });
  }
}

export default scenarioCache;
