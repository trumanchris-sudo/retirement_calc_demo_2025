'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { offlineQueue, initOfflineQueue, type QueueItem } from '@/lib/offline-queue';
import { initScenarioCache } from '@/lib/scenario-cache';

/**
 * Offline State Hook
 *
 * Provides reactive offline/online state and utilities.
 */

// Global state for server-side rendering fallback
let serverSnapshot = true; // Assume online for SSR

/**
 * Subscribe to online/offline events
 */
function subscribeOnline(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);

  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/**
 * Get current online state
 */
function getOnlineSnapshot(): boolean {
  return navigator.onLine;
}

/**
 * Get server snapshot (for SSR)
 */
function getServerSnapshot(): boolean {
  return serverSnapshot;
}

/**
 * Hook for detecting online/offline status
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerSnapshot
  );
}

/**
 * Extended offline state with history
 */
interface OfflineState {
  /** Currently offline */
  isOffline: boolean;
  /** Currently reconnecting (was offline, now online, syncing) */
  isReconnecting: boolean;
  /** Was offline at some point this session */
  wasOffline: boolean;
  /** Time when went offline (null if online) */
  offlineSince: number | null;
  /** Time spent offline this session (ms) */
  totalOfflineTime: number;
}

/**
 * Hook for comprehensive offline state
 */
export function useOffline(): OfflineState {
  const isOnline = useOnlineStatus();
  const [state, setState] = useState<OfflineState>({
    isOffline: false,
    isReconnecting: false,
    wasOffline: false,
    offlineSince: null,
    totalOfflineTime: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setState((prev) => {
      const isOffline = !isOnline;

      if (isOffline && !prev.isOffline) {
        // Just went offline
        return {
          ...prev,
          isOffline: true,
          isReconnecting: false,
          wasOffline: true,
          offlineSince: Date.now(),
        };
      } else if (!isOffline && prev.isOffline) {
        // Just came back online
        const offlineTime = prev.offlineSince
          ? Date.now() - prev.offlineSince
          : 0;

        return {
          ...prev,
          isOffline: false,
          isReconnecting: true,
          offlineSince: null,
          totalOfflineTime: prev.totalOfflineTime + offlineTime,
        };
      }

      return prev;
    });
  }, [isOnline]);

  // Clear reconnecting state after a delay
  useEffect(() => {
    if (state.isReconnecting) {
      const timer = setTimeout(() => {
        setState((prev) => ({ ...prev, isReconnecting: false }));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [state.isReconnecting]);

  return state;
}

/**
 * Offline queue state
 */
interface OfflineQueueState {
  /** Number of items in queue */
  queueLength: number;
  /** Currently syncing queued items */
  isSyncing: boolean;
  /** Last sync timestamp */
  lastSyncTime: number | null;
  /** Add item to queue */
  addToQueue: (item: Omit<QueueItem, 'id' | 'retries' | 'status'>) => Promise<string>;
  /** Process queue manually */
  processQueue: () => Promise<void>;
  /** Clear the queue */
  clearQueue: () => Promise<void>;
}

/**
 * Hook for offline queue management
 */
export function useOfflineQueue(): OfflineQueueState {
  const [queueLength, setQueueLength] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize queue and subscribe to events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mounted = true;

    async function init() {
      await initOfflineQueue();

      if (!mounted) return;

      const length = await offlineQueue.getQueueLength();
      setQueueLength(length);
      setInitialized(true);

      // Subscribe to queue events
      const unsubscribe = offlineQueue.subscribe((event) => {
        if (!mounted) return;

        setQueueLength(event.queueLength);

        if (event.type === 'syncStarted') {
          setIsSyncing(true);
        } else if (event.type === 'syncCompleted') {
          setIsSyncing(false);
          setLastSyncTime(Date.now());
        }
      });

      return unsubscribe;
    }

    const cleanupPromise = init();

    return () => {
      mounted = false;
      cleanupPromise.then((unsubscribe) => unsubscribe?.());
    };
  }, []);

  const addToQueue = useCallback(
    async (item: Omit<QueueItem, 'id' | 'retries' | 'status'>): Promise<string> => {
      if (!initialized) await initOfflineQueue();
      return offlineQueue.addItem(item);
    },
    [initialized]
  );

  const processQueue = useCallback(async (): Promise<void> => {
    if (!initialized) return;
    await offlineQueue.processQueue();
  }, [initialized]);

  const clearQueue = useCallback(async (): Promise<void> => {
    if (!initialized) return;
    await offlineQueue.clearQueue();
  }, [initialized]);

  return {
    queueLength,
    isSyncing,
    lastSyncTime,
    addToQueue,
    processQueue,
    clearQueue,
  };
}

/**
 * Service worker registration state
 */
interface ServiceWorkerState {
  /** Service worker is supported */
  isSupported: boolean;
  /** Service worker is registered */
  isRegistered: boolean;
  /** Service worker is ready */
  isReady: boolean;
  /** Registration error */
  error: Error | null;
  /** Update available */
  updateAvailable: boolean;
  /** Skip waiting and activate new SW */
  skipWaiting: () => void;
}

/**
 * Hook for service worker management
 */
export function useServiceWorker(): ServiceWorkerState {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isReady: false,
    error: null,
    updateAvailable: false,
    skipWaiting: () => {},
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupported = 'serviceWorker' in navigator;
    setState((prev) => ({ ...prev, isSupported }));

    if (!isSupported) return;

    // Register service worker
    async function registerSW() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setState((prev) => ({
          ...prev,
          isRegistered: true,
          skipWaiting: () => {
            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
          },
        }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState((prev) => ({ ...prev, updateAvailable: true }));
            }
          });
        });

        // Wait for ready
        const ready = await navigator.serviceWorker.ready;
        if (ready) {
          setState((prev) => ({ ...prev, isReady: true }));
        }
      } catch (error) {
        console.error('[useServiceWorker] Registration failed:', error);
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error('Unknown error'),
        }));
      }
    }

    registerSW();

    // Handle controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Optionally reload the page when a new service worker takes over
      // window.location.reload();
    });
  }, []);

  return state;
}

/**
 * Hook for initializing all offline features
 */
export function useOfflineInit(): {
  isInitialized: boolean;
  error: Error | null;
} {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function init() {
      try {
        // Initialize offline queue
        await initOfflineQueue();

        // Initialize scenario cache
        await initScenarioCache();

        setIsInitialized(true);
        console.log('[useOfflineInit] Offline features initialized');
      } catch (err) {
        console.error('[useOfflineInit] Initialization failed:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    }

    init();
  }, []);

  return { isInitialized, error };
}

/**
 * Format offline duration for display
 */
export function formatOfflineDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export default useOffline;
