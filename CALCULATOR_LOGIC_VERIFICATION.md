# Calculator Logic Verification Report

**Date:** December 7, 2025
**Verifier:** Claude
**Purpose:** Systematic verification of all calculator logic

---

## Phase 1: Tax Calculation Verification

### Phase 1.1: 2025 Federal Tax Brackets - ⚠️ ISSUES FOUND

#### Standard Deductions - **ERROR IDENTIFIED**

**Location:** `lib/constants.ts:36-61`

| Filing Status | Code Value | IRS Official (OBBBA) | Status |
|---------------|------------|---------------------|--------|
| Single        | $15,000    | $15,750            | ❌ INCORRECT |
| Married (MFJ) | $30,000    | $31,500            | ❌ INCORRECT |

**Issue Details:**
- The One Big Beautiful Bill Act (OBBBA) was signed July 4, 2025
- Effective for tax year 2025 (filed in 2026)
- Section 70102 increased standard deductions from originally scheduled amounts
- Original (pre-OBBBA): $15,000 single / $30,000 married
- **Current IRS (post-OBBBA): $15,750 single / $31,500 married**

**Impact:**
- Calculator underestimates standard deductions by $750 (single) / $1,500 (married)
- Results in slightly HIGHER calculated tax burden than actual
- Affects all retirement projections using 2025+ tax calculations
- Makes retirement outcomes appear slightly more pessimistic than reality

**Recommendation:** Update constants to OBBBA values

**Sources:**
- [H&R Block: One Big Beautiful Bill Act Tax Impacts](https://www.hrblock.com/tax-center/irs/tax-law-and-policy/one-big-beautiful-bill-taxes/)
- [Kitces: Breaking Down The OBBBA](https://www.kitces.com/blog/obbba-one-big-beautiful-bill-act-tax-planning-salt-cap-senior-deduction-qbi-deduction-tax-cut-and-jobs-act-tcja-amt-trump-accounts/)
- [Tax Foundation: OBBBA Tax Changes FAQ](https://taxfoundation.org/research/all/federal/one-big-beautiful-bill-act-tax-changes/)

---

#### Tax Bracket Thresholds - VERIFICATION IN PROGRESS

**Location:** `lib/constants.ts:36-61`

**Single Filers:**

| Rate | Code Limit | IRS Official | Status |
|------|-----------|--------------|--------|
| 10%  | $11,925   | $11,925      | ✅ VERIFIED |
| 12%  | $48,475   | $48,475      | ✅ VERIFIED |
| 22%  | $103,350  | TBD          | 🔄 PENDING |
| 24%  | $197,300  | TBD          | 🔄 PENDING |
| 32%  | $250,525  | TBD          | 🔄 PENDING |
| 35%  | $626,350  | $626,350     | ✅ VERIFIED |
| 37%  | Infinity  | Over $626,350| ✅ VERIFIED |

**Married Filing Jointly:**

| Rate | Code Limit | IRS Official | Status |
|------|-----------|--------------|--------|
| 10%  | $23,850   | $23,850      | ✅ VERIFIED |
| 12%  | $96,950   | $96,950      | ✅ VERIFIED |
| 22%  | $206,700  | TBD          | 🔄 PENDING |
| 24%  | $394,600  | TBD          | 🔄 PENDING |
| 32%  | $501,050  | TBD          | 🔄 PENDING |
| 35%  | $751,600  | $751,600     | ✅ VERIFIED |
| 37%  | Infinity  | Over $751,600| ✅ VERIFIED |

**Partial Verification:**
- Top bracket (37%) threshold: ✅ CORRECT
- Bottom brackets (10%, 12%): ✅ CORRECT
- Middle brackets: Pending complete IRS table verification

**Sources:**
- [IRS: Federal Income Tax Rates and Brackets](https://www.irs.gov/filing/federal-income-tax-rates-and-brackets)
- [Tax Foundation: 2025 Tax Brackets](https://taxfoundation.org/data/all/federal/2025-tax-brackets/)
- [Fidelity: 2025 and 2026 Tax Brackets](https://www.fidelity.com/learning-center/personal-finance/tax-brackets)

---

#### Long-Term Capital Gains (LTCG) Brackets - VERIFICATION IN PROGRESS

**Location:** `lib/constants.ts:63-75`

**Single Filers:**

| Rate | Code Limit | IRS Official | Status |
|------|-----------|--------------|--------|
| 0%   | $50,000   | TBD          | 🔄 PENDING |
| 15%  | $492,300  | TBD          | 🔄 PENDING |
| 20%  | Infinity  | TBD          | 🔄 PENDING |

**Married Filing Jointly:**

| Rate | Code Limit | IRS Official | Status |
|------|-----------|--------------|--------|
| 0%   | $100,000  | TBD          | 🔄 PENDING |
| 15%  | $553,850  | TBD          | 🔄 PENDING |
| 20%  | Infinity  | TBD          | 🔄 PENDING |

**Note:** These values require verification against IRS Rev. Proc. 2024-40

---

#### Net Investment Income Tax (NIIT) - VERIFICATION IN PROGRESS

**Location:** `lib/constants.ts:77-81`

| Parameter | Code Value | IRS Official | Status |
|-----------|-----------|--------------|--------|
| NIIT Rate | 3.8%      | 3.8%        | ✅ VERIFIED |
| Single Threshold | $200,000 | $200,000 | ✅ VERIFIED |
| Married Threshold | $250,000 | $250,000 | ✅ VERIFIED |

**Status:** Thresholds and rate appear correct based on established law (not inflation-adjusted)

---

### Phase 1.2: LTCG Stacking Logic - ❌ **CRITICAL BUG FOUND**

**Location:** `lib/calculations/taxCalculations.ts:39-66`

#### Bug Description:

The LTCG tax calculation has an incorrect `used` variable tracking bug on **line 57**:

```typescript
used = b.limit - ordinaryIncome;  // ❌ BUG: This produces negative values
```

**Problem:** When ordinary income exceeds a bracket limit, `used` becomes negative, which causes incorrect `bracketRoom` calculations in the next iteration.

**Example Bug Scenario:**
- Ordinary Income: $600,000
- Capital Gain: $100,000
- Single filer LTCG brackets:
  - 0%: $0 - $50,000
  - 15%: $50,000 - $492,300
  - 20%: $492,300+

**Expected Result:**
Since ordinary income ($600k) > 15% threshold ($492,300), ALL $100k gain should be taxed at 20% = $20,000

**Actual Result:**
The bug causes ALL $100k gain to be taxed at 15% = $15,000 ❌

**Detailed Logic Trace:**

*Iteration 1 (0% bracket, limit $50k):*
- `bracketRoom = max(0, $50k - $0 - $600k) = $0` ✅ Correct
- `taxedHere = $0`
- `used = $50k - $600k = -$550k` ❌ Negative!

*Iteration 2 (15% bracket, limit $492,300):*
- `bracketRoom = max(0, $492,300 - (-$550k) - $600k) = $442,300` ❌ Wrong!
- `taxedHere = min($100k, $442,300) = $100k`
- `tax += $100k × 0.15 = $15,000` ❌ Should be 20%!

**Impact:**
- Undertaxes capital gains for high-income retirees
- Makes retirement projections overly optimistic
- Affects anyone with ordinary income > $492,300 (single) or $553,850 (married)
- Tax savings appear larger than reality

**Recommended Fix:**

Replace line 57 with proper cumulative tracking:
```typescript
used += taxedHere;  // Track cumulative gain consumed
```

Or redesign the loop to properly track bracket positions relative to ordinary income.

**Test Cases:**
- [x] ✅ Low income filers (0% bracket works correctly)
- [x] ✅ Middle income filers (15% bracket works when ord income < $50k)
- [x] ❌ **HIGH INCOME FILERS FAIL** (Ordinary income > $492k undertaxed by 5%)
- [ ] Edge case: Income exactly at bracket thresholds
- [ ] Edge case: Gain spanning all three LTCG brackets

---

### Phase 1.3: NIIT Calculation Logic - ✅ **VERIFIED**

**Location:** `lib/calculations/taxCalculations.ts:75-86`

**Status:** All NIIT calculations are working correctly ✅

**Test Results:**
- [x] ✅ Verify lesser of (investment income, excess over threshold)
- [x] ✅ Test edge case: Investment income << excess
- [x] ✅ Test edge case: Investment income >> excess
- [x] ✅ Verify calculation formula: base × 0.038
- [x] ✅ Thresholds correct: $200k single, $250k married
- [x] ✅ Rate correct: 3.8%
- [x] ✅ Returns $0 when MAGI below threshold
- [x] ✅ Returns $0 for negative/zero investment income

**Logic Verified:**
The NIIT calculation correctly:
1. Uses the lesser of investment income or excess over threshold
2. Applies 3.8% rate
3. Uses correct thresholds ($200k single, $250k married)
4. Handles all edge cases properly

---

### Phase 1.4: Self-Employment Tax - ✅ **VERIFIED**

**Location:** `lib/calculations/selfEmployed2026.ts:213-247`

**Status:** All SE tax calculations verified correct ✅

**Test Results:** 20/20 tests passed

**Verified Components:**

1. **SE Tax Base Calculation (92.35%)**
   - [x] ✅ Correctly calculates 92.35% of net SE income
   - [x] ✅ Formula: `seTaxBase = guaranteedPayments × 0.9235`

2. **Social Security Tax (12.4% capped)**
   - [x] ✅ Rate: 12.4% on SE tax base
   - [x] ✅ Wage base cap: $184,500 for 2026
   - [x] ✅ Correctly caps at wage base for high earners
   - [x] ✅ No cap for low earners

3. **Medicare Tax (2.9% uncapped)**
   - [x] ✅ Rate: 2.9% on full SE tax base
   - [x] ✅ No income cap (scales linearly)
   - [x] ✅ Applies to all SE income

4. **Additional Medicare Tax (0.9% over threshold)**
   - [x] ✅ Rate: 0.9% on income over threshold
   - [x] ✅ Thresholds: $200k single, $250k married, $125k MFS
   - [x] ✅ Correctly combines SE income + spouse W-2 for threshold
   - [x] ✅ Only applies to excess over threshold

5. **50% SE Tax Deduction**
   - [x] ✅ Deducts 50% of (SS tax + base Medicare tax)
   - [x] ✅ Does NOT include Additional Medicare Tax in deduction
   - [x] ✅ Correctly calculated for all income levels

**Sample Calculations Verified:**
- Typical SE ($150k): $21,194 total SE tax (14.13% effective rate)
- At wage base (~$200k): $22,878 SS + $5,351 Medicare
- High earner ($500k): $38,969 total (7.79% effective rate due to SS cap)

**Conclusion:** SE tax calculations are accurate and comply with IRS rules.

---

## Phase 2: Retirement Engine Core Logic - PENDING

## Phase 3: Tax-Optimized Withdrawal Strategy - PENDING

## Phase 4: Monte Carlo Simulation Accuracy - PENDING

## Phase 5: Bond Allocation & Portfolio Logic - PENDING

## Phase 6: Self-Employed & Income Calculators - PENDING

## Phase 7: Edge Cases & Validation Rules - PENDING

---

## Summary of Issues Found

### Critical Issues
1. ❌ **2025 Standard Deductions outdated** - Using pre-OBBBA values ($750-$1,500 too low)
2. ❌ **LTCG Tax Calculation Bug** - Incorrect bracket tracking causes undertaxation for high-income filers

### Warnings
1. ⚠️ **Marriage Penalty in 35% Bracket** - Intentional design, not a bug (1.2x ratio is historically accurate)

### Informational
None yet

---

## Next Steps

1. Complete verification of all 2025 tax bracket thresholds
2. Verify 2025 LTCG brackets against IRS Rev. Proc. 2024-40
3. Create comprehensive test suite for tax stacking logic
4. Continue systematic verification through all phases
