"use client"

import React, { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  FileText,
  Shield,
  Users,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Building,
  Heart,
  DollarSign,
  Clock,
  Info,
  ChevronRight,
  ExternalLink,
  Printer,
  Home,
  Landmark,
  UserCheck,
  AlertCircle,
  HelpCircle,
  MapPin,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Types
interface EstatePlanningBasicsProps {
  className?: string
  netWorth?: number
  hasRealEstate?: boolean
  hasMinorChildren?: boolean
  isBlendedFamily?: boolean
  state?: string
  onChecklistChange?: (checklist: EstatePlanningChecklist) => void
}

interface EstatePlanningChecklist {
  hasWill: boolean
  hasTrust: boolean
  hasPOA: boolean
  hasHealthcareDirective: boolean
  beneficiariesReviewed: boolean
  assetTitlingReviewed: boolean
  lastReviewDate: string | null
}

// Constants
const COMMUNITY_PROPERTY_STATES = [
  "AZ", "CA", "ID", "LA", "NV", "NM", "TX", "WA", "WI"
]

const STATE_ESTATE_TAX_STATES = [
  "CT", "DC", "HI", "IL", "MA", "MD", "ME", "MN", "NY", "OR", "RI", "VT", "WA"
]

const STATE_INHERITANCE_TAX_STATES = [
  "IA", "KY", "MD", "NE", "NJ", "PA"
]

const ESSENTIAL_DOCUMENTS = [
  {
    id: "will",
    name: "Last Will and Testament",
    icon: FileText,
    shortDesc: "Who gets what when you die",
    fullDesc: "A will specifies how your assets should be distributed after death, names guardians for minor children, and designates an executor to manage your estate.",
    whatItDoes: [
      "Names beneficiaries for your assets",
      "Designates guardians for minor children",
      "Appoints an executor to handle your estate",
      "Can specify funeral wishes",
    ],
    whatItDoesNot: [
      "Avoid probate (goes through court process)",
      "Override beneficiary designations on accounts",
      "Control assets held in trust",
      "Take effect while you're alive",
    ],
  },
  {
    id: "trust",
    name: "Revocable Living Trust",
    icon: Building,
    shortDesc: "Avoid probate, maintain privacy",
    fullDesc: "A revocable living trust holds your assets during your lifetime and transfers them to beneficiaries upon death without going through probate.",
    whatItDoes: [
      "Avoids probate (faster, private transfer)",
      "Provides continuity if you become incapacitated",
      "Can manage assets for minor beneficiaries",
      "Maintains privacy (not public record)",
    ],
    whatItDoesNot: [
      "Provide asset protection from creditors (revocable trusts)",
      "Reduce estate taxes by itself",
      "Work unless assets are retitled into the trust",
      "Replace the need for a will (you still need a 'pour-over' will)",
    ],
  },
  {
    id: "poa",
    name: "Power of Attorney",
    icon: UserCheck,
    shortDesc: "Financial decisions if incapacitated",
    fullDesc: "A durable power of attorney designates someone to make financial decisions on your behalf if you become incapacitated.",
    whatItDoes: [
      "Allows someone to pay your bills",
      "Manage your investments",
      "Handle banking and real estate transactions",
      "File taxes on your behalf",
    ],
    whatItDoesNot: [
      "Grant authority after your death (ends at death)",
      "Override your decisions while you're competent",
      "Automatically give authority over healthcare",
      "Work if not 'durable' (regular POA ends at incapacity)",
    ],
  },
  {
    id: "healthcare",
    name: "Healthcare Directive / Living Will",
    icon: Heart,
    shortDesc: "Medical decisions and end-of-life wishes",
    fullDesc: "A healthcare directive (also called advance directive or living will) specifies your wishes for medical treatment and designates someone to make healthcare decisions if you cannot.",
    whatItDoes: [
      "Specifies end-of-life treatment preferences",
      "Designates a healthcare proxy/agent",
      "Guides decisions about life support",
      "Documents organ donation wishes",
    ],
    whatItDoesNot: [
      "Cover routine medical decisions while competent",
      "Automatically include HIPAA authorization (do separately)",
      "Override your verbal wishes if you're competent",
      "Need to predict every medical scenario",
    ],
  },
]

const TRUST_TYPES = [
  {
    type: "Revocable Living Trust",
    canChange: true,
    youControl: true,
    avoidsProbate: true,
    taxBenefits: false,
    assetProtection: false,
    bestFor: "Most people wanting probate avoidance and incapacity planning",
  },
  {
    type: "Irrevocable Trust",
    canChange: false,
    youControl: false,
    avoidsProbate: true,
    taxBenefits: true,
    assetProtection: true,
    bestFor: "High net worth individuals, Medicaid planning, asset protection",
  },
  {
    type: "Special Needs Trust",
    canChange: "Varies",
    youControl: false,
    avoidsProbate: true,
    taxBenefits: false,
    assetProtection: true,
    bestFor: "Beneficiaries receiving government benefits",
  },
  {
    type: "Testamentary Trust",
    canChange: "Until death",
    youControl: true,
    avoidsProbate: false,
    taxBenefits: false,
    assetProtection: false,
    bestFor: "Created by will, for minor beneficiaries",
  },
]

const TITLING_OPTIONS = [
  {
    type: "JTWROS",
    fullName: "Joint Tenants with Right of Survivorship",
    description: "Property passes directly to surviving owner(s) outside of probate",
    pros: ["Avoids probate", "Automatic transfer at death", "Simple to set up"],
    cons: ["Exposes asset to all owners' creditors", "Gift tax implications if adding non-spouse", "Loss of stepped-up basis on deceased owner's share"],
    bestFor: "Married couples, some real estate",
  },
  {
    type: "Tenants in Common",
    fullName: "Tenants in Common",
    description: "Each owner has a separate, transferable share that passes through their estate",
    pros: ["Each owner controls their share", "Can have unequal ownership", "Full stepped-up basis"],
    cons: ["Goes through probate", "Co-owner could sell or will their share to anyone"],
    bestFor: "Business partners, investment property, unmarried co-owners",
  },
  {
    type: "Community Property",
    fullName: "Community Property (9 states)",
    description: "Married couples own property 50/50 with special tax treatment",
    pros: ["Full stepped-up basis at first death", "Clear ownership rules", "Avoids probate with rights of survivorship"],
    cons: ["Only available in 9 states", "Complex if you move states", "Assets exposed to either spouse's creditors"],
    bestFor: "Married couples in community property states",
  },
  {
    type: "TOD/POD",
    fullName: "Transfer/Payable on Death",
    description: "Account passes directly to named beneficiary at death",
    pros: ["Avoids probate", "Easy to set up", "Revocable anytime", "Keeps control during lifetime"],
    cons: ["Only for certain accounts", "Beneficiary could predecease you", "Doesn't provide management if incapacitated"],
    bestFor: "Bank accounts, brokerage accounts, vehicles (in some states)",
  },
  {
    type: "Trust Ownership",
    fullName: "Owned by Revocable Trust",
    description: "Asset is titled in the name of your trust",
    pros: ["Avoids probate", "Incapacity planning", "Privacy", "Works for any asset"],
    cons: ["Requires trust creation", "Must retitle assets", "Ongoing management"],
    bestFor: "Real estate, valuable personal property, comprehensive planning",
  },
]

const PROBATE_PROBLEMS = [
  { issue: "Time", detail: "Typically 6-18 months, can be years for contested estates" },
  { issue: "Cost", detail: "Attorney fees, executor fees, court costs: often 3-8% of estate value" },
  { issue: "Public Record", detail: "Anyone can see your assets, debts, and who inherits" },
  { issue: "Court Control", detail: "Judge oversees everything, may require bonds and approvals" },
  { issue: "Frozen Assets", detail: "Heirs can't access assets until probate closes" },
]

const PROBATE_AVOIDANCE_STRATEGIES = [
  { strategy: "Revocable Living Trust", effectiveness: "High", complexity: "Medium", cost: "$1,500-5,000+" },
  { strategy: "Joint Ownership (JTWROS)", effectiveness: "Medium", complexity: "Low", cost: "$0-200" },
  { strategy: "TOD/POD Designations", effectiveness: "Medium", complexity: "Low", cost: "$0" },
  { strategy: "Beneficiary Designations", effectiveness: "High", complexity: "Low", cost: "$0" },
  { strategy: "Small Estate Procedures", effectiveness: "Limited", complexity: "Low", cost: "Varies by state" },
]

const DEFAULT_CHECKLIST: EstatePlanningChecklist = {
  hasWill: false,
  hasTrust: false,
  hasPOA: false,
  hasHealthcareDirective: false,
  beneficiariesReviewed: false,
  assetTitlingReviewed: false,
  lastReviewDate: null,
}

export function EstatePlanningBasics({
  className,
  netWorth = 0,
  hasRealEstate = false,
  hasMinorChildren = false,
  isBlendedFamily = false,
  state,
  onChecklistChange,
}: EstatePlanningBasicsProps) {
  const [checklist, setChecklist] = useState<EstatePlanningChecklist>(DEFAULT_CHECKLIST)
  const [expandedSections, setExpandedSections] = useState<string[]>(["essential-four"])

  // Derived state
  const isCommunityPropertyState = state ? COMMUNITY_PROPERTY_STATES.includes(state) : false
  const hasStateEstateTax = state ? STATE_ESTATE_TAX_STATES.includes(state) : false
  const hasInheritanceTax = state ? STATE_INHERITANCE_TAX_STATES.includes(state) : false
  const needsTrust = netWorth > 500000 || hasRealEstate || hasMinorChildren || isBlendedFamily
  const needsAttorney = netWorth > 1000000 || isBlendedFamily || hasMinorChildren || hasRealEstate

  // Handlers
  const updateChecklist = useCallback(
    (field: keyof EstatePlanningChecklist, value: boolean) => {
      const newChecklist = { ...checklist, [field]: value }
      setChecklist(newChecklist)
      onChecklistChange?.(newChecklist)
    },
    [checklist, onChecklistChange]
  )

  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const checklistItems = [
      { label: "Will", done: checklist.hasWill },
      { label: "Revocable Living Trust", done: checklist.hasTrust },
      { label: "Power of Attorney", done: checklist.hasPOA },
      { label: "Healthcare Directive", done: checklist.hasHealthcareDirective },
      { label: "Beneficiaries Reviewed", done: checklist.beneficiariesReviewed },
      { label: "Asset Titling Reviewed", done: checklist.assetTitlingReviewed },
    ]

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Estate Planning Checklist</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; }
            .date { color: #666; margin-bottom: 24px; }
            .checklist-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #eee; }
            .checkbox { width: 20px; height: 20px; border: 2px solid #333; display: flex; align-items: center; justify-content: center; }
            .checked { background: #16a34a; border-color: #16a34a; color: white; }
            .document-section { margin-bottom: 24px; padding: 16px; background: #f9f9f9; border-radius: 8px; }
            .document-title { font-weight: bold; margin-bottom: 8px; }
            .document-desc { font-size: 14px; color: #666; }
            .warning { background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>Estate Planning Checklist</h1>
          <p class="date">Generated: ${today}</p>

          <div class="warning">
            <strong>Important:</strong> Estate planning is not just for the wealthy. Everyone needs at least a will, power of attorney, and healthcare directive. Don't leave a mess for your family.
          </div>

          <h2>Your Progress</h2>
          ${checklistItems.map(item => `
            <div class="checklist-item">
              <div class="checkbox ${item.done ? 'checked' : ''}">${item.done ? '&#10003;' : ''}</div>
              <span>${item.label}</span>
            </div>
          `).join('')}

          <h2>The Essential Four Documents</h2>
          ${ESSENTIAL_DOCUMENTS.map(doc => `
            <div class="document-section">
              <div class="document-title">${doc.name}</div>
              <div class="document-desc">${doc.fullDesc}</div>
            </div>
          `).join('')}

          <h2>Next Steps</h2>
          <ol>
            <li>Complete any missing documents from the checklist above</li>
            <li>Review and update beneficiary designations on all accounts</li>
            <li>Consider whether you need a trust based on your net worth and real estate</li>
            <li>Review asset titling to ensure proper transfer at death</li>
            <li>Schedule annual review of your estate plan</li>
          </ol>

          ${needsAttorney ? `
          <div class="warning">
            <strong>Recommendation:</strong> Based on your situation, you should consider working with an estate planning attorney rather than DIY options.
          </div>
          ` : ''}

          <div class="footer">
            <p><strong>Disclaimer:</strong> This checklist is for educational purposes only and is not legal advice. Estate planning laws vary by state. Consult with a qualified estate planning attorney for advice specific to your situation.</p>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.print()
  }, [checklist, needsAttorney])

  // Calculate completion
  const completedItems = Object.values(checklist).filter((v) => v === true).length
  const totalItems = 6
  const completionPercent = Math.round((completedItems / totalItems) * 100)

  return (
    <Card className={cn("border-2 border-slate-200 dark:border-slate-800", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          Estate Planning Basics
        </CardTitle>
        <CardDescription>
          Don't leave a mess for your family. Everyone needs these documents, regardless of wealth.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Alert Banner */}
        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Estate planning is not optional</AlertTitle>
          <AlertDescription>
            If you die without a plan, the state decides who gets your assets, who raises your children, and your family may spend months or years in court. Take action now.
          </AlertDescription>
        </Alert>

        {/* Progress indicator */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium">Your Estate Planning Progress</p>
            <p className="text-xs text-muted-foreground">
              {completedItems} of {totalItems} items completed
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  completionPercent === 100
                    ? "bg-green-500"
                    : completionPercent >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                )}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="text-sm font-medium">{completionPercent}%</span>
          </div>
        </div>

        <Accordion
          type="multiple"
          value={expandedSections}
          onValueChange={setExpandedSections}
          className="space-y-2"
        >
          {/* Section 1: The Essential Four */}
          <AccordionItem value="essential-four" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>The Essential Four Documents</span>
                <Badge variant="outline" className="ml-2">Everyone Needs These</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                These four documents form the foundation of any estate plan. Without them, your family faces unnecessary complications, delays, and costs.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ESSENTIAL_DOCUMENTS.map((doc) => {
                  const Icon = doc.icon
                  return (
                    <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{doc.name}</h4>
                          <p className="text-sm text-muted-foreground">{doc.shortDesc}</p>
                        </div>
                      </div>

                      <div className="space-y-2 pl-2">
                        <div>
                          <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">What it does:</p>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {doc.whatItDoes.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">What it does NOT do:</p>
                          <ul className="text-xs text-muted-foreground space-y-0.5">
                            {doc.whatItDoesNot.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 2: Will Basics */}
          <AccordionItem value="will-basics" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <span>Will Basics</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-purple-600" />
                      Executor Responsibilities
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                        File the will with probate court
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                        Inventory and protect estate assets
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                        Pay debts, taxes, and final expenses
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                        Distribute remaining assets to beneficiaries
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                        File final tax returns
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Choose someone organized, trustworthy, and willing to serve. Consider naming an alternate.
                    </p>
                  </div>

                  {hasMinorChildren && (
                    <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        Guardian for Minor Children
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Your will is the only place to legally name a guardian for your minor children. Without it, the court decides. Consider:
                      </p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>- Values alignment with yours</li>
                        <li>- Financial stability</li>
                        <li>- Location and lifestyle</li>
                        <li>- Age and health</li>
                        <li>- Willingness to serve</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Alert className="bg-red-50 dark:bg-red-950/30 border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertTitle>If You Die Without a Will (Intestate)</AlertTitle>
                    <AlertDescription className="text-sm">
                      <ul className="mt-2 space-y-1">
                        <li>- State law determines who inherits</li>
                        <li>- Your spouse may not get everything</li>
                        <li>- Unmarried partners get nothing</li>
                        <li>- Court appoints administrator (may not be who you'd choose)</li>
                        <li>- Court appoints guardian for children</li>
                        <li>- More expensive, longer process</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">What Goes in a Will vs. Beneficiary Forms</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-purple-700 dark:text-purple-400 mb-1">Controlled by Will:</p>
                        <ul className="text-muted-foreground text-xs space-y-0.5">
                          <li>- Personal property</li>
                          <li>- Real estate (if solely owned)</li>
                          <li>- Bank accounts (no POD)</li>
                          <li>- Vehicles</li>
                          <li>- Business interests</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">NOT Controlled by Will:</p>
                        <ul className="text-muted-foreground text-xs space-y-0.5">
                          <li>- 401(k), IRA, pension</li>
                          <li>- Life insurance</li>
                          <li>- Joint accounts (JTWROS)</li>
                          <li>- POD/TOD accounts</li>
                          <li>- Trust assets</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 3: Trust Basics */}
          <AccordionItem value="trust-basics" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-green-600" />
                <span>Trust Basics</span>
                {needsTrust && (
                  <Badge className="ml-2 bg-green-600">Recommended for You</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                A trust is a legal arrangement where you transfer assets to be managed by a trustee for the benefit of your beneficiaries. Think of it as a container for your assets with instructions for how they should be managed and distributed.
              </p>

              {/* Trust comparison table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="p-2 text-left border">Trust Type</th>
                      <th className="p-2 text-center border">Can Change?</th>
                      <th className="p-2 text-center border">You Control?</th>
                      <th className="p-2 text-center border">Avoids Probate?</th>
                      <th className="p-2 text-center border">Tax Benefits?</th>
                      <th className="p-2 text-center border">Asset Protection?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TRUST_TYPES.map((trust, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-muted/20"}>
                        <td className="p-2 border font-medium">{trust.type}</td>
                        <td className="p-2 border text-center">
                          {trust.canChange === true ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          ) : trust.canChange === false ? (
                            <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
                          ) : (
                            <span className="text-xs">{trust.canChange}</span>
                          )}
                        </td>
                        <td className="p-2 border text-center">
                          {trust.youControl ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-2 border text-center">
                          {trust.avoidsProbate ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-2 border text-center">
                          {trust.taxBenefits ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-2 border text-center">
                          {trust.assetProtection ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-green-600" />
                  When Do You Need a Trust?
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Consider a revocable living trust if any of these apply:
                </p>
                <ul className="text-sm space-y-1">
                  <li className={cn(
                    "flex items-center gap-2",
                    netWorth > 500000 ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"
                  )}>
                    <CheckCircle2 className={cn("h-4 w-4", netWorth > 500000 ? "text-green-500" : "text-gray-400")} />
                    Net worth exceeds $500,000 {netWorth > 500000 && "(You)"}
                  </li>
                  <li className={cn(
                    "flex items-center gap-2",
                    hasRealEstate ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"
                  )}>
                    <CheckCircle2 className={cn("h-4 w-4", hasRealEstate ? "text-green-500" : "text-gray-400")} />
                    Own real estate {hasRealEstate && "(You)"}
                  </li>
                  <li className={cn(
                    "flex items-center gap-2",
                    hasMinorChildren ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"
                  )}>
                    <CheckCircle2 className={cn("h-4 w-4", hasMinorChildren ? "text-green-500" : "text-gray-400")} />
                    Have minor children {hasMinorChildren && "(You)"}
                  </li>
                  <li className={cn(
                    "flex items-center gap-2",
                    isBlendedFamily ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"
                  )}>
                    <CheckCircle2 className={cn("h-4 w-4", isBlendedFamily ? "text-green-500" : "text-gray-400")} />
                    Have a blended family {isBlendedFamily && "(You)"}
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-gray-400" />
                    Own property in multiple states
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-gray-400" />
                    Want privacy (avoid public probate records)
                  </li>
                  <li className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-gray-400" />
                    Want control over distribution timing/conditions
                  </li>
                </ul>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Critical:</strong> A trust only works if you actually transfer your assets into it. An empty trust does nothing. Work with your attorney to "fund" your trust by retitling assets.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          {/* Section 4: Beneficiary Designations */}
          <AccordionItem value="beneficiaries" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600" />
                <span>Beneficiary Designations</span>
                <Badge variant="outline" className="ml-2 border-amber-500 text-amber-700">Override Your Will</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle>Beneficiary Designations OVERRIDE Your Will</AlertTitle>
                <AlertDescription className="text-sm">
                  The beneficiary form you filed with your 401(k), IRA, or life insurance policy controls who gets those assets - not your will. If you named your ex-spouse on a form 10 years ago, they still get the money, even if your will says otherwise.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Accounts with Beneficiary Designations</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-blue-500" />
                      401(k), 403(b), 457 plans
                    </li>
                    <li className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-blue-500" />
                      Traditional and Roth IRAs
                    </li>
                    <li className="flex items-center gap-2">
                      <Landmark className="h-4 w-4 text-blue-500" />
                      Pension plans
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      Life insurance policies
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      Annuities
                    </li>
                    <li className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-purple-500" />
                      HSAs (Health Savings Accounts)
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">When to Review Beneficiaries</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-500" />
                      After marriage or divorce
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Birth or adoption of a child
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Death of a beneficiary
                    </li>
                    <li className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      Annually as part of financial review
                    </li>
                    <li className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-green-500" />
                      Major life changes (new job, moving)
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Best Practices</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5" />
                    Always name BOTH primary AND contingent beneficiaries
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5" />
                    Use specific names and SSNs, not just "my children"
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5" />
                    Keep copies of all beneficiary forms
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5" />
                    Consider "per stirpes" for multi-generational planning
                  </li>
                </ul>
              </div>

              <Button variant="outline" className="w-full" asChild>
                <a href="#beneficiary-review">
                  <Users className="h-4 w-4 mr-2" />
                  Go to Beneficiary Review Tool
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Section 5: Titling Assets */}
          <AccordionItem value="titling" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-teal-600" />
                <span>Titling Assets</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                How you title your assets determines what happens to them when you die - sometimes more than your will does. Understanding titling is crucial for avoiding probate and ensuring proper transfer.
              </p>

              <div className="space-y-4">
                {TITLING_OPTIONS.map((option, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{option.type}</h4>
                        <p className="text-xs text-muted-foreground">{option.fullName}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{option.bestFor}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400 mb-1">Pros:</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          {option.pros.map((pro, i) => (
                            <li key={i}>+ {pro}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-400 mb-1">Cons:</p>
                        <ul className="text-muted-foreground space-y-0.5">
                          {option.cons.map((con, i) => (
                            <li key={i}>- {con}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 6: Probate Avoidance */}
          <AccordionItem value="probate" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                <span>Probate Avoidance</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Why Probate is Problematic
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PROBATE_PROBLEMS.map((problem, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-red-700 dark:text-red-400">{problem.issue}:</span>
                        <span className="text-sm text-muted-foreground ml-1">{problem.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <h4 className="font-medium">Strategies to Avoid Probate</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="p-2 text-left border">Strategy</th>
                      <th className="p-2 text-center border">Effectiveness</th>
                      <th className="p-2 text-center border">Complexity</th>
                      <th className="p-2 text-right border">Typical Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROBATE_AVOIDANCE_STRATEGIES.map((strategy, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-muted/20"}>
                        <td className="p-2 border font-medium">{strategy.strategy}</td>
                        <td className="p-2 border text-center">
                          <Badge variant={strategy.effectiveness === "High" ? "default" : "secondary"}>
                            {strategy.effectiveness}
                          </Badge>
                        </td>
                        <td className="p-2 border text-center">{strategy.complexity}</td>
                        <td className="p-2 border text-right">{strategy.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Note: Even with good probate avoidance planning, you still need a will as a "safety net" for any assets not covered by other transfer mechanisms.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          {/* Section 7: When to Get Help */}
          <AccordionItem value="get-help" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-indigo-600" />
                <span>When to Get Help: DIY vs Attorney</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/30">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    DIY May Be OK If:
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>- Simple family situation (no blending)</li>
                    <li>- Modest net worth (under $500k)</li>
                    <li>- No real estate or one primary residence</li>
                    <li>- No minor children or special needs beneficiaries</li>
                    <li>- No business ownership</li>
                    <li>- One state of residence</li>
                  </ul>
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      Typical Cost: $300-500
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Using services like LegalZoom, Nolo, Trust & Will
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "border rounded-lg p-4",
                  needsAttorney
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 ring-2 ring-amber-500/20"
                    : "bg-amber-50/50 dark:bg-amber-950/20"
                )}>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-amber-600" />
                    Use an Attorney If:
                    {needsAttorney && <Badge className="bg-amber-600 ml-2">Recommended for You</Badge>}
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className={cn(isBlendedFamily && "text-amber-700 dark:text-amber-400 font-medium")}>
                      - Blended family {isBlendedFamily && "(You)"}
                    </li>
                    <li className={cn(hasMinorChildren && "text-amber-700 dark:text-amber-400 font-medium")}>
                      - Minor children {hasMinorChildren && "(You)"}
                    </li>
                    <li className={cn(netWorth > 1000000 && "text-amber-700 dark:text-amber-400 font-medium")}>
                      - High net worth (over $1M) {netWorth > 1000000 && "(You)"}
                    </li>
                    <li className={cn(hasRealEstate && "text-amber-700 dark:text-amber-400 font-medium")}>
                      - Multiple properties or complex real estate {hasRealEstate && "(You)"}
                    </li>
                    <li>- Business ownership</li>
                    <li>- Special needs beneficiaries</li>
                    <li>- Complex tax situation</li>
                    <li>- Property in multiple states</li>
                  </ul>
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Typical Cost: $2,000-5,000+
                    </p>
                    <p className="text-xs text-muted-foreground">
                      For comprehensive estate plan with trust
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Finding an Estate Planning Attorney</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>- Ask for referrals from your financial advisor or accountant</li>
                  <li>- Check local bar association referral services</li>
                  <li>- Look for board certification in estate planning</li>
                  <li>- Get fee estimates upfront (flat fee is common)</li>
                  <li>- Ask about ongoing updates and amendments</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 8: State-Specific Considerations */}
          <AccordionItem value="state-specific" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-600" />
                <span>State-Specific Considerations</span>
                {state && (isCommunityPropertyState || hasStateEstateTax || hasInheritanceTax) && (
                  <Badge variant="outline" className="ml-2 border-orange-500 text-orange-700">
                    Relevant to {state}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={cn(
                  "border rounded-lg p-4",
                  isCommunityPropertyState && "bg-purple-50 dark:bg-purple-950/30 border-purple-200"
                )}>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-purple-600" />
                    Community Property States
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    In these states, most property acquired during marriage is owned 50/50:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {COMMUNITY_PROPERTY_STATES.map((s) => (
                      <Badge
                        key={s}
                        variant={s === state ? "default" : "outline"}
                        className="text-xs"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                  {isCommunityPropertyState && (
                    <Alert className="mt-3 bg-purple-100 dark:bg-purple-900/30">
                      <Info className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        Your state has community property rules. This affects how assets are divided and taxed.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className={cn(
                  "border rounded-lg p-4",
                  hasStateEstateTax && "bg-red-50 dark:bg-red-950/30 border-red-200"
                )}>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    State Estate Tax States
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    These states have their own estate tax (in addition to federal):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {STATE_ESTATE_TAX_STATES.map((s) => (
                      <Badge
                        key={s}
                        variant={s === state ? "default" : "outline"}
                        className="text-xs"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                  {hasStateEstateTax && (
                    <Alert className="mt-3 bg-red-100 dark:bg-red-900/30">
                      <AlertTriangle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        Your state has an estate tax. Exemptions are often lower than federal.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className={cn(
                  "border rounded-lg p-4",
                  hasInheritanceTax && "bg-orange-50 dark:bg-orange-950/30 border-orange-200"
                )}>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-600" />
                    Inheritance Tax States
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    These states tax the recipients of inheritances:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {STATE_INHERITANCE_TAX_STATES.map((s) => (
                      <Badge
                        key={s}
                        variant={s === state ? "default" : "outline"}
                        className="text-xs"
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                  {hasInheritanceTax && (
                    <Alert className="mt-3 bg-orange-100 dark:bg-orange-900/30">
                      <AlertTriangle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        Your state has an inheritance tax. Tax rates vary by relationship to deceased.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Estate planning laws vary significantly by state. If you move states, have your estate plan reviewed by an attorney licensed in your new state. Documents valid in one state may not be valid or optimal in another.
                </AlertDescription>
              </Alert>
            </AccordionContent>
          </AccordionItem>

          {/* Section 9: Action Checklist */}
          <AccordionItem value="checklist" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Action Checklist</span>
                <Badge variant="outline" className="ml-2">
                  {completedItems}/{totalItems} Complete
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Track your progress on the essential estate planning tasks. Check off items as you complete them.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    id="checklist-will"
                    checked={checklist.hasWill}
                    onCheckedChange={(checked) => updateChecklist("hasWill", !!checked)}
                  />
                  <Label htmlFor="checklist-will" className="flex-1 cursor-pointer">
                    <span className="font-medium">Create or update will</span>
                    <p className="text-xs text-muted-foreground">Names executor, guardians, and asset distribution</p>
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    id="checklist-trust"
                    checked={checklist.hasTrust}
                    onCheckedChange={(checked) => updateChecklist("hasTrust", !!checked)}
                  />
                  <Label htmlFor="checklist-trust" className="flex-1 cursor-pointer">
                    <span className="font-medium">Consider trust (if applicable)</span>
                    <p className="text-xs text-muted-foreground">
                      Recommended if NW &gt; $500k, real estate, or minor children
                    </p>
                  </Label>
                  {needsTrust && !checklist.hasTrust && (
                    <Badge className="bg-green-600 text-xs">Recommended</Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    id="checklist-poa"
                    checked={checklist.hasPOA}
                    onCheckedChange={(checked) => updateChecklist("hasPOA", !!checked)}
                  />
                  <Label htmlFor="checklist-poa" className="flex-1 cursor-pointer">
                    <span className="font-medium">Complete Power of Attorney</span>
                    <p className="text-xs text-muted-foreground">Allows trusted person to manage finances if incapacitated</p>
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    id="checklist-healthcare"
                    checked={checklist.hasHealthcareDirective}
                    onCheckedChange={(checked) => updateChecklist("hasHealthcareDirective", !!checked)}
                  />
                  <Label htmlFor="checklist-healthcare" className="flex-1 cursor-pointer">
                    <span className="font-medium">Complete Healthcare Directive</span>
                    <p className="text-xs text-muted-foreground">Documents medical wishes and names healthcare proxy</p>
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    id="checklist-beneficiaries"
                    checked={checklist.beneficiariesReviewed}
                    onCheckedChange={(checked) => updateChecklist("beneficiariesReviewed", !!checked)}
                  />
                  <Label htmlFor="checklist-beneficiaries" className="flex-1 cursor-pointer">
                    <span className="font-medium">Review all beneficiary designations</span>
                    <p className="text-xs text-muted-foreground">401(k), IRA, life insurance, bank accounts</p>
                  </Label>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Checkbox
                    id="checklist-titling"
                    checked={checklist.assetTitlingReviewed}
                    onCheckedChange={(checked) => updateChecklist("assetTitlingReviewed", !!checked)}
                  />
                  <Label htmlFor="checklist-titling" className="flex-1 cursor-pointer">
                    <span className="font-medium">Review asset titling</span>
                    <p className="text-xs text-muted-foreground">Ensure proper ownership for probate avoidance</p>
                  </Label>
                </div>
              </div>

              {completionPercent === 100 ? (
                <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>Excellent work!</AlertTitle>
                  <AlertDescription>
                    You've completed all essential estate planning tasks. Remember to review annually and after major life events.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle>Keep going!</AlertTitle>
                  <AlertDescription>
                    You have {totalItems - completedItems} item(s) remaining. Complete your estate plan to protect your family.
                  </AlertDescription>
                </Alert>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Print Button */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button onClick={handlePrint} variant="outline" className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print Checklist
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground italic">
            This guide provides general educational information about estate planning, not legal or financial advice. Estate planning laws vary significantly by state and individual circumstances. For advice specific to your situation, consult with a qualified estate planning attorney in your state. Don't leave a mess for your family.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default EstatePlanningBasics
