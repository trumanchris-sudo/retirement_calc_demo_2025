'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Trophy,
  Sparkles,
  TrendingUp,
  Calendar,
  DollarSign,
  Shield,
  Target,
  ArrowRight,
  Share2,
  Twitter,
  Linkedin,
  Copy,
  Check,
  ChevronRight,
  Lightbulb,
  PiggyBank,
  LineChart,
  Settings,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AnimatedNumber, AnimatedCurrency, AnimatedPercentage } from '@/components/ui/AnimatedNumber'
import { cn } from '@/lib/utils'
import { fmt } from '@/lib/utils'
import type { CalculationResult } from '@/types/calculator'
import type { BatchSummary } from '@/types/planner'

// Confetti particle for celebration effect
interface ConfettiParticle {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  color: string
  delay: number
  duration: number
}

// Metric card data
interface MetricData {
  label: string
  value: number
  format: 'currency' | 'percentage' | 'years'
  icon: React.ComponentType<{ className?: string }>
  color: string
  description: string
  delay: number
}

// Next step card data
interface NextStepData {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: string
  onClick?: () => void
  href?: string
  color: string
}

// Insight data
interface InsightData {
  title: string
  description: string
  type: 'positive' | 'neutral' | 'actionable'
}

interface OnboardingCompleteProps {
  result: CalculationResult | null
  batchSummary: BatchSummary | null
  onContinue: () => void
  onExploreResults?: () => void
  onAdjustPlan?: () => void
  userName?: string
}

// Celebration confetti colors
const CONFETTI_COLORS = [
  '#a855f7', // purple-500
  '#8b5cf6', // violet-500
  '#6366f1', // indigo-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
]

// Generate confetti particles
function generateConfetti(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 20,
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 0.5,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
  }))
}

// Confetti component
function Confetti({ particles }: { particles: ConfettiParticle[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-3 h-3"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
            animation: `confetti-fall ${particle.duration}s ease-out ${particle.delay}s forwards`,
            opacity: 0,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg);
          }
        }
      `}</style>
    </div>
  )
}

// Pulsing glow ring animation
function GlowRing({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="absolute inset-0 rounded-full border-2 border-purple-400/50"
      style={{
        animation: `glow-ring 2s ease-out ${delay}s infinite`,
      }}
    >
      <style jsx>{`
        @keyframes glow-ring {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

// Animated metric reveal card
function MetricCard({ metric, isVisible }: { metric: MetricData; isVisible: boolean }) {
  const Icon = metric.icon

  const formatValue = useCallback((value: number) => {
    switch (metric.format) {
      case 'currency':
        return fmt(value)
      case 'percentage':
        return `${value.toFixed(0)}%`
      case 'years':
        return `${value} years`
      default:
        return value.toString()
    }
  }, [metric.format])

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-700 transform',
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-8 scale-95'
      )}
      style={{ transitionDelay: `${metric.delay}ms` }}
    >
      {/* Gradient background accent */}
      <div
        className={cn(
          'absolute top-0 left-0 w-full h-1',
          metric.color
        )}
      />

      <CardContent className="pt-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              metric.color.replace('bg-gradient-to-r', 'bg-opacity-10')
            )}
          >
            <Icon className={cn('w-5 h-5', metric.color.includes('purple') ? 'text-purple-600' : metric.color.includes('emerald') ? 'text-emerald-600' : metric.color.includes('blue') ? 'text-blue-600' : 'text-amber-600')} />
          </div>
          <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
        </div>

        <p className="text-sm font-medium text-muted-foreground mb-1">
          {metric.label}
        </p>

        <div className="text-3xl font-bold tracking-tight mb-2">
          {isVisible ? (
            metric.format === 'currency' ? (
              <AnimatedCurrency
                value={metric.value}
                delay={metric.delay + 300}
                speed="slow"
              />
            ) : metric.format === 'percentage' ? (
              <AnimatedPercentage
                value={metric.value}
                delay={metric.delay + 300}
                speed="slow"
              />
            ) : (
              <AnimatedNumber
                value={metric.value}
                delay={metric.delay + 300}
                speed="slow"
                suffix=" years"
              />
            )
          ) : (
            <span className="text-muted-foreground">--</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {metric.description}
        </p>
      </CardContent>
    </Card>
  )
}

// Next step action card
function NextStepCard({ step, index }: { step: NextStepData; index: number }) {
  const Icon = step.icon

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
        'animate-in slide-in-from-bottom-4 fade-in'
      )}
      style={{ animationDelay: `${800 + index * 100}ms` }}
      onClick={step.onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div
          className={cn(
            'p-3 rounded-xl transition-transform group-hover:scale-110',
            step.color
          )}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm mb-0.5">{step.title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {step.description}
          </p>
        </div>

        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
      </CardContent>
    </Card>
  )
}

// Insight preview card
function InsightCard({ insight, index }: { insight: InsightData; index: number }) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border-l-4 animate-in slide-in-from-left-4 fade-in',
        insight.type === 'positive' && 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500',
        insight.type === 'neutral' && 'bg-blue-50 dark:bg-blue-950/30 border-blue-500',
        insight.type === 'actionable' && 'bg-amber-50 dark:bg-amber-950/30 border-amber-500'
      )}
      style={{ animationDelay: `${1200 + index * 150}ms` }}
    >
      <div className="flex items-start gap-3">
        <Lightbulb
          className={cn(
            'w-5 h-5 mt-0.5 flex-shrink-0',
            insight.type === 'positive' && 'text-emerald-600',
            insight.type === 'neutral' && 'text-blue-600',
            insight.type === 'actionable' && 'text-amber-600'
          )}
        />
        <div>
          <p className="font-medium text-sm mb-1">{insight.title}</p>
          <p className="text-xs text-muted-foreground">{insight.description}</p>
        </div>
      </div>
    </div>
  )
}

// Share modal content
function ShareOptions({ onCopy, copied }: { onCopy: () => void; copied: boolean }) {
  const shareText = "I just mapped out my retirement journey! Planning early makes all the difference."
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    )
  }

  const shareToLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={shareToTwitter}
        className="gap-2"
      >
        <Twitter className="w-4 h-4" />
        <span className="hidden sm:inline">Twitter</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={shareToLinkedIn}
        className="gap-2"
      >
        <Linkedin className="w-4 h-4" />
        <span className="hidden sm:inline">LinkedIn</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onCopy}
        className="gap-2"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy Link</span>
          </>
        )}
      </Button>
    </div>
  )
}

export function OnboardingComplete({
  result,
  batchSummary,
  onContinue,
  onExploreResults,
  onAdjustPlan,
  userName,
}: OnboardingCompleteProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([])
  const [metricsVisible, setMetricsVisible] = useState(false)
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [copied, setCopied] = useState(false)
  const [celebrationPhase, setCelebrationPhase] = useState<'initial' | 'metrics' | 'complete'>('initial')

  // Generate confetti on mount
  useEffect(() => {
    setConfettiParticles(generateConfetti(50))

    // Start metrics reveal after initial celebration
    const metricsTimer = setTimeout(() => {
      setMetricsVisible(true)
      setCelebrationPhase('metrics')
    }, 800)

    // Hide confetti after animation
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false)
    }, 4000)

    // Complete celebration phase
    const completeTimer = setTimeout(() => {
      setCelebrationPhase('complete')
    }, 2000)

    return () => {
      clearTimeout(metricsTimer)
      clearTimeout(confettiTimer)
      clearTimeout(completeTimer)
    }
  }, [])

  // Calculate metrics from results
  const metrics: MetricData[] = useMemo(() => {
    if (!result) {
      return [
        {
          label: 'Projected Portfolio',
          value: 0,
          format: 'currency',
          icon: TrendingUp,
          color: 'bg-gradient-to-r from-purple-500 to-violet-500',
          description: 'At retirement',
          delay: 0,
        },
      ]
    }

    // Calculate success rate
    let successRate = 95
    if (batchSummary && batchSummary.probRuin !== undefined) {
      successRate = Math.round((1 - batchSummary.probRuin) * 100)
    }

    const yearsUntilRetirement = result.yrsToRet || 0
    const retirementBalance = result.finReal || 0
    const annualWithdrawal = result.wdReal || 0

    return [
      {
        label: 'Retirement Portfolio',
        value: retirementBalance,
        format: 'currency',
        icon: TrendingUp,
        color: 'bg-gradient-to-r from-purple-500 to-violet-500',
        description: 'Projected at retirement',
        delay: 0,
      },
      {
        label: 'Success Rate',
        value: successRate,
        format: 'percentage',
        icon: Shield,
        color: 'bg-gradient-to-r from-emerald-500 to-green-500',
        description: 'Based on Monte Carlo simulation',
        delay: 150,
      },
      {
        label: 'Annual Income',
        value: annualWithdrawal,
        format: 'currency',
        icon: DollarSign,
        color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
        description: 'Sustainable withdrawal',
        delay: 300,
      },
      {
        label: 'Years to Retirement',
        value: yearsUntilRetirement,
        format: 'years',
        icon: Calendar,
        color: 'bg-gradient-to-r from-amber-500 to-orange-500',
        description: 'Until financial freedom',
        delay: 450,
      },
    ]
  }, [result, batchSummary])

  // Generate personalized insights
  const insights: InsightData[] = useMemo(() => {
    if (!result) return []

    const insightsList: InsightData[] = []

    // Success rate insight
    let successRate = 95
    if (batchSummary && batchSummary.probRuin !== undefined) {
      successRate = Math.round((1 - batchSummary.probRuin) * 100)
    }

    if (successRate >= 90) {
      insightsList.push({
        title: 'Strong Foundation',
        description: 'Your plan shows excellent resilience across market conditions. You have built-in flexibility for life\'s surprises.',
        type: 'positive',
      })
    } else if (successRate >= 75) {
      insightsList.push({
        title: 'Solid Start',
        description: 'Your plan is viable with room for improvement. Small optimizations can significantly boost your success rate.',
        type: 'neutral',
      })
    } else {
      insightsList.push({
        title: 'Opportunity for Growth',
        description: 'Consider exploring strategies to strengthen your plan. Even modest adjustments can make a big difference.',
        type: 'actionable',
      })
    }

    // Savings insight
    if (result.totC > 0) {
      insightsList.push({
        title: 'Compound Growth Working',
        description: `Your contributions have the potential to grow substantially through the power of compound returns.`,
        type: 'positive',
      })
    }

    // Tax efficiency insight
    if (result.eolAccounts?.roth > 0 || result.eolAccounts?.pretax > 0) {
      insightsList.push({
        title: 'Tax-Advantaged Strategy',
        description: 'You\'re utilizing tax-advantaged accounts, which can significantly boost your after-tax retirement income.',
        type: 'positive',
      })
    }

    return insightsList.slice(0, 3)
  }, [result, batchSummary])

  // Next steps configuration
  const nextSteps: NextStepData[] = useMemo(() => [
    {
      title: 'Explore Your Results',
      description: 'Dive into detailed projections and scenarios',
      icon: LineChart,
      action: 'View Dashboard',
      onClick: onExploreResults,
      color: 'bg-purple-600',
    },
    {
      title: 'Fine-Tune Your Plan',
      description: 'Adjust assumptions and see impact instantly',
      icon: Settings,
      action: 'Customize',
      onClick: onAdjustPlan,
      color: 'bg-blue-600',
    },
    {
      title: 'Learn & Optimize',
      description: 'Discover strategies to maximize your retirement',
      icon: BookOpen,
      action: 'Resources',
      color: 'bg-emerald-600',
    },
    {
      title: 'Track Your Progress',
      description: 'Set up regular check-ins and milestones',
      icon: Target,
      action: 'Set Goals',
      color: 'bg-amber-600',
    },
  ], [onExploreResults, onAdjustPlan])

  // Handle copy link
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.origin)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-purple-50/30 dark:to-purple-950/10">
      {/* Confetti celebration */}
      {showConfetti && <Confetti particles={confettiParticles} />}

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Celebration header */}
        <div className="text-center mb-10">
          {/* Trophy with glow rings */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="relative">
              <GlowRing delay={0} />
              <GlowRing delay={0.5} />
              <GlowRing delay={1} />
              <div
                className={cn(
                  'relative z-10 p-6 rounded-full bg-gradient-to-br from-purple-500 to-violet-600',
                  'transform transition-all duration-700',
                  celebrationPhase === 'initial' ? 'scale-0' : 'scale-100'
                )}
              >
                <Trophy className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>

          {/* Main heading */}
          <h1
            className={cn(
              'text-3xl sm:text-4xl font-bold mb-3 transition-all duration-700',
              celebrationPhase === 'initial'
                ? 'opacity-0 translate-y-4'
                : 'opacity-100 translate-y-0'
            )}
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-violet-600">
              Congratulations{userName ? `, ${userName}` : ''}!
            </span>
          </h1>

          <p
            className={cn(
              'text-lg text-muted-foreground max-w-md mx-auto transition-all duration-700 delay-100',
              celebrationPhase === 'initial'
                ? 'opacity-0 translate-y-4'
                : 'opacity-100 translate-y-0'
            )}
          >
            Your retirement journey begins now
          </p>

          {/* Achievement badge */}
          <div
            className={cn(
              'inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full',
              'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
              'text-sm font-medium transition-all duration-700 delay-200',
              celebrationPhase === 'initial'
                ? 'opacity-0 scale-90'
                : 'opacity-100 scale-100'
            )}
          >
            <Sparkles className="w-4 h-4" />
            <span>Plan Created Successfully</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4 text-center sm:text-left">
            Your Key Numbers
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
              <MetricCard key={index} metric={metric} isVisible={metricsVisible} />
            ))}
          </div>
        </div>

        {/* Personalized Insights */}
        {insights.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              Personalized Insights
            </h2>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4">What&apos;s Next?</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {nextSteps.map((step, index) => (
              <NextStepCard key={index} step={step} index={index} />
            ))}
          </div>
        </div>

        {/* Share Section */}
        <Card className="mb-8 border-dashed">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Share2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Share Your Achievement</p>
                  <p className="text-sm text-muted-foreground">
                    Inspire others to plan for their future
                  </p>
                </div>
              </div>

              {showShareOptions ? (
                <ShareOptions onCopy={handleCopyLink} copied={copied} />
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowShareOptions(true)}
                  className="gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            onClick={onContinue}
            className="w-full sm:w-auto px-8 gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
          >
            Continue to Dashboard
            <ArrowRight className="w-5 h-5" />
          </Button>

          <p className="text-xs text-muted-foreground text-center max-w-sm">
            Your plan is saved and you can refine it anytime. Remember, small
            adjustments compound into big differences over time.
          </p>
        </div>

        {/* Motivational footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <PiggyBank className="w-4 h-4" />
            <span>
              &ldquo;The best time to start was yesterday. The second best time is now.&rdquo;
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingComplete
