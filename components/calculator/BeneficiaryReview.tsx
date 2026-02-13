'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Printer,
  Heart,
  Baby,
  FileText,
  Shield,
  Building,
  Bell,
  Info,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

// Types
interface BeneficiaryEntry {
  primary: string
  contingent: string
  lastReviewed: string | null
  verified: boolean
}

interface AccountBeneficiaries {
  '401k': BeneficiaryEntry
  ira: BeneficiaryEntry
  rothIra: BeneficiaryEntry
  lifeInsurance: BeneficiaryEntry
  bankPOD: BeneficiaryEntry
  brokerageTOD: BeneficiaryEntry
}

interface LifeEvent {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface BeneficiaryReviewProps {
  className?: string
  onSave?: (data: BeneficiaryReviewData) => void
  initialData?: Partial<BeneficiaryReviewData>
}

export interface BeneficiaryReviewData {
  accounts: AccountBeneficiaries
  lifeEventsSinceLastReview: string[]
  lastFullReview: string | null
  nextReminderDate: string | null
}

// Constants
const LIFE_EVENTS: LifeEvent[] = [
  {
    id: 'marriage',
    label: 'Marriage',
    icon: Heart,
    description: 'Getting married may require spousal consent for 401(k) beneficiaries',
  },
  {
    id: 'divorce',
    label: 'Divorce',
    icon: FileText,
    description: 'Critical to remove ex-spouse - beneficiary forms override wills',
  },
  {
    id: 'birth',
    label: 'Birth/Adoption',
    icon: Baby,
    description: 'New children should be added as beneficiaries',
  },
  {
    id: 'death',
    label: 'Death of beneficiary',
    icon: Users,
    description: 'Contingent beneficiaries become especially important',
  },
]

const ACCOUNT_TYPES = [
  { key: '401k' as const, label: '401(k)', requiresSpouseConsent: true },
  { key: 'ira' as const, label: 'Traditional IRA', requiresSpouseConsent: false },
  { key: 'rothIra' as const, label: 'Roth IRA', requiresSpouseConsent: false },
  { key: 'lifeInsurance' as const, label: 'Life Insurance', requiresSpouseConsent: false },
  { key: 'bankPOD' as const, label: 'Bank Accounts (POD)', requiresSpouseConsent: false },
  { key: 'brokerageTOD' as const, label: 'Brokerage (TOD)', requiresSpouseConsent: false },
]

const DEFAULT_BENEFICIARY_ENTRY: BeneficiaryEntry = {
  primary: '',
  contingent: '',
  lastReviewed: null,
  verified: false,
}

const DEFAULT_DATA: BeneficiaryReviewData = {
  accounts: {
    '401k': { ...DEFAULT_BENEFICIARY_ENTRY },
    ira: { ...DEFAULT_BENEFICIARY_ENTRY },
    rothIra: { ...DEFAULT_BENEFICIARY_ENTRY },
    lifeInsurance: { ...DEFAULT_BENEFICIARY_ENTRY },
    bankPOD: { ...DEFAULT_BENEFICIARY_ENTRY },
    brokerageTOD: { ...DEFAULT_BENEFICIARY_ENTRY },
  },
  lifeEventsSinceLastReview: [],
  lastFullReview: null,
  nextReminderDate: null,
}

// Best practices content
const BEST_PRACTICES = [
  {
    title: 'Name individuals, not "my estate"',
    content:
      'Naming your estate as beneficiary can force assets through probate, delaying distribution and potentially increasing costs. IRAs and 401(k)s that go to an estate also lose the ability for beneficiaries to stretch distributions over their lifetime.',
  },
  {
    title: 'Always name primary AND contingent beneficiaries',
    content:
      'If your primary beneficiary predeceases you or disclaims the inheritance, a contingent beneficiary ensures your assets go where you intend rather than through probate or to unintended recipients.',
  },
  {
    title: 'Update after every major life event',
    content:
      'Beneficiary designations override your will. An outdated form naming an ex-spouse will still pay out to them, even if your will says otherwise. Review annually and after any marriage, divorce, birth, or death.',
  },
  {
    title: 'Spouse consent requirements for 401(k)',
    content:
      'ERISA requires that your spouse be the primary beneficiary of your 401(k) unless they sign a written waiver. This applies even if you\'re separated. State community property laws may also affect IRAs.',
  },
]

const TRUST_CONSIDERATIONS = [
  {
    title: 'When to name a trust vs. individual',
    content:
      'Name a trust when beneficiaries are minors, have special needs, need protection from creditors, or you want control over distribution timing. For most adult beneficiaries without special circumstances, naming them directly is simpler and provides tax advantages.',
  },
  {
    title: '"See the Light" trusts for minors',
    content:
      'A "see-through" or conduit trust can preserve the stretch IRA benefit for minor beneficiaries while providing adult supervision until they reach maturity. The trust must meet specific IRS requirements - consult an estate attorney.',
  },
  {
    title: 'Avoid naming trusts for Roth IRAs without careful planning',
    content:
      'Roth IRAs pass tax-free to beneficiaries. Using a trust may limit flexibility and could result in suboptimal distribution timing. Individual beneficiaries can make their own tax-efficient choices.',
  },
]

export function BeneficiaryReview({
  className,
  onSave,
  initialData,
}: BeneficiaryReviewProps) {
  const [data, setData] = useState<BeneficiaryReviewData>(() => ({
    ...DEFAULT_DATA,
    ...initialData,
    accounts: {
      ...DEFAULT_DATA.accounts,
      ...(initialData?.accounts || {}),
    },
  }))

  const [expandedSections, setExpandedSections] = useState<string[]>(['checklist'])
  const printRef = useRef<HTMLDivElement>(null)

  // Handlers
  const updateAccount = useCallback(
    (
      accountKey: keyof AccountBeneficiaries,
      field: keyof BeneficiaryEntry,
      value: string | boolean
    ) => {
      setData((prev) => ({
        ...prev,
        accounts: {
          ...prev.accounts,
          [accountKey]: {
            ...prev.accounts[accountKey],
            [field]: value,
          },
        },
      }))
    },
    []
  )

  const toggleLifeEvent = useCallback((eventId: string) => {
    setData((prev) => ({
      ...prev,
      lifeEventsSinceLastReview: prev.lifeEventsSinceLastReview.includes(eventId)
        ? prev.lifeEventsSinceLastReview.filter((id) => id !== eventId)
        : [...prev.lifeEventsSinceLastReview, eventId],
    }))
  }, [])

  const markAllReviewed = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    setData((prev) => ({
      ...prev,
      lastFullReview: today,
      accounts: Object.fromEntries(
        Object.entries(prev.accounts).map(([key, value]) => [
          key,
          { ...value, lastReviewed: today, verified: true },
        ])
      ) as AccountBeneficiaries,
    }))
  }, [])

  const setReminder = useCallback(() => {
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    const reminderDate = nextYear.toISOString().split('T')[0]

    setData((prev) => ({
      ...prev,
      nextReminderDate: reminderDate,
    }))

    // Create calendar event (ICS format)
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Retirement Calculator//Beneficiary Review//EN
BEGIN:VEVENT
DTSTART:${reminderDate.replace(/-/g, '')}T090000
DTEND:${reminderDate.replace(/-/g, '')}T100000
SUMMARY:Annual Beneficiary Review
DESCRIPTION:Review all beneficiary designations for retirement accounts, life insurance, and transfer-on-death accounts.
END:VEVENT
END:VCALENDAR`

    const blob = new Blob([icsContent], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'beneficiary-review-reminder.ics'
    link.click()
    URL.revokeObjectURL(url)
  }, [])

  const handlePrint = useCallback(() => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Beneficiary Review Summary</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
            .date { color: #666; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
            th { background: #f5f5f5; font-weight: 600; }
            .verified { color: #16a34a; }
            .not-verified { color: #dc2626; }
            .action-item { background: #fef3c7; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>Beneficiary Review Summary</h1>
          <p class="date">Generated: ${today}</p>
          ${data.lastFullReview ? `<p><strong>Last Full Review:</strong> ${new Date(data.lastFullReview).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}

          <h2>Account Beneficiaries</h2>
          <table>
            <thead>
              <tr>
                <th>Account Type</th>
                <th>Primary</th>
                <th>Contingent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${ACCOUNT_TYPES.map(
                (acc) => `
                <tr>
                  <td>${acc.label}</td>
                  <td>${data.accounts[acc.key].primary || '(not specified)'}</td>
                  <td>${data.accounts[acc.key].contingent || '(not specified)'}</td>
                  <td class="${data.accounts[acc.key].verified ? 'verified' : 'not-verified'}">
                    ${data.accounts[acc.key].verified ? 'Verified' : 'Needs Review'}
                  </td>
                </tr>
              `
              ).join('')}
            </tbody>
          </table>

          ${
            data.lifeEventsSinceLastReview.length > 0
              ? `
          <h2>Life Events Requiring Action</h2>
          <div class="action-item">
            <p><strong>The following life events have occurred since your last review:</strong></p>
            <ul>
              ${data.lifeEventsSinceLastReview
                .map((eventId) => {
                  const event = LIFE_EVENTS.find((e) => e.id === eventId)
                  return event ? `<li>${event.label} - ${event.description}</li>` : ''
                })
                .join('')}
            </ul>
            <p><strong>Action Required:</strong> Contact your HR department and financial institutions to update beneficiaries.</p>
          </div>
          `
              : ''
          }

          <h2>Next Steps</h2>
          <ol>
            <li>Take this summary to your HR department to verify 401(k) beneficiaries</li>
            <li>Contact each IRA/brokerage custodian to confirm beneficiary designations</li>
            <li>Review life insurance policies with your insurance company</li>
            <li>Verify POD/TOD designations with your bank and brokerage</li>
          </ol>

          <div class="footer">
            <p><strong>Important:</strong> This is an informational checklist, not legal or financial advice. Beneficiary designations override your will - ensure they reflect your current wishes. Consider consulting with an estate planning attorney for complex situations.</p>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.print()
  }, [data])

  const handleSave = useCallback(() => {
    onSave?.(data)
  }, [data, onSave])

  // Computed values
  const hasLifeEvents = data.lifeEventsSinceLastReview.length > 0
  const verifiedCount = Object.values(data.accounts).filter((a) => a.verified).length
  const totalAccounts = ACCOUNT_TYPES.length
  const completionPercent = Math.round((verifiedCount / totalAccounts) * 100)

  return (
    <Card className={cn('border-2 border-amber-200 dark:border-amber-800', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          Beneficiary Review System
        </CardTitle>
        <CardDescription>
          Outdated beneficiaries cause chaos. Keep your designations current to protect your loved ones.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6" ref={printRef}>
        {/* Progress indicator */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium">Review Progress</p>
            <p className="text-xs text-muted-foreground">
              {verifiedCount} of {totalAccounts} accounts verified
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-500',
                  completionPercent === 100
                    ? 'bg-green-500'
                    : completionPercent >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                )}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="text-sm font-medium">{completionPercent}%</span>
          </div>
        </div>

        {/* Life events warning */}
        {hasLifeEvents && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              You have indicated life events that may require beneficiary updates. Review and update
              your designations with each financial institution.
            </AlertDescription>
          </Alert>
        )}

        <Accordion
          type="multiple"
          value={expandedSections}
          onValueChange={setExpandedSections}
          className="space-y-2"
        >
          {/* Account Beneficiary Checklist */}
          <AccordionItem value="checklist" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Account Beneficiary Checklist</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Record your beneficiaries for each account type. Check the box once verified with
                the custodian.
              </p>

              <div className="space-y-4">
                {ACCOUNT_TYPES.map((account) => (
                  <div
                    key={account.key}
                    className="p-4 border rounded-lg space-y-3 bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`verified-${account.key}`}
                          checked={data.accounts[account.key].verified}
                          onCheckedChange={(checked) =>
                            updateAccount(account.key, 'verified', !!checked)
                          }
                        />
                        <Label
                          htmlFor={`verified-${account.key}`}
                          className="font-medium cursor-pointer"
                        >
                          {account.label}
                        </Label>
                      </div>
                      {account.requiresSpouseConsent && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                          Requires spouse consent
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`primary-${account.key}`}
                          className="text-xs text-muted-foreground"
                        >
                          Primary Beneficiary
                        </Label>
                        <Input
                          id={`primary-${account.key}`}
                          placeholder="Name(s)"
                          value={data.accounts[account.key].primary}
                          onChange={(e) =>
                            updateAccount(account.key, 'primary', e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`contingent-${account.key}`}
                          className="text-xs text-muted-foreground"
                        >
                          Contingent Beneficiary
                        </Label>
                        <Input
                          id={`contingent-${account.key}`}
                          placeholder="Name(s)"
                          value={data.accounts[account.key].contingent}
                          onChange={(e) =>
                            updateAccount(account.key, 'contingent', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={markAllReviewed} variant="outline" className="w-full">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark All as Reviewed Today
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Review Triggers */}
          <AccordionItem value="triggers" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Life Event Review Triggers</span>
                {hasLifeEvents && (
                  <span className="ml-2 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full">
                    {data.lifeEventsSinceLastReview.length} event(s)
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Has any of these happened since your last beneficiary review? Check all that apply.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {LIFE_EVENTS.map((event) => {
                  const Icon = event.icon
                  const isSelected = data.lifeEventsSinceLastReview.includes(event.id)

                  return (
                    <button
                      key={event.id}
                      onClick={() => toggleLifeEvent(event.id)}
                      className={cn(
                        'p-4 border rounded-lg text-left transition-all',
                        'hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/50',
                        isSelected &&
                          'border-amber-500 bg-amber-50 dark:bg-amber-950/50 ring-1 ring-amber-500'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Icon
                          className={cn(
                            'h-5 w-5 mt-0.5',
                            isSelected
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-muted-foreground'
                          )}
                        />
                        <div>
                          <p className="font-medium text-sm">{event.label}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-amber-600 ml-auto shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {hasLifeEvents && (
                <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm">
                    <strong>Important:</strong> Beneficiary designations on retirement accounts
                    override your will. After these life events, contact your HR department and
                    financial institutions directly to update your designations.
                  </AlertDescription>
                </Alert>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Best Practices */}
          <AccordionItem value="best-practices" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span>Beneficiary Best Practices</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {BEST_PRACTICES.map((practice, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium text-sm">{practice.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">{practice.content}</p>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* Trust Considerations */}
          <AccordionItem value="trusts" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-purple-600" />
                <span>Trust Considerations</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                When might naming a trust make sense? This is general education - consult an estate
                attorney for your specific situation.
              </p>

              {TRUST_CONSIDERATIONS.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-purple-600" />
                    <h4 className="font-medium text-sm">{item.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">{item.content}</p>
                </div>
              ))}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  This information is educational only and not legal advice. Estate planning
                  involves complex tax and legal considerations. Work with a qualified estate
                  planning attorney for your specific situation.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          {/* Annual Reminder */}
          <AccordionItem value="reminder" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span>Annual Review Reminder</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Set an annual reminder to review your beneficiary designations. This should be part
                of your yearly financial checkup.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={setReminder} variant="outline" className="flex-1">
                  <Bell className="h-4 w-4 mr-2" />
                  Add Annual Reminder to Calendar
                </Button>
              </div>

              {data.nextReminderDate && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 inline mr-1" />
                  Reminder set for{' '}
                  {new Date(data.nextReminderDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}

              {data.lastFullReview && (
                <p className="text-sm text-muted-foreground">
                  Last full review:{' '}
                  {new Date(data.lastFullReview).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button onClick={handlePrint} variant="outline" className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print Summary for HR/Custodian
          </Button>

          {onSave && (
            <Button onClick={handleSave} className="flex-1">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save Review
            </Button>
          )}
        </div>

        {/* Disclaimer */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground italic">
            This tool provides educational information about beneficiary designations, not legal or
            financial advice. Beneficiary designations override your will - ensure they reflect your
            current wishes. For complex situations involving trusts, special needs beneficiaries, or
            blended families, consult with an estate planning attorney.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
