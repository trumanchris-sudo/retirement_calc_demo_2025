"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Gift,
  GraduationCap,
  Heart,
  HelpCircle,
  Info,
  Landmark,
  Layers,
  Phone,
  PiggyBank,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
  Zap,
  RefreshCw,
} from "lucide-react";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface BrokerageInfo {
  id: string;
  name: string;
  tagline: string;
  founded: string;
  description: string;
  strengths: string[];
  considerations: string[];
  bestFor: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface FeatureRating {
  fidelity: number | string;
  vanguard: number | string;
  schwab: number | string;
}

interface ComparisonFeature {
  name: string;
  description: string;
  category: string;
  ratings: FeatureRating;
  winner?: string;
  notes?: FeatureRating;
}

interface AccountType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  availability: {
    fidelity: boolean;
    vanguard: boolean;
    schwab: boolean;
  };
  notes?: string;
}

interface RedFlag {
  flag: string;
  description: string;
  severity: "high" | "medium" | "low";
}

interface TransferStep {
  step: number;
  title: string;
  description: string;
  duration?: string;
}

// ============================================================================
// DATA
// ============================================================================

const BROKERAGES: Record<string, BrokerageInfo> = {
  vanguard: {
    id: "vanguard",
    name: "Vanguard",
    tagline: "The Pioneer of Index Investing",
    founded: "1975",
    description:
      "Founded by Jack Bogle, Vanguard pioneered low-cost index investing. Uniquely, Vanguard is owned by its funds, which are owned by investors - meaning they have no outside owners to pay.",
    strengths: [
      "Lowest expense ratios in the industry",
      "Investor-owned structure (no shareholders to pay)",
      "Best for buy-and-hold long-term investing",
      "Original home of index funds (VTSAX, VTI, etc.)",
      "Strong retirement plan focus",
    ],
    considerations: [
      "Website and app can feel dated",
      "Customer service wait times can be long",
      "Some mutual funds have $3,000 minimum",
      "Not ideal for active trading",
    ],
    bestFor: "Long-term, buy-and-hold index fund investors",
    color: "text-red-700",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
  fidelity: {
    id: "fidelity",
    name: "Fidelity",
    tagline: "The Best All-Around Choice",
    founded: "1946",
    description:
      "Fidelity combines excellent customer service, a great mobile app, competitive funds, and no minimums. It's privately owned by the Johnson family - no public shareholders to appease.",
    strengths: [
      "Zero expense ratio index funds (FZROX, FZILX)",
      "No account minimums - start with $1",
      "Excellent mobile app and website",
      "Outstanding customer service",
      "Fractional shares for stocks and ETFs",
      "2% cash back credit card with auto-invest",
      "Great research and educational tools",
    ],
    considerations: [
      "Zero funds only available at Fidelity",
      "Not investor-owned like Vanguard",
      "Some actively managed funds have high fees",
    ],
    bestFor: "Beginners and anyone wanting the best overall experience",
    color: "text-green-700",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  schwab: {
    id: "schwab",
    name: "Charles Schwab",
    tagline: "Best for Banking Integration",
    founded: "1971",
    description:
      "Schwab offers excellent brokerage services plus strong banking features. After merging with TD Ameritrade in 2020, they're one of the largest brokerages with enhanced trading tools.",
    strengths: [
      "Schwab Bank checking with no ATM fees worldwide",
      "Great for combining banking and investing",
      "Excellent customer service",
      "Good mobile app",
      "Strong research tools (from TD Ameritrade)",
      "Fractional shares (Schwab Stock Slices)",
    ],
    considerations: [
      "Some index funds slightly higher fees than Vanguard",
      "Post-TD Ameritrade integration still ongoing",
      "Checking account requires brokerage account",
    ],
    bestFor: "Those wanting banking and investing in one place",
    color: "text-blue-700",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
};

const COMPARISON_FEATURES: ComparisonFeature[] = [
  {
    name: "Stock/ETF Trading Fees",
    description: "Cost to buy or sell stocks and ETFs",
    category: "fees",
    ratings: { fidelity: "$0", vanguard: "$0", schwab: "$0" },
    notes: {
      fidelity: "Commission-free",
      vanguard: "Commission-free",
      schwab: "Commission-free",
    },
  },
  {
    name: "Mutual Fund Minimum",
    description: "Minimum to invest in their index funds",
    category: "fees",
    ratings: { fidelity: "$0", vanguard: "$3,000", schwab: "$0" },
    winner: "fidelity",
    notes: {
      fidelity: "No minimums for any funds",
      vanguard: "$3K for Admiral shares, $0 for ETFs",
      schwab: "No minimums for Schwab funds",
    },
  },
  {
    name: "Total Market Index Fund ER",
    description: "Expense ratio for US total market index fund",
    category: "fees",
    ratings: { fidelity: "0.00%", vanguard: "0.03%", schwab: "0.03%" },
    winner: "fidelity",
    notes: {
      fidelity: "FZROX - Zero expense ratio!",
      vanguard: "VTSAX/VTI - Industry standard",
      schwab: "SWTSX - Competitive",
    },
  },
  {
    name: "Fractional Shares",
    description: "Buy partial shares of stocks/ETFs",
    category: "features",
    ratings: { fidelity: 5, vanguard: 3, schwab: 4 },
    winner: "fidelity",
    notes: {
      fidelity: "All stocks and ETFs",
      vanguard: "Vanguard ETFs only",
      schwab: "S&P 500 stocks (Schwab Stock Slices)",
    },
  },
  {
    name: "Mobile App",
    description: "Quality and usability of mobile app",
    category: "features",
    ratings: { fidelity: 5, vanguard: 3, schwab: 4 },
    winner: "fidelity",
    notes: {
      fidelity: "Modern, full-featured",
      vanguard: "Functional but dated",
      schwab: "Good, improving",
    },
  },
  {
    name: "Website Experience",
    description: "Quality and usability of web platform",
    category: "features",
    ratings: { fidelity: 5, vanguard: 3, schwab: 4 },
    winner: "fidelity",
    notes: {
      fidelity: "Clean, intuitive",
      vanguard: "Can be confusing",
      schwab: "Good, professional",
    },
  },
  {
    name: "Customer Service",
    description: "Phone support quality and wait times",
    category: "service",
    ratings: { fidelity: 5, vanguard: 3, schwab: 5 },
    winner: "fidelity",
    notes: {
      fidelity: "24/7, low wait times",
      vanguard: "Quality good, wait times longer",
      schwab: "Excellent, 24/7 available",
    },
  },
  {
    name: "Research Tools",
    description: "Stock research and analysis tools",
    category: "features",
    ratings: { fidelity: 5, vanguard: 3, schwab: 5 },
    notes: {
      fidelity: "Comprehensive",
      vanguard: "Basic (they focus on passive investing)",
      schwab: "Excellent (TD Ameritrade tools)",
    },
  },
  {
    name: "Banking Features",
    description: "Checking, savings, bill pay, ATM access",
    category: "features",
    ratings: { fidelity: 4, vanguard: 2, schwab: 5 },
    winner: "schwab",
    notes: {
      fidelity: "Cash management account",
      vanguard: "Limited banking",
      schwab: "Full Schwab Bank - no ATM fees worldwide",
    },
  },
  {
    name: "Educational Resources",
    description: "Learning materials and investor education",
    category: "service",
    ratings: { fidelity: 5, vanguard: 4, schwab: 4 },
    winner: "fidelity",
    notes: {
      fidelity: "Fidelity Learning Center is excellent",
      vanguard: "Good retirement planning content",
      schwab: "Solid educational content",
    },
  },
];

const ACCOUNT_TYPES: AccountType[] = [
  {
    id: "taxable",
    name: "Taxable Brokerage",
    description: "Standard investment account, no contribution limits",
    icon: <Wallet className="h-5 w-5" />,
    availability: { fidelity: true, vanguard: true, schwab: true },
  },
  {
    id: "traditional-ira",
    name: "Traditional IRA",
    description: "Pre-tax retirement account with tax deduction",
    icon: <PiggyBank className="h-5 w-5" />,
    availability: { fidelity: true, vanguard: true, schwab: true },
  },
  {
    id: "roth-ira",
    name: "Roth IRA",
    description: "After-tax retirement account with tax-free growth",
    icon: <TrendingUp className="h-5 w-5" />,
    availability: { fidelity: true, vanguard: true, schwab: true },
  },
  {
    id: "sep-ira",
    name: "SEP IRA",
    description: "Simplified Employee Pension for self-employed",
    icon: <Building2 className="h-5 w-5" />,
    availability: { fidelity: true, vanguard: true, schwab: true },
  },
  {
    id: "solo-401k",
    name: "Solo 401(k)",
    description: "Individual 401(k) for self-employed with no employees",
    icon: <Users className="h-5 w-5" />,
    availability: { fidelity: true, vanguard: true, schwab: true },
    notes: "Schwab has particularly good Solo 401k options",
  },
  {
    id: "529",
    name: "529 College Savings",
    description: "Tax-advantaged education savings",
    icon: <GraduationCap className="h-5 w-5" />,
    availability: { fidelity: true, vanguard: true, schwab: true },
    notes: "State-specific options also available",
  },
  {
    id: "hsa",
    name: "HSA (Health Savings)",
    description: "Triple tax-advantaged health savings",
    icon: <Heart className="h-5 w-5" />,
    availability: { fidelity: true, vanguard: false, schwab: true },
    notes: "Vanguard doesn't offer direct HSA accounts",
  },
  {
    id: "custodial",
    name: "Custodial (UTMA/UGMA)",
    description: "Investment account for minors",
    icon: <Gift className="h-5 w-5" />,
    availability: { fidelity: true, vanguard: true, schwab: true },
  },
  {
    id: "trust",
    name: "Trust Account",
    description: "Investment account held in a trust",
    icon: <Shield className="h-5 w-5" />,
    availability: { fidelity: true, vanguard: true, schwab: true },
  },
];

const RED_FLAGS: RedFlag[] = [
  {
    flag: "Annual account fees",
    description:
      "The Big Three don't charge annual fees. If you're paying $50-100/year just to have an account, move.",
    severity: "high",
  },
  {
    flag: "High expense ratio funds (>0.5%)",
    description:
      "Index funds should be under 0.10%. If your 401k only offers funds charging 1%+, that costs you 20%+ of returns over 30 years.",
    severity: "high",
  },
  {
    flag: "Front-load or back-load fees",
    description:
      "Sales charges to buy (front-load) or sell (back-load) funds. Good index funds have NO load fees.",
    severity: "high",
  },
  {
    flag: "Proprietary funds pushed aggressively",
    description:
      "If your advisor only recommends their company's products, they may not be acting in your interest.",
    severity: "medium",
  },
  {
    flag: "Account transfer fees",
    description:
      "Some brokers charge to move your money out. Good brokers often reimburse these.",
    severity: "medium",
  },
  {
    flag: "Hidden trading commissions",
    description:
      "Some brokers route orders for payment, costing you through worse prices even if trades are 'free'.",
    severity: "low",
  },
  {
    flag: "High margin interest rates",
    description:
      "If you borrow against your portfolio, compare rates. Some charge 2-3% more than necessary.",
    severity: "low",
  },
  {
    flag: "No fractional shares",
    description:
      "Not being able to buy partial shares can make it hard to stay fully invested.",
    severity: "low",
  },
];

const TRANSFER_STEPS: TransferStep[] = [
  {
    step: 1,
    title: "Open account at new brokerage",
    description:
      "Open the same type of account (IRA to IRA, taxable to taxable). Takes 10-15 minutes online.",
    duration: "10-15 min",
  },
  {
    step: 2,
    title: "Initiate ACATS transfer",
    description:
      "On the NEW brokerage's website, look for 'Transfer Assets' or 'Move Accounts'. You'll need your old account number.",
    duration: "15-20 min",
  },
  {
    step: 3,
    title: "Select transfer type",
    description:
      "Choose 'full transfer' to move everything, or 'partial' to select specific holdings. Full transfer is easier.",
  },
  {
    step: 4,
    title: "Wait for transfer",
    description:
      "ACATS transfers typically complete in 5-7 business days. Your investments stay invested during transfer.",
    duration: "5-7 business days",
  },
  {
    step: 5,
    title: "Verify and clean up",
    description:
      "Confirm all assets transferred correctly. Close the old account if completely empty to avoid inactivity fees.",
    duration: "1 day",
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
          }`}
        />
      ))}
    </div>
  );
}

function BrokerageCard({ brokerage }: { brokerage: BrokerageInfo }) {
  return (
    <Card
      className={`${brokerage.bgColor} ${brokerage.borderColor} border-2 h-full`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className={`text-xl ${brokerage.color}`}>
              {brokerage.name}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {brokerage.tagline}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            Est. {brokerage.founded}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{brokerage.description}</p>

        <div>
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Strengths
          </h4>
          <ul className="space-y-1">
            {brokerage.strengths.map((strength, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                {strength}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-yellow-600" />
            Consider
          </h4>
          <ul className="space-y-1">
            {brokerage.considerations.map((consideration, idx) => (
              <li
                key={idx}
                className="text-sm flex items-start gap-2 text-muted-foreground"
              >
                <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {consideration}
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-3 border-t">
          <p className="text-sm">
            <strong>Best for:</strong> {brokerage.bestFor}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const BrokerageComparison = React.memo(function BrokerageComparison() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedBrokerage, setSelectedBrokerage] = useState<string | null>(
    null
  );

  // Feature categories for filtering
  const categories = useMemo(() => {
    const cats = new Set(COMPARISON_FEATURES.map((f) => f.category));
    return ["all", ...Array.from(cats)];
  }, []);

  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredFeatures = useMemo(() => {
    if (selectedCategory === "all") return COMPARISON_FEATURES;
    return COMPARISON_FEATURES.filter((f) => f.category === selectedCategory);
  }, [selectedCategory]);

  // Account links
  const ACCOUNT_LINKS = {
    fidelity: {
      taxable: "https://www.fidelity.com/open-account/overview",
      ira: "https://www.fidelity.com/retirement-ira/overview",
      roth: "https://www.fidelity.com/retirement-ira/roth-ira",
    },
    vanguard: {
      taxable: "https://investor.vanguard.com/client-benefits/open-account",
      ira: "https://investor.vanguard.com/accounts-plans/iras",
      roth: "https://investor.vanguard.com/accounts-plans/iras/roth-ira",
    },
    schwab: {
      taxable: "https://www.schwab.com/brokerage",
      ira: "https://www.schwab.com/ira",
      roth: "https://www.schwab.com/ira/roth-ira",
    },
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Landmark className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">
              Where to Open Investment Accounts
            </CardTitle>
            <CardDescription className="text-base">
              Compare the Big Three brokerages and find the right home for your
              investments
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <Building2 className="h-4 w-4 mr-1 hidden sm:inline" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="compare" className="text-xs sm:text-sm">
              <Layers className="h-4 w-4 mr-1 hidden sm:inline" />
              Compare
            </TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs sm:text-sm">
              <Wallet className="h-4 w-4 mr-1 hidden sm:inline" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="choose" className="text-xs sm:text-sm">
              <HelpCircle className="h-4 w-4 mr-1 hidden sm:inline" />
              Which One?
            </TabsTrigger>
            <TabsTrigger value="transfer" className="text-xs sm:text-sm">
              <RefreshCw className="h-4 w-4 mr-1 hidden sm:inline" />
              Transfer
            </TabsTrigger>
            <TabsTrigger value="redflags" className="text-xs sm:text-sm">
              <AlertTriangle className="h-4 w-4 mr-1 hidden sm:inline" />
              Red Flags
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview of Big Three */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Recommendation */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Award className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    Quick Recommendation
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    <strong>Can't decide?</strong> Open with{" "}
                    <strong>Fidelity</strong>. They have no minimums, excellent
                    service, a great app, and zero-fee index funds. You can
                    always open accounts at multiple brokerages later.
                  </p>
                </div>
              </div>
            </div>

            {/* Big Three Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {Object.values(BROKERAGES).map((brokerage) => (
                <BrokerageCard key={brokerage.id} brokerage={brokerage} />
              ))}
            </div>

            {/* All Three Are Good */}
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    You Can't Go Wrong
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    All three brokerages are excellent choices. They're all
                    well-regulated, financially stable, and offer SIPC
                    protection. The differences are in the details - pick the
                    one that fits your style.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Feature Comparison */}
          <TabsContent value="compare" className="space-y-6 mt-6">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="capitalize"
                >
                  {cat === "all" ? "All Features" : cat}
                </Button>
              ))}
            </div>

            {/* Comparison Table */}
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="p-3 text-left font-semibold">Feature</th>
                      <th className="p-3 text-center font-semibold">
                        <span className="text-green-700">Fidelity</span>
                      </th>
                      <th className="p-3 text-center font-semibold">
                        <span className="text-red-700">Vanguard</span>
                      </th>
                      <th className="p-3 text-center font-semibold">
                        <span className="text-blue-700">Schwab</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeatures.map((feature, idx) => (
                      <tr
                        key={feature.name}
                        className={
                          idx % 2 === 0
                            ? "bg-white dark:bg-gray-950"
                            : "bg-gray-50 dark:bg-gray-900"
                        }
                      >
                        <td className="p-3">
                          <div className="font-medium">{feature.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {feature.description}
                          </div>
                        </td>
                        {(["fidelity", "vanguard", "schwab"] as const).map(
                          (broker) => {
                            const rating = feature.ratings[broker];
                            const note = feature.notes?.[broker];
                            const isWinner = feature.winner === broker;

                            return (
                              <td
                                key={broker}
                                className={`p-3 text-center ${isWinner ? "bg-green-50 dark:bg-green-950/30" : ""}`}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  {typeof rating === "number" ? (
                                    <StarRating rating={rating} />
                                  ) : (
                                    <span
                                      className={`font-semibold ${isWinner ? "text-green-600" : ""}`}
                                    >
                                      {rating}
                                    </span>
                                  )}
                                  {note && (
                                    <span className="text-xs text-muted-foreground">
                                      {note}
                                    </span>
                                  )}
                                  {isWinner && (
                                    <Badge className="text-xs bg-green-600 mt-1">
                                      Best
                                    </Badge>
                                  )}
                                </div>
                              </td>
                            );
                          }
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="text-xs text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                Ratings are relative comparisons between these three brokerages
              </span>
            </div>
          </TabsContent>

          {/* Tab 3: Account Types */}
          <TabsContent value="accounts" className="space-y-6 mt-6">
            <p className="text-sm text-muted-foreground">
              All three brokerages offer the most common account types. Here's a
              quick reference:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ACCOUNT_TYPES.map((account) => (
                <Card key={account.id} className="h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 flex-shrink-0">
                        {account.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">{account.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {account.description}
                        </p>

                        <div className="flex gap-2 mt-2">
                          {(["fidelity", "vanguard", "schwab"] as const).map(
                            (broker) => (
                              <div
                                key={broker}
                                className={`flex items-center gap-1 text-xs ${
                                  account.availability[broker]
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {account.availability[broker] ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                <span className="capitalize hidden sm:inline">
                                  {broker.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )
                          )}
                        </div>

                        {account.notes && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                            {account.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Note about HSA */}
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                    About HSAs
                  </h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                    While Vanguard doesn't offer HSA accounts directly, you can
                    open an HSA at Fidelity (no fees, great investment options)
                    and keep the rest of your accounts at Vanguard if you
                    prefer.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Which to Choose */}
          <TabsContent value="choose" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Decision Helper */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Find Your Match
                </h3>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="beginner">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50">
                          Beginner
                        </Badge>
                        I'm new to investing
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p className="text-sm">
                          <strong className="text-green-600">
                            Recommendation: Fidelity
                          </strong>
                        </p>
                        <ul className="text-sm space-y-2">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            No minimums - start investing with any amount
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            Best mobile app for learning as you go
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            Excellent customer service when you have questions
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            Fractional shares let you buy any stock/ETF
                          </li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="loyalist">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-red-50">
                          Bogle-head
                        </Badge>
                        I want the lowest possible fees
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p className="text-sm">
                          <strong className="text-red-600">
                            Recommendation: Vanguard
                          </strong>
                        </p>
                        <ul className="text-sm space-y-2">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            Investor-owned structure means costs stay low
                            forever
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            Home of the original index funds (VTSAX, VTI, etc.)
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            Culture designed for long-term investors
                          </li>
                          <li className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            Note: Fidelity's zero-fee funds match/beat Vanguard
                            on cost
                          </li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="banker">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50">
                          Simplifier
                        </Badge>
                        I want banking + investing together
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p className="text-sm">
                          <strong className="text-blue-600">
                            Recommendation: Schwab
                          </strong>
                        </p>
                        <ul className="text-sm space-y-2">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            Full-service Schwab Bank with checking/savings
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            No ATM fees anywhere in the world (they reimburse
                            all)
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            Easy transfers between checking and investments
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            Great for travelers - no foreign transaction fees
                          </li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="multiple">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-50">
                          Diversifier
                        </Badge>
                        Can I use multiple brokerages?
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <p className="text-sm">
                          <strong className="text-purple-600">
                            Absolutely! Many people do.
                          </strong>
                        </p>
                        <ul className="text-sm space-y-2">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            401(k) at work + Roth IRA at Fidelity is common
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            HSA at Fidelity + Taxable at Vanguard works great
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            Banking at Schwab + Investing at Vanguard is fine
                          </li>
                          <li className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            Just keep track of where everything is!
                          </li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              {/* Quick Summary */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  TL;DR Summary
                </h3>

                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-green-700">Fidelity</span>
                      <Badge className="bg-green-600">Top Pick</Badge>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Best for most people. Great app, no minimums, zero-fee
                      index funds, excellent customer service.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-red-700">Vanguard</span>
                      <Badge variant="outline" className="border-red-300">
                        OG
                      </Badge>
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Best for purists. Investor-owned, pioneered index funds.
                      Accept the dated interface for the philosophy.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-blue-700">Schwab</span>
                      <Badge variant="outline" className="border-blue-300">
                        All-in-One
                      </Badge>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Best for banking combo. Great checking account with no ATM
                      fees worldwide + solid investing.
                    </p>
                  </div>
                </div>

                {/* Bottom line */}
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    The Real Answer
                  </h4>
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    Pick any of these three and{" "}
                    <strong>start investing today</strong>. The difference
                    between them is tiny compared to the cost of waiting to
                    invest. You can always transfer later.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 5: Transfers */}
          <TabsContent value="transfer" className="space-y-6 mt-6">
            {/* ACATS Explanation */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    Transferring is Easy (ACATS)
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    ACATS (Automated Customer Account Transfer Service) lets you
                    move investments between brokerages without selling. Your
                    investments stay invested during the transfer - no tax
                    consequences.
                  </p>
                </div>
              </div>
            </div>

            {/* Transfer Steps */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">
                How to Transfer an Account
              </h3>

              <div className="space-y-4">
                {TRANSFER_STEPS.map((step) => (
                  <div key={step.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                      {step.step}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{step.title}</h4>
                        {step.duration && (
                          <Badge variant="outline" className="text-xs">
                            {step.duration}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits of Consolidation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Benefits of Consolidation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Easier to track your total net worth
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Simpler rebalancing across accounts
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      One login to manage everything
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Easier beneficiary management
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      May qualify for premium services
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    Important Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <strong>No taxes</strong> on IRA-to-IRA or 401k-to-IRA
                      transfers
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Taxable transfers also have <strong>no tax impact</strong>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Some brokers reimburse transfer fees
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      Proprietary funds may need to be sold first
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      401k from current employer usually can't transfer
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Old 401k reminder */}
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100">
                    Have an Old 401(k)?
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                    If you left a job and still have a 401(k) there, consider
                    rolling it to an IRA at one of the Big Three. You'll
                    probably get lower fees and better investment options than
                    most employer plans.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 6: Red Flags */}
          <TabsContent value="redflags" className="space-y-6 mt-6">
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-100">
                    Warning Signs of Bad Brokerages
                  </h4>
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                    The Big Three (Fidelity, Vanguard, Schwab) avoid all these
                    issues. If you're with a different brokerage, watch for
                    these red flags:
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {RED_FLAGS.map((flag, idx) => (
                <Card
                  key={idx}
                  className={`border-l-4 ${
                    flag.severity === "high"
                      ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/20"
                      : flag.severity === "medium"
                        ? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                        : "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {flag.severity === "high" ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : flag.severity === "medium" ? (
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                        ) : (
                          <Info className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{flag.flag}</h4>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              flag.severity === "high"
                                ? "border-red-300 text-red-700"
                                : flag.severity === "medium"
                                  ? "border-amber-300 text-amber-700"
                                  : "border-blue-300 text-blue-700"
                            }`}
                          >
                            {flag.severity === "high"
                              ? "Major"
                              : flag.severity === "medium"
                                ? "Moderate"
                                : "Minor"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {flag.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* What to do */}
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                What to Do If You See Red Flags
              </h4>
              <ol className="text-sm text-green-800 dark:text-green-200 space-y-2 list-decimal list-inside">
                <li>
                  Don't panic - your investments are safe, just potentially
                  suboptimal
                </li>
                <li>Open an account at Fidelity, Vanguard, or Schwab</li>
                <li>
                  Initiate an ACATS transfer to move your investments over
                </li>
                <li>
                  If you have a 401k with bad options, maximize only to the
                  match, then max Roth IRA
                </li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>

        {/* Open Account Links - Always visible at bottom */}
        <div className="mt-8 pt-6 border-t">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-6">
            <div className="text-center mb-4">
              <h3 className="font-semibold text-lg flex items-center justify-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Open an Account
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                No affiliation - just helping you get started
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-green-700 text-center">
                  Fidelity
                </h4>
                <div className="space-y-1">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a
                      href="https://www.fidelity.com/open-account/overview"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Account
                    </a>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-xs" asChild>
                    <a
                      href="https://www.fidelity.com/retirement-ira/roth-ira"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Roth IRA
                    </a>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-red-700 text-center">
                  Vanguard
                </h4>
                <div className="space-y-1">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a
                      href="https://investor.vanguard.com/client-benefits/open-account"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Account
                    </a>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-xs" asChild>
                    <a
                      href="https://investor.vanguard.com/accounts-plans/iras/roth-ira"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Roth IRA
                    </a>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-blue-700 text-center">
                  Schwab
                </h4>
                <div className="space-y-1">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a
                      href="https://www.schwab.com/brokerage"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Account
                    </a>
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-xs" asChild>
                    <a
                      href="https://www.schwab.com/ira/roth-ira"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Roth IRA
                    </a>
                  </Button>
                </div>
              </div>
            </div>

            {/* Support contact */}
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span>
                    Fidelity:{" "}
                    <a href="tel:800-343-3548" className="hover:underline">
                      800-343-3548
                    </a>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span>
                    Vanguard:{" "}
                    <a href="tel:800-662-7447" className="hover:underline">
                      800-662-7447
                    </a>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span>
                    Schwab:{" "}
                    <a href="tel:800-435-4000" className="hover:underline">
                      800-435-4000
                    </a>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

BrokerageComparison.displayName = "BrokerageComparison";

export default BrokerageComparison;
