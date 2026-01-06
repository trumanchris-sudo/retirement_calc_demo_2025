'use client'

import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import Link from 'next/link'

interface InfoTooltipProps {
  content: string
  learnMoreLink?: string
  learnMoreText?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

/**
 * Info tooltip component for explaining core concepts
 * Shows a help icon that reveals detailed information on hover/tap
 */
export function InfoTooltip({
  content,
  learnMoreLink,
  learnMoreText = 'Learn more →',
  side = 'top',
  className = '',
}: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-muted transition-colors ${className}`}
            aria-label="More information"
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <div className="space-y-2">
            <p className="text-sm">{content}</p>
            {learnMoreLink && (
              <Link
                href={learnMoreLink}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                {learnMoreText}
              </Link>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Predefined tooltip content for common retirement planning concepts
 */
export const TOOLTIP_CONTENT = {
  successRate: {
    content:
      'The percentage of simulated scenarios where your retirement portfolio lasted through your entire retirement without running out of money.',
    learnMoreLink: '#',
    learnMoreText: 'Learn about Monte Carlo simulation →',
  },
  endOfLifeWealth: {
    content:
      'The amount of money remaining in your portfolio at the end of your retirement (age 95), adjusted for inflation. Higher values indicate more cushion for unexpected expenses or legacy goals.',
    learnMoreLink: '#',
  },
  freedomDate: {
    content:
      'The earliest date you could retire while maintaining a 90%+ success rate, based on your current savings trajectory and spending plan.',
    learnMoreLink: '#',
  },
  generationalWealth: {
    content:
      'Analysis of how your wealth could support future generations through strategic distribution and growth assumptions, accounting for beneficiary demographics and tax implications.',
    learnMoreLink: '#',
  },
  afterTaxWithdrawal: {
    content:
      'Your annual spending power in retirement after all taxes (federal, state, and investment taxes) have been paid. This is the actual amount available for living expenses.',
    learnMoreLink: '#',
  },
  rothConversion: {
    content:
      'Strategy of converting pre-tax retirement savings to Roth accounts, paying taxes now at potentially lower rates to enable tax-free growth and withdrawals later.',
    learnMoreLink: '#',
  },
  sequenceRisk: {
    content:
      'The risk that poor market returns in the early years of retirement could permanently damage your portfolio, even if long-term averages are favorable.',
    learnMoreLink: '#',
  },
  safeWithdrawalRate: {
    content:
      'The percentage of your portfolio you can withdraw annually with a high probability of not running out of money, accounting for inflation and market volatility.',
    learnMoreLink: '#',
  },
}
