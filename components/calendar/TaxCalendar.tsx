'use client'

import * as React from 'react'
import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Calendar,
  CalendarPlus,
  Bell,
  BellRing,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  RefreshCw,
  Heart,
  Wallet,
  Building2,
  PiggyBank,
  TrendingUp,
  Info,
  X,
  Settings,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Calendar as CalendarUI } from '@/components/ui/calendar'
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
import { cn } from '@/lib/utils'

// ==================== Types ====================

export type TaxEventCategory =
  | 'ira'
  | 'estimated-tax'
  | 'rmd'
  | 'enrollment'
  | 'roth-conversion'
  | 'year-end'
  | 'custom'

export type TaxEventPriority = 'high' | 'medium' | 'low'

export type NotificationTiming = '1-week' | '2-weeks' | '1-month' | '3-months'

export interface TaxEvent {
  id: string
  title: string
  description: string
  date: Date
  category: TaxEventCategory
  priority: TaxEventPriority
  recurring: boolean
  recurringPattern?: 'yearly' | 'quarterly'
  actionRequired: boolean
  actionUrl?: string
  notificationEnabled: boolean
  notificationTimings: NotificationTiming[]
  completed: boolean
  applicableAges?: { min?: number; max?: number }
  notes?: string
}

export interface NotificationSchedule {
  eventId: string
  eventTitle: string
  scheduledDate: Date
  timing: NotificationTiming
  sent: boolean
}

export interface TaxCalendarProps {
  userAge?: number
  spouseAge?: number
  isMarried?: boolean
  onEventSelect?: (event: TaxEvent) => void
  onNotificationSchedule?: (notification: NotificationSchedule) => void
  customEvents?: TaxEvent[]
  className?: string
}

// ==================== Constants ====================

const CATEGORY_CONFIG: Record<
  TaxEventCategory,
  { label: string; icon: React.ComponentType<any>; color: string; bgColor: string }
> = {
  ira: {
    label: 'IRA Contributions',
    icon: PiggyBank,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  'estimated-tax': {
    label: 'Estimated Taxes',
    icon: DollarSign,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  rmd: {
    label: 'RMD Deadlines',
    icon: AlertTriangle,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  enrollment: {
    label: 'Open Enrollment',
    icon: Heart,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  'roth-conversion': {
    label: 'Roth Conversion',
    icon: TrendingUp,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  'year-end': {
    label: 'Year-End Planning',
    icon: Calendar,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  custom: {
    label: 'Custom',
    icon: CalendarPlus,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
}

const PRIORITY_CONFIG: Record<TaxEventPriority, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  high: { label: 'High Priority', variant: 'destructive' },
  medium: { label: 'Medium Priority', variant: 'default' },
  low: { label: 'Low Priority', variant: 'secondary' },
}

const NOTIFICATION_TIMING_LABELS: Record<NotificationTiming, string> = {
  '1-week': '1 week before',
  '2-weeks': '2 weeks before',
  '1-month': '1 month before',
  '3-months': '3 months before',
}

// ==================== Helper Functions ====================

function getDateForYear(month: number, day: number, year: number = new Date().getFullYear()): Date {
  return new Date(year, month - 1, day)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDaysUntil(date: Date): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function isDateInPast(date: Date): boolean {
  return getDaysUntil(date) < 0
}

function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ==================== Default Events Generator ====================

function generateDefaultTaxEvents(
  userAge: number = 40,
  spouseAge: number = 40,
  isMarried: boolean = false,
  year: number = new Date().getFullYear()
): TaxEvent[] {
  const events: TaxEvent[] = []

  // 1. IRA Contribution Deadline (April 15)
  events.push({
    id: generateEventId(),
    title: 'IRA Contribution Deadline',
    description: `Last day to make IRA contributions for tax year ${year - 1}. Traditional IRA contributions may be tax-deductible. Roth IRA contributions grow tax-free.`,
    date: getDateForYear(4, 15, year),
    category: 'ira',
    priority: 'high',
    recurring: true,
    recurringPattern: 'yearly',
    actionRequired: true,
    notificationEnabled: true,
    notificationTimings: ['1-month', '2-weeks', '1-week'],
    completed: false,
    notes: `Maximum contribution: $7,000 ($8,000 if age 50+) for ${year - 1}`,
  })

  // 2. Estimated Tax Payment Dates (Quarterly)
  const estimatedTaxDates = [
    { month: 4, day: 15, quarter: 'Q1' },
    { month: 6, day: 15, quarter: 'Q2' },
    { month: 9, day: 15, quarter: 'Q3' },
    { month: 1, day: 15, quarter: 'Q4', nextYear: true },
  ]

  estimatedTaxDates.forEach(({ month, day, quarter, nextYear }) => {
    const eventYear = nextYear ? year + 1 : year
    events.push({
      id: generateEventId(),
      title: `${quarter} Estimated Tax Payment Due`,
      description: `Quarterly estimated tax payment deadline for self-employed individuals and those with significant investment income. Use Form 1040-ES to calculate and pay.`,
      date: getDateForYear(month, day, eventYear),
      category: 'estimated-tax',
      priority: 'high',
      recurring: true,
      recurringPattern: 'quarterly',
      actionRequired: true,
      notificationEnabled: true,
      notificationTimings: ['2-weeks', '1-week'],
      completed: false,
      notes: 'Safe harbor: Pay 100% of prior year tax (110% if AGI > $150k) to avoid penalties',
    })
  })

  // 3. RMD Deadlines (Age-based)
  const rmdStartAge = 73 // SECURE 2.0 Act
  const olderAge = Math.max(userAge, isMarried ? spouseAge : 0)

  if (olderAge >= rmdStartAge - 1) {
    // First RMD deadline (April 1 of year after turning 73)
    if (olderAge === rmdStartAge) {
      events.push({
        id: generateEventId(),
        title: 'First RMD Deadline (Extended)',
        description: `First Required Minimum Distribution deadline. You turned ${rmdStartAge} last year and have until April 1 to take your first RMD. Note: Delaying to April 1 means taking two RMDs this year.`,
        date: getDateForYear(4, 1, year),
        category: 'rmd',
        priority: 'high',
        recurring: false,
        actionRequired: true,
        notificationEnabled: true,
        notificationTimings: ['3-months', '1-month', '2-weeks'],
        completed: false,
        applicableAges: { min: rmdStartAge },
        notes: 'Consider taking first RMD in the year you turn 73 to avoid double taxation',
      })
    }

    // Annual RMD deadline (December 31)
    if (olderAge >= rmdStartAge) {
      events.push({
        id: generateEventId(),
        title: 'Annual RMD Deadline',
        description: 'Required Minimum Distribution must be taken from traditional IRAs, 401(k)s, and other tax-deferred retirement accounts by December 31.',
        date: getDateForYear(12, 31, year),
        category: 'rmd',
        priority: 'high',
        recurring: true,
        recurringPattern: 'yearly',
        actionRequired: true,
        notificationEnabled: true,
        notificationTimings: ['3-months', '1-month', '2-weeks', '1-week'],
        completed: false,
        applicableAges: { min: rmdStartAge },
        notes: 'RMD is calculated using IRS Uniform Lifetime Table and prior year-end balance',
      })
    }
  } else {
    // RMD planning reminder for those approaching RMD age
    if (olderAge >= rmdStartAge - 5) {
      events.push({
        id: generateEventId(),
        title: 'RMD Planning Reminder',
        description: `You will begin RMDs in ${rmdStartAge - olderAge} years. Consider Roth conversions now to reduce future RMD burden and potential tax impact.`,
        date: getDateForYear(10, 1, year),
        category: 'rmd',
        priority: 'medium',
        recurring: true,
        recurringPattern: 'yearly',
        actionRequired: false,
        notificationEnabled: true,
        notificationTimings: ['1-month'],
        completed: false,
        applicableAges: { min: rmdStartAge - 5, max: rmdStartAge - 1 },
        notes: 'Strategic Roth conversions before RMDs begin can provide significant tax benefits',
      })
    }
  }

  // 4. Open Enrollment Periods
  // Medicare Open Enrollment (Oct 15 - Dec 7)
  if (olderAge >= 63) {
    events.push({
      id: generateEventId(),
      title: 'Medicare Open Enrollment Begins',
      description: 'Review and change Medicare Advantage, Medicare Part D, and Medigap coverage. Changes take effect January 1.',
      date: getDateForYear(10, 15, year),
      category: 'enrollment',
      priority: 'high',
      recurring: true,
      recurringPattern: 'yearly',
      actionRequired: true,
      notificationEnabled: true,
      notificationTimings: ['1-month', '2-weeks'],
      completed: false,
      applicableAges: { min: 63 },
      notes: 'Medicare Open Enrollment: Oct 15 - Dec 7',
    })

    events.push({
      id: generateEventId(),
      title: 'Medicare Open Enrollment Ends',
      description: 'Last day to make changes to Medicare coverage for next year.',
      date: getDateForYear(12, 7, year),
      category: 'enrollment',
      priority: 'high',
      recurring: true,
      recurringPattern: 'yearly',
      actionRequired: true,
      notificationEnabled: true,
      notificationTimings: ['2-weeks', '1-week'],
      completed: false,
      applicableAges: { min: 63 },
    })
  }

  // ACA Open Enrollment (Nov 1 - Jan 15)
  if (olderAge < 65) {
    events.push({
      id: generateEventId(),
      title: 'ACA Open Enrollment Begins',
      description: 'Healthcare.gov marketplace open enrollment begins. Review plan options, subsidies, and make changes for next year.',
      date: getDateForYear(11, 1, year),
      category: 'enrollment',
      priority: 'medium',
      recurring: true,
      recurringPattern: 'yearly',
      actionRequired: false,
      notificationEnabled: true,
      notificationTimings: ['2-weeks', '1-week'],
      completed: false,
      applicableAges: { max: 65 },
      notes: 'ACA Open Enrollment: Nov 1 - Jan 15 (dates may vary by state)',
    })
  }

  // 401(k) Open Enrollment (typical employer timing)
  events.push({
    id: generateEventId(),
    title: '401(k) Open Enrollment Reminder',
    description: 'Review and update 401(k) contribution rates and investment allocations. Consider maximizing employer match and catch-up contributions if eligible.',
    date: getDateForYear(11, 1, year),
    category: 'enrollment',
    priority: 'medium',
    recurring: true,
    recurringPattern: 'yearly',
    actionRequired: false,
    notificationEnabled: true,
    notificationTimings: ['2-weeks'],
    completed: false,
    notes: `Max contribution: $23,000 ($30,500 if age 50+) for ${year}`,
  })

  // 5. Roth Conversion Opportunities
  events.push({
    id: generateEventId(),
    title: 'Roth Conversion Planning Window Opens',
    description: 'Begin evaluating Roth conversion opportunities. Early planning allows time to optimize conversions before year-end.',
    date: getDateForYear(9, 1, year),
    category: 'roth-conversion',
    priority: 'medium',
    recurring: true,
    recurringPattern: 'yearly',
    actionRequired: false,
    notificationEnabled: true,
    notificationTimings: ['2-weeks'],
    completed: false,
    notes: 'Consider tax bracket headroom, state taxes, and ACA subsidy impacts',
  })

  events.push({
    id: generateEventId(),
    title: 'Roth Conversion Deadline',
    description: 'Last day to complete Roth conversions that count toward this tax year. Conversions increase taxable income for the year.',
    date: getDateForYear(12, 31, year),
    category: 'roth-conversion',
    priority: 'high',
    recurring: true,
    recurringPattern: 'yearly',
    actionRequired: true,
    notificationEnabled: true,
    notificationTimings: ['1-month', '2-weeks', '1-week'],
    completed: false,
    notes: 'Coordinate with tax-loss harvesting and charitable giving strategies',
  })

  // 6. Year-End Tax Planning Reminders
  events.push({
    id: generateEventId(),
    title: 'Year-End Tax Planning Review',
    description: 'Comprehensive year-end tax planning: Review income, deductions, tax-loss harvesting opportunities, charitable giving, and required distributions.',
    date: getDateForYear(11, 15, year),
    category: 'year-end',
    priority: 'high',
    recurring: true,
    recurringPattern: 'yearly',
    actionRequired: true,
    notificationEnabled: true,
    notificationTimings: ['2-weeks', '1-week'],
    completed: false,
    notes: 'Meet with tax advisor to optimize year-end strategies',
  })

  events.push({
    id: generateEventId(),
    title: 'Tax-Loss Harvesting Deadline',
    description: 'Last trading day to realize capital losses for this tax year. Harvest losses to offset gains while respecting wash-sale rules.',
    date: getDateForYear(12, 31, year),
    category: 'year-end',
    priority: 'high',
    recurring: true,
    recurringPattern: 'yearly',
    actionRequired: true,
    notificationEnabled: true,
    notificationTimings: ['1-month', '2-weeks'],
    completed: false,
    notes: 'Wash-sale rule: Cannot repurchase substantially identical securities within 30 days',
  })

  events.push({
    id: generateEventId(),
    title: 'Charitable Giving Deadline',
    description: 'Last day for charitable contributions to count toward this tax year. Consider donor-advised funds, QCDs (if 70.5+), and appreciated securities.',
    date: getDateForYear(12, 31, year),
    category: 'year-end',
    priority: 'medium',
    recurring: true,
    recurringPattern: 'yearly',
    actionRequired: false,
    notificationEnabled: true,
    notificationTimings: ['1-month', '2-weeks'],
    completed: false,
    notes: 'QCDs up to $105,000 can satisfy RMDs without increasing AGI',
  })

  events.push({
    id: generateEventId(),
    title: 'FSA Use-It-Or-Lose-It Reminder',
    description: 'Check your Flexible Spending Account balance. Most FSAs require funds to be used by December 31 or forfeited (some allow grace period or $610 carryover).',
    date: getDateForYear(12, 1, year),
    category: 'year-end',
    priority: 'medium',
    recurring: true,
    recurringPattern: 'yearly',
    actionRequired: true,
    notificationEnabled: true,
    notificationTimings: ['1-month'],
    completed: false,
    notes: 'Check your specific FSA plan rules for carryover or grace period provisions',
  })

  return events
}

// ==================== Notification Helpers ====================

function calculateNotificationDates(event: TaxEvent): NotificationSchedule[] {
  const schedules: NotificationSchedule[] = []

  if (!event.notificationEnabled) return schedules

  const timingOffsets: Record<NotificationTiming, number> = {
    '1-week': 7,
    '2-weeks': 14,
    '1-month': 30,
    '3-months': 90,
  }

  event.notificationTimings.forEach((timing) => {
    const offset = timingOffsets[timing]
    const scheduledDate = new Date(event.date)
    scheduledDate.setDate(scheduledDate.getDate() - offset)

    if (scheduledDate > new Date()) {
      schedules.push({
        eventId: event.id,
        eventTitle: event.title,
        scheduledDate,
        timing,
        sent: false,
      })
    }
  })

  return schedules
}

function generateICSFile(events: TaxEvent[]): string {
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const escapeICS = (text: string): string => {
    return text.replace(/[,;\\]/g, (match) => '\\' + match).replace(/\n/g, '\\n')
  }

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Retirement Calculator//Tax Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  events.forEach((event) => {
    const endDate = new Date(event.date)
    endDate.setDate(endDate.getDate() + 1)

    ics.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@retirement-calc`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART;VALUE=DATE:${event.date.toISOString().split('T')[0].replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${endDate.toISOString().split('T')[0].replace(/-/g, '')}`,
      `SUMMARY:${escapeICS(event.title)}`,
      `DESCRIPTION:${escapeICS(event.description + (event.notes ? '\\n\\nNotes: ' + event.notes : ''))}`,
      `CATEGORIES:${CATEGORY_CONFIG[event.category].label}`,
      event.recurring ? `RRULE:FREQ=${event.recurringPattern === 'quarterly' ? 'YEARLY;INTERVAL=1' : 'YEARLY'}` : '',
      'END:VEVENT'
    )
  })

  ics.push('END:VCALENDAR')

  return ics.filter(Boolean).join('\r\n')
}

// ==================== Sub-Components ====================

interface EventCardProps {
  event: TaxEvent
  onToggleComplete: (id: string) => void
  onToggleNotification: (id: string) => void
  onAddToCalendar: (event: TaxEvent) => void
  compact?: boolean
}

function EventCard({
  event,
  onToggleComplete,
  onToggleNotification,
  onAddToCalendar,
  compact = false,
}: EventCardProps) {
  const config = CATEGORY_CONFIG[event.category]
  const Icon = config.icon
  const daysUntil = getDaysUntil(event.date)
  const isPast = daysUntil < 0
  const isUrgent = daysUntil >= 0 && daysUntil <= 7
  const isUpcoming = daysUntil > 7 && daysUntil <= 30

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        event.completed ? 'opacity-60 bg-muted/50' : 'bg-card',
        isUrgent && !event.completed && 'border-red-500 dark:border-red-400',
        isUpcoming && !event.completed && 'border-yellow-500 dark:border-yellow-400'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('rounded-lg p-2', config.bgColor)}>
          <Icon className={cn('h-5 w-5', config.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={cn(
                'font-medium truncate',
                event.completed && 'line-through text-muted-foreground'
              )}
            >
              {event.title}
            </h4>
            <Badge variant={PRIORITY_CONFIG[event.priority].variant} className="text-xs">
              {event.priority}
            </Badge>
            {event.actionRequired && !event.completed && (
              <Badge variant="outline" className="text-xs border-orange-500 text-orange-600 dark:text-orange-400">
                Action Required
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(event.date)}</span>
            {!isPast && (
              <span
                className={cn(
                  'font-medium',
                  isUrgent && 'text-red-600 dark:text-red-400',
                  isUpcoming && 'text-yellow-600 dark:text-yellow-400'
                )}
              >
                ({daysUntil === 0 ? 'Today!' : `${daysUntil} days`})
              </span>
            )}
            {isPast && !event.completed && (
              <span className="font-medium text-red-600 dark:text-red-400">
                (Overdue)
              </span>
            )}
          </div>

          {!compact && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}

          {!compact && event.notes && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded p-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{event.notes}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleComplete(event.id)}
              className={cn(
                'h-8',
                event.completed && 'text-green-600 dark:text-green-400'
              )}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {event.completed ? 'Completed' : 'Mark Complete'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleNotification(event.id)}
              className="h-8"
            >
              {event.notificationEnabled ? (
                <>
                  <BellRing className="h-4 w-4 mr-1 text-blue-600 dark:text-blue-400" />
                  Reminders On
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-1" />
                  Set Reminder
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddToCalendar(event)}
              className="h-8"
            >
              <CalendarPlus className="h-4 w-4 mr-1" />
              Add to Calendar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface NotificationSettingsProps {
  event: TaxEvent
  onUpdateTimings: (id: string, timings: NotificationTiming[]) => void
  onClose: () => void
}

function NotificationSettings({ event, onUpdateTimings, onClose }: NotificationSettingsProps) {
  const [timings, setTimings] = useState<NotificationTiming[]>(event.notificationTimings)

  const toggleTiming = (timing: NotificationTiming) => {
    const newTimings = timings.includes(timing)
      ? timings.filter((t) => t !== timing)
      : [...timings, timing]
    setTimings(newTimings)
  }

  const handleSave = () => {
    onUpdateTimings(event.id, timings)
    onClose()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Notification Settings</h4>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Choose when to receive reminders for "{event.title}"
      </p>

      <div className="space-y-2">
        {(Object.keys(NOTIFICATION_TIMING_LABELS) as NotificationTiming[]).map((timing) => (
          <label
            key={timing}
            className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
          >
            <span className="text-sm">{NOTIFICATION_TIMING_LABELS[timing]}</span>
            <Switch
              checked={timings.includes(timing)}
              onCheckedChange={() => toggleTiming(timing)}
            />
          </label>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  )
}

// ==================== Main Component ====================

export function TaxCalendar({
  userAge = 40,
  spouseAge = 40,
  isMarried = false,
  onEventSelect,
  onNotificationSchedule,
  customEvents = [],
  className,
}: TaxCalendarProps) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [events, setEvents] = useState<TaxEvent[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<TaxEventCategory>>(
    new Set(Object.keys(CATEGORY_CONFIG) as TaxEventCategory[])
  )
  const [showCompletedEvents, setShowCompletedEvents] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [notificationSettingsEvent, setNotificationSettingsEvent] = useState<TaxEvent | null>(null)
  const [upcomingAlerts, setUpcomingAlerts] = useState<TaxEvent[]>([])

  // Generate events for the selected year
  useEffect(() => {
    const defaultEvents = generateDefaultTaxEvents(userAge, spouseAge, isMarried, selectedYear)
    const allEvents = [...defaultEvents, ...customEvents]
    setEvents(allEvents)

    // Calculate upcoming alerts (events within 14 days)
    const alerts = allEvents.filter((event) => {
      const daysUntil = getDaysUntil(event.date)
      return daysUntil >= 0 && daysUntil <= 14 && !event.completed
    })
    setUpcomingAlerts(alerts)
  }, [userAge, spouseAge, isMarried, selectedYear, customEvents])

  // Filter events based on selected categories and completion status
  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => selectedCategories.has(event.category))
      .filter((event) => showCompletedEvents || !event.completed)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [events, selectedCategories, showCompletedEvents])

  // Events for the selected date (calendar view)
  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return []
    return filteredEvents.filter(
      (event) =>
        event.date.toDateString() === selectedDate.toDateString()
    )
  }, [filteredEvents, selectedDate])

  // Dates with events (for calendar highlighting)
  const datesWithEvents = useMemo(() => {
    return new Set(
      filteredEvents.map((event) => event.date.toDateString())
    )
  }, [filteredEvents])

  // Toggle category filter
  const toggleCategory = useCallback((category: TaxEventCategory) => {
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

  // Toggle event completion
  const handleToggleComplete = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? { ...event, completed: !event.completed }
          : event
      )
    )
  }, [])

  // Toggle notifications for an event
  const handleToggleNotification = useCallback((eventId: string) => {
    const event = events.find((e) => e.id === eventId)
    if (event) {
      if (event.notificationEnabled) {
        // Turn off notifications
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, notificationEnabled: false } : e
          )
        )
      } else {
        // Open notification settings
        setNotificationSettingsEvent(event)
      }
    }
  }, [events])

  // Update notification timings
  const handleUpdateNotificationTimings = useCallback(
    (eventId: string, timings: NotificationTiming[]) => {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId
            ? { ...event, notificationEnabled: true, notificationTimings: timings }
            : event
        )
      )

      // Schedule notifications
      const event = events.find((e) => e.id === eventId)
      if (event && onNotificationSchedule) {
        const schedules = calculateNotificationDates({ ...event, notificationTimings: timings })
        schedules.forEach(onNotificationSchedule)
      }
    },
    [events, onNotificationSchedule]
  )

  // Add event to external calendar
  const handleAddToCalendar = useCallback((event: TaxEvent) => {
    const icsContent = generateICSFile([event])
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${event.title.replace(/\s+/g, '_')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  // Export all events to calendar
  const handleExportAll = useCallback(() => {
    const icsContent = generateICSFile(filteredEvents)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tax_calendar_${selectedYear}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [filteredEvents, selectedYear])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Urgent Alerts */}
      {upcomingAlerts.length > 0 && (
        <Alert variant="destructive" className="border-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Upcoming Tax Deadlines</AlertTitle>
          <AlertDescription>
            You have {upcomingAlerts.length} important tax deadline
            {upcomingAlerts.length > 1 ? 's' : ''} in the next 14 days:
            <ul className="mt-2 space-y-1">
              {upcomingAlerts.slice(0, 3).map((event) => (
                <li key={event.id} className="text-sm">
                  <strong>{event.title}</strong> - {formatDate(event.date)} (
                  {getDaysUntil(event.date)} days)
                </li>
              ))}
              {upcomingAlerts.length > 3 && (
                <li className="text-sm text-muted-foreground">
                  ...and {upcomingAlerts.length - 3} more
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
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Tax Calendar
              </CardTitle>
              <CardDescription>
                Important tax dates and deadlines for retirement planning
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear((y) => y - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium w-16 text-center">{selectedYear}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedYear((y) => y + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedYear(currentYear)}
                className="ml-2"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Today
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters and Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {(Object.keys(CATEGORY_CONFIG) as TaxEventCategory[]).map((category) => {
                const config = CATEGORY_CONFIG[category]
                const Icon = config.icon
                const isSelected = selectedCategories.has(category)
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
                  </Button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={showCompletedEvents}
                  onCheckedChange={setShowCompletedEvents}
                />
                Show completed
              </label>

              <Button variant="outline" size="sm" onClick={handleExportAll}>
                <Download className="h-4 w-4 mr-1" />
                Export All
              </Button>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 border-b pb-4">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              List View
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              Calendar View
            </Button>
          </div>

          {/* Content */}
          {viewMode === 'list' ? (
            <div className="space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No events match your filters
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onToggleComplete={handleToggleComplete}
                    onToggleNotification={handleToggleNotification}
                    onAddToCalendar={handleAddToCalendar}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-shrink-0">
                <CalendarUI
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasEvent: (date) => datesWithEvents.has(date.toDateString()),
                  }}
                  modifiersStyles={{
                    hasEvent: {
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                      textDecorationColor: 'hsl(var(--primary))',
                    },
                  }}
                  className="rounded-md border"
                />
              </div>

              <div className="flex-1 space-y-3">
                <h4 className="font-medium">
                  Events for {selectedDate ? formatDate(selectedDate) : 'Selected Date'}
                </h4>
                {eventsForSelectedDate.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No events on this date
                  </p>
                ) : (
                  eventsForSelectedDate.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onToggleComplete={handleToggleComplete}
                      onToggleNotification={handleToggleNotification}
                      onAddToCalendar={handleAddToCalendar}
                      compact
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings Modal */}
      {notificationSettingsEvent && (
        <Card className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto shadow-xl">
          <CardContent className="p-6">
            <NotificationSettings
              event={notificationSettingsEvent}
              onUpdateTimings={handleUpdateNotificationTimings}
              onClose={() => setNotificationSettingsEvent(null)}
            />
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendar Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {events.filter((e) => !e.completed).length}
              </div>
              <div className="text-sm text-muted-foreground">Pending Events</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {events.filter((e) => e.priority === 'high' && !e.completed).length}
              </div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {events.filter((e) => getDaysUntil(e.date) <= 30 && getDaysUntil(e.date) >= 0 && !e.completed).length}
              </div>
              <div className="text-sm text-muted-foreground">Due in 30 Days</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {events.filter((e) => e.completed).length}
              </div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Age-Based Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Age-Based Tax Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { age: 50, title: 'Catch-Up Contributions', description: 'Additional $7,500 to 401(k) and $1,000 to IRA annually' },
              { age: 55, title: '401(k) Early Withdrawal', description: 'Penalty-free 401(k) withdrawals if you leave job at 55+' },
              { age: 59.5, title: 'Penalty-Free IRA Withdrawals', description: 'Access retirement funds without 10% early withdrawal penalty' },
              { age: 62, title: 'Social Security Eligibility', description: 'Earliest age to claim Social Security (with reduced benefits)' },
              { age: 65, title: 'Medicare Eligibility', description: 'Enroll in Medicare Parts A and B' },
              { age: 67, title: 'Full Retirement Age', description: 'Full Social Security benefits for those born 1960 or later' },
              { age: 70, title: 'Maximum Social Security', description: 'Maximum delayed retirement credits for Social Security' },
              { age: 70.5, title: 'QCD Eligibility', description: 'Qualified Charitable Distributions from IRA (up to $105,000)' },
              { age: 73, title: 'RMDs Begin', description: 'Required Minimum Distributions from traditional retirement accounts' },
            ].map((milestone) => {
              const yearsUntil = milestone.age - userAge
              const isPast = yearsUntil < 0
              const isCurrent = yearsUntil >= 0 && yearsUntil <= 2

              return (
                <div
                  key={milestone.age}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border',
                    isPast && 'opacity-50',
                    isCurrent && 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold',
                      isPast
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        : isCurrent
                        ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {milestone.age}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{milestone.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {milestone.description}
                    </div>
                    {!isPast && (
                      <div className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                        {yearsUntil === 0
                          ? 'This year!'
                          : `In ${yearsUntil} year${yearsUntil > 1 ? 's' : ''}`}
                      </div>
                    )}
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

export default TaxCalendar
