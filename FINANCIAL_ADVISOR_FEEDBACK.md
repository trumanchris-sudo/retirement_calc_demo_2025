# Financial Advisor Beta Review - Comprehensive Feedback

**Date**: 2026-01-08
**Reviewer**: External Financial Advisor (Professional Beta Tester)
**Tool Version**: WorkDieRetire Retirement Calculator
**Review Scope**: Functional, mathematical, and UX validation

---

## Executive Summary

**Overall Assessment**: Genuinely impressive transparency and rigor. This is **institutional-level planning software**, not a toy calculator. Far more transparent than 95% of consumer retirement tools.

**Status**: Very close to professional-grade. Needs fixes for:
1. **Credibility** (aggressive return defaults)
2. **Trust** (contribution sync, legacy defaults)
3. **Clarity** (assumption visibility)

**Reviewer's Quote**:
> "If you fix contribution synchronization, normalize return assumptions, and clean up legacy defaults, this becomes a tool that financial professionals would actually respect, not just consumers."

---

## 🎯 Core Strengths (DO NOT CHANGE)

### 1. Transparency & Math Disclosure ⭐ MAJOR WIN
- **Math and Check Us sections are excellent**
- Explicitly discloses:
  - Return modeling (fixed vs random walk vs Monte Carlo)
  - Contribution timing assumptions
  - Withdrawal mechanics
  - Tax calculations (ordinary income, LTCG, NIIT, RMDs)
  - Social Security bend-point math
  - Estate and generational wealth logic

**Impact**: Institutional-level transparency. This alone differentiates from almost every competitor.

---

### 2. Stress Testing & Historical Context ⭐ EXCELLENT
- Sequence-of-returns risk clearly explained
- Historical crashes contextualized correctly
- Monte Carlo already embeds these risks
- Shows intellectual honesty - avoids false certainty

---

### 3. SSOT (Single Source of Truth) Concept ⭐ RIGHT ABSTRACTION
- Centralized view of inputs and derived assumptions
- Clear separation between user-provided vs inferred defaults
- **Once synced correctly**, this becomes a cornerstone feature

---

## 🚨 Critical Issues (HIGH PRIORITY)

### 1. ⚠️ Return Assumptions Too Aggressive

**Current Default**:
- ~9.8% nominal return
- ~7% real return implied

**Problem**:
- Historical data shows long-run real returns closer to **~5.2%**
- 100% equity allocation CAN justify higher returns, BUT:
  - Most users won't stay 100% equities forever
  - Sequence risk + valuation regimes not reflected in single static number

**Impact**: Materially inflates:
- Terminal balances
- Safe withdrawal estimates
- "Freedom Date" projections
- Generational wealth outputs

**Recommendation**:
```
Offer explicit presets:
- Conservative: 5.5–6% nominal ✓ Default for most users
- Moderate: 6.5–7%
- Aggressive: 7.5–8% (100% equities, high risk tolerance)

Make 9.8% opt-in with clear label:
"Historically optimistic / equity-heavy assumption"
```

**Status**: ❌ NOT FIXED
**Priority**: 🔥 CRITICAL (credibility issue)

---

### 2. ⚠️ Contribution Rate Synchronization Bug

**Current Behavior**:
- Wizard uses AI mapper with **60% pre-tax / 30% Roth / 10% taxable** split
- For $100k income at 15% savings ($15k total):
  - Pre-tax: $9k (9% of income)
  - Roth: $4.5k (4.5% of income)
  - Taxable: $1.5k (1.5% of income)

**Problem**:
- **Numbers reconcile but transparency is poor**
- Users don't see breakdown during wizard review
- SSOT shows dollar amounts without explaining split strategy
- Advisors will distrust if they can't trace the logic

**Impact**:
- Users confused why outcomes differ from expectations
- Professionals immediately distrust the model
- Breaks SSOT promise of "single source of truth"

**Recommendation**:
```
Add contribution breakdown card to AssumptionsReview:

"Your $15,000 annual savings (15% of income) is allocated:
- $9,000 (60% of savings) → Pre-tax 401(k)  [9% of income]
- $4,500 (30% of savings) → Roth IRA        [4.5% of income]
- $1,500 (10% of savings) → Taxable account [1.5% of income]

This split provides tax diversification while maximizing
employer match eligibility and retirement account benefits."
```

**Technical Root Cause**:
- `lib/aiOnboardingMapper.ts` lines 144-150 apply 60/30/10 split
- Individual assumptions shown but not the **strategy**
- Need summary card explaining the allocation logic

**Status**: ⚠️ PARTIALLY INVESTIGATED
**Priority**: 🔥 CRITICAL (trust issue)

**Files Modified**:
- `lib/aiOnboardingMapper.ts` (calculation logic - CORRECT)
- Need to modify: `components/onboarding/AssumptionsReview.tsx` (display - UNCLEAR)

---

### 3. ✅ Legacy Planning Default Children Bug

**Problem**: Even when user enters 0 children, Legacy Planning defaults to 2 children with ages "5, 3"

**Impact**: **Trust-breaking immediately**. User says "no children" but tool ignores it.

**Fix Applied**: Added useEffect to sync PlanConfig.numChildren → legacy states
```typescript
// app/page.tsx lines 1335-1356
useEffect(() => {
  const numChildren = planConfig.numChildren ?? 0;
  if (numChildren === 0) {
    setHypStartBens(0);
    setChildrenCurrentAges("");
    setNumberOfChildren(0);
  }
  // ... handle non-zero cases
}, [planConfig.numChildren, planConfig.childrenAges]);
```

**Status**: ✅ FIXED (commit 3841512)
**Priority**: 🔥 CRITICAL (was trust-breaking, now resolved)

---

## 🔧 Conceptual & Modeling Issues (MEDIUM PRIORITY)

### 4. Withdrawal Strategy Simplification

**Current**: Proportional withdrawal (clearly disclosed)

**Issue**: Not tax-optimal in many real-world cases. Sophisticated users notice quickly.

**Recommendation**:
- ✅ Already disclose limitation (good!)
- Consider adding optional "tax-aware drawdown order" later
- Or explicitly label as "simplified withdrawal model"

**Status**: ⏸️ DEFERRED (acceptable as documented limitation)

---

### 5. Healthcare & Long-Term Care Assumptions

**Current**: Medicare premiums, LTC costs based on national averages

**Issue**:
- Costs vary dramatically by geography
- IRMAA sensitivity not obvious to users

**Recommendation**:
```
Add explainer banner:
"Healthcare is one of the largest sources of planning error.
National averages used - adjust for your situation."

Consider conservative presets for healthcare inflation.
```

**Status**: ⏸️ DEFERRED (medium priority)

---

### 6. Generational Wealth Modeling

**Strength**: Very powerful feature, differentiates from competitors

**Risk**: Easiest to misuse. Users may overinterpret outputs as "guarantees"

**Concerns**:
- Fertility, population growth, constant real returns = heroic assumptions
- 10,000-year projections inherently speculative

**Recommendation**:
```
Add prominent disclaimer:
"⚠️ Illustrative, not predictive
Generational wealth projections use simplified demographic
models and constant return assumptions. Real outcomes will
vary significantly based on unpredictable factors."

Consider adding "fragility score" or sensitivity toggle.
```

**Status**: ⏸️ DEFERRED (low priority, feature works as intended)

---

## 💡 UX & Communication Improvements

### 7. Return Model Visibility

**Issue**: Users don't always know if they're seeing:
- Fixed return?
- Monte Carlo?
- Optimized hybrid?

**Current**: Toggling between "Tax Optimized" and "Monte Carlo" not explicit enough

**Recommendation**:
```
Add visual indicator in Results header:
[Icon] Monte Carlo Mode (1,000 simulations)
[Icon] Fixed Return Mode (9.8% nominal)
[Icon] Tax-Optimized Strategy
```

**Status**: ⏸️ DEFERRED (minor UX improvement)

---

### 8. Assumption Discoverability

**Issue**: Most important assumptions (return rate, income growth) are buried

**Recommendation**:
- Centralize ALL assumptions under Configure tab
- Math page should explain, not hide, inputs
- Add "View All Assumptions" shortcut in header

**Status**: ⏸️ DEFERRED (medium priority)

---

### 9. Language Precision

**Issue**: Legislative references ambiguous about:
- Current law vs modeled assumptions
- Avoid "permanent" when modeling contingent law

**Recommendation**: Add disclaimer on tax assumptions:
```
"Tax calculations based on 2026 law. Future tax rates,
brackets, and estate exemptions are subject to change."
```

**Status**: ⏸️ DEFERRED (low priority)

---

## 📊 Status Summary

| Issue | Priority | Status | Commit |
|-------|----------|--------|--------|
| Worker error bug | 🔥 CRITICAL | ✅ FIXED | ba612a8 |
| Return assumptions too aggressive | 🔥 CRITICAL | ❌ NOT FIXED | - |
| Contribution sync transparency | 🔥 CRITICAL | ⚠️ INVESTIGATED | - |
| Legacy children default | 🔥 CRITICAL | ✅ FIXED | 3841512 |
| Withdrawal strategy docs | 🟡 MEDIUM | ✅ ACCEPTABLE | N/A |
| Healthcare cost warnings | 🟡 MEDIUM | ⏸️ DEFERRED | - |
| Generational disclaimers | 🟢 LOW | ⏸️ DEFERRED | - |
| Return model visibility | 🟢 LOW | ⏸️ DEFERRED | - |
| Assumption discoverability | 🟡 MEDIUM | ⏸️ DEFERRED | - |
| Language precision | 🟢 LOW | ⏸️ DEFERRED | - |

---

## 🎯 Immediate Action Items

### For Professional Release:

**Must Fix** (before wider release):
1. ❌ Add return assumption presets (conservative/moderate/aggressive)
2. ⚠️ Add contribution breakdown to wizard assumptions review
3. ✅ Fix legacy children default (DONE)
4. ✅ Fix worker error (DONE)

**Should Fix** (for credibility):
5. Add expense auto-scaling warning banner
6. Improve return model visibility in Results header
7. Centralize assumptions in Configure tab

**Nice to Have** (polish):
8. Add generational wealth disclaimers
9. Healthcare cost geography warnings
10. Tax law contingency notes

---

## Final Assessor Quote

> "You are **very close** to a genuinely differentiated planning engine. This is not a toy calculator. It's closer to eMoney / RightCapital lite with **better transparency** but rougher defaults. Fix the critical three (returns, contributions, legacy) and this becomes something financial professionals would actually respect."

---

## Technical Notes

### Modified Monte Carlo Worker
- Now uses ±15% capped returns (194 data points)
- Conservative vs historical extremes (+52%, -43%)
- Default is already Monte Carlo (user feedback: "4 is already an option and the default")

### SSOT Architecture
- PlanConfig context is centralized state
- Wizard writes directly to PlanConfig
- Legacy planning needed sync (now fixed)
- Contribution mapper logic is sound (transparency issue, not calculation)

### Code Locations
- **Contribution split**: `lib/aiOnboardingMapper.ts:144-150`
- **Legacy children sync**: `app/page.tsx:1335-1356`
- **Worker error fix**: `public/monte-carlo-worker.js:1192`
- **Return assumptions**: `lib/aiOnboardingMapper.ts:493-499`

---

**Document Status**: Initial compilation from advisor feedback
**Next Review**: After implementing critical fixes 1-4
