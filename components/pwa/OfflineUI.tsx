'use client';

import React from 'react';
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';
import { UpdateNotification } from '@/components/ui/UpdateNotification';

/**
 * Offline UI Components
 *
 * Client-side wrapper for offline-related UI elements.
 * Includes offline indicator and update notification.
 */

export function OfflineUI() {
  return (
    <>
      <OfflineIndicator position="bottom" />
      <UpdateNotification />
    </>
  );
}

export default OfflineUI;
