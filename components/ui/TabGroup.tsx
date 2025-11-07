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
    <div className={`space-y-2 ${className}`}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <div key={tab.id} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <button
              onClick={() => toggleTab(tab.id)}
              className={`
                w-full px-4 py-3 text-left text-sm font-medium transition-colors
                ${isActive
                  ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                  : "bg-gray-50 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700"
                }
              `}
            >
              {tab.label}
            </button>

            {isActive && (
              <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 p-6">
                {tab.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

TabGroup.displayName = "TabGroup";
