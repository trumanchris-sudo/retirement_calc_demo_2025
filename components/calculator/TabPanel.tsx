"use client"

import React from "react";
import { cn } from "@/lib/utils";
import type { MainTabId } from "./TabNavigation";

export interface TabPanelProps {
  id: MainTabId;
  activeTab: MainTabId;
  children: React.ReactNode;
  className?: string;
}

/**
 * TabPanel - A container component that shows/hides content based on the active tab.
 * Used for the main tab navigation in the retirement calculator.
 */
export function TabPanel({ id, activeTab, children, className }: TabPanelProps) {
  // Support 'all' tab which shows everything
  const isVisible = activeTab === 'all' || activeTab === id;

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={cn("space-y-8", className)}
    >
      {children}
    </div>
  );
}
