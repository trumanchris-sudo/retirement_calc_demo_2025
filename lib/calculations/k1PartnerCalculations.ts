// K-1 Partner Income Calculation
// Handles Safe Harbor quarterly tax payments, self-employment tax, and multi-state tax drag

export interface PartnerInputs {
  drawBase: number;       // e.g., 500000
  expectedBonus: number;  // e.g., 250000
  priorYearTax: number;   // Line 24 from previous year 1040 (for Safe Harbor)
  stateTaxRate: number;   // Blended rate (e.g., 4% for multi-state drag)
  isMarried: boolean;
  spouseIncome: number;   // Needed for tax bracket calculation
}

export interface PartnerMonthlyResult {
  month: number;
  gross: number;
  estimatedTaxPaid: number;
  stateTaxDrag: number;
  netCashFlow: number;
  isBonusMonth: boolean;
  isTaxMonth: boolean;
}

export interface PartnerYearEndSummary {
  totalGross: number;
  totalSafeHarborPaid: number;
  actualLiability: number;
  aprilTrueUpDue: number; // The check you write next year
  netAfterAllTaxes: number;
}

export interface PartnerCalculationResult {
  months: PartnerMonthlyResult[];
  yearEndSummary: PartnerYearEndSummary;
}

export const calculateK1PartnerFlow = (inputs: PartnerInputs): PartnerCalculationResult => {
  const { drawBase, expectedBonus, priorYearTax, stateTaxRate, isMarried, spouseIncome } = inputs;

  // Constants
  const SE_LIMIT = 176100; // SS Wage Base
  const MEDICARE_RATE = 0.029; // 2.9% (Employer+Employee)
  const ADDL_MEDICARE = 0.009; // 0.9% over 250k (Joint)
  const SE_SS_RATE = 0.124;    // 12.4%

  // 1. Calculate Safe Harbor Quarterly Payments
  // Rule: Pay 110% of Prior Year Tax to avoid penalty
  const requiredAnnualSafeHarbor = priorYearTax * 1.10;
  const quarterlySafeHarborPayment = requiredAnnualSafeHarbor / 4;

  // 2. Build the 12-Month Flow (Partners usually paid monthly Draw)
  const monthlyDraw = drawBase / 12;
  const months: PartnerMonthlyResult[] = [];

  // Trackers
  let ytdK1Income = 0;

  for (let i = 0; i < 12; i++) {
    const isQuarterlyMonth = [3, 5, 8, 0].includes(i); // Apr, Jun, Sept, Jan (approx)
    // Note: IRS Q4 is due Jan 15, so that falls in next year or month 0 of next cycle
    // For cash flow modeling, we usually book Q1/Q2/Q3 in Apr/Jun/Sept, and Q4 in Jan.

    let taxPayment = 0;
    let description = "Monthly Draw";

    // The Draw
    let cashIn = monthlyDraw;

    // The Bonus (Assume Feb distribution for previous year, or Dec)
    if (i === 1) { // February Distribution
       cashIn += expectedBonus;
       description = "Draw + Distribution";
    }

    // QUARTERLY ESTIMATED TAXES (The "Safe Harbor" Strategy)
    if (i === 3 || i === 5 || i === 8 || i === 0) {
       taxPayment = quarterlySafeHarborPayment;
    }

    // MULTI-STATE TAX DRAG (The "Texas Trap")
    // This is usually withheld by the firm from the distribution or paid via composite
    const stateTaxWithholding = (cashIn * stateTaxRate);

    // SELF-EMPLOYMENT TAX "GHOST" CALCULATION
    // (You don't pay this monthly, it's part of the estimated tax, but we track liability)
    ytdK1Income += cashIn;

    // Net Cash Flow Calculation
    // Partners don't have "Withholding". They have "Check Writing".
    const netCash = cashIn - taxPayment - stateTaxWithholding;

    months.push({
       month: i + 1,
       gross: cashIn,
       estimatedTaxPaid: taxPayment,
       stateTaxDrag: stateTaxWithholding,
       netCashFlow: netCash,
       isBonusMonth: (i === 1),
       isTaxMonth: (taxPayment > 0)
    });
  }

  // 3. The "True Up" Calculation (April 15 of NEXT year)
  // We must calculate actual tax liability vs what was paid in Safe Harbor
  const totalIncome = drawBase + expectedBonus + spouseIncome;

  // Simple SE Tax Calc
  const seTaxable = (drawBase + expectedBonus) * 0.9235; // IRS haircut
  const ssTax = Math.min(seTaxable, SE_LIMIT) * SE_SS_RATE;
  const medTax = seTaxable * MEDICARE_RATE + (Math.max(0, totalIncome - 250000) * ADDL_MEDICARE);
  const totalSETax = ssTax + medTax;

  // Est. Income Tax (Simplified flat 35% blended for high earner logic + SE deduction)
  const taxableIncome = totalIncome - (totalSETax / 2) - 60000; // Standard deduction + adjustments
  const approxIncomeTax = taxableIncome * 0.35; // Placeholder for progressive logic

  const totalLiability = approxIncomeTax + totalSETax;
  const totalPaid = requiredAnnualSafeHarbor;
  const aprilTrueUp = totalLiability - totalPaid;

  return {
    months,
    yearEndSummary: {
       totalGross: drawBase + expectedBonus,
       totalSafeHarborPaid: totalPaid,
       actualLiability: totalLiability,
       aprilTrueUpDue: aprilTrueUp, // The check you write next year
       netAfterAllTaxes: (drawBase + expectedBonus) - totalLiability - (drawBase * stateTaxRate)
    }
  };
};
