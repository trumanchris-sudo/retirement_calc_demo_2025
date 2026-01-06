/**
 * Client-side AI Onboarding Streaming Handler
 *
 * Handles streaming communication with the AI onboarding API endpoint
 */

import type {
  StreamHandlerParams,
  StreamEvent,
  ConversationPhase,
  ExtractedData,
  AssumptionWithReasoning,
} from '@/types/ai-onboarding';

/**
 * Stream AI onboarding conversation with Server-Sent Events
 */
export async function streamAIOnboarding(params: StreamHandlerParams): Promise<void> {
  const {
    messages,
    extractedData = {},
    assumptions = [],
    phase,
    onMessageDelta,
    onDataUpdate,
    onAssumptionAdded,
    onPhaseTransition,
    onComplete,
    onError,
  } = params;

  let timeoutId: NodeJS.Timeout | null = null;

  try {
    console.log('[streamAIOnboarding] Starting request:', { phase, messageCount: messages.length });

    // Create AbortController for timeout
    const controller = new AbortController();

    // Set 60 second timeout for the entire request
    timeoutId = setTimeout(() => {
      console.error('[streamAIOnboarding] Request timeout after 60 seconds');
      controller.abort();
    }, 60000);

    const response = await fetch('/api/ai-onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        extractedData,
        assumptions,
        phase,
      }),
      signal: controller.signal,
    }).catch((fetchError) => {
      // Handle fetch errors (network issues, aborts, etc.)
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      throw new Error(`Network error: ${fetchError.message || 'Unable to connect to server'}`);
    });

    console.log('[streamAIOnboarding] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[streamAIOnboarding] API error:', { status: response.status, error: errorText });

      // Try to parse JSON error message
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || `API error: ${response.status}`);
      } catch {
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    // Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentPhase = phase;
    let finalData = extractedData;
    let finalAssumptions = assumptions;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines in the buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim() || line.startsWith(':')) {
          // Skip empty lines and comments
          continue;
        }

        if (line.startsWith('data: ')) {
          const data = line.substring(6);

          // Handle special [DONE] marker
          if (data === '[DONE]') {
            if (onComplete) {
              onComplete(finalData, finalAssumptions);
            }
            return;
          }

          try {
            const event: StreamEvent = JSON.parse(data);

            switch (event.type) {
              case 'message_delta':
                if (onMessageDelta) {
                  onMessageDelta(event.delta);
                }
                break;

              case 'data_update':
                console.log('[streamAIOnboarding] Data update:', event.field, event.value);
                if (onDataUpdate) {
                  onDataUpdate(event.field, event.value);
                }
                finalData = { ...finalData, [event.field]: event.value };
                break;

              case 'assumption_added':
                console.log('[streamAIOnboarding] Assumption added:', event.assumption.field);
                if (onAssumptionAdded) {
                  onAssumptionAdded(event.assumption);
                }
                finalAssumptions = [...finalAssumptions, event.assumption];
                break;

              case 'phase_transition':
                console.log('[streamAIOnboarding] Phase transition:', event.newPhase);
                currentPhase = event.newPhase;
                if (onPhaseTransition) {
                  onPhaseTransition(event.newPhase);
                }
                break;

              case 'complete':
                console.log('[streamAIOnboarding] Stream complete');
                finalData = event.finalData;
                finalAssumptions = event.assumptions;
                if (onComplete) {
                  onComplete(event.finalData, event.assumptions);
                }
                return;

              case 'error':
                console.error('[streamAIOnboarding] Stream error event:', event.error);
                if (onError) {
                  onError(event.error);
                }
                throw new Error(event.error);
            }
          } catch (parseError) {
            console.error('[streamAIOnboarding] Failed to parse SSE data:', data, parseError);
            // Continue processing other events
          }
        }
      }
    }

    // Stream ended without explicit completion
    if (onComplete) {
      onComplete(finalData, finalAssumptions);
    }
  } catch (error) {
    console.error('[streamAIOnboarding] Stream error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
    if (onError) {
      onError(errorMessage);
    }
    throw error;
  } finally {
    // Clear timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Helper to create SSE event string (for testing)
 */
export function createSSEEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Validate extracted data completeness
 */
export function validateDataCompleteness(data: ExtractedData): {
  isComplete: boolean;
  missingRequired: string[];
  missingOptional: string[];
} {
  const requiredFields = ['age', 'maritalStatus', 'annualIncome1', 'retirementAge'] as const;
  const optionalFields = [
    'spouseAge',
    'state',
    'numChildren',
    'childrenAges',
    'additionalChildrenExpected',
    'employmentType1',
    'employmentType2',
    'annualIncome2',
    'emergencyFund',
    'currentTaxable',
    'currentTraditional',
    'currentRoth',
    'savingsRateTaxable1',
    'savingsRateTraditional1',
    'savingsRateRoth1',
    'savingsRateTaxable2',
    'savingsRateTraditional2',
    'savingsRateRoth2',
    'desiredRetirementSpending',
  ] as const;

  const missingRequired = requiredFields.filter(
    (field) => data[field] === undefined || data[field] === null
  );

  const missingOptional = optionalFields.filter(
    (field) => data[field] === undefined || data[field] === null
  );

  return {
    isComplete: missingRequired.length === 0,
    missingRequired,
    missingOptional,
  };
}
