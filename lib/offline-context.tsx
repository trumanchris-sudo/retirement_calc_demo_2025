'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useOffline, useOfflineQueue, useServiceWorker, useOfflineInit } from '@/hooks/useOffline';

/**
 * Offline Context
 *
 * Provides offline state and utilities to the entire app.
 */

interface OfflineContextValue {
  // Connection state
  isOffline: boolean;
  isReconnecting: boolean;
  wasOffline: boolean;

  // Queue state
  queueLength: number;
  isSyncing: boolean;

  // Service worker state
  swReady: boolean;
  updateAvailable: boolean;
  skipWaiting: () => void;

  // Initialization state
  isInitialized: boolean;
  initError: Error | null;

  // Cache utilities
  cacheScenario: (scenario: unknown) => Promise<void>;
  getCacheStatus: () => Promise<{
    staticCount: number;
    calculationCount: number;
    scenarioCount: number;
  } | null>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

/**
 * Offline Provider Component
 */
export function OfflineProvider({ children }: { children: ReactNode }) {
  const offlineState = useOffline();
  const queueState = useOfflineQueue();
  const swState = useServiceWorker();
  const initState = useOfflineInit();
  const [cacheStatus, setCacheStatus] = useState<{
    staticCount: number;
    calculationCount: number;
    scenarioCount: number;
  } | null>(null);

  // Get cache status periodically when online
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!swState.isReady) return;

    async function updateCacheStatus() {
      try {
        const status = await getCacheStatusFromSW();
        setCacheStatus(status);
      } catch (error) {
        console.error('[OfflineProvider] Failed to get cache status:', error);
      }
    }

    updateCacheStatus();
    const interval = setInterval(updateCacheStatus, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [swState.isReady]);

  // Cache scenario via service worker
  const cacheScenario = async (scenario: unknown): Promise<void> => {
    if (!swState.isReady || !navigator.serviceWorker.controller) {
      console.warn('[OfflineProvider] Service worker not ready, cannot cache scenario');
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_SCENARIO',
      payload: scenario,
    });
  };

  // Get cache status from service worker
  const getCacheStatus = async (): Promise<{
    staticCount: number;
    calculationCount: number;
    scenarioCount: number;
  } | null> => {
    if (!swState.isReady || !navigator.serviceWorker.controller) {
      return cacheStatus;
    }

    return getCacheStatusFromSW();
  };

  const value: OfflineContextValue = {
    isOffline: offlineState.isOffline,
    isReconnecting: offlineState.isReconnecting,
    wasOffline: offlineState.wasOffline,
    queueLength: queueState.queueLength,
    isSyncing: queueState.isSyncing,
    swReady: swState.isReady,
    updateAvailable: swState.updateAvailable,
    skipWaiting: swState.skipWaiting,
    isInitialized: initState.isInitialized,
    initError: initState.error,
    cacheScenario,
    getCacheStatus,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

/**
 * Hook to use offline context
 */
export function useOfflineContext(): OfflineContextValue {
  const context = useContext(OfflineContext);

  if (!context) {
    throw new Error('useOfflineContext must be used within an OfflineProvider');
  }

  return context;
}

/**
 * Get cache status from service worker via MessageChannel
 */
async function getCacheStatusFromSW(): Promise<{
  staticCount: number;
  calculationCount: number;
  scenarioCount: number;
} | null> {
  if (!navigator.serviceWorker?.controller) {
    return null;
  }

  return new Promise((resolve) => {
    const controller = navigator.serviceWorker.controller;
    if (!controller) {
      resolve(null);
      return;
    }

    const channel = new MessageChannel();

    channel.port1.onmessage = (event) => {
      if (event.data?.type === 'CACHE_STATUS') {
        resolve(event.data.status);
      } else {
        resolve(null);
      }
    };

    controller.postMessage(
      { type: 'GET_CACHE_STATUS' },
      [channel.port2]
    );

    // Timeout after 5 seconds
    setTimeout(() => resolve(null), 5000);
  });
}

export default OfflineProvider;
