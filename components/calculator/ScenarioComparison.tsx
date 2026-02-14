'use client';

/**
 * Scenario Comparison Component
 *
 * Compare multiple retirement scenarios side-by-side to help users
 * answer "what if" questions by comparing different options.
 *
 * Features:
 * 1. Side-by-side comparison of up to 4 scenarios
 * 2. Diff highlighting (what changed between scenarios)
 * 3. Sync scrolling for detailed comparison
 * 4. Best scenario highlighting for key metrics
 * 5. Create scenario from current configuration
 * 6. Name and save scenarios for later comparison
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  GitCompare,
  Plus,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Lock,
  Unlock,
  Sparkles,
  Scale,
  DollarSign,
  Calendar,
  Percent,
  AlertTriangle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlanConfig } from '@/lib/plan-config-context';
import { createDefaultPlanConfig } from '@/types/plan-config';
import {
  getAllScenarios,
  saveScenario,
  deleteScenario,
  type SavedScenario,
} from '@/lib/scenarioManager';
import { runSingleSimulation } from '@/lib/calculations/retirementEngine';
import type { PlanConfig } from '@/types/plan-config';
import { cn, fmt } from '@/lib/utils';

// ==================== Types ====================

interface ComparisonScenario extends SavedScenario {
  /** Calculated results for this scenario */
  results?: ScenarioResults;
  /** Color for visual identification */
  color: string;
  /** Whether this is the current (unsaved) config */
  isCurrent?: boolean;
}

interface ScenarioResults {
  /** Final balance at retirement (real) */
  finReal: number;
  /** End-of-life wealth (real) */
  eolReal: number;
  /** Years portfolio survived (if depleted) */
  survYrs: number;
  /** Year 1 after-tax withdrawal */
  y1AfterTaxReal: number;
  /** Whether portfolio ran out */
  ruined: boolean;
  /** Total contributions made */
  totalContributions: number;
}

interface MetricDefinition {
  key: keyof ScenarioResults | string;
  label: string;
  icon: React.ElementType;
  format: (value: number) => string;
  higherIsBetter: boolean;
  description: string;
  /** Custom value extractor for nested properties */
  getValue?: (scenario: ComparisonScenario) => number;
}

interface DiffResult {
  field: string;
  label: string;
  baseValue: string | number;
  compareValue: string | number;
  changeDirection: 'up' | 'down' | 'same';
  changePercent?: number;
}

// ==================== Constants ====================

const SCENARIO_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
];

const METRICS: MetricDefinition[] = [
  {
    key: 'finReal',
    label: 'Retirement Nest Egg',
    icon: DollarSign,
    format: fmt,
    higherIsBetter: true,
    description: 'Portfolio value at retirement (inflation-adjusted)',
  },
  {
    key: 'eolReal',
    label: 'End-of-Life Wealth',
    icon: TrendingUp,
    format: fmt,
    higherIsBetter: true,
    description: 'Legacy wealth at age 95 (inflation-adjusted)',
  },
  {
    key: 'y1AfterTaxReal',
    label: 'Year 1 Income',
    icon: Percent,
    format: fmt,
    higherIsBetter: true,
    description: 'First year retirement income after taxes',
  },
  {
    key: 'survYrs',
    label: 'Portfolio Lifespan',
    icon: Calendar,
    format: (v) => v === 0 ? 'Never depletes' : `${v} years`,
    higherIsBetter: true,
    description: 'Years until portfolio runs out (0 = indefinite)',
  },
  {
    key: 'totalContributions',
    label: 'Total Contributions',
    icon: DollarSign,
    format: fmt,
    higherIsBetter: false, // Lower contributions for same result is better
    description: 'Total amount contributed during accumulation',
  },
];

const COMPARISON_FIELDS: Array<{
  category: string;
  fields: Array<{
    key: keyof PlanConfig;
    label: string;
    format: (v: unknown) => string;
  }>;
}> = [
  {
    category: 'Personal',
    fields: [
      { key: 'age1', label: 'Current Age', format: (v) => `${v} years` },
      { key: 'retirementAge', label: 'Retirement Age', format: (v) => `${v} years` },
      { key: 'marital', label: 'Filing Status', format: (v) => v === 'married' ? 'Married' : v === 'single' ? 'Single' : String(v) },
    ],
  },
  {
    category: 'Current Balances',
    fields: [
      { key: 'taxableBalance', label: 'Taxable', format: (v) => fmt(Number(v)) },
      { key: 'pretaxBalance', label: 'Pre-Tax (401k/IRA)', format: (v) => fmt(Number(v)) },
      { key: 'rothBalance', label: 'Roth', format: (v) => fmt(Number(v)) },
    ],
  },
  {
    category: 'Annual Contributions',
    fields: [
      { key: 'cTax1', label: 'Taxable', format: (v) => fmt(Number(v)) },
      { key: 'cPre1', label: 'Pre-Tax', format: (v) => fmt(Number(v)) },
      { key: 'cPost1', label: 'Roth', format: (v) => fmt(Number(v)) },
      { key: 'cMatch1', label: 'Employer Match', format: (v) => fmt(Number(v)) },
    ],
  },
  {
    category: 'Assumptions',
    fields: [
      { key: 'retRate', label: 'Return Rate', format: (v) => `${v}%` },
      { key: 'inflationRate', label: 'Inflation', format: (v) => `${v}%` },
      { key: 'wdRate', label: 'Withdrawal Rate', format: (v) => `${v}%` },
    ],
  },
  {
    category: 'Social Security',
    fields: [
      { key: 'includeSS', label: 'Include SS', format: (v) => v ? 'Yes' : 'No' },
      { key: 'ssIncome', label: 'SS Income Basis', format: (v) => fmt(Number(v)) },
      { key: 'ssClaimAge', label: 'Claim Age', format: (v) => `${v} years` },
    ],
  },
];

const MAX_SCENARIOS = 4;

// ==================== Helper Functions ====================

/**
 * Run simulation for a scenario config and return results
 */
function runScenarioSimulation(config: PlanConfig): ScenarioResults {
  const defaults = createDefaultPlanConfig();
  try {
    const inputs = {
      marital: config.marital,
      age1: config.age1,
      age2: config.age2 ?? config.age1,
      retirementAge: config.retirementAge,
      taxableBalance: config.taxableBalance,
      pretaxBalance: config.pretaxBalance,
      rothBalance: config.rothBalance,
      cTax1: config.cTax1,
      cPre1: config.cPre1,
      cPost1: config.cPost1,
      cMatch1: config.cMatch1,
      cTax2: config.cTax2 ?? defaults.cTax2,
      cPre2: config.cPre2 ?? defaults.cPre2,
      cPost2: config.cPost2 ?? defaults.cPost2,
      cMatch2: config.cMatch2 ?? defaults.cMatch2,
      retRate: config.retRate,
      inflationRate: config.inflationRate,
      stateRate: config.stateRate ?? defaults.stateRate,
      incContrib: config.incContrib ?? defaults.incContrib,
      incRate: config.incRate ?? defaults.incRate,
      wdRate: config.wdRate,
      includeSS: config.includeSS,
      ssIncome: config.ssIncome,
      ssClaimAge: config.ssClaimAge,
      ssIncome2: config.ssIncome2 ?? defaults.ssIncome2,
      ssClaimAge2: config.ssClaimAge2 ?? defaults.ssClaimAge2,
      returnMode: 'fixed' as const,
      randomWalkSeries: 'trulyRandom' as const,
    };

    const result = runSingleSimulation(inputs, 42);

    // Calculate total contributions
    const yearsToRetirement = config.retirementAge - config.age1;
    const annualContrib = config.cTax1 + config.cPre1 + config.cPost1 + config.cMatch1 +
      (config.marital === 'married' ? (config.cTax2 ?? defaults.cTax2) + (config.cPre2 ?? defaults.cPre2) + (config.cPost2 ?? defaults.cPost2) + (config.cMatch2 ?? defaults.cMatch2) : 0);

    // Calculate final balance at retirement
    const retirementYearIndex = yearsToRetirement;
    const finReal = result.balancesReal[retirementYearIndex] || 0;

    return {
      finReal,
      eolReal: result.eolReal,
      survYrs: result.survYrs || 0,
      y1AfterTaxReal: result.y1AfterTaxReal,
      ruined: result.ruined,
      totalContributions: annualContrib * yearsToRetirement,
    };
  } catch (error) {
    console.error('[ScenarioComparison] Simulation failed:', error);
    return {
      finReal: 0,
      eolReal: 0,
      survYrs: 0,
      y1AfterTaxReal: 0,
      ruined: true,
      totalContributions: 0,
    };
  }
}

/**
 * Find the best scenario for a given metric
 */
function findBestScenario(
  scenarios: ComparisonScenario[],
  metric: MetricDefinition
): string | null {
  if (scenarios.length < 2) return null;

  const validScenarios = scenarios.filter(s => s.results);
  if (validScenarios.length === 0) return null;

  let bestScenario = validScenarios[0];
  let bestValue = metric.getValue
    ? metric.getValue(bestScenario)
    : (bestScenario.results?.[metric.key as keyof ScenarioResults] as number ?? 0);

  for (const scenario of validScenarios.slice(1)) {
    const value = metric.getValue
      ? metric.getValue(scenario)
      : (scenario.results?.[metric.key as keyof ScenarioResults] as number ?? 0);

    const isBetter = metric.higherIsBetter ? value > bestValue : value < bestValue;
    if (isBetter) {
      bestScenario = scenario;
      bestValue = value;
    }
  }

  return bestScenario.id;
}

/**
 * Calculate differences between two scenarios
 */
function calculateDiffs(base: PlanConfig, compare: PlanConfig): DiffResult[] {
  const diffs: DiffResult[] = [];

  for (const category of COMPARISON_FIELDS) {
    for (const field of category.fields) {
      const baseValue = base[field.key];
      const compareValue = compare[field.key];

      if (baseValue !== compareValue) {
        let changeDirection: 'up' | 'down' | 'same' = 'same';
        let changePercent: number | undefined;

        if (typeof baseValue === 'number' && typeof compareValue === 'number') {
          if (compareValue > baseValue) {
            changeDirection = 'up';
            changePercent = baseValue !== 0 ? ((compareValue - baseValue) / Math.abs(baseValue)) * 100 : undefined;
          } else if (compareValue < baseValue) {
            changeDirection = 'down';
            changePercent = baseValue !== 0 ? ((baseValue - compareValue) / Math.abs(baseValue)) * 100 : undefined;
          }
        } else if (baseValue !== compareValue) {
          changeDirection = 'up'; // Just indicate a change
        }

        diffs.push({
          field: field.key,
          label: field.label,
          baseValue: field.format(baseValue),
          compareValue: field.format(compareValue),
          changeDirection,
          changePercent,
        });
      }
    }
  }

  return diffs;
}

// ==================== Component ====================

interface ScenarioComparisonProps {
  /** Optional callback when a scenario is loaded */
  onScenarioLoad?: (config: PlanConfig) => void;
  /** Optional class name */
  className?: string;
}

export function ScenarioComparison({ onScenarioLoad, className }: ScenarioComparisonProps) {
  const { config, setConfig } = usePlanConfig();
  const D = createDefaultPlanConfig();

  // State
  const [comparisonScenarios, setComparisonScenarios] = useState<ComparisonScenario[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDescription, setNewScenarioDescription] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['metrics']));
  const [syncScroll, setSyncScroll] = useState(true);
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [baseScenarioId, setBaseScenarioId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Refs for sync scrolling
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load saved scenarios on mount
  useEffect(() => {
    const scenarios = getAllScenarios();
    setSavedScenarios(scenarios);
  }, []);

  // Calculate results for all comparison scenarios
  useEffect(() => {
    const calculateAllResults = async () => {
      setIsCalculating(true);

      const updatedScenarios = comparisonScenarios.map((scenario, index) => {
        const configToRun = scenario.isCurrent ? config : scenario.config;
        const results = runScenarioSimulation(configToRun);
        return {
          ...scenario,
          results,
          color: SCENARIO_COLORS[index % SCENARIO_COLORS.length].bg,
        };
      });

      setComparisonScenarios(updatedScenarios);
      setIsCalculating(false);
    };

    if (comparisonScenarios.length > 0) {
      calculateAllResults();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonScenarios.length]); // Only recalculate when scenarios are added/removed

  // Sync scroll handler
  const handleScroll = useCallback((index: number) => {
    if (!syncScroll) return;

    const sourceRef = scrollRefs.current[index];
    if (!sourceRef) return;

    const scrollTop = sourceRef.scrollTop;

    scrollRefs.current.forEach((ref, i) => {
      if (i !== index && ref) {
        ref.scrollTop = scrollTop;
      }
    });
  }, [syncScroll]);

  // Add current config as a scenario
  const addCurrentScenario = useCallback(() => {
    if (comparisonScenarios.length >= MAX_SCENARIOS) return;

    const currentScenario: ComparisonScenario = {
      id: `current_${Date.now()}`,
      name: 'Current Plan',
      config: { ...config },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: SCENARIO_COLORS[comparisonScenarios.length % SCENARIO_COLORS.length].bg,
      isCurrent: true,
    };

    setComparisonScenarios(prev => [...prev, currentScenario]);
  }, [config, comparisonScenarios.length]);

  // Add saved scenario to comparison
  const addSavedScenario = useCallback((scenario: SavedScenario) => {
    if (comparisonScenarios.length >= MAX_SCENARIOS) return;
    if (comparisonScenarios.some(s => s.id === scenario.id)) return;

    const colorIndex = comparisonScenarios.length % SCENARIO_COLORS.length;

    setComparisonScenarios(prev => [
      ...prev,
      {
        ...scenario,
        color: SCENARIO_COLORS[colorIndex].bg,
      },
    ]);
  }, [comparisonScenarios]);

  // Remove scenario from comparison
  const removeScenario = useCallback((scenarioId: string) => {
    setComparisonScenarios(prev => prev.filter(s => s.id !== scenarioId));
    if (baseScenarioId === scenarioId) {
      setBaseScenarioId(null);
    }
  }, [baseScenarioId]);

  // Save current config as a new scenario
  const handleSaveScenario = useCallback(() => {
    if (!newScenarioName.trim()) return;

    try {
      const saved = saveScenario(config, newScenarioName.trim(), newScenarioDescription.trim() || undefined);
      setSavedScenarios(getAllScenarios());
      setNewScenarioName('');
      setNewScenarioDescription('');
      setShowSaveDialog(false);

      // Add to comparison if space available
      if (comparisonScenarios.length < MAX_SCENARIOS) {
        addSavedScenario(saved);
      }
    } catch (error) {
      console.error('[ScenarioComparison] Failed to save scenario:', error);
    }
  }, [config, newScenarioName, newScenarioDescription, comparisonScenarios.length, addSavedScenario]);

  // Delete a saved scenario
  const handleDeleteScenario = useCallback((scenarioId: string) => {
    deleteScenario(scenarioId);
    setSavedScenarios(getAllScenarios());
    removeScenario(scenarioId);
  }, [removeScenario]);

  // Load scenario into main config
  const handleLoadScenario = useCallback((scenario: ComparisonScenario) => {
    setConfig(scenario.config);
    onScenarioLoad?.(scenario.config);
  }, [setConfig, onScenarioLoad]);

  // Recalculate results for a specific scenario
  const recalculateScenario = useCallback((scenarioId: string) => {
    setComparisonScenarios(prev =>
      prev.map(scenario => {
        if (scenario.id === scenarioId) {
          const configToRun = scenario.isCurrent ? config : scenario.config;
          const results = runScenarioSimulation(configToRun);
          return { ...scenario, results };
        }
        return scenario;
      })
    );
  }, [config]);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Memoized calculations
  const diffs = useMemo(() => {
    if (!baseScenarioId || comparisonScenarios.length < 2) return new Map<string, DiffResult[]>();

    const baseScenario = comparisonScenarios.find(s => s.id === baseScenarioId);
    if (!baseScenario) return new Map<string, DiffResult[]>();

    const diffsMap = new Map<string, DiffResult[]>();

    for (const scenario of comparisonScenarios) {
      if (scenario.id !== baseScenarioId) {
        diffsMap.set(scenario.id, calculateDiffs(baseScenario.config, scenario.config));
      }
    }

    return diffsMap;
  }, [baseScenarioId, comparisonScenarios]);

  const bestScenarios = useMemo(() => {
    const best: Record<string, string | null> = {};
    for (const metric of METRICS) {
      best[metric.key] = findBestScenario(comparisonScenarios, metric);
    }
    return best;
  }, [comparisonScenarios]);

  // Available scenarios that aren't already in comparison
  const availableScenarios = useMemo(() => {
    const comparisonIds = new Set(comparisonScenarios.map(s => s.id));
    return savedScenarios.filter(s => !comparisonIds.has(s.id));
  }, [savedScenarios, comparisonScenarios]);

  return (
    <Card className={cn("border-2 border-indigo-200 dark:border-indigo-800", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Scenario Comparison
          </div>
          <div className="flex items-center gap-2">
            {comparisonScenarios.length > 0 && (
              <Badge variant="secondary">
                {comparisonScenarios.length} / {MAX_SCENARIOS} scenarios
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          Compare up to {MAX_SCENARIOS} retirement scenarios side-by-side to answer &quot;what if&quot; questions
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Add scenarios */}
          <div className="flex items-center gap-2">
            <Button
              onClick={addCurrentScenario}
              disabled={comparisonScenarios.length >= MAX_SCENARIOS || comparisonScenarios.some(s => s.isCurrent)}
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Current Plan
            </Button>

            {availableScenarios.length > 0 && (
              <Select
                value=""
                onValueChange={(id) => {
                  const scenario = savedScenarios.find(s => s.id === id);
                  if (scenario) addSavedScenario(scenario);
                }}
                disabled={comparisonScenarios.length >= MAX_SCENARIOS}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Add saved scenario" />
                </SelectTrigger>
                <SelectContent>
                  {availableScenarios.map(scenario => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Current
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Current Plan as Scenario</DialogTitle>
                  <DialogDescription>
                    Save your current configuration to compare with other scenarios
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="scenario-name">Scenario Name *</Label>
                    <Input
                      id="scenario-name"
                      value={newScenarioName}
                      onChange={(e) => setNewScenarioName(e.target.value)}
                      placeholder="e.g., Aggressive Savings, Early Retirement"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scenario-desc">Description (Optional)</Label>
                    <Input
                      id="scenario-desc"
                      value={newScenarioDescription}
                      onChange={(e) => setNewScenarioDescription(e.target.value)}
                      placeholder="e.g., Max 401k contributions, retire at 55"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveScenario} disabled={!newScenarioName.trim()}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Scenario
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Separator orientation="vertical" className="h-8" />

          {/* Comparison options */}
          <div className="flex items-center gap-4 text-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="sync-scroll"
                      checked={syncScroll}
                      onCheckedChange={setSyncScroll}
                    />
                    <Label htmlFor="sync-scroll" className="cursor-pointer">
                      {syncScroll ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sync scroll position across all scenarios</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {comparisonScenarios.length >= 2 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="diff-only"
                        checked={showDiffOnly}
                        onCheckedChange={setShowDiffOnly}
                      />
                      <Label htmlFor="diff-only" className="cursor-pointer text-xs">
                        Diff only
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Show only fields that differ between scenarios</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Base scenario selector */}
          {comparisonScenarios.length >= 2 && (
            <>
              <Separator orientation="vertical" className="h-8" />
              <div className="flex items-center gap-2 text-sm">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <Label className="text-muted-foreground">Compare to:</Label>
                <Select value={baseScenarioId || ''} onValueChange={setBaseScenarioId}>
                  <SelectTrigger className="w-[150px] h-8">
                    <SelectValue placeholder="Select base" />
                  </SelectTrigger>
                  <SelectContent>
                    {comparisonScenarios.map(scenario => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Empty state */}
        {comparisonScenarios.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Scenarios to Compare</h3>
            <p className="text-sm max-w-md mx-auto mb-6">
              Add your current plan or saved scenarios to compare different retirement strategies side-by-side.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={addCurrentScenario} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Current Plan
              </Button>
              {savedScenarios.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => addSavedScenario(savedScenarios[0])}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Saved Scenario
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Scenario Cards Grid */}
        {comparisonScenarios.length > 0 && (
          <div className="space-y-6">
            {/* Scenario Headers */}
            <div className={cn(
              "grid gap-4",
              comparisonScenarios.length === 1 && "grid-cols-1",
              comparisonScenarios.length === 2 && "grid-cols-2",
              comparisonScenarios.length === 3 && "grid-cols-3",
              comparisonScenarios.length === 4 && "grid-cols-4",
            )}>
              {comparisonScenarios.map((scenario, index) => {
                const colors = SCENARIO_COLORS[index % SCENARIO_COLORS.length];

                return (
                  <Card
                    key={scenario.id}
                    className={cn(
                      "relative border-2 transition-all",
                      colors.border,
                      colors.bg,
                    )}
                  >
                    <CardContent className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{scenario.name}</h3>
                            {scenario.isCurrent && (
                              <Badge variant="outline" className="text-xs">
                                Live
                              </Badge>
                            )}
                            {baseScenarioId === scenario.id && (
                              <Badge className={colors.badge}>
                                Base
                              </Badge>
                            )}
                          </div>
                          {scenario.description && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {scenario.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => recalculateScenario(scenario.id)}
                                >
                                  <RefreshCw className={cn(
                                    "h-3.5 w-3.5",
                                    isCalculating && "animate-spin"
                                  )} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Recalculate</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {!scenario.isCurrent && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleLoadScenario(scenario)}
                                  >
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Load this scenario</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeScenario(scenario.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      {scenario.results && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="p-2 bg-white/50 dark:bg-gray-900/50 rounded">
                            <div className="text-xs text-muted-foreground">Retirement Nest Egg</div>
                            <div className="font-semibold">{fmt(scenario.results.finReal)}</div>
                          </div>
                          <div className="p-2 bg-white/50 dark:bg-gray-900/50 rounded">
                            <div className="text-xs text-muted-foreground">End-of-Life Wealth</div>
                            <div className={cn(
                              "font-semibold",
                              scenario.results.eolReal < 0 && "text-red-600 dark:text-red-400"
                            )}>
                              {fmt(scenario.results.eolReal)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Portfolio Warning */}
                      {scenario.results?.ruined && (
                        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Portfolio depletes after {scenario.results.survYrs} years
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Metrics Comparison Section */}
            <div className="space-y-2">
              <button
                onClick={() => toggleSection('metrics')}
                className="flex items-center gap-2 w-full text-left hover:text-primary transition-colors"
              >
                {expandedSections.has('metrics') ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <h3 className="font-semibold">Key Metrics Comparison</h3>
                {comparisonScenarios.length >= 2 && (
                  <Badge variant="outline" className="ml-2 gap-1">
                    <Star className="h-3 w-3" />
                    Best highlighted
                  </Badge>
                )}
              </button>

              {expandedSections.has('metrics') && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground w-48">
                          Metric
                        </th>
                        {comparisonScenarios.map((scenario, index) => (
                          <th
                            key={scenario.id}
                            className={cn(
                              "text-center py-2 px-3 font-medium",
                              SCENARIO_COLORS[index % SCENARIO_COLORS.length].text
                            )}
                          >
                            {scenario.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {METRICS.map(metric => {
                        const Icon = metric.icon;
                        const bestId = bestScenarios[metric.key];

                        return (
                          <tr key={metric.key} className="border-b last:border-0">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger className="flex items-center gap-1">
                                      <span>{metric.label}</span>
                                      <Info className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{metric.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                            {comparisonScenarios.map((scenario) => {
                              const value = scenario.results?.[metric.key as keyof ScenarioResults] as number ?? 0;
                              const isBest = bestId === scenario.id && comparisonScenarios.length >= 2;

                              // Compare to base if set
                              let diffPercent: number | undefined;
                              if (baseScenarioId && baseScenarioId !== scenario.id) {
                                const baseScenario = comparisonScenarios.find(s => s.id === baseScenarioId);
                                const baseValue = baseScenario?.results?.[metric.key as keyof ScenarioResults] as number ?? 0;
                                if (baseValue !== 0) {
                                  diffPercent = ((value - baseValue) / Math.abs(baseValue)) * 100;
                                }
                              }

                              return (
                                <td
                                  key={scenario.id}
                                  className={cn(
                                    "py-3 px-3 text-center",
                                    isBest && "bg-yellow-50 dark:bg-yellow-900/20"
                                  )}
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <div className={cn(
                                      "font-semibold flex items-center gap-1",
                                      isBest && "text-yellow-700 dark:text-yellow-300"
                                    )}>
                                      {isBest && <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />}
                                      {metric.format(value)}
                                    </div>
                                    {diffPercent !== undefined && Math.abs(diffPercent) > 0.1 && (
                                      <div className={cn(
                                        "text-xs flex items-center gap-0.5",
                                        diffPercent > 0 === metric.higherIsBetter
                                          ? "text-green-600 dark:text-green-400"
                                          : "text-red-600 dark:text-red-400"
                                      )}>
                                        {diffPercent > 0 ? (
                                          <TrendingUp className="h-3 w-3" />
                                        ) : (
                                          <TrendingDown className="h-3 w-3" />
                                        )}
                                        {diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Configuration Details Section */}
            <div className="space-y-2">
              <button
                onClick={() => toggleSection('details')}
                className="flex items-center gap-2 w-full text-left hover:text-primary transition-colors"
              >
                {expandedSections.has('details') ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <h3 className="font-semibold">Configuration Details</h3>
              </button>

              {expandedSections.has('details') && (
                <div className={cn(
                  "grid gap-4",
                  comparisonScenarios.length === 1 && "grid-cols-1",
                  comparisonScenarios.length === 2 && "grid-cols-2",
                  comparisonScenarios.length === 3 && "grid-cols-3",
                  comparisonScenarios.length === 4 && "grid-cols-4",
                )}>
                  {comparisonScenarios.map((scenario, index) => {
                    const colors = SCENARIO_COLORS[index % SCENARIO_COLORS.length];
                    const scenarioDiffs = diffs.get(scenario.id);
                    const diffFields = new Set(scenarioDiffs?.map(d => d.field) || []);

                    return (
                      <Card key={scenario.id} className={cn("border", colors.border)}>
                        <ScrollArea
                          className="h-[400px]"
                          ref={(el) => { scrollRefs.current[index] = el as unknown as HTMLDivElement; }}
                          onScroll={() => handleScroll(index)}
                        >
                          <div className="p-4 space-y-4">
                            {COMPARISON_FIELDS.map(category => {
                              // Filter fields if showing diff only
                              const visibleFields = showDiffOnly && baseScenarioId && baseScenarioId !== scenario.id
                                ? category.fields.filter(f => diffFields.has(f.key))
                                : category.fields;

                              if (visibleFields.length === 0) return null;

                              return (
                                <div key={category.category}>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    {category.category}
                                  </h4>
                                  <div className="space-y-1">
                                    {visibleFields.map(field => {
                                      const configToUse = scenario.isCurrent ? config : scenario.config;
                                      const value = configToUse[field.key];
                                      const isDiff = diffFields.has(field.key);
                                      const diffInfo = scenarioDiffs?.find(d => d.field === field.key);

                                      return (
                                        <div
                                          key={field.key}
                                          className={cn(
                                            "flex justify-between items-center py-1 px-2 rounded text-sm",
                                            isDiff && "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                                          )}
                                        >
                                          <span className="text-muted-foreground">{field.label}</span>
                                          <span className={cn(
                                            "font-medium flex items-center gap-1",
                                            isDiff && "text-yellow-700 dark:text-yellow-300"
                                          )}>
                                            {field.format(value)}
                                            {isDiff && diffInfo && (
                                              <span className={cn(
                                                "text-xs",
                                                diffInfo.changeDirection === 'up' ? "text-green-600" : "text-red-600"
                                              )}>
                                                {diffInfo.changeDirection === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recommendation Section */}
            {comparisonScenarios.length >= 2 && (
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                      Comparison Insights
                    </h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                      {(() => {
                        const bestEolScenario = comparisonScenarios.find(s => s.id === bestScenarios['eolReal']);
                        const worstEolScenario = comparisonScenarios.reduce((worst, current) => {
                          if (!current.results || !worst.results) return worst;
                          return current.results.eolReal < worst.results.eolReal ? current : worst;
                        }, comparisonScenarios[0]);

                        if (bestEolScenario && bestEolScenario.results && worstEolScenario && worstEolScenario.results) {
                          const difference = bestEolScenario.results.eolReal - worstEolScenario.results.eolReal;
                          return (
                            <>
                              <strong>{bestEolScenario.name}</strong> produces the best end-of-life wealth,
                              outperforming <strong>{worstEolScenario.name}</strong> by <strong>{fmt(difference)}</strong>.
                              {bestEolScenario.id !== bestScenarios['y1AfterTaxReal'] && (
                                <> However, consider that a higher withdrawal rate may provide better retirement income.</>
                              )}
                            </>
                          );
                        }
                        return "Add more scenarios to see comparison insights.";
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saved Scenarios Management */}
        {savedScenarios.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Saved Scenarios ({savedScenarios.length})
                </h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {savedScenarios.map(scenario => (
                  <div
                    key={scenario.id}
                    className={cn(
                      "p-3 border rounded-lg flex items-center justify-between gap-2",
                      comparisonScenarios.some(s => s.id === scenario.id)
                        ? "bg-muted/50 border-primary/30"
                        : "bg-card hover:bg-muted/30"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{scenario.name}</div>
                      {scenario.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {scenario.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!comparisonScenarios.some(s => s.id === scenario.id) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => addSavedScenario(scenario)}
                          disabled={comparisonScenarios.length >= MAX_SCENARIOS}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteScenario(scenario.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground text-center border-t pt-4">
          <Info className="h-3.5 w-3.5 inline mr-1" />
          Compare different retirement strategies by adjusting variables like contribution amounts,
          retirement age, or investment returns. Save scenarios to track different planning options.
        </div>
      </CardContent>
    </Card>
  );
}

export default ScenarioComparison;
