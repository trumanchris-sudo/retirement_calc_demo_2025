"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  TrendingUp,
  DollarSign,
  PiggyBank,
  ChevronRight,
  User,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { usePlanConfig } from "@/lib/plan-config-context";
import type { PlanConfig } from "@/types/plan-config";
import type { CalculationResult } from "@/types/calculator";

// ==================== Types ====================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  quickActions?: QuickAction[];
}

interface QuickAction {
  label: string;
  action: string;
  type: "adjust" | "learn" | "simulate";
  field?: keyof PlanConfig;
  value?: number | string | boolean;
}

interface FinancialCopilotProps {
  results: CalculationResult | null;
}

// ==================== Pre-built Questions ====================

const PRESET_QUESTIONS = [
  {
    icon: TrendingUp,
    label: "How can I retire earlier?",
    question: "How can I retire earlier than my current plan?",
    color: "text-emerald-500",
  },
  {
    icon: PiggyBank,
    label: "Should I contribute more to Roth?",
    question: "Should I contribute more to my Roth accounts instead of pre-tax?",
    color: "text-purple-500",
  },
  {
    icon: DollarSign,
    label: "What's my tax situation?",
    question: "Can you analyze my current tax situation and suggest optimizations?",
    color: "text-amber-500",
  },
];

// ==================== Helper Functions ====================

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildContextSummary(config: PlanConfig, results: CalculationResult | null): string {
  const isMarried = config.marital === "married";
  const totalContributions =
    config.cTax1 + config.cPre1 + config.cPost1 + config.cMatch1 +
    (isMarried ? config.cTax2 + config.cPre2 + config.cPost2 + config.cMatch2 : 0);
  const totalBalances = config.taxableBalance + config.pretaxBalance + config.rothBalance;

  let context = `CURRENT FINANCIAL SNAPSHOT:
- Age: ${config.age1}${isMarried ? `, Spouse: ${config.age2}` : ""}
- Target Retirement Age: ${config.retirementAge}
- Years to Retirement: ${config.retirementAge - config.age1}
- Marital Status: ${isMarried ? "Married" : "Single"}

INCOME:
- Primary Income: ${formatCurrency(config.primaryIncome)}/year
${isMarried ? `- Spouse Income: ${formatCurrency(config.spouseIncome || 0)}/year` : ""}
- Total Household Income: ${formatCurrency(config.primaryIncome + (config.spouseIncome || 0))}/year

CURRENT BALANCES:
- Taxable Brokerage: ${formatCurrency(config.taxableBalance)}
- Pre-tax (401k/IRA): ${formatCurrency(config.pretaxBalance)}
- Roth Accounts: ${formatCurrency(config.rothBalance)}
- Emergency Fund: ${formatCurrency(config.emergencyFund)}
- Total Investments: ${formatCurrency(totalBalances)}

ANNUAL CONTRIBUTIONS:
- Pre-tax: ${formatCurrency(config.cPre1 + (isMarried ? config.cPre2 : 0))}
- Roth: ${formatCurrency(config.cPost1 + (isMarried ? config.cPost2 : 0))}
- Taxable: ${formatCurrency(config.cTax1 + (isMarried ? config.cTax2 : 0))}
- Employer Match: ${formatCurrency(config.cMatch1 + (isMarried ? config.cMatch2 : 0))}
- Total Annual Savings: ${formatCurrency(totalContributions)}
- Savings Rate: ${((totalContributions / (config.primaryIncome + (config.spouseIncome || 0))) * 100).toFixed(1)}%

ASSUMPTIONS:
- Expected Return: ${config.retRate}%
- Inflation Rate: ${config.inflationRate}%
- State Tax Rate: ${config.stateRate}%
- Withdrawal Rate: ${config.wdRate}%
- Contribution Growth: ${config.incContrib ? `${config.incRate}%/year` : "Disabled"}

SOCIAL SECURITY:
- Included: ${config.includeSS ? "Yes" : "No"}
${config.includeSS ? `- Claim Age: ${config.ssClaimAge}` : ""}
${config.includeSS ? `- Avg Indexed Earnings: ${formatCurrency(config.ssIncome)}` : ""}`;

  if (results) {
    const ruinPct = results.probRuin !== undefined ? (results.probRuin * 100).toFixed(1) : "N/A";
    context += `

CALCULATION RESULTS:
- Balance at Retirement (Nominal): ${formatCurrency(results.finNom)}
- Balance at Retirement (Real): ${formatCurrency(results.finReal)}
- Year 1 Gross Withdrawal: ${formatCurrency(results.wd)}
- Year 1 After-Tax Income: ${formatCurrency(results.wdAfter)}
- Portfolio Survival: ${results.survYrs}/${results.yrsToSim} years
- End-of-Life Wealth (Real): ${formatCurrency(results.eolReal)}
- Monte Carlo Failure Rate: ${ruinPct}%
- Total Lifetime Tax: ${formatCurrency(results.tax?.tot || 0)}
- Net Estate: ${formatCurrency(results.netEstate)}`;
  }

  return context;
}

// ==================== Typing Indicator Component ====================

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
      </div>
      <span className="text-sm text-muted-foreground ml-2">Analyzing your finances...</span>
    </div>
  );
}

// ==================== Message Component ====================

interface MessageBubbleProps {
  message: Message;
  onQuickAction?: (action: QuickAction) => void;
}

function MessageBubble({ message, onQuickAction }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={cn("flex flex-col max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted rounded-tl-sm"
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Quick Actions */}
        {message.quickActions && message.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.quickActions.map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className={cn(
                  "text-xs h-8 px-3 gap-1.5 transition-all hover:scale-[1.02]",
                  action.type === "adjust" && "border-emerald-500/50 hover:bg-emerald-500/10 hover:border-emerald-500",
                  action.type === "learn" && "border-purple-500/50 hover:bg-purple-500/10 hover:border-purple-500",
                  action.type === "simulate" && "border-amber-500/50 hover:bg-amber-500/10 hover:border-amber-500"
                )}
                onClick={() => onQuickAction?.(action)}
              >
                {action.type === "adjust" && <TrendingUp className="w-3 h-3" />}
                {action.type === "learn" && <Sparkles className="w-3 h-3" />}
                {action.type === "simulate" && <RefreshCw className="w-3 h-3" />}
                {action.label}
                <ChevronRight className="w-3 h-3" />
              </Button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground mt-1.5 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export function FinancialCopilot({ results }: FinancialCopilotProps) {
  const { config, updateConfig } = usePlanConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Generate welcome message on first open
  const welcomeMessage = useMemo<Message>(() => ({
    id: "welcome",
    role: "assistant",
    content: `Hi! I'm your AI Financial Advisor. I have full context of your retirement plan and can help you optimize your strategy.

I can answer questions about:
- Retirement timing and savings goals
- Tax optimization (Roth vs Traditional)
- Withdrawal strategies
- Social Security timing
- Investment allocation

What would you like to explore?`,
    timestamp: Date.now(),
    quickActions: [
      { label: "Review my plan", action: "Can you give me a quick review of my current retirement plan?", type: "learn" },
      { label: "Find quick wins", action: "What are 3 quick wins I can implement right now to improve my retirement outlook?", type: "adjust" },
    ],
  }), []);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, welcomeMessage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Abort on close
  useEffect(() => {
    if (!isOpen) {
      abortRef.current?.abort();
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Add user message
      const userMessage: Message = {
        id: generateMessageId(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setError(null);
      setIsStreaming(true);

      // Prepare context-aware prompt
      const contextSummary = buildContextSummary(config, results);
      const conversationHistory = messages
        .slice(-10) // Last 10 messages for context
        .map((m) => `${m.role === "user" ? "User" : "Advisor"}: ${m.content}`)
        .join("\n\n");

      try {
        const res = await fetch("/api/ai-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            results,
            // Override prompt for copilot mode
            copilotMode: true,
            userQuestion: content.trim(),
            context: contextSummary,
            conversationHistory,
          }),
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

        // Create assistant message placeholder
        const assistantMessageId = generateMessageId();
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            timestamp: Date.now(),
          },
        ]);

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

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
                fullContent += event.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              } else if (event.type === "error") {
                setError(event.error);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        // Parse quick actions from response
        const quickActions = parseQuickActions(fullContent, config);
        if (quickActions.length > 0) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, quickActions } : m
            )
          );
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to get response");
      } finally {
        setIsStreaming(false);
      }
    },
    [config, results, messages, isStreaming]
  );

  // Parse response for actionable suggestions
  function parseQuickActions(content: string, currentConfig: PlanConfig): QuickAction[] {
    const actions: QuickAction[] = [];
    const lowerContent = content.toLowerCase();

    // Detect retirement age suggestions
    if (lowerContent.includes("retire earlier") || lowerContent.includes("retirement age")) {
      if (currentConfig.retirementAge > 55) {
        actions.push({
          label: `Try retiring at ${currentConfig.retirementAge - 3}`,
          action: "simulate",
          type: "simulate",
          field: "retirementAge",
          value: currentConfig.retirementAge - 3,
        });
      }
    }

    // Detect Roth conversion suggestions
    if (lowerContent.includes("roth") && (lowerContent.includes("convert") || lowerContent.includes("contribution"))) {
      actions.push({
        label: "Learn about Roth ladders",
        action: "Explain how Roth conversion ladders work and if they would benefit me",
        type: "learn",
      });
    }

    // Detect withdrawal rate suggestions
    if (lowerContent.includes("withdrawal rate") || lowerContent.includes("4% rule")) {
      if (currentConfig.wdRate > 3.5) {
        actions.push({
          label: "Try 3.5% withdrawal",
          action: "simulate",
          type: "simulate",
          field: "wdRate",
          value: 3.5,
        });
      }
    }

    // Detect contribution suggestions
    if (lowerContent.includes("increase") && lowerContent.includes("contribution")) {
      actions.push({
        label: "Max out contributions",
        action: "What would my projections look like if I maxed out all retirement accounts?",
        type: "simulate",
      });
    }

    // Detect Social Security suggestions
    if (lowerContent.includes("social security") && lowerContent.includes("delay")) {
      if (currentConfig.ssClaimAge < 70) {
        actions.push({
          label: `Delay SS to ${Math.min(currentConfig.ssClaimAge + 2, 70)}`,
          action: "simulate",
          type: "simulate",
          field: "ssClaimAge",
          value: Math.min(currentConfig.ssClaimAge + 2, 70),
        });
      }
    }

    return actions.slice(0, 3); // Max 3 actions
  }

  // Handle quick action clicks
  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      if (action.type === "simulate" && action.field && action.value !== undefined) {
        // Apply the configuration change
        updateConfig({ [action.field]: action.value } as Partial<PlanConfig>);
        // Send a follow-up message
        sendMessage(
          `I've changed ${action.field} to ${action.value}. How does this affect my retirement projections?`
        );
      } else if (action.type === "learn" || action.type === "adjust") {
        // Send the action as a question
        sendMessage(action.action);
      }
    },
    [updateConfig, sendMessage]
  );

  // Handle preset question click
  const handlePresetQuestion = useCallback(
    (question: string) => {
      sendMessage(question);
    },
    [sendMessage]
  );

  // Handle input submission
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input);
    },
    [input, sendMessage]
  );

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg",
          "bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700",
          "transition-all duration-300 hover:scale-110 hover:shadow-xl",
          isOpen && "scale-0 opacity-0"
        )}
        aria-label="Open Financial Advisor Chat"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        {/* Notification dot */}
        {!isOpen && messages.length === 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
        )}
      </Button>

      {/* Chat Panel - Slide up from bottom */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col",
          "bg-background border-t border-border shadow-2xl rounded-t-2xl",
          "transition-all duration-300 ease-out",
          "sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[420px] sm:h-[600px] sm:rounded-2xl sm:border",
          isOpen
            ? "h-[85vh] sm:h-[600px] translate-y-0 opacity-100"
            : "h-0 translate-y-full opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-600/10 to-indigo-600/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Financial Copilot</h2>
              <p className="text-xs text-muted-foreground">Your AI retirement advisor</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 rounded-full"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="flex flex-col min-h-full">
            {/* Messages */}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onQuickAction={handleQuickAction}
              />
            ))}

            {/* Typing Indicator */}
            {isStreaming && <TypingIndicator />}

            {/* Error Message */}
            {error && (
              <div className="px-4 py-2">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              </div>
            )}

            {/* Preset Questions (show when conversation is short) */}
            {messages.length <= 1 && !isStreaming && (
              <div className="px-4 py-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">
                  Popular Questions
                </p>
                {PRESET_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetQuestion(q.question)}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-3 rounded-xl",
                      "bg-muted/50 hover:bg-muted transition-colors text-left",
                      "border border-transparent hover:border-border"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-full bg-background flex items-center justify-center", q.color)}>
                      <q.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{q.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-background p-3">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your retirement..."
                disabled={isStreaming}
                rows={1}
                className={cn(
                  "w-full resize-none rounded-xl border bg-muted/50 px-4 py-3 pr-12",
                  "text-sm placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "max-h-32 min-h-[44px]"
                )}
                style={{
                  height: "auto",
                  minHeight: "44px",
                  maxHeight: "128px",
                }}
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={cn(
                "h-11 w-11 rounded-xl shrink-0",
                "bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700",
                "disabled:opacity-50"
              )}
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            AI advisor has full context of your retirement plan
          </p>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}

export default FinancialCopilot;
