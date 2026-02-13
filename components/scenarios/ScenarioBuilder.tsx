"use client";

import React, { useState, useCallback, useEffect, useMemo, useId } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, fmt, fmtFull } from "@/lib/utils";
import {
  Plus,
  GripVertical,
  Trash2,
  Copy,
  Share2,
  Save,
  Download,
  Upload,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Gift,
  Briefcase,
  Home,
  Car,
  GraduationCap,
  Heart,
  Plane,
  AlertTriangle,
  Check,
  X,
  Link2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart3,
  LineChart,
} from "lucide-react";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type EventType =
  | "income_increase"
  | "income_decrease"
  | "expense_increase"
  | "expense_decrease"
  | "windfall"
  | "large_expense"
  | "retirement_date_change"
  | "savings_rate_change"
  | "investment_return_change";

export type EventFrequency = "one_time" | "monthly" | "quarterly" | "annual";

export type EventCategory =
  | "career"
  | "housing"
  | "transportation"
  | "education"
  | "healthcare"
  | "travel"
  | "family"
  | "investment"
  | "other";

export interface ScenarioEvent {
  id: string;
  name: string;
  type: EventType;
  category: EventCategory;
  amount: number;
  frequency: EventFrequency;
  startAge: number;
  endAge?: number; // For recurring events
  inflationAdjusted: boolean;
  notes?: string;
  color?: string;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  events: ScenarioEvent[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  color: string;
}

export interface ScenarioComparison {
  scenarioId: string;
  projectedBalance: number[];
  successRate: number;
  retirementAge: number;
  monthlyIncome: number;
}

export interface ScenarioBuilderProps {
  currentAge?: number;
  retirementAge?: number;
  currentBalance?: number;
  annualContribution?: number;
  expectedReturn?: number;
  onScenariosChange?: (scenarios: Scenario[]) => void;
  onCompare?: (scenarios: Scenario[]) => void;
  maxScenarios?: number;
}

// ============================================================================
// CONSTANTS & UTILITIES
// ============================================================================

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; icon: React.ReactNode; colorClass: string }> = {
  income_increase: { label: "Income Increase", icon: <TrendingUp className="w-4 h-4" />, colorClass: "text-green-600 dark:text-green-400" },
  income_decrease: { label: "Income Decrease", icon: <TrendingDown className="w-4 h-4" />, colorClass: "text-red-600 dark:text-red-400" },
  expense_increase: { label: "Expense Increase", icon: <TrendingUp className="w-4 h-4" />, colorClass: "text-orange-600 dark:text-orange-400" },
  expense_decrease: { label: "Expense Decrease", icon: <TrendingDown className="w-4 h-4" />, colorClass: "text-blue-600 dark:text-blue-400" },
  windfall: { label: "Windfall", icon: <Gift className="w-4 h-4" />, colorClass: "text-emerald-600 dark:text-emerald-400" },
  large_expense: { label: "Large Expense", icon: <DollarSign className="w-4 h-4" />, colorClass: "text-rose-600 dark:text-rose-400" },
  retirement_date_change: { label: "Retirement Date Change", icon: <Calendar className="w-4 h-4" />, colorClass: "text-purple-600 dark:text-purple-400" },
  savings_rate_change: { label: "Savings Rate Change", icon: <TrendingUp className="w-4 h-4" />, colorClass: "text-cyan-600 dark:text-cyan-400" },
  investment_return_change: { label: "Return Assumption", icon: <BarChart3 className="w-4 h-4" />, colorClass: "text-indigo-600 dark:text-indigo-400" },
};

const CATEGORY_CONFIG: Record<EventCategory, { label: string; icon: React.ReactNode }> = {
  career: { label: "Career", icon: <Briefcase className="w-4 h-4" /> },
  housing: { label: "Housing", icon: <Home className="w-4 h-4" /> },
  transportation: { label: "Transportation", icon: <Car className="w-4 h-4" /> },
  education: { label: "Education", icon: <GraduationCap className="w-4 h-4" /> },
  healthcare: { label: "Healthcare", icon: <Heart className="w-4 h-4" /> },
  travel: { label: "Travel", icon: <Plane className="w-4 h-4" /> },
  family: { label: "Family", icon: <Heart className="w-4 h-4" /> },
  investment: { label: "Investment", icon: <TrendingUp className="w-4 h-4" /> },
  other: { label: "Other", icon: <Sparkles className="w-4 h-4" /> },
};

const FREQUENCY_CONFIG: Record<EventFrequency, { label: string; multiplier: number }> = {
  one_time: { label: "One-time", multiplier: 1 },
  monthly: { label: "Monthly", multiplier: 12 },
  quarterly: { label: "Quarterly", multiplier: 4 },
  annual: { label: "Annual", multiplier: 1 },
};

const SCENARIO_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
];

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Encode scenario to URL-safe string
const encodeScenarioToURL = (scenario: Scenario): string => {
  const data = {
    n: scenario.name,
    d: scenario.description,
    e: scenario.events.map(ev => ({
      n: ev.name,
      t: ev.type,
      c: ev.category,
      a: ev.amount,
      f: ev.frequency,
      s: ev.startAge,
      e: ev.endAge,
      i: ev.inflationAdjusted,
    })),
  };
  return btoa(encodeURIComponent(JSON.stringify(data)));
};

// Decode scenario from URL string
const decodeScenarioFromURL = (encoded: string): Partial<Scenario> | null => {
  try {
    const data = JSON.parse(decodeURIComponent(atob(encoded)));
    return {
      name: data.n || "Imported Scenario",
      description: data.d,
      events: (data.e || []).map((ev: Record<string, unknown>) => ({
        id: generateId(),
        name: ev.n as string,
        type: ev.t as EventType,
        category: ev.c as EventCategory,
        amount: ev.a as number,
        frequency: ev.f as EventFrequency,
        startAge: ev.s as number,
        endAge: ev.e as number | undefined,
        inflationAdjusted: ev.i as boolean,
      })),
    };
  } catch {
    return null;
  }
};

// ============================================================================
// DRAG AND DROP CONTEXT
// ============================================================================

interface DragState {
  draggedId: string | null;
  dragOverId: string | null;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface EventItemProps {
  event: ScenarioEvent;
  onEdit: (event: ScenarioEvent) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  currentAge: number;
}

const EventItem = React.memo(function EventItem({
  event,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
  currentAge,
}: EventItemProps) {
  const typeConfig = EVENT_TYPE_CONFIG[event.type];
  const categoryConfig = CATEGORY_CONFIG[event.category];
  const frequencyConfig = FREQUENCY_CONFIG[event.frequency];

  const yearsUntil = event.startAge - currentAge;
  const isRecurring = event.frequency !== "one_time";

  return (
    <div
      draggable
      onDragStart={() => onDragStart(event.id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(event.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-lg border bg-card transition-all duration-200",
        "hover:shadow-md cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 scale-95",
        isDragOver && "border-primary border-2 bg-primary/5"
      )}
    >
      {/* Drag Handle */}
      <div className="flex-shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Timeline Indicator */}
      <div className="flex-shrink-0 flex flex-col items-center">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          "bg-muted",
          typeConfig.colorClass
        )}>
          {typeConfig.icon}
        </div>
        {isRecurring && event.endAge && (
          <div className="mt-1 h-6 w-0.5 bg-border" />
        )}
      </div>

      {/* Event Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{event.name}</span>
          <Badge variant="outline" className="text-xs">
            {categoryConfig.icon}
            <span className="ml-1">{categoryConfig.label}</span>
          </Badge>
          {isRecurring && (
            <Badge variant="secondary" className="text-xs">
              {frequencyConfig.label}
            </Badge>
          )}
        </div>

        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span className={cn("font-semibold", typeConfig.colorClass)}>
            {event.type.includes("decrease") || event.type === "large_expense" ? "-" : "+"}
            {fmt(event.amount)}
            {isRecurring && `/${frequencyConfig.label.toLowerCase().replace("ly", "")}`}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Age {event.startAge}
            {isRecurring && event.endAge && ` - ${event.endAge}`}
          </span>
          {yearsUntil > 0 && (
            <span className="text-xs">
              ({yearsUntil} {yearsUntil === 1 ? "year" : "years"} away)
            </span>
          )}
        </div>

        {event.inflationAdjusted && (
          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Inflation adjusted
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(event)}
          className="h-8 w-8"
        >
          <span className="sr-only">Edit event</span>
          <MoreHorizontal className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(event.id)}
          className="h-8 w-8 text-destructive hover:text-destructive"
        >
          <span className="sr-only">Delete event</span>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
});

interface EventFormProps {
  event?: ScenarioEvent;
  onSave: (event: ScenarioEvent) => void;
  onCancel: () => void;
  currentAge: number;
  retirementAge: number;
}

const EventForm = React.memo(function EventForm({
  event,
  onSave,
  onCancel,
  currentAge,
  retirementAge,
}: EventFormProps) {
  const formId = useId();
  const [formData, setFormData] = useState<Partial<ScenarioEvent>>({
    name: event?.name || "",
    type: event?.type || "income_increase",
    category: event?.category || "career",
    amount: event?.amount || 0,
    frequency: event?.frequency || "one_time",
    startAge: event?.startAge || currentAge + 1,
    endAge: event?.endAge,
    inflationAdjusted: event?.inflationAdjusted ?? true,
    notes: event?.notes || "",
  });

  const isRecurring = formData.frequency !== "one_time";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: event?.id || generateId(),
      name: formData.name || "Unnamed Event",
      type: formData.type as EventType,
      category: formData.category as EventCategory,
      amount: formData.amount || 0,
      frequency: formData.frequency as EventFrequency,
      startAge: formData.startAge || currentAge + 1,
      endAge: isRecurring ? formData.endAge : undefined,
      inflationAdjusted: formData.inflationAdjusted ?? true,
      notes: formData.notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Event Name */}
      <div className="space-y-2">
        <Label htmlFor={`${formId}-name`}>Event Name</Label>
        <Input
          id={`${formId}-name`}
          placeholder="e.g., Job Promotion, New Car, College Tuition"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      {/* Type & Category Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${formId}-type`}>Event Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: EventType) => setFormData(prev => ({ ...prev, type: value }))}
          >
            <SelectTrigger id={`${formId}-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    <span className={config.colorClass}>{config.icon}</span>
                    <span>{config.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${formId}-category`}>Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value: EventCategory) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger id={`${formId}-category`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <span>{config.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Amount & Frequency Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${formId}-amount`}>Amount ($)</Label>
          <Input
            id={`${formId}-amount`}
            type="number"
            min="0"
            step="100"
            placeholder="10000"
            value={formData.amount || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${formId}-frequency`}>Frequency</Label>
          <Select
            value={formData.frequency}
            onValueChange={(value: EventFrequency) => setFormData(prev => ({ ...prev, frequency: value }))}
          >
            <SelectTrigger id={`${formId}-frequency`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FREQUENCY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Age Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${formId}-startAge`}>
            {isRecurring ? "Start Age" : "At Age"}
          </Label>
          <Input
            id={`${formId}-startAge`}
            type="number"
            min={currentAge}
            max={100}
            value={formData.startAge || ""}
            onChange={(e) => setFormData(prev => ({ ...prev, startAge: parseInt(e.target.value) || currentAge }))}
            required
          />
        </div>

        {isRecurring && (
          <div className="space-y-2">
            <Label htmlFor={`${formId}-endAge`}>End Age (optional)</Label>
            <Input
              id={`${formId}-endAge`}
              type="number"
              min={formData.startAge || currentAge}
              max={100}
              placeholder={`e.g., ${retirementAge}`}
              value={formData.endAge || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, endAge: parseInt(e.target.value) || undefined }))}
            />
          </div>
        )}
      </div>

      {/* Inflation Adjustment */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor={`${formId}-inflation`} className="cursor-pointer">
            Inflation Adjusted
          </Label>
          <p className="text-xs text-muted-foreground">
            Increase amount annually to maintain purchasing power
          </p>
        </div>
        <Switch
          id={`${formId}-inflation`}
          checked={formData.inflationAdjusted}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, inflationAdjusted: checked }))}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor={`${formId}-notes`}>Notes (optional)</Label>
        <Input
          id={`${formId}-notes`}
          placeholder="Additional details..."
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      {/* Form Actions */}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {event ? "Update Event" : "Add Event"}
        </Button>
      </DialogFooter>
    </form>
  );
});

interface ScenarioCardProps {
  scenario: Scenario;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onShare: () => void;
  comparison?: ScenarioComparison;
}

const ScenarioCard = React.memo(function ScenarioCard({
  scenario,
  isSelected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onShare,
  comparison,
}: ScenarioCardProps) {
  const totalEvents = scenario.events.length;
  const recurringEvents = scenario.events.filter(e => e.frequency !== "one_time").length;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary shadow-lg"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: scenario.color }}
            />
            <CardTitle className="text-base">{scenario.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Briefcase className="w-4 h-4 mr-2" />
                Edit Scenario
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(); }}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {scenario.description && (
          <CardDescription className="text-xs line-clamp-2">
            {scenario.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {totalEvents} event{totalEvents !== 1 ? "s" : ""}
          </Badge>
          {recurringEvents > 0 && (
            <Badge variant="outline" className="text-xs">
              {recurringEvents} recurring
            </Badge>
          )}
        </div>

        {comparison && (
          <div className="mt-3 pt-3 border-t space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Success Rate</span>
              <span className={cn(
                "font-semibold",
                comparison.successRate >= 90 ? "text-green-600" :
                comparison.successRate >= 70 ? "text-yellow-600" : "text-red-600"
              )}>
                {comparison.successRate.toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Projected Balance</span>
              <span className="font-semibold">
                {fmt(comparison.projectedBalance[comparison.projectedBalance.length - 1] || 0)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

interface TimelineVisualizationProps {
  events: ScenarioEvent[];
  currentAge: number;
  retirementAge: number;
}

const TimelineVisualization = React.memo(function TimelineVisualization({
  events,
  currentAge,
  retirementAge,
}: TimelineVisualizationProps) {
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.startAge - b.startAge),
    [events]
  );

  const maxAge = Math.max(retirementAge + 30, ...events.map(e => e.endAge || e.startAge));
  const minAge = currentAge;
  const range = maxAge - minAge;

  const getPosition = (age: number) => ((age - minAge) / range) * 100;

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Calendar className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">No events added yet</p>
        <p className="text-xs">Add your first event to see the timeline</p>
      </div>
    );
  }

  return (
    <div className="relative py-8 px-4">
      {/* Timeline Base */}
      <div className="absolute left-8 right-8 top-1/2 h-1 bg-border rounded-full -translate-y-1/2" />

      {/* Retirement Marker */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-md z-10"
        style={{ left: `calc(${getPosition(retirementAge)}% + 16px)` }}
      >
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-primary">
          Retire ({retirementAge})
        </div>
      </div>

      {/* Event Markers */}
      {sortedEvents.map((event, index) => {
        const typeConfig = EVENT_TYPE_CONFIG[event.type];
        const position = getPosition(event.startAge);
        const isRecurring = event.frequency !== "one_time" && event.endAge;

        return (
          <div
            key={event.id}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `calc(${position}% + 16px)` }}
          >
            {/* Recurring Event Line */}
            {isRecurring && event.endAge && (
              <div
                className="absolute top-1/2 h-1 bg-primary/30 rounded-full -translate-y-1/2"
                style={{
                  width: `calc(${getPosition(event.endAge) - position}% - 8px)`,
                  left: "4px",
                }}
              />
            )}

            {/* Event Node */}
            <div
              className={cn(
                "relative w-6 h-6 rounded-full flex items-center justify-center -translate-x-1/2",
                "border-2 border-background shadow-sm",
                event.type.includes("increase") || event.type === "windfall"
                  ? "bg-green-100 dark:bg-green-900"
                  : "bg-red-100 dark:bg-red-900"
              )}
            >
              <span className={cn("scale-75", typeConfig.colorClass)}>
                {typeConfig.icon}
              </span>
            </div>

            {/* Event Label */}
            <div className={cn(
              "absolute left-1/2 -translate-x-1/2 whitespace-nowrap max-w-[80px] truncate text-xs",
              index % 2 === 0 ? "-bottom-8" : "-top-8"
            )}>
              <span className="font-medium">{event.name}</span>
            </div>
          </div>
        );
      })}

      {/* Age Labels */}
      <div className="flex justify-between mt-12 px-4 text-xs text-muted-foreground">
        <span>Age {minAge}</span>
        <span>Age {Math.round((minAge + maxAge) / 2)}</span>
        <span>Age {maxAge}</span>
      </div>
    </div>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScenarioBuilder({
  currentAge = 35,
  retirementAge = 65,
  currentBalance = 500000,
  annualContribution = 20000,
  expectedReturn = 7,
  onScenariosChange,
  onCompare,
  maxScenarios = 5,
}: ScenarioBuilderProps) {
  // State
  const [scenarios, setScenarios] = useState<Scenario[]>([
    {
      id: generateId(),
      name: "Baseline",
      description: "Your current financial trajectory without changes",
      events: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      color: SCENARIO_COLORS[0],
    },
  ]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0].id);
  const [activeTab, setActiveTab] = useState<"events" | "compare">("events");
  const [dragState, setDragState] = useState<DragState>({ draggedId: null, dragOverId: null });
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScenarioEvent | undefined>();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showComparisonChart, setShowComparisonChart] = useState(true);
  const [importData, setImportData] = useState("");

  // Derived state
  const selectedScenario = useMemo(
    () => scenarios.find(s => s.id === selectedScenarioId) || scenarios[0],
    [scenarios, selectedScenarioId]
  );

  const activeScenarios = useMemo(
    () => scenarios.filter(s => s.isActive).slice(0, maxScenarios),
    [scenarios, maxScenarios]
  );

  // Simulated comparison data (in real app, this would come from calculation engine)
  const comparisons = useMemo<Record<string, ScenarioComparison>>(() => {
    const results: Record<string, ScenarioComparison> = {};

    activeScenarios.forEach((scenario, index) => {
      const eventImpact = scenario.events.reduce((acc, event) => {
        const multiplier = FREQUENCY_CONFIG[event.frequency].multiplier;
        const years = event.endAge ? event.endAge - event.startAge : 1;
        const totalImpact = event.amount * multiplier * years;

        if (event.type.includes("increase") || event.type === "windfall") {
          return acc + totalImpact;
        }
        return acc - totalImpact;
      }, 0);

      // Simplified projection (real implementation would use Monte Carlo)
      const years = retirementAge - currentAge + 30;
      const projectedBalance: number[] = [];
      let balance = currentBalance;

      for (let i = 0; i <= years; i++) {
        const age = currentAge + i;
        const eventContribution = scenario.events
          .filter(e => e.startAge <= age && (!e.endAge || e.endAge >= age))
          .reduce((acc, e) => {
            const amount = e.amount * (e.frequency === "monthly" ? 12 : e.frequency === "quarterly" ? 4 : 1);
            return acc + (e.type.includes("increase") || e.type === "windfall" ? amount : -amount);
          }, 0);

        if (age < retirementAge) {
          balance = balance * (1 + expectedReturn / 100) + annualContribution + eventContribution;
        } else {
          balance = balance * (1 + (expectedReturn - 2) / 100) - annualContribution * 0.8 + eventContribution;
        }

        projectedBalance.push(Math.max(0, balance));
      }

      // Simplified success rate based on final balance
      const finalBalance = projectedBalance[projectedBalance.length - 1];
      const successRate = Math.min(99, Math.max(1, 50 + (finalBalance / 1000000) * 25 + eventImpact / 100000));

      results[scenario.id] = {
        scenarioId: scenario.id,
        projectedBalance,
        successRate,
        retirementAge,
        monthlyIncome: annualContribution * 0.8 / 12,
      };
    });

    return results;
  }, [activeScenarios, currentAge, retirementAge, currentBalance, annualContribution, expectedReturn]);

  // Callbacks
  const handleAddScenario = useCallback(() => {
    if (scenarios.length >= maxScenarios) return;

    const newScenario: Scenario = {
      id: generateId(),
      name: `Scenario ${scenarios.length + 1}`,
      events: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      color: SCENARIO_COLORS[scenarios.length % SCENARIO_COLORS.length],
    };

    setScenarios(prev => [...prev, newScenario]);
    setSelectedScenarioId(newScenario.id);
  }, [scenarios.length, maxScenarios]);

  const handleDuplicateScenario = useCallback((scenario: Scenario) => {
    if (scenarios.length >= maxScenarios) return;

    const newScenario: Scenario = {
      ...scenario,
      id: generateId(),
      name: `${scenario.name} (Copy)`,
      events: scenario.events.map(e => ({ ...e, id: generateId() })),
      createdAt: new Date(),
      updatedAt: new Date(),
      color: SCENARIO_COLORS[scenarios.length % SCENARIO_COLORS.length],
    };

    setScenarios(prev => [...prev, newScenario]);
    setSelectedScenarioId(newScenario.id);
  }, [scenarios.length, maxScenarios]);

  const handleDeleteScenario = useCallback((scenarioId: string) => {
    if (scenarios.length <= 1) return;

    setScenarios(prev => {
      const filtered = prev.filter(s => s.id !== scenarioId);
      if (selectedScenarioId === scenarioId) {
        setSelectedScenarioId(filtered[0].id);
      }
      return filtered;
    });
  }, [scenarios.length, selectedScenarioId]);

  const handleUpdateScenario = useCallback((scenarioId: string, updates: Partial<Scenario>) => {
    setScenarios(prev =>
      prev.map(s =>
        s.id === scenarioId
          ? { ...s, ...updates, updatedAt: new Date() }
          : s
      )
    );
  }, []);

  const handleAddEvent = useCallback((event: ScenarioEvent) => {
    setScenarios(prev =>
      prev.map(s =>
        s.id === selectedScenarioId
          ? { ...s, events: [...s.events, event], updatedAt: new Date() }
          : s
      )
    );
    setIsEventDialogOpen(false);
    setEditingEvent(undefined);
  }, [selectedScenarioId]);

  const handleUpdateEvent = useCallback((event: ScenarioEvent) => {
    setScenarios(prev =>
      prev.map(s =>
        s.id === selectedScenarioId
          ? {
              ...s,
              events: s.events.map(e => e.id === event.id ? event : e),
              updatedAt: new Date(),
            }
          : s
      )
    );
    setIsEventDialogOpen(false);
    setEditingEvent(undefined);
  }, [selectedScenarioId]);

  const handleDeleteEvent = useCallback((eventId: string) => {
    setScenarios(prev =>
      prev.map(s =>
        s.id === selectedScenarioId
          ? { ...s, events: s.events.filter(e => e.id !== eventId), updatedAt: new Date() }
          : s
      )
    );
  }, [selectedScenarioId]);

  const handleDragStart = useCallback((eventId: string) => {
    setDragState({ draggedId: eventId, dragOverId: null });
  }, []);

  const handleDragOver = useCallback((eventId: string) => {
    setDragState(prev => ({ ...prev, dragOverId: eventId }));
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragState.draggedId || !dragState.dragOverId || dragState.draggedId === dragState.dragOverId) {
      setDragState({ draggedId: null, dragOverId: null });
      return;
    }

    setScenarios(prev =>
      prev.map(s => {
        if (s.id !== selectedScenarioId) return s;

        const events = [...s.events];
        const draggedIndex = events.findIndex(e => e.id === dragState.draggedId);
        const targetIndex = events.findIndex(e => e.id === dragState.dragOverId);

        if (draggedIndex === -1 || targetIndex === -1) return s;

        const [draggedEvent] = events.splice(draggedIndex, 1);
        events.splice(targetIndex, 0, draggedEvent);

        return { ...s, events, updatedAt: new Date() };
      })
    );

    setDragState({ draggedId: null, dragOverId: null });
  }, [dragState, selectedScenarioId]);

  const handleShare = useCallback((scenario: Scenario) => {
    const encoded = encodeScenarioToURL(scenario);
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/scenario?data=${encoded}`;
    setShareUrl(url);
    setIsShareDialogOpen(true);
  }, []);

  const handleCopyShareUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  }, [shareUrl]);

  const handleImportScenario = useCallback(() => {
    const decoded = decodeScenarioFromURL(importData);
    if (!decoded) return;

    const newScenario: Scenario = {
      id: generateId(),
      name: decoded.name || "Imported Scenario",
      description: decoded.description,
      events: decoded.events || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      color: SCENARIO_COLORS[scenarios.length % SCENARIO_COLORS.length],
    };

    setScenarios(prev => [...prev.slice(0, maxScenarios - 1), newScenario]);
    setSelectedScenarioId(newScenario.id);
    setImportData("");
  }, [importData, scenarios.length, maxScenarios]);

  const handleExportScenarios = useCallback(() => {
    const data = JSON.stringify(scenarios, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "retirement-scenarios.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [scenarios]);

  // Effects
  useEffect(() => {
    onScenariosChange?.(scenarios);
  }, [scenarios, onScenariosChange]);

  // Check for shared scenario in URL
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const data = params.get("data");
    if (data) {
      const decoded = decodeScenarioFromURL(data);
      if (decoded) {
        const newScenario: Scenario = {
          id: generateId(),
          name: decoded.name || "Shared Scenario",
          description: decoded.description,
          events: decoded.events || [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          color: SCENARIO_COLORS[1],
        };
        setScenarios(prev => {
          // Add to existing scenarios if room, otherwise replace second
          if (prev.length < maxScenarios) {
            return [...prev, newScenario];
          }
          return [prev[0], newScenario, ...prev.slice(2)];
        });
        setSelectedScenarioId(newScenario.id);
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [maxScenarios]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              What-If Scenario Builder
            </CardTitle>
            <CardDescription>
              Model any financial future with custom events and compare up to {maxScenarios} scenarios
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-2 space-y-2">
                  <Label htmlFor="import-data">Paste scenario code</Label>
                  <Input
                    id="import-data"
                    placeholder="Paste encoded scenario..."
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!importData}
                    onClick={handleImportScenario}
                  >
                    Import Scenario
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleExportScenarios}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Scenario Selector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Scenarios ({scenarios.length}/{maxScenarios})</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddScenario}
              disabled={scenarios.length >= maxScenarios}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Scenario
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {scenarios.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isSelected={scenario.id === selectedScenarioId}
                onSelect={() => setSelectedScenarioId(scenario.id)}
                onEdit={() => {
                  // Could open a scenario edit dialog
                  const newName = prompt("Scenario name:", scenario.name);
                  if (newName) {
                    handleUpdateScenario(scenario.id, { name: newName });
                  }
                }}
                onDuplicate={() => handleDuplicateScenario(scenario)}
                onDelete={() => handleDeleteScenario(scenario.id)}
                onShare={() => handleShare(scenario)}
                comparison={comparisons[scenario.id]}
              />
            ))}
          </div>
        </div>

        {/* Tabs for Events / Compare */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "events" | "compare")}>
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="events" className="gap-2">
              <Calendar className="w-4 h-4" />
              Events Timeline
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Compare Scenarios
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            {/* Timeline Visualization */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {selectedScenario.name} Timeline
                  </CardTitle>
                  <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setEditingEvent(undefined)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Event
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>
                          {editingEvent ? "Edit Event" : "Add Life Event"}
                        </DialogTitle>
                        <DialogDescription>
                          Define a financial event that impacts your retirement planning
                        </DialogDescription>
                      </DialogHeader>
                      <EventForm
                        event={editingEvent}
                        onSave={editingEvent ? handleUpdateEvent : handleAddEvent}
                        onCancel={() => {
                          setIsEventDialogOpen(false);
                          setEditingEvent(undefined);
                        }}
                        currentAge={currentAge}
                        retirementAge={retirementAge}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <TimelineVisualization
                  events={selectedScenario.events}
                  currentAge={currentAge}
                  retirementAge={retirementAge}
                />
              </CardContent>
            </Card>

            {/* Events List */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Events ({selectedScenario.events.length})
              </h4>

              {selectedScenario.events.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Gift className="w-12 h-12 text-muted-foreground/50 mb-4" />
                    <p className="text-sm font-medium mb-1">No events yet</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add income changes, windfalls, or large expenses
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingEvent(undefined);
                        setIsEventDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Event
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {selectedScenario.events.map(event => (
                    <EventItem
                      key={event.id}
                      event={event}
                      onEdit={(e) => {
                        setEditingEvent(e);
                        setIsEventDialogOpen(true);
                      }}
                      onDelete={handleDeleteEvent}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      isDragging={dragState.draggedId === event.id}
                      isDragOver={dragState.dragOverId === event.id}
                      currentAge={currentAge}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Quick Add Templates */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Quick Add Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: "Job Promotion", type: "income_increase", category: "career", amount: 15000 },
                    { name: "Home Purchase", type: "large_expense", category: "housing", amount: 50000 },
                    { name: "Kid's College", type: "expense_increase", category: "education", amount: 25000, frequency: "annual" as EventFrequency },
                    { name: "Inheritance", type: "windfall", category: "family", amount: 100000 },
                    { name: "New Car", type: "large_expense", category: "transportation", amount: 35000 },
                    { name: "Side Business", type: "income_increase", category: "career", amount: 2000, frequency: "monthly" as EventFrequency },
                  ].map((template) => (
                    <Button
                      key={template.name}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setEditingEvent({
                          id: "",
                          name: template.name,
                          type: template.type as EventType,
                          category: template.category as EventCategory,
                          amount: template.amount,
                          frequency: template.frequency || "one_time",
                          startAge: currentAge + 5,
                          inflationAdjusted: true,
                        });
                        setIsEventDialogOpen(true);
                      }}
                    >
                      {CATEGORY_CONFIG[template.category as EventCategory].icon}
                      <span className="ml-1">{template.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Scenario Comparison</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComparisonChart(!showComparisonChart)}
                  >
                    {showComparisonChart ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide Chart
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Show Chart
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showComparisonChart && (
                  <div className="h-64 mb-6 bg-muted/30 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <LineChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Comparison chart visualization</p>
                      <p className="text-xs">Integrate with your charting library (Recharts)</p>
                    </div>
                  </div>
                )}

                {/* Comparison Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Scenario</th>
                        <th className="text-right py-3 px-4 font-medium">Events</th>
                        <th className="text-right py-3 px-4 font-medium">Success Rate</th>
                        <th className="text-right py-3 px-4 font-medium">End Balance</th>
                        <th className="text-right py-3 px-4 font-medium">Monthly Income</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeScenarios.map(scenario => {
                        const comparison = comparisons[scenario.id];
                        const finalBalance = comparison?.projectedBalance[comparison.projectedBalance.length - 1] || 0;

                        return (
                          <tr
                            key={scenario.id}
                            className={cn(
                              "border-b hover:bg-muted/50 transition-colors",
                              scenario.id === selectedScenarioId && "bg-muted/30"
                            )}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: scenario.color }}
                                />
                                <span className="font-medium">{scenario.name}</span>
                              </div>
                            </td>
                            <td className="text-right py-3 px-4">
                              {scenario.events.length}
                            </td>
                            <td className="text-right py-3 px-4">
                              <span className={cn(
                                "font-semibold",
                                (comparison?.successRate || 0) >= 90 ? "text-green-600" :
                                (comparison?.successRate || 0) >= 70 ? "text-yellow-600" : "text-red-600"
                              )}>
                                {comparison?.successRate.toFixed(0)}%
                              </span>
                            </td>
                            <td className="text-right py-3 px-4 font-medium">
                              {fmt(finalBalance)}
                            </td>
                            <td className="text-right py-3 px-4">
                              {fmtFull(comparison?.monthlyIncome || 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {activeScenarios.length >= 2 && (
                  <div className="mt-4 p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium text-sm mb-2">Key Insights</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {(() => {
                        const sorted = [...activeScenarios].sort(
                          (a, b) => (comparisons[b.id]?.successRate || 0) - (comparisons[a.id]?.successRate || 0)
                        );
                        const best = sorted[0];
                        const worst = sorted[sorted.length - 1];
                        const diff = (comparisons[best.id]?.successRate || 0) - (comparisons[worst.id]?.successRate || 0);

                        return (
                          <>
                            <li className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span>
                                <strong>{best.name}</strong> has the highest success rate at{" "}
                                {comparisons[best.id]?.successRate.toFixed(0)}%
                              </span>
                            </li>
                            {diff > 10 && (
                              <li className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <span>
                                  There is a {diff.toFixed(0)}% difference in success rates between your best and worst scenarios
                                </span>
                              </li>
                            )}
                          </>
                        );
                      })()}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex justify-between border-t pt-6">
        <div className="text-xs text-muted-foreground">
          Last updated: {selectedScenario.updatedAt.toLocaleDateString()}
        </div>
        <Button onClick={() => onCompare?.(activeScenarios)}>
          <BarChart3 className="w-4 h-4 mr-2" />
          Run Full Analysis
        </Button>
      </CardFooter>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Share Scenario</DialogTitle>
            <DialogDescription>
              Share this scenario with anyone using the link below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="font-mono text-xs"
              />
              <Button size="icon" onClick={handleCopyShareUrl}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link contains your scenario configuration. Anyone with this link can import it into their own scenario builder.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ScenarioBuilder;
