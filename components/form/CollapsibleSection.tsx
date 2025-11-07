"use client";

import React, { useState } from "react";
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
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  description,
  defaultOpen = false,
  badge,
  children,
  className
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <ChevronDown
            className={cn(
              "w-5 h-5 text-slate-500 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
          <div className="text-left">
            <h3 className="font-semibold text-base">{title}</h3>
            {description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        {badge !== undefined && (
          <Badge variant="secondary" className="ml-2">
            {badge}
          </Badge>
        )}
      </button>

      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pt-2 space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
