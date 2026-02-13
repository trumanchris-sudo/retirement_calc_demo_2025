'use client';

import { useState, useMemo } from 'react';
import {
  Gift,
  Briefcase,
  Ticket,
  Home,
  TrendingUp,
  Scale,
  Clock,
  PiggyBank,
  CreditCard,
  Shield,
  Wallet,
  LineChart,
  PartyPopper,
  Brain,
  Heart,
  Users,
  AlertTriangle,
  CheckCircle2,
  Info,
  Calculator,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type WindfallType = 'inheritance' | 'bonus' | 'lottery' | 'home_sale' | 'ipo' | 'lawsuit';

interface WindfallSource {
  id: WindfallType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  taxNote: string;
  taxRate: number; // Estimated effective tax rate for calculations
}

interface AllocationResult {
  highInterestDebt: number;
  emergencyFund: number;
  retirementAccounts: number;
  taxableInvesting: number;
  funMoney: number;
  estimatedTax: number;
  netAfterTax: number;
}

// ============================================================================
// Constants
// ============================================================================

const WINDFALL_SOURCES: WindfallSource[] = [
  {
    id: 'inheritance',
    label: 'Inheritance',
    icon: Gift,
    taxNote: 'Usually not taxable income. Assets receive step-up in basis - capital gains reset to zero!',
    taxRate: 0,
  },
  {
    id: 'bonus',
    label: 'Work Bonus',
    icon: Briefcase,
    taxNote: 'Taxed as ordinary income. Withholding is often 22% flat, but your actual rate may differ.',
    taxRate: 0.32,
  },
  {
    id: 'lottery',
    label: 'Lottery / Gambling',
    icon: Ticket,
    taxNote: 'Taxed as ordinary income. Take the lump sum and invest it - the annuity math rarely works out.',
    taxRate: 0.37,
  },
  {
    id: 'home_sale',
    label: 'Home Sale',
    icon: Home,
    taxNote: 'First $250K ($500K married) of gain is tax-free if you lived there 2+ years. Only gains above that are taxed.',
    taxRate: 0.15,
  },
  {
    id: 'ipo',
    label: 'Stock Options / RSUs / IPO',
    icon: TrendingUp,
    taxNote: 'RSUs: Ordinary income at vest. ISOs: AMT trap at exercise, LTCG if held. NSOs: Ordinary income at exercise.',
    taxRate: 0.35,
  },
  {
    id: 'lawsuit',
    label: 'Lawsuit Settlement',
    icon: Scale,
    taxNote: 'Physical injury settlements are tax-free. Emotional distress, punitive damages, and lost wages are taxable.',
    taxRate: 0.25,
  },
];

const FRAMEWORK_STEPS = [
  {
    step: 1,
    title: 'Breathe',
    subtitle: "Don't make decisions for 6 months",
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description:
      'Sudden wealth triggers emotional responses. Give yourself time to process before making major financial moves. The money will still be there in 6 months.',
  },
  {
    step: 2,
    title: 'Park It',
    subtitle: 'HYSA or T-bills while you plan',
    icon: PiggyBank,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    description:
      'Put the money somewhere safe and liquid earning 4-5%. High-yield savings accounts or short-term Treasury bills. No stocks, no real estate, no "opportunities" yet.',
  },
  {
    step: 3,
    title: 'Pay Off High-Interest Debt',
    subtitle: 'Credit cards, personal loans',
    icon: CreditCard,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    description:
      'Any debt above 7% interest should go first. Credit cards (15-25%), personal loans, car loans. This is a guaranteed return equal to your interest rate.',
  },
  {
    step: 4,
    title: 'Emergency Fund',
    subtitle: 'Top it up if needed',
    icon: Shield,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    description:
      '3-6 months of expenses in cash. If your job is unstable or you have dependents, lean toward 6 months. This is your financial foundation.',
  },
  {
    step: 5,
    title: 'Max Retirement Accounts',
    subtitle: 'Backdoor Roth, mega backdoor',
    icon: Wallet,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    description:
      '401(k) to $23,500, IRA to $7,000. If over limits, use backdoor Roth. If your employer allows, mega backdoor Roth up to $70,000 total. Tax-advantaged growth is powerful.',
  },
  {
    step: 6,
    title: 'Taxable Investing',
    subtitle: 'The rest goes here',
    icon: LineChart,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    description:
      'Low-cost index funds in a taxable brokerage. Total market or S&P 500 funds. Keep it simple. Tax-loss harvesting when opportunities arise.',
  },
  {
    step: 7,
    title: 'Fun Money',
    subtitle: 'Budget 5-10% for guilt-free spending',
    icon: PartyPopper,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description:
      "You earned this. Set aside 5-10% for something you've always wanted. A trip, a watch, an experience. This prevents feeling deprived and makes the rest easier to invest.",
  },
];

const PSYCHOLOGICAL_INSIGHTS = [
  {
    title: 'Hedonic Adaptation',
    icon: Brain,
    content:
      'Research shows that lottery winners return to baseline happiness within 1-2 years. More money does not equal more happiness beyond basic needs. Invest in experiences and relationships, not more stuff.',
  },
  {
    title: 'Give Some Away',
    icon: Heart,
    content:
      'Charitable giving activates the same pleasure centers as receiving gifts. Consider a donor-advised fund for tax efficiency. Helping others creates lasting satisfaction that purchases cannot.',
  },
  {
    title: "Don't Tell Everyone",
    icon: Users,
    content:
      'Sudden wealth changes relationships. Friends become requesters, family dynamics shift. Keep it quiet. You can always help people later, but you cannot undo knowledge spreading.',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateAllocation(
  grossAmount: number,
  windfallType: WindfallType,
  existingDebt: number,
  emergencyFundGap: number
): AllocationResult {
  const source = WINDFALL_SOURCES.find((s) => s.id === windfallType);
  const taxRate = source?.taxRate || 0;

  const estimatedTax = grossAmount * taxRate;
  const netAfterTax = grossAmount - estimatedTax;

  // Allocation priorities
  let remaining = netAfterTax;

  // 1. High-interest debt (up to existing debt)
  const highInterestDebt = Math.min(remaining, existingDebt);
  remaining -= highInterestDebt;

  // 2. Emergency fund (up to gap)
  const emergencyFund = Math.min(remaining, emergencyFundGap);
  remaining -= emergencyFund;

  // 3. Fun money (5-10% of net, we use 7.5% as middle ground)
  const funMoneyTarget = netAfterTax * 0.075;
  const funMoney = Math.min(remaining, funMoneyTarget);
  remaining -= funMoney;

  // 4. Retirement accounts (up to annual limits - simplified)
  const retirementMax = 30500; // 401k + IRA simplified
  const retirementAccounts = Math.min(remaining, retirementMax);
  remaining -= retirementAccounts;

  // 5. Everything else to taxable investing
  const taxableInvesting = remaining;

  return {
    highInterestDebt,
    emergencyFund,
    retirementAccounts,
    taxableInvesting,
    funMoney,
    estimatedTax,
    netAfterTax,
  };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface FrameworkStepCardProps {
  step: typeof FRAMEWORK_STEPS[0];
  isExpanded: boolean;
  onToggle: () => void;
}

function FrameworkStepCard({ step, isExpanded, onToggle }: FrameworkStepCardProps) {
  const Icon = step.icon;

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full text-left transition-all duration-200',
        'rounded-lg border-2 p-4',
        step.borderColor,
        step.bgColor,
        'hover:shadow-md'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', step.bgColor)}>
          <Icon className={cn('h-5 w-5', step.color)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-bold', step.color)}>Step {step.step}</span>
            <h4 className="font-semibold">{step.title}</h4>
          </div>
          <p className="text-sm text-muted-foreground">{step.subtitle}</p>
          {isExpanded && (
            <p className="mt-2 text-sm leading-relaxed">{step.description}</p>
          )}
        </div>
      </div>
    </button>
  );
}

interface AllocationBarProps {
  label: string;
  amount: number;
  total: number;
  color: string;
}

function AllocationBar({ label, amount, total, color }: AllocationBarProps) {
  const percentage = total > 0 ? (amount / total) * 100 : 0;

  if (amount <= 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">{formatCurrency(amount)}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn('h-3 rounded-full transition-all duration-500', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right">{percentage.toFixed(1)}%</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WindfallGuide() {
  // State
  const [windfallType, setWindfallType] = useState<WindfallType>('inheritance');
  const [windfallAmount, setWindfallAmount] = useState<string>('');
  const [existingDebt, setExistingDebt] = useState<string>('');
  const [emergencyFundGap, setEmergencyFundGap] = useState<string>('');
  const [expandedStep, setExpandedStep] = useState<number | null>(1);
  const [showCalculator, setShowCalculator] = useState(false);

  // Derived values
  const selectedSource = WINDFALL_SOURCES.find((s) => s.id === windfallType);

  const allocation = useMemo(() => {
    const amount = parseFloat(windfallAmount.replace(/,/g, '')) || 0;
    const debt = parseFloat(existingDebt.replace(/,/g, '')) || 0;
    const emergency = parseFloat(emergencyFundGap.replace(/,/g, '')) || 0;

    if (amount <= 0) return null;

    return calculateAllocation(amount, windfallType, debt, emergency);
  }, [windfallAmount, windfallType, existingDebt, emergencyFundGap]);

  const handleAmountChange = (value: string, setter: (v: string) => void) => {
    // Allow only numbers and commas
    const cleaned = value.replace(/[^0-9,]/g, '');
    setter(cleaned);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
              <Gift className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-2xl">Windfall Management Guide</CardTitle>
              <CardDescription className="text-base">
                When Money Falls from the Sky
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {WINDFALL_SOURCES.map((source) => {
              const Icon = source.icon;
              return (
                <div
                  key={source.id}
                  className="flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-black/20 px-3 py-1 text-sm"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{source.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* The Framework */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            The Framework
          </CardTitle>
          <CardDescription>
            Follow these steps in order. Each builds on the last.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {FRAMEWORK_STEPS.map((step) => (
              <FrameworkStepCard
                key={step.step}
                step={step}
                isExpanded={expandedStep === step.step}
                onToggle={() => setExpandedStep(expandedStep === step.step ? null : step.step)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tax Implications */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Tax Implications by Source
          </CardTitle>
          <CardDescription>
            Understanding taxes prevents expensive surprises
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {WINDFALL_SOURCES.map((source) => {
              const Icon = source.icon;
              return (
                <div
                  key={source.id}
                  className="rounded-lg border p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <h4 className="font-semibold">{source.label}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {source.taxNote}
                  </p>
                  {source.taxRate > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Estimated effective rate: ~{(source.taxRate * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Calculator */}
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-purple-600" />
            Windfall Allocation Calculator
          </CardTitle>
          <CardDescription>
            See how your windfall should be allocated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!showCalculator ? (
            <Button
              onClick={() => setShowCalculator(true)}
              className="w-full"
              variant="outline"
            >
              <Calculator className="mr-2 h-4 w-4" />
              Open Calculator
            </Button>
          ) : (
            <>
              {/* Inputs */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="windfall-type">Windfall Type</Label>
                  <Select
                    value={windfallType}
                    onValueChange={(value) => setWindfallType(value as WindfallType)}
                  >
                    <SelectTrigger id="windfall-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WINDFALL_SOURCES.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="windfall-amount">Gross Windfall Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="windfall-amount"
                      type="text"
                      inputMode="numeric"
                      placeholder="100,000"
                      value={windfallAmount}
                      onChange={(e) => handleAmountChange(e.target.value, setWindfallAmount)}
                      className="pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="existing-debt">High-Interest Debt</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="existing-debt"
                      type="text"
                      inputMode="numeric"
                      placeholder="10,000"
                      value={existingDebt}
                      onChange={(e) => handleAmountChange(e.target.value, setExistingDebt)}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Credit cards, personal loans, etc.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency-gap">Emergency Fund Gap</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="emergency-gap"
                      type="text"
                      inputMode="numeric"
                      placeholder="15,000"
                      value={emergencyFundGap}
                      onChange={(e) => handleAmountChange(e.target.value, setEmergencyFundGap)}
                      className="pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">How much more do you need?</p>
                </div>
              </div>

              {/* Tax Note for Selected Type */}
              {selectedSource && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                        Tax Note: {selectedSource.label}
                      </h4>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                        {selectedSource.taxNote}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Results */}
              {allocation && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold">Recommended Allocation</h4>

                  {/* Tax Impact */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Tax</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(allocation.estimatedTax)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net After Tax</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(allocation.netAfterTax)}
                      </p>
                    </div>
                  </div>

                  {/* Allocation Bars */}
                  <div className="space-y-4">
                    <AllocationBar
                      label="Pay Off High-Interest Debt"
                      amount={allocation.highInterestDebt}
                      total={allocation.netAfterTax}
                      color="bg-red-500"
                    />
                    <AllocationBar
                      label="Emergency Fund"
                      amount={allocation.emergencyFund}
                      total={allocation.netAfterTax}
                      color="bg-green-500"
                    />
                    <AllocationBar
                      label="Retirement Accounts"
                      amount={allocation.retirementAccounts}
                      total={allocation.netAfterTax}
                      color="bg-purple-500"
                    />
                    <AllocationBar
                      label="Taxable Investing"
                      amount={allocation.taxableInvesting}
                      total={allocation.netAfterTax}
                      color="bg-indigo-500"
                    />
                    <AllocationBar
                      label="Fun Money (Guilt-Free!)"
                      amount={allocation.funMoney}
                      total={allocation.netAfterTax}
                      color="bg-amber-500"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
        {showCalculator && (
          <CardFooter>
            <p className="text-xs text-muted-foreground italic">
              These are estimates based on simplified assumptions. Consult a tax professional for your specific situation.
            </p>
          </CardFooter>
        )}
      </Card>

      {/* Psychological Section */}
      <Card className="border-2 border-rose-200 dark:border-rose-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-rose-600" />
            The Psychology of Sudden Wealth
          </CardTitle>
          <CardDescription>
            The emotional side matters as much as the financial side
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {PSYCHOLOGICAL_INSIGHTS.map((insight) => {
              const Icon = insight.icon;
              return (
                <div
                  key={insight.title}
                  className="rounded-lg border p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    <h4 className="font-semibold">{insight.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.content}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Footer Disclaimer */}
      <div className="text-center text-xs text-muted-foreground p-4 bg-muted/50 rounded-lg space-y-2">
        <p>
          <strong>Help people not blow it.</strong>
        </p>
        <p>
          This guide is educational information, not financial or tax advice. Windfall situations are complex
          and highly individual. Work with a fiduciary financial advisor and tax professional for your specific circumstances.
        </p>
      </div>
    </div>
  );
}

export default WindfallGuide;
