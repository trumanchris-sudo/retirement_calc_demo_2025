"use client";

import { useState, forwardRef, useImperativeHandle } from "react";

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
};

export const TabGroup = forwardRef<TabGroupRef, TabGroupProps>(({ tabs, className = "" }, ref) => {
  // Track which tab is active (first tab by default, or the one marked defaultOpen)
  const [activeTab, setActiveTab] = useState<string>(() => {
    const defaultTab = tabs.find(tab => tab.defaultOpen);
    return defaultTab?.id ?? tabs[0]?.id ?? "";
  });

  // Expose closeAll method to parent - set to first tab
  useImperativeHandle(ref, () => ({
    closeAll: () => setActiveTab(tabs[0]?.id ?? ""),
  }));

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6 ${className}`}>
      {/* Desktop: Left navigation column (fixed) */}
      <div className="hidden lg:block">
        <nav className="sticky top-4 space-y-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full px-4 py-3 text-left text-sm font-medium transition-all rounded-md
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
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
        >
          {tabs.map(tab => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      {/* Right content panel */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        {activeTabData?.content}
      </div>
    </div>
  );
});

TabGroup.displayName = "TabGroup";
