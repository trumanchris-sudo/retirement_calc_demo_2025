"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Bug, RotateCcw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface AIReviewPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Collect a snapshot of the current page state for QA analysis */
function collectPageState() {
  try {
  return collectPageStateInner();
  } catch (err) {
    console.error('[QA Review] Error collecting page state:', err);
    return {
      url: window.location.href,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      activeTab: 'unknown',
      visibleSections: [] as string[],
      emptyContainers: [] as string[],
      consoleErrors: [`collectPageState crashed: ${err instanceof Error ? err.message : String(err)}`],
      consoleWarnings: [] as string[],
      missingImages: [] as string[],
      brokenLinks: [] as string[],
      accessibilityIssues: [] as string[],
      overflowingElements: [] as string[],
      hiddenButShouldShow: [] as string[],
      interactiveElements: [] as { tag: string; text: string; disabled: boolean; ariaLabel: string | null }[],
      colorContrastIssues: [] as string[],
      computedStyles: [] as string[],
      dataDisplayIssues: [] as string[],
      darkMode: false,
      onboardingVisible: false,
      chartsRendered: [] as string[],
      chartsMissing: [] as string[],
      formValidationErrors: [] as string[],
      componentTree: '',
      timestamp: new Date().toISOString(),
    };
  }
}

function collectPageStateInner() {
  function getClassName(el: Element): string {
    const cn = el.className;
    if (typeof cn === 'string') return cn;
    if (cn && typeof cn === 'object' && 'baseVal' in cn) return (cn as SVGAnimatedString).baseVal;
    return '';
  }

  const visibleSections: string[] = [];
  const emptyContainers: string[] = [];
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const missingImages: string[] = [];
  const brokenLinks: string[] = [];
  const accessibilityIssues: string[] = [];
  const overflowingElements: string[] = [];
  const colorContrastIssues: string[] = [];
  const dataDisplayIssues: string[] = [];
  const chartsRendered: string[] = [];
  const chartsMissing: string[] = [];
  const formValidationErrors: string[] = [];
  const interactiveElements: { tag: string; text: string; disabled: boolean; ariaLabel: string | null }[] = [];

  // Detect visible sections by looking for common landmark/section elements
  document.querySelectorAll("section, [role='tabpanel'], [data-testid], main, header, footer, [class*='tab-content']").forEach((el) => {
    const rect = el.getBoundingClientRect();
    const id = el.id || el.getAttribute("data-testid") || el.getAttribute("aria-label") || getClassName(el).split(" ").slice(0, 3).join(".");
    if (rect.height > 0) {
      visibleSections.push(`${el.tagName.toLowerCase()}#${id} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
    }
  });

  // Detect empty containers that might indicate missing content
  document.querySelectorAll("div, section").forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.height > 50 && rect.width > 100 && el.children.length === 0 && !el.textContent?.trim()) {
      const id = el.id || getClassName(el).split(" ").slice(0, 3).join(".");
      emptyContainers.push(`${el.tagName.toLowerCase()}.${id} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
    }
  });

  // Check for images that failed to load
  document.querySelectorAll("img").forEach((img) => {
    if (!img.complete || img.naturalHeight === 0) {
      missingImages.push(`<img src="${img.src}" alt="${img.alt || "MISSING ALT"}">`);
    }
  });

  // Check for broken/empty links
  document.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href === "#" || href === "") {
      brokenLinks.push(`<a> "${a.textContent?.trim().slice(0, 50)}" href="${href}"`);
    }
  });

  // Check accessibility issues
  document.querySelectorAll("button, input, select, textarea, a, [role='button']").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const text = el.textContent?.trim().slice(0, 40) || "";
    const ariaLabel = el.getAttribute("aria-label");
    const hasLabel = ariaLabel || text || el.getAttribute("title");

    if (!hasLabel) {
      accessibilityIssues.push(`${tag} with no accessible label (class: ${getClassName(el).split(" ").slice(0, 2).join(".")})`);
    }

    // Collect interactive elements
    interactiveElements.push({
      tag,
      text: text.slice(0, 30),
      disabled: (el as HTMLButtonElement).disabled || false,
      ariaLabel: ariaLabel,
    });
  });

  // Check for inputs without labels
  document.querySelectorAll("input, select, textarea").forEach((el) => {
    const input = el as HTMLInputElement;
    const id = input.id;
    const ariaLabel = input.getAttribute("aria-label");
    const ariaLabelledBy = input.getAttribute("aria-labelledby");
    const hasAssociatedLabel = id ? document.querySelector(`label[for="${id}"]`) : false;

    if (!ariaLabel && !ariaLabelledBy && !hasAssociatedLabel) {
      accessibilityIssues.push(`<${input.tagName.toLowerCase()} type="${input.type}" name="${input.name}"> missing label association`);
    }
  });

  // Check for overflowing elements
  document.querySelectorAll("*").forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.scrollWidth > htmlEl.clientWidth + 5 && htmlEl.clientWidth > 0) {
      const id = htmlEl.id || getClassName(htmlEl).split(" ").slice(0, 2).join(".");
      if (htmlEl.tagName !== "HTML" && htmlEl.tagName !== "BODY") {
        overflowingElements.push(`${htmlEl.tagName.toLowerCase()}.${id} overflows horizontally (scrollW=${htmlEl.scrollWidth} > clientW=${htmlEl.clientWidth})`);
      }
    }
  });

  // Detect charts (canvas, svg with chart-like content)
  document.querySelectorAll("canvas").forEach((canvas) => {
    const rect = canvas.getBoundingClientRect();
    const parent = canvas.closest("[class*='chart'], [class*='Chart'], [data-testid]");
    const label = parent?.getAttribute("aria-label") || (parent ? getClassName(parent) : '').split(" ").slice(0, 2).join(".") || "unnamed-canvas";
    if (rect.height > 10 && rect.width > 10) {
      chartsRendered.push(`canvas: ${label} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
    } else {
      chartsMissing.push(`canvas: ${label} (${Math.round(rect.width)}x${Math.round(rect.height)}) - appears collapsed or hidden`);
    }
  });

  // Check SVG-based charts (recharts, d3, etc.)
  document.querySelectorAll(".recharts-wrapper, .recharts-responsive-container, svg.recharts-surface").forEach((el) => {
    const rect = el.getBoundingClientRect();
    const parent = el.closest("[class*='chart'], [class*='Chart'], [data-testid], section");
    const label = parent?.getAttribute("aria-label") || parent?.id || getClassName(el).split(" ").slice(0, 2).join(".");
    if (rect.height > 10 && rect.width > 10) {
      chartsRendered.push(`recharts: ${label} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
    } else {
      chartsMissing.push(`recharts: ${label} (${Math.round(rect.width)}x${Math.round(rect.height)}) - appears collapsed or hidden`);
    }
  });

  // Check for form validation issues
  document.querySelectorAll("input:invalid, select:invalid, textarea:invalid").forEach((el) => {
    const input = el as HTMLInputElement;
    formValidationErrors.push(`<${input.tagName.toLowerCase()} name="${input.name}" type="${input.type}"> validation: ${input.validationMessage}`);
  });

  // Check for data display issues (NaN, undefined, null rendered as text)
  const bodyText = document.body.innerText || "";
  const nanMatches = bodyText.match(/\bNaN\b/g);
  const undefinedMatches = bodyText.match(/\bundefined\b/g);
  const nullMatches = bodyText.match(/\bnull\b/g);
  if (nanMatches) dataDisplayIssues.push(`"NaN" appears ${nanMatches.length} time(s) in page text`);
  if (undefinedMatches) dataDisplayIssues.push(`"undefined" appears ${undefinedMatches.length} time(s) in page text`);
  if (nullMatches) dataDisplayIssues.push(`"null" appears ${nullMatches.length} time(s) in page text`);

  // Check for $0 or $NaN in financial displays
  document.querySelectorAll("[class*='amount'], [class*='value'], [class*='balance'], [class*='result']").forEach((el) => {
    const text = el.textContent?.trim() || "";
    if (text.includes("$NaN") || text.includes("$undefined")) {
      dataDisplayIssues.push(`Invalid financial value "${text}" in ${getClassName(el).split(" ").slice(0, 2).join(".")}`);
    }
  });

  // Build a simplified component tree
  const activeTab = document.querySelector("[data-state='active'][role='tabpanel']")?.getAttribute("aria-label")
    || document.querySelector("[data-state='active'][role='tab']")?.textContent?.trim()
    || "unknown";

  const darkMode = document.documentElement.classList.contains("dark")
    || document.body.classList.contains("dark")
    || window.matchMedia("(prefers-color-scheme: dark)").matches;

  const onboardingVisible = !!document.querySelector("[class*='onboarding'], [data-testid*='onboarding'], [class*='Onboarding']");

  // Build component tree summary
  const componentTree = Array.from(document.querySelectorAll("[data-testid], [role='tabpanel'], main, section, header, footer"))
    .map((el) => {
      const tag = el.tagName.toLowerCase();
      const id = el.getAttribute("data-testid") || el.id || "";
      const role = el.getAttribute("role") || "";
      const rect = el.getBoundingClientRect();
      const visible = rect.height > 0 && rect.width > 0;
      return `${tag}${id ? `[data-testid="${id}"]` : ""}${role ? `[role="${role}"]` : ""} visible=${visible}`;
    })
    .join("\n  ");

  return {
    url: window.location.href,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    activeTab,
    visibleSections: visibleSections.slice(0, 30),
    emptyContainers: emptyContainers.slice(0, 15),
    consoleErrors,
    consoleWarnings,
    missingImages,
    brokenLinks: brokenLinks.slice(0, 10),
    accessibilityIssues: accessibilityIssues.slice(0, 20),
    overflowingElements: overflowingElements.slice(0, 10),
    hiddenButShouldShow: [] as string[],
    interactiveElements: interactiveElements.slice(0, 25),
    colorContrastIssues,
    computedStyles: [] as string[],
    dataDisplayIssues,
    darkMode,
    onboardingVisible,
    chartsRendered,
    chartsMissing,
    formValidationErrors: formValidationErrors.slice(0, 10),
    componentTree,
    timestamp: new Date().toISOString(),
  };
}

export function AIReviewPanel({
  open,
  onOpenChange,
}: AIReviewPanelProps) {
  const [reviewText, setReviewText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const consoleErrorsRef = useRef<string[]>([]);
  const consoleWarningsRef = useRef<string[]>([]);

  // Capture console errors and warnings
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: unknown[]) => {
      consoleErrorsRef.current.push(args.map(String).join(" ").slice(0, 200));
      if (consoleErrorsRef.current.length > 50) consoleErrorsRef.current.shift();
      originalError.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
      consoleWarningsRef.current.push(args.map(String).join(" ").slice(0, 200));
      if (consoleWarningsRef.current.length > 50) consoleWarningsRef.current.shift();
      originalWarn.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const runReview = useCallback(async () => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setReviewText("");
    setError(null);
    setIsStreaming(true);

    try {
      // Collect page state snapshot
      const pageState = collectPageState();
      // Inject captured console errors/warnings
      pageState.consoleErrors = [...consoleErrorsRef.current];
      pageState.consoleWarnings = [...consoleWarningsRef.current];

      const res = await fetch("/api/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageState }),
        signal: controller.signal,
      });

      // Handle non-streaming error responses
      if (res.headers.get("Content-Type")?.includes("application/json")) {
        const json = await res.json();
        setError(json.error || "Unknown error");
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response stream");
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const match = line.match(/^data: (.+)$/);
          if (!match) continue;

          try {
            const event = JSON.parse(match[1]);
            if (event.type === "text") {
              setReviewText((prev) => prev + event.text);
            } else if (event.type === "error") {
              setError(event.error);
            } else if (event.type === "done") {
              // Stream complete
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch review");
    } finally {
      setIsStreaming(false);
    }
  }, []);

  // Auto-run review when panel opens
  useEffect(() => {
    if (open && !reviewText && !isStreaming) {
      runReview();
    }
  }, [open, reviewText, isStreaming, runReview]);

  // Abort on close
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
    }
  }, [open]);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [reviewText, isStreaming]);

  // Reset state when panel closes
  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setReviewText("");
      setError(null);
      setIsStreaming(false);
    }
    onOpenChange(value);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reviewText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col"
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-orange-500" />
            QA Review (Beta)
          </SheetTitle>
          <SheetDescription>
            AI-powered page analysis: UI bugs, rendering issues, accessibility problems, and more
          </SheetDescription>
        </SheetHeader>

        {/* Action bar */}
        <div className="flex items-center gap-2 py-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={runReview}
            disabled={isStreaming}
          >
            <RotateCcw
              className={cn("w-3.5 h-3.5 mr-1.5", isStreaming && "animate-spin")}
            />
            {isStreaming ? "Scanning..." : "Re-scan Page"}
          </Button>
          {reviewText && (
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
        </div>

        {/* Review content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono"
        >
          {error ? (
            <div className="text-destructive">{error}</div>
          ) : reviewText ? (
            <>
              {reviewText}
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-orange-500 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </>
          ) : isStreaming ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Bug className="w-4 h-4 animate-pulse" />
              Scanning page for issues...
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
