# Single Source of Truth Refactoring - Status Report

## Executive Summary

This document tracks the implementation of a unified PlanConfig system to serve as the single source of truth across the entire retirement calculator application (Configure, Results, Wizard, 2026 Planner, Budget, etc.).

**Overall Progress: ~45% Complete**

---

## ✅ COMPLETED

### 1. Unified PlanConfig Type System (P0.1 - Partial)

**Files Created:**
- `/types/plan-config.ts` - Complete type definition

**What It Does:**
- Extends `CalculatorInputs` with metadata and versioning
- Tracks field sources: user-entered, ai-suggested, default, imported
- Includes `fieldMetadata` for tracking who set what and when
- Includes `missingFields` array for incomplete configs
- Includes `assumptions` array from AI with reasoning
- Provides helper functions:
  - `createDefaultPlanConfig()` - Generate fresh config
  - `isConfigComplete()` - Check if all required fields set
  - `getMissingFields()` - Get list of missing required fields
  - `mergeConfigUpdates()` - Safely merge partial updates with metadata

**Key Features:**
```typescript
export interface PlanConfig extends CalculatorInputs {
  version: number;
  createdAt: number;
  updatedAt: number;
  name?: string;
  fieldMetadata: Record<string, FieldMetadata>;
  missingFields?: string[];
  assumptions?: Array<AssumptionWithReasoning>;
}
```

### 2. PlanConfig Context & Provider

**Files Created:**
- `/lib/plan-config-context.tsx` - React context for global config access

**What It Does:**
- Provides single source of truth via React Context
- Auto-saves to localStorage
- Tracks dirty state (unsaved changes)
- Exposes hooks:
  - `usePlanConfig()` - Access full config + update functions
  - `usePlanConfigField(field)` - Access specific field with setter

**API:**
```typescript
const { config, updateConfig, setConfig, resetConfig, isComplete, missingFields, isDirty } = usePlanConfig();

// Update config
updateConfig({ age1: 35, annualIncome1: 150000 }, 'user-entered');

// Access specific field
const [age, setAge] = usePlanConfigField('age1');
```

### 3. Provider Integration

**Files Modified:**
- `/components/Providers.tsx` - Added PlanConfigProvider

**Result:**
- PlanConfig is now available throughout the entire app via context
- Wraps BudgetProvider so both contexts are available

### 4. Improved Claude Prompt (EPIC 5.1 - Complete)

**Files Modified:**
- `/app/api/process-onboarding/route.ts` - Complete prompt rewrite

**Critical Improvements:**
- **DO NOT GUESS** rule for: state, spouse age/income, children, retirement age, savings rates, portfolio balances
- **Parsing rules** for ambiguous input:
  - "I make $X" → annualIncome1: X, annualIncome2: null (not 0)
  - "We make $X" → ask for breakdown
  - Married but no spouse info → null values + add to missingFields
- **Safe assumptions** only for low-risk items:
  - employmentType1: "w2" if income mentioned (medium confidence)
  - emergencyFund: 6 months expenses (low confidence)
- **Example-driven** prompt with concrete user/response pairs

### 5. API Response Structure Updated

**Files Modified:**
- `/lib/processAIOnboarding.ts` - Added MissingField interface

**New Response:**
```typescript
{
  extractedData: { /* fields with values or null */ },
  assumptions: [ /* AI assumptions with reasoning */ ],
  missingFields: [
    { field: "spouseAge", displayName: "Spouse Age", description: "Why we need this" }
  ],
  summary: "What was collected, assumed, and still needed"
}
```

### 6. AIConsole Component Updates (EPIC 1 - Complete)

**Files Modified:**
- `/components/onboarding/AIConsole.tsx`

**What Was Done:**
1. ✅ Added `missingFields` state
2. ✅ Added `hasProcessed` flag
3. ✅ Updated `handleProcess()`:
   - Sets phase to 'data-collection' if missingFields.length > 0
   - Sets phase to 'assumptions-review' if complete
   - Allows re-processing when user adds more input
4. ✅ Added UI for displaying missing fields panel with amber warning styling
5. ✅ Prevented "stuck in Processing..." state with proper button states

**Key Features:**
```typescript
// Missing fields state
const [missingFields, setMissingFields] = useState<MissingField[]>([]);
const [hasProcessed, setHasProcessed] = useState(false);

// Smart phase transition
if (result.missingFields.length > 0) {
  setPhase('data-collection'); // Stay in collection
} else {
  setPhase('assumptions-review'); // Move to review
}
```

**Missing Fields Panel UI:**
- Amber warning box with AlertCircle icon
- Lists each missing field with description
- Clear call-to-action to provide details and reprocess
- Fully accessible with ARIA labels

### 7. Wizard Integration with PlanConfig (P0.2 - Complete)

**Files Modified:**
- `/components/onboarding/OnboardingWizard.tsx`

**What Was Done:**
- ✅ Imported `usePlanConfig()` hook
- ✅ Updated `handleComplete()` to write to PlanConfig context
- ✅ All AI-extracted data now flows to single source of truth
- ✅ Assumptions saved to config with metadata
- ✅ Maintained legacy sharedIncomeData support (will be removed in Phase 4)

**Implementation:**
```typescript
const { updateConfig } = usePlanConfig();

const handleComplete = async (extractedData, assumptions) => {
  const { generatedAssumptions, ...calculatorInputs } = mapAIDataToCalculator(
    extractedData, assumptions
  );

  // Write to PlanConfig context (single source of truth)
  updateConfig(calculatorInputs, 'ai-suggested');

  // Save assumptions to config
  if (generatedAssumptions?.length > 0) {
    updateConfig({ assumptions: generatedAssumptions }, 'ai-suggested');
  }

  // Legacy support + trigger parent
  await onComplete(calculatorInputs);
  onClose();
};
```

---

## 🚧 IN PROGRESS

_No tasks currently in progress_

---

## 📋 TODO - HIGH PRIORITY

### 1. Refactor app/page.tsx to Use PlanConfig (P0.1 - Critical)

**File:** `/app/page.tsx`

**Current:** 60+ individual useState hooks

**Target:** Single config from context

**Implementation Strategy:**

a) **Add context hook:**
```tsx
const { config, updateConfig } = usePlanConfig();
```

b) **Replace all useState with config fields:**
```tsx
// OLD:
const [personalInfo, setPersonalInfo] = useState({ ... });
const [age1, setAge1] = useState(30);

// NEW:
const age1 = config.age1;
const marital = config.marital;
```

c) **Replace all setters with updateConfig:**
```tsx
// OLD:
setAge1(35);

// NEW:
updateConfig({ age1: 35 });
```

d) **Update handleWizardComplete:**
```tsx
const handleWizardComplete = useCallback(async (wizardData) => {
  // Config is already updated by wizard via context
  // Just trigger calculation and close
  setActiveMainTab('all');
  calc(); // Reads from context automatically
}, [calc]);
```

e) **Update calc() function:**
```tsx
const calc = useCallback(async () => {
  setIsRunning(true);
  setErr(null);

  try {
    // Read from config instead of scattered state
    const result = await runRetirementEngine(config);
    setRes(result);
  } catch (error) {
    setErr(error.message);
  } finally {
    setIsRunning(false);
  }
}, [config]);
```

**This is the BIGGEST refactor - affects 100+ lines**

### 4. Update 2026 Income Planners (EPIC 2.1 - High Priority)

**Files:**
- `/app/income-2026/page.tsx`
- `/app/self-employed-2026/page.tsx`

**Current:** Read from Budget context + localStorage

**Target:** Read from PlanConfig, optionally write back

**Implementation:**

a) **Read from PlanConfig:**
```tsx
const { config, updateConfig } = usePlanConfig();

useEffect(() => {
  // Initialize from PlanConfig
  setP1BaseIncome(config.annualIncome1 || 0);
  setP2BaseIncome(config.annualIncome2 || 0);
  setP1PreTax401k(config.cPre1 || 0);
  setMaritalStatus(config.marital);
  // ...
}, [config]);
```

b) **Add "Apply to Main Plan" Button:**
```tsx
<Button
  onClick={() => {
    updateConfig({
      annualIncome1: p1BaseIncome,
      annualIncome2: p2BaseIncome,
      cPre1: p1PreTax401k,
      // ... other fields
    }, 'user-entered');

    alert('Applied to main retirement plan!');
  }}
>
  Apply Changes to Retirement Plan
</Button>
```

c) **Remove localStorage dependency:**
- Delete `sharedIncomeData` logic
- Use PlanConfig as single source

---

## 📋 TODO - MEDIUM PRIORITY

### 5. Create NumericInput Component (EPIC 3.1)

**File:** `/components/ui/NumericInput.tsx` (new)

**Features:**
- Ctrl+A / Cmd+A selects field content only (not whole page)
- Format with commas on blur (Intl.NumberFormat)
- Store raw numeric value
- Validation (min/max ranges)

**Usage:**
```tsx
<NumericInput
  value={config.annualIncome1}
  onChange={(value) => updateConfig({ annualIncome1: value })}
  min={0}
  max={10_000_000}
  label="Annual Income"
/>
```

### 6. Add Input Validation (EPIC 3.2)

**Implementation:**
- Add validation to `mergeConfigUpdates()` in plan-config.ts
- Validate ranges:
  - Age: 18-100
  - Retirement age: > current age, < 75
  - Savings rate: 0-0.5
  - Income: ≥ 0
- Show inline validation errors in UI

### 7. Scenario Management (EPIC 4.1)

**Files:**
- `/lib/scenarios-context.tsx` (new)
- `/components/scenarios/ScenarioManager.tsx` (new)

**Features:**
- Save current PlanConfig as named scenario
- Load saved scenario into PlanConfig
- Compare 2-4 scenarios side-by-side
- Show diffs: success rate, safe income, end wealth

**Data Structure:**
```typescript
interface SavedScenario {
  id: string;
  name: string;
  config: PlanConfig;
  results?: CalculationResult;
  createdAt: number;
}
```

---

## 📋 TODO - LOW PRIORITY

### 8. Non-Advisory AI Language (EPIC 5.2)

**Implementation:**
- Review all AI-generated text in wizard
- Replace "you should" → "one option is"
- Add disclaimers: "This is not financial advice"
- Passive, suggestive tone only

### 9. Clean Up Legacy Code

**After** refactoring is complete:
- Remove old `OnboardingWizardData` types
- Remove scattered useState hooks from page.tsx
- Remove `wizardDataToAppState()` mapper
- Remove `sharedIncomeData` localStorage logic
- Consolidate type definitions

---

## 🎯 IMPLEMENTATION ROADMAP

### Phase 1: Core Infrastructure (DONE ✅)
- ✅ PlanConfig type system
- ✅ PlanConfig context/provider
- ✅ Improved Claude prompts
- ✅ missingFields in API response

### Phase 2: Wizard Integration (DONE ✅)
- ✅ Complete AIConsole refactor
- ✅ Wire wizard to PlanConfig
- ✅ Add missing fields UI

### Phase 3: Main App Refactor (MAJOR - 8-12 hours)
- ⏳ Refactor page.tsx to use PlanConfig
- ⏳ Update all InputForm props
- ⏳ Update calc() to read from config

### Phase 4: 2026 Planners (4-6 hours)
- ⏳ Read from PlanConfig
- ⏳ Add "Apply to Plan" functionality
- ⏳ Remove localStorage dependencies

### Phase 5: Polish (4-6 hours)
- ⏳ NumericInput component
- ⏳ Input validation
- ⏳ Scenario management
- ⏳ Clean up legacy code

---

## 🚨 BREAKING CHANGES

### For Users
- None - backward compatible via localStorage migration

### For Developers
- `usePlanConfig()` replaces scattered state hooks
- All updates must go through `updateConfig()`
- Wizard writes to context, not parent callbacks
- 2026 planners read from context, not props

---

## 📝 NOTES

### Design Decisions

1. **Why Context over Redux/Zustand?**
   - Simpler for single-page app
   - No external dependencies
   - TypeScript-friendly
   - Easy localStorage integration

2. **Why Keep Budget Context Separate?**
   - Budget is derived/calculated state
   - PlanConfig is input state
   - Keeps concerns separated
   - May merge later if needed

3. **Why Metadata Tracking?**
   - Show users what was AI-suggested vs user-entered
   - Debug data provenance
   - Enable undo/redo later
   - Support scenario comparison

### Testing Strategy

After each phase:
1. Wizard → Config → Results (verify data flows)
2. Configure → Config → Results (verify updates)
3. 2026 Planner → Config → Results (verify roundtrip)
4. Scenario save/load (verify persistence)

### Migration Path

1. Deploy with both systems active
2. Auto-migrate localStorage on first load
3. Validate old state → new config mapping
4. Remove old code after 2 weeks

---

## 📞 QUESTIONS FOR USER

1. **Scenario Management Priority?**
   - Is save/compare scenarios needed for MVP?
   - Or can it wait for v2?

2. **2026 Planner Integration Depth?**
   - Should 2026 changes auto-update main plan?
   - Or require explicit "Apply" action?

3. **Validation Strictness?**
   - Should invalid input block calculation?
   - Or just warn and allow override?

4. **Legacy Wizard Support?**
   - Keep old 4-step wizard as fallback?
   - Or fully replace with AI wizard?
