"use client"

import React, { useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { TRANSITIONS } from "@/lib/designTokens";
import { ScreenReaderOnly } from "@/components/a11y/ScreenReaderOnly";

export type MainTabId = 'all' | 'configure' | 'ssot' | 'results' | 'stress' | 'legacy' | 'budget' | 'optimize' | 'tools' | 'math' | 'checkUs';

/** All valid main tab IDs for runtime validation */
const VALID_MAIN_TAB_IDS: readonly MainTabId[] = ['all', 'configure', 'ssot', 'results', 'stress', 'legacy', 'budget', 'optimize', 'tools', 'math', 'checkUs'] as const;

/** Type guard to check if a string is a valid MainTabId */
export function isMainTabId(value: string): value is MainTabId {
  return VALID_MAIN_TAB_IDS.includes(value as MainTabId);
}

export interface TabNavigationProps {
  activeTab: MainTabId;
  onTabChange: (tab: MainTabId) => void;
  hasResults?: boolean;
  /** Show icons alongside labels */
  showIcons?: boolean;
  /** Compact mode for mobile */
  compact?: boolean;
}

// Tab icons as inline SVGs for better performance
const TabIcons: Record<MainTabId, React.FC<{ className?: string }>> = {
  all: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  configure: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ssot: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  results: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  stress: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  legacy: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  budget: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  optimize: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  tools: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  checkUs: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  math: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

const tabs: Array<{ id: MainTabId; label: string; shortLabel?: string; description: string }> = [
  { id: 'all', label: 'All-in-One', shortLabel: 'All', description: 'Classic view with everything' },
  { id: 'configure', label: 'Configure', description: 'Set up your retirement plan' },
  { id: 'ssot', label: 'SSOT', description: 'Single Source of Truth - Master data view' },
  { id: 'results', label: 'Results', description: 'View your projections' },
  { id: 'stress', label: 'Stress Tests', shortLabel: 'Stress', description: 'Test market scenarios' },
  { id: 'legacy', label: 'Legacy Planning', shortLabel: 'Legacy', description: 'Generational wealth' },
  // Budget tab hidden per user request (contains Retirement Timeline & Implied Budget)
  // { id: 'budget', label: 'Budget', description: 'Timeline and budget insights' },
  { id: 'optimize', label: 'Optimize', description: 'Find your freedom date' },
  { id: 'tools', label: 'Planning Tools', shortLabel: 'Tools', description: 'Student loans, annuities, semi-retirement' },
  { id: 'checkUs', label: 'Check Us', shortLabel: 'Check', description: 'Verify our calculations' },
  { id: 'math', label: 'Math', description: 'Understanding the calculations' },
];

export function TabNavigation({
  activeTab,
  onTabChange,
  hasResults = false,
  showIcons = true,
  compact = false,
}: TabNavigationProps) {
  const tabRefs = useRef<Map<MainTabId, HTMLButtonElement>>(new Map());

  // Get enabled tabs for keyboard navigation
  const enabledTabs = tabs.filter(tab => {
    if (!hasResults) {
      return tab.id === 'all' || tab.id === 'configure' || tab.id === 'ssot';
    }
    return true;
  });

  // Keyboard navigation handler for arrow keys
  const handleKeyDown = useCallback((e: React.KeyboardEvent, currentTabId: MainTabId) => {
    const currentIndex = enabledTabs.findIndex(t => t.id === currentTabId);
    let newIndex: number | null = null;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : enabledTabs.length - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = currentIndex < enabledTabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = enabledTabs.length - 1;
        break;
    }

    if (newIndex !== null) {
      const newTab = enabledTabs[newIndex];
      const tabElement = tabRefs.current.get(newTab.id);
      if (tabElement) {
        tabElement.focus();
        onTabChange(newTab.id);
      }
    }
  }, [enabledTabs, onTabChange]);

  return (
    <div className="relative border-b border-gray-200 dark:border-gray-700">
      {/* Mobile scroll hint - left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none z-10 sm:hidden"
        aria-hidden="true"
      />
      {/* Screen reader description */}
      <ScreenReaderOnly id="tab-nav-instructions">
        Use arrow keys to navigate between tabs. Press Enter or Space to select a tab.
      </ScreenReaderOnly>
      <nav
        role="tablist"
        aria-label="Calculator sections"
        aria-describedby="tab-nav-instructions"
        className={cn(
          "flex space-x-1 overflow-x-auto pb-px -mb-px",
          // Mobile: show scrollbar, add padding for fade overlays
          "px-2 sm:px-0",
          // Smooth scrolling and snap
          "scroll-smooth snap-x snap-mandatory",
          // Mobile scrollbar styling
          "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent",
          // Touch-friendly: momentum scrolling
          "-webkit-overflow-scrolling-touch"
        )}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = !hasResults && (
            tab.id === 'results' ||
            tab.id === 'stress' ||
            tab.id === 'legacy' ||
            tab.id === 'budget' ||
            tab.id === 'optimize' ||
            tab.id === 'math' ||
            tab.id === 'checkUs'
          );
          const Icon = TabIcons[tab.id];

          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              aria-disabled={isDisabled}
              tabIndex={isActive ? 0 : -1}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              onKeyDown={(e) => !isDisabled && handleKeyDown(e, tab.id)}
              disabled={isDisabled}
              className={cn(
                // Base styles with mobile-friendly touch targets (min 44px height)
                "group relative flex items-center gap-2 py-3 px-4 text-sm font-medium whitespace-nowrap",
                "min-h-[44px] min-w-[44px]", // WCAG 2.5.5 touch target
                "transition-all duration-200 rounded-t-lg",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                // Snap alignment for mobile scrolling
                "snap-start",
                // Prevent text selection on mobile double-tap
                "select-none",
                isActive && [
                  "text-blue-600 dark:text-blue-400",
                  "bg-blue-50/50 dark:bg-blue-900/20",
                ],
                !isActive && !isDisabled && [
                  "text-gray-600 dark:text-gray-400",
                  "hover:text-gray-900 dark:hover:text-gray-200",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  // Mobile: use active state instead of hover
                  "active:bg-gray-100 dark:active:bg-gray-800",
                ],
                isDisabled && [
                  "text-gray-400 dark:text-gray-600",
                  "cursor-not-allowed opacity-60",
                ],
                // Mobile: slightly smaller padding
                "px-3 sm:px-4",
                compact && "px-2 sm:px-3"
              )}
              aria-label={isDisabled ? `${tab.label} (locked - calculate your plan first)` : `${tab.label}: ${tab.description}`}
              title={isDisabled ? "Calculate your plan first to unlock this tab" : tab.description}
            >
              {/* Icon */}
              {showIcons && Icon && (
                <Icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors duration-200",
                    isActive && "text-blue-600 dark:text-blue-400",
                    !isActive && !isDisabled && "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300",
                    isDisabled && "text-gray-300 dark:text-gray-600"
                  )}
                />
              )}

              {/* Label */}
              <span className={cn(compact && "hidden sm:inline")}>
                {compact ? (tab.shortLabel || tab.label) : tab.label}
              </span>
              {compact && (
                <span className="sm:hidden">
                  {tab.shortLabel || tab.label}
                </span>
              )}

              {/* Locked indicator for disabled tabs */}
              {isDisabled && (
                <svg
                  className="w-3 h-3 text-gray-400 dark:text-gray-600 ml-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}

              {/* Active indicator bar */}
              <span
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-200",
                  isActive
                    ? "bg-blue-600 dark:bg-blue-400"
                    : "bg-transparent group-hover:bg-gray-300 dark:group-hover:bg-gray-600"
                )}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </nav>

      {/* Mobile scroll hint - right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none z-10 sm:hidden"
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * TabBadge - Shows a count or status on a tab
 */
export const TabBadge: React.FC<{
  count?: number;
  status?: "success" | "warning" | "error";
  className?: string;
}> = ({ count, status, className }) => {
  if (count === undefined && !status) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium rounded-full",
        status === "success" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        status === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        status === "error" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        !status && "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
        className
      )}
    >
      {count !== undefined ? count : (
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
    </span>
  );
};
