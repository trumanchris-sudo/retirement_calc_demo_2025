'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export interface VoiceInputProps {
  /** Callback when a number is successfully parsed from speech */
  onValueChange: (value: number) => void;
  /** Whether the voice input is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Current value (for context in error messages) */
  currentValue?: number;
  /** Size variant of the button */
  size?: 'sm' | 'default' | 'icon';
  /** Whether to show the privacy tooltip */
  showPrivacyNote?: boolean;
}

// Word to number mapping for parsing spoken numbers
const WORD_TO_NUMBER: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const MAGNITUDE_WORDS: Record<string, number> = {
  hundred: 100,
  thousand: 1000,
  k: 1000,
  grand: 1000,
  million: 1000000,
  mil: 1000000,
  billion: 1000000000,
};

/**
 * Parse spoken numbers into numeric values
 * Handles phrases like:
 * - "one hundred fifty thousand dollars"
 * - "150000"
 * - "150k"
 * - "one point five million"
 * - "seventy five thousand"
 */
export function parseSpokenNumber(speech: string): number | null {
  if (!speech || typeof speech !== 'string') return null;

  // Normalize the input
  const normalized = speech
    .toLowerCase()
    .replace(/dollars?|bucks?|\$/g, '')
    .replace(/percent|%/g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\band\b/g, ' ')
    .trim();

  if (!normalized) return null;

  // Try direct number parsing first (handles "150000", "150,000", etc.)
  const directNumber = parseFloat(normalized.replace(/[^\d.]/g, ''));
  if (normalized.match(/^\d[\d.]*[kmb]?$/i)) {
    let multiplier = 1;
    if (normalized.endsWith('k')) multiplier = 1000;
    else if (normalized.endsWith('m')) multiplier = 1000000;
    else if (normalized.endsWith('b')) multiplier = 1000000000;

    const baseNum = parseFloat(normalized.replace(/[kmb]$/i, ''));
    if (!isNaN(baseNum)) return baseNum * multiplier;
  }

  // Handle "150 thousand", "1.5 million", etc.
  const numWithMagnitude = normalized.match(/^([\d.]+)\s*(hundred|thousand|k|grand|million|mil|billion)s?$/i);
  if (numWithMagnitude) {
    const baseNum = parseFloat(numWithMagnitude[1]);
    const magnitude = MAGNITUDE_WORDS[numWithMagnitude[2].toLowerCase()] || 1;
    if (!isNaN(baseNum)) return baseNum * magnitude;
  }

  // Parse word-based numbers
  const tokens = normalized.split(/\s+/);
  let result = 0;
  let currentNumber = 0;
  let hasNumber = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check if it's a direct digit
    if (/^\d+\.?\d*$/.test(token)) {
      currentNumber = parseFloat(token);
      hasNumber = true;
      continue;
    }

    // Check for word numbers
    if (WORD_TO_NUMBER[token] !== undefined) {
      currentNumber += WORD_TO_NUMBER[token];
      hasNumber = true;
      continue;
    }

    // Handle "point" for decimals (e.g., "one point five")
    if (token === 'point' && i + 1 < tokens.length) {
      const nextToken = tokens[i + 1];
      const decimal = WORD_TO_NUMBER[nextToken];
      if (decimal !== undefined) {
        // Simple decimal handling: "one point five" = 1.5
        currentNumber = currentNumber + decimal / 10;
        i++; // Skip the next token
        continue;
      }
    }

    // Check for magnitude words
    const magnitude = MAGNITUDE_WORDS[token.replace(/s$/, '')];
    if (magnitude !== undefined) {
      if (magnitude === 100) {
        // "two hundred" = 200
        currentNumber *= magnitude;
      } else {
        // "fifty thousand" = 50000, then add to result
        currentNumber *= magnitude;
        result += currentNumber;
        currentNumber = 0;
      }
      hasNumber = true;
      continue;
    }

    // Handle hyphenated numbers like "twenty-five"
    if (token.includes('-')) {
      const parts = token.split('-');
      let partValue = 0;
      for (const part of parts) {
        if (WORD_TO_NUMBER[part] !== undefined) {
          partValue += WORD_TO_NUMBER[part];
          hasNumber = true;
        }
      }
      currentNumber += partValue;
    }
  }

  // Add any remaining current number to result
  result += currentNumber;

  return hasNumber ? result : null;
}

/**
 * Check if Web Speech API is supported in the current browser
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export type VoiceInputStatus = 'idle' | 'listening' | 'processing' | 'error' | 'unsupported';

export interface VoiceInputState {
  status: VoiceInputStatus;
  transcript: string;
  error: string | null;
}

/**
 * VoiceInput Component
 *
 * A microphone button that allows users to speak numeric values instead of typing.
 * Perfect for entering amounts like "one hundred fifty thousand dollars".
 *
 * Features:
 * - Web Speech API integration
 * - Visual feedback during listening (pulsing animation)
 * - Intelligent number parsing from natural speech
 * - Error handling for unsupported browsers
 * - Privacy note and permissions handling
 *
 * Usage:
 * ```tsx
 * <VoiceInput
 *   onValueChange={(value) => setAmount(value)}
 *   min={0}
 *   max={10000000}
 * />
 * ```
 */
export function VoiceInput({
  onValueChange,
  disabled = false,
  className,
  min,
  max,
  showPrivacyNote = true,
  size = 'icon',
}: VoiceInputProps) {
  const [state, setState] = useState<VoiceInputState>({
    status: 'idle',
    transcript: '',
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for browser support on mount
  useEffect(() => {
    if (!isSpeechRecognitionSupported()) {
      setState(prev => ({ ...prev, status: 'unsupported' }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      setState({
        status: 'unsupported',
        transcript: '',
        error: 'Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.',
      });
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setState({ status: 'listening', transcript: '', error: null });
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      const lastResult = results[results.length - 1];
      const transcript = lastResult[0].transcript;

      setState(prev => ({ ...prev, transcript }));

      if (lastResult.isFinal) {
        setState(prev => ({ ...prev, status: 'processing' }));

        const parsedNumber = parseSpokenNumber(transcript);

        if (parsedNumber !== null) {
          // Validate against min/max
          let finalValue = parsedNumber;
          let warning = null;

          if (min !== undefined && parsedNumber < min) {
            finalValue = min;
            warning = `Value adjusted to minimum (${min})`;
          }
          if (max !== undefined && parsedNumber > max) {
            finalValue = max;
            warning = `Value adjusted to maximum (${max.toLocaleString()})`;
          }

          onValueChange(finalValue);

          setState({
            status: 'idle',
            transcript: warning ? `${transcript} - ${warning}` : '',
            error: warning || null,
          });

          // Clear the warning after a delay
          if (warning) {
            timeoutRef.current = setTimeout(() => {
              setState(prev => ({ ...prev, transcript: '', error: null }));
            }, 3000);
          }
        } else {
          setState({
            status: 'error',
            transcript,
            error: `Could not understand "${transcript}". Try saying a number like "fifty thousand dollars".`,
          });

          // Auto-reset after error
          timeoutRef.current = setTimeout(() => {
            setState({ status: 'idle', transcript: '', error: null });
          }, 4000);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'An error occurred with voice input.';

      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please connect a microphone.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          // User cancelled, not an error to display
          setState({ status: 'idle', transcript: '', error: null });
          return;
        default:
          errorMessage = `Voice input error: ${event.error}`;
      }

      setState({
        status: 'error',
        transcript: '',
        error: errorMessage,
      });

      // Auto-reset after error
      timeoutRef.current = setTimeout(() => {
        setState({ status: 'idle', transcript: '', error: null });
      }, 4000);
    };

    recognition.onend = () => {
      setState(prev => {
        if (prev.status === 'listening') {
          return { ...prev, status: 'idle' };
        }
        return prev;
      });
    };

    try {
      recognition.start();
    } catch {
      setState({
        status: 'error',
        transcript: '',
        error: 'Failed to start voice input. Please try again.',
      });
    }
  }, [onValueChange, min, max]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const handleClick = useCallback(() => {
    if (state.status === 'listening') {
      stopListening();
    } else if (state.status !== 'unsupported') {
      startListening();
    }
  }, [state.status, startListening, stopListening]);

  // Unsupported browser tooltip
  if (state.status === 'unsupported') {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size={size}
              disabled
              className={cn(
                'text-muted-foreground cursor-not-allowed opacity-50',
                className
              )}
              aria-label="Voice input not supported"
            >
              <MicOff className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const buttonContent = (
    <Button
      type="button"
      variant={state.status === 'listening' ? 'default' : 'ghost'}
      size={size}
      onClick={handleClick}
      disabled={disabled || state.status === 'processing'}
      className={cn(
        'relative transition-all duration-200',
        state.status === 'listening' && 'bg-red-500 hover:bg-red-600 text-white',
        state.status === 'error' && 'text-destructive',
        className
      )}
      aria-label={
        state.status === 'listening'
          ? 'Stop voice input'
          : 'Start voice input - speak a number'
      }
      aria-pressed={state.status === 'listening'}
    >
      {/* Pulsing ring animation when listening */}
      {state.status === 'listening' && (
        <>
          <span className="absolute inset-0 rounded-md animate-ping bg-red-400 opacity-30" />
          <span className="absolute inset-0 rounded-md animate-pulse bg-red-400 opacity-20" />
        </>
      )}

      <Mic className={cn(
        'h-4 w-4 relative z-10',
        state.status === 'listening' && 'animate-pulse'
      )} />
    </Button>
  );

  // Build tooltip content based on state
  const getTooltipContent = () => {
    if (state.status === 'listening') {
      return (
        <div className="space-y-1">
          <p className="font-medium text-sm">Listening...</p>
          {state.transcript && (
            <p className="text-xs text-muted-foreground italic">
              &ldquo;{state.transcript}&rdquo;
            </p>
          )}
          <p className="text-xs text-muted-foreground">Click to stop</p>
        </div>
      );
    }

    if (state.status === 'processing') {
      return (
        <div className="space-y-1">
          <p className="font-medium text-sm">Processing...</p>
          <p className="text-xs text-muted-foreground italic">
            &ldquo;{state.transcript}&rdquo;
          </p>
        </div>
      );
    }

    if (state.status === 'error' && state.error) {
      return (
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-sm">{state.error}</p>
        </div>
      );
    }

    // Idle state with instructions
    return (
      <div className="space-y-2">
        <p className="font-medium text-sm">Voice Input</p>
        <p className="text-xs text-muted-foreground">
          Click and say a number like:
        </p>
        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
          <li>&ldquo;one hundred fifty thousand dollars&rdquo;</li>
          <li>&ldquo;75000&rdquo;</li>
          <li>&ldquo;fifty k&rdquo;</li>
          <li>&ldquo;one point five million&rdquo;</li>
        </ul>
        {showPrivacyNote && (
          <div className="flex items-start gap-1.5 pt-1 border-t border-border mt-2">
            <Shield className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Audio is processed locally by your browser. No audio data is sent to our servers.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip open={state.status === 'listening' || state.status === 'error' ? true : undefined}>
        <TooltipTrigger asChild>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * VoiceInputWithLabel Component
 *
 * A more complete voice input component that includes visual feedback
 * for the transcript and any errors inline, suitable for form fields.
 */
export interface VoiceInputWithFeedbackProps extends VoiceInputProps {
  /** Whether to show inline feedback below the button */
  showInlineFeedback?: boolean;
}

export function VoiceInputWithFeedback({
  showInlineFeedback = true,
  ...props
}: VoiceInputWithFeedbackProps) {
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'listening';
    message: string;
  } | null>(null);

  const handleValueChange = (value: number) => {
    props.onValueChange(value);
    setFeedback({
      type: 'success',
      message: `Set to ${value.toLocaleString()}`,
    });
    setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <VoiceInput {...props} onValueChange={handleValueChange} />
      {showInlineFeedback && feedback && (
        <span
          className={cn(
            'text-xs transition-opacity duration-200',
            feedback.type === 'success' && 'text-green-600',
            feedback.type === 'error' && 'text-destructive',
            feedback.type === 'listening' && 'text-primary animate-pulse'
          )}
        >
          {feedback.message}
        </span>
      )}
    </div>
  );
}

export default VoiceInput;
