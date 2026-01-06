'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { streamAIOnboarding } from '@/lib/ai-onboarding';
import type {
  ConversationMessage,
  ExtractedData,
  AssumptionWithReasoning,
  ConversationPhase,
  AIOnboardingState,
} from '@/types/ai-onboarding';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';
import { AssumptionsReview } from './AssumptionsReview';
import { ConsoleInput } from './ConsoleInput';
import { DataSummaryPanel } from './DataSummaryPanel';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';

interface AIConsoleProps {
  onComplete: (data: ExtractedData, assumptions: AssumptionWithReasoning[]) => void;
  onSkip: () => void;
}

const STORAGE_KEY = 'ai_onboarding_state';

export function AIConsole({ onComplete, onSkip }: AIConsoleProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [assumptions, setAssumptions] = useState<AssumptionWithReasoning[]>([]);
  const [phase, setPhase] = useState<ConversationPhase>('greeting');
  const [error, setError] = useState<string | null>(null);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage, scrollToBottom]);

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

  // Initial greeting - use pre-scripted message for speed
  const startGreeting = async () => {
    console.log('[AIConsole] Starting greeting...');

    // Show instant pre-scripted greeting
    const greetingMessage = `Hello! I'm here to help you set up your retirement calculator. I'll ask you a few questions about your financial situation, and we'll build a personalized plan together.

Let's start with the basics. Please provide:
1. Your age
2. Marital status (single or married)
3. Annual income
4. Current retirement savings (401k, IRA, etc.)
5. Target retirement age

You can answer in any format - I'll understand!`;

    setMessages([
      { role: 'assistant', content: greetingMessage, timestamp: Date.now() },
    ]);
    setPhase('data-collection');
    setIsStreaming(false);
  };

  // Send user message
  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ConversationMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);
    setError(null);

    console.log('[AIConsole] Sending message:', { phase, messageCount: newMessages.length });

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      let fullResponse = '';

      let capturedPhase = phase;

      await streamAIOnboarding({
        messages: newMessages,
        extractedData,
        assumptions,
        phase,
        onMessageDelta: (delta) => {
          fullResponse += delta;
          setCurrentStreamingMessage(fullResponse);
        },
        onDataUpdate: (field, value) => {
          setExtractedData((prev) => ({ ...prev, [field]: value }));
        },
        onAssumptionAdded: (assumption) => {
          setAssumptions((prev) => [...prev, assumption]);
        },
        onPhaseTransition: (newPhase) => {
          capturedPhase = newPhase;
          setPhase(newPhase);
        },
        onComplete: (data, finalAssumptions) => {
          // Add assistant's complete message
          if (fullResponse) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: fullResponse, timestamp: Date.now() },
            ]);
          }
          setCurrentStreamingMessage('');
          setIsStreaming(false);

          // If phase is complete, trigger onComplete callback
          if (capturedPhase === 'complete') {
            handleComplete(data, finalAssumptions);
          }
        },
        onError: (err) => {
          console.error('[AIConsole] Send message error:', err);
          // Don't remove user's message on error so they can retry
          setError(err);
          setIsStreaming(false);
          setCurrentStreamingMessage('');
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      console.error('[AIConsole] Send message exception:', errorMessage);
      // Restore input so user can edit and retry
      setInput(userMessage.content);
      // Remove the user message that failed
      setMessages(messages);
      setError(errorMessage);
      setIsStreaming(false);
      setCurrentStreamingMessage('');
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

          {currentStreamingMessage && (
            <StreamingMessage content={currentStreamingMessage} />
          )}

          {showAssumptionsReview && assumptions.length > 0 && (
            <AssumptionsReview
              assumptions={assumptions}
              onRefine={(refinement) => {
                setInput(refinement);
                inputRef.current?.focus();
              }}
            />
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
            disabled={isStreaming}
            placeholder={
              isStreaming
                ? 'Thinking...'
                : phase === 'complete'
                ? 'Onboarding complete!'
                : 'Type your response...'
            }
          />
          {isStreaming && (
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-300" role="status" aria-live="polite">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>{messages.length === 0 ? 'Loading...' : 'Processing your response...'}</span>
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
