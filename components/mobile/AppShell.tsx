"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";
import { PullToRefresh } from "./PullToRefresh";

// ============================================================================
// Types
// ============================================================================

/** Navigation tab configuration */
export interface TabConfig {
  /** Unique identifier for the tab */
  id: string;
  /** Display label */
  label: string;
  /** Icon component or element */
  icon: ReactNode;
  /** Active icon (optional, defaults to icon) */
  activeIcon?: ReactNode;
  /** Badge count (optional) */
  badge?: number;
  /** Whether the tab is disabled */
  disabled?: boolean;
  /** Accessibility label override */
  ariaLabel?: string;
}

/** Swipe direction */
export type SwipeDirection = "left" | "right" | "up" | "down" | null;

/** Sync status */
export type SyncStatus = "idle" | "syncing" | "success" | "error" | "pending";

/** App shell context */
export interface AppShellContextType {
  /** Currently active tab ID */
  activeTab: string;
  /** Set the active tab */
  setActiveTab: (tabId: string) => void;
  /** Whether the app is offline */
  isOffline: boolean;
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Number of pending sync operations */
  pendingCount: number;
  /** Trigger a manual sync */
  triggerSync: () => Promise<void>;
  /** Whether safe areas are being respected */
  hasSafeArea: boolean;
  /** Safe area insets */
  safeAreaInsets: SafeAreaInsets;
  /** Whether pull-to-refresh is enabled */
  pullToRefreshEnabled: boolean;
  /** Enable/disable pull-to-refresh */
  setPullToRefreshEnabled: (enabled: boolean) => void;
  /** Trigger haptic feedback */
  triggerHaptic: (type: HapticType) => void;
}

/** Safe area insets */
export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Haptic feedback types */
export type HapticType = "light" | "medium" | "heavy" | "success" | "error" | "selection";

/** Props for AppShell */
export interface AppShellProps {
  /** Child content to render in the main area */
  children: ReactNode;
  /** Tab configuration array */
  tabs: TabConfig[];
  /** Initial active tab ID */
  initialTab?: string;
  /** Callback when tab changes */
  onTabChange?: (tabId: string) => void;
  /** Async function for pull-to-refresh */
  onRefresh?: () => Promise<void>;
  /** Whether to enable pull-to-refresh (default: true) */
  enablePullToRefresh?: boolean;
  /** Whether to enable swipe navigation (default: true) */
  enableSwipeNavigation?: boolean;
  /** Custom header content */
  header?: ReactNode;
  /** Whether to show offline indicator (default: true) */
  showOfflineIndicator?: boolean;
  /** Whether to show sync status (default: true) */
  showSyncStatus?: boolean;
  /** Callback for sync operations */
  onSync?: () => Promise<void>;
  /** Number of pending operations */
  pendingOperations?: number;
  /** Custom class for the container */
  className?: string;
  /** Custom class for the content area */
  contentClassName?: string;
  /** Whether to hide the bottom navigation */
  hideBottomNav?: boolean;
  /** Minimum swipe distance to trigger navigation (default: 50) */
  swipeThreshold?: number;
  /** Tab bar position */
  tabBarPosition?: "bottom" | "top";
}

// ============================================================================
// Context
// ============================================================================

const AppShellContext = createContext<AppShellContextType | null>(null);

/**
 * Hook to access AppShell context
 */
export function useAppShell(): AppShellContextType {
  const context = useContext(AppShellContext);
  if (!context) {
    throw new Error("useAppShell must be used within an AppShell");
  }
  return context;
}

// ============================================================================
// Haptic Feedback Utility
// ============================================================================

/**
 * Trigger haptic feedback if available
 */
function triggerHapticFeedback(type: HapticType): void {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;

  // Respect reduced motion preference
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const patterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 10],
    error: [20, 100, 20, 100, 20],
    selection: 5,
  };

  try {
    navigator.vibrate(patterns[type]);
  } catch {
    // Silently fail if vibration not supported
  }
}

// ============================================================================
// Safe Area Hook
// ============================================================================

/**
 * Hook to detect and track safe area insets
 */
function useSafeAreaInsets(): { insets: SafeAreaInsets; hasSafeArea: boolean } {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const computeInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      const newInsets = {
        top: parseInt(computedStyle.getPropertyValue("--sat") || "0", 10) ||
          parseInt(computedStyle.getPropertyValue("env(safe-area-inset-top)") || "0", 10),
        right: parseInt(computedStyle.getPropertyValue("--sar") || "0", 10) ||
          parseInt(computedStyle.getPropertyValue("env(safe-area-inset-right)") || "0", 10),
        bottom: parseInt(computedStyle.getPropertyValue("--sab") || "0", 10) ||
          parseInt(computedStyle.getPropertyValue("env(safe-area-inset-bottom)") || "0", 10),
        left: parseInt(computedStyle.getPropertyValue("--sal") || "0", 10) ||
          parseInt(computedStyle.getPropertyValue("env(safe-area-inset-left)") || "0", 10),
      };

      // Fallback detection for iOS devices
      if (newInsets.top === 0 && newInsets.bottom === 0) {
        const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const hasNotch = window.screen.height >= 812 && window.devicePixelRatio >= 2;

        if (isIOS && hasNotch) {
          newInsets.top = 47; // iOS notch area
          newInsets.bottom = 34; // iOS home indicator area
        }
      }

      setInsets(newInsets);
    };

    computeInsets();

    // Re-compute on orientation change
    window.addEventListener("orientationchange", computeInsets);
    window.addEventListener("resize", computeInsets);

    return () => {
      window.removeEventListener("orientationchange", computeInsets);
      window.removeEventListener("resize", computeInsets);
    };
  }, []);

  const hasSafeArea = insets.top > 0 || insets.bottom > 0;

  return { insets, hasSafeArea };
}

// ============================================================================
// Online Status Hook
// ============================================================================

/**
 * Hook to track online/offline status
 */
function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

// ============================================================================
// Swipe Detection Hook
// ============================================================================

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeState {
  direction: SwipeDirection;
  distance: number;
  velocity: number;
}

/**
 * Hook for detecting swipe gestures
 */
function useSwipeGesture(
  ref: React.RefObject<HTMLElement | null>,
  handlers: SwipeHandlers,
  options: {
    threshold?: number;
    velocityThreshold?: number;
    enabled?: boolean;
  } = {}
): SwipeState {
  const { threshold = 50, velocityThreshold = 0.3, enabled = true } = options;

  const [swipeState, setSwipeState] = useState<SwipeState>({
    direction: null,
    distance: 0,
    velocity: 0,
  });

  const startRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const currentRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      currentRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startRef.current) return;

      const touch = e.touches[0];
      currentRef.current = { x: touch.clientX, y: touch.clientY };

      const deltaX = touch.clientX - startRef.current.x;
      const deltaY = touch.clientY - startRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      let direction: SwipeDirection = null;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? "right" : "left";
      } else {
        direction = deltaY > 0 ? "down" : "up";
      }

      setSwipeState({ direction, distance, velocity: 0 });
    };

    const handleTouchEnd = () => {
      if (!startRef.current || !currentRef.current) return;

      const deltaX = currentRef.current.x - startRef.current.x;
      const deltaY = currentRef.current.y - startRef.current.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const duration = (Date.now() - startRef.current.time) / 1000;
      const velocity = distance / duration / 1000; // pixels per millisecond

      if (distance >= threshold || velocity >= velocityThreshold) {
        const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

        if (isHorizontal) {
          if (deltaX > 0 && handlers.onSwipeRight) {
            handlers.onSwipeRight();
            triggerHapticFeedback("selection");
          } else if (deltaX < 0 && handlers.onSwipeLeft) {
            handlers.onSwipeLeft();
            triggerHapticFeedback("selection");
          }
        } else {
          if (deltaY > 0 && handlers.onSwipeDown) {
            handlers.onSwipeDown();
          } else if (deltaY < 0 && handlers.onSwipeUp) {
            handlers.onSwipeUp();
          }
        }
      }

      setSwipeState({ direction: null, distance: 0, velocity: 0 });
      startRef.current = null;
      currentRef.current = null;
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd);
    element.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [ref, handlers, threshold, velocityThreshold, enabled]);

  return swipeState;
}

// ============================================================================
// Offline Indicator Component
// ============================================================================

interface OfflineIndicatorProps {
  isVisible: boolean;
  safeAreaTop: number;
}

function OfflineIndicator({ isVisible, safeAreaTop }: OfflineIndicatorProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!show) return null;

  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-50 flex items-center justify-center",
        "bg-amber-500 text-white px-4 py-2",
        "transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}
      style={{ top: safeAreaTop }}
      role="alert"
      aria-live="polite"
    >
      <svg
        className="w-4 h-4 mr-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
        />
      </svg>
      <span className="text-sm font-medium">You&apos;re offline</span>
    </div>
  );
}

// ============================================================================
// Sync Status Indicator Component
// ============================================================================

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  pendingCount: number;
  safeAreaTop: number;
  hasOfflineIndicator: boolean;
  onRetry?: () => void;
}

function SyncStatusIndicator({
  status,
  pendingCount,
  safeAreaTop,
  hasOfflineIndicator,
  onRetry,
}: SyncStatusIndicatorProps) {
  const [show, setShow] = useState(false);
  const [displayStatus, setDisplayStatus] = useState(status);

  useEffect(() => {
    if (status !== "idle") {
      setShow(true);
      setDisplayStatus(status);

      // Auto-hide success after 2 seconds
      if (status === "success") {
        const timer = setTimeout(() => setShow(false), 2000);
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
    }
  }, [status]);

  if (!show) return null;

  const topOffset = safeAreaTop + (hasOfflineIndicator ? 40 : 0);

  return (
    <div
      className={cn(
        "fixed left-4 right-4 z-40 flex items-center justify-between",
        "rounded-lg px-4 py-3 shadow-lg",
        "transition-all duration-300 ease-out",
        displayStatus === "syncing" && "bg-blue-500 text-white",
        displayStatus === "success" && "bg-green-500 text-white",
        displayStatus === "error" && "bg-destructive text-white",
        displayStatus === "pending" && "bg-amber-500 text-white",
        show ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}
      style={{ top: topOffset }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center">
        {displayStatus === "syncing" && (
          <>
            <svg
              className="w-4 h-4 mr-2 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm font-medium">Syncing changes...</span>
          </>
        )}
        {displayStatus === "success" && (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">All changes synced</span>
          </>
        )}
        {displayStatus === "error" && (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm font-medium">Sync failed</span>
          </>
        )}
        {displayStatus === "pending" && (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">
              {pendingCount} change{pendingCount !== 1 ? "s" : ""} pending
            </span>
          </>
        )}
      </div>

      {displayStatus === "error" && onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium underline underline-offset-2 hover:no-underline focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-2 py-1"
          aria-label="Retry sync"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Bottom Tab Bar Component
// ============================================================================

interface BottomTabBarProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  safeAreaBottom: number;
}

function BottomTabBar({ tabs, activeTab, onTabChange, safeAreaBottom }: BottomTabBarProps) {
  const handleTabClick = useCallback(
    (tabId: string, disabled?: boolean) => {
      if (disabled) return;
      triggerHapticFeedback("selection");
      onTabChange(tabId);
    },
    [onTabChange]
  );

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-background/95 backdrop-blur-lg border-t border-border/50",
        "flex items-stretch justify-around",
        "shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
      )}
      style={{ paddingBottom: Math.max(safeAreaBottom, 8) }}
      role="tablist"
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id, tab.disabled)}
            disabled={tab.disabled}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.ariaLabel || tab.label}
            aria-disabled={tab.disabled}
            className={cn(
              "flex-1 flex flex-col items-center justify-center",
              "min-h-[56px] pt-2 pb-1 px-2",
              "transition-all duration-200 ease-out",
              "touch-manipulation select-none",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset",
              "active:scale-95",
              isActive && "text-primary",
              !isActive && "text-muted-foreground hover:text-foreground",
              tab.disabled && "opacity-40 cursor-not-allowed"
            )}
          >
            {/* Icon container with indicator */}
            <div className="relative">
              {/* Active indicator pill */}
              <div
                className={cn(
                  "absolute -inset-x-3 -inset-y-1 rounded-full",
                  "bg-primary/10 transition-all duration-200",
                  isActive ? "scale-100 opacity-100" : "scale-75 opacity-0"
                )}
              />

              {/* Icon */}
              <div className="relative z-10 w-6 h-6 flex items-center justify-center">
                {isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
              </div>

              {/* Badge */}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={cn(
                    "absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px]",
                    "flex items-center justify-center",
                    "bg-destructive text-destructive-foreground",
                    "text-[10px] font-bold rounded-full px-1",
                    "shadow-sm"
                  )}
                  aria-label={`${tab.badge} notifications`}
                >
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                "text-[10px] font-medium mt-1",
                "transition-all duration-200",
                isActive && "font-semibold"
              )}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ============================================================================
// Scroll Container Component
// ============================================================================

interface ScrollContainerProps {
  children: ReactNode;
  className?: string;
  onScrollToTop?: () => void;
  onScrollToBottom?: () => void;
}

function ScrollContainer({
  children,
  className,
  onScrollToTop,
  onScrollToBottom,
}: ScrollContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;

    // Detect scroll to top
    if (scrollTop === 0 && lastScrollTopRef.current > 0) {
      onScrollToTop?.();
    }

    // Detect scroll to bottom
    if (scrollTop + clientHeight >= scrollHeight - 10 &&
        lastScrollTopRef.current + clientHeight < scrollHeight - 10) {
      onScrollToBottom?.();
    }

    lastScrollTopRef.current = scrollTop;
  }, [onScrollToTop, onScrollToBottom]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "overflow-auto overscroll-contain",
        "-webkit-overflow-scrolling-touch",
        "scroll-smooth",
        className
      )}
      style={{
        // Enable momentum scrolling on iOS
        WebkitOverflowScrolling: "touch",
        // Smooth scroll behavior
        scrollBehavior: "smooth",
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Touch Button Component
// ============================================================================

export interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Haptic feedback type on press */
  hapticType?: HapticType;
  /** Minimum touch target size (default: 44) */
  minTouchTarget?: number;
  /** Whether to show touch feedback */
  showFeedback?: boolean;
}

export function TouchButton({
  children,
  className,
  hapticType = "light",
  minTouchTarget = 44,
  showFeedback = true,
  onClick,
  ...props
}: TouchButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      triggerHapticFeedback(hapticType);
      onClick?.(e);
    },
    [hapticType, onClick]
  );

  return (
    <button
      className={cn(
        "relative touch-manipulation select-none",
        "transition-transform duration-150 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        showFeedback && isPressed && "scale-95",
        className
      )}
      style={{
        minWidth: minTouchTarget,
        minHeight: minTouchTarget,
      }}
      onClick={handleClick}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      {...props}
    >
      {children}
    </button>
  );
}

// ============================================================================
// Main AppShell Component
// ============================================================================

export function AppShell({
  children,
  tabs,
  initialTab,
  onTabChange,
  onRefresh,
  enablePullToRefresh = true,
  enableSwipeNavigation = true,
  header,
  showOfflineIndicator = true,
  showSyncStatus = true,
  onSync,
  pendingOperations = 0,
  className,
  contentClassName,
  hideBottomNav = false,
  swipeThreshold = 50,
  tabBarPosition = "bottom",
}: AppShellProps) {
  // State
  const [activeTab, setActiveTab] = useState(initialTab || tabs[0]?.id || "");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [pullToRefreshEnabled, setPullToRefreshEnabled] = useState(enablePullToRefresh);

  // Refs
  const contentRef = useRef<HTMLDivElement>(null);

  // Hooks
  const isOnline = useOnlineStatus();
  const { insets, hasSafeArea } = useSafeAreaInsets();

  // Calculate active tab index for swipe navigation
  const activeTabIndex = useMemo(
    () => tabs.findIndex((t) => t.id === activeTab),
    [tabs, activeTab]
  );

  // Handle tab change
  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange]
  );

  // Swipe navigation handlers
  const swipeHandlers: SwipeHandlers = useMemo(() => ({
    onSwipeLeft: () => {
      if (activeTabIndex < tabs.length - 1) {
        const nextTab = tabs[activeTabIndex + 1];
        if (!nextTab.disabled) {
          handleTabChange(nextTab.id);
        }
      }
    },
    onSwipeRight: () => {
      if (activeTabIndex > 0) {
        const prevTab = tabs[activeTabIndex - 1];
        if (!prevTab.disabled) {
          handleTabChange(prevTab.id);
        }
      }
    },
  }), [activeTabIndex, tabs, handleTabChange]);

  // Use swipe gesture
  useSwipeGesture(contentRef, swipeHandlers, {
    threshold: swipeThreshold,
    enabled: enableSwipeNavigation && !hideBottomNav,
  });

  // Handle sync
  const handleSync = useCallback(async () => {
    if (!onSync || syncStatus === "syncing") return;

    setSyncStatus("syncing");
    try {
      await onSync();
      setSyncStatus("success");
      triggerHapticFeedback("success");
    } catch {
      setSyncStatus("error");
      triggerHapticFeedback("error");
    }
  }, [onSync, syncStatus]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
    if (onSync && isOnline) {
      await handleSync();
    }
  }, [onRefresh, onSync, isOnline, handleSync]);

  // Update sync status based on pending operations
  useEffect(() => {
    if (pendingOperations > 0 && syncStatus === "idle") {
      setSyncStatus("pending");
    } else if (pendingOperations === 0 && syncStatus === "pending") {
      setSyncStatus("idle");
    }
  }, [pendingOperations, syncStatus]);

  // Trigger haptic
  const triggerHaptic = useCallback((type: HapticType) => {
    triggerHapticFeedback(type);
  }, []);

  // Context value
  const contextValue: AppShellContextType = useMemo(
    () => ({
      activeTab,
      setActiveTab: handleTabChange,
      isOffline: !isOnline,
      syncStatus,
      pendingCount: pendingOperations,
      triggerSync: handleSync,
      hasSafeArea,
      safeAreaInsets: insets,
      pullToRefreshEnabled,
      setPullToRefreshEnabled,
      triggerHaptic,
    }),
    [
      activeTab,
      handleTabChange,
      isOnline,
      syncStatus,
      pendingOperations,
      handleSync,
      hasSafeArea,
      insets,
      pullToRefreshEnabled,
      triggerHaptic,
    ]
  );

  // Calculate content padding
  const contentPaddingTop = insets.top + (header ? 0 : 0);
  const contentPaddingBottom = hideBottomNav ? insets.bottom : 56 + insets.bottom + 8;

  return (
    <AppShellContext.Provider value={contextValue}>
      <div
        className={cn(
          "fixed inset-0 flex flex-col",
          "bg-background text-foreground",
          "touch-manipulation overscroll-none",
          className
        )}
        style={{
          // CSS variables for safe areas
          ["--sat" as string]: `${insets.top}px`,
          ["--sar" as string]: `${insets.right}px`,
          ["--sab" as string]: `${insets.bottom}px`,
          ["--sal" as string]: `${insets.left}px`,
        }}
      >
        {/* Offline Indicator */}
        {showOfflineIndicator && (
          <OfflineIndicator isVisible={!isOnline} safeAreaTop={insets.top} />
        )}

        {/* Sync Status Indicator */}
        {showSyncStatus && (
          <SyncStatusIndicator
            status={syncStatus}
            pendingCount={pendingOperations}
            safeAreaTop={insets.top}
            hasOfflineIndicator={showOfflineIndicator && !isOnline}
            onRetry={handleSync}
          />
        )}

        {/* Header */}
        {header && (
          <header
            className="flex-shrink-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border/50"
            style={{ paddingTop: insets.top }}
          >
            {header}
          </header>
        )}

        {/* Top Tab Bar (optional) */}
        {tabBarPosition === "top" && !hideBottomNav && (
          <div className="flex-shrink-0 z-30">
            {/* Render as horizontal scrollable tabs at top */}
            <div className="flex overflow-x-auto border-b border-border/50 bg-background/95 backdrop-blur-lg">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  disabled={tab.disabled}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 whitespace-nowrap",
                    "transition-colors duration-200",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    tab.id === activeTab && "text-primary border-b-2 border-primary",
                    tab.id !== activeTab && "text-muted-foreground hover:text-foreground",
                    tab.disabled && "opacity-40 cursor-not-allowed"
                  )}
                >
                  <span className="w-5 h-5">{tab.icon}</span>
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main
          ref={contentRef}
          className={cn("flex-1 relative overflow-hidden", contentClassName)}
        >
          {pullToRefreshEnabled && onRefresh ? (
            <PullToRefresh
              onRefresh={handleRefresh}
              enabled={pullToRefreshEnabled}
              className="h-full"
            >
              <ScrollContainer
                className="h-full"
              >
                <div
                  style={{
                    paddingTop: contentPaddingTop,
                    paddingBottom: contentPaddingBottom,
                    paddingLeft: insets.left,
                    paddingRight: insets.right,
                  }}
                >
                  {children}
                </div>
              </ScrollContainer>
            </PullToRefresh>
          ) : (
            <ScrollContainer
              className="h-full"
            >
              <div
                style={{
                  paddingTop: contentPaddingTop,
                  paddingBottom: contentPaddingBottom,
                  paddingLeft: insets.left,
                  paddingRight: insets.right,
                }}
              >
                {children}
              </div>
            </ScrollContainer>
          )}
        </main>

        {/* Bottom Tab Bar */}
        {tabBarPosition === "bottom" && !hideBottomNav && (
          <BottomTabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            safeAreaBottom={insets.bottom}
          />
        )}
      </div>

      {/* Global styles for native-like behavior */}
      <style jsx global>{`
        /* Prevent text selection on touch */
        .touch-manipulation {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        /* Smooth momentum scrolling */
        .overscroll-contain {
          overscroll-behavior: contain;
        }

        /* Hide scrollbars but keep functionality */
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }

        /* Native tap highlight */
        * {
          -webkit-tap-highlight-color: transparent;
        }

        /* Safe area CSS variables fallback */
        :root {
          --sat: env(safe-area-inset-top, 0px);
          --sar: env(safe-area-inset-right, 0px);
          --sab: env(safe-area-inset-bottom, 0px);
          --sal: env(safe-area-inset-left, 0px);
        }

        /* Prevent pull-to-refresh on Chrome Android */
        body {
          overscroll-behavior-y: contain;
        }

        /* Prevent iOS bounce effect on body */
        html, body {
          position: fixed;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }

        /* GPU acceleration for transforms */
        .will-change-transform {
          will-change: transform;
          transform: translateZ(0);
        }
      `}</style>
    </AppShellContext.Provider>
  );
}

export default AppShell;
