/**
 * Offline Queue Manager
 *
 * Queues calculations and actions when offline, processes them when back online.
 * Uses IndexedDB for persistent storage to survive page refreshes.
 */

import type { PlanConfig } from '@/types/plan-config';

// Queue item types
export type QueueItemType = 'calculation' | 'scenario-save' | 'action';

export interface QueuedCalculation {
  id: string;
  type: 'calculation';
  config: PlanConfig;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
  error?: string;
}

export interface QueuedScenarioSave {
  id: string;
  type: 'scenario-save';
  scenarioId: string;
  name: string;
  config: PlanConfig;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
  error?: string;
}

export interface QueuedAction {
  id: string;
  type: 'action';
  /** Action identifier for re-executing when back online */
  actionId: string;
  /** Optional action data (must be JSON-serializable) */
  actionData?: Record<string, unknown>;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
  error?: string;
}

export type QueueItem = QueuedCalculation | QueuedScenarioSave | QueuedAction;

// Distributive Omit that works correctly with union types
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;
export type QueueItemInput = DistributiveOmit<QueueItem, 'id' | 'retries' | 'status'>;

// Constants
const DB_NAME = 'retirement-calc-offline';
const DB_VERSION = 1;
const STORE_NAME = 'offline-queue';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Event types
type QueueEventType = 'itemAdded' | 'itemRemoved' | 'itemProcessed' | 'queueCleared' | 'syncStarted' | 'syncCompleted';
type QueueEventListener = (event: { type: QueueEventType; item?: QueueItem; queueLength: number }) => void;

/**
 * Offline Queue Manager Class
 */
class OfflineQueueManager {
  private db: IDBDatabase | null = null;
  private isProcessing = false;
  private listeners: Set<QueueEventListener> = new Set();

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineQueue] IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  /**
   * Add item to queue
   */
  async addItem(item: QueueItemInput): Promise<string> {
    await this.init();

    const queueItem: QueueItem = {
      ...item,
      id: `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      retries: 0,
      status: 'pending',
    } as QueueItem;

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(queueItem);

      request.onsuccess = async () => {
        console.log('[OfflineQueue] Item added:', queueItem.id);
        const length = await this.getQueueLength();
        this.emit({ type: 'itemAdded', item: queueItem, queueLength: length });
        resolve(queueItem.id);
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to add item:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Add a calculation to the queue
   */
  async queueCalculation(config: PlanConfig): Promise<string> {
    return this.addItem({
      type: 'calculation',
      config,
      timestamp: Date.now(),
    } as Omit<QueuedCalculation, 'id' | 'retries' | 'status'>);
  }

  /**
   * Add a scenario save to the queue
   */
  async queueScenarioSave(scenarioId: string, name: string, config: PlanConfig): Promise<string> {
    return this.addItem({
      type: 'scenario-save',
      scenarioId,
      name,
      config,
      timestamp: Date.now(),
    } as Omit<QueuedScenarioSave, 'id' | 'retries' | 'status'>);
  }

  /**
   * Get all items in queue
   */
  async getItems(): Promise<QueueItem[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get pending items sorted by timestamp
   */
  async getPendingItems(): Promise<QueueItem[]> {
    const items = await this.getItems();
    return items
      .filter((item) => item.status === 'pending')
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get queue length
   */
  async getQueueLength(): Promise<number> {
    const items = await this.getPendingItems();
    return items.length;
  }

  /**
   * Remove item from queue
   */
  async removeItem(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = async () => {
        console.log('[OfflineQueue] Item removed:', id);
        const length = await this.getQueueLength();
        this.emit({ type: 'itemRemoved', queueLength: length });
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Update item status
   */
  async updateItem(id: string, updates: Partial<QueueItem>): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          reject(new Error(`Item ${id} not found`));
          return;
        }

        const updatedItem = { ...getRequest.result, ...updates };
        const putRequest = store.put(updatedItem);

        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Process all pending items in queue
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      console.log('[OfflineQueue] Already processing');
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    const queueLength = await this.getQueueLength();
    this.emit({ type: 'syncStarted', queueLength });

    let processed = 0;
    let failed = 0;

    try {
      const items = await this.getPendingItems();

      for (const item of items) {
        try {
          await this.processItem(item);
          await this.removeItem(item.id);
          processed++;

          const length = await this.getQueueLength();
          this.emit({ type: 'itemProcessed', item, queueLength: length });
        } catch (error) {
          console.error('[OfflineQueue] Failed to process item:', item.id, error);

          if (item.retries >= MAX_RETRIES) {
            // Mark as failed after max retries
            await this.updateItem(item.id, {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            failed++;
          } else {
            // Increment retry count
            await this.updateItem(item.id, {
              retries: item.retries + 1,
            });

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (item.retries + 1)));
          }
        }
      }
    } finally {
      this.isProcessing = false;
      const length = await this.getQueueLength();
      this.emit({ type: 'syncCompleted', queueLength: length });
    }

    return { processed, failed };
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: QueueItem): Promise<void> {
    await this.updateItem(item.id, { status: 'processing' });

    switch (item.type) {
      case 'calculation':
        // Calculations are handled locally by the Monte Carlo worker
        // No network request needed - just mark as processed
        console.log('[OfflineQueue] Calculation processed locally:', item.id);
        break;

      case 'scenario-save':
        // Scenarios are saved to localStorage - also local
        const { saveScenario } = await import('@/lib/scenarioManager');
        saveScenario(item.config, item.name, undefined, item.scenarioId);
        console.log('[OfflineQueue] Scenario saved:', item.scenarioId);
        break;

      case 'action':
        // Action items are processed based on their actionId
        // Actions with callbacks cannot be stored in IndexedDB,
        // so we use actionId to identify what action to take
        console.log('[OfflineQueue] Action queued:', item.actionId, item.actionData);
        // Actions are typically handled by the UI layer when it detects
        // the sync completion event
        break;

      default:
        console.warn('[OfflineQueue] Unknown item type:', (item as QueueItem).type);
    }
  }

  /**
   * Clear all items from queue
   */
  async clearQueue(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[OfflineQueue] Queue cleared');
        this.emit({ type: 'queueCleared', queueLength: 0 });
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get failed items for retry or user notification
   */
  async getFailedItems(): Promise<QueueItem[]> {
    const items = await this.getItems();
    return items.filter((item) => item.status === 'failed');
  }

  /**
   * Retry all failed items
   */
  async retryFailed(): Promise<void> {
    const failedItems = await this.getFailedItems();

    for (const item of failedItems) {
      await this.updateItem(item.id, {
        status: 'pending',
        retries: 0,
        error: undefined,
      });
    }

    await this.processQueue();
  }

  /**
   * Subscribe to queue events
   */
  subscribe(listener: QueueEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: { type: QueueEventType; item?: QueueItem; queueLength: number }): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[OfflineQueue] Listener error:', error);
      }
    });
  }

  /**
   * Check if currently processing
   */
  getIsProcessing(): boolean {
    return this.isProcessing;
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueueManager();

/**
 * Initialize queue and set up online/offline listeners
 */
export async function initOfflineQueue(): Promise<void> {
  if (typeof window === 'undefined') return;

  await offlineQueue.init();

  // Process queue when coming back online
  window.addEventListener('online', async () => {
    console.log('[OfflineQueue] Back online - processing queue');
    await offlineQueue.processQueue();
  });

  // Listen for service worker sync messages
  navigator.serviceWorker?.addEventListener('message', async (event) => {
    if (event.data?.type === 'SYNC_QUEUED_CALCULATIONS') {
      await offlineQueue.processQueue();
    }
  });

  // Initial check - process any pending items if online
  if (navigator.onLine) {
    const pending = await offlineQueue.getPendingItems();
    if (pending.length > 0) {
      console.log('[OfflineQueue] Found pending items, processing...');
      await offlineQueue.processQueue();
    }
  }
}

export default offlineQueue;
