"use client";

import React from "react";

interface ScreenReaderOnlyProps {
  /** Content to be read by screen readers */
  children: React.ReactNode;
  /** HTML tag to use (default: span) */
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** Additional CSS classes */
  className?: string;
  /** ARIA role override */
  role?: string;
  /** Unique identifier */
  id?: string;
}

/**
 * ScreenReaderOnly - Visually hidden content for screen readers
 *
 * Use this component to provide additional context to screen reader users
 * without affecting the visual layout.
 *
 * Features:
 * - Visually hidden but accessible to screen readers
 * - Semantic HTML support (span, div, headings)
 * - Compatible with all assistive technologies
 *
 * Usage:
 * ```tsx
 * // Basic usage
 * <ScreenReaderOnly>Loading complete</ScreenReaderOnly>
 *
 * // As a heading for section context
 * <ScreenReaderOnly as="h2">Results Summary</ScreenReaderOnly>
 *
 * // With custom role
 * <ScreenReaderOnly role="status">Calculation in progress</ScreenReaderOnly>
 * ```
 */
export function ScreenReaderOnly({
  children,
  as: Component = "span",
  className = "",
  role,
  id,
}: ScreenReaderOnlyProps) {
  return (
    <Component
      className={`sr-only ${className}`.trim()}
      role={role}
      id={id}
    >
      {children}
    </Component>
  );
}

/**
 * VisuallyHidden - Alias for ScreenReaderOnly
 * Some codebases prefer this naming convention
 */
export const VisuallyHidden = ScreenReaderOnly;

/**
 * ScreenReaderText - Static text for screen readers
 * Simple wrapper for inline screen reader content
 */
export function ScreenReaderText({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/**
 * ScreenReaderHeading - Hidden heading for section landmarks
 *
 * Provides section context for screen reader users without
 * affecting visual design. Important for navigation.
 */
export function ScreenReaderHeading({
  level = 2,
  children,
  id,
}: {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  id?: string;
}) {
  const Tag = `h${level}` as const;
  return (
    <Tag className="sr-only" id={id}>
      {children}
    </Tag>
  );
}

/**
 * DescribedBy - Provides accessible description for an element
 *
 * Usage:
 * ```tsx
 * <input aria-describedby="help-text" />
 * <DescribedBy id="help-text">Enter your age in years</DescribedBy>
 * ```
 */
export function DescribedBy({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <span id={id} className="sr-only">
      {children}
    </span>
  );
}

/**
 * AccessibleIcon - Icon with screen reader text
 *
 * Wraps icon components to provide accessible names.
 *
 * Usage:
 * ```tsx
 * <AccessibleIcon label="Settings">
 *   <SettingsIcon />
 * </AccessibleIcon>
 * ```
 */
export function AccessibleIcon({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{label}</span>
    </>
  );
}

/**
 * SkipToContent - Link to skip repetitive content
 *
 * Best practices:
 * - Place at the very beginning of the page
 * - Make visible on focus
 * - Link to main content landmark
 */
export function SkipToContent({
  targetId = "main-content",
  label = "Skip to main content",
}: {
  targetId?: string;
  label?: string;
}) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="
        sr-only focus:not-sr-only
        focus:absolute focus:top-4 focus:left-4 focus:z-[100]
        focus:px-4 focus:py-2
        focus:bg-blue-600 focus:text-white
        focus:rounded-md focus:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600
        font-medium text-sm
        transition-none
      "
    >
      {label}
    </a>
  );
}

/**
 * LoadingAnnouncement - Announces loading state to screen readers
 *
 * Use for async operations to inform users of progress.
 */
export function LoadingAnnouncement({
  isLoading,
  loadingMessage = "Loading...",
  completeMessage = "Loading complete",
}: {
  isLoading: boolean;
  loadingMessage?: string;
  completeMessage?: string;
}) {
  const [wasLoading, setWasLoading] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) {
      setWasLoading(true);
    }
  }, [isLoading]);

  if (!isLoading && !wasLoading) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {isLoading ? loadingMessage : wasLoading ? completeMessage : null}
    </div>
  );
}

/**
 * ErrorAnnouncement - Announces errors to screen readers
 *
 * Uses assertive live region for immediate attention.
 */
export function ErrorAnnouncement({
  error,
}: {
  error: string | null | undefined;
}) {
  if (!error) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    >
      Error: {error}
    </div>
  );
}

/**
 * FocusTrap - Traps focus within a container
 *
 * Essential for modal dialogs and dropdown menus.
 * Focus should not escape to content behind the modal.
 */
export function FocusTrap({
  children,
  active = true,
  returnFocusOnDeactivate = true,
}: {
  children: React.ReactNode;
  active?: boolean;
  returnFocusOnDeactivate?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!active) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (returnFocusOnDeactivate && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [active, returnFocusOnDeactivate]);

  return (
    <div ref={containerRef} tabIndex={-1}>
      {children}
    </div>
  );
}
