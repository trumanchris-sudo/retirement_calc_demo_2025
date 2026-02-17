"use client"

import React from "react";

export interface AIDocModeProps {
  /** Whether AI Doc Mode is currently active */
  isActive: boolean;
  /** Callback to close/toggle off AI Doc Mode */
  onToggle: () => void;
  /** Whether calculator results are available */
  hasResults: boolean;
}

/**
 * AI Documentation Mode overlay header and global styles.
 *
 * When activated (Ctrl+Shift+D), this renders:
 * 1. A sticky banner with instructions and a close button
 * 2. Global CSS that forces all tab panels visible for AI screenshot/PDF capture
 * 3. A loading indicator when calculation results are pending
 *
 * The keyboard shortcut listener and auto-calc side effect remain in the parent
 * page component because they depend on app-level state and the calc() function.
 */
export function AIDocMode({ isActive, onToggle, hasResults }: AIDocModeProps) {
  if (!isActive) {
    return null;
  }

  return (
    <>
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg z-50 print:hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">
                AI Documentation Mode
              </h1>
              <p className="text-sm opacity-90 mb-3">
                All calculator tabs expanded below for AI review. Scroll to see everything or Save as PDF (Ctrl/Cmd+P).
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="bg-white/20 rounded px-2 py-1">
                  Screenshot sections as needed
                </div>
                <div className="bg-white/20 rounded px-2 py-1">
                  Ctrl/Cmd+P to Save as PDF
                </div>
                <div className="bg-white/20 rounded px-2 py-1">
                  Ctrl+Shift+D to exit
                </div>
              </div>
            </div>
            <button
              onClick={onToggle}
              aria-label="Close AI Documentation Mode"
              className="shrink-0 bg-white/20 hover:bg-white/30 rounded px-3 py-1.5 text-sm font-medium transition-colors min-h-[44px]"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Global styles for doc mode — forces all tab panels visible */}
      <style jsx global>{`
        .ai-doc-mode-active [role="tabpanel"] {
          display: block !important;
          opacity: 1 !important;
          height: auto !important;
          overflow: visible !important;
          margin-bottom: 4rem;
          padding-bottom: 4rem;
          border-bottom: 3px solid #e5e7eb;
          page-break-inside: avoid;
        }

        .ai-doc-mode-active [role="tabpanel"]:last-child {
          border-bottom: none;
        }

        /* Hide tab navigation in doc mode */
        .ai-doc-mode-active [role="tablist"] {
          display: none !important;
        }

        @media print {
          .ai-doc-mode-active [role="tabpanel"] {
            page-break-inside: avoid;
          }

          .ai-doc-mode-active canvas,
          .ai-doc-mode-active img {
            max-width: 100% !important;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {!hasResults && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mx-4 mt-4 print:hidden">
          <p className="text-yellow-800">
            Running calculations... Page will update in a moment.
          </p>
        </div>
      )}
    </>
  );
}
