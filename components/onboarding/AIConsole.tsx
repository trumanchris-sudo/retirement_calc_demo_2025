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
      } catch (e) {
        console.error('Failed to load saved onboarding state:', e);
      }
    } else {
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

  // Initial greeting
  const startGreeting = async () => {
    setIsStreaming(true);
    setError(null);

    try {
      await streamAIOnboarding({
        messages: [],
        extractedData: {},
        assumptions: [],
        phase: 'greeting',
        onMessageDelta: (delta) => {
          setCurrentStreamingMessage((prev) => prev + delta);
        },
        onDataUpdate: (field, value) => {
          setExtractedData((prev) => ({ ...prev, [field]: value }));
        },
        onAssumptionAdded: (assumption) => {
          setAssumptions((prev) => [...prev, assumption]);
        },
        onPhaseTransition: (newPhase) => {
          setPhase(newPhase);
        },
        onComplete: (data, finalAssumptions) => {
          // Finalize streaming message
          if (currentStreamingMessage) {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: currentStreamingMessage, timestamp: Date.now() },
            ]);
            setCurrentStreamingMessage('');
          }
          setIsStreaming(false);
        },
        onError: (err) => {
          setError(err);
          setIsStreaming(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
      setIsStreaming(false);
    }
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

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      let fullResponse = '';

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
          if (newPhase === 'complete') {
            handleComplete(data, finalAssumptions);
          }
        },
        onError: (err) => {
          setError(err);
          setIsStreaming(false);
          setCurrentStreamingMessage('');
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
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
    <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Main Console */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur">
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
            className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Skip to Manual Entry</span>
            <span className="sm:hidden">Skip</span>
          </Button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
          {messages.map((message, index) => (
            <MessageBubble key={`${message.timestamp}-${index}`} message={message} />
          ))}

          {currentStreamingMessage && (
            <StreamingMessage content={currentStreamingMessage} />
          )}

          {error && (
            <div className="bg-red-950/50 border border-red-800 rounded-lg p-4 text-red-200">
              <p className="font-semibold">Error</p>
              <p className="text-sm mt-1">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setError(null)}
                className="mt-2 text-red-200 border-red-800 hover:bg-red-900"
              >
                Dismiss
              </Button>
            </div>
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

        {/* Input Area */}
        <div className="border-t border-slate-800 bg-slate-950/50 backdrop-blur p-3 sm:p-4">
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
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel - Data Summary - Hidden on mobile, visible on desktop */}
      <div className="hidden md:block">
        <DataSummaryPanel extractedData={extractedData} assumptions={assumptions} />
      </div>
    </div>
  );
}
