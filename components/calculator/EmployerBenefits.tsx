'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { cn, fmt, fmtFull } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Gift,
  Briefcase,
  Heart,
  GraduationCap,
  Baby,
  Calendar,
  PiggyBank,
  Building2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface Match401kFormula {
  matchPercent: number; // e.g., 50 for 50%
  upToPercent: number; // e.g., 6 for "up to 6%"
}

interface EmployerBenefitsInputs {
  // 401k Match
  annualSalary: number;
  currentContributionPercent: number;
  matchFormula: Match401kFormula;

  // HSA
  hsaEmployerContribution: number;
  hsaEnabled: boolean;

  // ESPP
  esppEnabled: boolean;
  esppDiscount: number;
  esppContributionPercent: number;
  esppMaxContribution: number;

  // Mega Backdoor Roth
  allows401kAfterTax: boolean;
  allowsInPlanRothConversion: boolean;

  // Insurance
  lifeInsuranceMultiplier: number;
  hasDisabilityInsurance: boolean;

  // FSA/DCFSA
  fsaContribution: number;
  dcfsaContribution: number;
  hasChildcareExpenses: boolean;

  // Education
  tuitionReimbursementMax: number;
  studentLoanAssistance: number;
  has529Match: boolean;
  match529Percent: number;
}

interface BenefitAuditItem {
  category: string;
  benefit: string;
  status: 'maximized' | 'partial' | 'unused' | 'not-available';
  moneyOnTable: number;
  action: string;
}

export interface EmployerBenefitsProps {
  className?: string;
  onBenefitsChange?: (totalFreeMoney: number, hsaBoost: number) => void;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_INPUTS: EmployerBenefitsInputs = {
  annualSalary: 100000,
  currentContributionPercent: 4,
  matchFormula: { matchPercent: 50, upToPercent: 6 },
  hsaEmployerContribution: 500,
  hsaEnabled: true,
  esppEnabled: false,
  esppDiscount: 15,
  esppContributionPercent: 10,
  esppMaxContribution: 25000,
  allows401kAfterTax: false,
  allowsInPlanRothConversion: false,
  lifeInsuranceMultiplier: 1,
  hasDisabilityInsurance: true,
  fsaContribution: 0,
  dcfsaContribution: 0,
  hasChildcareExpenses: false,
  tuitionReimbursementMax: 5250,
  studentLoanAssistance: 0,
  has529Match: false,
  match529Percent: 0,
};

// ============================================================================
// Calculation Utilities
// ============================================================================

function calculate401kMatchLost(inputs: EmployerBenefitsInputs): {
  matchEarned: number;
  maxMatch: number;
  moneyLeftOnTable: number;
  percentToContribute: number;
} {
  const { annualSalary, currentContributionPercent, matchFormula } = inputs;

  // Calculate what you need to contribute to get full match
  const percentToContribute = matchFormula.upToPercent;

  // Calculate max possible match
  const maxMatch =
    (annualSalary * (matchFormula.upToPercent / 100)) *
    (matchFormula.matchPercent / 100);

  // Calculate what you're actually getting
  const effectiveContribution = Math.min(
    currentContributionPercent,
    matchFormula.upToPercent
  );
  const matchEarned =
    (annualSalary * (effectiveContribution / 100)) *
    (matchFormula.matchPercent / 100);

  return {
    matchEarned,
    maxMatch,
    moneyLeftOnTable: maxMatch - matchEarned,
    percentToContribute,
  };
}

function calculateESPPReturn(inputs: EmployerBenefitsInputs): {
  annualContribution: number;
  instantReturn: number;
  effectiveReturn: number;
} {
  if (!inputs.esppEnabled) {
    return { annualContribution: 0, instantReturn: 0, effectiveReturn: 0 };
  }

  const annualContribution = Math.min(
    inputs.annualSalary * (inputs.esppContributionPercent / 100),
    inputs.esppMaxContribution
  );

  // 15% discount means you pay 85% for 100% value = ~17.6% instant return
  const discountMultiplier = 100 / (100 - inputs.esppDiscount);
  const instantReturn = annualContribution * (discountMultiplier - 1);
  const effectiveReturn = ((discountMultiplier - 1) * 100);

  return {
    annualContribution,
    instantReturn,
    effectiveReturn,
  };
}

function calculateMegaBackdoorRoth(inputs: EmployerBenefitsInputs): {
  eligible: boolean;
  additionalRothSpace: number;
  explanation: string;
} {
  const eligible = inputs.allows401kAfterTax && inputs.allowsInPlanRothConversion;

  // 2025 limits: $70,000 total 401k limit (employee + employer)
  // Minus $23,500 employee elective deferral
  // = ~$46,500 potential mega backdoor space (varies by employer match)
  const additionalRothSpace = eligible ? 46500 : 0;

  let explanation = '';
  if (!inputs.allows401kAfterTax && !inputs.allowsInPlanRothConversion) {
    explanation = 'Your plan does not support mega backdoor Roth.';
  } else if (!inputs.allows401kAfterTax) {
    explanation = 'Your plan needs to allow after-tax contributions.';
  } else if (!inputs.allowsInPlanRothConversion) {
    explanation = 'Your plan needs to allow in-plan Roth conversions.';
  } else {
    explanation = 'Your plan supports mega backdoor Roth!';
  }

  return { eligible, additionalRothSpace, explanation };
}

function calculateDCFSATaxSavings(
  contribution: number,
  taxRate: number = 0.32
): number {
  // DCFSA max is $5,000 (or $2,500 if married filing separately)
  const effectiveContribution = Math.min(contribution, 5000);
  return effectiveContribution * taxRate;
}

function calculateTotalFreeMoney(inputs: EmployerBenefitsInputs): number {
  const match401k = calculate401kMatchLost(inputs).matchEarned;
  const hsa = inputs.hsaEnabled ? inputs.hsaEmployerContribution : 0;
  const espp = calculateESPPReturn(inputs).instantReturn;
  const education =
    inputs.studentLoanAssistance +
    (inputs.has529Match
      ? inputs.tuitionReimbursementMax * (inputs.match529Percent / 100)
      : 0);

  return match401k + hsa + espp + education;
}

function generateBenefitAudit(
  inputs: EmployerBenefitsInputs
): BenefitAuditItem[] {
  const items: BenefitAuditItem[] = [];

  // 401k Match
  const matchCalc = calculate401kMatchLost(inputs);
  if (matchCalc.moneyLeftOnTable > 0) {
    items.push({
      category: '401k',
      benefit: '401k Employer Match',
      status: matchCalc.matchEarned > 0 ? 'partial' : 'unused',
      moneyOnTable: matchCalc.moneyLeftOnTable,
      action: `Increase contribution to ${matchCalc.percentToContribute}%`,
    });
  } else {
    items.push({
      category: '401k',
      benefit: '401k Employer Match',
      status: 'maximized',
      moneyOnTable: 0,
      action: 'Keep it up!',
    });
  }

  // HSA
  if (inputs.hsaEnabled) {
    items.push({
      category: 'HSA',
      benefit: 'HSA Employer Contribution',
      status: 'maximized',
      moneyOnTable: 0,
      action: 'Continue maxing out HSA for triple tax advantage',
    });
  }

  // ESPP
  if (inputs.esppEnabled) {
    const esppCalc = calculateESPPReturn(inputs);
    items.push({
      category: 'ESPP',
      benefit: 'Employee Stock Purchase Plan',
      status: 'maximized',
      moneyOnTable: 0,
      action: `Earning ${fmtFull(esppCalc.instantReturn)}/year in instant returns`,
    });
  } else {
    items.push({
      category: 'ESPP',
      benefit: 'Employee Stock Purchase Plan',
      status: 'not-available',
      moneyOnTable: 0,
      action: 'Check if your employer offers ESPP',
    });
  }

  // Mega Backdoor Roth
  const megaBackdoor = calculateMegaBackdoorRoth(inputs);
  if (megaBackdoor.eligible) {
    items.push({
      category: 'Mega Backdoor',
      benefit: 'Mega Backdoor Roth',
      status: 'maximized',
      moneyOnTable: 0,
      action: `${fmtFull(megaBackdoor.additionalRothSpace)} additional Roth space available`,
    });
  }

  // DCFSA
  if (inputs.hasChildcareExpenses && inputs.dcfsaContribution < 5000) {
    const potentialSavings = calculateDCFSATaxSavings(5000 - inputs.dcfsaContribution);
    items.push({
      category: 'FSA',
      benefit: 'Dependent Care FSA',
      status: inputs.dcfsaContribution > 0 ? 'partial' : 'unused',
      moneyOnTable: potentialSavings,
      action: 'Max out $5,000 DCFSA for childcare tax savings',
    });
  }

  return items;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MoneyAlertProps {
  amount: number;
  message: string;
  variant?: 'warning' | 'success';
}

function MoneyAlert({ amount, message, variant = 'warning' }: MoneyAlertProps) {
  if (amount <= 0) return null;

  return (
    <Alert
      className={cn(
        'border-2',
        variant === 'warning'
          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
          : 'border-green-500 bg-green-50 dark:bg-green-950/20'
      )}
    >
      {variant === 'warning' ? (
        <AlertTriangle className="h-4 w-4 text-amber-600" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      )}
      <AlertTitle
        className={cn(
          'text-lg font-bold',
          variant === 'warning' ? 'text-amber-800 dark:text-amber-200' : 'text-green-800 dark:text-green-200'
        )}
      >
        {variant === 'warning'
          ? `You're leaving ${fmtFull(amount)} on the table!`
          : `You're capturing ${fmtFull(amount)} in free money!`}
      </AlertTitle>
      <AlertDescription className="text-sm">{message}</AlertDescription>
    </Alert>
  );
}

// BenefitSection component - available for future use
// interface BenefitSectionProps {
//   icon: React.ReactNode;
//   title: string;
//   badge?: string;
//   badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
//   children: React.ReactNode;
// }

// ============================================================================
// Main Component
// ============================================================================

export default function EmployerBenefits({
  className,
  onBenefitsChange,
}: EmployerBenefitsProps) {
  const [inputs, setInputs] = useState<EmployerBenefitsInputs>(DEFAULT_INPUTS);
  const [expandedSections, setExpandedSections] = useState<string[]>(['401k']);

  // Calculations
  const matchCalc = useMemo(() => calculate401kMatchLost(inputs), [inputs]);
  const esppCalc = useMemo(() => calculateESPPReturn(inputs), [inputs]);
  const megaBackdoor = useMemo(() => calculateMegaBackdoorRoth(inputs), [inputs]);
  const totalFreeMoney = useMemo(() => calculateTotalFreeMoney(inputs), [inputs]);
  const auditItems = useMemo(() => generateBenefitAudit(inputs), [inputs]);

  // Notify parent of changes
  useMemo(() => {
    if (onBenefitsChange) {
      onBenefitsChange(totalFreeMoney, inputs.hsaEnabled ? inputs.hsaEmployerContribution : 0);
    }
  }, [totalFreeMoney, inputs.hsaEnabled, inputs.hsaEmployerContribution, onBenefitsChange]);

  const updateInput = <K extends keyof EmployerBenefitsInputs>(
    key: K,
    value: EmployerBenefitsInputs[K]
  ) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const matchProgress =
    inputs.currentContributionPercent >= inputs.matchFormula.upToPercent
      ? 100
      : (inputs.currentContributionPercent / inputs.matchFormula.upToPercent) * 100;

  return (
    <Card className={cn('border-2 border-emerald-200 dark:border-emerald-800', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Gift className="h-6 w-6 text-emerald-600" />
          <CardTitle className="text-2xl">Employer Benefits Maximizer</CardTitle>
        </div>
        <CardDescription>
          Free money hiding in plain sight. Find every dollar your employer is offering.
        </CardDescription>

        {/* Total Free Money Summary */}
        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Annual Free Money</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {fmtFull(totalFreeMoney)}
              </p>
            </div>
            <Sparkles className="h-10 w-10 text-emerald-500 opacity-50" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Accordion
          type="multiple"
          value={expandedSections}
          onValueChange={setExpandedSections}
          className="space-y-4"
        >
          {/* ================================================================ */}
          {/* 1. 401k Match Calculator */}
          {/* ================================================================ */}
          <AccordionItem value="401k" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                <PiggyBank className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">401k Match Calculator</span>
                {matchCalc.moneyLeftOnTable > 0 && (
                  <Badge variant="destructive" className="ml-auto mr-2">
                    -{fmt(matchCalc.moneyLeftOnTable)}/yr
                  </Badge>
                )}
                {matchCalc.moneyLeftOnTable === 0 && (
                  <Badge className="ml-auto mr-2 bg-green-600">Maximized</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salary">Annual Salary</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="salary"
                      type="number"
                      value={inputs.annualSalary}
                      onChange={(e) =>
                        updateInput('annualSalary', Number(e.target.value))
                      }
                      className="pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contribution">Your Contribution %</Label>
                  <div className="relative">
                    <Input
                      id="contribution"
                      type="number"
                      min={0}
                      max={100}
                      value={inputs.currentContributionPercent}
                      onChange={(e) =>
                        updateInput(
                          'currentContributionPercent',
                          Number(e.target.value)
                        )
                      }
                      className="pr-7"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Employer Match Formula
                  <InfoTooltip
                    content="Common formulas: 50% up to 6% (you contribute 6%, get 3%), 100% up to 4% (you contribute 4%, get 4%), dollar-for-dollar up to 3%"
                    className="ml-1"
                  />
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={200}
                      value={inputs.matchFormula.matchPercent}
                      onChange={(e) =>
                        updateInput('matchFormula', {
                          ...inputs.matchFormula,
                          matchPercent: Number(e.target.value),
                        })
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">% match</span>
                  </div>
                  <span className="text-sm text-muted-foreground">up to</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={inputs.matchFormula.upToPercent}
                      onChange={(e) =>
                        updateInput('matchFormula', {
                          ...inputs.matchFormula,
                          upToPercent: Number(e.target.value),
                        })
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">% of salary</span>
                  </div>
                </div>
              </div>

              {/* Match Progress */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm">
                  <span>Match Captured</span>
                  <span className="font-medium">
                    {fmtFull(matchCalc.matchEarned)} / {fmtFull(matchCalc.maxMatch)}
                  </span>
                </div>
                <Progress value={matchProgress} className="h-3" />
              </div>

              <MoneyAlert
                amount={matchCalc.moneyLeftOnTable}
                message={`Increase your contribution from ${inputs.currentContributionPercent}% to ${matchCalc.percentToContribute}% to capture the full employer match. This is guaranteed 50-100% return on your money!`}
              />

              {matchCalc.moneyLeftOnTable === 0 && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800 dark:text-green-200">
                    Excellent! You are getting the full match.
                  </AlertTitle>
                  <AlertDescription>
                    You are contributing at least {matchCalc.percentToContribute}%
                    and receiving {fmtFull(matchCalc.maxMatch)} in free money annually.
                  </AlertDescription>
                </Alert>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* ================================================================ */}
          {/* 2. HSA Employer Contribution */}
          {/* ================================================================ */}
          <AccordionItem value="hsa" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                <Heart className="h-5 w-5 text-red-500" />
                <span className="font-semibold">HSA Employer Contribution</span>
                {inputs.hsaEnabled && inputs.hsaEmployerContribution > 0 && (
                  <Badge className="ml-auto mr-2 bg-green-600">
                    +{fmt(inputs.hsaEmployerContribution)}/yr
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="hsa-enabled">HSA-Eligible Health Plan</Label>
                  <p className="text-xs text-muted-foreground">
                    High-deductible health plan with HSA
                  </p>
                </div>
                <Switch
                  id="hsa-enabled"
                  checked={inputs.hsaEnabled}
                  onCheckedChange={(checked) => updateInput('hsaEnabled', checked)}
                />
              </div>

              {inputs.hsaEnabled && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="hsa-employer">
                      Employer HSA Contribution (Annual)
                      <InfoTooltip
                        content="Many employers contribute $500-$1,500 annually to your HSA. This is free money that's never taxed if used for healthcare."
                        className="ml-1"
                      />
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="hsa-employer"
                        type="number"
                        value={inputs.hsaEmployerContribution}
                        onChange={(e) =>
                          updateInput('hsaEmployerContribution', Number(e.target.value))
                        }
                        className="pl-7"
                      />
                    </div>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 dark:text-blue-200">
                      Triple Tax Advantage
                    </AlertTitle>
                    <AlertDescription className="text-sm">
                      HSAs offer tax-free contributions, tax-free growth, and tax-free
                      withdrawals for medical expenses. After age 65, it works like a
                      traditional IRA for non-medical expenses.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* ================================================================ */}
          {/* 3. ESPP (Employee Stock Purchase Plan) */}
          {/* ================================================================ */}
          <AccordionItem value="espp" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span className="font-semibold">ESPP (Employee Stock Purchase Plan)</span>
                {inputs.esppEnabled && (
                  <Badge className="ml-auto mr-2 bg-purple-600">
                    {esppCalc.effectiveReturn.toFixed(1)}% instant return
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="espp-enabled">ESPP Available</Label>
                  <p className="text-xs text-muted-foreground">
                    Employee stock purchase plan with discount
                  </p>
                </div>
                <Switch
                  id="espp-enabled"
                  checked={inputs.esppEnabled}
                  onCheckedChange={(checked) => updateInput('esppEnabled', checked)}
                />
              </div>

              {inputs.esppEnabled && (
                <div className="space-y-4 pt-2">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="espp-discount">
                        Discount %
                        <InfoTooltip
                          content="Most ESPPs offer a 15% discount on stock price. Some also use a lookback provision, comparing prices at the start and end of the purchase period."
                          className="ml-1"
                        />
                      </Label>
                      <div className="relative">
                        <Input
                          id="espp-discount"
                          type="number"
                          min={0}
                          max={25}
                          value={inputs.esppDiscount}
                          onChange={(e) =>
                            updateInput('esppDiscount', Number(e.target.value))
                          }
                          className="pr-7"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="espp-contribution">Your Contribution %</Label>
                      <div className="relative">
                        <Input
                          id="espp-contribution"
                          type="number"
                          min={0}
                          max={15}
                          value={inputs.esppContributionPercent}
                          onChange={(e) =>
                            updateInput(
                              'esppContributionPercent',
                              Number(e.target.value)
                            )
                          }
                          className="pr-7"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Annual Contribution</p>
                        <p className="text-xl font-bold text-purple-600">
                          {fmtFull(esppCalc.annualContribution)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Instant Return</p>
                        <p className="text-xl font-bold text-green-600">
                          +{fmtFull(esppCalc.instantReturn)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-200">
                      Strategy: Buy and Sell Immediately
                    </AlertTitle>
                    <AlertDescription className="text-sm space-y-2">
                      <p>
                        <strong>Low risk:</strong> Buy at discount, sell same day to lock in
                        {' '}{inputs.esppDiscount}% gain.
                      </p>
                      <p>
                        <strong>Warning:</strong> Holding company stock concentrates risk.
                        Your job AND investments are tied to one company.
                      </p>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* ================================================================ */}
          {/* 4. Mega Backdoor Roth Check */}
          {/* ================================================================ */}
          <AccordionItem value="mega-backdoor" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                <Briefcase className="h-5 w-5 text-indigo-600" />
                <span className="font-semibold">Mega Backdoor Roth Check</span>
                {megaBackdoor.eligible && (
                  <Badge className="ml-auto mr-2 bg-indigo-600">
                    +{fmt(megaBackdoor.additionalRothSpace)} Roth space
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                The mega backdoor Roth allows high earners to contribute an additional
                $40,000+ to Roth accounts annually. Check if your plan qualifies:
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Does your 401k allow after-tax contributions?
                    </span>
                    <InfoTooltip
                      content="After-tax contributions are different from Roth 401k. They go into a separate after-tax bucket beyond the $23,500 limit."
                    />
                  </div>
                  <Switch
                    checked={inputs.allows401kAfterTax}
                    onCheckedChange={(checked) =>
                      updateInput('allows401kAfterTax', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Does it allow in-plan Roth conversion?
                    </span>
                    <InfoTooltip
                      content="In-plan Roth conversion lets you convert after-tax contributions to Roth within your 401k, avoiding taxes on growth."
                    />
                  </div>
                  <Switch
                    checked={inputs.allowsInPlanRothConversion}
                    onCheckedChange={(checked) =>
                      updateInput('allowsInPlanRothConversion', checked)
                    }
                  />
                </div>
              </div>

              <Alert
                className={cn(
                  'border-2',
                  megaBackdoor.eligible
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-muted'
                )}
              >
                {megaBackdoor.eligible ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                )}
                <AlertTitle
                  className={
                    megaBackdoor.eligible
                      ? 'text-green-800 dark:text-green-200'
                      : ''
                  }
                >
                  {megaBackdoor.eligible
                    ? 'Your plan supports Mega Backdoor Roth!'
                    : 'Requirements not met'}
                </AlertTitle>
                <AlertDescription>
                  {megaBackdoor.explanation}
                  {megaBackdoor.eligible && (
                    <span className="block mt-1 font-medium">
                      Additional Roth space: {fmtFull(megaBackdoor.additionalRothSpace)}/year
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          {/* ================================================================ */}
          {/* 5. Life/Disability Insurance */}
          {/* ================================================================ */}
          <AccordionItem value="insurance" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                <Heart className="h-5 w-5 text-rose-600" />
                <span className="font-semibold">Life & Disability Insurance</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="life-multiplier">
                    Life Insurance (x Salary)
                    <InfoTooltip
                      content="Employer-provided life insurance is often 1-2x salary at no cost. You may be able to buy additional coverage at group rates."
                      className="ml-1"
                    />
                  </Label>
                  <div className="relative">
                    <Input
                      id="life-multiplier"
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      value={inputs.lifeInsuranceMultiplier}
                      onChange={(e) =>
                        updateInput('lifeInsuranceMultiplier', Number(e.target.value))
                      }
                      className="pr-7"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      x
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <Label htmlFor="disability">Disability Insurance</Label>
                  <Switch
                    id="disability"
                    checked={inputs.hasDisabilityInsurance}
                    onCheckedChange={(checked) =>
                      updateInput('hasDisabilityInsurance', checked)
                    }
                  />
                </div>
              </div>

              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-200">
                  Watch for Golden Handcuffs
                </AlertTitle>
                <AlertDescription className="text-sm">
                  Group rates are often cheaper, but coverage ends if you leave.
                  Consider portable individual policies for core coverage needs,
                  especially if you have health conditions that might affect future insurability.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          {/* ================================================================ */}
          {/* 6. FSA/DCFSA */}
          {/* ================================================================ */}
          <AccordionItem value="fsa" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                <Baby className="h-5 w-5 text-pink-600" />
                <span className="font-semibold">FSA & Dependent Care FSA</span>
                {inputs.hasChildcareExpenses && inputs.dcfsaContribution < 5000 && (
                  <Badge variant="destructive" className="ml-auto mr-2">
                    Missing tax savings
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fsa">
                    Healthcare FSA
                    <InfoTooltip
                      content="Pre-tax dollars for medical expenses. Use it or lose it (except $640 carryover). 2025 limit: $3,300."
                      className="ml-1"
                    />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="fsa"
                      type="number"
                      max={3300}
                      value={inputs.fsaContribution}
                      onChange={(e) =>
                        updateInput('fsaContribution', Number(e.target.value))
                      }
                      className="pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dcfsa">
                    Dependent Care FSA
                    <InfoTooltip
                      content="Pre-tax dollars for childcare expenses like daycare, nanny, or summer camp. Max: $5,000/year ($2,500 if married filing separately)."
                      className="ml-1"
                    />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="dcfsa"
                      type="number"
                      max={5000}
                      value={inputs.dcfsaContribution}
                      onChange={(e) =>
                        updateInput('dcfsaContribution', Number(e.target.value))
                      }
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <Label htmlFor="childcare">Do you have childcare expenses?</Label>
                <Switch
                  id="childcare"
                  checked={inputs.hasChildcareExpenses}
                  onCheckedChange={(checked) =>
                    updateInput('hasChildcareExpenses', checked)
                  }
                />
              </div>

              {inputs.hasChildcareExpenses && inputs.dcfsaContribution < 5000 && (
                <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-200">
                    Tax Savings Opportunity
                  </AlertTitle>
                  <AlertDescription className="text-sm">
                    At a 32% tax rate, maxing out DCFSA at $5,000 saves you{' '}
                    <strong>{fmtFull(calculateDCFSATaxSavings(5000))}</strong> in taxes annually.
                    This is free money for childcare you are already paying for!
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-xs text-muted-foreground">
                Note: FSA and HSA cannot both be used for healthcare (unless FSA is limited-purpose).
                DCFSA is separate and can be used alongside either.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* ================================================================ */}
          {/* 7. Education Benefits */}
          {/* ================================================================ */}
          <AccordionItem value="education" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                <GraduationCap className="h-5 w-5 text-cyan-600" />
                <span className="font-semibold">Education Benefits</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tuition">
                    Tuition Reimbursement (Annual Max)
                    <InfoTooltip
                      content="Tax-free up to $5,250/year. Many employers offer more (taxable above that). Great for degrees, certifications, or professional development."
                      className="ml-1"
                    />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="tuition"
                      type="number"
                      value={inputs.tuitionReimbursementMax}
                      onChange={(e) =>
                        updateInput('tuitionReimbursementMax', Number(e.target.value))
                      }
                      className="pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student-loan">
                    Student Loan Repayment Assistance
                    <InfoTooltip
                      content="Growing benefit where employers contribute to your student loans. Tax-free up to $5,250/year through 2025."
                      className="ml-1"
                    />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="student-loan"
                      type="number"
                      value={inputs.studentLoanAssistance}
                      onChange={(e) =>
                        updateInput('studentLoanAssistance', Number(e.target.value))
                      }
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="529-match">529 Matching</Label>
                  <p className="text-xs text-muted-foreground">
                    Some employers match 529 contributions
                  </p>
                </div>
                <Switch
                  id="529-match"
                  checked={inputs.has529Match}
                  onCheckedChange={(checked) => updateInput('has529Match', checked)}
                />
              </div>

              {inputs.has529Match && (
                <div className="space-y-2">
                  <Label htmlFor="529-percent">529 Match Percentage</Label>
                  <div className="relative">
                    <Input
                      id="529-percent"
                      type="number"
                      min={0}
                      max={100}
                      value={inputs.match529Percent}
                      onChange={(e) =>
                        updateInput('match529Percent', Number(e.target.value))
                      }
                      className="pr-7"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* ================================================================ */}
          {/* 8. Benefits Audit Checklist */}
          {/* ================================================================ */}
          <AccordionItem value="audit" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                <Calendar className="h-5 w-5 text-orange-600" />
                <span className="font-semibold">Benefits Audit Checklist</span>
                <Badge variant="outline" className="ml-auto mr-2">
                  Open Enrollment
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Review annually during open enrollment. Are you maximizing everything?
              </p>

              <div className="space-y-2">
                {auditItems.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      item.status === 'maximized' &&
                        'bg-green-50 dark:bg-green-950/20 border-green-200',
                      item.status === 'partial' &&
                        'bg-amber-50 dark:bg-amber-950/20 border-amber-200',
                      item.status === 'unused' &&
                        'bg-red-50 dark:bg-red-950/20 border-red-200',
                      item.status === 'not-available' &&
                        'bg-muted/50 border-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.status === 'maximized' && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                      {item.status === 'partial' && (
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      )}
                      {item.status === 'unused' && (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      )}
                      {item.status === 'not-available' && (
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{item.benefit}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.action}
                        </p>
                      </div>
                    </div>
                    {item.moneyOnTable > 0 && (
                      <Badge variant="destructive">
                        -{fmt(item.moneyOnTable)}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">
                  Annual Review Checklist:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Review 401k contribution and match formula
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Maximize HSA if on high-deductible plan
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Enroll in ESPP if available (free money!)
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Set FSA/DCFSA based on expected expenses
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Review life/disability insurance needs
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Check for new benefits (529 match, student loan help)
                  </li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Footer Note */}
        <div className="text-center text-xs text-muted-foreground p-4 bg-muted/50 rounded-lg">
          <p className="font-medium mb-1">Free money hiding in plain sight.</p>
          <p>
            Review your benefits package at least once a year during open enrollment.
            Small optimizations compound into thousands of dollars over your career.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
