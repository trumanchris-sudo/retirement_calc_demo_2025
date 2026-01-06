/**
 * Single API call to process all onboarding responses
 * Extracts data, generates assumptions, and returns complete data set
 */

import type { ExtractedData, AssumptionWithReasoning } from '@/types/ai-onboarding';

export interface ProcessOnboardingParams {
  conversationText: string; // All user responses combined
}

export interface ProcessOnboardingResult {
  extractedData: ExtractedData;
  assumptions: AssumptionWithReasoning[];
  summary: string;
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
