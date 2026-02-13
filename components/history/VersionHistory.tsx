"use client";

import * as React from "react";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  History,
  Clock,
  Save,
  RotateCcw,
  GitCompare,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Trash2,
  Edit3,
  Plus,
  Minus,
  ArrowRight,
  AlertCircle,
  Download,
  Upload,
} from "lucide-react";
import { cn, fmt } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import type { PlanConfig } from "@/types/plan-config";

// ============================================================================
// Types
// ============================================================================

export interface PlanVersion {
  /** Unique version identifier */
  id: string;
  /** ISO timestamp when this version was created */
  timestamp: string;
  /** The complete plan configuration snapshot */
  data: PlanConfig;
  /** Type of version: auto-save, named checkpoint, or restored */
  type: "auto" | "checkpoint" | "restored";
  /** User-provided name for checkpoints */
  name?: string;
  /** Optional description for more context */
  description?: string;
  /** Which fields changed from the previous version */
  changedFields?: string[];
  /** Summary of key metrics at this version */
  metrics?: {
    totalBalance?: number;
    retirementAge?: number;
    withdrawalRate?: number;
    successProbability?: number;
  };
}

export interface VersionCompareResult {
  field: string;
  displayName: string;
  oldValue: string | number | boolean | null | undefined;
  newValue: string | number | boolean | null | undefined;
  changeType: "added" | "removed" | "modified";
  category: "personal" | "financial" | "retirement" | "simulation" | "other";
}

export interface VersionHistoryProps {
  /** Current plan configuration */
  currentPlan: PlanConfig;
  /** Callback when plan is restored to a previous version */
  onRestore: (version: PlanVersion) => void;
  /** Callback when a new checkpoint is created */
  onCheckpoint?: (name: string, description?: string) => void;
  /** Callback when auto-save triggers */
  onAutoSave?: (version: PlanVersion) => void;
  /** Interval in milliseconds for auto-save (default: 30 seconds) */
  autoSaveInterval?: number;
  /** Maximum number of versions to keep (default: 50) */
  maxVersions?: number;
  /** Storage key for localStorage persistence */
  storageKey?: string;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const FIELD_DISPLAY_NAMES: Record<string, { name: string; category: VersionCompareResult["category"] }> = {
  // Personal & Family
  marital: { name: "Marital Status", category: "personal" },
  age1: { name: "Your Age", category: "personal" },
  age2: { name: "Spouse Age", category: "personal" },
  retirementAge: { name: "Retirement Age", category: "retirement" },
  numChildren: { name: "Number of Children", category: "personal" },

  // Employment & Income
  employmentType1: { name: "Employment Type", category: "financial" },
  employmentType2: { name: "Spouse Employment Type", category: "financial" },
  primaryIncome: { name: "Primary Income", category: "financial" },
  spouseIncome: { name: "Spouse Income", category: "financial" },

  // Balances
  emergencyFund: { name: "Emergency Fund", category: "financial" },
  taxableBalance: { name: "Taxable Balance", category: "financial" },
  pretaxBalance: { name: "Pre-tax Balance", category: "financial" },
  rothBalance: { name: "Roth Balance", category: "financial" },

  // Contributions
  cTax1: { name: "Taxable Contribution", category: "financial" },
  cPre1: { name: "Pre-tax Contribution", category: "financial" },
  cPost1: { name: "Roth Contribution", category: "financial" },
  cMatch1: { name: "Employer Match", category: "financial" },
  cTax2: { name: "Spouse Taxable Contribution", category: "financial" },
  cPre2: { name: "Spouse Pre-tax Contribution", category: "financial" },
  cPost2: { name: "Spouse Roth Contribution", category: "financial" },
  cMatch2: { name: "Spouse Employer Match", category: "financial" },

  // Rates
  retRate: { name: "Expected Return Rate", category: "simulation" },
  inflationRate: { name: "Inflation Rate", category: "simulation" },
  stateRate: { name: "State Tax Rate", category: "financial" },
  incRate: { name: "Income Growth Rate", category: "financial" },
  wdRate: { name: "Withdrawal Rate", category: "retirement" },
  dividendYield: { name: "Dividend Yield", category: "financial" },

  // Social Security
  includeSS: { name: "Include Social Security", category: "retirement" },
  ssIncome: { name: "SS Income Basis", category: "retirement" },
  ssClaimAge: { name: "SS Claim Age", category: "retirement" },
  ssIncome2: { name: "Spouse SS Income Basis", category: "retirement" },
  ssClaimAge2: { name: "Spouse SS Claim Age", category: "retirement" },

  // Simulation
  returnMode: { name: "Return Mode", category: "simulation" },
  randomWalkSeries: { name: "Random Walk Series", category: "simulation" },
  seed: { name: "Simulation Seed", category: "simulation" },

  // Bond Allocation
  allocationStrategy: { name: "Allocation Strategy", category: "simulation" },
  bondStartPct: { name: "Bond Start %", category: "simulation" },
  bondEndPct: { name: "Bond End %", category: "simulation" },

  // Healthcare
  includeMedicare: { name: "Include Medicare", category: "retirement" },
  medicarePremium: { name: "Medicare Premium", category: "retirement" },
  medicalInflation: { name: "Medical Inflation", category: "retirement" },

  // LTC
  includeLTC: { name: "Include LTC", category: "retirement" },
  ltcAnnualCost: { name: "LTC Annual Cost", category: "retirement" },
  ltcProbability: { name: "LTC Probability", category: "retirement" },

  // Roth Conversions
  enableRothConversions: { name: "Enable Roth Conversions", category: "retirement" },
  targetConversionBracket: { name: "Target Conversion Bracket", category: "retirement" },

  // Generational
  showGen: { name: "Show Generational", category: "other" },
  hypPerBen: { name: "Per Beneficiary Amount", category: "other" },
  numberOfBeneficiaries: { name: "Number of Beneficiaries", category: "other" },
};

const CATEGORY_LABELS: Record<VersionCompareResult["category"], string> = {
  personal: "Personal & Family",
  financial: "Financial",
  retirement: "Retirement",
  simulation: "Simulation",
  other: "Other Settings",
};

// ============================================================================
// Utility Functions
// ============================================================================

function generateVersionId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFullTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getFieldDisplayInfo(field: string): { name: string; category: VersionCompareResult["category"] } {
  return FIELD_DISPLAY_NAMES[field] || { name: field, category: "other" };
}

function formatValue(value: unknown, field: string): string {
  if (value === null || value === undefined) return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    // Currency fields
    if (
      field.includes("Balance") ||
      field.includes("Income") ||
      field.includes("Fund") ||
      field.includes("Cost") ||
      field.includes("Premium") ||
      field.includes("cTax") ||
      field.includes("cPre") ||
      field.includes("cPost") ||
      field.includes("cMatch") ||
      field.includes("hypPerBen")
    ) {
      return fmt(value);
    }
    // Percentage fields
    if (
      field.includes("Rate") ||
      field.includes("Pct") ||
      field.includes("Yield") ||
      field.includes("Probability") ||
      field.includes("Bracket")
    ) {
      return `${value.toFixed(1)}%`;
    }
    // Age fields
    if (field.includes("Age") || field.includes("age")) {
      return `${value} years`;
    }
    return value.toString();
  }
  if (typeof value === "string") {
    // Capitalize enum values
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/([A-Z])/g, " $1");
  }
  return JSON.stringify(value);
}

function compareVersions(oldVersion: PlanConfig, newVersion: PlanConfig): VersionCompareResult[] {
  const changes: VersionCompareResult[] = [];
  const allKeys = new Set([
    ...Object.keys(oldVersion),
    ...Object.keys(newVersion),
  ]);

  // Exclude metadata fields from comparison
  const excludeFields = new Set([
    "version",
    "createdAt",
    "updatedAt",
    "fieldMetadata",
    "missingFields",
    "assumptions",
    "familyConfig",
  ]);

  for (const key of allKeys) {
    if (excludeFields.has(key)) continue;

    const oldVal = (oldVersion as unknown as Record<string, unknown>)[key];
    const newVal = (newVersion as unknown as Record<string, unknown>)[key];

    // Deep comparison for objects
    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);

    if (oldStr !== newStr) {
      const { name, category } = getFieldDisplayInfo(key);

      let changeType: VersionCompareResult["changeType"] = "modified";
      if (oldVal === undefined || oldVal === null) changeType = "added";
      else if (newVal === undefined || newVal === null) changeType = "removed";

      changes.push({
        field: key,
        displayName: name,
        oldValue: oldVal as string | number | boolean | null | undefined,
        newValue: newVal as string | number | boolean | null | undefined,
        changeType,
        category,
      });
    }
  }

  // Sort by category and field name
  return changes.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.displayName.localeCompare(b.displayName);
  });
}

function detectChangedFields(oldPlan: PlanConfig, newPlan: PlanConfig): string[] {
  const changes = compareVersions(oldPlan, newPlan);
  return changes.map((c) => c.field);
}

function calculatePlanMetrics(plan: PlanConfig): PlanVersion["metrics"] {
  const totalBalance = (plan.taxableBalance || 0) + (plan.pretaxBalance || 0) + (plan.rothBalance || 0);
  return {
    totalBalance,
    retirementAge: plan.retirementAge,
    withdrawalRate: plan.wdRate,
  };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface VersionItemProps {
  version: PlanVersion;
  isSelected: boolean;
  isCompareA: boolean;
  isCompareB: boolean;
  isCurrent: boolean;
  onClick: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
  onCompareSelect: (slot: "A" | "B") => void;
  compareMode: boolean;
}

function VersionItem({
  version,
  isSelected,
  isCompareA,
  isCompareB,
  isCurrent,
  onClick,
  onRestore,
  onDelete,
  onRename,
  onCompareSelect,
  compareMode,
}: VersionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(version.name || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveName = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setEditName(version.name || "");
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 p-3 rounded-lg border transition-all cursor-pointer",
        isSelected && "border-primary bg-primary/5",
        !isSelected && "border-border hover:border-primary/50 hover:bg-muted/30",
        isCurrent && "border-green-500 bg-green-500/5",
        (isCompareA || isCompareB) && "ring-2",
        isCompareA && "ring-blue-500",
        isCompareB && "ring-orange-500"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Version Type Icon */}
          {version.type === "checkpoint" ? (
            <Bookmark className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          ) : version.type === "restored" ? (
            <RotateCcw className="h-4 w-4 text-purple-500 flex-shrink-0" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}

          {/* Name/Title */}
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
                className="h-6 text-sm py-0 px-1"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {version.name || (version.type === "checkpoint" ? "Unnamed Checkpoint" : "Auto-save")}
                </span>
                {version.type === "checkpoint" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Edit name"
                  >
                    <Edit3 className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isCurrent && (
            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
              Current
            </Badge>
          )}
          {isCompareA && (
            <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
              A
            </Badge>
          )}
          {isCompareB && (
            <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
              B
            </Badge>
          )}
        </div>
      </div>

      {/* Timestamp & Changes */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span title={formatFullTimestamp(version.timestamp)}>{formatTimestamp(version.timestamp)}</span>
        {version.changedFields && version.changedFields.length > 0 && (
          <span className="text-muted-foreground">
            {version.changedFields.length} change{version.changedFields.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Metrics Summary */}
      {version.metrics && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {version.metrics.totalBalance !== undefined && (
            <span>Balance: {fmt(version.metrics.totalBalance)}</span>
          )}
          {version.metrics.retirementAge !== undefined && (
            <span>Retire: {version.metrics.retirementAge}</span>
          )}
          {version.metrics.withdrawalRate !== undefined && (
            <span>WD: {version.metrics.withdrawalRate}%</span>
          )}
        </div>
      )}

      {/* Description if checkpoint */}
      {version.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{version.description}</p>
      )}

      {/* Actions - visible on hover or when selected */}
      <div
        className={cn(
          "flex items-center gap-1.5 pt-2 border-t border-border/50",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          isSelected && "opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {compareMode ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-7 text-xs flex-1", isCompareA && "bg-blue-500/10 border-blue-500")}
              onClick={() => onCompareSelect("A")}
            >
              {isCompareA ? <Check className="h-3 w-3 mr-1" /> : null}
              Select A
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-7 text-xs flex-1", isCompareB && "bg-orange-500/10 border-orange-500")}
              onClick={() => onCompareSelect("B")}
            >
              {isCompareB ? <Check className="h-3 w-3 mr-1" /> : null}
              Select B
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={onRestore}
              disabled={isCurrent}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restore
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface CompareViewProps {
  versionA: PlanVersion | null;
  versionB: PlanVersion | null;
  onClose: () => void;
}

function CompareView({ versionA, versionB, onClose }: CompareViewProps) {
  if (!versionA || !versionB) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <GitCompare className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm">Select two versions to compare</p>
        <p className="text-xs mt-1">
          {!versionA && !versionB
            ? "Click 'Select A' on the first version, then 'Select B' on the second"
            : !versionA
            ? "Now select version A"
            : "Now select version B"}
        </p>
      </div>
    );
  }

  const changes = compareVersions(versionA.data, versionB.data);
  const groupedChanges = changes.reduce(
    (acc, change) => {
      if (!acc[change.category]) acc[change.category] = [];
      acc[change.category].push(change);
      return acc;
    },
    {} as Record<VersionCompareResult["category"], VersionCompareResult[]>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              A
            </Badge>
            <span className="font-medium">{versionA.name || "Auto-save"}</span>
            <span className="text-muted-foreground">{formatTimestamp(versionA.timestamp)}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
              B
            </Badge>
            <span className="font-medium">{versionB.name || "Auto-save"}</span>
            <span className="text-muted-foreground">{formatTimestamp(versionB.timestamp)}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {/* Changes */}
      {changes.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p>No differences found</p>
          <p className="text-xs mt-1">These versions are identical</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-6 pr-4">
            {Object.entries(groupedChanges).map(([category, categoryChanges]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  {CATEGORY_LABELS[category as VersionCompareResult["category"]]}
                  <Badge variant="outline" className="text-xs">
                    {categoryChanges.length}
                  </Badge>
                </h4>
                <div className="space-y-2">
                  {categoryChanges.map((change) => (
                    <div
                      key={change.field}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md text-sm",
                        change.changeType === "added" && "bg-green-500/10",
                        change.changeType === "removed" && "bg-red-500/10",
                        change.changeType === "modified" && "bg-yellow-500/10"
                      )}
                    >
                      {/* Change Type Icon */}
                      <div className="flex-shrink-0">
                        {change.changeType === "added" ? (
                          <Plus className="h-4 w-4 text-green-600" />
                        ) : change.changeType === "removed" ? (
                          <Minus className="h-4 w-4 text-red-600" />
                        ) : (
                          <Edit3 className="h-4 w-4 text-yellow-600" />
                        )}
                      </div>

                      {/* Field Name */}
                      <span className="font-medium min-w-[140px]">{change.displayName}</span>

                      {/* Values */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-xs truncate max-w-[150px]",
                            change.changeType === "removed" || change.changeType === "modified"
                              ? "bg-red-500/20 text-red-700 dark:text-red-300 line-through"
                              : "text-muted-foreground"
                          )}
                          title={formatValue(change.oldValue, change.field)}
                        >
                          {change.changeType !== "added" ? formatValue(change.oldValue, change.field) : "-"}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-xs truncate max-w-[150px]",
                            change.changeType === "added" || change.changeType === "modified"
                              ? "bg-green-500/20 text-green-700 dark:text-green-300 font-medium"
                              : "text-muted-foreground"
                          )}
                          title={formatValue(change.newValue, change.field)}
                        >
                          {change.changeType !== "removed" ? formatValue(change.newValue, change.field) : "-"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>
          {changes.length} difference{changes.length !== 1 ? "s" : ""} found
        </span>
        <span>
          {changes.filter((c) => c.changeType === "added").length} added,{" "}
          {changes.filter((c) => c.changeType === "modified").length} modified,{" "}
          {changes.filter((c) => c.changeType === "removed").length} removed
        </span>
      </div>
    </div>
  );
}

interface CreateCheckpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description?: string) => void;
}

function CreateCheckpointDialog({ open, onOpenChange, onCreate }: CreateCheckpointDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), description.trim() || undefined);
      setName("");
      setDescription("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-yellow-500" />
            Create Named Checkpoint
          </DialogTitle>
          <DialogDescription>
            Save a named snapshot of your current plan. You can restore to this point at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="checkpoint-name" className="text-sm font-medium">
              Checkpoint Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="checkpoint-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Before retirement age change"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="checkpoint-description" className="text-sm font-medium">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="checkpoint-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this version..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            <Save className="h-4 w-4 mr-2" />
            Create Checkpoint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function VersionHistory({
  currentPlan,
  onRestore,
  onCheckpoint,
  onAutoSave,
  autoSaveInterval = 30000, // 30 seconds
  maxVersions = 50,
  storageKey = "plan-version-history",
  className,
}: VersionHistoryProps) {
  // State
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [isCheckpointDialogOpen, setIsCheckpointDialogOpen] = useState(false);
  const [restoreConfirmVersion, setRestoreConfirmVersion] = useState<PlanVersion | null>(null);
  const [deleteConfirmVersion, setDeleteConfirmVersion] = useState<PlanVersion | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Refs
  const lastPlanRef = useRef<PlanConfig | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load versions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as PlanVersion[];
        setVersions(parsed);
      }
    } catch (error) {
      console.error("Failed to load version history:", error);
    }
  }, [storageKey]);

  // Save versions to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(versions));
    } catch (error) {
      console.error("Failed to save version history:", error);
    }
  }, [versions, storageKey]);

  // Auto-save logic
  const createAutoSave = useCallback(() => {
    if (!currentPlan) return;

    // Check if there are actual changes from the last saved version
    const latestVersion = versions[0];
    if (latestVersion) {
      const changes = detectChangedFields(latestVersion.data, currentPlan);
      if (changes.length === 0) return; // No changes, skip auto-save
    }

    const newVersion: PlanVersion = {
      id: generateVersionId(),
      timestamp: new Date().toISOString(),
      data: { ...currentPlan },
      type: "auto",
      changedFields: latestVersion ? detectChangedFields(latestVersion.data, currentPlan) : [],
      metrics: calculatePlanMetrics(currentPlan),
    };

    setVersions((prev) => {
      const newVersions = [newVersion, ...prev].slice(0, maxVersions);
      return newVersions;
    });

    onAutoSave?.(newVersion);
    lastPlanRef.current = currentPlan;
  }, [currentPlan, versions, maxVersions, onAutoSave]);

  // Auto-save timer
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setInterval(() => {
      createAutoSave();
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [autoSaveInterval, createAutoSave]);

  // Create initial version if none exist
  useEffect(() => {
    if (versions.length === 0 && currentPlan) {
      const initialVersion: PlanVersion = {
        id: generateVersionId(),
        timestamp: new Date().toISOString(),
        data: { ...currentPlan },
        type: "auto",
        name: "Initial Plan",
        metrics: calculatePlanMetrics(currentPlan),
      };
      setVersions([initialVersion]);
      lastPlanRef.current = currentPlan;
    }
  }, [currentPlan, versions.length]);

  // Handlers
  const handleCreateCheckpoint = useCallback(
    (name: string, description?: string) => {
      const latestVersion = versions[0];
      const newVersion: PlanVersion = {
        id: generateVersionId(),
        timestamp: new Date().toISOString(),
        data: { ...currentPlan },
        type: "checkpoint",
        name,
        description,
        changedFields: latestVersion ? detectChangedFields(latestVersion.data, currentPlan) : [],
        metrics: calculatePlanMetrics(currentPlan),
      };

      setVersions((prev) => [newVersion, ...prev].slice(0, maxVersions));
      onCheckpoint?.(name, description);
    },
    [currentPlan, versions, maxVersions, onCheckpoint]
  );

  const handleRestore = useCallback(
    (version: PlanVersion) => {
      // Create a "restored" version to track this action
      const restoredVersion: PlanVersion = {
        id: generateVersionId(),
        timestamp: new Date().toISOString(),
        data: { ...version.data },
        type: "restored",
        name: `Restored: ${version.name || "Auto-save"}`,
        changedFields: detectChangedFields(currentPlan, version.data),
        metrics: calculatePlanMetrics(version.data),
      };

      setVersions((prev) => [restoredVersion, ...prev].slice(0, maxVersions));
      onRestore(version);
      setRestoreConfirmVersion(null);
    },
    [currentPlan, maxVersions, onRestore]
  );

  const handleDelete = useCallback((versionId: string) => {
    setVersions((prev) => prev.filter((v) => v.id !== versionId));
    setDeleteConfirmVersion(null);
    if (compareA === versionId) setCompareA(null);
    if (compareB === versionId) setCompareB(null);
    if (selectedVersion === versionId) setSelectedVersion(null);
  }, [compareA, compareB, selectedVersion]);

  const handleRename = useCallback((versionId: string, newName: string) => {
    setVersions((prev) =>
      prev.map((v) => (v.id === versionId ? { ...v, name: newName } : v))
    );
  }, []);

  const handleCompareSelect = useCallback(
    (versionId: string, slot: "A" | "B") => {
      if (slot === "A") {
        setCompareA(compareA === versionId ? null : versionId);
      } else {
        setCompareB(compareB === versionId ? null : versionId);
      }
    },
    [compareA, compareB]
  );

  const handleExportHistory = useCallback(() => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      versions: versions,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan-history-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [versions]);

  const handleImportHistory = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.versions && Array.isArray(data.versions)) {
          setVersions(data.versions);
        }
      } catch (error) {
        console.error("Failed to import history:", error);
      }
    };
    input.click();
  }, []);

  // Computed values
  const compareVersionA = useMemo(
    () => versions.find((v) => v.id === compareA) || null,
    [versions, compareA]
  );
  const compareVersionB = useMemo(
    () => versions.find((v) => v.id === compareB) || null,
    [versions, compareB]
  );

  const currentVersionId = useMemo(() => {
    // Find the version that matches the current plan
    const matching = versions.find((v) => {
      const changes = detectChangedFields(v.data, currentPlan);
      return changes.length === 0;
    });
    return matching?.id || null;
  }, [versions, currentPlan]);

  const checkpointCount = useMemo(
    () => versions.filter((v) => v.type === "checkpoint").length,
    [versions]
  );

  const autoSaveCount = useMemo(
    () => versions.filter((v) => v.type === "auto").length,
    [versions]
  );

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Version History</CardTitle>
          </button>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {versions.length} version{versions.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
        {isExpanded && (
          <CardDescription className="text-xs">
            {checkpointCount} checkpoint{checkpointCount !== 1 ? "s" : ""}, {autoSaveCount} auto-save
            {autoSaveCount !== 1 ? "s" : ""}
          </CardDescription>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="flex-1 flex flex-col gap-4 pt-0">
          {/* Actions Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCheckpointDialogOpen(true)}
              className="flex-1 sm:flex-none"
            >
              <Bookmark className="h-4 w-4 mr-1.5" />
              New Checkpoint
            </Button>
            <Button
              variant={compareMode ? "secondary" : "outline"}
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode);
                if (!compareMode) {
                  setCompareA(null);
                  setCompareB(null);
                }
              }}
              className="flex-1 sm:flex-none"
            >
              <GitCompare className="h-4 w-4 mr-1.5" />
              {compareMode ? "Exit Compare" : "Compare"}
            </Button>
            <div className="hidden sm:flex items-center gap-1 ml-auto">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExportHistory} title="Export history">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleImportHistory} title="Import history">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Compare View */}
          {compareMode && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <CompareView
                versionA={compareVersionA}
                versionB={compareVersionB}
                onClose={() => {
                  setCompareMode(false);
                  setCompareA(null);
                  setCompareB(null);
                }}
              />
            </div>
          )}

          {/* Version List */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2 pr-4">
              {versions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No versions yet</p>
                  <p className="text-xs mt-1">Changes will be auto-saved periodically</p>
                </div>
              ) : (
                versions.map((version) => (
                  <VersionItem
                    key={version.id}
                    version={version}
                    isSelected={selectedVersion === version.id}
                    isCompareA={compareA === version.id}
                    isCompareB={compareB === version.id}
                    isCurrent={currentVersionId === version.id}
                    onClick={() => setSelectedVersion(version.id === selectedVersion ? null : version.id)}
                    onRestore={() => setRestoreConfirmVersion(version)}
                    onDelete={() => setDeleteConfirmVersion(version)}
                    onRename={(newName) => handleRename(version.id, newName)}
                    onCompareSelect={(slot) => handleCompareSelect(version.id, slot)}
                    compareMode={compareMode}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Last auto-save indicator */}
          {versions.length > 0 && (
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Last saved: {formatTimestamp(versions[0].timestamp)}
            </div>
          )}
        </CardContent>
      )}

      {/* Create Checkpoint Dialog */}
      <CreateCheckpointDialog
        open={isCheckpointDialogOpen}
        onOpenChange={setIsCheckpointDialogOpen}
        onCreate={handleCreateCheckpoint}
      />

      {/* Restore Confirmation Dialog */}
      <AlertDialog
        open={!!restoreConfirmVersion}
        onOpenChange={(open) => !open && setRestoreConfirmVersion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-purple-500" />
              Restore to Previous Version?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will restore your plan to the state from{" "}
              <strong>{restoreConfirmVersion && formatFullTimestamp(restoreConfirmVersion.timestamp)}</strong>.
              {restoreConfirmVersion?.name && (
                <>
                  <br />
                  <span className="font-medium">&ldquo;{restoreConfirmVersion.name}&rdquo;</span>
                </>
              )}
              <br />
              <br />
              Your current plan will be saved as a new version before restoring, so you can undo this
              action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreConfirmVersion && handleRestore(restoreConfirmVersion)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmVersion}
        onOpenChange={(open) => !open && setDeleteConfirmVersion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Version?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the version from{" "}
              <strong>{deleteConfirmVersion && formatFullTimestamp(deleteConfirmVersion.timestamp)}</strong>.
              {deleteConfirmVersion?.name && (
                <>
                  <br />
                  <span className="font-medium">&ldquo;{deleteConfirmVersion.name}&rdquo;</span>
                </>
              )}
              <br />
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmVersion && handleDelete(deleteConfirmVersion.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ============================================================================
// Hook for External Usage
// ============================================================================

export interface UseVersionHistoryOptions {
  storageKey?: string;
  autoSaveInterval?: number;
  maxVersions?: number;
}

export function useVersionHistory(
  currentPlan: PlanConfig,
  options: UseVersionHistoryOptions = {}
) {
  const {
    storageKey = "plan-version-history",
    autoSaveInterval = 30000,
    maxVersions = 50,
  } = options;

  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const lastPlanRef = useRef<PlanConfig | null>(null);

  // Load from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setVersions(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load version history:", error);
    }
  }, [storageKey]);

  // Save to storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(versions));
    } catch (error) {
      console.error("Failed to save version history:", error);
    }
  }, [versions, storageKey]);

  // Auto-save
  useEffect(() => {
    const timer = setInterval(() => {
      if (!currentPlan) return;

      const latestVersion = versions[0];
      if (latestVersion) {
        const changes = detectChangedFields(latestVersion.data, currentPlan);
        if (changes.length === 0) return;
      }

      const newVersion: PlanVersion = {
        id: generateVersionId(),
        timestamp: new Date().toISOString(),
        data: { ...currentPlan },
        type: "auto",
        changedFields: latestVersion ? detectChangedFields(latestVersion.data, currentPlan) : [],
        metrics: calculatePlanMetrics(currentPlan),
      };

      setVersions((prev) => [newVersion, ...prev].slice(0, maxVersions));
      lastPlanRef.current = currentPlan;
    }, autoSaveInterval);

    return () => clearInterval(timer);
  }, [currentPlan, versions, autoSaveInterval, maxVersions]);

  const createCheckpoint = useCallback(
    (name: string, description?: string) => {
      const latestVersion = versions[0];
      const newVersion: PlanVersion = {
        id: generateVersionId(),
        timestamp: new Date().toISOString(),
        data: { ...currentPlan },
        type: "checkpoint",
        name,
        description,
        changedFields: latestVersion ? detectChangedFields(latestVersion.data, currentPlan) : [],
        metrics: calculatePlanMetrics(currentPlan),
      };

      setVersions((prev) => [newVersion, ...prev].slice(0, maxVersions));
      return newVersion;
    },
    [currentPlan, versions, maxVersions]
  );

  const restoreVersion = useCallback(
    (versionId: string): PlanVersion | null => {
      const version = versions.find((v) => v.id === versionId);
      if (!version) return null;

      // Create a "restored" entry
      const restoredVersion: PlanVersion = {
        id: generateVersionId(),
        timestamp: new Date().toISOString(),
        data: { ...version.data },
        type: "restored",
        name: `Restored: ${version.name || "Auto-save"}`,
        changedFields: detectChangedFields(currentPlan, version.data),
        metrics: calculatePlanMetrics(version.data),
      };

      setVersions((prev) => [restoredVersion, ...prev].slice(0, maxVersions));
      return version;
    },
    [versions, currentPlan, maxVersions]
  );

  const deleteVersion = useCallback((versionId: string) => {
    setVersions((prev) => prev.filter((v) => v.id !== versionId));
  }, []);

  const compareVersionsById = useCallback(
    (versionIdA: string, versionIdB: string): VersionCompareResult[] => {
      const versionA = versions.find((v) => v.id === versionIdA);
      const versionB = versions.find((v) => v.id === versionIdB);
      if (!versionA || !versionB) return [];
      return compareVersions(versionA.data, versionB.data);
    },
    [versions]
  );

  const getVersionById = useCallback(
    (versionId: string): PlanVersion | undefined => {
      return versions.find((v) => v.id === versionId);
    },
    [versions]
  );

  const clearHistory = useCallback(() => {
    setVersions([]);
  }, []);

  return {
    versions,
    createCheckpoint,
    restoreVersion,
    deleteVersion,
    compareVersions: compareVersionsById,
    getVersionById,
    clearHistory,
    checkpointCount: versions.filter((v) => v.type === "checkpoint").length,
    autoSaveCount: versions.filter((v) => v.type === "auto").length,
  };
}

export default VersionHistory;
