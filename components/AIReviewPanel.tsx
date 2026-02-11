"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Bot, RotateCcw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { PlanConfig } from "@/types/plan-config";
import type { CalculationResult } from "@/types/calculator";

interface AIReviewPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PlanConfig;
  results: CalculationResult | null;
}

export function AIReviewPanel({
  open,
  onOpenChange,
  config,
  results,
}: AIReviewPanelProps) {
  const [reviewText, setReviewText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runReview = useCallback(async () => {
    if (!results) return;

    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setReviewText("");
    setError(null);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, results }),
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
  }, [config, results]);

  // Auto-run review when panel opens with results
  useEffect(() => {
    if (open && results && !reviewText && !isStreaming) {
      runReview();
    }
  }, [open, results, reviewText, isStreaming, runReview]);

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
            <Bot className="w-5 h-5 text-purple-500" />
            AI Plan Review
          </SheetTitle>
          <SheetDescription>
            Opus 4.6 analysis of your retirement plan configuration and results
          </SheetDescription>
        </SheetHeader>

        {!results ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center px-4">
            Run a calculation first, then open this panel to get an AI review.
          </div>
        ) : (
          <>
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
                {isStreaming ? "Analyzing..." : "Re-run Review"}
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
              className="flex-1 overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap"
            >
              {error ? (
                <div className="text-destructive">{error}</div>
              ) : reviewText ? (
                <>
                  {reviewText}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </>
              ) : isStreaming ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bot className="w-4 h-4 animate-pulse" />
                  Starting analysis...
                </div>
              ) : null}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
