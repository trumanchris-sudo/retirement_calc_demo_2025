'use client';

/**
 * Semi-Retirement / Part-Time Work Planner
 *
 * The Reality: Many people don't fully retire - they transition to part-time or consulting.
 * This component makes "retirement" a spectrum, not binary.
 *
 * Features:
 * 1. Phased Retirement Modeling - Multiple income phases
 * 2. Impact Calculator - Working longer benefits
 * 3. Coast FIRE Calculator - Stop saving, let portfolio grow
 * 4. Barista FIRE - Work just enough for healthcare
 * 5. Consulting/Freelance Income - Self-employment considerations
 * 6. Psychological Benefits - Purpose beyond money
 */

import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Coffee,
  TrendingUp,
  Heart,
  Clock,
  Shield,
  DollarSign,
  Smile,
  Users,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  Sparkles,
  Target,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { fmt } from '@/lib/utils';
import {
  calcSocialSecurity,
  calculateSelfEmploymentTax,
} from '@/lib/calculations/retirementEngine';
import type { FilingStatus } from '@/types/calculator';

// ==================== Types ====================

interface SemiRetirementProps {
  // Current user inputs
  age: number;
  spouseAge?: number;
  retirementAge: number;
  marital: FilingStatus;
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;
  cTax2?: number;
  cPre2?: number;
  cPost2?: number;
  cMatch2?: number;
  retRate: number;
  inflationRate: number;
  wdRate: number;
  stateRate: number;
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2?: number;
  ssClaimAge2?: number;
  // Current result for comparison
  currentEolReal?: number;
  currentPortfolioAtRetirement?: number;
}

interface PhaseConfig {
  startAge: number;
  endAge: number;
  annualIncome: number;
  hoursPerWeek: number;
  hasHealthcare: boolean;
  label: string;
}

interface CoastFIREResult {
  canCoastNow: boolean;
  coastAge: number;
  targetAtCoastAge: number;
  currentProjection: number;
  yearsUntilCoast: number;
  requiredGrowthRate: number;
  monthlyExpensesCovered: number;
}

interface BaristaFIREResult {
  requiredIncome: number;
  hoursPerWeekAt15: number;
  hoursPerWeekAt20: number;
  hoursPerWeekAt25: number;
  healthcareSavings: number;
  yearsUntilMedicare: number;
  totalHealthcareCost: number;
}

// ==================== Constants ====================

// Healthcare costs by age bracket (2026 estimates)
const HEALTHCARE_COSTS = {
  age55to59: 13200, // ~$1,100/month
  age60to64: 15600, // ~$1,300/month (highest pre-Medicare)
  aca_subsidy_threshold: 64000, // ~400% FPL for ACA subsidies
  employer_avg_contribution: 8000, // Average employer healthcare subsidy
};

// Self-employment constants
const SE_TAX = {
  socialSecurityRate: 0.124,
  medicareRate: 0.029,
  additionalMedicareThreshold: 200000,
  additionalMedicareRate: 0.009,
  deductibleHalf: 0.5, // Half of SE tax is deductible
};

// Solo 401k limits (2026)
const SOLO_401K = {
  employeeLimit: 24500,
  catchupLimit: 7500, // Age 50+
  totalLimit: 70000, // Employee + employer combined
  employerContribRate: 0.25, // 25% of net self-employment income
};

// ==================== Calculation Helpers ====================

/**
 * Calculate the impact of working part-time for additional years
 */
function calculateWorkingLongerImpact(
  currentAge: number,
  originalRetirementAge: number,
  extraYears: number,
  annualPartTimeIncome: number,
  annualExpenses: number,
  currentPortfolio: number,
  retRate: number,
  inflationRate: number,
  ssIncome: number,
  originalClaimAge: number
): {
  portfolioAddition: number;
  delayedSSBenefit: number;
  originalSSBenefit: number;
  healthcareSavings: number;
  totalImpact: number;
} {
  const realReturn = (1 + retRate / 100) / (1 + inflationRate / 100) - 1;

  // 1. Portfolio continues to grow (no withdrawals)
  let portfolioGrowth = currentPortfolio;
  for (let y = 0; y < extraYears; y++) {
    // Portfolio grows AND no withdrawals needed
    portfolioGrowth = portfolioGrowth * (1 + realReturn);
    // Part-time income covers expenses, surplus goes to portfolio
    const surplus = annualPartTimeIncome - annualExpenses;
    if (surplus > 0) {
      portfolioGrowth += surplus;
    }
  }
  const portfolioAddition = portfolioGrowth - currentPortfolio;

  // 2. Social Security delayed claiming benefit
  // SS increases ~8% per year for each year delayed past FRA (up to 70)
  const newClaimAge = Math.min(70, originalClaimAge + extraYears);
  const originalSSBenefit = calcSocialSecurity(ssIncome, originalClaimAge);
  const delayedSSBenefit = calcSocialSecurity(ssIncome, newClaimAge);
  const ssBenefitIncrease = delayedSSBenefit - originalSSBenefit;

  // 3. Healthcare savings (if employer provides coverage)
  // Average employer healthcare subsidy * years of continued employment
  const healthcareSavings = HEALTHCARE_COSTS.employer_avg_contribution * extraYears;

  // Total impact calculation
  // SS benefit increase is annual, so capitalize it over ~20 years of retirement
  const ssCapitalizedValue = ssBenefitIncrease * 20;
  const totalImpact = portfolioAddition + ssCapitalizedValue + healthcareSavings;

  return {
    portfolioAddition,
    delayedSSBenefit,
    originalSSBenefit,
    healthcareSavings,
    totalImpact,
  };
}

/**
 * Calculate Coast FIRE - when can you stop saving and let portfolio grow?
 */
function calculateCoastFIRE(
  currentAge: number,
  targetRetirementAge: number,
  currentPortfolio: number,
  annualExpenses: number,
  wdRate: number,
  retRate: number,
  inflationRate: number
): CoastFIREResult {
  const realReturn = (1 + retRate / 100) / (1 + inflationRate / 100) - 1;

  // Target portfolio at retirement to support expenses with given withdrawal rate
  const targetPortfolio = annualExpenses / (wdRate / 100);

  // Project current portfolio to retirement age with no additional contributions
  const yearsToRetirement = targetRetirementAge - currentAge;
  let projectedPortfolio = currentPortfolio;
  for (let y = 0; y < yearsToRetirement; y++) {
    projectedPortfolio *= 1 + realReturn;
  }

  // Can they coast now?
  const canCoastNow = projectedPortfolio >= targetPortfolio;

  // If not, when can they coast?
  let coastAge = currentAge;
  let portfolioAtCoastAge = currentPortfolio;

  if (!canCoastNow) {
    // Binary search for coast age
    for (let age = currentAge; age <= targetRetirementAge; age++) {
      const yearsFromCoastToRetirement = targetRetirementAge - age;
      let projected = portfolioAtCoastAge;
      for (let y = 0; y < yearsFromCoastToRetirement; y++) {
        projected *= 1 + realReturn;
      }
      if (projected >= targetPortfolio) {
        coastAge = age;
        break;
      }
      portfolioAtCoastAge *= 1 + realReturn;
    }
  }

  // Calculate required growth rate to hit target from current portfolio
  const requiredGrowthRate =
    Math.pow(targetPortfolio / currentPortfolio, 1 / yearsToRetirement) - 1;

  return {
    canCoastNow,
    coastAge,
    targetAtCoastAge: targetPortfolio,
    currentProjection: projectedPortfolio,
    yearsUntilCoast: coastAge - currentAge,
    requiredGrowthRate: requiredGrowthRate * 100,
    monthlyExpensesCovered: annualExpenses / 12,
  };
}

/**
 * Calculate Barista FIRE - minimum work for healthcare benefits
 */
function calculateBaristaFIRE(
  currentAge: number,
  annualExpenses: number,
  portfolioIncome: number // Annual income from portfolio withdrawals
): BaristaFIREResult {
  // Healthcare costs until Medicare (65)
  const yearsUntilMedicare = Math.max(0, 65 - currentAge);

  // Annual healthcare cost (use age-appropriate bracket)
  const annualHealthcareCost =
    currentAge < 55 ? 10000 : currentAge < 60 ? HEALTHCARE_COSTS.age55to59 : HEALTHCARE_COSTS.age60to64;

  // Total healthcare cost until Medicare
  const totalHealthcareCost = annualHealthcareCost * yearsUntilMedicare;

  // How much income is needed beyond portfolio withdrawals?
  // If working provides healthcare, that's a major savings
  const incomeGap = Math.max(0, annualExpenses - portfolioIncome);

  // If you work for healthcare, you save the premium but also earn income
  const requiredIncome = incomeGap + (yearsUntilMedicare > 0 ? 0 : 0); // Just income gap if healthcare covered

  // Calculate hours needed at different hourly rates
  const hoursPerWeekAt15 = (requiredIncome / 52) / 15;
  const hoursPerWeekAt20 = (requiredIncome / 52) / 20;
  const hoursPerWeekAt25 = (requiredIncome / 52) / 25;

  return {
    requiredIncome,
    hoursPerWeekAt15: Math.ceil(hoursPerWeekAt15),
    hoursPerWeekAt20: Math.ceil(hoursPerWeekAt20),
    hoursPerWeekAt25: Math.ceil(hoursPerWeekAt25),
    healthcareSavings: annualHealthcareCost,
    yearsUntilMedicare,
    totalHealthcareCost,
  };
}

/**
 * Calculate self-employment tax implications for consulting income
 */
function calculateConsultingTaxes(grossIncome: number, age: number): {
  seTax: number;
  deductiblePortion: number;
  solo401kContrib: number;
  netAfterTax: number;
  effectiveRate: number;
} {
  // Self-employment tax
  const seTax = calculateSelfEmploymentTax(grossIncome);

  // Half of SE tax is deductible
  const deductiblePortion = seTax * SE_TAX.deductibleHalf;

  // Solo 401k contribution potential
  // Employee contribution (up to $24,500 + $7,500 catchup if 50+)
  const employeeLimit = SOLO_401K.employeeLimit + (age >= 50 ? SOLO_401K.catchupLimit : 0);

  // Employer contribution (25% of net self-employment earnings)
  const netSEEarnings = grossIncome - seTax * SE_TAX.deductibleHalf;
  const employerMax = netSEEarnings * SOLO_401K.employerContribRate;

  // Total Solo 401k (capped at overall limit)
  const totalSolo401k = Math.min(employeeLimit + employerMax, SOLO_401K.totalLimit, netSEEarnings);

  // Assume 22% federal bracket + state for simplified calculation
  const taxableIncome = grossIncome - deductiblePortion - totalSolo401k;
  const estimatedIncomeTax = taxableIncome * 0.25; // Rough estimate

  const netAfterTax = grossIncome - seTax - estimatedIncomeTax;
  const effectiveRate = ((grossIncome - netAfterTax) / grossIncome) * 100;

  return {
    seTax,
    deductiblePortion,
    solo401kContrib: totalSolo401k,
    netAfterTax,
    effectiveRate,
  };
}

/**
 * Run phased retirement simulation
 */
function runPhasedRetirementSimulation(
  baseInputs: Partial<SimulationInputs>,
  phases: PhaseConfig[]
): {
  finalPortfolio: number;
  comparedToFullRetirement: number;
  ssIncrease: number;
  healthcareSavings: number;
} {
  // For now, use a simplified calculation
  // In a full implementation, this would run the actual simulation engine

  const totalWorkingYears = phases.reduce((sum, p) => sum + (p.endAge - p.startAge), 0);
  const avgAnnualIncome = phases.reduce((sum, p) => sum + p.annualIncome, 0) / phases.length;

  // Rough portfolio impact
  const retRate = baseInputs.retRate || 7;
  const inflationRate = baseInputs.inflationRate || 2.6;
  const realReturn = (1 + retRate / 100) / (1 + inflationRate / 100) - 1;

  const currentPortfolio =
    (baseInputs.taxableBalance || 0) +
    (baseInputs.pretaxBalance || 0) +
    (baseInputs.rothBalance || 0);

  // Portfolio grows while working, and income covers expenses
  let portfolio = currentPortfolio;
  for (let y = 0; y < totalWorkingYears; y++) {
    portfolio *= 1 + realReturn;
    portfolio += avgAnnualIncome * 0.3; // Assume 30% savings rate
  }

  const fullRetirementPortfolio = currentPortfolio * Math.pow(1 + realReturn, totalWorkingYears);

  return {
    finalPortfolio: portfolio,
    comparedToFullRetirement: portfolio - fullRetirementPortfolio,
    ssIncrease: totalWorkingYears * 0.08 * (baseInputs.ssIncome || 50000), // ~8%/year SS increase
    healthcareSavings:
      phases.filter((p) => p.hasHealthcare).reduce((sum, p) => sum + (p.endAge - p.startAge), 0) *
      HEALTHCARE_COSTS.employer_avg_contribution,
  };
}

// ==================== Sub-Components ====================

interface PhaseEditorProps {
  phases: PhaseConfig[];
  setPhases: (phases: PhaseConfig[]) => void;
  minAge: number;
  maxAge: number;
}

function PhaseEditor({ phases, setPhases, minAge, maxAge }: PhaseEditorProps) {
  const addPhase = () => {
    const lastPhase = phases[phases.length - 1];
    const newStartAge = lastPhase ? lastPhase.endAge : minAge;
    setPhases([
      ...phases,
      {
        startAge: newStartAge,
        endAge: Math.min(newStartAge + 5, maxAge),
        annualIncome: 40000,
        hoursPerWeek: 20,
        hasHealthcare: false,
        label: `Phase ${phases.length + 1}`,
      },
    ]);
  };

  const updatePhase = (index: number, updates: Partial<PhaseConfig>) => {
    const newPhases = [...phases];
    newPhases[index] = { ...newPhases[index], ...updates };
    setPhases(newPhases);
  };

  const removePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {phases.map((phase, index) => (
        <div
          key={index}
          className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800"
        >
          <div className="flex items-center justify-between mb-3">
            <Input
              value={phase.label}
              onChange={(e) => updatePhase(index, { label: e.target.value })}
              className="w-32 font-medium"
            />
            {phases.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => removePhase(index)}>
                Remove
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Start Age</Label>
              <Input
                type="number"
                value={phase.startAge}
                onChange={(e) => updatePhase(index, { startAge: parseInt(e.target.value) || minAge })}
                min={minAge}
                max={maxAge}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End Age</Label>
              <Input
                type="number"
                value={phase.endAge}
                onChange={(e) => updatePhase(index, { endAge: parseInt(e.target.value) || maxAge })}
                min={phase.startAge}
                max={maxAge}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Annual Income</Label>
              <Input
                type="number"
                value={phase.annualIncome}
                onChange={(e) => updatePhase(index, { annualIncome: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Hours/Week</Label>
              <Input
                type="number"
                value={phase.hoursPerWeek}
                onChange={(e) => updatePhase(index, { hoursPerWeek: parseInt(e.target.value) || 0 })}
                min={0}
                max={40}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Switch
              checked={phase.hasHealthcare}
              onCheckedChange={(checked) => updatePhase(index, { hasHealthcare: checked })}
            />
            <Label className="text-sm">Employer provides healthcare</Label>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addPhase} className="w-full">
        + Add Phase
      </Button>
    </div>
  );
}

// ==================== Main Component ====================

export function SemiRetirement({
  age,
  spouseAge,
  retirementAge,
  marital,
  taxableBalance,
  pretaxBalance,
  rothBalance,
  retRate,
  inflationRate,
  wdRate,
  ssIncome,
  ssClaimAge,
  currentPortfolioAtRetirement = 0,
}: SemiRetirementProps) {
  const [activeTab, setActiveTab] = useState('phased');
  const [extraWorkYears, setExtraWorkYears] = useState(5);
  const [partTimeIncome, setPartTimeIncome] = useState(40000);
  const [annualExpenses, setAnnualExpenses] = useState(60000);
  const [consultingIncome, setConsultingIncome] = useState(80000);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);


  // Phased retirement state
  const [phases, setPhases] = useState<PhaseConfig[]>([
    {
      startAge: retirementAge,
      endAge: retirementAge + 5,
      annualIncome: 60000,
      hoursPerWeek: 25,
      hasHealthcare: true,
      label: 'Part-Time',
    },
    {
      startAge: retirementAge + 5,
      endAge: retirementAge + 10,
      annualIncome: 30000,
      hoursPerWeek: 15,
      hasHealthcare: false,
      label: 'Reduced',
    },
    {
      startAge: retirementAge + 10,
      endAge: 95,
      annualIncome: 0,
      hoursPerWeek: 0,
      hasHealthcare: false,
      label: 'Full Retirement',
    },
  ]);

  const currentPortfolio = taxableBalance + pretaxBalance + rothBalance;
  const portfolioAtRetirement = currentPortfolioAtRetirement || currentPortfolio * 2; // Rough estimate

  // ==================== Calculations ====================

  const workingLongerImpact = useMemo(() => {
    return calculateWorkingLongerImpact(
      age,
      retirementAge,
      extraWorkYears,
      partTimeIncome,
      annualExpenses,
      portfolioAtRetirement,
      retRate,
      inflationRate,
      ssIncome,
      ssClaimAge
    );
  }, [
    age,
    retirementAge,
    extraWorkYears,
    partTimeIncome,
    annualExpenses,
    portfolioAtRetirement,
    retRate,
    inflationRate,
    ssIncome,
    ssClaimAge,
  ]);

  const coastFIRE = useMemo(() => {
    return calculateCoastFIRE(
      age,
      retirementAge,
      currentPortfolio,
      annualExpenses,
      wdRate,
      retRate,
      inflationRate
    );
  }, [age, retirementAge, currentPortfolio, annualExpenses, wdRate, retRate, inflationRate]);

  const baristaFIRE = useMemo(() => {
    const portfolioIncome = currentPortfolio * (wdRate / 100);
    return calculateBaristaFIRE(
      age,
      annualExpenses,
      portfolioIncome
    );
  }, [age, annualExpenses, currentPortfolio, wdRate]);

  const consultingTaxes = useMemo(() => {
    return calculateConsultingTaxes(consultingIncome, age);
  }, [consultingIncome, age]);

  const phasedResult = useMemo(() => {
    return runPhasedRetirementSimulation(
      {
        marital,
        age1: age,
        age2: spouseAge || age,
        retirementAge,
        taxableBalance,
        pretaxBalance,
        rothBalance,
        retRate,
        inflationRate,
        ssIncome,
        ssClaimAge,
      },
      phases
    );
  }, [
    marital,
    age,
    spouseAge,
    retirementAge,
    taxableBalance,
    pretaxBalance,
    rothBalance,
    retRate,
    inflationRate,
    ssIncome,
    ssClaimAge,
    phases,
  ]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // ==================== Render ====================

  return (
    <Card className="border-2 border-teal-200 dark:border-teal-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          Semi-Retirement Planner
        </CardTitle>
        <CardDescription>
          Retirement is a spectrum, not a switch. Explore part-time, consulting, and FIRE strategies.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
            <TabsTrigger value="phased" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Phased
            </TabsTrigger>
            <TabsTrigger value="impact" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Impact
            </TabsTrigger>
            <TabsTrigger value="coast" className="text-xs">
              <Target className="h-3 w-3 mr-1" />
              Coast FIRE
            </TabsTrigger>
            <TabsTrigger value="barista" className="text-xs">
              <Coffee className="h-3 w-3 mr-1" />
              Barista FIRE
            </TabsTrigger>
            <TabsTrigger value="consulting" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />
              Consulting
            </TabsTrigger>
          </TabsList>

          {/* ==================== PHASED RETIREMENT TAB ==================== */}
          <TabsContent value="phased" className="space-y-6">
            <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-4 border border-teal-200 dark:border-teal-800">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-teal-900 dark:text-teal-100">
                    Phased Retirement Modeling
                  </h3>
                  <p className="text-sm text-teal-800 dark:text-teal-200 mt-1">
                    Define multiple phases of work as you transition to full retirement. Many
                    people find a gradual shift more fulfilling than an abrupt change.
                  </p>
                </div>
              </div>
            </div>

            <PhaseEditor
              phases={phases}
              setPhases={setPhases}
              minAge={retirementAge}
              maxAge={95}
            />

            {/* Phase Timeline Visualization */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your Retirement Timeline</Label>
              <div className="relative h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                {phases.map((phase, index) => {
                  const totalYears = 95 - retirementAge;
                  const startPct = ((phase.startAge - retirementAge) / totalYears) * 100;
                  const widthPct = ((phase.endAge - phase.startAge) / totalYears) * 100;
                  const colors = [
                    'bg-teal-500',
                    'bg-blue-500',
                    'bg-purple-500',
                    'bg-green-500',
                    'bg-orange-500',
                  ];
                  return (
                    <div
                      key={index}
                      className={`absolute top-0 h-full ${colors[index % colors.length]} flex items-center justify-center text-white text-xs font-medium`}
                      style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                    >
                      {widthPct > 10 && phase.label}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Age {retirementAge}</span>
                <span>Age 95</span>
              </div>
            </div>

            {/* Impact Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="text-sm text-green-700 dark:text-green-400 mb-1">
                  Portfolio Boost
                </div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {fmt(phasedResult.comparedToFullRetirement)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  vs. immediate retirement
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">
                  SS Increase
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {fmt(phasedResult.ssIncrease)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  lifetime value
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="text-sm text-purple-700 dark:text-purple-400 mb-1">
                  Healthcare Saved
                </div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {fmt(phasedResult.healthcareSavings)}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  via employer coverage
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== IMPACT CALCULATOR TAB ==================== */}
          <TabsContent value="impact" className="space-y-6">
            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Working Longer Impact Calculator
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    See exactly how part-time work for a few extra years impacts your retirement
                    wealth, Social Security benefits, and healthcare costs.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Extra Work Years</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[extraWorkYears]}
                      onValueChange={([v]) => setExtraWorkYears(v)}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold w-8">{extraWorkYears}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Part-Time Annual Income</Label>
                  <Input
                    type="number"
                    value={partTimeIncome}
                    onChange={(e) => setPartTimeIncome(parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Annual Expenses</Label>
                  <Input
                    type="number"
                    value={annualExpenses}
                    onChange={(e) => setAnnualExpenses(parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <div className="text-center p-6 bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30 rounded-xl">
                  <div className="text-sm text-green-700 dark:text-green-400 mb-2">
                    Working {extraWorkYears} extra years adds
                  </div>
                  <div className="text-4xl font-bold text-green-900 dark:text-green-100">
                    {fmt(workingLongerImpact.totalImpact)}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 mt-2">
                    to your lifetime financial security
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">Portfolio Growth</div>
                    <div className="text-lg font-bold text-green-600">
                      {fmt(workingLongerImpact.portfolioAddition)}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">SS Increase</div>
                    <div className="text-lg font-bold text-blue-600">
                      +{fmt(workingLongerImpact.delayedSSBenefit - workingLongerImpact.originalSSBenefit)}/yr
                    </div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">Healthcare</div>
                    <div className="text-lg font-bold text-purple-600">
                      {fmt(workingLongerImpact.healthcareSavings)}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Social Security Timing:</strong> Delaying from age {ssClaimAge} to{' '}
                      {Math.min(70, ssClaimAge + extraWorkYears)} increases your annual benefit from{' '}
                      {fmt(workingLongerImpact.originalSSBenefit)} to{' '}
                      {fmt(workingLongerImpact.delayedSSBenefit)} - that is a{' '}
                      {(
                        ((workingLongerImpact.delayedSSBenefit - workingLongerImpact.originalSSBenefit) /
                          workingLongerImpact.originalSSBenefit) *
                        100
                      ).toFixed(0)}
                      % increase for life!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== COAST FIRE TAB ==================== */}
          <TabsContent value="coast" className="space-y-6">
            <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-orange-900 dark:text-orange-100">
                    Coast FIRE Calculator
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                    Stop saving for retirement and let your portfolio grow untouched. Work just
                    enough to cover current expenses - the coasting approach to FIRE.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="text-center p-6 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30">
                  {coastFIRE.canCoastNow ? (
                    <>
                      <Sparkles className="h-10 w-10 text-orange-500 mx-auto mb-3" />
                      <div className="text-xl font-bold text-orange-900 dark:text-orange-100">
                        You Can Coast NOW!
                      </div>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">
                        Your portfolio will grow to {fmt(coastFIRE.currentProjection)} by age{' '}
                        {retirementAge}, exceeding your {fmt(coastFIRE.targetAtCoastAge)} target.
                      </p>
                    </>
                  ) : (
                    <>
                      <Clock className="h-10 w-10 text-orange-500 mx-auto mb-3" />
                      <div className="text-xl font-bold text-orange-900 dark:text-orange-100">
                        Coast Age: {coastFIRE.coastAge}
                      </div>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">
                        {coastFIRE.yearsUntilCoast} more years of saving, then coast to retirement!
                      </p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Portfolio</span>
                    <span className="font-medium">{fmt(currentPortfolio)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target at Retirement</span>
                    <span className="font-medium">{fmt(coastFIRE.targetAtCoastAge)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Projected (no more saving)</span>
                    <span
                      className={`font-medium ${coastFIRE.currentProjection >= coastFIRE.targetAtCoastAge ? 'text-green-600' : 'text-amber-600'}`}
                    >
                      {fmt(coastFIRE.currentProjection)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Required Growth Rate</span>
                    <span className="font-medium">{coastFIRE.requiredGrowthRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-orange-500" />
                  What Coast FIRE Means
                </h4>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Stop contributing to retirement accounts - your portfolio compounds on its own
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Work part-time or freelance - just enough to cover monthly expenses of{' '}
                      {fmt(coastFIRE.monthlyExpensesCovered)}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Choose more flexible, fulfilling work since you do not need the income for
                      savings
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Transition gradually to full retirement instead of a sudden cliff
                    </span>
                  </li>
                </ul>

                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800 mt-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Consideration:</strong> Coast FIRE assumes steady market returns.
                      Having a buffer above your target protects against sequence of returns risk.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== BARISTA FIRE TAB ==================== */}
          <TabsContent value="barista" className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <Coffee className="h-5 w-5 text-amber-700 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                    Barista FIRE Strategy
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    Work just enough hours to qualify for employer healthcare benefits. Especially
                    valuable for early retirees before Medicare eligibility at age 65.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {baristaFIRE.yearsUntilMedicare > 0 ? (
                  <div className="text-center p-6 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                    <Shield className="h-10 w-10 text-amber-600 mx-auto mb-3" />
                    <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                      {baristaFIRE.yearsUntilMedicare} years
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                      until Medicare eligibility at age 65
                    </p>
                    <div className="mt-4 pt-4 border-t border-amber-300 dark:border-amber-700">
                      <div className="text-sm text-amber-800 dark:text-amber-200">
                        Healthcare cost over this period:
                      </div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {fmt(baristaFIRE.totalHealthcareCost)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 rounded-xl bg-green-100 dark:bg-green-900/30">
                    <Sparkles className="h-10 w-10 text-green-600 mx-auto mb-3" />
                    <div className="text-xl font-bold text-green-900 dark:text-green-100">
                      Medicare Eligible!
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                      You are already eligible for Medicare - no Barista FIRE needed for healthcare!
                    </p>
                  </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                  <h4 className="font-medium mb-3">Hours Needed for Income Gap</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">At $15/hour</span>
                      <Badge variant="outline">{baristaFIRE.hoursPerWeekAt15} hrs/week</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">At $20/hour</span>
                      <Badge variant="outline">{baristaFIRE.hoursPerWeekAt20} hrs/week</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">At $25/hour</span>
                      <Badge variant="outline">{baristaFIRE.hoursPerWeekAt25} hrs/week</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Required to cover {fmt(baristaFIRE.requiredIncome)}/year income gap
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Employers with Part-Time Benefits</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Starbucks (20+ hrs)',
                    'Costco (24+ hrs)',
                    'REI (20+ hrs)',
                    'UPS (part-time)',
                    'Home Depot (various)',
                    'Chipotle (15+ hrs)',
                    'Whole Foods (20+ hrs)',
                    'Trader Joes (varies)',
                  ].map((employer) => (
                    <div
                      key={employer}
                      className="text-sm p-2 bg-gray-50 dark:bg-gray-900/50 rounded text-center"
                    >
                      {employer}
                    </div>
                  ))}
                </div>

                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800 mt-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-green-900 dark:text-green-100">
                        Annual Savings
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                        Employer healthcare coverage saves you approximately{' '}
                        <strong>{fmt(baristaFIRE.healthcareSavings)}/year</strong> compared to
                        marketplace insurance.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>ACA Alternative:</strong> If your income is low enough, ACA subsidies
                      may cover healthcare. Check Healthcare.gov for premium estimates based on your
                      projected income.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== CONSULTING TAB ==================== */}
          <TabsContent value="consulting" className="space-y-6">
            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                    Consulting & Freelance Income
                  </h3>
                  <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
                    Self-employment has unique tax implications - but also unique opportunities like
                    Solo 401k contributions that can significantly boost your retirement savings.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Annual Consulting Income</Label>
                  <Input
                    type="number"
                    value={consultingIncome}
                    onChange={(e) => setConsultingIncome(parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-3">
                  <h4 className="font-medium">Tax Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gross Income</span>
                      <span className="font-medium">{fmt(consultingIncome)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                      <span>Self-Employment Tax</span>
                      <span>-{fmt(consultingTaxes.seTax)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span>SE Tax Deduction</span>
                      <span>+{fmt(consultingTaxes.deductiblePortion)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Net After Tax</span>
                      <span className="font-bold">{fmt(consultingTaxes.netAfterTax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Effective Tax Rate</span>
                      <span className="font-medium">{consultingTaxes.effectiveRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                      Solo 401(k) Opportunity
                    </h4>
                  </div>
                  <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                    {fmt(consultingTaxes.solo401kContrib)}
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-2">
                    Maximum tax-deferred contribution available
                  </p>
                  <div className="mt-4 space-y-2 text-sm text-purple-800 dark:text-purple-200">
                    <div className="flex justify-between">
                      <span>Employee Contribution</span>
                      <span>${SOLO_401K.employeeLimit.toLocaleString()}</span>
                    </div>
                    {age >= 50 && (
                      <div className="flex justify-between">
                        <span>Catch-up (50+)</span>
                        <span>+${SOLO_401K.catchupLimit.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Employer (25% of net)</span>
                      <span>Up to ${Math.round(consultingIncome * 0.25).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Quarterly Estimated Taxes:</strong> Self-employed individuals must pay
                      quarterly estimated taxes to avoid penalties. Set aside roughly{' '}
                      {consultingTaxes.effectiveRate.toFixed(0)}% of each payment for taxes.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ==================== PSYCHOLOGICAL BENEFITS SECTION ==================== */}
        <Separator className="my-6" />

        <div
          className="cursor-pointer"
          onClick={() => toggleSection('psychological')}
        >
          <div className="flex items-center justify-between p-4 bg-pink-50 dark:bg-pink-950/30 rounded-lg border border-pink-200 dark:border-pink-800 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-pink-600" />
              <div>
                <h3 className="font-semibold text-pink-900 dark:text-pink-100">
                  Beyond the Numbers: Psychological Benefits
                </h3>
                <p className="text-sm text-pink-700 dark:text-pink-300">
                  Why semi-retirement might be better for your wellbeing
                </p>
              </div>
            </div>
            {expandedSection === 'psychological' ? (
              <ChevronUp className="h-5 w-5 text-pink-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-pink-600" />
            )}
          </div>
        </div>

        {expandedSection === 'psychological' && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-300">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-500" />
                <h4 className="font-medium">Social Connection</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Work provides natural social interaction. Many retirees report loneliness as
                their biggest challenge. Part-time work maintains your professional network.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-green-500" />
                <h4 className="font-medium">Purpose & Identity</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Your career is often tied to your identity. A gradual transition helps you
                develop new sources of purpose while maintaining existing ones.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h4 className="font-medium">Mental Stimulation</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Cognitive engagement through work helps maintain mental sharpness. Research
                links continued mental activity to lower dementia risk.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-purple-500" />
                <h4 className="font-medium">Structure & Routine</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Many retirees struggle without the structure work provides. Part-time work
                creates a framework while leaving ample free time.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Smile className="h-5 w-5 text-pink-500" />
                <h4 className="font-medium">Reduced Anxiety</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Some income reduces the stress of living purely off investments. Market
                downturns feel less threatening when you have backup income.
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-teal-500" />
                <h4 className="font-medium">Passion Projects</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Semi-retirement lets you pursue passion projects that might not pay well but
                bring fulfillment - teaching, consulting, creative work.
              </p>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center italic">
            Semi-retirement strategies should be tailored to your specific situation. Consider
            consulting a financial advisor to optimize your approach. Healthcare, taxes, and
            Social Security strategies can be complex - professional guidance is recommended.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SemiRetirement;
