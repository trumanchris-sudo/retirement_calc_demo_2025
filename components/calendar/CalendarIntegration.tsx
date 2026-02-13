'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import {
  Calendar,
  CalendarPlus,
  CalendarCheck,
  Bell,
  BellRing,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  RefreshCw,
  PiggyBank,
  TrendingUp,
  Users,
  FileText,
  Settings2,
  Plus,
  X,
  Copy,
  Check,
  Shield,
  Target,
  BarChart3,
  Briefcase,
  Heart,
  Building2,
  Wallet,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

// ==================== Types ====================

export type CalendarEventCategory =
  | 'tax-deadline'
  | 'contribution'
  | 'open-enrollment'
  | 'rebalancing'
  | 'review-meeting'
  | 'rmd'
  | 'milestone'
  | 'custom'

export type CalendarPlatform = 'google' | 'apple' | 'outlook' | 'ics'

export type RecurrenceFrequency = 'none' | 'weekly' | 'monthly' | 'quarterly' | 'annually'

export type ReminderTiming = '15min' | '1hour' | '1day' | '1week' | '2weeks' | '1month'

export interface CalendarEvent {
  id: string
  title: string
  description: string
  startDate: Date
  endDate?: Date
  allDay: boolean
  category: CalendarEventCategory
  priority: 'high' | 'medium' | 'low'
  recurrence: RecurrenceFrequency
  reminders: ReminderTiming[]
  location?: string
  url?: string
  notes?: string
  completed: boolean
}

export interface CalendarIntegrationProps {
  userAge?: number
  retirementAge?: number
  portfolioValue?: number
  rebalancingFrequency?: 'quarterly' | 'semi-annually' | 'annually'
  reviewMeetingFrequency?: 'quarterly' | 'semi-annually' | 'annually'
  customEvents?: CalendarEvent[]
  onEventAdd?: (event: CalendarEvent) => void
  onEventRemove?: (eventId: string) => void
  className?: string
}

// ==================== Constants ====================

const CATEGORY_CONFIG: Record<
  CalendarEventCategory,
  { label: string; icon: React.ComponentType<any>; color: string; bgColor: string }
> = {
  'tax-deadline': {
    label: 'Tax Deadlines',
    icon: DollarSign,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  contribution: {
    label: 'Contributions',
    icon: PiggyBank,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  'open-enrollment': {
    label: 'Open Enrollment',
    icon: Heart,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  rebalancing: {
    label: 'Rebalancing',
    icon: RefreshCw,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  'review-meeting': {
    label: 'Review Meetings',
    icon: Users,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  rmd: {
    label: 'RMD Deadlines',
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  milestone: {
    label: 'Milestones',
    icon: Target,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  custom: {
    label: 'Custom',
    icon: CalendarPlus,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
}

const PLATFORM_CONFIG: Record<
  CalendarPlatform,
  { label: string; icon: string; color: string }
> = {
  google: {
    label: 'Google Calendar',
    icon: '/icons/google-calendar.svg',
    color: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
  },
  apple: {
    label: 'Apple Calendar',
    icon: '/icons/apple-calendar.svg',
    color: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
  },
  outlook: {
    label: 'Outlook',
    icon: '/icons/outlook.svg',
    color: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
  },
  ics: {
    label: 'Download ICS',
    icon: '/icons/calendar.svg',
    color: 'hover:bg-green-50 dark:hover:bg-green-900/20',
  },
}

const REMINDER_LABELS: Record<ReminderTiming, string> = {
  '15min': '15 minutes before',
  '1hour': '1 hour before',
  '1day': '1 day before',
  '1week': '1 week before',
  '2weeks': '2 weeks before',
  '1month': '1 month before',
}

const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  none: 'Does not repeat',
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annually: 'Annually',
}

// ==================== Helper Functions ====================

function generateEventId(): string {
  return `cal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getDaysUntil(date: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getDateForYear(month: number, day: number, year: number = new Date().getFullYear()): Date {
  return new Date(year, month - 1, day)
}

function getQuarterlyDates(startMonth: number, startDay: number, year: number): Date[] {
  const dates: Date[] = []
  for (let q = 0; q < 4; q++) {
    const month = (startMonth - 1 + q * 3) % 12 + 1
    const adjustedYear = startMonth - 1 + q * 3 >= 12 ? year + 1 : year
    dates.push(getDateForYear(month, startDay, adjustedYear))
  }
  return dates
}

// ==================== ICS Generation ====================

function formatICSDate(date: Date, allDay: boolean = false): string {
  if (allDay) {
    return date.toISOString().split('T')[0].replace(/-/g, '')
  }
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeICS(text: string): string {
  return text.replace(/[,;\\]/g, (match) => '\\' + match).replace(/\n/g, '\\n')
}

function generateRRULE(recurrence: RecurrenceFrequency): string {
  switch (recurrence) {
    case 'weekly':
      return 'RRULE:FREQ=WEEKLY'
    case 'monthly':
      return 'RRULE:FREQ=MONTHLY'
    case 'quarterly':
      return 'RRULE:FREQ=YEARLY;INTERVAL=1;BYMONTH=1,4,7,10'
    case 'annually':
      return 'RRULE:FREQ=YEARLY'
    default:
      return ''
  }
}

function generateVALARM(reminder: ReminderTiming): string[] {
  const triggerMap: Record<ReminderTiming, string> = {
    '15min': '-PT15M',
    '1hour': '-PT1H',
    '1day': '-P1D',
    '1week': '-P1W',
    '2weeks': '-P2W',
    '1month': '-P1M',
  }

  return [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `TRIGGER:${triggerMap[reminder]}`,
    `DESCRIPTION:Reminder for upcoming event`,
    'END:VALARM',
  ]
}

function generateICSContent(events: CalendarEvent[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Retirement Calculator//Financial Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Financial Calendar',
    'X-WR-TIMEZONE:America/New_York',
  ]

  events.forEach((event) => {
    const endDate = event.endDate || new Date(event.startDate.getTime() + 60 * 60 * 1000)

    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@retirement-calculator`,
      `DTSTAMP:${formatICSDate(new Date())}`,
    )

    if (event.allDay) {
      const nextDay = new Date(endDate)
      nextDay.setDate(nextDay.getDate() + 1)
      lines.push(
        `DTSTART;VALUE=DATE:${formatICSDate(event.startDate, true)}`,
        `DTEND;VALUE=DATE:${formatICSDate(nextDay, true)}`,
      )
    } else {
      lines.push(
        `DTSTART:${formatICSDate(event.startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
      )
    }

    lines.push(
      `SUMMARY:${escapeICS(event.title)}`,
      `DESCRIPTION:${escapeICS(event.description + (event.notes ? '\\n\\nNotes: ' + event.notes : ''))}`,
      `CATEGORIES:${CATEGORY_CONFIG[event.category].label}`,
    )

    if (event.location) {
      lines.push(`LOCATION:${escapeICS(event.location)}`)
    }

    if (event.url) {
      lines.push(`URL:${event.url}`)
    }

    const rrule = generateRRULE(event.recurrence)
    if (rrule) {
      lines.push(rrule)
    }

    event.reminders.forEach((reminder) => {
      lines.push(...generateVALARM(reminder))
    })

    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

// ==================== Calendar URL Generators ====================

function generateGoogleCalendarURL(event: CalendarEvent): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  const params = new URLSearchParams()

  params.set('text', event.title)
  params.set('details', event.description + (event.notes ? '\n\nNotes: ' + event.notes : ''))

  if (event.allDay) {
    const startStr = event.startDate.toISOString().split('T')[0].replace(/-/g, '')
    const endDate = event.endDate || event.startDate
    const endStr = new Date(endDate.getTime() + 86400000).toISOString().split('T')[0].replace(/-/g, '')
    params.set('dates', `${startStr}/${endStr}`)
  } else {
    const startStr = event.startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const endDate = event.endDate || new Date(event.startDate.getTime() + 3600000)
    const endStr = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    params.set('dates', `${startStr}/${endStr}`)
  }

  if (event.location) {
    params.set('location', event.location)
  }

  if (event.recurrence !== 'none') {
    const recurrenceMap: Record<RecurrenceFrequency, string> = {
      none: '',
      weekly: 'RRULE:FREQ=WEEKLY',
      monthly: 'RRULE:FREQ=MONTHLY',
      quarterly: 'RRULE:FREQ=MONTHLY;INTERVAL=3',
      annually: 'RRULE:FREQ=YEARLY',
    }
    params.set('recur', recurrenceMap[event.recurrence])
  }

  return `${baseUrl}&${params.toString()}`
}

function generateOutlookURL(event: CalendarEvent): string {
  const baseUrl = 'https://outlook.live.com/calendar/0/action/compose'
  const params = new URLSearchParams()

  params.set('subject', event.title)
  params.set('body', event.description + (event.notes ? '\n\nNotes: ' + event.notes : ''))
  params.set('path', '/calendar/action/compose')
  params.set('rru', 'addevent')

  if (event.allDay) {
    params.set('allday', 'true')
    params.set('startdt', event.startDate.toISOString().split('T')[0])
    const endDate = event.endDate || event.startDate
    params.set('enddt', endDate.toISOString().split('T')[0])
  } else {
    params.set('startdt', event.startDate.toISOString())
    const endDate = event.endDate || new Date(event.startDate.getTime() + 3600000)
    params.set('enddt', endDate.toISOString())
  }

  if (event.location) {
    params.set('location', event.location)
  }

  return `${baseUrl}?${params.toString()}`
}

// ==================== Default Events Generator ====================

function generateDefaultFinancialEvents(
  year: number = new Date().getFullYear(),
  userAge: number = 40,
  rebalancingFrequency: 'quarterly' | 'semi-annually' | 'annually' = 'quarterly',
  reviewMeetingFrequency: 'quarterly' | 'semi-annually' | 'annually' = 'semi-annually'
): CalendarEvent[] {
  const events: CalendarEvent[] = []

  // Tax Deadlines
  events.push({
    id: generateEventId(),
    title: 'Tax Filing Deadline',
    description: 'Federal and state income tax returns due. File or request extension. Pay any taxes owed to avoid penalties and interest.',
    startDate: getDateForYear(4, 15, year),
    allDay: true,
    category: 'tax-deadline',
    priority: 'high',
    recurrence: 'annually',
    reminders: ['1month', '2weeks', '1week', '1day'],
    completed: false,
    notes: 'If April 15 falls on a weekend/holiday, deadline moves to next business day',
  })

  events.push({
    id: generateEventId(),
    title: 'IRA Contribution Deadline',
    description: 'Last day to make IRA contributions for the previous tax year. Maximize your retirement savings and potential tax deduction.',
    startDate: getDateForYear(4, 15, year),
    allDay: true,
    category: 'contribution',
    priority: 'high',
    recurrence: 'annually',
    reminders: ['1month', '2weeks', '1week'],
    completed: false,
    notes: 'Contribution limits: $7,000 ($8,000 if 50+) for 2024',
  })

  // Estimated Tax Payments
  const estimatedTaxDates = [
    { month: 4, day: 15, quarter: 'Q1' },
    { month: 6, day: 17, quarter: 'Q2' },
    { month: 9, day: 16, quarter: 'Q3' },
    { month: 1, day: 15, quarter: 'Q4', nextYear: true },
  ]

  estimatedTaxDates.forEach(({ month, day, quarter, nextYear }) => {
    const eventYear = nextYear ? year + 1 : year
    events.push({
      id: generateEventId(),
      title: `${quarter} Estimated Tax Payment`,
      description: 'Quarterly estimated tax payment due. Required for self-employed individuals and those with significant investment income.',
      startDate: getDateForYear(month, day, eventYear),
      allDay: true,
      category: 'tax-deadline',
      priority: 'high',
      recurrence: 'none',
      reminders: ['2weeks', '1week', '1day'],
      completed: false,
      notes: 'Use Form 1040-ES. Safe harbor: 100% of prior year tax (110% if AGI > $150k)',
    })
  })

  // Open Enrollment Periods
  events.push({
    id: generateEventId(),
    title: 'ACA Open Enrollment Begins',
    description: 'Healthcare marketplace open enrollment begins. Review health insurance options, compare plans, and check for premium subsidies.',
    startDate: getDateForYear(11, 1, year),
    allDay: true,
    category: 'open-enrollment',
    priority: 'medium',
    recurrence: 'annually',
    reminders: ['2weeks', '1week'],
    completed: false,
    notes: 'Runs November 1 - January 15 (may vary by state)',
  })

  events.push({
    id: generateEventId(),
    title: 'ACA Open Enrollment Ends',
    description: 'Last day to enroll in or change health insurance through the marketplace for coverage starting January 1.',
    startDate: getDateForYear(1, 15, year + 1),
    allDay: true,
    category: 'open-enrollment',
    priority: 'high',
    recurrence: 'annually',
    reminders: ['2weeks', '1week', '1day'],
    completed: false,
  })

  if (userAge >= 63) {
    events.push({
      id: generateEventId(),
      title: 'Medicare Open Enrollment Begins',
      description: 'Review and compare Medicare Advantage and Part D prescription drug plans. Changes take effect January 1.',
      startDate: getDateForYear(10, 15, year),
      allDay: true,
      category: 'open-enrollment',
      priority: 'high',
      recurrence: 'annually',
      reminders: ['1month', '2weeks'],
      completed: false,
      notes: 'Medicare Open Enrollment: October 15 - December 7',
    })

    events.push({
      id: generateEventId(),
      title: 'Medicare Open Enrollment Ends',
      description: 'Final day to make changes to Medicare coverage for the upcoming year.',
      startDate: getDateForYear(12, 7, year),
      allDay: true,
      category: 'open-enrollment',
      priority: 'high',
      recurrence: 'annually',
      reminders: ['2weeks', '1week', '1day'],
      completed: false,
    })
  }

  events.push({
    id: generateEventId(),
    title: 'Review 401(k) Contributions',
    description: 'Open enrollment for workplace retirement plans. Review contribution percentage, investment allocations, and ensure you\'re maximizing employer match.',
    startDate: getDateForYear(11, 1, year),
    allDay: true,
    category: 'contribution',
    priority: 'medium',
    recurrence: 'annually',
    reminders: ['2weeks', '1week'],
    completed: false,
    notes: '401(k) limits: $23,000 ($30,500 if 50+) for 2024',
  })

  // Rebalancing Schedule
  const rebalancingDates: Date[] = []
  if (rebalancingFrequency === 'quarterly') {
    rebalancingDates.push(
      getDateForYear(3, 31, year),
      getDateForYear(6, 30, year),
      getDateForYear(9, 30, year),
      getDateForYear(12, 31, year)
    )
  } else if (rebalancingFrequency === 'semi-annually') {
    rebalancingDates.push(
      getDateForYear(6, 30, year),
      getDateForYear(12, 31, year)
    )
  } else {
    rebalancingDates.push(getDateForYear(12, 31, year))
  }

  rebalancingDates.forEach((date, index) => {
    events.push({
      id: generateEventId(),
      title: 'Portfolio Rebalancing Review',
      description: 'Review portfolio allocation and rebalance if necessary. Check if asset allocation has drifted from target. Consider tax implications before selling.',
      startDate: date,
      allDay: true,
      category: 'rebalancing',
      priority: 'medium',
      recurrence: 'none',
      reminders: ['1week', '1day'],
      completed: false,
      notes: 'Rebalance if allocation drifts 5%+ from target. Use tax-advantaged accounts first.',
    })
  })

  // Review Meeting Reminders
  const reviewDates: Date[] = []
  if (reviewMeetingFrequency === 'quarterly') {
    reviewDates.push(
      getDateForYear(1, 15, year),
      getDateForYear(4, 15, year),
      getDateForYear(7, 15, year),
      getDateForYear(10, 15, year)
    )
  } else if (reviewMeetingFrequency === 'semi-annually') {
    reviewDates.push(
      getDateForYear(1, 15, year),
      getDateForYear(7, 15, year)
    )
  } else {
    reviewDates.push(getDateForYear(1, 15, year))
  }

  reviewDates.forEach((date, index) => {
    const quarter = reviewMeetingFrequency === 'quarterly'
      ? `Q${index + 1}`
      : reviewMeetingFrequency === 'semi-annually'
        ? (index === 0 ? 'H1' : 'H2')
        : 'Annual'
    events.push({
      id: generateEventId(),
      title: `${quarter} Financial Review Meeting`,
      description: 'Schedule a review of your financial plan. Assess progress toward goals, review investment performance, and discuss any life changes or concerns.',
      startDate: date,
      endDate: new Date(date.getTime() + 60 * 60 * 1000),
      allDay: false,
      category: 'review-meeting',
      priority: 'medium',
      recurrence: 'none',
      reminders: ['1week', '1day', '1hour'],
      completed: false,
      notes: 'Prepare: Recent statements, questions, life changes to discuss',
    })
  })

  // RMD Deadline (if applicable)
  if (userAge >= 72) {
    events.push({
      id: generateEventId(),
      title: 'RMD Withdrawal Deadline',
      description: 'Required Minimum Distribution must be taken from traditional IRAs and 401(k)s by December 31. Failure to take RMD results in 25% penalty on amount not withdrawn.',
      startDate: getDateForYear(12, 31, year),
      allDay: true,
      category: 'rmd',
      priority: 'high',
      recurrence: 'annually',
      reminders: ['1month', '2weeks', '1week'],
      completed: false,
      notes: 'Consider QCDs if charitably inclined (up to $105,000 directly to charity)',
    })
  }

  // Year-End Planning Milestones
  events.push({
    id: generateEventId(),
    title: 'Year-End Tax Planning Review',
    description: 'Final opportunity for tax optimization: tax-loss harvesting, Roth conversions, charitable giving, HSA contributions, and estimated tax adjustments.',
    startDate: getDateForYear(12, 1, year),
    allDay: true,
    category: 'milestone',
    priority: 'high',
    recurrence: 'annually',
    reminders: ['2weeks', '1week'],
    completed: false,
    notes: 'Last trading day typically Dec 29-31 for tax-loss harvesting',
  })

  events.push({
    id: generateEventId(),
    title: 'HSA Contribution Deadline',
    description: 'Last day to make HSA contributions for the current tax year. HSA offers triple tax advantage: deductible contributions, tax-free growth, and tax-free qualified withdrawals.',
    startDate: getDateForYear(4, 15, year),
    allDay: true,
    category: 'contribution',
    priority: 'medium',
    recurrence: 'annually',
    reminders: ['1month', '2weeks'],
    completed: false,
    notes: 'HSA limits: $4,150 individual / $8,300 family for 2024 (+$1,000 if 55+)',
  })

  // Social Security Planning (age-dependent)
  if (userAge >= 60 && userAge < 62) {
    events.push({
      id: generateEventId(),
      title: 'Social Security Planning Review',
      description: 'You\'re approaching Social Security eligibility at 62. Review claiming strategies, consider impact of early vs. delayed claiming, and coordinate with spouse if applicable.',
      startDate: getDateForYear(6, 1, year),
      allDay: true,
      category: 'milestone',
      priority: 'medium',
      recurrence: 'annually',
      reminders: ['1month'],
      completed: false,
      notes: 'Benefits reduced ~6.67%/year if claiming before Full Retirement Age',
    })
  }

  return events
}

// ==================== Sub-Components ====================

interface CalendarExportMenuProps {
  event: CalendarEvent
  onClose?: () => void
}

function CalendarExportMenu({ event, onClose }: CalendarExportMenuProps) {
  const [copied, setCopied] = useState(false)

  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarURL(event)
    window.open(url, '_blank')
    onClose?.()
  }

  const handleOutlook = () => {
    const url = generateOutlookURL(event)
    window.open(url, '_blank')
    onClose?.()
  }

  const handleAppleCalendar = () => {
    // Apple Calendar uses ICS files
    handleDownloadICS([event])
    onClose?.()
  }

  const handleDownloadICS = (events: CalendarEvent[]) => {
    const icsContent = generateICSContent(events)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${event.title.replace(/\s+/g, '_')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCopyLink = () => {
    const url = generateGoogleCalendarURL(event)
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2 p-2">
      <p className="text-sm font-medium text-muted-foreground mb-3">Add to calendar</p>
      <Button
        variant="ghost"
        className="w-full justify-start h-10 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        onClick={handleGoogleCalendar}
      >
        <Calendar className="h-4 w-4 mr-3 text-blue-600" />
        Google Calendar
        <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start h-10 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        onClick={handleAppleCalendar}
      >
        <Calendar className="h-4 w-4 mr-3 text-gray-600" />
        Apple Calendar
        <Download className="h-3 w-3 ml-auto text-muted-foreground" />
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start h-10 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        onClick={handleOutlook}
      >
        <Calendar className="h-4 w-4 mr-3 text-blue-500" />
        Outlook
        <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
      </Button>
      <div className="border-t my-2" />
      <Button
        variant="ghost"
        className="w-full justify-start h-10"
        onClick={() => handleDownloadICS([event])}
      >
        <Download className="h-4 w-4 mr-3" />
        Download ICS file
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start h-10"
        onClick={handleCopyLink}
      >
        {copied ? (
          <Check className="h-4 w-4 mr-3 text-green-600" />
        ) : (
          <Copy className="h-4 w-4 mr-3" />
        )}
        {copied ? 'Copied!' : 'Copy calendar link'}
      </Button>
    </div>
  )
}

interface EventRowProps {
  event: CalendarEvent
  onToggleComplete: (id: string) => void
  compact?: boolean
}

function EventRow({ event, onToggleComplete, compact = false }: EventRowProps) {
  const config = CATEGORY_CONFIG[event.category]
  const Icon = config.icon
  const daysUntil = getDaysUntil(event.startDate)
  const isPast = daysUntil < 0
  const isUrgent = daysUntil >= 0 && daysUntil <= 7
  const isUpcoming = daysUntil > 7 && daysUntil <= 30

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        event.completed ? 'opacity-60 bg-muted/50' : 'bg-card hover:shadow-sm',
        isUrgent && !event.completed && 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10',
        isUpcoming && !event.completed && 'border-yellow-300 dark:border-yellow-700'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('rounded-lg p-2 shrink-0', config.bgColor)}>
          <Icon className={cn('h-5 w-5', config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={cn(
                'font-medium',
                event.completed && 'line-through text-muted-foreground'
              )}
            >
              {event.title}
            </h4>
            <Badge
              variant={
                event.priority === 'high'
                  ? 'destructive'
                  : event.priority === 'medium'
                  ? 'default'
                  : 'secondary'
              }
              className="text-xs"
            >
              {event.priority}
            </Badge>
            {event.recurrence !== 'none' && (
              <Badge variant="outline" className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                {RECURRENCE_LABELS[event.recurrence]}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{event.allDay ? formatDate(event.startDate) : formatDateTime(event.startDate)}</span>
            {!isPast && (
              <span
                className={cn(
                  'font-medium',
                  isUrgent && 'text-red-600 dark:text-red-400',
                  isUpcoming && 'text-yellow-600 dark:text-yellow-400',
                  !isUrgent && !isUpcoming && 'text-green-600 dark:text-green-400'
                )}
              >
                ({daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`})
              </span>
            )}
            {isPast && !event.completed && (
              <span className="font-medium text-red-600 dark:text-red-400">(Overdue)</span>
            )}
          </div>

          {!compact && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}

          {!compact && event.notes && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded p-2">
              <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{event.notes}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleComplete(event.id)}
              className={cn('h-8', event.completed && 'text-green-600 dark:text-green-400')}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {event.completed ? 'Completed' : 'Mark Done'}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8">
                  <CalendarPlus className="h-4 w-4 mr-1" />
                  Add to Calendar
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <CalendarExportMenu event={event} />
              </PopoverContent>
            </Popover>

            {event.reminders.length > 0 && (
              <Badge variant="outline" className="text-xs h-8 gap-1">
                <BellRing className="h-3 w-3" />
                {event.reminders.length} reminder{event.reminders.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface CategorySectionProps {
  category: CalendarEventCategory
  events: CalendarEvent[]
  onToggleComplete: (id: string) => void
  defaultOpen?: boolean
}

function CategorySection({ category, events, onToggleComplete, defaultOpen = true }: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const config = CATEGORY_CONFIG[category]
  const Icon = config.icon
  const pendingCount = events.filter((e) => !e.completed).length

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between h-12 px-4 hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-1.5', config.bgColor)}>
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>
            <span className="font-medium">{config.label}</span>
            <Badge variant="secondary" className="text-xs">
              {pendingCount} pending
            </Badge>
          </div>
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform',
              isOpen && 'transform rotate-90'
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3 px-1">
        {events.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            onToggleComplete={onToggleComplete}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

// ==================== Main Component ====================

export function CalendarIntegration({
  userAge = 40,
  retirementAge = 65,
  portfolioValue = 500000,
  rebalancingFrequency = 'quarterly',
  reviewMeetingFrequency = 'semi-annually',
  customEvents = [],
  onEventAdd,
  onEventRemove,
  className,
}: CalendarIntegrationProps) {
  const currentYear = new Date().getFullYear()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<CalendarEventCategory>>(
    new Set(Object.keys(CATEGORY_CONFIG) as CalendarEventCategory[])
  )
  const [showCompleted, setShowCompleted] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'category'>('timeline')

  // Generate events
  React.useEffect(() => {
    const defaultEvents = generateDefaultFinancialEvents(
      currentYear,
      userAge,
      rebalancingFrequency,
      reviewMeetingFrequency
    )
    setEvents([...defaultEvents, ...customEvents])
  }, [currentYear, userAge, rebalancingFrequency, reviewMeetingFrequency, customEvents])

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => selectedCategories.has(e.category))
      .filter((e) => showCompleted || !e.completed)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }, [events, selectedCategories, showCompleted])

  // Group events by category
  const eventsByCategory = useMemo(() => {
    const grouped: Record<CalendarEventCategory, CalendarEvent[]> = {
      'tax-deadline': [],
      contribution: [],
      'open-enrollment': [],
      rebalancing: [],
      'review-meeting': [],
      rmd: [],
      milestone: [],
      custom: [],
    }
    filteredEvents.forEach((event) => {
      grouped[event.category].push(event)
    })
    return grouped
  }, [filteredEvents])

  // Upcoming urgent events
  const urgentEvents = useMemo(() => {
    return filteredEvents.filter((e) => {
      const days = getDaysUntil(e.startDate)
      return days >= 0 && days <= 14 && !e.completed
    })
  }, [filteredEvents])

  // Toggle event completion
  const handleToggleComplete = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, completed: !e.completed } : e))
    )
  }, [])

  // Export all events
  const handleExportAll = useCallback(() => {
    const icsContent = generateICSContent(filteredEvents)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `financial_calendar_${currentYear}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [filteredEvents, currentYear])

  // Add all to Google Calendar
  const handleAddAllToGoogle = useCallback(() => {
    // For multiple events, we'll open a batch creation
    // Google Calendar doesn't support batch creation via URL, so we download ICS
    handleExportAll()
  }, [handleExportAll])

  // Toggle category filter
  const toggleCategory = useCallback((category: CalendarEventCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  // Stats
  const stats = useMemo(() => ({
    total: events.length,
    pending: events.filter((e) => !e.completed).length,
    urgent: urgentEvents.length,
    completed: events.filter((e) => e.completed).length,
  }), [events, urgentEvents])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Urgent Alerts */}
      {urgentEvents.length > 0 && (
        <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle className="text-red-800 dark:text-red-200">
            {urgentEvents.length} Upcoming Financial Date{urgentEvents.length > 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-300">
            <ul className="mt-2 space-y-1">
              {urgentEvents.slice(0, 3).map((event) => (
                <li key={event.id} className="text-sm flex items-center gap-2">
                  <ChevronRight className="h-3 w-3" />
                  <strong>{event.title}</strong> - {formatDate(event.startDate)} (
                  {getDaysUntil(event.startDate)} days)
                </li>
              ))}
              {urgentEvents.length > 3 && (
                <li className="text-sm text-red-600/80 dark:text-red-400/80">
                  ...and {urgentEvents.length - 3} more
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Financial Calendar
              </CardTitle>
              <CardDescription>
                Never miss an important financial date. Sync with your calendar.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                    <ChevronDown className="h-3 w-3 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-10"
                    onClick={handleExportAll}
                  >
                    <Download className="h-4 w-4 mr-3" />
                    Download ICS File
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-10"
                    onClick={handleAddAllToGoogle}
                  >
                    <Calendar className="h-4 w-4 mr-3" />
                    Add All to Google Calendar
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {stats.pending}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
              <div className="text-xl font-bold text-red-600 dark:text-red-400">
                {stats.urgent}
              </div>
              <div className="text-xs text-muted-foreground">Urgent (14 days)</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {stats.completed}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div className="text-xl font-bold text-gray-600 dark:text-gray-400">
                {stats.total}
              </div>
              <div className="text-xs text-muted-foreground">Total Events</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(CATEGORY_CONFIG) as CalendarEventCategory[]).map((category) => {
                const config = CATEGORY_CONFIG[category]
                const Icon = config.icon
                const isSelected = selectedCategories.has(category)
                const count = eventsByCategory[category].filter((e) => !e.completed).length
                if (count === 0 && !isSelected) return null
                return (
                  <Button
                    key={category}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleCategory(category)}
                    className="h-8"
                  >
                    <Icon className="h-3.5 w-3.5 mr-1" />
                    {config.label}
                    {count > 0 && (
                      <Badge
                        variant={isSelected ? 'secondary' : 'outline'}
                        className="ml-1.5 text-xs h-5 px-1.5"
                      >
                        {count}
                      </Badge>
                    )}
                  </Button>
                )
              })}
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={showCompleted} onCheckedChange={setShowCompleted} />
                Show completed
              </label>
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('timeline')}
                  className="rounded-r-none"
                >
                  Timeline
                </Button>
                <Button
                  variant={viewMode === 'category' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('category')}
                  className="rounded-l-none"
                >
                  By Category
                </Button>
              </div>
            </div>
          </div>

          {/* Events List */}
          {viewMode === 'timeline' ? (
            <div className="space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No events match your filters</p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    onToggleComplete={handleToggleComplete}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(Object.keys(CATEGORY_CONFIG) as CalendarEventCategory[]).map((category) => {
                const categoryEvents = eventsByCategory[category]
                if (categoryEvents.length === 0) return null
                return (
                  <CategorySection
                    key={category}
                    category={category}
                    events={categoryEvents}
                    onToggleComplete={handleToggleComplete}
                    defaultOpen={categoryEvents.some((e) => !e.completed && getDaysUntil(e.startDate) <= 30)}
                  />
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Calendar Sync Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <h4 className="font-medium">Google Calendar</h4>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li>1. Click "Add to Calendar" on any event</li>
                <li>2. Select "Google Calendar"</li>
                <li>3. Review and save the event</li>
              </ol>
            </div>

            <div className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <h4 className="font-medium">Apple Calendar</h4>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li>1. Click "Add to Calendar" on any event</li>
                <li>2. Download the ICS file</li>
                <li>3. Open the file to add to Calendar</li>
              </ol>
            </div>

            <div className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-blue-500" />
                </div>
                <h4 className="font-medium">Outlook</h4>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li>1. Click "Add to Calendar" on any event</li>
                <li>2. Select "Outlook"</li>
                <li>3. Sign in and confirm the event</li>
              </ol>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Bulk Import
            </h4>
            <p className="text-sm text-muted-foreground">
              Download all events as an ICS file to import your entire financial calendar at once.
              Most calendar applications support ICS import through File {">"} Import or by
              double-clicking the downloaded file.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            Financial Calendar Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Bell,
                title: 'Set Multiple Reminders',
                description: 'Important deadlines like tax filing benefit from reminders at 1 month, 2 weeks, and 1 week before.',
              },
              {
                icon: RefreshCw,
                title: 'Review Quarterly',
                description: 'Rebalancing your portfolio quarterly helps maintain your target asset allocation.',
              },
              {
                icon: Users,
                title: 'Schedule Reviews',
                description: 'Regular meetings with a financial advisor keep you on track toward your goals.',
              },
              {
                icon: Target,
                title: 'Track Milestones',
                description: 'Mark age-based milestones like catch-up contributions (50+) and RMDs (73+).',
              },
            ].map((tip, index) => {
              const Icon = tip.icon
              return (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="rounded-lg p-2 bg-green-100 dark:bg-green-900/30 shrink-0">
                    <Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{tip.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{tip.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CalendarIntegration
