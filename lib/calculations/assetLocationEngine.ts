/**
 * Asset Location Optimizer Engine
 *
 * Asset location is the strategy of placing investments in the most tax-efficient
 * account type. Different investments have different tax characteristics:
 *
 * - Bonds/Fixed Income: Taxed at ordinary income rates -> Best in Traditional (tax-deferred)
 * - REITs: High dividend yields taxed at ordinary rates -> Best in Roth or Traditional
 * - Growth Stocks: Qualified dividends & LTCG -> Best in Taxable (favorable rates)
 * - International Stocks: Foreign tax credit available -> Best in Taxable
 * - Municipal Bonds: Tax-free -> Best in Taxable (no benefit from tax-advantaged)
 *
 * Key Insight: Proper asset location can add 0.5-1% annually to after-tax returns.
 * Over 30 years at 7% growth, that's 15-30% more wealth - FREE alpha.
 */

import { TAX_BRACKETS, LTCG_BRACKETS } from "@/lib/constants";
import type { FilingStatus } from "./taxCalculations";

// ==================== Asset Types ====================

/**
 * Asset class categories for tax-efficiency analysis
 */
export type AssetClass =
  | 'us_stocks'           // US total market / S&P 500
  | 'us_growth'           // Growth stocks (low dividends, high appreciation)
  | 'us_value'            // Value stocks (higher dividends)
  | 'us_dividend'         // High dividend stocks
  | 'international'       // International developed markets
  | 'emerging'            // Emerging markets
  | 'bonds_taxable'       // Taxable bonds (corporate, treasury)
  | 'bonds_muni'          // Municipal bonds (tax-exempt)
  | 'tips'                // Treasury Inflation-Protected Securities
  | 'reits'               // Real Estate Investment Trusts
  | 'commodities'         // Commodities / Gold
  | 'cash';               // Cash / Money Market

/**
 * Account types for asset location
 */
export type AccountType = 'taxable' | 'traditional' | 'roth';

/**
 * Individual asset holding
 */
export interface AssetHolding {
  id: string;
  name: string;
  ticker?: string;
  assetClass: AssetClass;
  value: number;
  accountType: AccountType;
  dividendYield?: number;       // Override for specific holding
  turnoverRate?: number;        // Annual turnover rate
  expenseRatio?: number;
}

/**
 * Account with holdings
 */
export interface Account {
  type: AccountType;
  balance: number;
  holdings: AssetHolding[];
}

/**
 * Tax efficiency characteristics for each asset class
 */
export interface TaxEfficiencyProfile {
  assetClass: AssetClass;
  name: string;
  description: string;

  // Tax characteristics (annual rates)
  dividendYield: number;        // Expected annual dividend yield
  qualifiedDividendPct: number; // % of dividends that are qualified
  expectedTurnover: number;     // Annual turnover rate (capital gains)
  interestIncome: number;       // Annual interest income rate

  // Tax efficiency score (1-10, higher = more tax-efficient in taxable)
  taxEfficiencyScore: number;

  // Optimal location ranking (1 = best, 3 = worst)
  locationRanking: {
    taxable: number;
    traditional: number;
    roth: number;
  };

  // Special considerations
  foreignTaxCredit: boolean;
  taxExempt: boolean;
  preferredLocation: AccountType;
  rationale: string;
}

// ==================== Tax Efficiency Profiles ====================

export const ASSET_TAX_PROFILES: Record<AssetClass, TaxEfficiencyProfile> = {
  us_stocks: {
    assetClass: 'us_stocks',
    name: 'US Total Market',
    description: 'Broad US stock market index',
    dividendYield: 1.5,
    qualifiedDividendPct: 95,
    expectedTurnover: 4,
    interestIncome: 0,
    taxEfficiencyScore: 8,
    locationRanking: { taxable: 1, traditional: 3, roth: 2 },
    foreignTaxCredit: false,
    taxExempt: false,
    preferredLocation: 'taxable',
    rationale: 'Low dividend yield with qualified dividends and long-term gains make taxable efficient',
  },

  us_growth: {
    assetClass: 'us_growth',
    name: 'US Growth Stocks',
    description: 'Growth-oriented US stocks with minimal dividends',
    dividendYield: 0.5,
    qualifiedDividendPct: 95,
    expectedTurnover: 15,
    interestIncome: 0,
    taxEfficiencyScore: 9,
    locationRanking: { taxable: 1, traditional: 3, roth: 2 },
    foreignTaxCredit: false,
    taxExempt: false,
    preferredLocation: 'taxable',
    rationale: 'Minimal dividends + LTCG rates make growth stocks highly tax-efficient in taxable',
  },

  us_value: {
    assetClass: 'us_value',
    name: 'US Value Stocks',
    description: 'Value-oriented US stocks with moderate dividends',
    dividendYield: 2.5,
    qualifiedDividendPct: 90,
    expectedTurnover: 20,
    interestIncome: 0,
    taxEfficiencyScore: 7,
    locationRanking: { taxable: 2, traditional: 2, roth: 1 },
    foreignTaxCredit: false,
    taxExempt: false,
    preferredLocation: 'taxable',
    rationale: 'Moderate dividends are mostly qualified; still tax-efficient in taxable',
  },

  us_dividend: {
    assetClass: 'us_dividend',
    name: 'High Dividend Stocks',
    description: 'Dividend-focused US stocks',
    dividendYield: 4.0,
    qualifiedDividendPct: 85,
    expectedTurnover: 25,
    interestIncome: 0,
    taxEfficiencyScore: 5,
    locationRanking: { taxable: 3, traditional: 2, roth: 1 },
    foreignTaxCredit: false,
    taxExempt: false,
    preferredLocation: 'roth',
    rationale: 'High dividends create annual tax drag; better in tax-advantaged accounts',
  },

  international: {
    assetClass: 'international',
    name: 'International Developed',
    description: 'Developed market international stocks',
    dividendYield: 3.0,
    qualifiedDividendPct: 80,
    expectedTurnover: 8,
    interestIncome: 0,
    taxEfficiencyScore: 7,
    locationRanking: { taxable: 1, traditional: 3, roth: 2 },
    foreignTaxCredit: true,
    taxExempt: false,
    preferredLocation: 'taxable',
    rationale: 'Foreign tax credit only available in taxable accounts; offsets dividend taxes',
  },

  emerging: {
    assetClass: 'emerging',
    name: 'Emerging Markets',
    description: 'Emerging market stocks',
    dividendYield: 2.5,
    qualifiedDividendPct: 60,
    expectedTurnover: 15,
    interestIncome: 0,
    taxEfficiencyScore: 6,
    locationRanking: { taxable: 1, traditional: 2, roth: 2 },
    foreignTaxCredit: true,
    taxExempt: false,
    preferredLocation: 'taxable',
    rationale: 'Foreign tax credit benefits; some non-qualified dividends reduce efficiency',
  },

  bonds_taxable: {
    assetClass: 'bonds_taxable',
    name: 'Taxable Bonds',
    description: 'Corporate and Treasury bonds',
    dividendYield: 0,
    qualifiedDividendPct: 0,
    expectedTurnover: 20,
    interestIncome: 4.5,
    taxEfficiencyScore: 2,
    locationRanking: { taxable: 3, traditional: 1, roth: 2 },
    foreignTaxCredit: false,
    taxExempt: false,
    preferredLocation: 'traditional',
    rationale: 'Interest taxed at ordinary rates; shelter in Traditional to defer taxes',
  },

  bonds_muni: {
    assetClass: 'bonds_muni',
    name: 'Municipal Bonds',
    description: 'Tax-exempt municipal bonds',
    dividendYield: 0,
    qualifiedDividendPct: 0,
    expectedTurnover: 15,
    interestIncome: 3.5,
    taxEfficiencyScore: 10,
    locationRanking: { taxable: 1, traditional: 3, roth: 3 },
    foreignTaxCredit: false,
    taxExempt: true,
    preferredLocation: 'taxable',
    rationale: 'Already tax-exempt; placing in tax-advantaged wastes the tax benefit',
  },

  tips: {
    assetClass: 'tips',
    name: 'TIPS',
    description: 'Treasury Inflation-Protected Securities',
    dividendYield: 0,
    qualifiedDividendPct: 0,
    expectedTurnover: 10,
    interestIncome: 1.5,
    taxEfficiencyScore: 3,
    locationRanking: { taxable: 3, traditional: 1, roth: 2 },
    foreignTaxCredit: false,
    taxExempt: false,
    preferredLocation: 'traditional',
    rationale: 'Phantom income from inflation adjustments is taxable; shelter in Traditional',
  },

  reits: {
    assetClass: 'reits',
    name: 'REITs',
    description: 'Real Estate Investment Trusts',
    dividendYield: 4.5,
    qualifiedDividendPct: 10,
    expectedTurnover: 10,
    interestIncome: 0,
    taxEfficiencyScore: 2,
    locationRanking: { taxable: 3, traditional: 1, roth: 1 },
    foreignTaxCredit: false,
    taxExempt: false,
    preferredLocation: 'traditional',
    rationale: 'High non-qualified dividends taxed at ordinary rates; shelter in tax-advantaged',
  },

  commodities: {
    assetClass: 'commodities',
    name: 'Commodities',
    description: 'Commodities and precious metals',
    dividendYield: 0,
    qualifiedDividendPct: 0,
    expectedTurnover: 30,
    interestIncome: 0,
    taxEfficiencyScore: 3,
    locationRanking: { taxable: 3, traditional: 1, roth: 2 },
    foreignTaxCredit: false,
    taxExempt: false,
    preferredLocation: 'traditional',
    rationale: 'Often taxed as collectibles (28% rate); shelter in tax-advantaged',
  },

  cash: {
    assetClass: 'cash',
    name: 'Cash/Money Market',
    description: 'Cash and money market funds',
    dividendYield: 0,
    qualifiedDividendPct: 0,
    expectedTurnover: 0,
    interestIncome: 4.5,
    taxEfficiencyScore: 4,
    locationRanking: { taxable: 2, traditional: 1, roth: 2 },
    foreignTaxCredit: false,
    taxExempt: false,
    preferredLocation: 'traditional',
    rationale: 'Interest taxed at ordinary rates; but keep emergency funds in taxable for access',
  },
};

// ==================== Analysis Types ====================

/**
 * Tax drag analysis for a single holding
 */
export interface HoldingTaxDrag {
  holding: AssetHolding;
  currentAccount: AccountType;
  optimalAccount: AccountType;
  annualTaxDrag: number;           // Annual tax cost in current location
  optimalTaxDrag: number;          // Annual tax cost in optimal location
  annualSavings: number;           // Annual savings if moved to optimal
  twentyYearImpact: number;        // 20-year compounded impact
  isOptimal: boolean;
  recommendation: string;
}

/**
 * Portfolio-level tax efficiency analysis
 */
export interface PortfolioAnalysis {
  totalValue: number;
  currentAllocation: {
    taxable: number;
    traditional: number;
    roth: number;
  };

  // Tax efficiency metrics
  currentTaxDrag: number;          // Annual tax drag with current allocation
  optimalTaxDrag: number;          // Annual tax drag with optimal allocation
  annualSavings: number;           // Potential annual savings
  twentyYearImpact: number;        // 20-year compounded benefit
  thirtyYearImpact: number;        // 30-year compounded benefit

  // Efficiency scores
  currentEfficiencyScore: number;  // 0-100
  optimalEfficiencyScore: number;  // 0-100

  // Per-holding analysis
  holdingAnalysis: HoldingTaxDrag[];

  // Optimization recommendations
  recommendations: OptimizationRecommendation[];

  // Optimal allocation (what should go where)
  optimalPlacement: {
    taxable: AssetHolding[];
    traditional: AssetHolding[];
    roth: AssetHolding[];
  };
}

/**
 * Specific recommendation for asset movement
 */
export interface OptimizationRecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  fromAccount: AccountType;
  toAccount: AccountType;
  assetClass: AssetClass;
  value: number;
  annualBenefit: number;
  twentyYearBenefit: number;
  rationale: string;
}

/**
 * Rebalancing strategy for tax efficiency
 */
export interface RebalancingStrategy {
  method: 'new_contributions' | 'within_accounts' | 'tax_loss_harvest' | 'exchange';
  description: string;
  taxImpact: 'none' | 'minimal' | 'significant';
  steps: string[];
}

/**
 * Withdrawal order for retirement
 */
export interface WithdrawalOrderStep {
  order: number;
  accountType: AccountType;
  rationale: string;
  taxImplication: string;
  conditions?: string;
}

// ==================== Calculation Functions ====================

/**
 * Calculate annual tax drag for a holding in a specific account type
 */
export function calculateHoldingTaxDrag(
  holding: AssetHolding,
  accountType: AccountType,
  marginalRate: number,
  ltcgRate: number
): number {
  const profile = ASSET_TAX_PROFILES[holding.assetClass];
  const value = holding.value;

  if (accountType === 'roth') {
    // No tax drag in Roth - all growth is tax-free
    return 0;
  }

  if (accountType === 'traditional') {
    // Traditional: No current tax, but will be taxed at ordinary rates on withdrawal
    // For comparison purposes, we assume eventual taxation at marginal rate
    // This is a simplification - actual impact depends on withdrawal timing
    return 0; // No annual drag, deferred taxation
  }

  // Taxable account - calculate actual annual tax drag
  let annualTaxDrag = 0;

  // 1. Tax on interest income (ordinary rates)
  const interestIncome = value * (profile.interestIncome / 100);
  if (!profile.taxExempt) {
    annualTaxDrag += interestIncome * marginalRate;
  }

  // 2. Tax on dividends
  const totalDividends = value * ((holding.dividendYield ?? profile.dividendYield) / 100);
  const qualifiedDividends = totalDividends * (profile.qualifiedDividendPct / 100);
  const nonQualifiedDividends = totalDividends - qualifiedDividends;

  // Qualified dividends taxed at LTCG rates
  annualTaxDrag += qualifiedDividends * ltcgRate;
  // Non-qualified dividends taxed at ordinary rates
  annualTaxDrag += nonQualifiedDividends * marginalRate;

  // 3. Tax on realized capital gains from turnover
  const turnover = holding.turnoverRate ?? profile.expectedTurnover;
  const estimatedGains = value * (turnover / 100) * 0.5; // Assume 50% of turnover is gains
  annualTaxDrag += estimatedGains * ltcgRate;

  // 4. Foreign tax credit (reduces drag for international)
  if (profile.foreignTaxCredit && accountType === 'taxable') {
    // Foreign tax credit can offset some US tax
    const foreignTaxPaid = totalDividends * 0.15; // Approximate 15% foreign withholding
    annualTaxDrag -= Math.min(foreignTaxPaid, annualTaxDrag * 0.3); // Credit limited
  }

  return Math.max(0, annualTaxDrag);
}

/**
 * Get the marginal tax rate for a given income and filing status
 */
export function getMarginalRate(income: number, status: FilingStatus): number {
  const brackets = TAX_BRACKETS[status];
  const taxableIncome = Math.max(0, income - brackets.deduction);

  for (const bracket of brackets.rates) {
    if (taxableIncome <= bracket.limit) {
      return bracket.rate;
    }
  }

  return brackets.rates[brackets.rates.length - 1].rate;
}

/**
 * Get the LTCG rate for a given income and filing status
 */
export function getLTCGRate(income: number, status: FilingStatus): number {
  const brackets = LTCG_BRACKETS[status];

  for (const bracket of brackets) {
    if (income <= bracket.limit) {
      return bracket.rate;
    }
  }

  return brackets[brackets.length - 1].rate;
}

/**
 * Analyze a single holding for tax efficiency
 */
export function analyzeHolding(
  holding: AssetHolding,
  marginalRate: number,
  ltcgRate: number,
  expectedReturn: number = 0.07
): HoldingTaxDrag {
  const profile = ASSET_TAX_PROFILES[holding.assetClass];
  const currentAccount = holding.accountType;
  const optimalAccount = profile.preferredLocation;

  // Calculate tax drag in current location
  const currentTaxDrag = calculateHoldingTaxDrag(holding, currentAccount, marginalRate, ltcgRate);

  // Calculate tax drag in optimal location
  const optimalTaxDrag = calculateHoldingTaxDrag(
    { ...holding, accountType: optimalAccount },
    optimalAccount,
    marginalRate,
    ltcgRate
  );

  const annualSavings = currentTaxDrag - optimalTaxDrag;

  // Compound the savings over 20 years
  const twentyYearImpact = annualSavings > 0
    ? annualSavings * ((Math.pow(1 + expectedReturn, 20) - 1) / expectedReturn)
    : 0;

  const isOptimal = currentAccount === optimalAccount || annualSavings < 100;

  let recommendation = '';
  if (!isOptimal) {
    recommendation = `Move ${profile.name} from ${formatAccountType(currentAccount)} to ${formatAccountType(optimalAccount)}`;
  } else {
    recommendation = `${profile.name} is optimally placed in ${formatAccountType(currentAccount)}`;
  }

  return {
    holding,
    currentAccount,
    optimalAccount,
    annualTaxDrag: currentTaxDrag,
    optimalTaxDrag,
    annualSavings,
    twentyYearImpact,
    isOptimal,
    recommendation,
  };
}

/**
 * Format account type for display
 */
function formatAccountType(type: AccountType): string {
  switch (type) {
    case 'taxable': return 'Taxable';
    case 'traditional': return 'Traditional 401(k)/IRA';
    case 'roth': return 'Roth';
  }
}

/**
 * Calculate optimal asset placement across account types
 */
export function calculateOptimalPlacement(
  holdings: AssetHolding[],
  accountCapacities: { taxable: number; traditional: number; roth: number }
): { taxable: AssetHolding[]; traditional: AssetHolding[]; roth: AssetHolding[] } {
  // Sort holdings by tax efficiency (least efficient first - they need shelter most)
  const sortedHoldings = [...holdings].sort((a, b) => {
    const profileA = ASSET_TAX_PROFILES[a.assetClass];
    const profileB = ASSET_TAX_PROFILES[b.assetClass];
    return profileA.taxEfficiencyScore - profileB.taxEfficiencyScore;
  });

  const result = {
    taxable: [] as AssetHolding[],
    traditional: [] as AssetHolding[],
    roth: [] as AssetHolding[],
  };

  const remaining = { ...accountCapacities };

  // First pass: Place tax-inefficient assets in Traditional (most shelter)
  for (const holding of sortedHoldings) {
    const profile = ASSET_TAX_PROFILES[holding.assetClass];

    if (profile.taxEfficiencyScore <= 4) {
      // Tax-inefficient - prioritize Traditional
      if (remaining.traditional >= holding.value) {
        result.traditional.push({ ...holding, accountType: 'traditional' });
        remaining.traditional -= holding.value;
      } else if (remaining.roth >= holding.value) {
        result.roth.push({ ...holding, accountType: 'roth' });
        remaining.roth -= holding.value;
      } else {
        result.taxable.push({ ...holding, accountType: 'taxable' });
        remaining.taxable -= holding.value;
      }
    }
  }

  // Second pass: Place remaining assets optimally
  for (const holding of sortedHoldings) {
    const profile = ASSET_TAX_PROFILES[holding.assetClass];

    if (profile.taxEfficiencyScore > 4) {
      // Tax-efficient - can go in taxable
      const preferredOrder: AccountType[] = profile.foreignTaxCredit
        ? ['taxable', 'roth', 'traditional'] // International needs taxable for FTC
        : ['taxable', 'roth', 'traditional'];

      for (const account of preferredOrder) {
        if (remaining[account] >= holding.value) {
          result[account].push({ ...holding, accountType: account });
          remaining[account] -= holding.value;
          break;
        }
      }
    }
  }

  return result;
}

/**
 * Full portfolio analysis
 */
export function analyzePortfolio(
  accounts: Account[],
  income: number,
  status: FilingStatus,
  expectedReturn: number = 0.07
): PortfolioAnalysis {
  const marginalRate = getMarginalRate(income, status);
  const ltcgRate = getLTCGRate(income, status);

  // Gather all holdings
  const allHoldings = accounts.flatMap(acc => acc.holdings);
  const totalValue = allHoldings.reduce((sum, h) => sum + h.value, 0);

  // Calculate current allocation
  const currentAllocation = {
    taxable: accounts.find(a => a.type === 'taxable')?.balance || 0,
    traditional: accounts.find(a => a.type === 'traditional')?.balance || 0,
    roth: accounts.find(a => a.type === 'roth')?.balance || 0,
  };

  // Analyze each holding
  const holdingAnalysis = allHoldings.map(h =>
    analyzeHolding(h, marginalRate, ltcgRate, expectedReturn)
  );

  // Calculate totals
  const currentTaxDrag = holdingAnalysis.reduce((sum, h) => sum + h.annualTaxDrag, 0);
  const optimalTaxDrag = holdingAnalysis.reduce((sum, h) => sum + h.optimalTaxDrag, 0);
  const annualSavings = currentTaxDrag - optimalTaxDrag;

  // Compound savings
  const twentyYearImpact = annualSavings > 0
    ? annualSavings * ((Math.pow(1 + expectedReturn, 20) - 1) / expectedReturn)
    : 0;
  const thirtyYearImpact = annualSavings > 0
    ? annualSavings * ((Math.pow(1 + expectedReturn, 30) - 1) / expectedReturn)
    : 0;

  // Calculate efficiency scores
  const maxPossibleDrag = totalValue * 0.03; // Assume 3% max drag
  const currentEfficiencyScore = Math.round(100 - (currentTaxDrag / maxPossibleDrag) * 100);
  const optimalEfficiencyScore = Math.round(100 - (optimalTaxDrag / maxPossibleDrag) * 100);

  // Generate recommendations
  const recommendations = generateRecommendations(holdingAnalysis, expectedReturn);

  // Calculate optimal placement
  const optimalPlacement = calculateOptimalPlacement(allHoldings, currentAllocation);

  return {
    totalValue,
    currentAllocation,
    currentTaxDrag,
    optimalTaxDrag,
    annualSavings,
    twentyYearImpact,
    thirtyYearImpact,
    currentEfficiencyScore: Math.max(0, Math.min(100, currentEfficiencyScore)),
    optimalEfficiencyScore: Math.max(0, Math.min(100, optimalEfficiencyScore)),
    holdingAnalysis,
    recommendations,
    optimalPlacement,
  };
}

/**
 * Generate prioritized recommendations
 */
function generateRecommendations(
  holdingAnalysis: HoldingTaxDrag[],
  expectedReturn: number
): OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = [];

  // Filter to non-optimal holdings and sort by potential savings
  const suboptimal = holdingAnalysis
    .filter(h => !h.isOptimal)
    .sort((a, b) => b.annualSavings - a.annualSavings);

  for (const analysis of suboptimal) {
    const profile = ASSET_TAX_PROFILES[analysis.holding.assetClass];

    const priority: 'high' | 'medium' | 'low' =
      analysis.annualSavings > 500 ? 'high' :
      analysis.annualSavings > 100 ? 'medium' : 'low';

    recommendations.push({
      priority,
      action: `Move ${profile.name} to ${formatAccountType(analysis.optimalAccount)}`,
      fromAccount: analysis.currentAccount,
      toAccount: analysis.optimalAccount,
      assetClass: analysis.holding.assetClass,
      value: analysis.holding.value,
      annualBenefit: analysis.annualSavings,
      twentyYearBenefit: analysis.twentyYearImpact,
      rationale: profile.rationale,
    });
  }

  return recommendations;
}

/**
 * Get rebalancing strategies for tax efficiency
 */
export function getRebalancingStrategies(): RebalancingStrategy[] {
  return [
    {
      method: 'new_contributions',
      description: 'Direct new contributions to underweight accounts',
      taxImpact: 'none',
      steps: [
        'Identify which accounts are underweight for optimal allocation',
        'Direct new 401(k) contributions to bonds/REITs if Traditional is underweight',
        'Direct new taxable contributions to growth stocks/international',
        'Let natural contributions gradually shift allocation over time',
      ],
    },
    {
      method: 'within_accounts',
      description: 'Rebalance within each account type',
      taxImpact: 'none',
      steps: [
        'Within your Traditional 401(k)/IRA, sell stocks and buy bonds',
        'Within your taxable account, sell bonds and buy stocks',
        'No tax impact because trades happen within tax-advantaged accounts',
        'Or trades in taxable are matched buy/sell of same asset class',
      ],
    },
    {
      method: 'tax_loss_harvest',
      description: 'Use losses to enable tax-free repositioning',
      taxImpact: 'minimal',
      steps: [
        'Identify holdings with unrealized losses in taxable account',
        'Sell losing positions to harvest tax losses',
        'Use losses to offset gains from selling misplaced assets',
        'Repurchase similar (but not identical) funds to maintain exposure',
        'Wait 31 days to avoid wash sale rules if buying same fund',
      ],
    },
    {
      method: 'exchange',
      description: 'Exchange funds within the same fund family',
      taxImpact: 'significant',
      steps: [
        'Some fund families allow exchanges between funds',
        'This may still trigger capital gains taxes',
        'Best used when gains are minimal or losses exist to offset',
        'Consider this only for significant misallocations',
      ],
    },
  ];
}

/**
 * Get the optimal withdrawal order for retirement
 */
export function getWithdrawalOrder(
  hasTraditional: boolean,
  hasRoth: boolean,
  hasTaxable: boolean,
  age: number
): WithdrawalOrderStep[] {
  const steps: WithdrawalOrderStep[] = [];
  let order = 1;

  // General rule: Taxable first, then Traditional (RMDs), then Roth last

  if (hasTaxable) {
    steps.push({
      order: order++,
      accountType: 'taxable',
      rationale: 'Withdraw from taxable first to allow tax-advantaged accounts to grow longer',
      taxImplication: 'Only gains are taxed at LTCG rates; basis is tax-free',
      conditions: 'Until depleted or until RMDs begin',
    });
  }

  if (hasTraditional && age >= 73) {
    steps.push({
      order: order++,
      accountType: 'traditional',
      rationale: 'Required Minimum Distributions (RMDs) are mandatory starting at age 73',
      taxImplication: 'Entire withdrawal taxed as ordinary income',
      conditions: 'Must take RMD amount annually; can take more if needed',
    });
  } else if (hasTraditional) {
    steps.push({
      order: order++,
      accountType: 'traditional',
      rationale: 'Strategic withdrawals before RMDs can reduce future RMD amounts and fill lower tax brackets',
      taxImplication: 'Entire withdrawal taxed as ordinary income',
      conditions: 'Consider Roth conversions in low-income years',
    });
  }

  if (hasRoth) {
    steps.push({
      order: order++,
      accountType: 'roth',
      rationale: 'Withdraw from Roth last to maximize tax-free growth; no RMDs on Roth',
      taxImplication: 'Completely tax-free (contributions and earnings)',
      conditions: 'Must be 59.5+ and account must be 5+ years old for tax-free earnings',
    });
  }

  return steps;
}

/**
 * Create default holdings from simple account balances
 * This is useful for users who don't specify individual holdings
 */
export function createDefaultHoldings(
  taxableBalance: number,
  traditionalBalance: number,
  rothBalance: number,
  stockAllocation: number = 0.7 // Default 70/30 stocks/bonds
): AssetHolding[] {
  const holdings: AssetHolding[] = [];
  const bondAllocation = 1 - stockAllocation;

  // Helper to create holdings for an account
  const createAccountHoldings = (balance: number, accountType: AccountType) => {
    if (balance <= 0) return;

    // Stocks portion
    holdings.push({
      id: `${accountType}-stocks`,
      name: 'US Total Stock Market',
      assetClass: 'us_stocks',
      value: balance * stockAllocation * 0.7,
      accountType,
    });

    holdings.push({
      id: `${accountType}-intl`,
      name: 'International Stocks',
      assetClass: 'international',
      value: balance * stockAllocation * 0.3,
      accountType,
    });

    // Bonds portion
    holdings.push({
      id: `${accountType}-bonds`,
      name: 'Total Bond Market',
      assetClass: 'bonds_taxable',
      value: balance * bondAllocation,
      accountType,
    });
  };

  createAccountHoldings(taxableBalance, 'taxable');
  createAccountHoldings(traditionalBalance, 'traditional');
  createAccountHoldings(rothBalance, 'roth');

  return holdings;
}

/**
 * Calculate tax-adjusted return for an asset in a specific account type
 */
export function calculateTaxAdjustedReturn(
  assetClass: AssetClass,
  accountType: AccountType,
  nominalReturn: number,
  marginalRate: number,
  ltcgRate: number
): number {
  const profile = ASSET_TAX_PROFILES[assetClass];

  if (accountType === 'roth') {
    // Roth: Full return (tax-free)
    return nominalReturn;
  }

  if (accountType === 'traditional') {
    // Traditional: Full return now, but will be taxed at ordinary rates later
    // For comparison, we don't reduce current return but note deferred taxation
    return nominalReturn;
  }

  // Taxable: Reduce return by tax drag
  const dividendDrag = (profile.dividendYield / 100) *
    (profile.qualifiedDividendPct / 100 * ltcgRate +
     (1 - profile.qualifiedDividendPct / 100) * marginalRate);

  const interestDrag = profile.taxExempt ? 0 : (profile.interestIncome / 100) * marginalRate;

  const turnoverDrag = (profile.expectedTurnover / 100) * 0.5 * ltcgRate;

  const foreignTaxBenefit = profile.foreignTaxCredit ?
    (profile.dividendYield / 100) * 0.1 : 0; // Approximate credit benefit

  return nominalReturn - dividendDrag - interestDrag - turnoverDrag + foreignTaxBenefit;
}

// All types are exported inline where defined
