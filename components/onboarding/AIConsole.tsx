'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { processAIOnboarding, type MissingField } from '@/lib/processAIOnboarding';
import { processOnboardingClientSide } from '@/lib/processOnboardingClientSide';
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
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

interface AIConsoleProps {
  onComplete: (data: ExtractedData, assumptions: AssumptionWithReasoning[]) => void;
  onSkip: () => void;
  onBack?: () => void;
}

/**
 * Admin presets for fast beta testing.
 * Type the key (e.g. "admin1") at the first wizard prompt to skip all questions
 * and jump straight to assumptions review with pre-filled data.
 */
const ADMIN_PRESETS: Record<string, ExtractedData> = {
  admin1: {
    // Personal Info
    age: 35,
    spouseAge: 34,
    maritalStatus: 'married',
    state: 'WA',
    employmentType1: 'self-employed',  // K-1 partner (functionally self-employed for calculator purposes)
    employmentType2: 'w2',  // W-2 employee
    // Income
    primaryIncome: 750000,  // $550k base + $200k bonus
    spouseIncome: 145000,   // $145k base, no bonus
    // Current Balances
    currentTraditional: 400000,  // Combined traditional 401ks
    currentRoth: 128000,         // $78k Roth IRAs + $50k Roth 401ks
    currentTaxable: 74000,       // Brokerage account
    emergencyFund: 80000,
    // Annual Contributions (both max retirement accounts, 2026 limits)
    contributionTraditional: 96500,  // $24.5k each 401k + $47.5k K-1 defined contribution plan
    contributionRoth: 15000,         // Max backdoor Roth for both ($7.5k each, 2026 limit)
    contributionTaxable: 100000,     // Additional brokerage savings
    contributionMatch: 15000,        // Estimated employer match
    retirementAge: 65,
    // Housing
    monthlyMortgageRent: 5859,
    monthlyUtilities: 400,
    // Insurance (property $26k + home $8.5k + car $3.8k + flood $2.2k = $40.5k/yr = $3,375/mo)
    monthlyInsurancePropertyTax: 3375,
    // Healthcare ($2k/month combined)
    monthlyHealthcareP1: 1000,
    monthlyHealthcareP2: 1000,
    // Other expenses
    monthlyOtherExpenses: 3500,  // State taxes ~$3,500/month
    monthlyHouseholdExpenses: 3500,
    monthlyDiscretionary: 6000,  // $3k each
    monthlyChildcare: 1500,
    // Life insurance
    annualLifeInsuranceP1: 3000,
    annualLifeInsuranceP2: 2000,
  },
};

const STORAGE_KEY = 'ai_onboarding_state';

/**
 * Feature Flag: Use API vs Client-Side Processing
 *
 * false (default): Process assumptions client-side (instant, free, deterministic)
 * true: Use Claude Opus 4.5 API (2-5s latency, ~$0.10-0.30/user, AI-powered)
 *
 * Recommendation: Keep false unless you need complex AI reasoning for unusual inputs.
 * The client-side logic handles 99% of cases with simple IF-THEN rules.
 */
const USE_API_FOR_ASSUMPTIONS = false;

export function AIConsole({ onComplete, onSkip, onBack }: AIConsoleProps) {
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
  const [userOverrides, setUserOverrides] = useState<Record<string, string | number | boolean | null>>({}); // Track user edits to assumptions
  const [isUpdating, setIsUpdating] = useState(false); // Track if we're re-running API with overrides

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom helper - snap instantly, no smooth animation
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Scroll to bottom when textarea gets focus (after keyboard animation)
  const handleTextareaFocus = useCallback(() => {
    // Let Safari bring keyboard up, then snap to bottom
    setTimeout(scrollToBottom, 50);
  }, [scrollToBottom]);

  // Re-scroll when keyboard resizes viewport (iOS)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;
    const handler = () => {
      if (document.activeElement === inputRef.current) {
        scrollToBottom();
      }
    };

    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, [scrollToBottom]);

  // Pre-scripted questions (no API calls needed for these)
  const getNextQuestion = useCallback((qIndex: number, currentData: ExtractedData): string | null => {
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
        return "**What's your current pre-tax retirement account balance?**\n\nInclude:\n• Traditional 401k, 403b, 457\n• Traditional IRA\n• SEP IRA, SIMPLE IRA\n• Any other pre-tax retirement accounts\n\n(Enter $0 if you don't have any)";
      case 5:
        return "**What's your current Roth account balance?**\n\nInclude:\n• Roth IRA\n• Roth 401k, Roth 403b, Roth 457\n• Any other Roth accounts\n\n(Enter $0 if you don't have any)";
      case 6:
        return "**What's your current taxable brokerage account balance?**\n\n(Enter $0 if you don't have a brokerage account)";
      case 7:
        return "**How much do you have in cash/emergency fund?**\n\n(Enter $0 if you're just getting started)";
      case 8:
        return isMarried
          ? "**How much do you contribute annually to pre-tax retirement accounts?**\n\nInclude (for both spouses combined):\n• Traditional 401k, 403b, 457\n• Traditional IRA\n• SEP IRA, SIMPLE IRA, Solo 401k\n• Deferred Comp Plans (DCP)\n\n(Enter $0 if none)"
          : "**How much do you contribute annually to pre-tax retirement accounts?**\n\nInclude:\n• Traditional 401k, 403b, 457\n• Traditional IRA\n• SEP IRA, SIMPLE IRA, Solo 401k\n• Deferred Comp Plans (DCP)\n\n(Enter $0 if none)";
      case 9:
        return isMarried
          ? "**How much do you contribute annually to Roth accounts?**\n\nInclude (for both spouses combined):\n• Roth IRA\n• Roth 401k, Roth 403b, Roth 457\n• Backdoor Roth conversions\n\n(Enter $0 if none)"
          : "**How much do you contribute annually to Roth accounts?**\n\nInclude:\n• Roth IRA\n• Roth 401k, Roth 403b, Roth 457\n• Backdoor Roth conversions\n\n(Enter $0 if none)";
      case 10:
        return isMarried
          ? "**How much do you save annually to taxable brokerage?**\n\nCombined total for both of you. (Enter $0 if none)"
          : "**How much do you save annually to taxable brokerage?**\n\n(Enter $0 if none)";
      case 11:
        return "**What's your total annual employer 401k match?**\n\n(Enter $0 if no match or not sure)";
      case 12:
        return "Finally, **what age would you like to retire?** (Even if it feels unrealistic right now!)";
      default:
        return null; // No more pre-scripted questions, will call API
    }
  }, []);

  // Initial greeting - start sequential conversation
  const startGreeting = useCallback(() => {
    console.log('[AIConsole] Starting greeting...');

    // Show instant pre-scripted greeting with first question
    const greetingMessage = `Hello! I'm here to help you set up your retirement calculator. I'll ask you a few questions to get started.

${getNextQuestion(0, {})}`;

    setMessages([
      { role: 'assistant', content: greetingMessage, timestamp: Date.now() },
    ]);
    setQuestionIndex(0);
    setPhase('data-collection');
  }, [getNextQuestion]);

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
        // Restore user overrides if present (for new sessions)
        const stateWithOverrides = state as AIOnboardingState & { userOverrides?: Record<string, string | number | boolean | null> };
        if (stateWithOverrides.userOverrides) {
          setUserOverrides(stateWithOverrides.userOverrides);
        }
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
  }, [startGreeting]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state: AIOnboardingState & { userOverrides?: Record<string, string | number | boolean | null> } = {
      conversationHistory: messages,
      extractedData,
      assumptions,
      currentPhase: phase,
      questionIndex,
      lastUpdated: Date.now(),
      userOverrides, // Save user edits too
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [messages, extractedData, assumptions, phase, questionIndex, userOverrides]);

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
        const detectEmploymentType = (text: string): 'w2' | 'self-employed' | 'both' | 'retired' | 'other' => {
          if (text.includes('w2') || text.includes('w-2') || text.includes('employee')) {
            return 'w2';
          } else if (text.includes('self-employed') || text.includes('self employed') ||
                     text.includes('freelance') || text.includes('contractor') || text.includes('1099') ||
                     text.includes('k1') || text.includes('k-1') || text.includes('partner')) {
            // K-1 partnership income is similar to self-employment
            return 'self-employed';
          } else if (text.includes('both')) {
            return 'both';
          } else if (text.includes('retired') || text.includes('retirement')) {
            return 'retired';
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
          extracted.primaryIncome = numbers[0];
        }
        if (numbers.length > 1 && isMarriedIncome) {
          extracted.spouseIncome = numbers[1];
        }

        // Detect bonus information - store for API to process
        // Look for: "bonus", "$X bonus", "X in bonuses", etc.
        // We'll let the API handle the details, just flag it
        if (input.includes('bonus') && !input.includes('no bonus')) {
          // Store original response for API to extract bonus details
          extracted.bonusInfo = userInput;
        }
        break;

      case 4: // Traditional 401k/IRA balance
        if (numbers.length > 0) {
          extracted.currentTraditional = numbers[0];
          console.log('[AIConsole] ✅ PARSED Traditional balance:', numbers[0]);
        } else {
          extracted.currentTraditional = 0;
        }
        break;

      case 5: // Roth balance
        if (numbers.length > 0) {
          extracted.currentRoth = numbers[0];
          console.log('[AIConsole] ✅ PARSED Roth balance:', numbers[0]);
        } else {
          extracted.currentRoth = 0;
        }
        break;

      case 6: // Taxable brokerage balance
        if (numbers.length > 0) {
          extracted.currentTaxable = numbers[0];
          console.log('[AIConsole] ✅ PARSED Taxable balance:', numbers[0]);
        } else {
          extracted.currentTaxable = 0;
        }
        break;

      case 7: // Emergency fund / cash
        if (numbers.length > 0) {
          extracted.emergencyFund = numbers[0];
          console.log('[AIConsole] ✅ PARSED Emergency fund:', numbers[0]);
        } else {
          extracted.emergencyFund = 0;
        }
        break;

      case 8: // Annual Traditional 401k/IRA contributions
        if (numbers.length > 0) {
          extracted.contributionTraditional = numbers[0];
          console.log('[AIConsole] ✅ PARSED Traditional contributions:', numbers[0]);
        } else {
          extracted.contributionTraditional = 0;
        }
        break;

      case 9: // Annual Roth contributions
        if (numbers.length > 0) {
          extracted.contributionRoth = numbers[0];
          console.log('[AIConsole] ✅ PARSED Roth contributions:', numbers[0]);
        } else {
          extracted.contributionRoth = 0;
        }
        break;

      case 10: // Annual taxable brokerage savings
        if (numbers.length > 0) {
          extracted.contributionTaxable = numbers[0];
          console.log('[AIConsole] ✅ PARSED Taxable contributions:', numbers[0]);
        } else {
          extracted.contributionTaxable = 0;
        }
        break;

      case 11: // Employer match
        if (numbers.length > 0) {
          extracted.contributionMatch = numbers[0];
          console.log('[AIConsole] ✅ PARSED Employer match:', numbers[0]);
        } else {
          extracted.contributionMatch = 0;
        }
        break;

      case 12: // Retirement age
        // Extract retirement age (should be a single number)
        // More aggressive parsing: match any digits
        const ageMatch = userInput.match(/\d+/);
        if (numbers.length > 0) {
          extracted.retirementAge = numbers[0];
          console.log('[AIConsole] ✅ PARSED RETIREMENT AGE:', numbers[0], 'from input:', userInput);
        } else if (ageMatch) {
          // Fallback: just raw digits
          extracted.retirementAge = parseInt(ageMatch[0]);
          console.log('[AIConsole] ✅ PARSED RETIREMENT AGE (fallback):', ageMatch[0], 'from input:', userInput);
        } else {
          console.error('[AIConsole] ❌ FAILED TO PARSE RETIREMENT AGE from input:', userInput);
        }
        break;
    }

    return extracted;
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

    // Admin shortcut: type a preset name (e.g. "admin1") at Q0 to skip all questions
    const presetKey = userInput.toLowerCase();
    if (questionIndex === 0 && ADMIN_PRESETS[presetKey]) {
      const presetData = { ...ADMIN_PRESETS[presetKey] };
      setExtractedData(presetData);
      const infoMsg: ConversationMessage = {
        role: 'assistant',
        content: `**[Admin shortcut: ${presetKey}]** — Loading preset profile and skipping to assumptions review...`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, infoMsg]);
      await handleProcess(presetData);
      return;
    }

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
      // CRITICAL: Pass updatedData directly to avoid stale state
      await handleProcess(updatedData);
    }
  };

  // Process conversation with AI (sequential mode)
  // dataOverride: Use this data instead of state (to avoid React state timing issues)
  const handleProcess = async (dataOverride?: ExtractedData) => {
    if (isProcessing) return;

    // Use fresh data if provided, otherwise fall back to state
    const dataToSend = dataOverride || extractedData;

    setIsProcessing(true);
    setError(null);
    setHasProcessed(true);

    console.log('[AIConsole] Processing conversation...');
    console.log('[AIConsole] 🔍 EXTRACTED DATA:', {
      retirementAge: dataToSend.retirementAge,
      age: dataToSend.age,
      maritalStatus: dataToSend.maritalStatus,
      allKeys: Object.keys(dataToSend),
      fullData: dataToSend,
      usingOverride: !!dataOverride,
      processingMode: USE_API_FOR_ASSUMPTIONS ? 'API' : 'Client-Side'
    });

    try {
      let result;

      if (USE_API_FOR_ASSUMPTIONS) {
        // ===== API-BASED PROCESSING =====
        // Uses Claude Opus 4.5 to generate assumptions
        // Cost: ~$0.10-0.30 per user | Latency: 2-5 seconds
        console.log('[AIConsole] 🌐 Using API-based processing (Claude Opus 4.5)...');

        const conversationHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        result = await processAIOnboarding({
          conversationHistory,
          extractedData: dataToSend,
        });

        console.log('[AIConsole] ✅ API processing complete');
      } else {
        // ===== CLIENT-SIDE PROCESSING =====
        // Uses deterministic IF-THEN logic for assumptions
        // Cost: $0.00 | Latency: < 1ms
        console.log('[AIConsole] ⚡ Using client-side processing (instant, free)...');

        result = processOnboardingClientSide(dataToSend);

        console.log('[AIConsole] ✅ Client-side processing complete');
      }

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

  // Handle user clicking "Update Assumptions" after editing values
  const handleUpdateAssumptions = async (overrides: Record<string, string | number | boolean | null>): Promise<void> => {
    if (isUpdating) return;

    setIsUpdating(true);
    setError(null);
    setUserOverrides(overrides); // Save overrides

    console.log('[AIConsole] Updating assumptions with user overrides:', overrides);

    try {
      // Merge overrides into extractedData
      const updatedData = { ...extractedData, ...overrides };
      setExtractedData(updatedData);

      console.log('[AIConsole] 🔍 UPDATED DATA:', {
        retirementAge: updatedData.retirementAge,
        age: updatedData.age,
        userOverrides: overrides,
        fullData: updatedData,
        processingMode: USE_API_FOR_ASSUMPTIONS ? 'API' : 'Client-Side'
      });

      let result;

      if (USE_API_FOR_ASSUMPTIONS) {
        // API-based update
        const conversationHistory = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));

        result = await processAIOnboarding({
          conversationHistory,
          extractedData: updatedData,
        });
      } else {
        // Client-side update
        result = processOnboardingClientSide(updatedData);
      }

      console.log('[AIConsole] Update complete', {
        fieldsExtracted: Object.keys(result.extractedData).length,
        assumptionsMade: result.assumptions.length,
      });

      // Merge API results back, but preserve user overrides
      const finalData = { ...result.extractedData, ...overrides };
      setExtractedData(finalData);

      // Update assumptions - mark overridden fields as "Confirmed"
      const updatedAssumptions = result.assumptions.map(assumption => {
        if (overrides[assumption.field] !== undefined) {
          return {
            ...assumption,
            value: overrides[assumption.field],
            userProvided: true, // Mark as user-provided
            confidence: 'high' as const,
          };
        }
        return assumption;
      });

      setAssumptions(updatedAssumptions);

      // Add update confirmation message
      const updateMessage: ConversationMessage = {
        role: 'assistant',
        content: `✅ Updated ${Object.keys(overrides).length} assumption(s) and recalculated. Please review the updated assumptions below.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, updateMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update assumptions';
      console.error('[AIConsole] Update error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
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
    <div className="flex flex-col flex-1 overflow-hidden bg-background">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3 border-b">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8"
              aria-label="Go back to mode selection"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-foreground">
              Guided Setup
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {phase === 'greeting' && 'Getting started...'}
              {phase === 'data-collection' && 'Collecting your information'}
              {phase === 'assumptions-review' && 'Review your plan'}
              {phase === 'refinement' && 'Refining...'}
              {phase === 'complete' && 'Complete'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSkip}
          className="text-xs min-h-[32px] px-3"
          aria-label="Skip AI onboarding and proceed to manual data entry"
        >
          Skip
        </Button>
      </header>

      {/* Scrollable content container with sticky input */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Messages Area - scroll container */}
        <main
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto flex flex-col bg-background"
          role="log"
          aria-live="polite"
          aria-label="Conversation messages"
        >
          {/* Inner wrapper: uses mt-auto to anchor content to bottom when space available */}
          <div className="mt-auto flex flex-col px-3 py-3 sm:px-6 sm:py-4 space-y-4">
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="sticky top-0 z-10 bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-800 rounded-lg p-4 sm:p-6 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-red-800 dark:text-red-200">Connection Error</p>
                  <p className="text-sm sm:text-base mt-2 text-red-700 dark:text-red-300">{error}</p>
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
                      className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 min-h-[44px] px-4"
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
                onUpdateAssumptions={handleUpdateAssumptions}
                isUpdating={isUpdating}
              />
              <div className="flex justify-center gap-4 py-4">
                <Button
                  onClick={() => {
                    setPhase('complete');
                    handleComplete(extractedData, assumptions);
                  }}
                  disabled={isUpdating}
                  className="min-h-[48px] px-6"
                  aria-label="Confirm and complete onboarding"
                >
                  Looks Good - Continue
                </Button>
              </div>
            </>
          )}

          <div ref={messagesEndRef} className="h-px w-full" />
          </div> {/* Close inner wrapper with mt-auto */}
        </main>

        {/* Input Area - Sticky to bottom of scroll container */}
        <footer className="sticky bottom-0 border-t bg-background px-3 sm:px-4 py-3 pb-[env(safe-area-inset-bottom)]">
          <ConsoleInput
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            onFocus={handleTextareaFocus}
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
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground" role="status" aria-live="polite">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Analyzing your responses and generating smart assumptions...</span>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
