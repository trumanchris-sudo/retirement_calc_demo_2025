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
        setQuestionIndex(state.questionIndex || 0);
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
      questionIndex,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [messages, extractedData, assumptions, phase, questionIndex]);

  // Pre-scripted questions (no API calls needed for these)
  const getNextQuestion = (qIndex: number, currentData: ExtractedData): string | null => {
    // Check if married from current data
    const isMarried = currentData.maritalStatus === 'married';

    switch (qIndex) {
      case 0:
        return "Let's start with the basics: **What is your age and are you single or married?**\n\n(If married, please also tell me your spouse's age!)";
      case 1:
        return "**What state do you live in?**";
      case 2:
        return isMarried
          ? "**Are you a W-2 employee, self-employed, or something else?** And what about your spouse?"
          : "**Are you a W-2 employee, self-employed, or something else?**";
      case 3:
        return isMarried
          ? "**What's your annual income, and what's your spouse's annual income?** (Before taxes)\n\nAlso, does any of that include bonuses or variable compensation?"
          : "**What's your annual income?** (Before taxes)\n\nDoes any of that include bonuses or variable compensation?";
      case 4:
        return "**What are your current account balances?**\n\n• Pre-tax (401k, Traditional IRA)\n• Roth (Roth IRA, Roth 401k)\n• Taxable brokerage\n• Cash/savings\n\n(Just give me the numbers - $0 is fine if you don't have one!)";
      case 5:
        return "Finally, **what age would you like to retire?** (Even if it feels unrealistic right now!)";
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
      case 0: // Age and marital status (+ spouse age if married)
        // Extract age (first number in response)
        if (numbers.length > 0) {
          extracted.age = numbers[0];
        }
        // Extract marital status
        if (input.includes('married')) {
          extracted.maritalStatus = 'married';
          // If married and 2+ numbers, second is spouse age
          if (numbers.length > 1) {
            extracted.spouseAge = numbers[1];
          }
        } else if (input.includes('single')) {
          extracted.maritalStatus = 'single';
        }
        break;

      case 1: // State
        // Extract state abbreviation or name
        // Try common patterns: "CA", "California", "I live in Texas", etc.
        const stateMatch = userInput.match(/\b([A-Z]{2})\b/); // 2-letter state code
        if (stateMatch) {
          extracted.state = stateMatch[1];
        } else {
          // Store full answer, API will parse it
          extracted.state = userInput.trim();
        }
        break;

      case 2: // Employment type
        const isMarried = currentData.maritalStatus === 'married';

        // Detect employment types
        const detectEmploymentType = (text: string): 'w2' | 'self-employed' | 'k1' | 'other' => {
          if (text.includes('w2') || text.includes('w-2') || text.includes('employee')) {
            return 'w2';
          } else if (text.includes('self-employed') || text.includes('self employed') ||
                     text.includes('freelance') || text.includes('contractor') || text.includes('1099')) {
            return 'self-employed';
          } else if (text.includes('k1') || text.includes('k-1') || text.includes('partner')) {
            return 'k1';
          }
          return 'other';
        };

        extracted.employmentType1 = detectEmploymentType(input);

        if (isMarried) {
          // Look for spouse indicators: "spouse", "wife", "husband", "they", "she", "he"
          // Split on common separators and check second part
          const parts = input.split(/\band\b|\,|\;|\./);
          if (parts.length > 1) {
            extracted.employmentType2 = detectEmploymentType(parts[1]);
          } else {
            // Default to same as person 1
            extracted.employmentType2 = extracted.employmentType1;
          }
        }
        break;

      case 3: // Income + bonus
        const isMarriedIncome = currentData.maritalStatus === 'married';

        // Extract income(s)
        if (numbers.length > 0) {
          extracted.annualIncome1 = numbers[0];
        }
        if (numbers.length > 1 && isMarriedIncome) {
          extracted.annualIncome2 = numbers[1];
        }

        // Detect bonus information - store for API to process
        // Look for: "bonus", "$X bonus", "X in bonuses", etc.
        // We'll let the API handle the details, just flag it
        if (input.includes('bonus') && !input.includes('no bonus')) {
          // Store original response for API to extract bonus details
          (extracted as any).bonusInfo = userInput;
        }
        break;

      case 4: // Account balances
        // Try to extract 4 numbers: traditional, roth, taxable, cash
        if (numbers.length >= 1) extracted.currentTraditional = numbers[0];
        if (numbers.length >= 2) extracted.currentRoth = numbers[1];
        if (numbers.length >= 3) extracted.currentTaxable = numbers[2];
        if (numbers.length >= 4) extracted.currentCash = numbers[3];
        break;

      case 5: // Retirement age
        // Extract retirement age (should be a single number)
        if (numbers.length > 0) {
          extracted.retirementAge = numbers[0];
        }
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
      setMissingFields([]); // Always empty now

      // Always move to assumptions review (no more questions)
      setPhase('assumptions-review');

      // Add completion message
      const completionMessage: ConversationMessage = {
        role: 'assistant',
        content: result.summary,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, completionMessage]);
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
    // Send on Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
    // Allow plain Enter and Shift+Enter for line breaks (no preventDefault)
  };

  // Show assumptions review when in assumptions-review phase
  const showAssumptionsReview = phase === 'assumptions-review' || phase === 'refinement';

  return (
    <div
      className="fixed inset-0 md:flex md:flex-row bg-black"
      role="main"
      aria-label="AI-powered retirement planning onboarding"
    >
      {/* Main Console */}
      <div className="h-full w-full md:flex-1 flex flex-col">
        {/* Header - Terminal Style */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3 border-b border-gray-800 bg-black">
          <div className="font-mono">
            <h2 className="text-sm sm:text-base text-green-400">
              <span className="text-gray-500">$ </span>
              retirement-wizard <span className="text-gray-600">--interactive</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 ml-2">
              {phase === 'greeting' && '[initializing...]'}
              {phase === 'data-collection' && '[collecting data...]'}
              {phase === 'assumptions-review' && '[review mode]'}
              {phase === 'refinement' && '[refining...]'}
              {phase === 'complete' && '[complete ✓]'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="font-mono text-gray-400 hover:text-gray-200 hover:bg-gray-900 text-xs min-h-[32px] px-3"
            aria-label="Skip AI onboarding and proceed to manual data entry"
          >
            <span className="hidden sm:inline">^C exit</span>
            <span className="sm:hidden">exit</span>
          </Button>
        </div>

        {/* Messages Area - Scrollable */}
        <div
          className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4 pb-32 space-y-4 bg-black"
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
            <MessageBubble
              key={`${message.timestamp}-${index}`}
              message={message}
              isLatest={index === messages.length - 1 && message.role === 'assistant'}
            />
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
        <div className="flex-shrink-0 border-t border-gray-800 bg-black p-3 sm:p-4">
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
