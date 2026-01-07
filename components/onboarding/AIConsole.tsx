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
  const [questionIndex, setQuestionIndex] = useState(0); // Track which pre-scripted question we're on

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

  // Pre-scripted questions (no API calls needed for these)
  const getNextQuestion = (qIndex: number, currentData: ExtractedData): string | null => {
    // Check if married from current data
    const isMarried = currentData.maritalStatus === 'married';

    switch (qIndex) {
      case 0:
        return "Let's start with the basics: **What is your age and are you single or married?**";
      case 1:
        return isMarried
          ? "Great! Now let's talk income. **What's your annual income, and what's your spouse's annual income?** (Just rough numbers are fine!)"
          : "Got it! Now let's talk income. **What's your annual income?** (Just a rough number is fine!)";
      case 2:
        return "Perfect! Now, **what are your current account balances?**\n\n• Traditional IRA/401k\n• Roth IRA/401k\n• Taxable brokerage\n• Savings/emergency fund\n\n(Just give me the numbers - $0 is fine if you don't have one!)";
      default:
        return null; // No more pre-scripted questions, will call API
    }
  };

  // Simple client-side parsing of user responses
  const parseUserResponse = (userInput: string, qIndex: number, currentData: ExtractedData): Partial<ExtractedData> => {
    const input = userInput.toLowerCase();
    const extracted: Partial<ExtractedData> = {};

    // Parse numbers from input
    const numbers = userInput.match(/\$?[\d,]+k?/gi)?.map(n => {
      const cleaned = n.replace(/[$,]/g, '');
      if (cleaned.endsWith('k')) {
        return parseFloat(cleaned.slice(0, -1)) * 1000;
      }
      return parseFloat(cleaned);
    }) || [];

    switch (qIndex) {
      case 0: // Age and marital status
        // Extract age (first number in response)
        if (numbers.length > 0) {
          extracted.age = numbers[0];
        }
        // Extract marital status
        if (input.includes('married')) {
          extracted.maritalStatus = 'married';
        } else if (input.includes('single')) {
          extracted.maritalStatus = 'single';
        }
        break;

      case 1: // Income
        if (numbers.length > 0) {
          extracted.annualIncome1 = numbers[0];
        }
        if (numbers.length > 1 && currentData.maritalStatus === 'married') {
          extracted.annualIncome2 = numbers[1];
        }
        // Assume W2 employment by default
        extracted.employmentType1 = 'w2';
        if (currentData.maritalStatus === 'married') {
          extracted.employmentType2 = 'w2';
        }
        break;

      case 2: // Account balances
        // Try to extract 4 numbers: traditional, roth, taxable, cash
        if (numbers.length >= 1) extracted.currentTraditional = numbers[0];
        if (numbers.length >= 2) extracted.currentRoth = numbers[1];
        if (numbers.length >= 3) extracted.currentTaxable = numbers[2];
        if (numbers.length >= 4) extracted.currentCash = numbers[3];
        break;
    }

    return extracted;
  };

  // Initial greeting - start sequential conversation
  const startGreeting = async () => {
    console.log('[AIConsole] Starting greeting...');

    // Show instant pre-scripted greeting with first question
    const greetingMessage = `Hello! I'm here to help you set up your retirement calculator. I'll ask you a few questions to get started.

${getNextQuestion(0, {})}`;

    setMessages([
      { role: 'assistant', content: greetingMessage, timestamp: Date.now() },
    ]);
    setQuestionIndex(0);
    setPhase('data-collection');
  };

  // Send user message and handle next step (question or API call)
  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userInput = input.trim();
    const userMessage: ConversationMessage = {
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Parse user's response and extract data
    const parsed = parseUserResponse(userInput, questionIndex, extractedData);
    const updatedData = { ...extractedData, ...parsed };
    setExtractedData(updatedData);

    console.log('[AIConsole] Parsed data:', parsed, 'Updated data:', updatedData);

    // Check if we have more pre-scripted questions
    const nextQ = getNextQuestion(questionIndex + 1, updatedData);

    if (nextQ) {
      // Ask next pre-scripted question (no API call)
      const nextMessage: ConversationMessage = {
        role: 'assistant',
        content: nextQ,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, nextMessage]);
      setQuestionIndex(questionIndex + 1);
    } else {
      // All basic questions answered - now call API to process everything
      await handleProcess();
    }
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
          className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4 pb-32 space-y-3 sm:space-y-4"
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
