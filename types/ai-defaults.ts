/**
 * Types for AI-generated default suggestions in the onboarding wizard
 */

export interface AIDefaultsRequest {
  age: number
  spouseAge?: number
  maritalStatus: 'single' | 'married'
  income: number
  spouseIncome?: number
  state?: string // For potential state-specific considerations
}

export interface AIDefaultsResponse {
  // Core suggestions
  savingsRate: number // As decimal (0.15 = 15%)
  retirementAge: number // Integer, 60-70
  spendingMultiplier: number // As decimal (0.8 = 80% of pre-retirement income)

  // Explanation (user-facing)
  reasoning: string[] // Array of short bullet points

  // Metadata
  model: string // Which Claude model was used
  timestamp: number // Unix timestamp
}

/**
 * Validation bounds for AI suggestions
 */
export const AI_DEFAULTS_BOUNDS = {
  savingsRate: { min: 0.08, max: 0.25 },
  retirementAge: { min: 60, max: 70 },
  spendingMultiplier: { min: 0.60, max: 0.90 },
} as const
