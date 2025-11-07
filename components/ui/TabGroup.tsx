"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { ChevronDown } from "lucide-react";

export type TabGroupRef = {
  closeAll: () => void;
};

type Tab = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  defaultOpen?: boolean;
};

type TabGroupProps = {
  tabs: Tab[];
  className?: string;
};

export const TabGroup = forwardRef<TabGroupRef, TabGroupProps>(({ tabs, className = "" }, ref) => {
  const [openTabs, setOpenTabs] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    tabs.forEach(tab => {
      if (tab.defaultOpen) {
        initial.add(tab.id);
      }
    });
    return initial;
  });

  // Expose closeAll method to parent
  useImperativeHandle(ref, () => ({
    closeAll: () => setOpenTabs(new Set()),
  }));

  const toggleTab = (id: string) => {
    setOpenTabs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {tabs.map(tab => {
        const isOpen = openTabs.has(tab.id);
        return (
          <div
            key={tab.id}
            className="border rounded-lg overflow-hidden transition-all"
          >
            <button
              onClick={() => toggleTab(tab.id)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900 dark:hover:to-indigo-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                {tab.icon && <span className="text-xl">{tab.icon}</span>}
                <h3 className="text-lg font-semibold text-left">{tab.label}</h3>
              </div>
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              className={`transition-all duration-200 ease-in-out ${
                isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
              }`}
            >
              <div className="p-6 bg-white dark:bg-neutral-900">
                {tab.content}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

TabGroup.displayName = "TabGroup";
