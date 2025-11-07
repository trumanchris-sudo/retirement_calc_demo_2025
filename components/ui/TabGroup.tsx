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
  // Only one tab can be open at a time (or none)
  const [activeTab, setActiveTab] = useState<string | null>(() => {
    const defaultTab = tabs.find(tab => tab.defaultOpen);
    return defaultTab?.id ?? null;
  });

  // Expose closeAll method to parent
  useImperativeHandle(ref, () => ({
    closeAll: () => setActiveTab(null),
  }));

  const toggleTab = (id: string) => {
    setActiveTab(prev => prev === id ? null : id);
  };

  return (
    <div className={className}>
      {/* Horizontal tab bar */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => toggleTab(tab.id)}
              className={`
                px-4 py-2 text-sm font-medium transition-colors relative
                rounded-t-md border-t border-l border-r
                ${isActive
                  ? "bg-white dark:bg-neutral-900 border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 border-b-white dark:border-b-neutral-900 -mb-px"
                  : "bg-gray-50 dark:bg-neutral-800 border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700"
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content panel */}
      {activeTab && (
        <div className="border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-md bg-white dark:bg-neutral-900 p-6">
          {tabs.find(tab => tab.id === activeTab)?.content}
        </div>
      )}
    </div>
  );
});

TabGroup.displayName = "TabGroup";
