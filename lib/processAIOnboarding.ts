/**
 * Single API call to process all onboarding responses
 * Extracts data, generates assumptions, and returns complete data set
 */

import type { ExtractedData, AssumptionWithReasoning } from '@/types/ai-onboarding';

export interface ProcessOnboardingParams {
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>; // Full conversation
  extractedData?: ExtractedData; // Data collected so far
}

export interface MissingField {
  field: string;
  displayName: string;
  description: string;
}

export interface ProcessOnboardingResult {
  extractedData: ExtractedData;
  assumptions: AssumptionWithReasoning[];
  missingFields: MissingField[];
  summary: string;
  nextQuestion?: string; // Next question to ask (for sequential conversation)
}

export async function processAIOnboarding(
  params: ProcessOnboardingParams
): Promise<ProcessOnboardingResult> {
  const response = await fetch('/api/process-onboarding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.error || `API error: ${response.status}`);
    } catch {
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
  }

  return response.json();
}
