/**
 * URLTabSync
 * Extracted from page.tsx — syncs URL search params with tab state.
 * Requires Suspense boundary in Next.js 15.
 */
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { type MainTabId, isMainTabId } from '@/components/calculator/TabNavigation';

export function URLTabSync({ onTabChange }: { onTabChange: (tab: MainTabId) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && isMainTabId(tab)) {
      onTabChange(tab);
    }
  }, [searchParams, onTabChange]);

  return null;
}
