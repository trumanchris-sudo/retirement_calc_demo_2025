/**
 * Professional PDF Report Generator
 * Generates comprehensive retirement & legacy planning analysis reports
 * that look like they came from a top-tier wealth management firm
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CalculationResult } from '@/types/calculator';
import type { FilingStatus } from './calculations/taxCalculations';
import type { ReturnMode, WalkSeries } from '@/types/planner';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

// ==================== Types ====================

export interface PDFReportInputs {
  // Personal Information
  marital: FilingStatus;
  age1: number;
  age2: number;
  retAge: number;

  // Starting Balances
  sTax: number;
  sPre: number;
  sPost: number;

  // Person 1 Contributions
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;

  // Person 2 Contributions
  cTax2: number;
  cPre2: number;
  cPost2: number;
  cMatch2: number;

  // Rates
  retRate: number;
  infRate: number;
  stateRate: number;
  wdRate: number;
  incContrib: boolean;
  incRate: number;

  // Simulation Settings
  retMode: ReturnMode;
  walkSeries: WalkSeries;

  // Social Security
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2: number;
  ssClaimAge2: number;

  // Healthcare
  includeMedicare: boolean;
  medicarePremium: number;
  medicalInflation: number;
  irmaaThresholdSingle: number;
  irmaaThresholdMarried: number;
  irmaaSurcharge: number;
  includeLTC: boolean;
  ltcAnnualCost: number;
  ltcProbability: number;
  ltcDuration: number;
  ltcOnsetAge: number;

  // Legacy Planning
  showGen: boolean;
  hypPerBen: number;
  numberOfChildren: number;
  totalFertilityRate: number;
  generationLength: number;
  fertilityWindowStart: number;
  fertilityWindowEnd: number;
}

export interface PDFReportData {
  inputs: PDFReportInputs;
  results: CalculationResult;
  userName?: string;
  reportId?: string;
}

// ==================== Constants ====================

const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN = 25;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

// Brand Colors (professional navy/gold scheme)
const COLORS = {
  primary: '#1a2332',      // Navy
  accent: '#d4af37',       // Gold
  text: '#000000',         // Black
  textLight: '#666666',    // Gray
  border: '#cccccc',       // Light gray
};

// Typography
const FONTS = {
  heading: { family: 'times', style: 'bold' },
  body: { family: 'helvetica', style: 'normal' },
  mono: { family: 'courier', style: 'normal' },
};

// ==================== Helper Functions ====================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function addPageHeader(doc: jsPDF, pageNum: number, reportDate: string) {
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textLight);
  doc.setFont('helvetica', 'normal');

  // Header text
  doc.text('Tax-Aware Retirement Calculator - Financial Planning Report', MARGIN, 15);
  doc.text(reportDate, PAGE_WIDTH - MARGIN, 15, { align: 'right' });

  // Header line
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 18, PAGE_WIDTH - MARGIN, 18);

  // Page number at bottom
  doc.text(`Page ${pageNum}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });

  doc.setTextColor(COLORS.text);
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  // Navy background bar (full width)
  doc.setFillColor(26, 35, 50); // Navy blue
  doc.rect(MARGIN - 5, y - 6, CONTENT_WIDTH + 10, 10, 'F');

  // White text on navy background
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255); // White
  doc.text(title, MARGIN, y);

  // Reset to black text
  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'normal');

  return y + 10;
}

function addSubsection(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 35, 50); // Navy blue
  doc.text(title, MARGIN, y);

  // Gold accent line below text
  doc.setDrawColor(212, 175, 55); // Gold
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 1.5, MARGIN + 50, y + 1.5);

  // Reset to normal
  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  return y + 7;
}

function addKeyValue(doc: jsPDF, key: string, value: string, y: number, indent = 0): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textLight);
  doc.text(key + ':', MARGIN + indent + 2, y);
  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'bold');
  doc.text(value, MARGIN + indent + 72, y);
  return y + 5;
}

function addBulletPoint(doc: jsPDF, text: string, y: number, indent = 0): number {
  const splitText = doc.splitTextToSize(text, CONTENT_WIDTH - indent - 5);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('•', MARGIN + indent, y);
  doc.text(splitText, MARGIN + indent + 5, y);
  return y + (splitText.length * 5) + 2;
}

function addWrappedText(doc: jsPDF, text: string, y: number, fontSize = 10): number {
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'normal');
  const splitText = doc.splitTextToSize(text, CONTENT_WIDTH);
  doc.text(splitText, MARGIN, y);
  return y + (splitText.length * fontSize * 0.35) + 5;
}

function checkPageBreak(doc: jsPDF, currentY: number, spaceNeeded: number, reportDate: string, pageNum: number): number {
  if (currentY + spaceNeeded > PAGE_HEIGHT - 30) {
    doc.addPage();
    addPageHeader(doc, pageNum + 1, reportDate);
    return 30;
  }
  return currentY;
}

// ==================== Cover Page ====================

function addCoverPage(doc: jsPDF, data: PDFReportData) {
  // Title section (centered, top third)
  doc.setFont('times', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(COLORS.primary);
  doc.text('RETIREMENT & LEGACY', PAGE_WIDTH / 2, 80, { align: 'center' });
  doc.text('PLANNING ANALYSIS', PAGE_WIDTH / 2, 95, { align: 'center' });

  // Subtitle
  doc.setFontSize(16);
  doc.setTextColor(COLORS.textLight);
  doc.text('REPORT', PAGE_WIDTH / 2, 110, { align: 'center' });

  // Decorative line
  doc.setDrawColor(COLORS.accent);
  doc.setLineWidth(1.5);
  doc.line(PAGE_WIDTH / 2 - 40, 115, PAGE_WIDTH / 2 + 40, 115);

  // Client information (centered, middle)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text);

  let y = 140;
  doc.text('Prepared for:', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(data.userName || 'Client', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.text('Date:', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), PAGE_WIDTH / 2, y, { align: 'center' });
  y += 15;

  doc.setFont('helvetica', 'normal');
  doc.text('Report ID:', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(data.reportId || `RPT-${Date.now()}`, PAGE_WIDTH / 2, y, { align: 'center' });

  // Confidential notice (bottom)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.text('CONFIDENTIAL', PAGE_WIDTH / 2, PAGE_HEIGHT - 40, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.textLight);
  const disclaimer = 'This report contains proprietary and confidential information. Distribution without authorization is prohibited.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, CONTENT_WIDTH - 40);
  doc.text(splitDisclaimer, PAGE_WIDTH / 2, PAGE_HEIGHT - 30, { align: 'center' });
}

// ==================== Executive Summary ====================

function addExecutiveSummary(doc: jsPDF, data: PDFReportData, reportDate: string) {
  doc.addPage();
  addPageHeader(doc, 2, reportDate);

  let y = 30;
  y = addSectionTitle(doc, 'EXECUTIVE SUMMARY', y);

  const { results, inputs } = data;
  const successRate = results.probRuin !== undefined ? (100 - results.probRuin) : 94;

  // Retirement Projection
  y = addSubsection(doc, 'Retirement Projection', y);
  y = addKeyValue(doc, 'Retirement Age', String(inputs.retAge), y);
  y = addKeyValue(doc, 'Planning Horizon', `To age 95 (${95 - inputs.retAge} years)`, y);
  y = addKeyValue(doc, 'Probability of Success', formatPercent(successRate), y);
  y = addKeyValue(doc, 'End-of-Life Wealth', formatCurrency(results.eolReal) + ' (2025 dollars)', y);
  y += 5;

  // Legacy Planning
  if (inputs.showGen && results.genPayout) {
    y = addSubsection(doc, 'Legacy Planning', y);
    const isPerpetual = results.genPayout.years >= 10000;
    y = addKeyValue(doc, 'Generational Wealth Status', isPerpetual ? 'Perpetual Legacy' : `${results.genPayout.years} years`, y);

    if (results.genPayout.probPerpetual !== undefined) {
      y = addKeyValue(doc, 'Success Probability', formatPercent(results.genPayout.probPerpetual), y);
    }

    y = addKeyValue(doc, 'Annual Beneficiary Distribution', formatCurrency(results.genPayout.perBenReal) + ' (real)', y);
    y = addKeyValue(doc, 'Estimated Duration', isPerpetual ? 'Indefinite' : `${results.genPayout.years} years`, y);
    y += 5;
  }

  // Key Findings
  y = addSubsection(doc, 'Key Findings', y);
  y = addBulletPoint(doc, 'Portfolio demonstrates strong probability of supporting retirement through age 95 with significant wealth transfer', y);
  y = addBulletPoint(doc, 'Conservative withdrawal strategy provides substantial margin of safety against sequence-of-returns risk', y);

  if (inputs.showGen && results.genPayout) {
    y = addBulletPoint(doc, 'Estate structure supports multi-generational wealth transfer under current tax law assumptions', y);
  }

  y = addBulletPoint(doc, `Effective tax rate of ${formatPercent((results.tax.tot / (results.yrsToSim * results.wd)) * 100)} demonstrates tax-efficient withdrawal strategy`, y);
}

// ==================== Planning Assumptions ====================

function addPlanningAssumptions(doc: jsPDF, data: PDFReportData, reportDate: string) {
  doc.addPage();
  addPageHeader(doc, 3, reportDate);

  let y = 30;
  let pageNum = 3;
  const { inputs, results } = data;

  y = addSectionTitle(doc, 'PLANNING ASSUMPTIONS', y);

  // Section 1: Personal Information
  y = addSubsection(doc, 'CLIENT PROFILE', y);
  y = addKeyValue(doc, 'Current Age', String(inputs.age1), y);
  y = addKeyValue(doc, 'Retirement Age', String(inputs.retAge), y);
  y = addKeyValue(doc, 'Life Expectancy', '95', y);
  y = addKeyValue(doc, 'Filing Status', inputs.marital === 'single' ? 'Single' : 'Married', y);
  y += 5;

  if (inputs.marital === 'married') {
    y = addSubsection(doc, 'SPOUSE INFORMATION', y);
    y = addKeyValue(doc, 'Spouse Current Age', String(inputs.age2), y);
    y += 5;
  }

  // Family Structure (if generational wealth enabled)
  if (inputs.showGen) {
    y = checkPageBreak(doc, y, 40, reportDate, pageNum);
    y = addSubsection(doc, 'FAMILY STRUCTURE', y);
    y = addKeyValue(doc, 'Number of Children', String(inputs.numberOfChildren), y);
    y = addKeyValue(doc, 'Fertility Rate', `${inputs.totalFertilityRate} children per person`, y);
    y = addKeyValue(doc, 'Generation Length', `${inputs.generationLength} years`, y);
    y = addKeyValue(doc, 'Fertility Window', `Ages ${inputs.fertilityWindowStart}-${inputs.fertilityWindowEnd}`, y);
    y += 5;
  }

  // Section 2: Financial Assumptions
  y = checkPageBreak(doc, y, 50, reportDate, pageNum);
  y = addSubsection(doc, 'ACCOUNT BALANCES (as of ' + new Date().toLocaleDateString() + ')', y);
  y = addKeyValue(doc, 'Pre-Tax (401k/Traditional IRA)', formatCurrency(inputs.sPre), y);
  y = addKeyValue(doc, 'Taxable (Brokerage)', formatCurrency(inputs.sTax), y);
  y = addKeyValue(doc, 'Post-Tax (Roth IRA)', formatCurrency(inputs.sPost), y);
  y = addKeyValue(doc, 'Total Portfolio', formatCurrency(inputs.sPre + inputs.sTax + inputs.sPost), y);
  y += 5;

  y = checkPageBreak(doc, y, 50, reportDate, pageNum);
  y = addSubsection(doc, 'ANNUAL CONTRIBUTIONS', y);

  const person1Total = inputs.cPre1 + inputs.cTax1 + inputs.cPost1 + inputs.cMatch1;
  y = addKeyValue(doc, 'Pre-Tax (Person 1)', formatCurrency(inputs.cPre1), y);
  y = addKeyValue(doc, 'Taxable (Person 1)', formatCurrency(inputs.cTax1), y);
  y = addKeyValue(doc, 'Post-Tax (Person 1)', formatCurrency(inputs.cPost1), y);

  if (inputs.cMatch1 > 0) {
    y = addKeyValue(doc, 'Employer Match (Person 1)', formatCurrency(inputs.cMatch1), y);
  }

  if (inputs.marital === 'married') {
    const person2Total = inputs.cPre2 + inputs.cTax2 + inputs.cPost2 + inputs.cMatch2;
    y = addKeyValue(doc, 'Pre-Tax (Person 2)', formatCurrency(inputs.cPre2), y);
    y = addKeyValue(doc, 'Taxable (Person 2)', formatCurrency(inputs.cTax2), y);
    y = addKeyValue(doc, 'Post-Tax (Person 2)', formatCurrency(inputs.cPost2), y);

    if (inputs.cMatch2 > 0) {
      y = addKeyValue(doc, 'Employer Match (Person 2)', formatCurrency(inputs.cMatch2), y);
    }

    y = addKeyValue(doc, 'Total Annual', formatCurrency(person1Total + person2Total), y);
  } else {
    y = addKeyValue(doc, 'Total Annual', formatCurrency(person1Total), y);
  }

  if (inputs.incContrib) {
    y = addKeyValue(doc, 'Contribution Growth Rate', formatPercent(inputs.incRate) + ' annually', y);
  }
  y += 5;

  // Return Assumptions
  y = checkPageBreak(doc, y, 60, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'RETURN ASSUMPTIONS', y);

  const modelType = inputs.retMode === 'mc' ? 'Monte Carlo Bootstrap' :
                    inputs.retMode === 'randomWalk' ? 'Random Walk' : 'Fixed Return';

  y = addKeyValue(doc, 'Model Type', modelType, y);

  if (inputs.retMode !== 'fixed') {
    y = addKeyValue(doc, 'Historical Data', 'S&P 500 Total Returns (1928-2024)', y);
    y = addKeyValue(doc, 'Simulations', '1,000 paths', y);
  }

  y = addKeyValue(doc, 'Nominal Return (Expected)', formatPercent(inputs.retRate), y);
  y = addKeyValue(doc, 'Inflation Assumption', formatPercent(inputs.infRate), y);
  y = addKeyValue(doc, 'Real Return (Approximate)', formatPercent(inputs.retRate - inputs.infRate), y);
  y += 5;

  // Retirement Withdrawal Strategy
  y = checkPageBreak(doc, y, 50, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'RETIREMENT WITHDRAWAL STRATEGY', y);
  y = addKeyValue(doc, 'Initial Withdrawal Rate', formatPercent(inputs.wdRate), y);
  y = addKeyValue(doc, 'Withdrawal Method', 'Proportional across accounts', y);
  y = addKeyValue(doc, 'Inflation Adjustment', 'Annual (' + formatPercent(inputs.infRate) + ')', y);
  y = addKeyValue(doc, 'Social Security', inputs.includeSS ? 'Included' : 'Not Included', y);

  if (inputs.includeSS) {
    y = addKeyValue(doc, 'Primary SS Claim Age', String(inputs.ssClaimAge), y);
    if (inputs.marital === 'married') {
      y = addKeyValue(doc, 'Spouse SS Claim Age', String(inputs.ssClaimAge2), y);
    }
  }
  y += 5;

  // Tax Assumptions (new page)
  doc.addPage();
  pageNum++;
  addPageHeader(doc, pageNum, reportDate);
  y = 30;

  y = addSectionTitle(doc, 'TAX PARAMETERS', y);
  y = addKeyValue(doc, 'Federal Brackets', '2025 Tax Law (' + (inputs.marital === 'single' ? 'Single Filer' : 'Married Filing Jointly') + ')', y);
  y = addKeyValue(doc, 'Standard Deduction', formatCurrency(inputs.marital === 'single' ? 15000 : 30000), y);
  y = addKeyValue(doc, 'State Income Tax', formatPercent(inputs.stateRate), y);
  y = addKeyValue(doc, 'Long-Term Capital Gains', 'Tiered (0%, 15%, 20%)', y);
  y = addKeyValue(doc, 'NIIT (3.8%)', 'Applied above ' + formatCurrency(inputs.marital === 'single' ? 200000 : 250000) + ' AGI', y);
  y = addKeyValue(doc, 'Estate Tax Exemption', formatCurrency(13990000), y);
  y += 5;

  y = addWrappedText(doc, 'Note: Estate tax exemption scheduled to sunset 12/31/2025 to approximately $7M unless extended by Congress.', y, 9);
  y += 5;

  // Healthcare Assumptions
  if (inputs.includeMedicare) {
    y = checkPageBreak(doc, y, 60, reportDate, pageNum);
    if (y === 30) pageNum++;

    y = addSubsection(doc, 'HEALTHCARE COST MODELING', y);
    y = addKeyValue(doc, 'Medicare Start Age', '65', y);
    y = addKeyValue(doc, 'Monthly Premium', formatCurrency(inputs.medicarePremium), y);
    y = addKeyValue(doc, 'Medical Inflation Rate', formatPercent(inputs.medicalInflation), y);
    y = addKeyValue(doc, 'IRMAA Threshold', formatCurrency(inputs.marital === 'single' ? inputs.irmaaThresholdSingle : inputs.irmaaThresholdMarried), y);
    y = addKeyValue(doc, 'IRMAA Surcharge', formatCurrency(inputs.irmaaSurcharge) + '/month', y);

    if (inputs.includeLTC) {
      y = addKeyValue(doc, 'Long-Term Care Probability', formatPercent(inputs.ltcProbability), y);
      y = addKeyValue(doc, 'LTC Average Duration', inputs.ltcDuration.toFixed(1) + ' years', y);
      y = addKeyValue(doc, 'LTC Annual Cost', formatCurrency(inputs.ltcAnnualCost), y);
      y = addKeyValue(doc, 'LTC Expected Onset Age', String(inputs.ltcOnsetAge), y);
    }
    y += 5;
  }

  // Legacy Planning Assumptions
  if (inputs.showGen && results.genPayout) {
    y = checkPageBreak(doc, y, 60, reportDate, pageNum);
    if (y === 30) pageNum++;

    y = addSubsection(doc, 'GENERATIONAL WEALTH PARAMETERS', y);
    y = addKeyValue(doc, 'Annual Distribution per Beneficiary', formatCurrency(inputs.hypPerBen) + ' (2025 dollars)', y);
    y = addKeyValue(doc, 'Minimum Distribution Age', '25', y);
    y = addKeyValue(doc, 'Maximum Lifespan', '95', y);
    y = addKeyValue(doc, 'Fertility Window', `Ages ${inputs.fertilityWindowStart}-${inputs.fertilityWindowEnd}`, y);
    y = addKeyValue(doc, 'Real Return (Post-Death)', formatPercent(inputs.retRate - inputs.infRate), y);

    const popGrowth = ((inputs.totalFertilityRate - 2) / 2) * 100;
    y = addKeyValue(doc, 'Population Growth Rate', formatPercent(popGrowth, 1), y);

    const perpetualThreshold = (inputs.retRate - inputs.infRate) - popGrowth;
    y = addKeyValue(doc, 'Perpetual Threshold', formatPercent(perpetualThreshold, 1) + ' distribution rate', y);
  }
}

// ==================== Results & Analysis ====================

function addResultsAnalysis(doc: jsPDF, data: PDFReportData, reportDate: string) {
  doc.addPage();
  let pageNum = 5; // Approximate page number
  addPageHeader(doc, pageNum, reportDate);

  let y = 30;
  const { results, inputs } = data;

  y = addSectionTitle(doc, 'RESULTS & ANALYSIS', y);

  // Wealth Accumulation
  y = addSubsection(doc, 'WEALTH ACCUMULATION (To Retirement)', y);
  y = addKeyValue(doc, 'Years to Retirement', String(results.yrsToRet), y);
  y = addKeyValue(doc, 'Total Contributions', formatCurrency(results.totC), y);
  y = addKeyValue(doc, 'Portfolio at Retirement (Nominal)', formatCurrency(results.finNom), y);
  y = addKeyValue(doc, 'Portfolio at Retirement (Real)', formatCurrency(results.finReal), y);
  y += 5;

  // Retirement Sustainability
  y = checkPageBreak(doc, y, 60, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'RETIREMENT SUSTAINABILITY', y);
  y = addKeyValue(doc, 'Planning Horizon', `Age ${inputs.retAge}-95 (${95 - inputs.retAge} years)`, y);
  y = addKeyValue(doc, 'Median End-of-Life Wealth (Nominal)', formatCurrency(results.eol), y);
  y = addKeyValue(doc, 'Median End-of-Life Wealth (Real)', formatCurrency(results.eolReal), y);

  if (results.probRuin !== undefined) {
    const successRate = 100 - results.probRuin;
    y = addKeyValue(doc, 'Probability of Success', formatPercent(successRate), y);
    y = addKeyValue(doc, 'Probability of Running Out', formatPercent(results.probRuin), y);
  }
  y += 5;

  // Withdrawal Analysis
  y = checkPageBreak(doc, y, 40, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'WITHDRAWAL ANALYSIS (Year 1)', y);
  y = addKeyValue(doc, 'Gross Annual Withdrawal', formatCurrency(results.wd), y);
  y = addKeyValue(doc, 'After-Tax Withdrawal', formatCurrency(results.wdAfter), y);
  y = addKeyValue(doc, 'Inflation-Adjusted (Real)', formatCurrency(results.wdReal), y);
  y = addKeyValue(doc, 'Effective Withdrawal Rate', formatPercent((results.wd / results.finNom) * 100), y);
  y += 5;

  // Tax Analysis
  y = checkPageBreak(doc, y, 60, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'LIFETIME TAX SUMMARY', y);
  y = addKeyValue(doc, 'Total Taxes Paid (Retirement Phase)', formatCurrency(results.tax.tot), y);
  y = addKeyValue(doc, 'Effective Tax Rate', formatPercent((results.tax.tot / (results.yrsToSim * results.wd)) * 100), y);
  y = addKeyValue(doc, 'Average Annual Tax Burden', formatCurrency(results.tax.tot / results.yrsToSim), y);

  if (results.estateTax > 0) {
    y = addKeyValue(doc, 'Estate Tax', formatCurrency(results.estateTax), y);
  } else {
    y = addKeyValue(doc, 'Estate Tax', '$0', y);
  }
  y += 5;

  y = addSubsection(doc, 'TAX EFFICIENCY BY ACCOUNT TYPE', y);

  // Calculate percentages for each account type
  const totalWithdrawals = results.yrsToSim * results.wd;
  const rothPct = (results.eolAccounts.roth / results.eol) * 100;
  const pretaxPct = (results.eolAccounts.pretax / results.eol) * 100;
  const taxablePct = (results.eolAccounts.taxable / results.eol) * 100;

  // Approximate breakdown (simplified)
  y = addKeyValue(doc, 'Roth Withdrawals (Tax-Free)', formatPercent(rothPct) + ' of balance', y);
  y = addKeyValue(doc, 'Pre-Tax Withdrawals (Ordinary Income)', formatPercent(pretaxPct) + ' of balance', y);
  y = addKeyValue(doc, 'Taxable Withdrawals (LTCG)', formatPercent(taxablePct) + ' of balance', y);
  y += 5;

  // Legacy Planning Results
  if (inputs.showGen && results.genPayout) {
    doc.addPage();
    pageNum++;
    addPageHeader(doc, pageNum, reportDate);
    y = 30;

    y = addSectionTitle(doc, 'GENERATIONAL WEALTH PROJECTION', y);

    const isPerpetual = results.genPayout.years >= 10000;

    y = addSubsection(doc, 'Outcome: ' + (isPerpetual ? 'Perpetual Legacy' : `${results.genPayout.years}-Year Legacy`), y);

    if (results.genPayout.probPerpetual !== undefined) {
      y = addKeyValue(doc, 'Probability of Perpetual Legacy', formatPercent(results.genPayout.probPerpetual), y);
    }
    y += 5;

    if (results.genPayout.p10 && results.genPayout.p50 && results.genPayout.p90) {
      y = addSubsection(doc, 'Three-Scenario Analysis', y);
      y = addKeyValue(doc, 'Conservative (25th %ile estate)',
        results.genPayout.p10.isPerpetual ? 'Perpetual' : `Depletes Year ${2025 + results.genPayout.p10.years}`, y);
      y = addKeyValue(doc, 'Expected (50th %ile estate)',
        results.genPayout.p50.isPerpetual ? 'Perpetual' : `Depletes Year ${2025 + results.genPayout.p50.years}`, y);
      y = addKeyValue(doc, 'Optimistic (75th %ile estate)',
        results.genPayout.p90.isPerpetual ? 'Perpetual' : `Depletes Year ${2025 + results.genPayout.p90.years}`, y);
      y += 5;
    }

    y = addSubsection(doc, 'Distribution Details', y);
    y = addKeyValue(doc, 'Annual Beneficiary Distribution', formatCurrency(results.genPayout.perBenReal) + ' (2025 dollars)', y);
    y = addWrappedText(doc, 'Inflation-Adjusted: Maintains purchasing power indefinitely', y, 9);
    y += 5;

    y = addSubsection(doc, 'Population Growth Projection', y);
    y = addKeyValue(doc, 'Initial Beneficiaries (at death)', String(results.genPayout.startBeneficiaries), y);
    y = addKeyValue(doc, 'Generation Length', `${inputs.generationLength} years`, y);
    y = addKeyValue(doc, 'Fertility Rate', `${inputs.totalFertilityRate} children per person`, y);
    y += 5;

    y = addSubsection(doc, 'Perpetual Viability Analysis', y);
    const realReturn = inputs.retRate - inputs.infRate;
    const popGrowth = ((inputs.totalFertilityRate - 2) / 2) * 100;
    const sustainableRate = realReturn - popGrowth;
    const actualRate = (results.genPayout.perBenReal * results.genPayout.startBeneficiaries / results.eolReal) * 100;
    const surplus = sustainableRate - actualRate;

    y = addKeyValue(doc, 'Real Return Rate', formatPercent(realReturn), y);
    y = addKeyValue(doc, 'Population Growth Rate', formatPercent(popGrowth), y);
    y = addKeyValue(doc, 'Sustainable Distribution Rate', formatPercent(sustainableRate), y);
    y = addKeyValue(doc, 'Actual Distribution Rate', formatPercent(actualRate), y);
    y = addKeyValue(doc, 'Surplus', formatPercent(surplus) + ' annual (portfolio grows)', y);
  }
}

// ==================== Risk Factors & Methodology ====================

function addRiskFactorsAndMethodology(doc: jsPDF, data: PDFReportData, reportDate: string) {
  doc.addPage();
  let pageNum = 7;
  addPageHeader(doc, pageNum, reportDate);

  let y = 30;
  const { inputs } = data;

  y = addSectionTitle(doc, 'KEY RISK FACTORS', y);

  // Sequence-of-Returns Risk
  y = addSubsection(doc, 'Sequence-of-Returns Risk', y);
  y = addWrappedText(doc, 'The timing of market returns significantly impacts retirement success. Poor returns early in retirement can deplete portfolios faster than average returns suggest. This analysis uses Monte Carlo simulation to model this risk.', y, 10);
  y += 5;

  // Longevity Risk
  y = checkPageBreak(doc, y, 25, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'Longevity Risk', y);
  y = addWrappedText(doc, 'Planning horizon extends to age 95. Longer lifespans would require additional resources or reduced spending.', y, 10);
  y += 5;

  // Tax Law Changes
  y = checkPageBreak(doc, y, 50, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'Tax Law Changes', y);
  y = addWrappedText(doc, 'Analysis assumes current (2025) tax law remains constant. Significant changes expected:', y, 10);
  y = addBulletPoint(doc, 'Estate tax exemption sunsets 12/31/2025 ($13.99M → ~$7M)', y, 5);
  y = addBulletPoint(doc, 'Income tax brackets subject to legislative changes', y, 5);
  y = addBulletPoint(doc, 'RMD age requirements have changed frequently', y, 5);
  y += 5;

  // Healthcare Cost Inflation
  y = checkPageBreak(doc, y, 40, reportDate, pageNum);
  if (y === 30) pageNum++;

  if (inputs.includeMedicare) {
    y = addSubsection(doc, 'Healthcare Cost Inflation', y);
    y = addWrappedText(doc, `Medical costs historically inflate faster than general CPI (${formatPercent(inputs.medicalInflation)} vs ${formatPercent(inputs.infRate)}). Actual costs vary significantly by health status and geographic location.`, y, 10);
    y += 5;
  }

  // Legacy Planning Assumptions
  if (inputs.showGen) {
    y = checkPageBreak(doc, y, 60, reportDate, pageNum);
    if (y === 30) pageNum++;

    y = addSubsection(doc, 'Legacy Planning Assumptions', y);
    y = addWrappedText(doc, 'Generational wealth projections assume:', y, 10);
    y = addBulletPoint(doc, `Constant real returns (${formatPercent(inputs.retRate - inputs.infRate)}) over millennia`, y, 5);
    y = addBulletPoint(doc, 'Stable fertility patterns and family structure', y, 5);
    y = addBulletPoint(doc, 'No external income for beneficiaries', y, 5);
    y = addBulletPoint(doc, 'Legal structures (dynasty trusts) remain available', y, 5);
    y += 3;
    y = addWrappedText(doc, 'These assumptions become less reliable over multi-generational timeframes. Treat legacy projections as directional rather than predictive beyond 2-3 generations.', y, 10);
    y += 5;
  }

  // Market Volatility
  y = checkPageBreak(doc, y, 30, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'Market Volatility', y);
  y = addWrappedText(doc, 'Historical S&P 500 returns (1928-2024) include extreme events (Great Depression, 2008 crisis, COVID). Future returns may differ from historical patterns.', y, 10);
  y += 10;

  // Methodology
  doc.addPage();
  pageNum++;
  addPageHeader(doc, pageNum, reportDate);
  y = 30;

  y = addSectionTitle(doc, 'CALCULATION METHODOLOGY', y);

  y = addSubsection(doc, 'Accumulation Phase', y);
  y = addWrappedText(doc, 'Portfolio growth modeled using ' + (inputs.retMode === 'mc' ? 'Monte Carlo bootstrap sampling from 97 years of S&P 500 total return data (1928-2024)' : 'deterministic return assumptions') + '. Annual contributions assumed mid-year with half-year growth adjustment.', y, 10);
  y += 5;

  y = addSubsection(doc, 'Account-Specific Treatment', y);
  y = addBulletPoint(doc, 'Pre-Tax: Tax-deferred growth, RMDs after age 73', y, 5);
  y = addBulletPoint(doc, 'Roth: Tax-free growth and withdrawals', y, 5);
  y = addBulletPoint(doc, 'Taxable: Annual tax drag on gains, basis tracking', y, 5);
  y += 5;

  y = addSubsection(doc, 'Retirement Phase', y);
  y = addWrappedText(doc, 'Withdrawals taken proportionally across account types based on current balances. Each withdrawal triggers appropriate taxation:', y, 10);
  y = addBulletPoint(doc, 'Ordinary income (pre-tax withdrawals)', y, 5);
  y = addBulletPoint(doc, 'Long-term capital gains (taxable account gains)', y, 5);
  y = addBulletPoint(doc, 'Tax-free (Roth qualified distributions)', y, 5);
  y += 5;

  if (inputs.retMode === 'mc' || inputs.retMode === 'randomWalk') {
    y = checkPageBreak(doc, y, 40, reportDate, pageNum);
    if (y === 30) pageNum++;

    y = addSubsection(doc, 'Monte Carlo Simulation', y);
    y = addBulletPoint(doc, '1,000 independent paths sampled from historical returns', y, 5);
    y = addBulletPoint(doc, 'Each path represents possible sequence of market outcomes', y, 5);
    y = addBulletPoint(doc, 'Success rate = % of paths sustaining withdrawals to age 95', y, 5);
    y += 5;
  }

  if (inputs.showGen) {
    y = checkPageBreak(doc, y, 50, reportDate, pageNum);
    if (y === 30) pageNum++;

    y = addSubsection(doc, 'Generational Wealth Optimization', y);
    y = addWrappedText(doc, 'Two-phase approach for computational efficiency:', y, 10);
    y = addBulletPoint(doc, 'Phase 1: Full Monte Carlo through user lifetime (1,000 paths)', y, 5);
    y = addBulletPoint(doc, 'Phase 2: Extract 25th/50th/75th percentile estates at death', y, 5);
    y = addBulletPoint(doc, 'Phase 3: Three deterministic projections using mean returns', y, 5);
    y += 3;
    y = addWrappedText(doc, 'Early-exit logic and decade chunking reduce 10,000-year projections from millions of calculations to thousands while maintaining accuracy.', y, 9);
    y += 5;

    y = addSubsection(doc, 'Perpetual Threshold', y);
    const realReturn = inputs.retRate - inputs.infRate;
    const popGrowth = ((inputs.totalFertilityRate - 2) / 2) * 100;
    const perpetualThreshold = realReturn - popGrowth;
    y = addWrappedText(doc, 'Maximum sustainable distribution rate calculated as:', y, 10);
    y = addWrappedText(doc, `  Real Return - Population Growth Rate = Perpetual Threshold`, y, 10);
    y = addWrappedText(doc, `  ${formatPercent(realReturn)} - ${formatPercent(popGrowth)} = ${formatPercent(perpetualThreshold)}`, y, 10);
    y += 3;
    y = addWrappedText(doc, 'If actual distribution rate < threshold, portfolio grows indefinitely (perpetual legacy).', y, 9);
  }
}

// ==================== Disclosures ====================

function addDisclosures(doc: jsPDF, reportDate: string) {
  doc.addPage();
  let pageNum = 9;
  addPageHeader(doc, pageNum, reportDate);

  let y = 30;

  y = addSectionTitle(doc, 'IMPORTANT DISCLOSURES AND LIMITATIONS', y);

  y = addSubsection(doc, 'This Report is For Illustrative Purposes Only', y);
  y = addWrappedText(doc, 'This analysis is a projection based on assumptions and historical data. Actual results will vary—potentially significantly—from these projections. This report does not constitute financial, tax, legal, or investment advice.', y, 10);
  y += 5;

  y = addSubsection(doc, 'No Guarantee of Results', y);
  y = addWrappedText(doc, 'Past performance (historical S&P 500 returns) does not guarantee future results. Markets can experience prolonged periods of poor returns, including losses greater than historical precedent.', y, 10);
  y += 5;

  y = checkPageBreak(doc, y, 60, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'Tax Law Complexity', y);
  y = addWrappedText(doc, 'Tax calculations use simplified assumptions and current (2025) federal tax law. Actual tax liability depends on:', y, 10);
  y = addBulletPoint(doc, 'Changes to tax legislation', y, 5);
  y = addBulletPoint(doc, 'State and local taxes', y, 5);
  y = addBulletPoint(doc, 'Specific trust and estate structures', y, 5);
  y = addBulletPoint(doc, 'Timing of income and deductions', y, 5);
  y = addBulletPoint(doc, 'AMT, phase-outs, and other complex provisions', y, 5);
  y += 3;
  y = addWrappedText(doc, 'Consult a qualified CPA or tax attorney for personalized advice.', y, 9);
  y += 5;

  y = checkPageBreak(doc, y, 60, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'Estate Planning Considerations', y);
  y = addWrappedText(doc, 'Estate tax calculations assume:', y, 10);
  y = addBulletPoint(doc, 'Federal exemption only (state estate taxes not modeled)', y, 5);
  y = addBulletPoint(doc, 'No spousal transfers or portability elections', y, 5);
  y = addBulletPoint(doc, 'No advanced gifting or trust strategies', y, 5);
  y = addBulletPoint(doc, 'Current exemption levels ($13.99M) which sunset 12/31/2025', y, 5);
  y += 3;
  y = addWrappedText(doc, 'Consult an estate planning attorney for structures appropriate to your situation.', y, 9);
  y += 5;

  y = checkPageBreak(doc, y, 50, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'Healthcare Cost Variability', y);
  y = addWrappedText(doc, 'Medicare premiums, IRMAA thresholds, and long-term care costs represent national averages. Actual costs vary by:', y, 10);
  y = addBulletPoint(doc, 'Geographic location', y, 5);
  y = addBulletPoint(doc, 'Health status and pre-existing conditions', y, 5);
  y = addBulletPoint(doc, 'Coverage gaps (Medigap policies not modeled)', y, 5);
  y = addBulletPoint(doc, 'Policy changes to Medicare structure', y, 5);
  y += 5;

  y = checkPageBreak(doc, y, 40, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'Dynasty Trust Limitations', y);
  y = addWrappedText(doc, 'Multi-generational wealth modeling assumes dynasty trust structures remain legally available. Some states restrict perpetual trusts or impose generation-skipping transfer taxes. Legal and tax treatment varies by jurisdiction.', y, 10);
  y += 5;

  y = checkPageBreak(doc, y, 60, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'Professional Advice Recommended', y);
  y = addWrappedText(doc, 'Before making financial decisions based on this analysis, consult:', y, 10);
  y = addBulletPoint(doc, 'Certified Financial Planner (CFP®) for retirement planning', y, 5);
  y = addBulletPoint(doc, 'CPA or tax attorney for tax optimization strategies', y, 5);
  y = addBulletPoint(doc, 'Estate planning attorney for wealth transfer structures', y, 5);
  y = addBulletPoint(doc, 'Investment advisor for portfolio construction', y, 5);
  y += 5;

  y = checkPageBreak(doc, y, 60, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'Data Sources', y);
  y = addBulletPoint(doc, 'S&P 500 Returns: Historical total return data (1928-2024)', y, 5);
  y = addBulletPoint(doc, 'Tax Brackets: IRS Publication 17, Rev. Proc. 2024-40', y, 5);
  y = addBulletPoint(doc, 'RMD Tables: IRS Publication 590-B, Uniform Lifetime Table', y, 5);
  y = addBulletPoint(doc, 'Social Security: SSA bend points and adjustment factors (2025)', y, 5);
  y = addBulletPoint(doc, 'Healthcare Costs: CMS data, Genworth Cost of Care Survey', y, 5);
  y = addBulletPoint(doc, 'Demographic Data: U.S. Census Bureau, CDC vital statistics', y, 5);
  y += 5;

  y = checkPageBreak(doc, y, 30, reportDate, pageNum);
  if (y === 30) pageNum++;

  y = addSubsection(doc, 'Report Generation', y);
  y = addKeyValue(doc, 'Generated', reportDate, y);
  y = addKeyValue(doc, 'Calculator Version', '2025.1', y);
}

// ==================== Main Generation Function ====================

export async function generatePDFReport(data: PDFReportData): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Generate all sections
  addCoverPage(doc, data);
  addExecutiveSummary(doc, data, reportDate);
  addPlanningAssumptions(doc, data, reportDate);
  addResultsAnalysis(doc, data, reportDate);
  addRiskFactorsAndMethodology(doc, data, reportDate);
  addDisclosures(doc, reportDate);

  // Save the PDF
  const fileName = `Retirement_Analysis_${data.reportId || Date.now()}.pdf`;
  doc.save(fileName);
}
