'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useOfflineContext } from '@/lib/offline-context';

/**
 * Update Notification Component
 *
 * Shows a notification when a new service worker version is available.
 * Allows users to update immediately or dismiss.
 */

interface UpdateNotificationProps {
  /** Additional CSS classes */
  className?: string;
}

export function UpdateNotification({ className }: UpdateNotificationProps) {
  const { updateAvailable, skipWaiting, swReady } = useOfflineContext();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset dismissed state when new update becomes available
  useEffect(() => {
    if (updateAvailable) {
      setIsDismissed(false);
    }
  }, [updateAvailable]);

  // Don't show if no update or dismissed
  if (!updateAvailable || isDismissed || !swReady) {
    return null;
  }

  const handleUpdate = () => {
    setIsUpdating(true);
    skipWaiting();

    // Reload after a short delay to allow SW to activate
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50',
        'animate-in slide-in-from-bottom-4 duration-300',
        className
      )}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Update icon */}
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-white">
                Update Available
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                A new version of the calculator is ready. Update now for the latest features and improvements.
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className={cn(
                'flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                'bg-emerald-600 text-white hover:bg-emerald-500',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900',
                isUpdating && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isUpdating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Updating...
                </span>
              ) : (
                'Update Now'
              )}
            </button>
            <button
              onClick={handleDismiss}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                'bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
                'focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-900'
              )}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdateNotification;
