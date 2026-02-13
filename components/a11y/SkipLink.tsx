"use client";

import React from "react";

/**
 * SkipLink - Accessibility component for keyboard navigation
 *
 * Allows keyboard users to skip directly to main content,
 * bypassing navigation and other repetitive elements.
 *
 * Hidden by default, becomes visible on focus.
 */
export function SkipLink() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href="#main-content"
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
      Skip to main content
    </a>
  );
}
