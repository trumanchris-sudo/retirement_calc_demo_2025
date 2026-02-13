"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  TrendingUp,
  DollarSign,
  Calendar,
  PiggyBank,
  Target,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
  Shield,
  Users,
} from "lucide-react";
import {
  analyzeOptimizations,
  getTopRecommendations,
  type Recommendation,
  type RecommendationCategory,
  type RecommendationPriority,
  type OptimizationInputs,
  type OptimizationResult,
} from "@/lib/calculations/optimizationEngine";

// ===============================
// Types
// ===============================

interface OptimizationPanelProps {
  inputs: OptimizationInputs;
  maxRecommendations?: number;
  showAllCategories?: boolean;
}

// ===============================
// Utility Functions
// ===============================

const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value.toLocaleString()}`;
};

const formatFullCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// ===============================
// Category Configuration
// ===============================

const categoryConfig: Record<RecommendationCategory, {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  roth: {
    icon: TrendingUp,
    label: "Roth Conversion",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-900",
  },
  contribution: {
    icon: PiggyBank,
    label: "Contribution Order",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-900",
  },
  tax: {
    icon: Target,
    label: "Tax Strategy",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-900",
  },
  ss: {
    icon: Users,
    label: "Social Security",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-900",
  },
  withdrawal: {
    icon: Shield,
    label: "Withdrawal Strategy",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-950/30",
    borderColor: "border-teal-200 dark:border-teal-900",
  },
};

const priorityConfig: Record<RecommendationPriority, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  high: {
    label: "High Priority",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  medium: {
    label: "Medium Priority",
    color: "text-yellow-700 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  low: {
    label: "Low Priority",
    color: "text-gray-700 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
  },
};

// ===============================
// Recommendation Card Component
// ===============================

interface RecommendationCardProps {
  recommendation: Recommendation;
  index: number;
}

function RecommendationCard({ recommendation, index }: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const category = categoryConfig[recommendation.category];
  const priority = priorityConfig[recommendation.priority];
  const CategoryIcon = category.icon;

  const impactIsPositive = recommendation.impact > 0;

  return (
    <div
      className={`rounded-lg border-2 ${category.borderColor} ${category.bgColor} overflow-hidden transition-all duration-200 hover:shadow-md`}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          {/* Rank Badge */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {index + 1}
            </span>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CategoryIcon className={`h-4 w-4 ${category.color} flex-shrink-0`} />
              <Badge
                variant="outline"
                className={`text-xs ${priority.color} ${priority.bgColor} border-0`}
              >
                {recommendation.priority === 'high' && (
                  <Zap className="h-3 w-3 mr-1" />
                )}
                {priority.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {category.label}
              </Badge>
            </div>

            <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
              {recommendation.title}
            </h4>

            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {recommendation.description}
            </p>
          </div>

          {/* Impact & Expand */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div
              className={`text-right ${
                impactIsPositive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Lifetime Impact
              </div>
              <div className="text-lg font-bold">
                {impactIsPositive ? "+" : ""}
                {formatCurrency(recommendation.impact)}
              </div>
            </div>

            <button
              className="p-1 rounded hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200/50 dark:border-gray-700/50 pt-4 space-y-4">
          {/* Action Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                Action to Take
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {recommendation.action}
            </p>
          </div>

          {/* Metadata Details */}
          {recommendation.metadata && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recommendation.metadata.currentValue !== undefined && (
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Current
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {typeof recommendation.metadata.currentValue === 'number'
                      ? formatFullCurrency(recommendation.metadata.currentValue)
                      : recommendation.metadata.currentValue}
                  </div>
                </div>
              )}

              {recommendation.metadata.recommendedValue !== undefined && (
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Recommended
                  </div>
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {typeof recommendation.metadata.recommendedValue === 'number'
                      ? formatFullCurrency(recommendation.metadata.recommendedValue)
                      : recommendation.metadata.recommendedValue}
                  </div>
                </div>
              )}

              {recommendation.metadata.bracketRate !== undefined && (
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Tax Bracket
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {(recommendation.metadata.bracketRate * 100).toFixed(0)}%
                  </div>
                </div>
              )}

              {recommendation.metadata.yearsAffected !== undefined && (
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Years Affected
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {recommendation.metadata.yearsAffected}
                  </div>
                </div>
              )}

              {recommendation.metadata.annualBenefit !== undefined && (
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Annual Benefit
                  </div>
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {formatFullCurrency(recommendation.metadata.annualBenefit)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              This recommendation is based on your current inputs and general tax rules.
              Consult a qualified tax advisor before implementing any strategy.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ===============================
// Summary Stats Component
// ===============================

interface SummaryStatsProps {
  result: OptimizationResult;
}

function SummaryStats({ result }: SummaryStatsProps) {
  const highPriorityCount = result.recommendations.filter(
    (r) => r.priority === "high"
  ).length;

  const categoryBreakdown = result.recommendations.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {} as Record<RecommendationCategory, number>);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 text-center border border-green-200 dark:border-green-900">
        <div className="text-xs text-green-700 dark:text-green-400 mb-1">
          Total Potential Impact
        </div>
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {formatCurrency(result.totalPotentialImpact)}
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 text-center border border-red-200 dark:border-red-900">
        <div className="text-xs text-red-700 dark:text-red-400 mb-1">
          High Priority Actions
        </div>
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
          {highPriorityCount}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-center border border-blue-200 dark:border-blue-900">
        <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">
          Total Recommendations
        </div>
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {result.recommendations.length}
        </div>
      </div>

      <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 text-center border border-purple-200 dark:border-purple-900">
        <div className="text-xs text-purple-700 dark:text-purple-400 mb-1">
          Categories Analyzed
        </div>
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {Object.keys(categoryBreakdown).length}
        </div>
      </div>
    </div>
  );
}

// ===============================
// Main Component
// ===============================

export function OptimizationPanel({
  inputs,
  maxRecommendations = 5,
  showAllCategories = false,
}: OptimizationPanelProps) {
  const [showAll, setShowAll] = useState(showAllCategories);

  // Run analysis
  const result = useMemo(() => analyzeOptimizations(inputs), [inputs]);

  // Get recommendations to display
  const displayedRecommendations = useMemo(() => {
    if (showAll) {
      return result.recommendations;
    }
    return getTopRecommendations(result, maxRecommendations);
  }, [result, showAll, maxRecommendations]);

  const hasMoreRecommendations = result.recommendations.length > maxRecommendations;

  if (result.recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Optimization Recommendations
          </CardTitle>
          <CardDescription>
            Personalized strategies to maximize your retirement wealth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-6 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
            <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-green-900 dark:text-green-100">
                Your plan looks optimized!
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Based on your current inputs, we don't have specific optimization recommendations.
                Continue monitoring as your situation changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Optimization Recommendations
        </CardTitle>
        <CardDescription>
          Specific actions to maximize your retirement wealth and minimize taxes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <SummaryStats result={result} />

        {/* Header with CTA */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {showAll
              ? `All Recommendations (${result.recommendations.length})`
              : `Top ${Math.min(maxRecommendations, result.recommendations.length)} Actions`}
          </h3>

          {hasMoreRecommendations && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1"
            >
              {showAll ? (
                <>
                  Show Less
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Show All ({result.recommendations.length})
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Recommendations List */}
        <div className="space-y-4">
          {displayedRecommendations.map((recommendation, index) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              index={index}
            />
          ))}
        </div>

        {/* Quick Actions CTA */}
        {result.recommendations.filter((r) => r.priority === "high").length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
            <div className="flex items-start gap-3">
              <Zap className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Quick Win: Start with High Priority Actions
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Focus on the{" "}
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {result.recommendations.filter((r) => r.priority === "high").length} high priority
                  </span>{" "}
                  recommendations first. These typically have the largest impact on your retirement outcome
                  and are often time-sensitive opportunities.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-4 border-t">
          These recommendations are for educational purposes and based on general tax principles.
          Individual circumstances vary significantly. Please consult with qualified financial and tax
          advisors before implementing any strategy.
        </div>
      </CardContent>
    </Card>
  );
}

// ===============================
// Compact Version for Sidebars
// ===============================

interface CompactOptimizationPanelProps {
  inputs: OptimizationInputs;
  maxRecommendations?: number;
}

export function CompactOptimizationPanel({
  inputs,
  maxRecommendations = 3,
}: CompactOptimizationPanelProps) {
  const result = useMemo(() => analyzeOptimizations(inputs), [inputs]);
  const topRecommendations = getTopRecommendations(result, maxRecommendations);

  if (topRecommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Quick Wins
        </span>
        <Badge variant="outline" className="text-xs">
          {formatCurrency(result.totalPotentialImpact)} potential
        </Badge>
      </div>

      <div className="space-y-2">
        {topRecommendations.map((rec) => {
          const category = categoryConfig[rec.category];
          const CategoryIcon = category.icon;

          return (
            <div
              key={rec.id}
              className={`p-3 rounded-lg border ${category.borderColor} ${category.bgColor}`}
            >
              <div className="flex items-start gap-2">
                <CategoryIcon className={`h-4 w-4 ${category.color} mt-0.5 flex-shrink-0`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                    {rec.title}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    +{formatCurrency(rec.impact)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OptimizationPanel;
