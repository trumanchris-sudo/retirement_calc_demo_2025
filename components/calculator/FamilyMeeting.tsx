'use client'

import { useState, useMemo } from 'react'
import {
  Heart,
  Calendar,
  PiggyBank,
  TrendingUp,
  GraduationCap,
  Gift,
  FileText,
  Users,
  CheckCircle2,
  Printer,
  ChevronRight,
  Target,
  DollarSign,
  Clock,
  Sparkles,
  BookOpen,
  Home,
  CreditCard,
  Landmark,
  Scale,
  Shield,
  MessageCircle,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { cn, fmt } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface AgendaItem {
  title: string
  duration: string
  description: string
  talkingPoints: string[]
}

interface AgeGroup {
  range: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  concepts: string[]
  activities: string[]
  conversations: string[]
  milestones: string[]
}

interface PrintableGuide {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

// ============================================================================
// Data
// ============================================================================

const MONEY_DATE_AGENDA: AgendaItem[] = [
  {
    title: 'Check-In (5 min)',
    duration: '5 min',
    description: 'How are we feeling about money this month?',
    talkingPoints: [
      'Any financial stress or wins to share?',
      'Anything keeping you up at night?',
      'Celebrate a recent money win together',
    ],
  },
  {
    title: 'Net Worth Review (5 min)',
    duration: '5 min',
    description: 'Quick review of where we stand',
    talkingPoints: [
      'Review total assets vs. liabilities',
      'Note any significant changes',
      'Are we on track with our goals?',
    ],
  },
  {
    title: 'Budget Check (10 min)',
    duration: '10 min',
    description: 'How did we do last month?',
    talkingPoints: [
      'Review spending vs. budget by category',
      'Identify any overspending areas',
      'Discuss any unexpected expenses',
      'Adjust categories if needed',
    ],
  },
  {
    title: 'Goal Progress (5 min)',
    duration: '5 min',
    description: 'Are we moving toward our dreams?',
    talkingPoints: [
      'Review progress on each financial goal',
      'Celebrate milestones reached',
      'Adjust timelines if needed',
    ],
  },
  {
    title: 'Next Month Priorities (5 min)',
    duration: '5 min',
    description: 'What should we focus on?',
    talkingPoints: [
      'Any upcoming big expenses?',
      'Savings goals for next month',
      'One thing to improve financially',
    ],
  },
]

const AGE_GROUPS: AgeGroup[] = [
  {
    range: '5-10',
    title: 'Foundation Years',
    icon: PiggyBank,
    concepts: [
      'Money is exchanged for goods and services',
      'Wants vs. Needs distinction',
      'Saving takes time and patience',
      'Coins and bills have different values',
    ],
    activities: [
      'Set up three jars: Save, Spend, Give',
      'Let them pay for small items at the store',
      'Play money-counting games',
      'Start a chore-based allowance system',
    ],
    conversations: [
      '"When I was your age, I saved for..."',
      '"Why do you think this costs more than that?"',
      '"What would you like to save for?"',
      '"How can we help others with some of our money?"',
    ],
    milestones: [
      'Can count money accurately',
      'Understands delayed gratification',
      'Saves for a goal successfully',
      'Makes a charitable donation',
    ],
  },
  {
    range: '11-15',
    title: 'Discovery Years',
    icon: TrendingUp,
    concepts: [
      'Compound interest: "Money making money"',
      'Banks and how they work',
      'Budgeting basics',
      'Opportunity cost',
    ],
    activities: [
      'Open first bank account together',
      'Use a compound interest calculator',
      'Create their first simple budget',
      'Track spending for a month',
    ],
    conversations: [
      '"Let me show you how $100 grows over 50 years..."',
      '"Why do you think we save for retirement now?"',
      '"What trade-offs do you make with your money?"',
      '"How do credit cards really work?"',
    ],
    milestones: [
      'Has own bank account',
      'Can explain compound interest',
      'Tracks own spending',
      'Sets and achieves savings goals',
    ],
  },
  {
    range: '16-18',
    title: 'Launch Prep Years',
    icon: GraduationCap,
    concepts: [
      'Income, taxes, and paychecks',
      'Roth IRA and tax-advantaged accounts',
      'Building good credit',
      'Investment basics',
    ],
    activities: [
      'Get first job - discuss paycheck breakdown',
      'Open Roth IRA with parental contribution',
      'Create real budget with income',
      'Research college costs together',
    ],
    conversations: [
      '"Your first job is a huge opportunity - here\'s why..."',
      '"This Roth IRA could be worth $X by retirement"',
      '"Let\'s look at what college actually costs"',
      '"How credit scores affect your future"',
    ],
    milestones: [
      'Has first job',
      'Owns a Roth IRA',
      'Understands tax basics',
      'Has financial goals for college/career',
    ],
  },
  {
    range: '18-25',
    title: 'Independence Years',
    icon: Home,
    concepts: [
      'Credit building and management',
      'Student loan strategies',
      'First 401(k) and employer match',
      'Emergency fund importance',
      'Insurance basics',
    ],
    activities: [
      'Set up automatic 401(k) contributions',
      'Create student loan payoff plan',
      'Build 3-6 month emergency fund',
      'Get first credit card responsibly',
    ],
    conversations: [
      '"Always get the full employer match - it\'s free money"',
      '"Here\'s our family\'s approach to debt..."',
      '"What\'s your plan for financial independence?"',
      '"Let\'s calculate your true cost of living"',
    ],
    milestones: [
      'Contributing to 401(k) with full match',
      'Has emergency fund started',
      'Good credit score building',
      'Living within means independently',
    ],
  },
]

const ROTH_IRA_GROWTH_RATE = 0.08 // 8% average annual return assumption

const ESTATE_CONVERSATION_TOPICS = [
  {
    title: 'Where Important Documents Are',
    icon: FileText,
    points: [
      'Will and trust documents',
      'Insurance policies',
      'Property deeds and titles',
      'Investment account information',
      'Digital passwords and access',
    ],
  },
  {
    title: 'Who to Contact',
    icon: Users,
    points: [
      'Estate attorney',
      'Financial advisor',
      'Insurance agent',
      'Accountant/CPA',
      'Trusted family members',
    ],
  },
  {
    title: 'General Wishes',
    icon: Heart,
    points: [
      'Healthcare preferences',
      'End-of-life wishes',
      'Charitable intentions',
      'Family heirloom distribution',
      'Business succession (if applicable)',
    ],
  },
  {
    title: 'What Kids Should Know',
    icon: MessageCircle,
    points: [
      'You don\'t need to share exact amounts',
      'Focus on values and intentions',
      'Explain the "why" behind decisions',
      'Make it a conversation, not a lecture',
      'Revisit as circumstances change',
    ],
  },
]

const PRINTABLE_GUIDES: PrintableGuide[] = [
  {
    id: 'money-date',
    title: 'Monthly Money Date Agenda',
    description: '30-minute couple\'s financial check-in template',
    icon: Heart,
  },
  {
    id: 'kids-worksheet',
    title: 'Kids Money Worksheet',
    description: 'Age-appropriate savings goal tracker',
    icon: PiggyBank,
  },
  {
    id: 'roth-gift',
    title: 'Roth IRA Gift Card',
    description: 'Printable card explaining the gift',
    icon: Gift,
  },
  {
    id: 'milestone-cert',
    title: 'Financial Milestone Certificate',
    description: 'Celebrate achievements together',
    icon: Star,
  },
  {
    id: 'estate-checklist',
    title: 'Estate Conversation Checklist',
    description: 'Guide for the difficult conversations',
    icon: Shield,
  },
  {
    id: 'compound-visual',
    title: 'Compound Growth Poster',
    description: 'Visual aid for teaching kids',
    icon: TrendingUp,
  },
]

// ============================================================================
// Utility Functions
// ============================================================================

function calculateFutureValue(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  years: number
): number {
  const monthlyRate = annualRate / 12
  const months = years * 12

  // Future value of initial principal
  const fvPrincipal = principal * Math.pow(1 + annualRate, years)

  // Future value of monthly contributions (annuity formula)
  const fvContributions =
    monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)

  return fvPrincipal + fvContributions
}

// ============================================================================
// Sub-Components
// ============================================================================

function MoneyDateGuide() {
  const [completedItems, setCompletedItems] = useState<Set<number>>(new Set())

  const toggleItem = (index: number) => {
    const newSet = new Set(completedItems)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setCompletedItems(newSet)
  }

  const progress = (completedItems.size / MONEY_DATE_AGENDA.length) * 100

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Heart className="h-8 w-8 text-pink-500" />
          <h2 className="text-2xl font-bold">Monthly Money Date</h2>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto">
          A 30-minute monthly ritual to get aligned with your partner on finances.
          Turn money stress into money teamwork.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Meeting Progress</span>
          <span>{completedItems.size} of {MONEY_DATE_AGENDA.length} complete</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-pink-500 to-rose-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Agenda Items */}
      <div className="space-y-3">
        {MONEY_DATE_AGENDA.map((item, index) => (
          <Card
            key={index}
            className={cn(
              'transition-all duration-300 cursor-pointer',
              completedItems.has(index)
                ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                : 'hover:border-pink-300 hover:shadow-md'
            )}
            onClick={() => toggleItem(index)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                    completedItems.has(index)
                      ? 'bg-green-500 text-white'
                      : 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300'
                  )}
                >
                  {completedItems.has(index) ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="font-semibold text-sm">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{item.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {item.duration}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  <ul className="mt-3 space-y-1">
                    {item.talkingPoints.map((point, pointIndex) => (
                      <li key={pointIndex} className="flex items-start gap-2 text-sm">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tips Box */}
      <Card className="border-pink-200 bg-pink-50/50 dark:bg-pink-950/20">
        <CardContent className="p-4">
          <h4 className="font-semibold flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-pink-500" />
            Money Date Tips
          </h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>- Schedule it on the calendar - treat it like any important meeting</li>
            <li>- Pour a drink, light a candle - make it enjoyable!</li>
            <li>- No blame, no shame - focus on the future together</li>
            <li>- Celebrate wins, no matter how small</li>
            <li>- End with something positive and a hug</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function KidsConversations() {
  const [activeAge, setActiveAge] = useState<string>('5-10')
  const activeGroup = AGE_GROUPS.find((g) => g.range === activeAge) || AGE_GROUPS[0]
  const Icon = activeGroup.icon

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <BookOpen className="h-8 w-8 text-blue-500" />
          <h2 className="text-2xl font-bold">Teaching Kids About Money</h2>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Age-appropriate conversations and activities to raise financially literate children.
        </p>
      </div>

      {/* Age Selector */}
      <div className="flex flex-wrap justify-center gap-2">
        {AGE_GROUPS.map((group) => {
          const GroupIcon = group.icon
          return (
            <Button
              key={group.range}
              variant={activeAge === group.range ? 'default' : 'outline'}
              onClick={() => setActiveAge(group.range)}
              className="flex items-center gap-2"
            >
              <GroupIcon className="h-4 w-4" />
              Ages {group.range}
            </Button>
          )
        })}
      </div>

      {/* Active Age Group Content */}
      <Card className="border-2 border-blue-200 bg-blue-50/30 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <Icon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <CardTitle>Ages {activeGroup.range}: {activeGroup.title}</CardTitle>
              <CardDescription>Key concepts and activities for this stage</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Concepts */}
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-blue-500" />
                Key Concepts to Teach
              </h4>
              <ul className="space-y-2">
                {activeGroup.concepts.map((concept, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <span>{concept}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Activities */}
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Activities
              </h4>
              <ul className="space-y-2">
                {activeGroup.activities.map((activity, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                    <span>{activity}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conversations */}
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-green-500" />
                Conversation Starters
              </h4>
              <ul className="space-y-2">
                {activeGroup.conversations.map((convo, i) => (
                  <li key={i} className="text-sm italic text-muted-foreground bg-white dark:bg-gray-800 p-2 rounded border">
                    {convo}
                  </li>
                ))}
              </ul>
            </div>

            {/* Milestones */}
            <div>
              <h4 className="font-semibold flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Milestones to Celebrate
              </h4>
              <ul className="space-y-2">
                {activeGroup.milestones.map((milestone, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    <span>{milestone}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RothIRAGift() {
  const [teenAge, setTeenAge] = useState(16)
  const [contribution, setContribution] = useState(6500)
  const retirementAge = 65
  const yearsToGrow = retirementAge - teenAge

  const futureValue = useMemo(() => {
    return calculateFutureValue(contribution, 0, ROTH_IRA_GROWTH_RATE, yearsToGrow)
  }, [contribution, yearsToGrow])

  const growthMultiple = futureValue / contribution

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Gift className="h-8 w-8 text-emerald-500" />
          <h2 className="text-2xl font-bold">The Roth IRA Gift</h2>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto">
          The most powerful gift you can give your working teenager:
          tax-free growth for 50+ years.
        </p>
      </div>

      <Card className="border-2 border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20">
        <CardHeader>
          <CardTitle className="text-center">Calculate the Gift</CardTitle>
          <CardDescription className="text-center">
            See how a single contribution grows over time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Teen Age Slider */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Teen's Current Age</label>
              <span className="text-sm font-semibold text-emerald-600">{teenAge} years old</span>
            </div>
            <Slider
              value={[teenAge]}
              onValueChange={([val]) => setTeenAge(val)}
              min={14}
              max={22}
              step={1}
              className="w-full"
              thumbLabel="Teen age"
            />
            <p className="text-xs text-muted-foreground">
              Must have earned income to contribute
            </p>
          </div>

          {/* Contribution Slider */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Contribution Amount</label>
              <span className="text-sm font-semibold text-emerald-600">{fmt(contribution)}</span>
            </div>
            <Slider
              value={[contribution]}
              onValueChange={([val]) => setContribution(val)}
              min={500}
              max={7000}
              step={100}
              className="w-full"
              thumbLabel="Contribution amount"
            />
            <p className="text-xs text-muted-foreground">
              2024 limit: $7,000 (or total earned income, whichever is less)
            </p>
          </div>

          {/* Result */}
          <div className="text-center py-6 space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">At age 65, this becomes...</p>
              <p className="text-5xl font-bold text-emerald-600">{fmt(futureValue)}</p>
              <p className="text-sm text-muted-foreground">
                Assuming 8% average annual return
              </p>
            </div>

            <div className="flex justify-center gap-8 pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{yearsToGrow}</p>
                <p className="text-xs text-muted-foreground">Years to Grow</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{growthMultiple.toFixed(0)}x</p>
                <p className="text-xs text-muted-foreground">Growth Multiple</p>
              </div>
            </div>
          </div>

          {/* Key Points */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border space-y-3">
            <h4 className="font-semibold">Why This is the BEST Gift:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><strong>Tax-free growth</strong> - Never pay taxes on 50 years of gains</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><strong>Tax-free withdrawals</strong> - In retirement, all this money is tax-free</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><strong>Contribution access</strong> - Original contributions can be withdrawn anytime</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><strong>Teaching moment</strong> - They learn about investing early</span>
              </li>
            </ul>
          </div>

          {/* How To */}
          <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold">How to Give This Gift:</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Teen must have earned income (job, babysitting, etc.)</li>
              <li>Open a custodial Roth IRA at Fidelity, Schwab, or Vanguard</li>
              <li>You can contribute up to their earned income amount</li>
              <li>They technically "own" it - you're just funding it</li>
              <li>When they turn 18/21, it transfers to their full control</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CompoundGrowthVisualizer() {
  const [monthlyAmount, setMonthlyAmount] = useState(100)
  const [startingAge, setStartingAge] = useState(20)
  const endAge = 65

  const yearlyData = useMemo(() => {
    const data: { age: number; contributed: number; total: number }[] = []
    let total = 0
    let contributed = 0
    const yearlyContribution = monthlyAmount * 12

    for (let age = startingAge; age <= endAge; age++) {
      contributed += yearlyContribution
      total = (total + yearlyContribution) * (1 + ROTH_IRA_GROWTH_RATE)
      data.push({ age, contributed, total })
    }
    return data
  }, [monthlyAmount, startingAge])

  const finalTotal = yearlyData[yearlyData.length - 1]?.total || 0
  const totalContributed = yearlyData[yearlyData.length - 1]?.contributed || 0
  const totalGrowth = finalTotal - totalContributed
  const maxValue = finalTotal

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="h-8 w-8 text-violet-500" />
          <h2 className="text-2xl font-bold">Compound Growth Magic</h2>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto">
          An interactive visualization to teach kids (and remind adults) about
          the power of starting early.
        </p>
      </div>

      <Card className="border-2 border-violet-200 bg-violet-50/30 dark:bg-violet-950/20">
        <CardContent className="p-6 space-y-6">
          {/* Controls */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Monthly Savings</label>
                <span className="text-sm font-semibold text-violet-600">{fmt(monthlyAmount)}/mo</span>
              </div>
              <Slider
                value={[monthlyAmount]}
                onValueChange={([val]) => setMonthlyAmount(val)}
                min={25}
                max={500}
                step={25}
                className="w-full"
                thumbLabel="Monthly savings"
              />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Starting Age</label>
                <span className="text-sm font-semibold text-violet-600">Age {startingAge}</span>
              </div>
              <Slider
                value={[startingAge]}
                onValueChange={([val]) => setStartingAge(val)}
                min={15}
                max={45}
                step={1}
                className="w-full"
                thumbLabel="Starting age"
              />
            </div>
          </div>

          {/* Visual Growth Chart */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-center">Watch Your Money Grow</h4>
            <div className="h-48 flex items-end gap-1 overflow-x-auto pb-2">
              {yearlyData.map((d, i) => {
                const height = (d.total / maxValue) * 100
                const contributionHeight = (d.contributed / maxValue) * 100
                return (
                  <div
                    key={d.age}
                    className="flex-1 min-w-[8px] flex flex-col justify-end relative group"
                  >
                    {/* Growth portion */}
                    <div
                      className="bg-violet-500 rounded-t-sm transition-all duration-300"
                      style={{ height: `${height - contributionHeight}%` }}
                    />
                    {/* Contribution portion */}
                    <div
                      className="bg-violet-300 transition-all duration-300"
                      style={{ height: `${contributionHeight}%` }}
                    />
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        Age {d.age}: {fmt(d.total)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Age {startingAge}</span>
              <span>Age {endAge}</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-violet-300 rounded" />
              <span>Your Contributions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-violet-500 rounded" />
              <span>Growth (Free Money!)</span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 text-center bg-white dark:bg-gray-800 rounded-lg p-4">
            <div>
              <p className="text-2xl font-bold text-violet-600">{fmt(totalContributed)}</p>
              <p className="text-xs text-muted-foreground">You Put In</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{fmt(totalGrowth)}</p>
              <p className="text-xs text-muted-foreground">Growth Earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-violet-800 dark:text-violet-300">{fmt(finalTotal)}</p>
              <p className="text-xs text-muted-foreground">Total at 65</p>
            </div>
          </div>

          {/* Kid-Friendly Explanation */}
          <div className="bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-lg p-4 text-center">
            <p className="text-lg font-semibold mb-2">
              In Simple Terms:
            </p>
            <p className="text-muted-foreground">
              If you save <span className="font-bold text-violet-600">{fmt(monthlyAmount)}</span> every month
              starting at age <span className="font-bold text-violet-600">{startingAge}</span>,
              you'll have <span className="font-bold text-emerald-600">{fmt(finalTotal)}</span> by age 65.
              That's <span className="font-bold">{(finalTotal / totalContributed).toFixed(0)}x</span> what you put in!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function EstateConversation() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Shield className="h-8 w-8 text-amber-500" />
          <h2 className="text-2xl font-bold">The Estate Conversation</h2>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto">
          "Your parents need to talk to you about..." - Start the conversation
          that could save your family stress and confusion.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {ESTATE_CONVERSATION_TOPICS.map((topic, index) => {
          const Icon = topic.icon
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Icon className="h-5 w-5 text-amber-500" />
                  {topic.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {topic.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Conversation Tips */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-amber-500" />
            Tips for Having "The Talk"
          </h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium mb-2">For Parents Starting the Conversation:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>- Pick a calm, private time - not during a crisis</li>
                <li>- Start with "I want to make things easier for you someday"</li>
                <li>- Focus on logistics, not dollar amounts</li>
                <li>- It's okay to do this in multiple conversations</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">For Adult Children Asking:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>- Lead with love, not money</li>
                <li>- "I want to be able to help if something happens"</li>
                <li>- Offer to help organize documents</li>
                <li>- Respect their boundaries and timing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MultiGenerationalPlan() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Users className="h-8 w-8 text-indigo-500" />
          <h2 className="text-2xl font-bold">The 100-Year Plan</h2>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto">
          "You're part of something bigger" - Building generational wealth is a team effort
          across generations.
        </p>
      </div>

      <Card className="border-2 border-indigo-200 bg-indigo-50/30 dark:bg-indigo-950/20">
        <CardContent className="p-6 space-y-6">
          {/* Timeline Visualization */}
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-indigo-200 dark:bg-indigo-800" />

            {/* Generation 1 */}
            <div className="relative pl-16 pb-8">
              <div className="absolute left-4 w-5 h-5 rounded-full bg-indigo-500 border-4 border-white dark:border-gray-900" />
              <h4 className="font-semibold text-lg">Generation 1: The Founders</h4>
              <p className="text-sm text-muted-foreground mb-2">You start the legacy</p>
              <ul className="text-sm space-y-1">
                <li>- Max out Roth IRA contributions</li>
                <li>- Contribute to 401(k) with employer match</li>
                <li>- Live below your means</li>
                <li>- Teach kids about money early</li>
              </ul>
            </div>

            {/* Generation 2 */}
            <div className="relative pl-16 pb-8">
              <div className="absolute left-4 w-5 h-5 rounded-full bg-indigo-400 border-4 border-white dark:border-gray-900" />
              <h4 className="font-semibold text-lg">Generation 2: The Builders</h4>
              <p className="text-sm text-muted-foreground mb-2">Your children continue the work</p>
              <ul className="text-sm space-y-1">
                <li>- Start Roth IRA as teenagers (your gift)</li>
                <li>- Graduate debt-free or minimal debt</li>
                <li>- Inherit your values AND your wealth</li>
                <li>- Multiply the foundation you built</li>
              </ul>
            </div>

            {/* Generation 3 */}
            <div className="relative pl-16 pb-8">
              <div className="absolute left-4 w-5 h-5 rounded-full bg-indigo-300 border-4 border-white dark:border-gray-900" />
              <h4 className="font-semibold text-lg">Generation 3: The Inheritors</h4>
              <p className="text-sm text-muted-foreground mb-2">Your grandchildren benefit</p>
              <ul className="text-sm space-y-1">
                <li>- Receive inherited Roth IRA (tax-free!)</li>
                <li>- Start adulthood with financial education</li>
                <li>- Option to pursue passion over paycheck</li>
                <li>- Continue the family legacy</li>
              </ul>
            </div>

            {/* Generation 4+ */}
            <div className="relative pl-16">
              <div className="absolute left-4 w-5 h-5 rounded-full bg-indigo-200 border-4 border-white dark:border-gray-900" />
              <h4 className="font-semibold text-lg">Generation 4+: The Dynasty</h4>
              <p className="text-sm text-muted-foreground mb-2">100 years and beyond</p>
              <ul className="text-sm space-y-1">
                <li>- Family financial values embedded in culture</li>
                <li>- Wealth continues to compound</li>
                <li>- Philanthropy and giving back</li>
                <li>- Your legacy lives on</li>
              </ul>
            </div>
          </div>

          {/* Why Roth */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Landmark className="h-5 w-5 text-indigo-500" />
              Why Roth is Key to the Dynasty
            </h4>
            <ul className="text-sm space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <span><strong>Tax-free inheritance</strong> - Heirs pay no income tax on inherited Roth</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <span><strong>10-year stretch</strong> - Beneficiaries have 10 years to withdraw (post-SECURE Act)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <span><strong>No RMDs for owner</strong> - Let it grow your entire life if you don't need it</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <span><strong>Hedge against tax increases</strong> - Locked in at today's rates</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Family Meeting Prompt */}
      <Card className="border-indigo-300 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
        <CardContent className="p-6 text-center">
          <h4 className="font-semibold text-lg mb-2">Start the Conversation</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Gather your family and say:
          </p>
          <blockquote className="text-lg italic border-l-4 border-indigo-500 pl-4 text-left">
            "We're not just saving for retirement. We're building something that will
            last beyond us. You're part of a 100-year plan, and here's how..."
          </blockquote>
        </CardContent>
      </Card>
    </div>
  )
}

function PrintableMaterials() {
  const handlePrint = (guideId: string) => {
    // In a real implementation, this would trigger printing of specific content
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Printer className="h-8 w-8 text-gray-600" />
          <h2 className="text-2xl font-bold">Printable Materials</h2>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Download and print these guides to use during family meetings
          and teaching moments.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PRINTABLE_GUIDES.map((guide) => {
          const Icon = guide.icon
          return (
            <Card
              key={guide.id}
              className="hover:shadow-md transition-all hover:border-blue-300 cursor-pointer group"
              onClick={() => handlePrint(guide.id)}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
                  <Icon className="h-6 w-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm">{guide.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{guide.description}</p>
                </div>
                <Printer className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Print All Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={() => window.print()}
          className="flex items-center gap-2"
        >
          <Printer className="h-5 w-5" />
          Print This Entire Guide
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function FamilyMeeting() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="flex items-center justify-center gap-3">
          <Users className="h-10 w-10 text-blue-600" />
          <h1 className="text-3xl md:text-4xl font-bold">Family Financial Meeting Guide</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Break the taboo of talking about money. Build wealth as a team.
          Teach the next generation.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-4">
          <Badge variant="secondary" className="text-sm py-1">
            <Heart className="h-3 w-3 mr-1" />
            For Couples
          </Badge>
          <Badge variant="secondary" className="text-sm py-1">
            <BookOpen className="h-3 w-3 mr-1" />
            For Kids
          </Badge>
          <Badge variant="secondary" className="text-sm py-1">
            <Users className="h-3 w-3 mr-1" />
            For Families
          </Badge>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="couples" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="couples" className="flex items-center gap-1.5 flex-1 min-w-[120px]">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Money Date</span>
            <span className="sm:hidden">Couples</span>
          </TabsTrigger>
          <TabsTrigger value="kids" className="flex items-center gap-1.5 flex-1 min-w-[120px]">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Kids Guide</span>
            <span className="sm:hidden">Kids</span>
          </TabsTrigger>
          <TabsTrigger value="roth-gift" className="flex items-center gap-1.5 flex-1 min-w-[120px]">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">Roth Gift</span>
            <span className="sm:hidden">Gift</span>
          </TabsTrigger>
          <TabsTrigger value="compound" className="flex items-center gap-1.5 flex-1 min-w-[120px]">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Compound</span>
            <span className="sm:hidden">Growth</span>
          </TabsTrigger>
          <TabsTrigger value="estate" className="flex items-center gap-1.5 flex-1 min-w-[120px]">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Estate Talk</span>
            <span className="sm:hidden">Estate</span>
          </TabsTrigger>
          <TabsTrigger value="dynasty" className="flex items-center gap-1.5 flex-1 min-w-[120px]">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">100-Year Plan</span>
            <span className="sm:hidden">Dynasty</span>
          </TabsTrigger>
          <TabsTrigger value="print" className="flex items-center gap-1.5 flex-1 min-w-[120px]">
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
            <span className="sm:hidden">Print</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="couples" className="mt-6">
          <MoneyDateGuide />
        </TabsContent>

        <TabsContent value="kids" className="mt-6">
          <KidsConversations />
        </TabsContent>

        <TabsContent value="roth-gift" className="mt-6">
          <RothIRAGift />
        </TabsContent>

        <TabsContent value="compound" className="mt-6">
          <CompoundGrowthVisualizer />
        </TabsContent>

        <TabsContent value="estate" className="mt-6">
          <EstateConversation />
        </TabsContent>

        <TabsContent value="dynasty" className="mt-6">
          <MultiGenerationalPlan />
        </TabsContent>

        <TabsContent value="print" className="mt-6">
          <PrintableMaterials />
        </TabsContent>
      </Tabs>

      {/* Footer Note */}
      <Card className="bg-muted/50">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            <strong>Remember:</strong> The goal isn't to raise rich kids.
            It's to raise kids who understand money, value hard work,
            and know how to build wealth responsibly.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default FamilyMeeting
