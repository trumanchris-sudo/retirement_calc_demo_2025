'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import {
  Share2,
  Copy,
  Check,
  Download,
  Twitter,
  Linkedin,
  Facebook,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ==================== Types ====================

export interface ShareCardMetrics {
  /** Success/on-track percentage (0-100) */
  successRate: number
  /** Years until retirement */
  yearsToRetirement: number
  /** Current age */
  currentAge: number
  /** Target retirement age */
  retirementAge: number
  /** Optional: Total portfolio value (only shown if privacy mode is off) */
  portfolioValue?: number
  /** Optional: Monthly retirement income (only shown if privacy mode is off) */
  monthlyIncome?: number
  /** Optional: End of life wealth (only shown if privacy mode is off) */
  endOfLifeWealth?: number
}

export interface ShareCardProps {
  /** Key metrics to display on the share card */
  metrics: ShareCardMetrics
  /** Optional custom message to include */
  customMessage?: string
  /** Share URL (defaults to current page) */
  shareUrl?: string
  /** Callback when share is completed */
  onShare?: (platform: SocialPlatform | 'clipboard' | 'download') => void
  /** Additional CSS classes */
  className?: string
}

type SocialPlatform = 'twitter' | 'linkedin' | 'facebook'

// ==================== Platform Configurations ====================

const PLATFORM_CONFIG = {
  twitter: {
    name: 'Twitter',
    icon: Twitter,
    color: 'bg-black hover:bg-gray-800',
    maxLength: 280,
    hashtags: ['RetirementPlanning', 'FinancialFreedom', 'FIRE'],
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-[#0A66C2] hover:bg-[#004182]',
    maxLength: 3000,
    hashtags: ['RetirementPlanning', 'FinancialPlanning', 'WealthManagement'],
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-[#1877F2] hover:bg-[#166FE5]',
    maxLength: 63206,
    hashtags: [],
  },
} as const

// ==================== Helper Functions ====================

function getStatusColor(rate: number): { bg: string; text: string; border: string; gradient: string } {
  if (rate >= 90) {
    return {
      bg: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      gradient: 'from-emerald-500 to-teal-600',
    }
  }
  if (rate >= 75) {
    return {
      bg: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
      gradient: 'from-green-500 to-emerald-600',
    }
  }
  if (rate >= 50) {
    return {
      bg: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      gradient: 'from-amber-500 to-orange-600',
    }
  }
  return {
    bg: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    gradient: 'from-red-500 to-rose-600',
  }
}

function getStatusMessage(rate: number): string {
  if (rate >= 90) return 'Excellent! On track for a secure retirement'
  if (rate >= 75) return 'Great progress toward retirement goals'
  if (rate >= 50) return 'Making progress - some adjustments may help'
  return 'Building toward financial security'
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

function generateShareText(
  metrics: ShareCardMetrics,
  showAmounts: boolean,
  platform: SocialPlatform
): string {
  const { successRate, yearsToRetirement, retirementAge } = metrics
  const config = PLATFORM_CONFIG[platform]

  let message = `I'm ${Math.round(successRate)}% on track for retirement!`

  if (yearsToRetirement > 0) {
    message += ` Planning to retire at ${retirementAge} (${yearsToRetirement} years away).`
  } else {
    message += ` Already enjoying retirement at ${retirementAge}!`
  }

  if (showAmounts && metrics.monthlyIncome) {
    message += ` Projected monthly income: ${formatCurrency(metrics.monthlyIncome)}.`
  }

  message += '\n\nCheck your retirement readiness:'

  // Add hashtags for Twitter and LinkedIn
  if (config.hashtags.length > 0) {
    const hashtags = config.hashtags.map(h => `#${h}`).join(' ')
    message += `\n\n${hashtags}`
  }

  return message
}

// ==================== Canvas Image Generator ====================

function generateShareImage(
  canvas: HTMLCanvasElement,
  metrics: ShareCardMetrics,
  showAmounts: boolean
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // OG Image dimensions (1200x630 is optimal for social sharing)
  const width = 1200
  const height = 630
  canvas.width = width
  canvas.height = height

  const { successRate } = metrics
  const colors = getStatusColor(successRate)

  // Background gradient
  const bgGradient = ctx.createLinearGradient(0, 0, width, height)
  bgGradient.addColorStop(0, '#0f172a') // slate-900
  bgGradient.addColorStop(1, '#1e293b') // slate-800
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  // Decorative elements - subtle grid pattern
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)' // slate-400 with low opacity
  ctx.lineWidth = 1
  for (let i = 0; i < width; i += 40) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, height)
    ctx.stroke()
  }
  for (let i = 0; i < height; i += 40) {
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(width, i)
    ctx.stroke()
  }

  // Accent gradient bar at top
  const accentGradient = ctx.createLinearGradient(0, 0, width, 0)
  if (successRate >= 75) {
    accentGradient.addColorStop(0, '#10b981') // emerald-500
    accentGradient.addColorStop(1, '#14b8a6') // teal-500
  } else if (successRate >= 50) {
    accentGradient.addColorStop(0, '#f59e0b') // amber-500
    accentGradient.addColorStop(1, '#f97316') // orange-500
  } else {
    accentGradient.addColorStop(0, '#ef4444') // red-500
    accentGradient.addColorStop(1, '#f43f5e') // rose-500
  }
  ctx.fillStyle = accentGradient
  ctx.fillRect(0, 0, width, 8)

  // Main content area
  const centerX = width / 2
  const centerY = height / 2 - 20

  // Large percentage display
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 140px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${Math.round(successRate)}%`, centerX, centerY - 60)

  // "On Track" label
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#94a3b8' // slate-400
  ctx.fillText('ON TRACK FOR RETIREMENT', centerX, centerY + 40)

  // Status message
  ctx.font = '24px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#64748b' // slate-500
  ctx.fillText(getStatusMessage(successRate), centerX, centerY + 90)

  // Progress bar
  const barWidth = 600
  const barHeight = 20
  const barX = centerX - barWidth / 2
  const barY = centerY + 130

  // Bar background
  ctx.fillStyle = 'rgba(148, 163, 184, 0.2)'
  ctx.beginPath()
  ctx.roundRect(barX, barY, barWidth, barHeight, 10)
  ctx.fill()

  // Bar fill
  const fillWidth = (successRate / 100) * barWidth
  const barGradient = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0)
  if (successRate >= 75) {
    barGradient.addColorStop(0, '#10b981')
    barGradient.addColorStop(1, '#14b8a6')
  } else if (successRate >= 50) {
    barGradient.addColorStop(0, '#f59e0b')
    barGradient.addColorStop(1, '#f97316')
  } else {
    barGradient.addColorStop(0, '#ef4444')
    barGradient.addColorStop(1, '#f43f5e')
  }
  ctx.fillStyle = barGradient
  ctx.beginPath()
  ctx.roundRect(barX, barY, fillWidth, barHeight, 10)
  ctx.fill()

  // Metrics row at bottom
  const metricsY = height - 120
  const metricSpacing = showAmounts && metrics.portfolioValue ? 200 : 300

  // Age metric
  ctx.font = 'bold 32px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.fillText(`${metrics.currentAge}`, centerX - metricSpacing, metricsY)
  ctx.font = '18px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#64748b'
  ctx.fillText('Current Age', centerX - metricSpacing, metricsY + 30)

  // Retirement age metric
  ctx.font = 'bold 32px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`${metrics.retirementAge}`, centerX, metricsY)
  ctx.font = '18px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#64748b'
  ctx.fillText('Retirement Age', centerX, metricsY + 30)

  // Years to retirement
  ctx.font = 'bold 32px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText(
    metrics.yearsToRetirement > 0 ? `${metrics.yearsToRetirement} yrs` : 'Now!',
    centerX + metricSpacing,
    metricsY
  )
  ctx.font = '18px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#64748b'
  ctx.fillText('Until Retirement', centerX + metricSpacing, metricsY + 30)

  // Optional: Portfolio value (if privacy mode is off)
  if (showAmounts && metrics.portfolioValue) {
    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(formatCurrency(metrics.portfolioValue), centerX + metricSpacing * 2, metricsY)
    ctx.font = '18px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.fillText('Portfolio', centerX + metricSpacing * 2, metricsY + 30)
  }

  // Branding / footer
  ctx.font = '16px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = '#475569'
  ctx.textAlign = 'center'
  ctx.fillText('Retirement Calculator', centerX, height - 30)

  // Privacy indicator if amounts hidden
  if (!showAmounts) {
    ctx.font = '14px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.textAlign = 'left'
    ctx.fillText('Privacy Mode Enabled', 40, height - 30)
  }
}

// ==================== SVG Card Preview Component ====================

interface SVGCardPreviewProps {
  metrics: ShareCardMetrics
  showAmounts: boolean
}

function SVGCardPreview({ metrics, showAmounts }: SVGCardPreviewProps) {
  const { successRate, currentAge, retirementAge, yearsToRetirement } = metrics
  const colors = getStatusColor(successRate)

  return (
    <div className="relative w-full aspect-[1200/630] rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl">
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(148, 163, 184, 0.3) 1px, transparent 1px),
                           linear-gradient(to bottom, rgba(148, 163, 184, 0.3) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Top accent bar */}
      <div className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', colors.gradient)} />

      {/* Main content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
        {/* Percentage display */}
        <div className="text-center mb-4">
          <span className="text-5xl sm:text-6xl md:text-7xl font-bold text-white">
            {Math.round(successRate)}%
          </span>
        </div>

        {/* On track label */}
        <div className="text-sm sm:text-base md:text-lg font-semibold text-slate-400 tracking-wider mb-2">
          ON TRACK FOR RETIREMENT
        </div>

        {/* Status message */}
        <div className="text-xs sm:text-sm text-slate-500 mb-4">
          {getStatusMessage(successRate)}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-[300px] sm:max-w-[400px] h-2 sm:h-3 bg-slate-700/50 rounded-full overflow-hidden mb-6">
          <div
            className={cn('h-full rounded-full bg-gradient-to-r', colors.gradient)}
            style={{ width: `${successRate}%` }}
          />
        </div>

        {/* Metrics row */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 text-center">
          <div>
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">{currentAge}</div>
            <div className="text-[10px] sm:text-xs text-slate-500">Current Age</div>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div>
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">{retirementAge}</div>
            <div className="text-[10px] sm:text-xs text-slate-500">Retirement Age</div>
          </div>
          <div className="w-px h-8 bg-slate-700" />
          <div>
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
              {yearsToRetirement > 0 ? `${yearsToRetirement} yrs` : 'Now!'}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500">Until Retirement</div>
          </div>
          {showAmounts && metrics.portfolioValue && (
            <>
              <div className="w-px h-8 bg-slate-700" />
              <div>
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                  {formatCurrency(metrics.portfolioValue)}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500">Portfolio</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Privacy indicator */}
      {!showAmounts && (
        <div className="absolute bottom-2 left-3 flex items-center gap-1.5 text-slate-500">
          <Lock className="h-3 w-3" />
          <span className="text-[10px]">Privacy Mode</span>
        </div>
      )}

      {/* Branding */}
      <div className="absolute bottom-2 right-3 text-[10px] text-slate-600">
        Retirement Calculator
      </div>
    </div>
  )
}

// ==================== Main Component ====================

export function ShareCard({
  metrics,
  customMessage,
  shareUrl,
  onShare,
  className,
}: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showAmounts, setShowAmounts] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const getShareUrl = useCallback(() => {
    return shareUrl || (typeof window !== 'undefined' ? window.location.href : '')
  }, [shareUrl])

  // Generate image when metrics or privacy setting changes
  useEffect(() => {
    if (canvasRef.current) {
      generateShareImage(canvasRef.current, metrics, showAmounts)
    }
  }, [metrics, showAmounts])

  const handleCopyToClipboard = useCallback(async () => {
    const text = generateShareText(metrics, showAmounts, 'twitter')
    const fullText = customMessage
      ? `${customMessage}\n\n${text}\n${getShareUrl()}`
      : `${text}\n${getShareUrl()}`

    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onShare?.('clipboard')
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }, [metrics, showAmounts, customMessage, getShareUrl, onShare])

  const handleDownloadImage = useCallback(async () => {
    if (!canvasRef.current) return

    setIsGenerating(true)
    try {
      // Regenerate at full resolution
      generateShareImage(canvasRef.current, metrics, showAmounts)

      const dataUrl = canvasRef.current.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `retirement-progress-${Math.round(metrics.successRate)}pct.png`
      link.href = dataUrl
      link.click()
      onShare?.('download')
    } finally {
      setIsGenerating(false)
    }
  }, [metrics, showAmounts, onShare])

  const handleShare = useCallback((platform: SocialPlatform) => {
    const text = generateShareText(metrics, showAmounts, platform)
    const url = getShareUrl()

    let shareLink = ''

    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`
        break
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`
        break
    }

    window.open(shareLink, '_blank', 'width=600,height=400')
    onShare?.(platform)
  }, [metrics, showAmounts, getShareUrl, onShare])

  const colors = getStatusColor(metrics.successRate)

  return (
    <Card className={cn('border-2', colors.border, className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className={cn('h-5 w-5', colors.text)} />
            Share Your Progress
          </div>
          <Badge
            variant="outline"
            className={cn(
              'font-semibold',
              metrics.successRate >= 75
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : metrics.successRate >= 50
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-red-500 text-red-600 dark:text-red-400'
            )}
          >
            {Math.round(metrics.successRate)}% On Track
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Card Preview */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Preview</div>
          <SVGCardPreview metrics={metrics} showAmounts={showAmounts} />
        </div>

        {/* Hidden canvas for image generation */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Privacy Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            {showAmounts ? (
              <Eye className="h-5 w-5 text-amber-500" />
            ) : (
              <Lock className="h-5 w-5 text-emerald-500" />
            )}
            <div>
              <div className="font-medium text-sm">
                {showAmounts ? 'Showing Amounts' : 'Privacy Mode'}
              </div>
              <div className="text-xs text-muted-foreground">
                {showAmounts
                  ? 'Your portfolio value will be visible'
                  : 'Only percentages and ages are shown'
                }
              </div>
            </div>
          </div>
          <Switch
            checked={showAmounts}
            onCheckedChange={setShowAmounts}
            aria-label="Toggle privacy mode"
          />
        </div>

        {/* Share Actions */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Share on</div>

          {/* Social Platform Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PLATFORM_CONFIG) as SocialPlatform[]).map((platform) => {
              const config = PLATFORM_CONFIG[platform]
              const Icon = config.icon
              return (
                <Button
                  key={platform}
                  variant="outline"
                  className={cn(
                    'flex items-center gap-2 text-white border-0',
                    config.color
                  )}
                  onClick={() => handleShare(platform)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.name}</span>
                </Button>
              )
            })}
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleCopyToClipboard}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Text</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleDownloadImage}
              disabled={isGenerating}
            >
              <Download className="h-4 w-4" />
              <span>{isGenerating ? 'Generating...' : 'Download Image'}</span>
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
          <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-blue-700 dark:text-blue-300">
            <span className="font-medium">Tip:</span> Download the image for best results when sharing.
            The image is optimized for social media (1200x630px).
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="text-xs text-muted-foreground text-center">
          Your financial data is never uploaded. Images are generated locally in your browser.
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== Compact Share Button ====================

export interface ShareButtonProps {
  metrics: ShareCardMetrics
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function ShareButton({
  metrics,
  variant = 'outline',
  size = 'default',
  className
}: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false)

  const handleQuickShare = useCallback(async () => {
    // Check if native share is available
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'My Retirement Progress',
          text: `I'm ${Math.round(metrics.successRate)}% on track for retirement! Check your own retirement readiness.`,
          url: window.location.href,
        })
      } catch (err) {
        // User cancelled or share failed, show modal instead
        if ((err as Error).name !== 'AbortError') {
          setShowModal(true)
        }
      }
    } else {
      setShowModal(true)
    }
  }, [metrics])

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleQuickShare}
      >
        <Share2 className="h-4 w-4" />
        {size !== 'icon' && <span className="ml-2">Share</span>}
      </Button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ShareCard
              metrics={metrics}
              onShare={() => setShowModal(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default ShareCard
