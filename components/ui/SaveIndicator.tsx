"use client";

import React, { useEffect, useState } from "react";
import { Check, Cloud, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveIndicatorProps {
  /** Current save status */
  status: "saved" | "saving" | "unsaved" | "error";
  /** Optional custom message */
  message?: string;
  /** Show timestamp of last save */
  showTimestamp?: boolean;
  /** Last saved timestamp */
  lastSaved?: Date;
  className?: string;
}

/**
 * SaveIndicator - Visual feedback for data persistence state
 *
 * Shows users whether their data is saved, saving, or has unsaved changes.
 * Helps build trust that data won't be lost.
 */
export const SaveIndicator: React.FC<SaveIndicatorProps> = ({
  status,
  message,
  showTimestamp = false,
  lastSaved,
  className,
}) => {
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);

  // Show "Saved" confirmation briefly when status changes to saved
  useEffect(() => {
    if (status === "saved") {
      setShowSavedConfirmation(true);
      const timer = setTimeout(() => setShowSavedConfirmation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, lastSaved]);

  const getStatusContent = () => {
    switch (status) {
      case "saving":
        return {
          icon: <Cloud className="w-4 h-4 animate-pulse" />,
          text: message || "Saving...",
          colorClass: "text-blue-600 dark:text-blue-400",
        };
      case "saved":
        return {
          icon: showSavedConfirmation ? (
            <Check className="w-4 h-4" />
          ) : (
            <Cloud className="w-4 h-4" />
          ),
          text: showSavedConfirmation
            ? "Saved"
            : message ||
              (showTimestamp && lastSaved
                ? `Saved ${formatRelativeTime(lastSaved)}`
                : "All changes saved"),
          colorClass: showSavedConfirmation
            ? "text-green-600 dark:text-green-400"
            : "text-slate-500 dark:text-slate-400",
        };
      case "unsaved":
        return {
          icon: <Cloud className="w-4 h-4" />,
          text: message || "Unsaved changes",
          colorClass: "text-amber-600 dark:text-amber-400",
        };
      case "error":
        return {
          icon: <CloudOff className="w-4 h-4" />,
          text: message || "Failed to save",
          colorClass: "text-red-600 dark:text-red-400",
        };
    }
  };

  const content = getStatusContent();

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-colors duration-200",
        content.colorClass,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {content.icon}
      <span>{content.text}</span>
    </div>
  );
};

/**
 * Format a date as relative time (e.g., "just now", "2 min ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;

  return date.toLocaleDateString();
}
