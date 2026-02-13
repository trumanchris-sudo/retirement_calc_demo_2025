"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Line,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import { cn, fmt, fmtFull } from "@/lib/utils";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  History,
  Target,
  Trophy,
  Sparkles,
  AlertCircle,
  Calendar,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  Bell,
  Eye,
  EyeOff,
  PartyPopper,
  Rocket,
  Star,
  Crown,
  Gem,
  HelpCircle,
  Info,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Asset {
  id: string;
  name: string;
  value: number;
  category: AssetCategory;
  assetClass: AssetClass;
}

interface Liability {
  id: string;
  name: string;
  value: number;
  category: LiabilityCategory;
}

type AssetCategory =
  | "retirement_401k"
  | "retirement_ira"
  | "retirement_roth"
  | "taxable_brokerage"
  | "taxable_savings"
  | "real_estate"
  | "business"
  | "other";

type AssetClass = "stocks" | "bonds" | "real_estate" | "cash" | "other";

type LiabilityCategory =
  | "mortgage"
  | "student_loans"
  | "auto_loans"
  | "credit_cards"
  | "other";

interface NetWorthSnapshot {
  id: string;
  date: string;
  assets: Asset[];
  liabilities: Liability[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

interface NetWorthGoal {
  targetNetWorth: number;
  targetDate: string;
  retirementAge: number;
  lifeExpectancy: number;
  expectedReturn: number;
  currentAge: number;
}

interface HiddenAssetOptions {
  humanCapital: boolean;
  socialSecurity: boolean;
  pension: boolean;
}

interface Milestone {
  amount: number;
  label: string;
  icon: React.ReactNode;
  celebrationMessage: string;
  color: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = "netWorthTracker";
const REMINDER_KEY = "netWorthReminderDismissed";

const ASSET_CATEGORIES: Record<AssetCategory, { label: string; color: string }> = {
  retirement_401k: { label: "401(k)", color: "#3b82f6" },
  retirement_ira: { label: "Traditional IRA", color: "#6366f1" },
  retirement_roth: { label: "Roth IRA", color: "#8b5cf6" },
  taxable_brokerage: { label: "Brokerage", color: "#10b981" },
  taxable_savings: { label: "Savings", color: "#14b8a6" },
  real_estate: { label: "Real Estate", color: "#f59e0b" },
  business: { label: "Business", color: "#ef4444" },
  other: { label: "Other", color: "#6b7280" },
};

const ASSET_CLASSES: Record<AssetClass, { label: string; color: string }> = {
  stocks: { label: "Stocks", color: "#3b82f6" },
  bonds: { label: "Bonds", color: "#10b981" },
  real_estate: { label: "Real Estate", color: "#f59e0b" },
  cash: { label: "Cash", color: "#6366f1" },
  other: { label: "Other", color: "#6b7280" },
};

const LIABILITY_CATEGORIES: Record<LiabilityCategory, { label: string; color: string }> = {
  mortgage: { label: "Mortgage", color: "#ef4444" },
  student_loans: { label: "Student Loans", color: "#f97316" },
  auto_loans: { label: "Auto Loans", color: "#eab308" },
  credit_cards: { label: "Credit Cards", color: "#dc2626" },
  other: { label: "Other", color: "#6b7280" },
};

const MILESTONES: Milestone[] = [
  {
    amount: 100000,
    label: "First $100K",
    icon: <Star className="h-5 w-5" />,
    celebrationMessage: "The hardest milestone! Compound growth accelerates from here.",
    color: "#10b981",
  },
  {
    amount: 250000,
    label: "Quarter Millionaire",
    icon: <Sparkles className="h-5 w-5" />,
    celebrationMessage: "You're building serious wealth!",
    color: "#3b82f6",
  },
  {
    amount: 500000,
    label: "Half Millionaire",
    icon: <Rocket className="h-5 w-5" />,
    celebrationMessage: "Halfway to seven figures!",
    color: "#8b5cf6",
  },
  {
    amount: 1000000,
    label: "Millionaire",
    icon: <Crown className="h-5 w-5" />,
    celebrationMessage: "Welcome to the two-comma club!",
    color: "#f59e0b",
  },
  {
    amount: 2000000,
    label: "Double Millionaire",
    icon: <Gem className="h-5 w-5" />,
    celebrationMessage: "Financial independence is likely within reach!",
    color: "#ec4899",
  },
  {
    amount: 5000000,
    label: "Deca-Millionaire",
    icon: <Trophy className="h-5 w-5" />,
    celebrationMessage: "Top 1% wealth achieved!",
    color: "#6366f1",
  },
];

const DEFAULT_ASSETS: Asset[] = [
  { id: "1", name: "401(k)", value: 0, category: "retirement_401k", assetClass: "stocks" },
  { id: "2", name: "Roth IRA", value: 0, category: "retirement_roth", assetClass: "stocks" },
  { id: "3", name: "Brokerage Account", value: 0, category: "taxable_brokerage", assetClass: "stocks" },
  { id: "4", name: "Emergency Fund", value: 0, category: "taxable_savings", assetClass: "cash" },
  { id: "5", name: "Home Equity", value: 0, category: "real_estate", assetClass: "real_estate" },
];

const DEFAULT_LIABILITIES: Liability[] = [
  { id: "1", name: "Mortgage", value: 0, category: "mortgage" },
  { id: "2", name: "Student Loans", value: 0, category: "student_loans" },
  { id: "3", name: "Auto Loan", value: 0, category: "auto_loans" },
  { id: "4", name: "Credit Cards", value: 0, category: "credit_cards" },
];

const DEFAULT_GOALS: NetWorthGoal = {
  targetNetWorth: 2000000,
  targetDate: "2045-01-01",
  retirementAge: 65,
  lifeExpectancy: 90,
  expectedReturn: 7,
  currentAge: 35,
};

const DEFAULT_HIDDEN_OPTIONS: HiddenAssetOptions = {
  humanCapital: false,
  socialSecurity: false,
  pension: false,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function calculateHumanCapital(
  currentAge: number,
  retirementAge: number,
  annualIncome: number,
  discountRate: number = 0.05
): number {
  const yearsRemaining = Math.max(0, retirementAge - currentAge);
  let total = 0;
  for (let i = 0; i < yearsRemaining; i++) {
    total += annualIncome / Math.pow(1 + discountRate, i + 1);
  }
  return total;
}

function calculateSocialSecurityPV(
  monthlyBenefit: number,
  startAge: number = 67,
  lifeExpectancy: number = 90,
  discountRate: number = 0.03
): number {
  const yearsOfBenefits = Math.max(0, lifeExpectancy - startAge);
  const annualBenefit = monthlyBenefit * 12;
  let total = 0;
  for (let i = 0; i < yearsOfBenefits; i++) {
    total += annualBenefit / Math.pow(1 + discountRate, startAge - 35 + i);
  }
  return total;
}

function projectNetWorth(
  currentNetWorth: number,
  annualContribution: number,
  expectedReturn: number,
  years: number
): number {
  let projected = currentNetWorth;
  for (let i = 0; i < years; i++) {
    projected = projected * (1 + expectedReturn / 100) + annualContribution;
  }
  return projected;
}

function getMonthsSinceLastUpdate(lastDate: string): number {
  const last = new Date(lastDate);
  const now = new Date();
  return (
    (now.getFullYear() - last.getFullYear()) * 12 +
    (now.getMonth() - last.getMonth())
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface AssetInputRowProps {
  asset: Asset;
  onUpdate: (id: string, updates: Partial<Asset>) => void;
  onRemove: (id: string) => void;
}

const AssetInputRow: React.FC<AssetInputRowProps> = ({ asset, onUpdate, onRemove }) => {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <Input
        value={asset.name}
        onChange={(e) => onUpdate(asset.id, { name: e.target.value })}
        className="flex-1 h-9"
        placeholder="Asset name"
      />
      <div className="relative w-32">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
        <Input
          type="number"
          value={asset.value || ""}
          onChange={(e) => onUpdate(asset.id, { value: parseFloat(e.target.value) || 0 })}
          className="h-9 pl-7 text-right"
          placeholder="0"
        />
      </div>
      <select
        value={asset.category}
        onChange={(e) => onUpdate(asset.id, { category: e.target.value as AssetCategory })}
        className="h-9 px-2 rounded-md border border-input bg-background text-sm"
      >
        {Object.entries(ASSET_CATEGORIES).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <select
        value={asset.assetClass}
        onChange={(e) => onUpdate(asset.id, { assetClass: e.target.value as AssetClass })}
        className="h-9 px-2 rounded-md border border-input bg-background text-sm"
      >
        {Object.entries(ASSET_CLASSES).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(asset.id)}
        className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface LiabilityInputRowProps {
  liability: Liability;
  onUpdate: (id: string, updates: Partial<Liability>) => void;
  onRemove: (id: string) => void;
}

const LiabilityInputRow: React.FC<LiabilityInputRowProps> = ({
  liability,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <Input
        value={liability.name}
        onChange={(e) => onUpdate(liability.id, { name: e.target.value })}
        className="flex-1 h-9"
        placeholder="Liability name"
      />
      <div className="relative w-32">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
        <Input
          type="number"
          value={liability.value || ""}
          onChange={(e) => onUpdate(liability.id, { value: parseFloat(e.target.value) || 0 })}
          className="h-9 pl-7 text-right"
          placeholder="0"
        />
      </div>
      <select
        value={liability.category}
        onChange={(e) => onUpdate(liability.id, { category: e.target.value as LiabilityCategory })}
        className="h-9 px-2 rounded-md border border-input bg-background text-sm"
      >
        {Object.entries(LIABILITY_CATEGORIES).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(liability.id)}
        className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface MilestoneCelebrationProps {
  milestone: Milestone;
  netWorth: number;
  onDismiss: () => void;
}

const MilestoneCelebration: React.FC<MilestoneCelebrationProps> = ({
  milestone,
  netWorth,
  onDismiss,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onDismiss}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl animate-in zoom-in-95 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-white animate-bounce"
          style={{ backgroundColor: milestone.color }}
        >
          {milestone.icon}
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <PartyPopper className="h-6 w-6 text-yellow-500" />
          <h2 className="text-2xl font-bold">Congratulations!</h2>
          <PartyPopper className="h-6 w-6 text-yellow-500" />
        </div>
        <p className="text-3xl font-bold mb-2" style={{ color: milestone.color }}>
          {milestone.label}
        </p>
        <p className="text-muted-foreground mb-4">{milestone.celebrationMessage}</p>
        <div className="text-4xl font-bold mb-6">{fmtFull(netWorth)}</div>
        <Button onClick={onDismiss} className="w-full">
          Keep Building Wealth
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface NetWorthTrackerProps {
  initialAge?: number;
  initialIncome?: number;
  className?: string;
}

export const NetWorthTracker: React.FC<NetWorthTrackerProps> = ({
  initialAge = 35,
  initialIncome = 100000,
  className,
}) => {
  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const [assets, setAssets] = useState<Asset[]>(DEFAULT_ASSETS);
  const [liabilities, setLiabilities] = useState<Liability[]>(DEFAULT_LIABILITIES);
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [goals, setGoals] = useState<NetWorthGoal>({
    ...DEFAULT_GOALS,
    currentAge: initialAge,
  });
  const [hiddenOptions, setHiddenOptions] = useState<HiddenAssetOptions>(DEFAULT_HIDDEN_OPTIONS);
  const [annualIncome, setAnnualIncome] = useState(initialIncome);
  const [monthlySocialSecurity, setMonthlySocialSecurity] = useState(2500);
  const [annualContribution, setAnnualContribution] = useState(30000);

  const [showReminder, setShowReminder] = useState(false);
  const [celebratingMilestone, setCelebratingMilestone] = useState<Milestone | null>(null);
  const [celebratedMilestones, setCelebratedMilestones] = useState<number[]>([]);
  const [showValues, setShowValues] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    assets: true,
    liabilities: true,
    hidden: false,
  });
  const [activeTab, setActiveTab] = useState("snapshot");
  const [isLoaded, setIsLoaded] = useState(false);

  // -------------------------------------------------------------------------
  // CALCULATIONS
  // -------------------------------------------------------------------------
  const totalAssets = useMemo(() => {
    return assets.reduce((sum, a) => sum + (a.value || 0), 0);
  }, [assets]);

  const totalLiabilities = useMemo(() => {
    return liabilities.reduce((sum, l) => sum + (l.value || 0), 0);
  }, [liabilities]);

  const netWorth = useMemo(() => {
    return totalAssets - totalLiabilities;
  }, [totalAssets, totalLiabilities]);

  const hiddenAssetValues = useMemo(() => {
    const humanCapital = hiddenOptions.humanCapital
      ? calculateHumanCapital(goals.currentAge, goals.retirementAge, annualIncome)
      : 0;
    const socialSecurity = hiddenOptions.socialSecurity
      ? calculateSocialSecurityPV(monthlySocialSecurity, 67, goals.lifeExpectancy)
      : 0;
    return { humanCapital, socialSecurity, total: humanCapital + socialSecurity };
  }, [hiddenOptions, goals, annualIncome, monthlySocialSecurity]);

  const extendedNetWorth = netWorth + hiddenAssetValues.total;

  const assetsByCategory = useMemo(() => {
    const grouped: Record<string, number> = {};
    assets.forEach((a) => {
      const key = a.category;
      grouped[key] = (grouped[key] || 0) + (a.value || 0);
    });
    return Object.entries(grouped)
      .filter(([, value]) => value > 0)
      .map(([category, value]) => ({
        name: ASSET_CATEGORIES[category as AssetCategory]?.label || category,
        value,
        color: ASSET_CATEGORIES[category as AssetCategory]?.color || "#6b7280",
      }));
  }, [assets]);

  const assetsByClass = useMemo(() => {
    const grouped: Record<string, number> = {};
    assets.forEach((a) => {
      const key = a.assetClass;
      grouped[key] = (grouped[key] || 0) + (a.value || 0);
    });
    return Object.entries(grouped)
      .filter(([, value]) => value > 0)
      .map(([assetClass, value]) => ({
        name: ASSET_CLASSES[assetClass as AssetClass]?.label || assetClass,
        value,
        color: ASSET_CLASSES[assetClass as AssetClass]?.color || "#6b7280",
      }));
  }, [assets]);

  const historicalData = useMemo(() => {
    return snapshots.map((s) => ({
      date: formatDate(s.date),
      netWorth: s.netWorth,
      assets: s.totalAssets,
      liabilities: s.totalLiabilities,
    }));
  }, [snapshots]);

  const projectedNetWorth = useMemo(() => {
    const yearsToRetirement = Math.max(0, goals.retirementAge - goals.currentAge);
    const yearsToLifeExpectancy = Math.max(0, goals.lifeExpectancy - goals.currentAge);

    return {
      atRetirement: projectNetWorth(
        netWorth,
        annualContribution,
        goals.expectedReturn,
        yearsToRetirement
      ),
      atLifeExpectancy: projectNetWorth(
        netWorth,
        annualContribution,
        goals.expectedReturn,
        yearsToLifeExpectancy
      ),
      inheritance: projectNetWorth(
        netWorth,
        annualContribution,
        goals.expectedReturn,
        yearsToLifeExpectancy
      ) * 0.7, // Assume 30% consumed
    };
  }, [netWorth, annualContribution, goals]);

  const projectionData = useMemo(() => {
    const data = [];
    const yearsToProject = Math.max(goals.lifeExpectancy - goals.currentAge, 30);

    for (let year = 0; year <= yearsToProject; year++) {
      const age = goals.currentAge + year;
      const isRetired = age >= goals.retirementAge;
      const contribution = isRetired ? -50000 : annualContribution; // Withdraw in retirement

      data.push({
        year,
        age,
        projected: projectNetWorth(netWorth, contribution, goals.expectedReturn, year),
        goal: projectNetWorth(
          netWorth,
          (goals.targetNetWorth - netWorth) /
            Math.max(1, new Date(goals.targetDate).getFullYear() - new Date().getFullYear()),
          goals.expectedReturn,
          year
        ),
      });
    }
    return data;
  }, [netWorth, annualContribution, goals]);

  const goalProgress = useMemo(() => {
    const progress = Math.min(100, (netWorth / goals.targetNetWorth) * 100);
    const yearsToGoal = Math.max(
      0,
      new Date(goals.targetDate).getFullYear() - new Date().getFullYear()
    );
    const requiredReturn =
      yearsToGoal > 0
        ? (Math.pow(goals.targetNetWorth / Math.max(1, netWorth), 1 / yearsToGoal) - 1) * 100
        : 0;
    const isOnTrack = requiredReturn <= goals.expectedReturn;

    return { progress, yearsToGoal, requiredReturn, isOnTrack };
  }, [netWorth, goals]);

  const nextMilestone = useMemo(() => {
    return MILESTONES.find((m) => m.amount > netWorth);
  }, [netWorth]);

  const achievedMilestones = useMemo(() => {
    return MILESTONES.filter((m) => m.amount <= netWorth);
  }, [netWorth]);

  // -------------------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------------------

  // Load data from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.assets) setAssets(data.assets);
        if (data.liabilities) setLiabilities(data.liabilities);
        if (data.snapshots) {
          setSnapshots(data.snapshots);
          // Check for reminder using loaded snapshots
          const lastDismissed = localStorage.getItem(REMINDER_KEY);
          const lastSnapshot = data.snapshots[data.snapshots.length - 1];
          if (lastSnapshot) {
            const monthsSince = getMonthsSinceLastUpdate(lastSnapshot.date);
            if (monthsSince >= 1) {
              const dismissedDate = lastDismissed ? new Date(lastDismissed) : null;
              if (!dismissedDate || getMonthsSinceLastUpdate(lastDismissed!) >= 1) {
                setShowReminder(true);
              }
            }
          }
        }
        if (data.goals) setGoals(data.goals);
        if (data.hiddenOptions) setHiddenOptions(data.hiddenOptions);
        if (data.celebratedMilestones) setCelebratedMilestones(data.celebratedMilestones);
        if (data.annualIncome) setAnnualIncome(data.annualIncome);
        if (data.monthlySocialSecurity) setMonthlySocialSecurity(data.monthlySocialSecurity);
        if (data.annualContribution) setAnnualContribution(data.annualContribution);
      }
    } catch (e) {
      console.error("Failed to load net worth data:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          assets,
          liabilities,
          snapshots,
          goals,
          hiddenOptions,
          celebratedMilestones,
          annualIncome,
          monthlySocialSecurity,
          annualContribution,
        })
      );
    } catch (e) {
      console.error("Failed to save net worth data:", e);
    }
  }, [
    assets,
    liabilities,
    snapshots,
    goals,
    hiddenOptions,
    celebratedMilestones,
    annualIncome,
    monthlySocialSecurity,
    annualContribution,
    isLoaded,
  ]);

  // Check for new milestones
  useEffect(() => {
    if (!isLoaded) return;

    const newMilestone = MILESTONES.find(
      (m) => m.amount <= netWorth && !celebratedMilestones.includes(m.amount)
    );

    if (newMilestone) {
      setCelebratingMilestone(newMilestone);
      setCelebratedMilestones((prev) => [...prev, newMilestone.amount]);
    }
  }, [netWorth, celebratedMilestones, isLoaded]);

  // -------------------------------------------------------------------------
  // HANDLERS
  // -------------------------------------------------------------------------

  const handleUpdateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const handleRemoveAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleAddAsset = useCallback(() => {
    setAssets((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "New Asset",
        value: 0,
        category: "other",
        assetClass: "other",
      },
    ]);
  }, []);

  const handleUpdateLiability = useCallback((id: string, updates: Partial<Liability>) => {
    setLiabilities((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
    );
  }, []);

  const handleRemoveLiability = useCallback((id: string) => {
    setLiabilities((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleAddLiability = useCallback(() => {
    setLiabilities((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "New Liability",
        value: 0,
        category: "other",
      },
    ]);
  }, []);

  const handleSaveSnapshot = useCallback(() => {
    const snapshot: NetWorthSnapshot = {
      id: generateId(),
      date: new Date().toISOString(),
      assets: [...assets],
      liabilities: [...liabilities],
      totalAssets,
      totalLiabilities,
      netWorth,
    };
    setSnapshots((prev) => [...prev, snapshot]);
    setShowReminder(false);
    localStorage.setItem(REMINDER_KEY, new Date().toISOString());
  }, [assets, liabilities, totalAssets, totalLiabilities, netWorth]);

  const handleDismissReminder = useCallback(() => {
    setShowReminder(false);
    localStorage.setItem(REMINDER_KEY, new Date().toISOString());
  }, []);

  const handleExportData = useCallback(() => {
    const data = {
      assets,
      liabilities,
      snapshots,
      goals,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `net-worth-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [assets, liabilities, snapshots, goals]);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  const formatValue = (value: number) => (showValues ? fmtFull(value) : "****");

  return (
    <div className={cn("space-y-6", className)}>
      {/* Milestone Celebration Modal */}
      {celebratingMilestone && (
        <MilestoneCelebration
          milestone={celebratingMilestone}
          netWorth={netWorth}
          onDismiss={() => setCelebratingMilestone(null)}
        />
      )}

      {/* Monthly Reminder Banner */}
      {showReminder && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-top duration-500">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 animate-bounce" />
            <div>
              <p className="font-semibold">Time for your monthly check-in!</p>
              <p className="text-sm opacity-90">
                Update your numbers to track your progress.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDismissReminder}
              className="text-gray-800"
            >
              Remind Later
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveSnapshot}
              className="text-gray-800 bg-white hover:bg-gray-100"
            >
              Update Now
            </Button>
          </div>
        </div>
      )}

      {/* Header with Net Worth */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-3">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Net Worth Tracker</h2>
                <p className="text-sm opacity-90">Your complete financial picture</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowValues(!showValues)}
                className="text-white hover:bg-white/20"
              >
                {showValues ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExportData}
                className="text-white hover:bg-white/20"
              >
                <Download className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="text-center py-4">
            <div className="text-sm opacity-75 mb-1">YOUR NET WORTH</div>
            <div className="text-5xl md:text-6xl font-bold tracking-tight">
              {showValues ? (
                <AnimatedNumber
                  value={netWorth}
                  format={(n) => fmtFull(Math.round(n))}
                  duration={1500}
                />
              ) : (
                "******"
              )}
            </div>
            {netWorth > 0 && snapshots.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-2">
                {netWorth >= snapshots[snapshots.length - 1]?.netWorth ? (
                  <TrendingUp className="h-5 w-5 text-green-300" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-300" />
                )}
                <span className="text-sm">
                  {fmt(netWorth - (snapshots[snapshots.length - 1]?.netWorth || 0))} since last update
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-sm opacity-75">Total Assets</div>
              <div className="text-2xl font-bold">{formatValue(totalAssets)}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-sm opacity-75">Total Liabilities</div>
              <div className="text-2xl font-bold">{formatValue(totalLiabilities)}</div>
            </div>
          </div>
        </div>

        {/* Next Milestone Progress */}
        {nextMilestone && (
          <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="p-1.5 rounded-full text-white"
                  style={{ backgroundColor: nextMilestone.color }}
                >
                  {nextMilestone.icon}
                </div>
                <span className="font-medium">Next: {nextMilestone.label}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {fmt(nextMilestone.amount - netWorth)} to go
              </span>
            </div>
            <Progress
              value={(netWorth / nextMilestone.amount) * 100}
              className="h-3"
            />
          </div>
        )}
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="snapshot" className="text-xs sm:text-sm">
            <Wallet className="h-4 w-4 mr-1 hidden sm:inline" />
            Snapshot
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs sm:text-sm">
            <History className="h-4 w-4 mr-1 hidden sm:inline" />
            History
          </TabsTrigger>
          <TabsTrigger value="allocation" className="text-xs sm:text-sm">
            <PieChartIcon className="h-4 w-4 mr-1 hidden sm:inline" />
            Allocation
          </TabsTrigger>
          <TabsTrigger value="goals" className="text-xs sm:text-sm">
            <Target className="h-4 w-4 mr-1 hidden sm:inline" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="projections" className="text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4 mr-1 hidden sm:inline" />
            Projections
          </TabsTrigger>
        </TabsList>

        {/* SNAPSHOT TAB */}
        <TabsContent value="snapshot" className="space-y-4 mt-4">
          {/* Assets Section */}
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("assets")}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Assets
                  <Badge variant="secondary">{formatValue(totalAssets)}</Badge>
                </CardTitle>
                {expandedSections.assets ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.assets && (
              <CardContent className="space-y-2">
                {assets.map((asset) => (
                  <AssetInputRow
                    key={asset.id}
                    asset={asset}
                    onUpdate={handleUpdateAsset}
                    onRemove={handleRemoveAsset}
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAsset}
                  className="w-full mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Asset
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Liabilities Section */}
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("liabilities")}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Liabilities
                  <Badge variant="destructive">{formatValue(totalLiabilities)}</Badge>
                </CardTitle>
                {expandedSections.liabilities ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </CardHeader>
            {expandedSections.liabilities && (
              <CardContent className="space-y-2">
                {liabilities.map((liability) => (
                  <LiabilityInputRow
                    key={liability.id}
                    liability={liability}
                    onUpdate={handleUpdateLiability}
                    onRemove={handleRemoveLiability}
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddLiability}
                  className="w-full mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Liability
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Save Snapshot Button */}
          <Button onClick={handleSaveSnapshot} className="w-full" size="lg">
            <RefreshCw className="h-5 w-5 mr-2" />
            Save Snapshot ({new Date().toLocaleDateString()})
          </Button>

          {/* Milestones Achieved */}
          {achievedMilestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Milestones Achieved
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {achievedMilestones.map((milestone) => (
                    <Badge
                      key={milestone.amount}
                      className="flex items-center gap-1 py-1.5 px-3"
                      style={{ backgroundColor: milestone.color }}
                    >
                      {milestone.icon}
                      {milestone.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Net Worth Over Time
              </CardTitle>
              <CardDescription>
                Track your progress with monthly snapshots
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historicalData.length > 1 ? (
                <div className="h-80">
                  <ChartContainer
                    config={{
                      netWorth: { label: "Net Worth", color: "#10b981" },
                      assets: { label: "Assets", color: "#3b82f6" },
                      liabilities: { label: "Liabilities", color: "#ef4444" },
                    }}
                  >
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(v) => fmt(v)} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => fmtFull(value as number)}
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="netWorth"
                        stroke="#10b981"
                        strokeWidth={3}
                        fill="url(#netWorthGradient)"
                      />
                    </AreaChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No history yet</p>
                  <p className="text-sm">
                    Save your first snapshot to start tracking progress
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Snapshot History List */}
          {snapshots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Snapshot History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[...snapshots].reverse().map((snapshot, idx) => (
                    <div
                      key={snapshot.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(snapshot.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          {formatValue(snapshot.netWorth)}
                        </span>
                        {idx < snapshots.length - 1 && (
                          <Badge
                            variant={
                              snapshot.netWorth >= snapshots[snapshots.length - 2 - idx]?.netWorth
                                ? "default"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {snapshot.netWorth >= snapshots[snapshots.length - 2 - idx]?.netWorth
                              ? "+"
                              : ""}
                            {fmt(
                              snapshot.netWorth -
                                (snapshots[snapshots.length - 2 - idx]?.netWorth || 0)
                            )}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ALLOCATION TAB */}
        <TabsContent value="allocation" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* By Account Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">By Account Type</CardTitle>
              </CardHeader>
              <CardContent>
                {assetsByCategory.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetsByCategory}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={2}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {assetsByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No asset data
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  {assetsByCategory.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{formatValue(item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* By Asset Class */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">By Asset Class</CardTitle>
              </CardHeader>
              <CardContent>
                {assetsByClass.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={assetsByClass}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={2}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          labelLine={false}
                        >
                          {assetsByClass.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No asset data
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  {assetsByClass.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">{formatValue(item.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* GOALS TAB */}
        <TabsContent value="goals" className="space-y-4 mt-4">
          {/* Goal Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Goal Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress to {fmt(goals.targetNetWorth)}</span>
                  <span className="font-medium">{goalProgress.progress.toFixed(1)}%</span>
                </div>
                <Progress value={goalProgress.progress} className="h-4" />
              </div>

              <div
                className={cn(
                  "rounded-lg p-4 border",
                  goalProgress.isOnTrack
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                )}
              >
                <div className="flex items-center gap-3">
                  {goalProgress.isOnTrack ? (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  )}
                  <div>
                    <div
                      className={cn(
                        "font-semibold",
                        goalProgress.isOnTrack
                          ? "text-green-900 dark:text-green-100"
                          : "text-red-900 dark:text-red-100"
                      )}
                    >
                      {goalProgress.isOnTrack ? "On Track!" : "Behind Schedule"}
                    </div>
                    <p
                      className={cn(
                        "text-sm",
                        goalProgress.isOnTrack
                          ? "text-green-800 dark:text-green-200"
                          : "text-red-800 dark:text-red-200"
                      )}
                    >
                      {goalProgress.isOnTrack
                        ? `At your expected ${goals.expectedReturn}% return, you'll reach your goal.`
                        : `You need ${goalProgress.requiredReturn.toFixed(1)}% annual returns to reach your goal (vs your expected ${goals.expectedReturn}%).`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Goal Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Target Net Worth</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      value={goals.targetNetWorth}
                      onChange={(e) =>
                        setGoals((prev) => ({
                          ...prev,
                          targetNetWorth: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="pl-7"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Target Year</label>
                  <Input
                    type="number"
                    value={new Date(goals.targetDate).getFullYear()}
                    onChange={(e) =>
                      setGoals((prev) => ({
                        ...prev,
                        targetDate: `${e.target.value}-01-01`,
                      }))
                    }
                    min={new Date().getFullYear()}
                    max={2100}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Current Age</label>
                  <Input
                    type="number"
                    value={goals.currentAge}
                    onChange={(e) =>
                      setGoals((prev) => ({
                        ...prev,
                        currentAge: parseInt(e.target.value) || 35,
                      }))
                    }
                    min={18}
                    max={100}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Expected Return (%)</label>
                  <Input
                    type="number"
                    value={goals.expectedReturn}
                    onChange={(e) =>
                      setGoals((prev) => ({
                        ...prev,
                        expectedReturn: parseFloat(e.target.value) || 7,
                      }))
                    }
                    min={0}
                    max={20}
                    step={0.5}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Retirement Age</label>
                  <Input
                    type="number"
                    value={goals.retirementAge}
                    onChange={(e) =>
                      setGoals((prev) => ({
                        ...prev,
                        retirementAge: parseInt(e.target.value) || 65,
                      }))
                    }
                    min={50}
                    max={80}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Annual Contribution</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      value={annualContribution}
                      onChange={(e) =>
                        setAnnualContribution(parseFloat(e.target.value) || 0)
                      }
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROJECTIONS TAB */}
        <TabsContent value="projections" className="space-y-4 mt-4">
          {/* Projected Values */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-900">
              <CardHeader className="pb-2">
                <CardDescription className="text-blue-700 dark:text-blue-400">
                  At Retirement (Age {goals.retirementAge})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {fmt(projectedNetWorth.atRetirement)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-900">
              <CardHeader className="pb-2">
                <CardDescription className="text-purple-700 dark:text-purple-400">
                  At Life Expectancy (Age {goals.lifeExpectancy})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {fmt(projectedNetWorth.atLifeExpectancy)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-900">
              <CardHeader className="pb-2">
                <CardDescription className="text-amber-700 dark:text-amber-400">
                  Potential Inheritance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                  {fmt(projectedNetWorth.inheritance)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projection Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Net Worth Projection</CardTitle>
              <CardDescription>
                Based on {goals.expectedReturn}% annual return and ${annualContribution.toLocaleString()}/year contributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ChartContainer
                  config={{
                    projected: { label: "Projected", color: "#10b981" },
                    goal: { label: "Goal Path", color: "#6366f1" },
                  }}
                >
                  <AreaChart data={projectionData}>
                    <defs>
                      <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="age"
                      tickFormatter={(age) => `Age ${age}`}
                    />
                    <YAxis tickFormatter={(v) => fmt(v)} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => fmtFull(value as number)}
                          labelFormatter={(label) => `Age ${label}`}
                        />
                      }
                    />
                    <ReferenceLine
                      x={goals.retirementAge}
                      stroke="#f59e0b"
                      strokeDasharray="5 5"
                      label={{ value: "Retirement", fill: "#f59e0b", fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="projected"
                      stroke="#10b981"
                      strokeWidth={3}
                      fill="url(#projectedGradient)"
                    />
                    <Line
                      type="monotone"
                      dataKey="goal"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          {/* Hidden Assets Section */}
          <Card>
            <CardHeader
              className="cursor-pointer"
              onClick={() => toggleSection("hidden")}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <HelpCircle className="h-5 w-5" />
                  What&apos;s Not Counted
                </CardTitle>
                {expandedSections.hidden ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
              <CardDescription>
                Include implicit assets like human capital and Social Security
              </CardDescription>
            </CardHeader>
            {expandedSections.hidden && (
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      These are &quot;implicit&quot; assets that don&apos;t show up on a balance sheet but represent
                      real economic value. Including them gives a more complete picture of your financial
                      position.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Human Capital */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Human Capital</span>
                        <span className="text-xs text-muted-foreground">
                          (Present value of future earnings)
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground">Annual Income</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              $
                            </span>
                            <Input
                              type="number"
                              value={annualIncome}
                              onChange={(e) =>
                                setAnnualIncome(parseFloat(e.target.value) || 0)
                              }
                              className="h-8 pl-6 text-sm"
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Estimated Value</div>
                          <div className="font-semibold text-green-600">
                            {fmt(
                              calculateHumanCapital(
                                goals.currentAge,
                                goals.retirementAge,
                                annualIncome
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={hiddenOptions.humanCapital}
                      onCheckedChange={(checked) =>
                        setHiddenOptions((prev) => ({ ...prev, humanCapital: checked }))
                      }
                      className="ml-4"
                    />
                  </div>

                  {/* Social Security */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">Social Security</span>
                        <span className="text-xs text-muted-foreground">
                          (Present value of benefits)
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground">
                            Est. Monthly Benefit
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              $
                            </span>
                            <Input
                              type="number"
                              value={monthlySocialSecurity}
                              onChange={(e) =>
                                setMonthlySocialSecurity(parseFloat(e.target.value) || 0)
                              }
                              className="h-8 pl-6 text-sm"
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Estimated Value</div>
                          <div className="font-semibold text-green-600">
                            {fmt(
                              calculateSocialSecurityPV(
                                monthlySocialSecurity,
                                67,
                                goals.lifeExpectancy
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={hiddenOptions.socialSecurity}
                      onCheckedChange={(checked) =>
                        setHiddenOptions((prev) => ({ ...prev, socialSecurity: checked }))
                      }
                      className="ml-4"
                    />
                  </div>
                </div>

                {/* Extended Net Worth */}
                {(hiddenOptions.humanCapital || hiddenOptions.socialSecurity) && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-green-700 dark:text-green-400 mb-1">
                          Extended Net Worth (including implicit assets)
                        </div>
                        <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                          {fmtFull(extendedNetWorth)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Implicit Assets</div>
                        <div className="font-semibold text-green-600">
                          +{fmt(hiddenAssetValues.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NetWorthTracker;
