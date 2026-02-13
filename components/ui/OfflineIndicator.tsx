'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useOffline, useOfflineQueue } from '@/hooks/useOffline';

/**
 * Offline Indicator Component
 *
 * Displays connection status and queued operation count.
 * Shows graceful degradation messaging for users without connectivity.
 */

interface OfflineIndicatorProps {
  /** Position on screen */
  position?: 'top' | 'bottom' | 'top-right' | 'bottom-right';
  /** Whether to show even when online (for debugging) */
  showAlways?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function OfflineIndicator({
  position = 'bottom',
  showAlways = false,
  className,
}: OfflineIndicatorProps) {
  const { isOffline, isReconnecting, wasOffline } = useOffline();
  const { queueLength, isSyncing, lastSyncTime } = useOfflineQueue();
  const [isVisible, setIsVisible] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  // Handle visibility and reconnection animation
  useEffect(() => {
    if (isOffline) {
      setIsVisible(true);
      setShowReconnected(false);
    } else if (wasOffline && !isOffline) {
      // Just reconnected - show reconnected message briefly
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else if (!showAlways) {
      setIsVisible(false);
    }
  }, [isOffline, wasOffline, showAlways]);

  // Don't render if not visible
  if (!isVisible && !showAlways) {
    return null;
  }

  const positionClasses = {
    'top': 'top-0 left-0 right-0',
    'bottom': 'bottom-0 left-0 right-0',
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        'fixed z-50 transition-all duration-300 ease-out',
        positionClasses[position],
        position.includes('right') ? 'max-w-sm' : '',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 transition-colors duration-300',
          position.includes('right') ? 'rounded-lg shadow-lg' : '',
          isOffline
            ? 'bg-amber-900/95 border-amber-500/50'
            : showReconnected
              ? 'bg-emerald-900/95 border-emerald-500/50'
              : 'bg-zinc-900/95 border-zinc-700/50',
          'border backdrop-blur-sm'
        )}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {isOffline ? (
            <OfflineIcon className="w-5 h-5 text-amber-400" />
          ) : showReconnected ? (
            <OnlineIcon className="w-5 h-5 text-emerald-400" />
          ) : isSyncing ? (
            <SyncingIcon className="w-5 h-5 text-blue-400 animate-spin" />
          ) : (
            <OnlineIcon className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        {/* Status Message */}
        <div className="flex-1 min-w-0">
          {isOffline ? (
            <>
              <p className="text-sm font-medium text-amber-100">
                You&apos;re offline
              </p>
              <p className="text-xs text-amber-200/80 mt-0.5">
                {queueLength > 0
                  ? `${queueLength} ${queueLength === 1 ? 'calculation' : 'calculations'} queued`
                  : 'Your calculations will work locally'}
              </p>
            </>
          ) : showReconnected ? (
            <>
              <p className="text-sm font-medium text-emerald-100">
                Back online!
              </p>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                {isSyncing
                  ? 'Syncing queued calculations...'
                  : 'All caught up'}
              </p>
            </>
          ) : isSyncing ? (
            <>
              <p className="text-sm font-medium text-blue-100">
                Syncing...
              </p>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Processing queued calculations
              </p>
            </>
          ) : null}
        </div>

        {/* Queue Count Badge */}
        {queueLength > 0 && !showReconnected && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 text-xs font-medium bg-amber-500/20 text-amber-300 rounded-full">
              {queueLength}
            </span>
          </div>
        )}

        {/* Airplane Mode Hint (when offline) */}
        {isOffline && position === 'bottom' && (
          <div className="flex-shrink-0 hidden sm:block">
            <span className="text-lg" aria-hidden="true">
              &#9992;
            </span>
          </div>
        )}
      </div>

      {/* Extended offline message for bottom position */}
      {isOffline && position === 'bottom' && (
        <div className="bg-amber-900/80 border-t border-amber-500/30 px-4 py-2">
          <p className="text-xs text-amber-200/70 text-center">
            Financial planning works anywhere, even on a plane! Your cached scenarios and calculations are available.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact offline badge for inline use
 */
export function OfflineBadge({ className }: { className?: string }) {
  const { isOffline } = useOffline();

  if (!isOffline) {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium',
        'bg-amber-500/20 text-amber-400 rounded-full',
        className
      )}
    >
      <OfflineIcon className="w-3 h-3" />
      Offline
    </span>
  );
}

/**
 * Offline-aware action button wrapper
 */
interface OfflineActionProps {
  /** Whether this action requires network */
  requiresNetwork?: boolean;
  /** The action to perform */
  onClick: () => void;
  /** Action identifier for queuing */
  actionId?: string;
  /** Additional data to pass with the action */
  actionData?: Record<string, unknown>;
  /** Whether the action is currently loading */
  isLoading?: boolean;
  /** Child button content */
  children: React.ReactNode;
  /** Additional classes */
  className?: string;
}

export function OfflineAction({
  requiresNetwork = false,
  onClick,
  actionId = 'unknown-action',
  actionData,
  isLoading,
  children,
  className,
}: OfflineActionProps) {
  const { isOffline } = useOffline();
  const { addToQueue } = useOfflineQueue();

  const handleClick = async () => {
    if (requiresNetwork && isOffline) {
      // Queue the action for later
      await addToQueue({
        type: 'action',
        actionId,
        actionData,
        timestamp: Date.now(),
      });
    } else {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        requiresNetwork && isOffline && 'opacity-75',
        className
      )}
    >
      {children}
      {requiresNetwork && isOffline && (
        <span className="ml-2 text-xs text-amber-400">(queued)</span>
      )}
    </button>
  );
}

// Icon Components
function OfflineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 01-1.414-3.536 5 5 0 011.414-3.536m0 7.072l2.829-2.829M3 3l3.293 3.293m0 0A9.953 9.953 0 014 10a9.953 9.953 0 011.293 4.707m0 0l3.293 3.293"
      />
    </svg>
  );
}

function OnlineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
      />
    </svg>
  );
}

function SyncingIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

export default OfflineIndicator;
