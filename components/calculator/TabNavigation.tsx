"use client"

import React from "react";
import { cn } from "@/lib/utils";

export type MainTabId = 'all' | 'configure' | 'results' | 'stress' | 'legacy' | 'timeline' | 'math';

export interface TabNavigationProps {
  activeTab: MainTabId;
  onTabChange: (tab: MainTabId) => void;
  hasResults?: boolean;
}

const tabs: Array<{ id: MainTabId; label: string; description: string }> = [
  { id: 'all', label: 'All-in-One', description: 'Classic view with everything' },
  { id: 'configure', label: 'Configure', description: 'Set up your retirement plan' },
  { id: 'results', label: 'Results', description: 'View your projections' },
  { id: 'stress', label: 'Stress Tests', description: 'Test market scenarios' },
  { id: 'legacy', label: 'Legacy Planning', description: 'Generational wealth' },
  { id: 'timeline', label: 'Timeline', description: 'Chronological view of milestones' },
  { id: 'math', label: 'The Math', description: 'Understanding the calculations' },
];

export function TabNavigation({ activeTab, onTabChange, hasResults = false }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex space-x-2 overflow-x-auto" aria-label="Main navigation tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = !hasResults && (tab.id === 'results' || tab.id === 'stress' || tab.id === 'legacy' || tab.id === 'timeline' || tab.id === 'math');

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              disabled={isDisabled}
              className={cn(
                "relative min-w-0 flex-shrink-0 py-3 px-4 text-sm font-medium transition-all duration-200",
                "border-b-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                isActive
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : isDisabled
                  ? "border-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer"
              )}
              aria-current={isActive ? "page" : undefined}
              title={isDisabled ? "Calculate your plan first" : tab.description}
            >
              <span className="block">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
