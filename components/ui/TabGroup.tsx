"use client";

import { useState, forwardRef, useImperativeHandle, useRef, useCallback } from "react";

export type TabGroupRef = {
  closeAll: () => void;
};

type Tab = {
  id: string;
  label: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
};

type TabGroupProps = {
  tabs: Tab[];
  className?: string;
  /** Unique identifier for ARIA relationships */
  id?: string;
};

export const TabGroup = forwardRef<TabGroupRef, TabGroupProps>(({ tabs, className = "", id = "tabgroup" }, ref) => {
  // Track which tab is active (first tab by default, or the one marked defaultOpen)
  const [activeTab, setActiveTab] = useState<string>(() => {
    const defaultTab = tabs.find(tab => tab.defaultOpen);
    return defaultTab?.id ?? tabs[0]?.id ?? "";
  });

  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Keyboard navigation for tabs
  const handleKeyDown = useCallback((e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex: number | null = null;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
    }

    if (newIndex !== null) {
      const newTab = tabs[newIndex];
      const tabElement = tabRefs.current.get(newTab.id);
      if (tabElement) {
        tabElement.focus();
        setActiveTab(newTab.id);
      }
    }
  }, [tabs]);

  // Expose closeAll method to parent - set to first tab
  useImperativeHandle(ref, () => ({
    closeAll: () => setActiveTab(tabs[0]?.id ?? ""),
  }));

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 ${className}`}>
      {/* Desktop: Left navigation column (fixed) */}
      <div className="hidden lg:block">
        <nav
          role="tablist"
          aria-label="Section navigation"
          aria-orientation="vertical"
          className="sticky top-4 space-y-1"
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el);
                }}
                role="tab"
                id={`${id}-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`${id}-panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`
                  w-full px-4 py-3 text-left text-sm font-medium transition-all rounded-md
                  min-h-[44px]
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                  ${isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 border border-gray-200 dark:border-gray-700"
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile: Dropdown selector */}
      <div className="lg:hidden">
        <label htmlFor={`${id}-mobile-select`} className="sr-only">
          Select section
        </label>
        <select
          id={`${id}-mobile-select`}
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          aria-label="Select section"
          className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base shadow-sm ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
        >
          {tabs.map(tab => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Right content panel */}
      <div
        role="tabpanel"
        id={`${id}-panel-${activeTab}`}
        aria-labelledby={`${id}-tab-${activeTab}`}
        tabIndex={0}
        className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {activeTabData?.content}
      </div>
    </div>
  );
});

TabGroup.displayName = "TabGroup";
