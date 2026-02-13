/**
 * AI-Powered Onboarding Types
 *
 * Type definitions for the Claude-powered conversational onboarding system
 */

import type { EmploymentType } from './calculator';

// ==================== Conversation Types ====================

/**
 * Message role in conversation
 */
export type MessageRole = 'assistant' | 'user';

/**
 * Individual message in the conversation
 */
export interface ConversationMessage {
  role: MessageRole;
  content: string;
  timestamp: number;
}

// ==================== Data Extraction Types ====================

/**
 * Data extracted from user conversation
 * These fields map to calculator inputs and will be populated through natural language
 */
export interface ExtractedData {
  // Personal Information
  age?: number;
  spouseAge?: number;
  maritalStatus?: 'single' | 'married';
  state?: string;

  // Family & Children
  numChildren?: number;
  childrenAges?: number[];
  additionalChildrenExpected?: number;

  // Employment & Income
  employmentType1?: EmploymentType;
  employmentType2?: EmploymentType;
  annualIncome1?: number;
  annualIncome2?: number;
  bonusInfo?: string; // Raw bonus information for API to parse

  // Current Portfolio Balances
  emergencyFund?: number;
  currentTaxable?: number;
  currentTraditional?: number;  // Combined 401k + Traditional IRA
  currentRoth?: number;          // Combined Roth 401k + Roth IRA

  // Annual Savings Contributions (Legacy - rates/amounts per person)
  savingsRateTaxable1?: number;
  savingsRateTraditional1?: number;
  savingsRateRoth1?: number;
  savingsRateTaxable2?: number;
  savingsRateTraditional2?: number;
  savingsRateRoth2?: number;

  // Annual Savings Contributions (New - total amounts)
  contributionTraditional?: number;  // Combined Traditional 401k/IRA for both spouses
  contributionRoth?: number;         // Combined Roth contributions for both spouses
  contributionTaxable?: number;      // Combined taxable brokerage savings for both spouses
  contributionMatch?: number;        // Total employer match

  // Housing & Expenses (from API assumptions)
  monthlyMortgageRent?: number;
  monthlyUtilities?: number;
  monthlyInsurancePropertyTax?: number;
  monthlyHealthcareP1?: number;
  monthlyHealthcareP2?: number;
  monthlyOtherExpenses?: number;

  // Additional Expense Categories (for income calculators)
  monthlyHouseholdExpenses?: number;     // Groceries, supplies, etc.
  monthlyDiscretionary?: number;          // Entertainment, dining, shopping
  monthlyChildcare?: number;              // Childcare/daycare costs
  annualLifeInsuranceP1?: number;        // Person 1 life insurance (annual)
  annualLifeInsuranceP2?: number;        // Person 2 life insurance (annual)

  // Goals
  retirementAge?: number;
  desiredRetirementSpending?: number;
}

/**
 * Confidence level for assumptions
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Assumption with reasoning for transparent display
 */
export interface AssumptionWithReasoning {
  field: string;                    // Field name (can be ExtractedData key or calculator field)
  displayName: string;              // Human-readable field name
  value: any;                       // The assumed value
  reasoning: string;                // One-sentence explanation
  confidence: ConfidenceLevel;      // How confident we are in this assumption
  userProvided: boolean;            // True if explicitly stated, false if inferred
}

// ==================== Conversation State Types ====================

/**
 * Phases of the AI onboarding conversation
 */
export type ConversationPhase =
  | 'greeting'           // Initial greeting and explanation
  | 'data-collection'    // Gathering required information
  | 'assumptions-review' // Presenting assumptions for review
  | 'refinement'         // Allowing user to refine assumptions
  | 'complete';          // Onboarding finished

/**
 * Complete state for AI onboarding conversation
 */
export interface AIOnboardingState {
  conversationHistory: ConversationMessage[];
  extractedData: ExtractedData;
  assumptions: AssumptionWithReasoning[];
  currentPhase: ConversationPhase;
  questionIndex?: number;  // Track which pre-scripted question we're on
  lastUpdated: number;
  sessionId?: string;  // Optional session tracking
}

// ==================== API Request/Response Types ====================

/**
 * Request to AI onboarding endpoint
 */
export interface AIOnboardingRequest {
  messages: ConversationMessage[];
  extractedData?: ExtractedData;
  assumptions?: AssumptionWithReasoning[];
  phase: ConversationPhase;
}

/**
 * Streaming event types
 */
export type StreamEventType =
  | 'message_delta'      // Chunk of assistant message
  | 'data_update'        // Extracted data field update
  | 'assumption_added'   // New assumption created
  | 'phase_transition'   // Moving to new phase
  | 'complete'           // Conversation complete
  | 'error';             // Error occurred

/**
 * Base streaming event
 */
export interface BaseStreamEvent {
  type: StreamEventType;
}

/**
 * Message delta event (streaming text)
 */
export interface MessageDeltaEvent extends BaseStreamEvent {
  type: 'message_delta';
  delta: string;
}

/**
 * Data update event (field extracted)
 */
export interface DataUpdateEvent extends BaseStreamEvent {
  type: 'data_update';
  field: keyof ExtractedData;
  value: any;
}

/**
 * Assumption added event
 */
export interface AssumptionAddedEvent extends BaseStreamEvent {
  type: 'assumption_added';
  assumption: AssumptionWithReasoning;
}

/**
 * Phase transition event
 */
export interface PhaseTransitionEvent extends BaseStreamEvent {
  type: 'phase_transition';
  newPhase: ConversationPhase;
}

/**
 * Complete event (conversation finished)
 */
export interface CompleteEvent extends BaseStreamEvent {
  type: 'complete';
  finalData: ExtractedData;
  assumptions: AssumptionWithReasoning[];
}

/**
 * Error event
 */
export interface ErrorEvent extends BaseStreamEvent {
  type: 'error';
  error: string;
}

/**
 * Union of all possible stream events
 */
export type StreamEvent =
  | MessageDeltaEvent
  | DataUpdateEvent
  | AssumptionAddedEvent
  | PhaseTransitionEvent
  | CompleteEvent
  | ErrorEvent;

// ==================== Client Handler Types ====================

/**
 * Callbacks for streaming handler
 */
export interface StreamHandlerCallbacks {
  onMessageDelta?: (delta: string) => void;
  onDataUpdate?: (field: keyof ExtractedData, value: any) => void;
  onAssumptionAdded?: (assumption: AssumptionWithReasoning) => void;
  onPhaseTransition?: (newPhase: ConversationPhase) => void;
  onComplete?: (data: ExtractedData, assumptions: AssumptionWithReasoning[]) => void;
  onError?: (error: string) => void;
}

/**
 * Parameters for streaming handler
 */
export interface StreamHandlerParams extends StreamHandlerCallbacks {
  messages: ConversationMessage[];
  extractedData?: ExtractedData;
  assumptions?: AssumptionWithReasoning[];
  phase: ConversationPhase;
}

// ==================== Tool Calling Types (for Claude API) ====================

/**
 * Tool definition for updating extracted data
 */
export interface UpdateDataTool {
  name: 'update_extracted_data';
  description: string;
  input_schema: {
    type: 'object';
    properties: {
      updates: Partial<ExtractedData>;
    };
  };
}

/**
 * Tool definition for adding assumptions
 */
export interface AddAssumptionTool {
  name: 'add_assumption';
  description: string;
  input_schema: {
    type: 'object';
    properties: {
      field: { type: 'string' };
      displayName: { type: 'string' };
      value: any;
      reasoning: { type: 'string' };
      confidence: { type: 'string'; enum: ['high', 'medium', 'low'] };
    };
    required: ['field', 'displayName', 'value', 'reasoning', 'confidence'];
  };
}

/**
 * Tool definition for phase transitions
 */
export interface TransitionPhaseTool {
  name: 'transition_phase';
  description: string;
  input_schema: {
    type: 'object';
    properties: {
      newPhase: {
        type: 'string';
        enum: ['data-collection', 'assumptions-review', 'refinement', 'complete']
      };
    };
    required: ['newPhase'];
  };
}

// ==================== Validation Types ====================

/**
 * Data completeness check
 */
export interface DataCompleteness {
  isComplete: boolean;
  missingFields: Array<keyof ExtractedData>;
  optionalFields: Array<keyof ExtractedData>;
}

/**
 * Field validation result
 */
export interface FieldValidation {
  field: keyof ExtractedData;
  isValid: boolean;
  error?: string;
  warning?: string;
}

// ==================== Display Field Mappings ====================

/**
 * Human-readable field names for display
 */
export const FIELD_DISPLAY_NAMES: Record<keyof ExtractedData, string> = {
  age: 'Your Age',
  spouseAge: 'Spouse Age',
  maritalStatus: 'Marital Status',
  state: 'State of Residence',
  numChildren: 'Number of Children',
  childrenAges: 'Children Ages',
  additionalChildrenExpected: 'Additional Children Expected',
  employmentType1: 'Your Employment Type',
  employmentType2: 'Spouse Employment Type',
  annualIncome1: 'Your Annual Income',
  annualIncome2: 'Spouse Annual Income',
  emergencyFund: 'Emergency Fund Balance',
  currentTaxable: 'Taxable Brokerage Balance',
  currentTraditional: 'Traditional Retirement Accounts',
  currentRoth: 'Roth Retirement Accounts',
  savingsRateTaxable1: 'Your Taxable Savings Rate',
  savingsRateTraditional1: 'Your Traditional 401k/IRA Contributions',
  savingsRateRoth1: 'Your Roth Contributions',
  savingsRateTaxable2: 'Spouse Taxable Savings Rate',
  savingsRateTraditional2: 'Spouse Traditional 401k/IRA Contributions',
  savingsRateRoth2: 'Spouse Roth Contributions',
  contributionTraditional: 'Annual Traditional 401k/IRA Contributions',
  contributionRoth: 'Annual Roth Contributions',
  contributionTaxable: 'Annual Taxable Brokerage Savings',
  contributionMatch: 'Annual Employer Match',
  retirementAge: 'Target Retirement Age',
  desiredRetirementSpending: 'Desired Annual Retirement Spending',
  bonusInfo: 'Bonus Information',
  monthlyMortgageRent: 'Monthly Mortgage/Rent',
  monthlyUtilities: 'Monthly Utilities',
  monthlyInsurancePropertyTax: 'Monthly Insurance & Property Tax',
  monthlyHealthcareP1: 'Your Monthly Healthcare Premium',
  monthlyHealthcareP2: 'Spouse Monthly Healthcare Premium',
  monthlyOtherExpenses: 'Other Monthly Expenses',
  monthlyHouseholdExpenses: 'Monthly Household Expenses',
  monthlyDiscretionary: 'Monthly Discretionary Spending',
  monthlyChildcare: 'Monthly Childcare Costs',
  annualLifeInsuranceP1: 'Your Life Insurance (Annual)',
  annualLifeInsuranceP2: 'Spouse Life Insurance (Annual)',
};
