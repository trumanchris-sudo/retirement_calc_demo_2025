"use client"

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";

export interface LastCalculatedBadgeProps {
  lastCalculated: Date | null;
  inputsModified: boolean;
}

/**
 * Formats time ago from a date
 * Returns strings like "5s ago", "2m ago", "1h ago", "3d ago"
 */
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function LastCalculatedBadge({ lastCalculated, inputsModified }: LastCalculatedBadgeProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  // Update time ago every second
  useEffect(() => {
    if (!lastCalculated) return;

    const updateTime = () => {
      setTimeAgo(formatTimeAgo(lastCalculated));
    };

    // Update immediately
    updateTime();

    // Then update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [lastCalculated]);

  if (!lastCalculated) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="outline" className="flex items-center gap-1.5">
        <Clock className="h-3 w-3" />
        <span>Last calculated: {timeAgo}</span>
      </Badge>

      {inputsModified && (
        <Badge variant="destructive" className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          <span>Inputs modified - recalculate to update</span>
        </Badge>
      )}
    </div>
  );
}
