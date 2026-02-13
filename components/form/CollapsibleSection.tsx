"use client";

import React, { useState, useId, useCallback, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  badge?: string | number;
  children: React.ReactNode;
  className?: string;
  /** Optional ID for the section */
  id?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  description,
  defaultOpen = false,
  badge,
  children,
  className,
  id: providedId
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const generatedId = useId();
  const id = providedId || generatedId;
  const buttonId = `${id}-button`;
  const panelId = `${id}-panel`;

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        if (isOpen) {
          setIsOpen(false);
        }
        break;
    }
  }, [isOpen]);

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <button
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          // Base styles with minimum 44px touch target
          "w-full px-4 sm:px-6 py-4 min-h-[44px]",
          "flex items-center justify-between",
          "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
          // Focus styles
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
          "rounded-t-lg",
          !isOpen && "rounded-b-lg"
        )}
        aria-expanded={isOpen}
        aria-controls={panelId}
        type="button"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <ChevronDown
            className={cn(
              "w-5 h-5 text-slate-500 transition-transform duration-200 flex-shrink-0",
              isOpen && "rotate-180"
            )}
            aria-hidden="true"
          />
          <div className="text-left">
            <span className="font-semibold text-base block">{title}</span>
            {description && (
              <span className="text-sm text-slate-600 dark:text-slate-400 mt-0.5 block">
                {description}
              </span>
            )}
          </div>
        </div>

        {badge !== undefined && (
          <Badge variant="secondary" className="ml-2 flex-shrink-0">
            {badge}
          </Badge>
        )}
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 sm:px-6 pb-6 pt-2 space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
