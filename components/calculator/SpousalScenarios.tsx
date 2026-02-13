'use client';

/**
 * Spousal Scenario Planner Component
 *
 * Helps couples plan for difficult but necessary scenarios:
 * 1. Early Death of Primary Earner - Survivor benefits, life insurance needs
 * 2. Early Death of Secondary Earner - Childcare costs, often underinsured
 * 3. Divorce Scenario - QDRO, SS benefits from ex-spouse
 * 4. Long-Term Disability - Disability insurance, SS disability
 *
 * "Hope for the best, plan for the worst" approach with sensitive UI.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Shield,
  Heart,
  AlertTriangle,
  Users,
  Scale,
  Accessibility,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  CheckCircle2,
  FileText,
  DollarSign,
  Baby,
  Briefcase,
  HelpCircle,
  ArrowRight,
  Info,
  Calculator,
  Home,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { fmt } from '@/lib/utils';
import { calcPIA, calcSocialSecurity } from '@/lib/calculations/retirementEngine';
import type { FilingStatus } from '@/types/calculator';

// ==================== Types ====================

interface SpousalScenariosProps {
  // Personal Information
  age1: number;
  age2: number;
  marital: FilingStatus;
  retirementAge: number;

  // Income Information
  primaryIncome: number;
  spouseIncome: number;

  // Current Balances
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;

  // Social Security
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2: number;
  ssClaimAge2: number;

  // Family
  numChildren?: number;
  childrenAges?: number[];

  // Insurance (optional - for gap analysis)
  lifeInsuranceP1?: number;
  lifeInsuranceP2?: number;
  disabilityInsuranceP1?: number;
  disabilityInsuranceP2?: number;

  // Expenses
  monthlyExpenses?: number;
  monthlyMortgage?: number;
  monthlyChildcare?: number;
}

interface ScenarioAnalysis {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  severity: 'critical' | 'warning' | 'info';
  financialImpact: {
    label: string;
    amount: number;
    type: 'gap' | 'benefit' | 'loss';
  };
  keyFindings: string[];
  actionItems: ActionItem[];
  details: ScenarioDetail[];
}

interface ActionItem {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'insurance' | 'legal' | 'financial' | 'planning';
  completed?: boolean;
}

interface ScenarioDetail {
  label: string;
  value: string;
  explanation?: string;
}

// ==================== Constants ====================

// Social Security survivor benefit constants
const SS_SURVIVOR_BENEFIT_PCT = 1.0; // 100% of deceased's PIA at FRA
const SS_SURVIVOR_EARLY_REDUCTION_PCT = 0.715; // 71.5% at age 60 (earliest)
const SS_WIDOW_EARLIEST_AGE = 60;
const SS_WIDOW_DISABLED_AGE = 50;
const SS_CHILD_BENEFIT_PCT = 0.75; // 75% of deceased's PIA per child
const SS_FAMILY_MAX_PCT = 1.8; // Family max ~150-180% of PIA

// QDRO and divorce constants
const MARRIAGE_YEARS_FOR_SS = 10; // Must be married 10+ years for ex-spouse SS benefits
const QDRO_TYPICAL_SPLIT = 0.5; // 50/50 split of marital retirement assets

// Disability constants
const SS_DISABILITY_WAIT_MONTHS = 5; // 5-month waiting period
const DISABILITY_INSURANCE_TARGET_PCT = 0.6; // Target 60% income replacement
const AVG_LTD_POLICY_PCT = 0.6; // Most LTD policies cover 60% of income

// Life insurance guidelines (years of income)
const LIFE_INSURANCE_MULTIPLIER_WITH_KIDS = 10;
const LIFE_INSURANCE_MULTIPLIER_NO_KIDS = 7;
const MORTGAGE_PAYOFF_PRIORITY = true;

// Average childcare cost per child per year
const AVG_CHILDCARE_COST_PER_CHILD = 15000;

// ==================== Helper Functions ====================

/**
 * Calculate survivor Social Security benefit
 */
function calculateSurvivorBenefit(
  deceasedSSIncome: number,
  survivorAge: number,
  hasMinorChildren: boolean
): { monthlyBenefit: number; eligibility: string } {
  const deceasedPIA = calcPIA(deceasedSSIncome);

  // With minor children, survivor can collect regardless of age
  if (hasMinorChildren) {
    return {
      monthlyBenefit: deceasedPIA * SS_SURVIVOR_BENEFIT_PCT,
      eligibility: 'Eligible immediately (caring for minor children)',
    };
  }

  // Age-based eligibility
  if (survivorAge >= 67) {
    return {
      monthlyBenefit: deceasedPIA * SS_SURVIVOR_BENEFIT_PCT,
      eligibility: 'Full survivor benefit at Full Retirement Age',
    };
  } else if (survivorAge >= SS_WIDOW_EARLIEST_AGE) {
    // Reduced benefit between 60-67
    const reductionPerMonth = (1 - SS_SURVIVOR_EARLY_REDUCTION_PCT) / 84; // 84 months between 60 and 67
    const monthsEarly = (67 - survivorAge) * 12;
    const reduction = Math.min(monthsEarly * reductionPerMonth, 1 - SS_SURVIVOR_EARLY_REDUCTION_PCT);
    return {
      monthlyBenefit: deceasedPIA * (1 - reduction),
      eligibility: `Reduced benefit at age ${survivorAge} (${((1 - reduction) * 100).toFixed(0)}% of full)`,
    };
  } else {
    return {
      monthlyBenefit: 0,
      eligibility: `Not eligible until age ${SS_WIDOW_EARLIEST_AGE} (${SS_WIDOW_EARLIEST_AGE - survivorAge} years)`,
    };
  }
}

/**
 * Calculate child survivor benefits
 */
function calculateChildSurvivorBenefits(
  deceasedSSIncome: number,
  numMinorChildren: number
): number {
  if (numMinorChildren === 0) return 0;

  const deceasedPIA = calcPIA(deceasedSSIncome);
  const perChildBenefit = deceasedPIA * SS_CHILD_BENEFIT_PCT;
  const totalChildBenefits = perChildBenefit * numMinorChildren;

  // Family maximum applies
  const familyMax = deceasedPIA * SS_FAMILY_MAX_PCT;
  return Math.min(totalChildBenefits, familyMax - deceasedPIA);
}

/**
 * Calculate life insurance needs
 */
function calculateLifeInsuranceNeed(
  annualIncome: number,
  mortgageBalance: number,
  numChildren: number,
  childrenAges: number[],
  existingLifeInsurance: number
): { recommended: number; gap: number; breakdown: { category: string; amount: number }[] } {
  const breakdown: { category: string; amount: number }[] = [];

  // Income replacement (years of income based on children)
  const multiplier = numChildren > 0 ? LIFE_INSURANCE_MULTIPLIER_WITH_KIDS : LIFE_INSURANCE_MULTIPLIER_NO_KIDS;
  const incomeReplacement = annualIncome * multiplier;
  breakdown.push({ category: 'Income Replacement', amount: incomeReplacement });

  // Mortgage payoff
  if (mortgageBalance > 0) {
    breakdown.push({ category: 'Mortgage Payoff', amount: mortgageBalance });
  }

  // Childcare costs until 18
  if (numChildren > 0 && childrenAges.length > 0) {
    const youngestAge = Math.min(...childrenAges);
    const yearsOfChildcare = Math.max(0, 18 - youngestAge);
    const childcareCosts = yearsOfChildcare * AVG_CHILDCARE_COST_PER_CHILD * numChildren;
    breakdown.push({ category: 'Childcare Costs', amount: childcareCosts });
  }

  // Education fund ($50k per child estimate)
  if (numChildren > 0) {
    const educationFund = numChildren * 50000;
    breakdown.push({ category: 'Education Fund', amount: educationFund });
  }

  // Emergency fund (6 months of income)
  const emergencyFund = annualIncome * 0.5;
  breakdown.push({ category: 'Emergency Fund', amount: emergencyFund });

  const recommended = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const gap = Math.max(0, recommended - existingLifeInsurance);

  return { recommended, gap, breakdown };
}

/**
 * Calculate divorce financial impact
 */
function calculateDivorceImpact(
  pretaxBalance: number,
  rothBalance: number,
  taxableBalance: number,
  yearsMarried: number,
  ssIncome1: number,
  ssIncome2: number,
  ssClaimAge: number
): {
  assetDivision: number;
  ssBenefitFromEx: number;
  eligibleForExSpouseSS: boolean;
} {
  // QDRO division of retirement assets
  const totalRetirement = pretaxBalance + rothBalance;
  const maritalPortion = totalRetirement * QDRO_TYPICAL_SPLIT;

  // Ex-spouse SS benefits (if married 10+ years)
  const eligibleForExSpouseSS = yearsMarried >= MARRIAGE_YEARS_FOR_SS;
  let ssBenefitFromEx = 0;

  if (eligibleForExSpouseSS) {
    const higherEarnerIncome = Math.max(ssIncome1, ssIncome2);
    const higherEarnerPIA = calcPIA(higherEarnerIncome);
    // Can claim up to 50% of ex-spouse's PIA
    ssBenefitFromEx = higherEarnerPIA * 0.5 * 12; // Annual
  }

  return {
    assetDivision: maritalPortion,
    ssBenefitFromEx,
    eligibleForExSpouseSS,
  };
}

/**
 * Calculate disability impact
 */
function calculateDisabilityImpact(
  annualIncome: number,
  existingDisabilityInsurance: number,
  ssIncome: number,
  currentAge: number
): {
  incomeGap: number;
  ssDisabilityBenefit: number;
  totalCoverage: number;
  coveragePct: number;
} {
  // SS Disability benefit (essentially same as retirement PIA)
  const ssDisabilityBenefit = calcPIA(ssIncome) * 12; // Annual

  // Existing coverage
  const ltdCoverage = existingDisabilityInsurance || annualIncome * AVG_LTD_POLICY_PCT;
  const totalCoverage = ssDisabilityBenefit + ltdCoverage;

  const coveragePct = annualIncome > 0 ? totalCoverage / annualIncome : 0;
  const incomeGap = Math.max(0, annualIncome - totalCoverage);

  return {
    incomeGap,
    ssDisabilityBenefit,
    totalCoverage,
    coveragePct,
  };
}

// ==================== Component ====================

export function SpousalScenarios({
  age1,
  age2,
  marital,
  retirementAge,
  primaryIncome,
  spouseIncome,
  taxableBalance,
  pretaxBalance,
  rothBalance,
  ssIncome,
  ssClaimAge,
  ssIncome2,
  ssClaimAge2,
  numChildren = 0,
  childrenAges = [],
  lifeInsuranceP1 = 0,
  lifeInsuranceP2 = 0,
  disabilityInsuranceP1 = 0,
  disabilityInsuranceP2 = 0,
  monthlyExpenses = 0,
  monthlyMortgage = 0,
  monthlyChildcare = 0,
}: SpousalScenariosProps) {
  const [showScenarios, setShowScenarios] = useState(false);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  // Only show for married couples
  if (marital !== 'married') {
    return null;
  }

  // Determine primary vs secondary earner
  const primaryIsPerson1 = primaryIncome >= spouseIncome;
  const primaryEarnerIncome = primaryIsPerson1 ? primaryIncome : spouseIncome;
  const secondaryEarnerIncome = primaryIsPerson1 ? spouseIncome : primaryIncome;
  const primaryEarnerAge = primaryIsPerson1 ? age1 : age2;
  const secondaryEarnerAge = primaryIsPerson1 ? age2 : age1;
  const primarySSIncome = primaryIsPerson1 ? ssIncome : ssIncome2;
  const secondarySSIncome = primaryIsPerson1 ? ssIncome2 : ssIncome;
  const primaryLifeInsurance = primaryIsPerson1 ? lifeInsuranceP1 : lifeInsuranceP2;
  const secondaryLifeInsurance = primaryIsPerson1 ? lifeInsuranceP2 : lifeInsuranceP1;

  // Count minor children
  const minorChildren = childrenAges.filter(age => age < 18).length || (numChildren > 0 ? numChildren : 0);
  const hasMinorChildren = minorChildren > 0;

  // Estimated mortgage balance (rough estimate from monthly payment)
  const estimatedMortgageBalance = monthlyMortgage * 12 * 20; // Assume 20 years remaining

  // Annual expenses
  const annualExpenses = monthlyExpenses > 0 ? monthlyExpenses * 12 : (primaryEarnerIncome + secondaryEarnerIncome) * 0.7;

  // Generate scenarios
  const scenarios = useMemo<ScenarioAnalysis[]>(() => {
    const results: ScenarioAnalysis[] = [];

    // ========== Scenario 1: Early Death of Primary Earner ==========
    const survivorBenefitFromPrimary = calculateSurvivorBenefit(
      primarySSIncome,
      secondaryEarnerAge,
      hasMinorChildren
    );
    const childBenefitsFromPrimary = calculateChildSurvivorBenefits(primarySSIncome, minorChildren);
    const primaryLifeInsuranceNeed = calculateLifeInsuranceNeed(
      primaryEarnerIncome,
      estimatedMortgageBalance,
      minorChildren,
      childrenAges,
      primaryLifeInsurance
    );

    const totalSurvivorIncomeFromPrimary =
      secondaryEarnerIncome +
      (survivorBenefitFromPrimary.monthlyBenefit * 12) +
      childBenefitsFromPrimary;

    const incomeGapPrimaryDeath = Math.max(0, annualExpenses - totalSurvivorIncomeFromPrimary);

    results.push({
      id: 'primary-death',
      title: 'What if the Primary Earner Passes Away?',
      subtitle: `Impact on ${primaryIsPerson1 ? 'Person 2' : 'Person 1'} and family`,
      icon: Heart,
      iconColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-200 dark:border-red-800',
      severity: primaryLifeInsuranceNeed.gap > 0 ? 'critical' : 'info',
      financialImpact: {
        label: primaryLifeInsuranceNeed.gap > 0 ? 'Life Insurance Gap' : 'Annual Survivor Income',
        amount: primaryLifeInsuranceNeed.gap > 0 ? primaryLifeInsuranceNeed.gap : totalSurvivorIncomeFromPrimary,
        type: primaryLifeInsuranceNeed.gap > 0 ? 'gap' : 'benefit',
      },
      keyFindings: [
        `Survivor SS benefit: ${fmt(survivorBenefitFromPrimary.monthlyBenefit * 12)}/year`,
        survivorBenefitFromPrimary.eligibility,
        hasMinorChildren ? `Child benefits: ${fmt(childBenefitsFromPrimary)}/year until age 18` : 'No minor children for SS benefits',
        `Current life insurance: ${fmt(primaryLifeInsurance)}`,
        `Recommended coverage: ${fmt(primaryLifeInsuranceNeed.recommended)}`,
      ],
      actionItems: [
        {
          title: 'Review Life Insurance Coverage',
          description: primaryLifeInsuranceNeed.gap > 0
            ? `Consider increasing coverage by ${fmt(primaryLifeInsuranceNeed.gap)} to fully protect your family`
            : 'Current coverage appears adequate',
          priority: primaryLifeInsuranceNeed.gap > 0 ? 'high' : 'low',
          category: 'insurance',
        },
        {
          title: 'Update Beneficiary Designations',
          description: 'Ensure 401(k), IRA, and life insurance beneficiaries are current',
          priority: 'high',
          category: 'legal',
        },
        {
          title: 'Create/Update Will and Trust',
          description: 'Establish guardianship for minor children and asset distribution',
          priority: hasMinorChildren ? 'high' : 'medium',
          category: 'legal',
        },
        {
          title: 'Build Emergency Fund',
          description: 'Maintain 6-12 months expenses for transition period',
          priority: 'medium',
          category: 'financial',
        },
      ],
      details: [
        {
          label: 'Primary Earner Income',
          value: fmt(primaryEarnerIncome),
          explanation: 'Annual income that would be lost',
        },
        {
          label: 'Survivor Work Income',
          value: fmt(secondaryEarnerIncome),
          explanation: 'Surviving spouse\'s ongoing income',
        },
        {
          label: 'Total Survivor Benefits (SS)',
          value: fmt((survivorBenefitFromPrimary.monthlyBenefit * 12) + childBenefitsFromPrimary),
          explanation: 'Widow/widower plus child benefits',
        },
        {
          label: 'Income Gap',
          value: incomeGapPrimaryDeath > 0 ? fmt(incomeGapPrimaryDeath) : 'None',
          explanation: 'Shortfall between expenses and survivor income',
        },
        ...primaryLifeInsuranceNeed.breakdown.map(item => ({
          label: item.category,
          value: fmt(item.amount),
        })),
      ],
    });

    // ========== Scenario 2: Early Death of Secondary Earner ==========
    const survivorBenefitFromSecondary = calculateSurvivorBenefit(
      secondarySSIncome,
      primaryEarnerAge,
      hasMinorChildren
    );
    const childBenefitsFromSecondary = calculateChildSurvivorBenefits(secondarySSIncome, minorChildren);
    const secondaryLifeInsuranceNeed = calculateLifeInsuranceNeed(
      secondaryEarnerIncome,
      0, // Primary earner keeps house
      minorChildren,
      childrenAges,
      secondaryLifeInsurance
    );

    // Secondary earner death often means sudden childcare costs
    const youngestChildAge = childrenAges.length > 0 ? Math.min(...childrenAges) : 5;
    const yearsOfChildcareNeeded = Math.max(0, 13 - youngestChildAge); // Until age 13
    const childcareCostImpact = hasMinorChildren ? yearsOfChildcareNeeded * AVG_CHILDCARE_COST_PER_CHILD * minorChildren : 0;

    results.push({
      id: 'secondary-death',
      title: 'What if the Secondary Earner Passes Away?',
      subtitle: 'Often underestimated - especially with young children',
      icon: Home,
      iconColor: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      borderColor: 'border-orange-200 dark:border-orange-800',
      severity: hasMinorChildren && secondaryLifeInsurance < childcareCostImpact ? 'critical' : 'warning',
      financialImpact: {
        label: hasMinorChildren ? 'Childcare Cost Impact' : 'Secondary Life Insurance Gap',
        amount: hasMinorChildren ? childcareCostImpact : secondaryLifeInsuranceNeed.gap,
        type: 'loss',
      },
      keyFindings: [
        hasMinorChildren
          ? `Potential childcare costs: ${fmt(childcareCostImpact)} over ${yearsOfChildcareNeeded} years`
          : 'No minor children - childcare not applicable',
        `Secondary earner SS survivor benefit: ${fmt(survivorBenefitFromSecondary.monthlyBenefit * 12)}/year`,
        `Current life insurance on secondary earner: ${fmt(secondaryLifeInsurance)}`,
        secondaryEarnerIncome > 0
          ? `Lost income: ${fmt(secondaryEarnerIncome)}/year`
          : 'No direct income loss (non-working spouse)',
        hasMinorChildren
          ? 'Consider: career impact on primary earner needing more childcare flexibility'
          : '',
      ].filter(Boolean),
      actionItems: [
        {
          title: 'Review Secondary Earner Life Insurance',
          description: hasMinorChildren
            ? `Stay-at-home or lower-earning spouses need coverage for childcare replacement: ${fmt(childcareCostImpact)}`
            : 'Coverage for final expenses and transition costs',
          priority: hasMinorChildren ? 'high' : 'medium',
          category: 'insurance',
        },
        {
          title: 'Document Daily Responsibilities',
          description: 'Understand the non-monetary value of household management and childcare',
          priority: hasMinorChildren ? 'high' : 'low',
          category: 'planning',
        },
        {
          title: 'Identify Backup Childcare',
          description: 'Family members, trusted services for emergency coverage',
          priority: hasMinorChildren ? 'high' : 'low',
          category: 'planning',
        },
        {
          title: 'Consider Term Life Insurance',
          description: 'Term policies are affordable and can cover childcare years',
          priority: hasMinorChildren && secondaryLifeInsurance < childcareCostImpact ? 'high' : 'medium',
          category: 'insurance',
        },
      ],
      details: [
        {
          label: 'Secondary Earner Income',
          value: fmt(secondaryEarnerIncome),
          explanation: secondaryEarnerIncome === 0 ? 'Non-working spouse' : 'Annual income',
        },
        {
          label: 'Childcare Replacement Cost',
          value: hasMinorChildren ? `${fmt(AVG_CHILDCARE_COST_PER_CHILD * minorChildren)}/year` : 'N/A',
          explanation: 'Average cost per child for full-time care',
        },
        {
          label: 'Years of Childcare Needed',
          value: hasMinorChildren ? `${yearsOfChildcareNeeded} years` : 'N/A',
          explanation: 'Until youngest child is 13',
        },
        {
          label: 'Current Coverage',
          value: fmt(secondaryLifeInsurance),
        },
        {
          label: 'Recommended Coverage',
          value: fmt(Math.max(secondaryLifeInsuranceNeed.recommended, childcareCostImpact)),
        },
      ],
    });

    // ========== Scenario 3: Divorce ==========
    const yearsMarried = Math.max(1, Math.min(age1, age2) - 25); // Rough estimate
    const divorceImpact = calculateDivorceImpact(
      pretaxBalance,
      rothBalance,
      taxableBalance,
      yearsMarried,
      ssIncome,
      ssIncome2,
      ssClaimAge
    );

    results.push({
      id: 'divorce',
      title: 'What if We Divorce?',
      subtitle: 'Understanding the financial separation process',
      icon: Scale,
      iconColor: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      borderColor: 'border-purple-200 dark:border-purple-800',
      severity: 'info',
      financialImpact: {
        label: 'Retirement Asset Division (50/50)',
        amount: divorceImpact.assetDivision,
        type: 'loss',
      },
      keyFindings: [
        `Total retirement assets subject to QDRO: ${fmt(pretaxBalance + rothBalance)}`,
        `Each spouse would receive approximately: ${fmt(divorceImpact.assetDivision)}`,
        divorceImpact.eligibleForExSpouseSS
          ? `May claim SS benefits on ex-spouse record: up to ${fmt(divorceImpact.ssBenefitFromEx)}/year`
          : `Need ${MARRIAGE_YEARS_FOR_SS - yearsMarried} more years married for ex-spouse SS benefits`,
        'Note: Actual division depends on state laws and negotiation',
        hasMinorChildren ? 'Child support and custody will affect both parties\' finances' : '',
      ].filter(Boolean),
      actionItems: [
        {
          title: 'Understand QDRO Process',
          description: 'Qualified Domestic Relations Order divides retirement accounts without tax penalty',
          priority: 'medium',
          category: 'legal',
        },
        {
          title: 'Document All Assets',
          description: 'Create comprehensive list of retirement accounts, investments, property',
          priority: 'medium',
          category: 'financial',
        },
        {
          title: 'Understand SS Ex-Spouse Benefits',
          description: divorceImpact.eligibleForExSpouseSS
            ? 'After 10+ years of marriage, can claim on ex-spouse record'
            : `${MARRIAGE_YEARS_FOR_SS - yearsMarried} more years needed for this benefit`,
          priority: 'low',
          category: 'planning',
        },
        {
          title: 'Consider Mediation',
          description: 'Often less expensive and contentious than litigation',
          priority: 'medium',
          category: 'legal',
        },
      ],
      details: [
        {
          label: 'Pre-Tax Retirement (401k/IRA)',
          value: fmt(pretaxBalance),
          explanation: 'Subject to QDRO division',
        },
        {
          label: 'Roth Accounts',
          value: fmt(rothBalance),
          explanation: 'Subject to QDRO division',
        },
        {
          label: 'Taxable Investments',
          value: fmt(taxableBalance),
          explanation: 'Division varies by state law',
        },
        {
          label: 'Years Married (Est.)',
          value: `~${yearsMarried} years`,
          explanation: divorceImpact.eligibleForExSpouseSS ? 'Eligible for ex-spouse SS' : 'Need 10+ for ex-spouse SS',
        },
        {
          label: 'Ex-Spouse SS Benefit',
          value: divorceImpact.eligibleForExSpouseSS ? `${fmt(divorceImpact.ssBenefitFromEx)}/year` : 'Not yet eligible',
          explanation: 'Can claim 50% of ex-spouse\'s PIA if married 10+ years',
        },
      ],
    });

    // ========== Scenario 4: Long-Term Disability ==========
    const primaryDisabilityImpact = calculateDisabilityImpact(
      primaryEarnerIncome,
      disabilityInsuranceP1,
      primarySSIncome,
      primaryEarnerAge
    );
    const secondaryDisabilityImpact = calculateDisabilityImpact(
      secondaryEarnerIncome,
      disabilityInsuranceP2,
      secondarySSIncome,
      secondaryEarnerAge
    );

    // Use primary earner for the main scenario
    const mainDisabilityImpact = primaryDisabilityImpact;

    results.push({
      id: 'disability',
      title: 'What if One of Us Becomes Disabled?',
      subtitle: 'Long-term disability planning',
      icon: Accessibility,
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
      severity: mainDisabilityImpact.coveragePct < 0.6 ? 'warning' : 'info',
      financialImpact: {
        label: 'Annual Income Gap if Disabled',
        amount: mainDisabilityImpact.incomeGap,
        type: mainDisabilityImpact.incomeGap > 0 ? 'gap' : 'benefit',
      },
      keyFindings: [
        `SS Disability benefit (primary earner): ${fmt(mainDisabilityImpact.ssDisabilityBenefit)}/year`,
        `Current disability coverage: ${(mainDisabilityImpact.coveragePct * 100).toFixed(0)}% of income`,
        `Target coverage: ${(DISABILITY_INSURANCE_TARGET_PCT * 100).toFixed(0)}% of income`,
        '5-month waiting period before SS Disability payments begin',
        '1 in 4 workers will experience a disability before retirement age',
      ],
      actionItems: [
        {
          title: 'Review Employer LTD Benefits',
          description: 'Understand what percentage of income is covered and for how long',
          priority: 'high',
          category: 'insurance',
        },
        {
          title: 'Consider Supplemental Disability Insurance',
          description: mainDisabilityImpact.coveragePct < 0.6
            ? `Gap of ${fmt(mainDisabilityImpact.incomeGap)} per year needs coverage`
            : 'Current coverage may be adequate',
          priority: mainDisabilityImpact.coveragePct < 0.6 ? 'high' : 'low',
          category: 'insurance',
        },
        {
          title: 'Understand SS Disability Qualifications',
          description: 'Must be unable to work in any job, not just current occupation',
          priority: 'medium',
          category: 'planning',
        },
        {
          title: 'Build Accessible Emergency Fund',
          description: 'Cover the 5-month waiting period before SS Disability begins',
          priority: 'high',
          category: 'financial',
        },
      ],
      details: [
        {
          label: 'Primary Earner Income',
          value: fmt(primaryEarnerIncome),
        },
        {
          label: 'SS Disability Benefit',
          value: fmt(mainDisabilityImpact.ssDisabilityBenefit),
          explanation: 'Based on work history (same calculation as retirement)',
        },
        {
          label: 'Employer LTD Coverage',
          value: disabilityInsuranceP1 > 0 ? fmt(disabilityInsuranceP1) : 'Unknown/None',
          explanation: 'Check with HR for exact coverage',
        },
        {
          label: 'Total Disability Income',
          value: fmt(mainDisabilityImpact.totalCoverage),
        },
        {
          label: 'Coverage Percentage',
          value: `${(mainDisabilityImpact.coveragePct * 100).toFixed(0)}%`,
          explanation: 'Target is 60% of pre-disability income',
        },
        {
          label: 'Waiting Period',
          value: '5 months',
          explanation: 'SS Disability has mandatory waiting period',
        },
      ],
    });

    return results;
  }, [
    primaryEarnerIncome, secondaryEarnerIncome, primaryEarnerAge, secondaryEarnerAge,
    primarySSIncome, secondarySSIncome, primaryLifeInsurance, secondaryLifeInsurance,
    hasMinorChildren, minorChildren, childrenAges, estimatedMortgageBalance,
    annualExpenses, pretaxBalance, rothBalance, taxableBalance,
    disabilityInsuranceP1, disabilityInsuranceP2, ssIncome, ssIncome2,
    ssClaimAge, primaryIsPerson1,
  ]);

  const toggleAction = useCallback((scenarioId: string, actionTitle: string) => {
    const key = `${scenarioId}-${actionTitle}`;
    setCompletedActions(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const getCompletionProgress = useCallback((scenario: ScenarioAnalysis) => {
    const totalActions = scenario.actionItems.length;
    const completedCount = scenario.actionItems.filter(
      action => completedActions.has(`${scenario.id}-${action.title}`)
    ).length;
    return { completed: completedCount, total: totalActions, percent: (completedCount / totalActions) * 100 };
  }, [completedActions]);

  return (
    <Card className="border-2 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Shield className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Spousal Scenario Planner</CardTitle>
              <CardDescription>
                Hope for the best, plan for the worst
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="show-scenarios" className="text-sm text-muted-foreground">
              {showScenarios ? 'Hide' : 'Show'} Scenarios
            </Label>
            <Switch
              id="show-scenarios"
              checked={showScenarios}
              onCheckedChange={setShowScenarios}
            />
            {showScenarios ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {showScenarios && (
        <CardContent className="space-y-4">
          {/* Compassionate Introduction */}
          <Alert className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
            <Info className="h-4 w-4" />
            <AlertTitle>Why Plan for Difficult Scenarios?</AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground">
              Financial advisors help families prepare for life&apos;s uncertainties. These scenarios
              are not predictions - they&apos;re tools to ensure your family is protected no matter what
              happens. Taking action now provides peace of mind and financial security.
            </AlertDescription>
          </Alert>

          {/* Scenario Cards */}
          <Accordion type="single" collapsible className="space-y-3">
            {scenarios.map((scenario) => {
              const Icon = scenario.icon;
              const progress = getCompletionProgress(scenario);

              return (
                <AccordionItem
                  key={scenario.id}
                  value={scenario.id}
                  className={cn(
                    "border-2 rounded-lg overflow-hidden",
                    scenario.borderColor,
                    scenario.bgColor
                  )}
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-black/5 dark:hover:bg-white/5">
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                        <Icon className={cn("h-5 w-5", scenario.iconColor)} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {scenario.title}
                          </h3>
                          {scenario.severity === 'critical' && (
                            <Badge variant="destructive" className="text-xs">
                              Action Needed
                            </Badge>
                          )}
                          {scenario.severity === 'warning' && (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                              Review
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {scenario.subtitle}
                        </p>
                      </div>
                      <div className="text-right mr-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-sm font-semibold",
                            scenario.financialImpact.type === 'gap' && "bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300",
                            scenario.financialImpact.type === 'loss' && "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900 dark:text-amber-300",
                            scenario.financialImpact.type === 'benefit' && "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300"
                          )}
                        >
                          {scenario.financialImpact.label}: {fmt(scenario.financialImpact.amount)}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4 pt-2">
                      <Separator />

                      {/* Key Findings */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          Key Findings
                        </h4>
                        <ul className="space-y-1.5">
                          {scenario.keyFindings.map((finding, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Financial Details */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Financial Details
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {scenario.details.map((detail, index) => (
                            <TooltipProvider key={index}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm cursor-help">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                      {detail.label}
                                      {detail.explanation && (
                                        <HelpCircle className="h-3 w-3 inline ml-1" />
                                      )}
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                      {detail.value}
                                    </p>
                                  </div>
                                </TooltipTrigger>
                                {detail.explanation && (
                                  <TooltipContent>
                                    <p className="max-w-xs">{detail.explanation}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>

                      {/* Action Items */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Action Items
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Progress value={progress.percent} className="w-20 h-2" />
                            <span>{progress.completed}/{progress.total}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {scenario.actionItems.map((action, index) => {
                            const isCompleted = completedActions.has(`${scenario.id}-${action.title}`);
                            const CategoryIcon =
                              action.category === 'insurance' ? Shield :
                              action.category === 'legal' ? FileText :
                              action.category === 'financial' ? DollarSign :
                              Briefcase;

                            return (
                              <div
                                key={index}
                                className={cn(
                                  "flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer",
                                  isCompleted
                                    ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                )}
                                onClick={() => toggleAction(scenario.id, action.title)}
                              >
                                <div className={cn(
                                  "p-1.5 rounded-md",
                                  isCompleted ? "bg-green-100 dark:bg-green-900" : "bg-gray-100 dark:bg-gray-700"
                                )}>
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <CategoryIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className={cn(
                                      "text-sm font-medium",
                                      isCompleted && "line-through text-gray-500"
                                    )}>
                                      {action.title}
                                    </p>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs",
                                        action.priority === 'high' && "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
                                        action.priority === 'medium' && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
                                        action.priority === 'low' && "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400"
                                      )}
                                    >
                                      {action.priority}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {action.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* Professional Guidance */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Consider Professional Guidance
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  These scenarios involve complex financial, legal, and emotional considerations.
                  A qualified financial advisor, estate planning attorney, and insurance professional
                  can help you create a comprehensive protection plan tailored to your family&apos;s needs.
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center italic pt-2">
            These calculations are estimates based on current Social Security rules and general guidelines.
            Actual benefits and needs will vary based on individual circumstances, state laws, and future policy changes.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export default SpousalScenarios;
