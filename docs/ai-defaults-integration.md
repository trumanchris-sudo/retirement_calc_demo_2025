# AI Defaults Integration

This document explains how Claude AI is integrated into the onboarding wizard to provide personalized default suggestions for new users.

## Overview

The AI defaults feature uses Claude Haiku to generate conservative, realistic retirement planning suggestions based on minimal user inputs (age, income, marital status). This helps new users get started quickly with sensible defaults while maintaining full control to override any suggestions.

## Integration Points

### 1. SavingsStep (Step 2)
**Triggers when:** User enters income and selects "Typical savings rate" mode
**Provides:**
- Recommended savings rate (8-25% of gross income)
- Reasoning bullets explaining the suggestion
- Falls back to heuristic-based defaults if AI unavailable

**User experience:**
- Loading indicator appears while fetching suggestions
- Gradient alert card shows AI reasoning when available
- Savings rate automatically updates to AI suggestion
- User can switch to custom/max modes at any time

### 2. GoalsStep (Step 3)
**Triggers when:** AI defaults already fetched in Step 2
**Provides:**
- Recommended retirement age (60-70)
- Contextual explanation based on current age

**User experience:**
- Retirement age slider auto-updates if still at default (65)
- Info alert explains the suggestion
- User can immediately adjust slider to preferred age

## API Contract

### Endpoint
`POST /api/ai-defaults`

### Request
```typescript
{
  age: number                    // 18-100
  spouseAge?: number             // Optional
  maritalStatus: 'single' | 'married'
  income: number                 // Annual gross income
  spouseIncome?: number          // Optional
  state?: string                 // Optional, for state-specific considerations
}
```

### Response
```typescript
{
  savingsRate: number            // 0.08-0.25 (as decimal)
  retirementAge: number          // 60-70 (integer)
  spendingMultiplier: number     // 0.60-0.90 (as decimal)
  reasoning: string[]            // 2-3 bullet points
  model: string                  // 'claude-haiku-4-5-20251001'
  timestamp: number              // Unix timestamp
}
```

## Safety & Validation

### Server-Side Validation
- All numeric values clamped to safe bounds
- Invalid Claude responses trigger fallback defaults
- Request validation ensures required fields present

### Fallback Strategy
When Claude API is unavailable (no API key, network error, parse error):
1. Use income-based heuristics for savings rate
2. Use age-based heuristics for retirement age
3. Return conservative 0.80 spending multiplier
4. Provide explanatory reasoning

### User Control
- **Never overrides user edits**: AI only pre-fills values when user hasn't manually changed them
- **Transparent**: AI suggestions always show reasoning
- **Escapable**: User can choose custom/max modes instantly
- **Not persistent**: Switching back to "typical" mode doesn't re-fetch AI

## Implementation Files

### Backend
- `/app/api/ai-defaults/route.ts` - API endpoint
- `/types/ai-defaults.ts` - TypeScript interfaces

### Frontend
- `/hooks/useAIDefaults.ts` - React hook for fetching
- `/components/onboarding/steps/SavingsStep.tsx` - Primary integration
- `/components/onboarding/steps/GoalsStep.tsx` - Secondary integration

### Dependencies
- `@anthropic-ai/sdk` - Claude API client (already installed)
- `lucide-react` - Icons (Sparkles, Info, Loader2)

## Configuration

### Environment Variables
```env
ANTHROPIC_API_KEY=your_key_here
```

Get API key from: https://console.anthropic.com/

### Model Settings
- **Model**: `claude-haiku-4-5-20251001` (fast, cost-effective)
- **Temperature**: 0.3 (low for consistent numeric outputs)
- **Max tokens**: 500
- **Format**: JSON-only responses

## Prompt Design

The Claude prompt is designed to:
1. Generate **conservative defaults** (not aggressive/risky)
2. Stay within **safe numeric bounds** (8-25% savings, 60-70 retirement age)
3. Provide **concrete reasoning** (not generic advice)
4. Respect **constraints** (no personalized financial/tax advice)
5. Return **pure JSON** (no markdown, easy to parse)

## Testing

### Manual Testing
1. Start wizard with no API key → Should use fallback defaults
2. Enter age 30, income $75k → Should suggest ~12-15% savings, age 62-65 retirement
3. Enter age 55, income $120k → Should suggest ~15-18% savings, age 67-68 retirement
4. Switch from "typical" to "custom" mode → AI suggestions disappear
5. Switch back to "typical" → Should NOT re-fetch (uses cached defaults)

### Edge Cases
- **No income**: AI not triggered until income > 0
- **Network timeout**: Falls back to heuristic defaults
- **Malformed JSON from Claude**: Caught and fallback used
- **Out-of-bounds values**: Clamped server-side before returning

## Future Enhancements

Potential improvements (not currently implemented):
- Cache AI responses per user profile to reduce API calls
- Add A/B testing to measure adoption of AI suggestions vs manual
- Expand to suggest specific contribution amounts (401k vs IRA split)
- Consider state tax rates in retirement age recommendations
- Track user acceptance rate of AI suggestions

## Troubleshooting

### "Using standard defaults" message
- API key not configured in `.env.local`
- Check: `process.env.ANTHROPIC_API_KEY`

### AI suggestions not appearing
- Ensure income > 0
- Ensure savings mode = "typical"
- Check browser console for fetch errors
- Verify `/api/ai-defaults` endpoint responding

### Unexpected savings rates
- Claude responses are clamped to 8-25% range
- Check server logs for actual Claude response
- May indicate prompt needs tuning
