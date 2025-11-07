"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  background?: "default" | "muted" | "gradient";
}

export const Section: React.FC<SectionProps> = ({
  id,
  title,
  subtitle,
  children,
  className,
  background = "default"
}) => {
  const backgroundStyles = {
    default: "bg-background",
    muted: "bg-slate-50 dark:bg-slate-900/50",
    gradient: "bg-gradient-to-b from-slate-50 to-background dark:from-slate-900/50 dark:to-background"
  };

  return (
    <section
      id={id}
      className={cn(
        "py-16 md:py-24",
        backgroundStyles[background],
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-6">
        {(title || subtitle) && (
          <div className="mb-12 text-center">
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-slate-50">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
};
