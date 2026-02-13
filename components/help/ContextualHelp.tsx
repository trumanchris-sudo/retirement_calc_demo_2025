'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { HelpCircle, AlertTriangle, ExternalLink, PlayCircle, ChevronDown, ChevronUp, Lightbulb, BookOpen, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Warning severity levels
 */
export type WarningSeverity = 'info' | 'warning' | 'critical';

/**
 * Threshold type for value warnings
 */
export interface ValueThreshold {
  min?: number;
  max?: number;
  typicalMin?: number;
  typicalMax?: number;
  severity?: WarningSeverity;
  message?: string;
}

/**
 * Related tip based on current values
 */
export interface RelatedTip {
  condition: (value: number, allValues?: Record<string, number>) => boolean;
  title: string;
  content: string;
  learnMoreUrl?: string;
}

/**
 * Video tutorial link
 */
export interface VideoTutorial {
  title: string;
  url: string;
  duration?: string;
  thumbnail?: string;
}

/**
 * Education content link
 */
export interface EducationLink {
  title: string;
  url: string;
  description?: string;
  type?: 'article' | 'calculator' | 'guide' | 'video';
}

/**
 * Complete help content configuration for a field
 */
export interface HelpContent {
  /** Unique field identifier */
  fieldId: string;
  /** Short label for the field */
  label: string;
  /** Main explanation of what this field does */
  explanation: string;
  /** Why this value matters for retirement planning */
  importance?: string;
  /** How to determine the right value */
  guidance?: string;
  /** Example scenarios with different values */
  examples?: Array<{ value: string; description: string }>;
  /** Value thresholds for warnings */
  thresholds?: ValueThreshold;
  /** Related tips based on current value */
  relatedTips?: RelatedTip[];
  /** Links to educational content */
  educationLinks?: EducationLink[];
  /** Video tutorials */
  videos?: VideoTutorial[];
  /** Related fields that affect this one */
  relatedFields?: string[];
  /** Category for grouping */
  category?: 'personal' | 'income' | 'savings' | 'rates' | 'retirement' | 'healthcare' | 'advanced';
}

/**
 * Props for the ContextualHelp component
 */
export interface ContextualHelpProps {
  /** The help content configuration */
  content: HelpContent;
  /** Current value of the field (for dynamic tips) */
  currentValue?: number;
  /** All field values (for cross-field tips) */
  allValues?: Record<string, number>;
  /** Position of the help icon */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment of the popover */
  align?: 'start' | 'center' | 'end';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className for the trigger */
  className?: string;
  /** Whether to show inline (no popover, just icon + tooltip) */
  inline?: boolean;
  /** Show warning indicator when value is unusual */
  showWarning?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a value is within typical range
 */
function getValueWarning(
  value: number | undefined,
  thresholds: ValueThreshold | undefined
): { isUnusual: boolean; severity: WarningSeverity; message: string } | null {
  if (value === undefined || !thresholds) return null;

  // Check hard limits first
  if (thresholds.min !== undefined && value < thresholds.min) {
    return {
      isUnusual: true,
      severity: thresholds.severity || 'critical',
      message: thresholds.message || `Value is below minimum (${thresholds.min})`,
    };
  }
  if (thresholds.max !== undefined && value > thresholds.max) {
    return {
      isUnusual: true,
      severity: thresholds.severity || 'critical',
      message: thresholds.message || `Value exceeds maximum (${thresholds.max})`,
    };
  }

  // Check typical range
  if (thresholds.typicalMin !== undefined && value < thresholds.typicalMin) {
    return {
      isUnusual: true,
      severity: 'warning',
      message: thresholds.message || `Value is unusually low. Typical range: ${thresholds.typicalMin}${thresholds.typicalMax ? `-${thresholds.typicalMax}` : '+'}`,
    };
  }
  if (thresholds.typicalMax !== undefined && value > thresholds.typicalMax) {
    return {
      isUnusual: true,
      severity: 'warning',
      message: thresholds.message || `Value is unusually high. Typical range: ${thresholds.typicalMin || 0}-${thresholds.typicalMax}`,
    };
  }

  return null;
}

/**
 * Get applicable tips based on current values
 */
function getApplicableTips(
  tips: RelatedTip[] | undefined,
  currentValue: number | undefined,
  allValues?: Record<string, number>
): RelatedTip[] {
  if (!tips || currentValue === undefined) return [];
  return tips.filter((tip) => tip.condition(currentValue, allValues));
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Warning indicator badge
 */
function WarningBadge({
  severity,
  message,
  size = 'md',
}: {
  severity: WarningSeverity;
  message: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const colorClasses = {
    info: 'text-blue-500',
    warning: 'text-amber-500',
    critical: 'text-red-500',
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center', colorClasses[severity])}>
            <AlertTriangle className={cn(sizeClasses[size], 'animate-pulse')} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Education link item
 */
function EducationLinkItem({ link }: { link: EducationLink }) {
  const typeIcons = {
    article: BookOpen,
    calculator: TrendingUp,
    guide: Lightbulb,
    video: PlayCircle,
  };
  const Icon = typeIcons[link.type || 'article'];

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group"
      onClick={(e) => e.stopPropagation()}
    >
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {link.title}
          </span>
          <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {link.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{link.description}</p>
        )}
      </div>
    </a>
  );
}

/**
 * Video tutorial card
 */
function VideoTutorialCard({ video }: { video: VideoTutorial }) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-2 rounded-md border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex-shrink-0 w-12 h-8 bg-muted rounded flex items-center justify-center">
        <PlayCircle className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground line-clamp-1">{video.title}</span>
        {video.duration && (
          <span className="text-xs text-muted-foreground">{video.duration}</span>
        )}
      </div>
    </a>
  );
}

/**
 * Related tip card
 */
function RelatedTipCard({ tip }: { tip: RelatedTip }) {
  return (
    <div className="flex items-start gap-2 p-2 bg-primary/5 border border-primary/20 rounded-md">
      <Lightbulb className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground">{tip.title}</span>
        <p className="text-xs text-muted-foreground mt-0.5">{tip.content}</p>
        {tip.learnMoreUrl && (
          <a
            href={tip.learnMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
            onClick={(e) => e.stopPropagation()}
          >
            Learn more <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * ContextualHelp - Smart help system for input fields
 *
 * Features:
 * 1. ? icon next to input fields
 * 2. Hover/click to see explanation
 * 3. "Learn more" links to education content
 * 4. Related tips based on current values
 * 5. Warning indicators for unusual values
 * 6. Video tutorial links
 */
export function ContextualHelp({
  content,
  currentValue,
  allValues,
  side = 'right',
  align = 'start',
  size = 'md',
  className,
  inline = false,
  showWarning = true,
}: ContextualHelpProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check for value warnings
  const valueWarning = useMemo(
    () => getValueWarning(currentValue, content.thresholds),
    [currentValue, content.thresholds]
  );

  // Get applicable tips
  const applicableTips = useMemo(
    () => getApplicableTips(content.relatedTips, currentValue, allValues),
    [content.relatedTips, currentValue, allValues]
  );

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const buttonSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7',
  };

  // Inline mode - just show tooltip on hover
  if (inline) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                buttonSizeClasses[size],
                'hover:bg-muted',
                className
              )}
              aria-label={`Help for ${content.label}`}
            >
              {showWarning && valueWarning ? (
                <AlertTriangle
                  className={cn(
                    sizeClasses[size],
                    valueWarning.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                  )}
                />
              ) : (
                <HelpCircle className={cn(sizeClasses[size], 'text-muted-foreground hover:text-foreground')} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side={side} className="max-w-sm">
            <div className="space-y-1">
              <p className="font-medium">{content.label}</p>
              <p className="text-sm text-muted-foreground">{content.explanation}</p>
              {valueWarning && (
                <p className={cn(
                  'text-sm font-medium',
                  valueWarning.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                )}>
                  {valueWarning.message}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full popover mode
  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      {/* Warning badge (separate from help icon) */}
      {showWarning && valueWarning && (
        <WarningBadge severity={valueWarning.severity} message={valueWarning.message} size={size} />
      )}

      {/* Help popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              buttonSizeClasses[size],
              'hover:bg-muted'
            )}
            aria-label={`Help for ${content.label}`}
          >
            <HelpCircle className={cn(sizeClasses[size], 'text-muted-foreground hover:text-foreground')} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={side}
          align={align}
          className="w-80 max-h-[70vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="space-y-1">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                {content.label}
                {content.category && (
                  <span className="text-xs px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground capitalize">
                    {content.category}
                  </span>
                )}
              </h4>
              <p className="text-sm text-muted-foreground">{content.explanation}</p>
            </div>

            {/* Warning message if applicable */}
            {valueWarning && (
              <div
                className={cn(
                  'flex items-start gap-2 p-2 rounded-md',
                  valueWarning.severity === 'critical'
                    ? 'bg-red-500/10 border border-red-500/20'
                    : valueWarning.severity === 'warning'
                    ? 'bg-amber-500/10 border border-amber-500/20'
                    : 'bg-blue-500/10 border border-blue-500/20'
                )}
              >
                <AlertTriangle
                  className={cn(
                    'w-4 h-4 mt-0.5 flex-shrink-0',
                    valueWarning.severity === 'critical'
                      ? 'text-red-500'
                      : valueWarning.severity === 'warning'
                      ? 'text-amber-500'
                      : 'text-blue-500'
                  )}
                />
                <p className="text-sm">{valueWarning.message}</p>
              </div>
            )}

            {/* Related tips based on current value */}
            {applicableTips.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tips for Your Value
                </h5>
                <div className="space-y-2">
                  {applicableTips.map((tip, index) => (
                    <RelatedTipCard key={index} tip={tip} />
                  ))}
                </div>
              </div>
            )}

            {/* Expandable details */}
            {(content.importance || content.guidance || content.examples) && (
              <div className="space-y-2">
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {isExpanded ? 'Show less' : 'Show more details'}
                </button>

                {isExpanded && (
                  <div className="space-y-3 pl-4 border-l-2 border-muted">
                    {/* Why it matters */}
                    {content.importance && (
                      <div className="space-y-1">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Why It Matters
                        </h5>
                        <p className="text-sm">{content.importance}</p>
                      </div>
                    )}

                    {/* Guidance */}
                    {content.guidance && (
                      <div className="space-y-1">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          How to Decide
                        </h5>
                        <p className="text-sm">{content.guidance}</p>
                      </div>
                    )}

                    {/* Examples */}
                    {content.examples && content.examples.length > 0 && (
                      <div className="space-y-1">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Examples
                        </h5>
                        <ul className="space-y-1">
                          {content.examples.map((example, index) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <span className="font-mono text-primary">{example.value}</span>
                              <span className="text-muted-foreground">{example.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Video tutorials */}
            {content.videos && content.videos.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <PlayCircle className="w-3 h-3" />
                  Video Tutorials
                </h5>
                <div className="space-y-2">
                  {content.videos.map((video, index) => (
                    <VideoTutorialCard key={index} video={video} />
                  ))}
                </div>
              </div>
            )}

            {/* Education links */}
            {content.educationLinks && content.educationLinks.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  Learn More
                </h5>
                <div className="-mx-2">
                  {content.educationLinks.map((link, index) => (
                    <EducationLinkItem key={index} link={link} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ============================================================================
// PRESET HELP CONTENT FOR COMMON RETIREMENT FIELDS
// ============================================================================

/**
 * Pre-configured help content for common retirement calculator fields
 */
export const HELP_CONTENT: Record<string, HelpContent> = {
  // Personal Information
  currentAge: {
    fieldId: 'currentAge',
    label: 'Current Age',
    category: 'personal',
    explanation: 'Your current age, used to calculate how many years until retirement and the duration of your retirement period.',
    importance: 'This determines your investment timeline and affects optimal asset allocation strategies.',
    guidance: 'Enter your age as of your last birthday. The calculator will project forward from this point.',
    thresholds: {
      min: 18,
      max: 100,
      typicalMin: 20,
      typicalMax: 75,
    },
    relatedTips: [
      {
        condition: (v) => v < 30,
        title: 'Time is on your side',
        content: 'With decades until retirement, you can afford to take more investment risk for potentially higher returns.',
        learnMoreUrl: '#',
      },
      {
        condition: (v) => v >= 55 && v < 65,
        title: 'Catch-up contributions available',
        content: 'You may be eligible for catch-up contributions to 401(k) and IRA accounts.',
        learnMoreUrl: '#',
      },
    ],
    educationLinks: [
      {
        title: 'Age-Based Investment Strategies',
        url: '#',
        description: 'How your age should influence your portfolio allocation',
        type: 'article',
      },
    ],
  },

  retirementAge: {
    fieldId: 'retirementAge',
    label: 'Target Retirement Age',
    category: 'personal',
    explanation: 'The age at which you plan to stop working and begin drawing from your retirement savings.',
    importance: 'This determines your accumulation period and affects Social Security benefits, Medicare eligibility, and withdrawal strategies.',
    guidance: 'Consider your desired lifestyle, health, career satisfaction, and financial readiness. Earlier retirement means more years to fund.',
    thresholds: {
      min: 50,
      max: 80,
      typicalMin: 55,
      typicalMax: 70,
    },
    examples: [
      { value: '55', description: 'Early retirement - need larger savings' },
      { value: '62', description: 'Early Social Security (reduced benefits)' },
      { value: '65', description: 'Medicare eligible' },
      { value: '67', description: 'Full Social Security for many' },
      { value: '70', description: 'Maximum Social Security benefits' },
    ],
    relatedTips: [
      {
        condition: (v) => v < 62,
        title: 'Healthcare gap',
        content: 'Retiring before 65 means you\'ll need to plan for healthcare coverage before Medicare.',
        learnMoreUrl: '#',
      },
      {
        condition: (v) => v > 70,
        title: 'Working longer benefits',
        content: 'Each year you delay retirement means more savings and fewer withdrawal years.',
      },
    ],
    videos: [
      {
        title: 'When Can You Actually Retire?',
        url: '#',
        duration: '8:32',
      },
    ],
    educationLinks: [
      {
        title: 'The 4% Rule Explained',
        url: '#',
        description: 'How withdrawal rates affect retirement timing',
        type: 'guide',
      },
      {
        title: 'Social Security Claiming Strategies',
        url: '#',
        description: 'Maximize your benefits based on claiming age',
        type: 'article',
      },
    ],
  },

  // Savings
  taxableBalance: {
    fieldId: 'taxableBalance',
    label: 'Taxable Brokerage Balance',
    category: 'savings',
    explanation: 'Your current balance in taxable investment accounts (not retirement accounts). These funds are subject to capital gains taxes when sold.',
    importance: 'Taxable accounts provide flexibility before age 59.5 and can be more tax-efficient for certain situations.',
    guidance: 'Include stocks, bonds, mutual funds, and ETFs held outside of retirement accounts. Do not include savings accounts or CDs.',
    thresholds: {
      min: 0,
      typicalMax: 10000000,
    },
    relatedTips: [
      {
        condition: (v) => v > 1000000,
        title: 'Tax-loss harvesting opportunity',
        content: 'With significant taxable investments, consider tax-loss harvesting strategies to reduce your tax burden.',
        learnMoreUrl: '#',
      },
    ],
    educationLinks: [
      {
        title: 'Taxable vs Tax-Advantaged Accounts',
        url: '#',
        description: 'Understanding when to use each account type',
        type: 'guide',
      },
    ],
  },

  pretaxBalance: {
    fieldId: 'pretaxBalance',
    label: 'Pre-Tax Balance (401k/IRA)',
    category: 'savings',
    explanation: 'Your current balance in traditional 401(k), 403(b), traditional IRA, or similar pre-tax retirement accounts.',
    importance: 'Pre-tax accounts reduce your taxable income now, but withdrawals are taxed as ordinary income in retirement.',
    guidance: 'Sum up all traditional retirement account balances. These funds will be subject to Required Minimum Distributions (RMDs) starting at age 73.',
    thresholds: {
      min: 0,
      typicalMax: 5000000,
    },
    relatedTips: [
      {
        condition: (v) => v > 500000,
        title: 'Consider Roth conversions',
        content: 'Large pre-tax balances may lead to significant RMDs and tax burden. Roth conversions could help.',
        learnMoreUrl: '#',
      },
      {
        condition: (v, all) => v > 0 && Boolean(all?.rothBalance) && (all?.rothBalance ?? 0) > v * 2,
        title: 'Good tax diversification',
        content: 'Your Roth balance significantly exceeds pre-tax, providing tax flexibility in retirement.',
      },
    ],
    videos: [
      {
        title: 'Understanding RMDs',
        url: '#',
        duration: '6:15',
      },
    ],
    educationLinks: [
      {
        title: 'Roth Conversion Strategies',
        url: '#',
        description: 'When and how much to convert from traditional to Roth',
        type: 'guide',
      },
    ],
  },

  rothBalance: {
    fieldId: 'rothBalance',
    label: 'Roth Balance',
    category: 'savings',
    explanation: 'Your current balance in Roth 401(k), Roth IRA, or similar after-tax retirement accounts.',
    importance: 'Roth accounts grow tax-free and qualified withdrawals are completely tax-free in retirement.',
    guidance: 'Include all Roth retirement account balances. Roth has no RMDs during your lifetime and provides tax-free income.',
    thresholds: {
      min: 0,
      typicalMax: 3000000,
    },
    relatedTips: [
      {
        condition: (v) => v < 100000,
        title: 'Build your tax-free bucket',
        content: 'Consider maximizing Roth contributions or conversions to build tax-free retirement income.',
        learnMoreUrl: '#',
      },
    ],
    educationLinks: [
      {
        title: 'Backdoor Roth IRA',
        url: '#',
        description: 'How high earners can contribute to Roth',
        type: 'guide',
      },
      {
        title: 'Mega Backdoor Roth',
        url: '#',
        description: 'Maximize Roth contributions through your 401(k)',
        type: 'article',
      },
    ],
  },

  // Rates
  expectedReturn: {
    fieldId: 'expectedReturn',
    label: 'Expected Return Rate',
    category: 'rates',
    explanation: 'The annual rate of return you expect on your investments before inflation.',
    importance: 'Even small differences in return rate significantly impact long-term wealth accumulation.',
    guidance: 'Historical stock market returns average 7-10% before inflation. Bond returns are typically 3-5%. Use conservative estimates.',
    thresholds: {
      min: 0,
      max: 20,
      typicalMin: 4,
      typicalMax: 10,
    },
    examples: [
      { value: '4%', description: 'Conservative (bond-heavy portfolio)' },
      { value: '6%', description: 'Moderate (balanced portfolio)' },
      { value: '7%', description: 'Growth-oriented (stock-heavy)' },
      { value: '10%', description: 'Aggressive (may be optimistic)' },
    ],
    relatedTips: [
      {
        condition: (v) => v > 10,
        title: 'Optimistic assumption',
        content: 'Returns above 10% are historically uncommon for sustained periods. Consider using a more conservative estimate.',
        learnMoreUrl: '#',
      },
      {
        condition: (v) => v < 4,
        title: 'Very conservative',
        content: 'This return is below historical averages even for bonds. Consider if this matches your investment strategy.',
      },
    ],
    videos: [
      {
        title: 'Historical Market Returns Explained',
        url: '#',
        duration: '10:45',
      },
    ],
    educationLinks: [
      {
        title: 'Sequence of Returns Risk',
        url: '#',
        description: 'Why average returns can be misleading',
        type: 'article',
      },
    ],
  },

  inflationRate: {
    fieldId: 'inflationRate',
    label: 'Inflation Rate',
    category: 'rates',
    explanation: 'The expected annual increase in the cost of living, which erodes the purchasing power of your savings.',
    importance: 'Inflation is the "silent killer" of retirement plans. Underestimating inflation can leave you short in later years.',
    guidance: 'Historical average is about 3%. Recent years have seen higher inflation. Consider using 3-4% for long-term planning.',
    thresholds: {
      min: 0,
      max: 15,
      typicalMin: 2,
      typicalMax: 5,
    },
    examples: [
      { value: '2%', description: 'Fed target (optimistic)' },
      { value: '3%', description: 'Historical average' },
      { value: '4%', description: 'Conservative estimate' },
    ],
    relatedTips: [
      {
        condition: (v) => v > 5,
        title: 'High inflation scenario',
        content: 'Sustained high inflation significantly impacts retirement needs. Consider inflation-protected investments like TIPS or I-Bonds.',
        learnMoreUrl: '#',
      },
    ],
    educationLinks: [
      {
        title: 'Protecting Against Inflation',
        url: '#',
        description: 'Investment strategies for inflationary environments',
        type: 'guide',
      },
    ],
  },

  withdrawalRate: {
    fieldId: 'withdrawalRate',
    label: 'Withdrawal Rate',
    category: 'retirement',
    explanation: 'The percentage of your portfolio you plan to withdraw annually in retirement, typically expressed as the first-year withdrawal.',
    importance: 'This is the most critical factor in determining if your money will last. Higher rates increase the risk of running out.',
    guidance: 'The traditional "4% rule" has been debated. Many planners now suggest 3-3.5% for early retirees or volatile markets.',
    thresholds: {
      min: 1,
      max: 10,
      typicalMin: 3,
      typicalMax: 5,
    },
    examples: [
      { value: '3%', description: 'Very safe, may leave large legacy' },
      { value: '4%', description: 'Traditional safe withdrawal rate' },
      { value: '5%', description: 'Higher risk, shorter timeline' },
    ],
    relatedTips: [
      {
        condition: (v) => v > 4.5,
        title: 'Consider flexibility',
        content: 'Higher withdrawal rates work better with flexible spending. Be prepared to reduce withdrawals in down markets.',
        learnMoreUrl: '#',
      },
      {
        condition: (v) => v < 3,
        title: 'Very conservative',
        content: 'You may be able to spend more or retire earlier with this low withdrawal rate.',
      },
    ],
    videos: [
      {
        title: 'The 4% Rule: Still Valid?',
        url: '#',
        duration: '12:30',
      },
      {
        title: 'Dynamic Withdrawal Strategies',
        url: '#',
        duration: '9:15',
      },
    ],
    educationLinks: [
      {
        title: 'Safe Withdrawal Rate Research',
        url: '#',
        description: 'The science behind sustainable retirement withdrawals',
        type: 'article',
      },
      {
        title: 'Guardrails Approach',
        url: '#',
        description: 'A flexible withdrawal strategy',
        type: 'guide',
      },
    ],
  },

  // Social Security
  socialSecurityIncome: {
    fieldId: 'socialSecurityIncome',
    label: 'Social Security Income',
    category: 'retirement',
    explanation: 'Your estimated annual Social Security benefit at your planned claiming age.',
    importance: 'Social Security provides inflation-adjusted income for life and is a cornerstone of most retirement plans.',
    guidance: 'Check your estimate at ssa.gov/myaccount. Benefits vary significantly based on earnings history and claiming age.',
    thresholds: {
      min: 0,
      max: 60000,
      typicalMin: 12000,
      typicalMax: 50000,
    },
    relatedTips: [
      {
        condition: (v) => v > 45000,
        title: 'Maximum benefit range',
        content: 'This is near the maximum benefit. Verify your estimate at ssa.gov to ensure accuracy.',
        learnMoreUrl: '#',
      },
      {
        condition: (v) => v < 15000,
        title: 'Consider spousal benefits',
        content: 'You may be eligible for spousal benefits up to 50% of your spouse\'s benefit if higher than your own.',
        learnMoreUrl: '#',
      },
    ],
    videos: [
      {
        title: 'Maximizing Social Security Benefits',
        url: '#',
        duration: '15:20',
      },
    ],
    educationLinks: [
      {
        title: 'Social Security Claiming Calculator',
        url: 'https://ssa.gov/myaccount',
        description: 'Official SSA benefit estimator',
        type: 'calculator',
      },
      {
        title: 'Spousal and Survivor Benefits',
        url: '#',
        description: 'Understanding benefits for married couples',
        type: 'guide',
      },
    ],
  },

  socialSecurityClaimAge: {
    fieldId: 'socialSecurityClaimAge',
    label: 'Social Security Claim Age',
    category: 'retirement',
    explanation: 'The age at which you plan to start receiving Social Security benefits.',
    importance: 'Each year you delay from 62 to 70 increases your benefit by approximately 6-8% permanently.',
    guidance: 'Consider your health, other income sources, and longevity expectations. Delaying is often beneficial but not always.',
    thresholds: {
      min: 62,
      max: 70,
    },
    examples: [
      { value: '62', description: 'Earliest - 30% reduction from FRA' },
      { value: '65', description: 'Before Medicare alignment' },
      { value: '67', description: 'Full retirement age (FRA) for many' },
      { value: '70', description: 'Maximum benefit - 32% increase from FRA' },
    ],
    relatedTips: [
      {
        condition: (v) => v === 62,
        title: 'Permanent reduction',
        content: 'Claiming at 62 permanently reduces your benefit by about 30%. Consider if delaying is possible.',
        learnMoreUrl: '#',
      },
      {
        condition: (v) => v === 70,
        title: 'Bridge strategy needed',
        content: 'Delaying to 70 means 8 years without SS. Ensure you have other income sources to bridge the gap.',
        learnMoreUrl: '#',
      },
    ],
    videos: [
      {
        title: 'When to Claim Social Security',
        url: '#',
        duration: '11:45',
      },
    ],
    educationLinks: [
      {
        title: 'Break-Even Analysis',
        url: '#',
        description: 'Calculating when delayed benefits pay off',
        type: 'calculator',
      },
    ],
  },
};

// ============================================================================
// HELPER HOOK
// ============================================================================

/**
 * Hook to easily get help content and check for warnings
 */
export function useContextualHelp(
  fieldId: string,
  currentValue?: number,
  customContent?: Partial<HelpContent>
) {
  const baseContent = HELP_CONTENT[fieldId];
  const content: HelpContent = {
    ...baseContent,
    ...customContent,
    fieldId,
    label: customContent?.label || baseContent?.label || fieldId,
    explanation: customContent?.explanation || baseContent?.explanation || 'Help content not available.',
  };

  const warning = useMemo(
    () => getValueWarning(currentValue, content.thresholds),
    [currentValue, content.thresholds]
  );

  return {
    content,
    hasWarning: warning !== null,
    warningSeverity: warning?.severity,
    warningMessage: warning?.message,
  };
}

// ============================================================================
// WRAPPER COMPONENT FOR INPUT FIELDS
// ============================================================================

/**
 * InputWithHelp - Wrapper component that adds contextual help to any input
 */
export interface InputWithHelpProps {
  /** The input element to wrap */
  children: React.ReactNode;
  /** Help content configuration */
  helpContent: HelpContent;
  /** Current value for dynamic tips */
  currentValue?: number;
  /** All values for cross-field tips */
  allValues?: Record<string, number>;
  /** Label for the input */
  label?: string;
  /** Additional className */
  className?: string;
  /** Position of help icon */
  helpPosition?: 'label' | 'input' | 'end';
}

export function InputWithHelp({
  children,
  helpContent,
  currentValue,
  allValues,
  label,
  className,
  helpPosition = 'label',
}: InputWithHelpProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
          {helpPosition === 'label' && (
            <ContextualHelp
              content={helpContent}
              currentValue={currentValue}
              allValues={allValues}
              size="sm"
            />
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1">{children}</div>
        {(helpPosition === 'input' || helpPosition === 'end') && (
          <ContextualHelp
            content={helpContent}
            currentValue={currentValue}
            allValues={allValues}
            size="sm"
          />
        )}
      </div>
    </div>
  );
}

export default ContextualHelp;
