'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { processAIOnboarding, type MissingField } from '@/lib/processAIOnboarding';
import type {
  ConversationMessage,
  ExtractedData,
  AssumptionWithReasoning,
  ConversationPhase,
  AIOnboardingState,
} from '@/types/ai-onboarding';
import { MessageBubble } from './MessageBubble';
import { AssumptionsReview } from './AssumptionsReview';
import { ConsoleInput } from './ConsoleInput';
import { DataSummaryPanel } from './DataSummaryPanel';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface AIConsoleProps {
  onComplete: (data: ExtractedData, assumptions: AssumptionWithReasoning[]) => void;
  onSkip: () => void;
}

const STORAGE_KEY = 'ai_onboarding_state';

export function AIConsole({ onComplete, onSkip }: AIConsoleProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [input, setInput] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [assumptions, setAssumptions] = useState<AssumptionWithReasoning[]>([]);
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [hasProcessed, setHasProcessed] = useState(false);
  const [phase, setPhase] = useState<ConversationPhase>('greeting');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const state: AIOnboardingState = JSON.parse(savedState);
        setMessages(state.conversationHistory);
        setExtractedData(state.extractedData);
        setAssumptions(state.assumptions);
        setPhase(state.currentPhase);
        console.log('[AIConsole] Restored state from localStorage');
      } catch (e) {
        console.error('[AIConsole] Failed to load saved onboarding state:', e);
        // Clear invalid state and start fresh
        localStorage.removeItem(STORAGE_KEY);
        startGreeting();
      }
    } else {
      console.log('[AIConsole] Starting new onboarding session');
      // Start with greeting if no saved state
      startGreeting();
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state: AIOnboardingState = {
      conversationHistory: messages,
      extractedData,
      assumptions,
      currentPhase: phase,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [messages, extractedData, assumptions, phase]);

  // Initial greeting - start sequential conversation
  const startGreeting = async () => {
    console.log('[AIConsole] Starting greeting...');

    // Show instant pre-scripted greeting with first question
    const greetingMessage = `Hello! I'm here to help you set up your retirement calculator. I'll ask you questions one at a time to make this easy.

Let's start with the basics: **What is your age and marital status?** (single or married)`;

    setMessages([
      { role: 'assistant', content: greetingMessage, timestamp: Date.now() },
    ]);
    setPhase('data-collection');
  };

  // Send user message and auto-trigger AI processing
  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: ConversationMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Auto-trigger AI processing (sequential conversation)
    await handleProcess();
  };

  // Process conversation with AI (sequential mode)
  const handleProcess = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);
    setHasProcessed(true);

    console.log('[AIConsole] Processing conversation...');

    try {
      // Send full conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // API call with conversation history
      const result = await processAIOnboarding({
        conversationHistory,
        extractedData, // Include what we've collected so far
      });

      console.log('[AIConsole] Processing complete', {
        fieldsExtracted: Object.keys(result.extractedData).length,
        assumptionsMade: result.assumptions.length,
        missingFieldsCount: result.missingFields.length,
      });

      setExtractedData(result.extractedData);
      setAssumptions(result.assumptions);
      setMissingFields(result.missingFields);

      // Determine phase based on results
      if (result.missingFields.length > 0) {
        setPhase('data-collection'); // Continue collection

        // Add AI's next question
        const nextQuestion: ConversationMessage = {
          role: 'assistant',
          content: result.nextQuestion || result.summary,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, nextQuestion]);
      } else {
        setPhase('assumptions-review'); // Move to review

        // Add completion message
        const completionMessage: ConversationMessage = {
          role: 'assistant',
          content: result.summary,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, completionMessage]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process responses';
      console.error('[AIConsole] Processing error:', errorMessage);
      setError(errorMessage);
      setPhase('data-collection');
      setHasProcessed(false); // Allow retry
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = (data: ExtractedData, finalAssumptions: AssumptionWithReasoning[]) => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    // Call parent completion handler
    onComplete(data, finalAssumptions);
  };

  const handleSkip = () => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    onSkip();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Show assumptions review when in assumptions-review phase
  const showAssumptionsReview = phase === 'assumptions-review' || phase === 'refinement';

  return (
    <div
      className="fixed inset-0 md:flex md:flex-row bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      role="main"
      aria-label="AI-powered retirement planning onboarding"
    >
      {/* Main Console */}
      <div className="h-full w-full md:flex-1 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-3 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-100">Retirement Planning Console</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {phase === 'greeting' && 'Initializing...'}
              {phase === 'data-collection' && 'Gathering information'}
              {phase === 'assumptions-review' && 'Reviewing assumptions'}
              {phase === 'refinement' && 'Refining your plan'}
              {phase === 'complete' && 'Complete'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-xs sm:text-sm min-h-[44px] px-4"
            aria-label="Skip AI onboarding and proceed to manual data entry"
          >
            <span className="hidden sm:inline">Skip to Manual Entry</span>
            <span className="sm:hidden">Skip</span>
          </Button>
        </div>

        {/* Messages Area - Scrollable */}
        <div
          className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4"
          role="log"
          aria-live="polite"
          aria-label="Conversation messages"
        >
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="sticky top-0 z-10 bg-red-950 border-2 border-red-600 rounded-lg p-4 sm:p-6 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="text-white text-xl font-bold">!</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-red-100">Connection Error</p>
                  <p className="text-sm sm:text-base mt-2 text-red-100">{error}</p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => {
                        setError(null);
                        startGreeting();
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white min-h-[44px] px-4"
                      aria-label="Retry connecting to AI assistant"
                    >
                      Retry
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setError(null)}
                      className="text-red-200 border-red-600 hover:bg-red-900 min-h-[44px] px-4"
                      aria-label="Dismiss error message"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble key={`${message.timestamp}-${index}`} message={message} />
          ))}

          {showAssumptionsReview && assumptions.length > 0 && (
            <>
              <AssumptionsReview
                assumptions={assumptions}
                onRefine={(refinement) => {
                  setPhase('data-collection');
                  const refinementMsg: ConversationMessage = {
                    role: 'user',
                    content: refinement,
                    timestamp: Date.now(),
                  };
                  setMessages((prev) => [...prev, refinementMsg]);
                }}
              />
              <div className="flex justify-center gap-4 py-4">
                <Button
                  onClick={() => {
                    setPhase('complete');
                    handleComplete(extractedData, assumptions);
                  }}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white min-h-[48px] px-6"
                  aria-label="Confirm and complete onboarding"
                >
                  Looks Good - Continue
                </Button>
                <Button
                  onClick={handleProcess}
                  variant="outline"
                  className="min-h-[48px] px-6"
                  aria-label="Reprocess responses with refinements"
                >
                  Reprocess
                </Button>
              </div>
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-slate-800 bg-slate-950 backdrop-blur p-3 sm:p-4">
          <ConsoleInput
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            disabled={isProcessing || phase === 'complete'}
            placeholder={
              isProcessing
                ? 'Processing...'
                : phase === 'complete'
                ? 'Onboarding complete!'
                : phase === 'assumptions-review'
                ? 'Reviewing assumptions...'
                : 'Type your response...'
            }
          />
          {isProcessing && (
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-300" role="status" aria-live="polite">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Analyzing your responses and generating smart assumptions...</span>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel - Data Summary - Hidden on mobile, visible on desktop */}
      <div className="hidden md:block md:w-80 border-l border-slate-800">
        <DataSummaryPanel extractedData={extractedData} assumptions={assumptions} />
      </div>
    </div>
  );
}
