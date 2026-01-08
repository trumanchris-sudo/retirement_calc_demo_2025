/**
 * AI Documentation Mode
 *
 * Secret feature to generate a complete visual documentation of the entire site
 * for AI review (ChatGPT, Claude, etc.) without needing live site access.
 *
 * Trigger: Press Ctrl+Shift+D (or Cmd+Shift+D on Mac)
 *
 * What it does:
 * - Automatically runs calculations if not already done
 * - Expands ALL tabs simultaneously in a single scrollable view
 * - Shows wizard flow from start to finish
 * - Shows all calculator sections with results
 * - Optimized for screenshot capture or Save as PDF
 */

'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AIDocModeProps {
  isActive: boolean;
  onClose: () => void;
  triggerCalc: () => void;
  hasResults: boolean;
  children: React.ReactNode; // The full site content
}

export function AIDocumentationMode({
  isActive,
  onClose,
  triggerCalc,
  hasResults,
  children,
}: AIDocModeProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isActive && !hasResults) {
      // Auto-run calculations if not already done
      setIsGenerating(true);
      console.log('[AI Doc Mode] Auto-running calculations...');
      triggerCalc();
      setTimeout(() => setIsGenerating(false), 2000);
    }
  }, [isActive, hasResults, triggerCalc]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 overflow-auto">
      {/* Header with instructions */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg z-10 print:hidden">
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">
              🤖 AI Documentation Mode
            </h1>
            <p className="text-sm opacity-90 mb-3">
              Complete visual documentation of the entire calculator for AI review.
              All tabs, wizard steps, and calculations are shown below in a single scrollable page.
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="bg-white/20 rounded px-3 py-1">
                📸 <strong>Screenshot:</strong> Scroll and capture sections
              </div>
              <div className="bg-white/20 rounded px-3 py-1">
                📄 <strong>Save as PDF:</strong> Ctrl/Cmd+P → Save as PDF → Include all pages
              </div>
              <div className="bg-white/20 rounded px-3 py-1">
                ⌨️ <strong>Exit:</strong> Press Ctrl+Shift+D again or click Close
              </div>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
            className="shrink-0"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isGenerating && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 print:hidden">
          <div className="max-w-7xl mx-auto">
            <p className="text-yellow-800 dark:text-yellow-200">
              ⏳ Running calculations... Page will update in a moment.
            </p>
          </div>
        </div>
      )}

      {/* Main content - all tabs expanded */}
      <div className="ai-doc-mode-content">
        {children}
      </div>

      {/* Footer */}
      <div className="bg-slate-100 dark:bg-slate-900 border-t p-6 text-center text-sm text-slate-600 dark:text-slate-400 print:hidden">
        <p>Press <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded">Ctrl+Shift+D</kbd> to exit documentation mode</p>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        .ai-doc-mode-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        /* Show all tabs expanded */
        .ai-doc-mode-content [role="tabpanel"] {
          display: block !important;
          opacity: 1 !important;
          height: auto !important;
          overflow: visible !important;
        }

        /* Add section separators */
        .ai-doc-mode-content [role="tabpanel"] {
          page-break-before: auto;
          page-break-after: auto;
          page-break-inside: avoid;
          margin-bottom: 3rem;
          padding-bottom: 3rem;
          border-bottom: 3px solid #e5e7eb;
        }

        /* Add tab labels */
        .ai-doc-mode-content [role="tabpanel"]::before {
          content: attr(aria-label);
          display: block;
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: linear-gradient(to right, #3b82f6, #8b5cf6);
          color: white;
          border-radius: 0.5rem;
        }

        /* Print optimization */
        @media print {
          .ai-doc-mode-content {
            max-width: none;
          }

          .ai-doc-mode-content [role="tabpanel"] {
            page-break-inside: avoid;
          }

          /* Ensure charts and images print */
          canvas, img {
            max-width: 100% !important;
            page-break-inside: avoid;
          }
        }

        /* Show hidden elements that are important */
        .ai-doc-mode-content .print\\:block {
          display: block !important;
        }

        .ai-doc-mode-content .print\\:hidden {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

/**
 * Hook to manage AI Documentation Mode
 */
export function useAIDocMode() {
  const [isDocMode, setIsDocMode] = useState(false);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ctrl+Shift+D or Cmd+Shift+D
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsDocMode((prev) => !prev);
        console.log('[AI Doc Mode]', !isDocMode ? 'ACTIVATED' : 'DEACTIVATED');
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isDocMode]);

  return {
    isDocMode,
    activateDocMode: () => setIsDocMode(true),
    deactivateDocMode: () => setIsDocMode(false),
  };
}
