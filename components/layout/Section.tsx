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
  /** ARIA landmark role - use "main" for the primary content area, "region" for named sections */
  role?: "main" | "region" | "complementary";
  /** Heading level for the title - defaults to h2, use h1 for main sections */
  headingLevel?: 1 | 2 | 3 | 4;
  /** aria-label for the section when no visible title */
  ariaLabel?: string;
}

export const Section: React.FC<SectionProps> = ({
  id,
  title,
  subtitle,
  children,
  className,
  background = "default",
  role,
  headingLevel = 2,
  ariaLabel
}) => {
  const backgroundStyles = {
    default: "bg-background",
    muted: "bg-slate-50 dark:bg-slate-900/50",
    gradient: "bg-gradient-to-b from-slate-50 to-background dark:from-slate-900/50 dark:to-background"
  };

  // Create the appropriate heading element
  const HeadingTag = `h${headingLevel}` as "h1" | "h2" | "h3" | "h4";

  // Determine aria attributes
  const ariaAttributes: Record<string, string | undefined> = {};
  if (role === "region" && (title || ariaLabel)) {
    // Regions require an accessible name
    ariaAttributes["aria-labelledby"] = title ? `${id}-heading` : undefined;
    ariaAttributes["aria-label"] = !title ? ariaLabel : undefined;
  } else if (ariaLabel) {
    ariaAttributes["aria-label"] = ariaLabel;
  }

  return (
    <section
      id={id}
      role={role}
      className={cn(
        "py-16 md:py-24",
        // Responsive padding adjustments
        "px-4 sm:px-6",
        backgroundStyles[background],
        className
      )}
      {...ariaAttributes}
    >
      <div className="max-w-7xl mx-auto">
        {(title || subtitle) && (
          <div className="mb-12 text-center">
            {title && (
              <HeadingTag
                id={id ? `${id}-heading` : undefined}
                className={cn(
                  "font-bold mb-4 text-slate-900 dark:text-slate-50",
                  // Responsive text sizes
                  headingLevel === 1 && "text-3xl sm:text-4xl md:text-5xl",
                  headingLevel === 2 && "text-2xl sm:text-3xl md:text-4xl",
                  headingLevel === 3 && "text-xl sm:text-2xl md:text-3xl",
                  headingLevel === 4 && "text-lg sm:text-xl md:text-2xl"
                )}
              >
                {title}
              </HeadingTag>
            )}
            {subtitle && (
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
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
