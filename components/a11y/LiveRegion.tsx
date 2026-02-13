"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

interface LiveRegionContextType {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const LiveRegionContext = createContext<LiveRegionContextType | null>(null);

/**
 * useLiveRegion - Hook for announcing dynamic content to screen readers
 *
 * Usage:
 * ```tsx
 * const { announce } = useLiveRegion();
 * announce("Calculation complete. Your projected balance is $1,500,000.");
 * announce("Error: Please enter a valid age.", "assertive");
 * ```
 */
export function useLiveRegion() {
  const context = useContext(LiveRegionContext);
  if (!context) {
    // Return a no-op if used outside provider (for safety)
    return {
      announce: () => {
        console.warn("useLiveRegion used outside of LiveRegionProvider");
      },
    };
  }
  return context;
}

/**
 * LiveRegionProvider - Provides live region functionality to child components
 */
export function LiveRegionProvider({ children }: { children: React.ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState("");
  const [assertiveMessage, setAssertiveMessage] = useState("");
  const politeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const assertiveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    if (priority === "assertive") {
      // Clear previous timeout
      if (assertiveTimeoutRef.current) {
        clearTimeout(assertiveTimeoutRef.current);
      }
      // Clear then set (forces re-announcement)
      setAssertiveMessage("");
      requestAnimationFrame(() => {
        setAssertiveMessage(message);
      });
      // Clear after 5 seconds
      assertiveTimeoutRef.current = setTimeout(() => {
        setAssertiveMessage("");
      }, 5000);
    } else {
      if (politeTimeoutRef.current) {
        clearTimeout(politeTimeoutRef.current);
      }
      setPoliteMessage("");
      requestAnimationFrame(() => {
        setPoliteMessage(message);
      });
      politeTimeoutRef.current = setTimeout(() => {
        setPoliteMessage("");
      }, 5000);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (politeTimeoutRef.current) clearTimeout(politeTimeoutRef.current);
      if (assertiveTimeoutRef.current) clearTimeout(assertiveTimeoutRef.current);
    };
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      {/* Polite live region - for non-urgent updates */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      {/* Assertive live region - for urgent updates/errors */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
}

/**
 * LiveRegion - Standalone component for the root layout
 * Renders hidden live regions for screen reader announcements
 */
export function LiveRegion() {
  return (
    <>
      {/* These are placeholder regions that can be updated via DOM manipulation if needed */}
      <div
        id="live-region-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        id="live-region-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}

/**
 * announceToScreenReader - Utility function for announcing without React context
 *
 * Can be used anywhere, even outside React components.
 */
export function announceToScreenReader(message: string, priority: "polite" | "assertive" = "polite") {
  const regionId = priority === "assertive" ? "live-region-assertive" : "live-region-polite";
  const region = document.getElementById(regionId);
  if (region) {
    // Clear first to ensure re-announcement
    region.textContent = "";
    requestAnimationFrame(() => {
      region.textContent = message;
    });
    // Clear after 5 seconds
    setTimeout(() => {
      region.textContent = "";
    }, 5000);
  }
}
