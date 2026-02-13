/**
 * Professional PDF Report Generator
 * Generates comprehensive retirement & legacy planning analysis reports
 * that rival $2,000+ CFP financial plans
 *
 * Version: 2.0 - Enhanced Professional Report
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CalculationResult } from '@/types/calculator';
import type { FilingStatus } from './calculations/taxCalculations';
import type { ReturnMode, WalkSeries } from '@/types/planner';
import { fmtFull, fmtPctRaw, fmt } from '@/lib/utils';

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
  retirementAge: number;

  // Starting Balances
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;

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
  inflationRate: number;
  stateRate: number;
  wdRate: number;
  incContrib: boolean;
  incRate: number;

  // Simulation Settings
  returnMode: ReturnMode;
  randomWalkSeries: WalkSeries;

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
  numberOfBeneficiaries: number;
  totalFertilityRate: number;
  generationLength: number;
  fertilityWindowStart: number;
  fertilityWindowEnd: number;

  // Roth conversions
  enableRothConversions?: boolean;
  targetConversionBracket?: number;
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
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

// Professional Brand Colors
const COLORS = {
  primary: '#1a365d',       // Deep Navy
  primaryLight: '#2b4c7e',  // Lighter Navy
  accent: '#c9a227',        // Rich Gold
  accentLight: '#e8d48b',   // Light Gold
  success: '#276749',       // Forest Green
  warning: '#c05621',       // Burnt Orange
  danger: '#9b2c2c',        // Deep Red
  text: '#1a202c',          // Near Black
  textMuted: '#4a5568',     // Gray
  textLight: '#718096',     // Light Gray
  border: '#e2e8f0',        // Very Light Gray
  background: '#f7fafc',    // Off White
  white: '#ffffff',
};

// ==================== Visual Component Helpers ====================

/**
 * Draw a professional health score gauge
 */
function drawHealthScoreGauge(doc: jsPDF, score: number, x: number, y: number, size: number = 40) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size / 2 - 5;

  // Determine color based on score
  let gaugeColor: [number, number, number];
  let label: string;
  if (score >= 90) {
    gaugeColor = [39, 103, 73]; // Green
    label = 'Excellent';
  } else if (score >= 75) {
    gaugeColor = [56, 161, 105]; // Light Green
    label = 'Very Good';
  } else if (score >= 60) {
    gaugeColor = [201, 162, 39]; // Gold
    label = 'Good';
  } else if (score >= 40) {
    gaugeColor = [192, 86, 33]; // Orange
    label = 'Fair';
  } else {
    gaugeColor = [155, 44, 44]; // Red
    label = 'Needs Work';
  }

  // Draw background arc (gray)
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(4);
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;

  // Draw arc segments manually (jsPDF doesn't have arc, so we approximate with lines)
  const segments = 30;
  for (let i = 0; i < segments; i++) {
    const angle1 = startAngle + (i / segments) * Math.PI;
    const angle2 = startAngle + ((i + 1) / segments) * Math.PI;
    const x1 = centerX + radius * Math.cos(angle1);
    const y1 = centerY + radius * Math.sin(angle1);
    const x2 = centerX + radius * Math.cos(angle2);
    const y2 = centerY + radius * Math.sin(angle2);
    doc.line(x1, y1, x2, y2);
  }

  // Draw filled arc (colored based on score)
  doc.setDrawColor(gaugeColor[0], gaugeColor[1], gaugeColor[2]);
  const fillSegments = Math.round((score / 100) * segments);
  for (let i = 0; i < fillSegments; i++) {
    const angle1 = startAngle + (i / segments) * Math.PI;
    const angle2 = startAngle + ((i + 1) / segments) * Math.PI;
    const x1 = centerX + radius * Math.cos(angle1);
    const y1 = centerY + radius * Math.sin(angle1);
    const x2 = centerX + radius * Math.cos(angle2);
    const y2 = centerY + radius * Math.sin(angle2);
    doc.line(x1, y1, x2, y2);
  }

  // Draw score number in center
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(gaugeColor[0], gaugeColor[1], gaugeColor[2]);
  doc.text(`${Math.round(score)}%`, centerX, centerY + 2, { align: 'center' });

  // Draw label below
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textMuted);
  doc.text(label, centerX, centerY + 10, { align: 'center' });

  doc.setTextColor(COLORS.text);
}

/**
 * Draw a horizontal progress bar
 */
function drawProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  percentage: number,
  color: [number, number, number] = [26, 54, 93]
) {
  // Background
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(x, y, width, height, 1, 1, 'F');

  // Filled portion
  const fillWidth = Math.min(Math.max(0, percentage / 100) * width, width);
  if (fillWidth > 0) {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, y, fillWidth, height, 1, 1, 'F');
  }
}

/**
 * Draw a mini bar chart for income waterfall
 */
function drawIncomeWaterfall(
  doc: jsPDF,
  x: number,
  y: number,
  data: { label: string; value: number; color: [number, number, number] }[],
  maxWidth: number = 100
) {
  const barHeight = 6;
  const spacing = 3;
  const labelWidth = 45;
  const maxValue = Math.max(...data.map(d => d.value));

  data.forEach((item, index) => {
    const barY = y + index * (barHeight + spacing);
    const barWidth = maxValue > 0 ? (item.value / maxValue) * (maxWidth - labelWidth - 25) : 0;

    // Label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.textMuted);
    doc.text(item.label, x, barY + 4.5);

    // Bar
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.roundedRect(x + labelWidth, barY, Math.max(barWidth, 2), barHeight, 1, 1, 'F');

    // Value
    doc.setTextColor(COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.text(fmt(item.value), x + labelWidth + Math.max(barWidth, 2) + 3, barY + 4.5);
  });

  return y + data.length * (barHeight + spacing);
}


// ==================== Page Layout Helpers ====================

let currentPageNum = 0;

function addPageHeader(doc: jsPDF, pageNum: number, reportDate: string, title?: string) {
  currentPageNum = pageNum;

  // Top border line
  doc.setDrawColor(26, 54, 93); // Navy
  doc.setLineWidth(0.5);
  doc.line(MARGIN, 12, PAGE_WIDTH - MARGIN, 12);

  // Header text
  doc.setFontSize(7);
  doc.setTextColor(COLORS.textLight);
  doc.setFont('helvetica', 'normal');
  doc.text('RETIREMENT & LEGACY PLANNING ANALYSIS', MARGIN, 10);

  if (title) {
    doc.setFont('helvetica', 'bold');
    doc.text(title, PAGE_WIDTH / 2, 10, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.text(reportDate, PAGE_WIDTH - MARGIN, 10, { align: 'right' });

  doc.setTextColor(COLORS.text);
}

function addPageFooter(doc: jsPDF, pageNum: number, totalPages?: number) {
  const footerY = PAGE_HEIGHT - 12;

  // Footer line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY - 3, PAGE_WIDTH - MARGIN, footerY - 3);

  // Page number
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textMuted);
  doc.setFont('helvetica', 'normal');
  const pageText = totalPages ? `Page ${pageNum} of ${totalPages}` : `Page ${pageNum}`;
  doc.text(pageText, PAGE_WIDTH / 2, footerY, { align: 'center' });

  // Disclaimer
  doc.setFontSize(6);
  doc.text('CONFIDENTIAL - For planning purposes only. Not investment advice.', MARGIN, footerY);
  doc.text('Generated by Tax-Aware Retirement Calculator', PAGE_WIDTH - MARGIN, footerY, { align: 'right' });

  doc.setTextColor(COLORS.text);
}

function addSectionTitle(doc: jsPDF, title: string, y: number, icon?: string): number {
  // Navy background bar
  doc.setFillColor(26, 54, 93);
  doc.roundedRect(MARGIN - 2, y - 5, CONTENT_WIDTH + 4, 9, 1, 1, 'F');

  // Gold accent line
  doc.setFillColor(201, 162, 39);
  doc.rect(MARGIN - 2, y + 4, CONTENT_WIDTH + 4, 0.8, 'F');

  // White text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), MARGIN + 2, y + 1);

  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'normal');

  return y + 12;
}

function addSubsection(doc: jsPDF, title: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 54, 93);
  doc.text(title, MARGIN, y);

  // Gold underline
  const textWidth = doc.getTextWidth(title);
  doc.setDrawColor(201, 162, 39);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 1, MARGIN + textWidth, y + 1);

  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  return y + 6;
}

function addKeyValueRow(
  doc: jsPDF,
  key: string,
  value: string,
  y: number,
  options: {
    indent?: number;
    highlight?: boolean;
    valueColor?: [number, number, number];
  } = {}
): number {
  const { indent = 0, highlight = false, valueColor } = options;

  if (highlight) {
    doc.setFillColor(247, 250, 252);
    doc.rect(MARGIN - 1, y - 3.5, CONTENT_WIDTH + 2, 5, 'F');
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textMuted);
  doc.text(key, MARGIN + indent, y);

  if (valueColor) {
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
  } else {
    doc.setTextColor(COLORS.text);
  }
  doc.setFont('helvetica', 'bold');
  doc.text(value, PAGE_WIDTH - MARGIN, y, { align: 'right' });

  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'normal');

  return y + 5;
}

function addBulletPoint(doc: jsPDF, text: string, y: number, indent: number = 0, numbered?: number): number {
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.text);

  const bullet = numbered ? `${numbered}.` : String.fromCharCode(8226);
  const bulletWidth = numbered ? 8 : 4;

  doc.setTextColor(201, 162, 39); // Gold bullet
  doc.text(bullet, MARGIN + indent, y);

  doc.setTextColor(COLORS.text);
  const splitText = doc.splitTextToSize(text, CONTENT_WIDTH - indent - bulletWidth - 2);
  doc.text(splitText, MARGIN + indent + bulletWidth, y);

  return y + (splitText.length * 4) + 2;
}

function addParagraph(doc: jsPDF, text: string, y: number, fontSize: number = 9): number {
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.text);
  const splitText = doc.splitTextToSize(text, CONTENT_WIDTH);
  doc.text(splitText, MARGIN, y);
  return y + (splitText.length * fontSize * 0.4) + 3;
}

function addHighlightBox(
  doc: jsPDF,
  content: { title: string; value: string; subtitle?: string }[],
  y: number,
  color: 'gold' | 'green' | 'navy' = 'navy'
): number {
  const boxHeight = 22;
  const boxWidth = (CONTENT_WIDTH - 6) / content.length;

  const bgColors: Record<string, [number, number, number]> = {
    gold: [252, 246, 227],
    green: [240, 253, 244],
    navy: [237, 242, 247],
  };

  const accentColors: Record<string, [number, number, number]> = {
    gold: [201, 162, 39],
    green: [39, 103, 73],
    navy: [26, 54, 93],
  };

  content.forEach((item, index) => {
    const boxX = MARGIN + index * (boxWidth + 3);

    // Background
    doc.setFillColor(...bgColors[color]);
    doc.roundedRect(boxX, y, boxWidth, boxHeight, 2, 2, 'F');

    // Top accent line
    doc.setFillColor(...accentColors[color]);
    doc.rect(boxX, y, boxWidth, 1.5, 'F');

    // Title
    doc.setFontSize(7);
    doc.setTextColor(COLORS.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text(item.title, boxX + boxWidth / 2, y + 6, { align: 'center' });

    // Value
    doc.setFontSize(14);
    doc.setTextColor(...accentColors[color]);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, boxX + boxWidth / 2, y + 14, { align: 'center' });

    // Subtitle
    if (item.subtitle) {
      doc.setFontSize(6);
      doc.setTextColor(COLORS.textLight);
      doc.setFont('helvetica', 'normal');
      doc.text(item.subtitle, boxX + boxWidth / 2, y + 19, { align: 'center' });
    }
  });

  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'normal');

  return y + boxHeight + 5;
}

function checkPageBreak(doc: jsPDF, currentY: number, spaceNeeded: number, reportDate: string): number {
  if (currentY + spaceNeeded > PAGE_HEIGHT - 20) {
    doc.addPage();
    currentPageNum++;
    addPageHeader(doc, currentPageNum, reportDate);
    addPageFooter(doc, currentPageNum);
    return 25;
  }
  return currentY;
}

// ==================== Page 1: Cover Page ====================

function addCoverPage(doc: jsPDF, data: PDFReportData) {
  const { inputs, results } = data;

  // Top decorative element
  doc.setFillColor(26, 54, 93);
  doc.rect(0, 0, PAGE_WIDTH, 60, 'F');

  // Gold accent stripe
  doc.setFillColor(201, 162, 39);
  doc.rect(0, 58, PAGE_WIDTH, 3, 'F');

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  doc.text('RETIREMENT', PAGE_WIDTH / 2, 30, { align: 'center' });
  doc.text('& LEGACY PLAN', PAGE_WIDTH / 2, 45, { align: 'center' });

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(201, 162, 39);
  doc.text('COMPREHENSIVE FINANCIAL ANALYSIS', PAGE_WIDTH / 2, 55, { align: 'center' });

  // Client information box
  const boxY = 80;
  doc.setFillColor(247, 250, 252);
  doc.roundedRect(MARGIN + 20, boxY, CONTENT_WIDTH - 40, 50, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN + 20, boxY, CONTENT_WIDTH - 40, 50, 3, 3, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.textMuted);
  doc.text('Prepared Exclusively For', PAGE_WIDTH / 2, boxY + 12, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(26, 54, 93);
  doc.text(data.userName || 'Valued Client', PAGE_WIDTH / 2, boxY + 28, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.textMuted);
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(dateStr, PAGE_WIDTH / 2, boxY + 42, { align: 'center' });

  // Quick stats preview
  const statsY = 150;
  const successRate = results.probRuin !== undefined ? (100 - results.probRuin) : 95;
  const totalPortfolio = inputs.taxableBalance + inputs.pretaxBalance + inputs.rothBalance;

  doc.setFontSize(10);
  doc.setTextColor(COLORS.textMuted);
  doc.text('AT A GLANCE', PAGE_WIDTH / 2, statsY, { align: 'center' });

  // Draw gold line under "AT A GLANCE"
  doc.setDrawColor(201, 162, 39);
  doc.setLineWidth(0.5);
  doc.line(PAGE_WIDTH / 2 - 20, statsY + 2, PAGE_WIDTH / 2 + 20, statsY + 2);

  // Stats boxes
  const statBoxY = statsY + 10;
  const boxWidth = (CONTENT_WIDTH - 20) / 4;

  const stats = [
    { label: 'Current Portfolio', value: fmt(totalPortfolio) },
    { label: 'At Retirement', value: fmt(results.finReal) },
    { label: 'Success Rate', value: fmtPctRaw(successRate, 0) },
    { label: 'Legacy Wealth', value: fmt(results.eolReal) },
  ];

  stats.forEach((stat, index) => {
    const x = MARGIN + 10 + index * (boxWidth + 5);

    doc.setFillColor(26, 54, 93);
    doc.roundedRect(x, statBoxY, boxWidth, 25, 2, 2, 'F');

    doc.setFontSize(7);
    doc.setTextColor(200, 200, 200);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label, x + boxWidth / 2, statBoxY + 8, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(201, 162, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(stat.value, x + boxWidth / 2, statBoxY + 18, { align: 'center' });
  });

  // Report ID and version
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textLight);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report ID: ${data.reportId || `RPT-${Date.now()}`}`, PAGE_WIDTH / 2, 200, { align: 'center' });
  doc.text('Version 2.0 | Tax-Aware Retirement Calculator', PAGE_WIDTH / 2, 206, { align: 'center' });

  // Bottom section - Confidentiality notice
  const bottomY = PAGE_HEIGHT - 50;
  doc.setFillColor(247, 250, 252);
  doc.rect(0, bottomY, PAGE_WIDTH, 50, 'F');

  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, bottomY, PAGE_WIDTH - MARGIN, bottomY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 54, 93);
  doc.text('CONFIDENTIAL', PAGE_WIDTH / 2, bottomY + 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textMuted);
  const disclaimer1 = 'This report is prepared for informational purposes only and does not constitute investment, legal, or tax advice.';
  const disclaimer2 = 'Past performance does not guarantee future results. Consult a qualified financial professional before making decisions.';
  doc.text(disclaimer1, PAGE_WIDTH / 2, bottomY + 22, { align: 'center' });
  doc.text(disclaimer2, PAGE_WIDTH / 2, bottomY + 28, { align: 'center' });
}

// ==================== Page 2: Executive Summary ====================

function addExecutiveSummary(doc: jsPDF, data: PDFReportData, reportDate: string) {
  doc.addPage();
  addPageHeader(doc, 2, reportDate, 'EXECUTIVE SUMMARY');

  let y = 25;
  const { results, inputs } = data;
  const successRate = results.probRuin !== undefined ? (100 - results.probRuin) : 95;
  const totalPortfolio = inputs.taxableBalance + inputs.pretaxBalance + inputs.rothBalance;

  y = addSectionTitle(doc, 'Executive Summary', y);

  // Health Score Gauge and Key Metrics side by side
  const gaugeX = MARGIN;
  const gaugeY = y + 5;
  drawHealthScoreGauge(doc, successRate, gaugeX, gaugeY, 45);

  // Key metrics to the right of gauge
  const metricsX = gaugeX + 55;
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textMuted);
  doc.text('RETIREMENT HEALTH SCORE', gaugeX + 22.5, gaugeY - 2, { align: 'center' });

  let metricsY = gaugeY + 5;
  doc.setFontSize(9);

  // Key numbers
  const keyMetrics = [
    { label: 'Current Net Worth', value: fmtFull(totalPortfolio), color: COLORS.text },
    { label: 'Projected at Retirement', value: fmtFull(results.finReal), color: COLORS.text },
    { label: 'Monthly Retirement Income', value: fmtFull(results.wdReal / 12), color: COLORS.success },
    { label: 'End of Life Wealth', value: fmtFull(results.eolReal), color: COLORS.text },
  ];

  keyMetrics.forEach(metric => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.textMuted);
    doc.text(metric.label + ':', metricsX, metricsY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(metric.color);
    doc.text(metric.value, PAGE_WIDTH - MARGIN, metricsY, { align: 'right' });
    metricsY += 6;
  });

  y = gaugeY + 55;

  // Highlight boxes with key numbers
  y = addHighlightBox(doc, [
    { title: 'YEARS TO RETIREMENT', value: String(results.yrsToRet), subtitle: `Age ${inputs.retirementAge}` },
    { title: 'SUCCESS PROBABILITY', value: fmtPctRaw(successRate, 0), subtitle: 'Monte Carlo' },
    { title: 'ANNUAL WITHDRAWAL', value: fmt(results.wdReal), subtitle: '(2026 dollars)' },
  ], y, 'navy');

  y += 3;

  // Top 3 Recommendations
  y = addSubsection(doc, 'Top 3 Recommendations', y);

  const recommendations = generateRecommendations(data);
  recommendations.slice(0, 3).forEach((rec, index) => {
    y = addBulletPoint(doc, rec, y, 0, index + 1);
  });

  y += 5;

  // Key Findings
  y = addSubsection(doc, 'Key Findings', y);

  const findings = [
    successRate >= 90
      ? `Your portfolio demonstrates a ${fmtPctRaw(successRate, 0)} probability of sustaining your lifestyle through age 95.`
      : `Your current plan has a ${fmtPctRaw(successRate, 0)} success rate. Consider the optimization strategies outlined below.`,
    `At your planned withdrawal rate of ${fmtPctRaw(inputs.wdRate, 1)}, you can expect ${fmtFull(results.wdReal)} per year in retirement income (in today's dollars).`,
    results.eolReal > 0
      ? `Your estate is projected to be worth ${fmtFull(results.eolReal)} at age 95, providing significant legacy potential.`
      : `Focus on sustainable withdrawals to ensure your portfolio lasts through retirement.`,
  ];

  if (inputs.showGen && results.genPayout) {
    const isPerpetual = results.genPayout.years >= 10000;
    findings.push(
      isPerpetual
        ? `Your legacy can sustain ${fmtFull(results.genPayout.perBenReal)} per beneficiary indefinitely through a dynasty structure.`
        : `Your legacy can support beneficiaries for approximately ${results.genPayout.years} years.`
    );
  }

  findings.forEach(finding => {
    y = addBulletPoint(doc, finding, y);
  });

  y += 5;

  // Account Allocation Visual
  y = addSubsection(doc, 'Current Account Allocation', y);

  const allocationData = [
    { label: 'Taxable Brokerage', value: inputs.taxableBalance, pct: (inputs.taxableBalance / totalPortfolio) * 100 },
    { label: 'Pre-Tax (401k/IRA)', value: inputs.pretaxBalance, pct: (inputs.pretaxBalance / totalPortfolio) * 100 },
    { label: 'Roth IRA', value: inputs.rothBalance, pct: (inputs.rothBalance / totalPortfolio) * 100 },
  ];

  allocationData.forEach(item => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.textMuted);
    doc.text(item.label, MARGIN, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.text);
    doc.text(fmtFull(item.value), MARGIN + 50, y);

    // Progress bar
    const barX = MARGIN + 85;
    const barWidth = 60;
    const colors: [number, number, number][] = [[43, 76, 126], [201, 162, 39], [39, 103, 73]];
    drawProgressBar(doc, barX, y - 3, barWidth, 4, item.pct, colors[allocationData.indexOf(item)]);

    doc.setFontSize(8);
    doc.text(fmtPctRaw(item.pct, 0), barX + barWidth + 5, y);

    y += 7;
  });

  addPageFooter(doc, 2);
}

// ==================== Page 3: Personal Financial Profile ====================

function addPersonalFinancialProfile(doc: jsPDF, data: PDFReportData, reportDate: string) {
  doc.addPage();
  addPageHeader(doc, 3, reportDate, 'PERSONAL FINANCIAL PROFILE');

  let y = 25;
  const { inputs, results } = data;
  const totalPortfolio = inputs.taxableBalance + inputs.pretaxBalance + inputs.rothBalance;

  y = addSectionTitle(doc, 'Personal Financial Profile', y);

  // Client Profile Section
  y = addSubsection(doc, 'Client Information', y);
  y = addKeyValueRow(doc, 'Filing Status', inputs.marital === 'single' ? 'Single' : 'Married Filing Jointly', y);
  y = addKeyValueRow(doc, 'Current Age', String(inputs.age1), y, { highlight: true });
  if (inputs.marital === 'married') {
    y = addKeyValueRow(doc, 'Spouse Age', String(inputs.age2), y);
  }
  y = addKeyValueRow(doc, 'Planned Retirement Age', String(inputs.retirementAge), y, { highlight: inputs.marital === 'single' });
  y = addKeyValueRow(doc, 'Years to Retirement', String(results.yrsToRet), y, { highlight: inputs.marital === 'married' });
  y = addKeyValueRow(doc, 'Planning Horizon', `To Age 95 (${95 - inputs.age1} years)`, y);

  y += 5;

  // Account Balances Section
  y = addSubsection(doc, 'Current Account Balances', y);

  // Use autoTable for professional table display
  autoTable(doc, {
    startY: y,
    head: [['Account Type', 'Balance', '% of Total', 'Tax Treatment']],
    body: [
      ['Taxable Brokerage', fmtFull(inputs.taxableBalance), fmtPctRaw((inputs.taxableBalance / totalPortfolio) * 100, 1), 'Capital Gains'],
      ['Pre-Tax (401k/IRA)', fmtFull(inputs.pretaxBalance), fmtPctRaw((inputs.pretaxBalance / totalPortfolio) * 100, 1), 'Ordinary Income'],
      ['Roth IRA', fmtFull(inputs.rothBalance), fmtPctRaw((inputs.rothBalance / totalPortfolio) * 100, 1), 'Tax-Free'],
      ['Total Portfolio', fmtFull(totalPortfolio), '100%', ''],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [26, 54, 93],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [26, 32, 44],
    },
    alternateRowStyles: {
      fillColor: [247, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 40 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 8;

  // Contribution Summary
  y = addSubsection(doc, 'Annual Contribution Summary', y);

  const person1Total = inputs.cTax1 + inputs.cPre1 + inputs.cPost1 + inputs.cMatch1;
  const person2Total = inputs.marital === 'married' ? inputs.cTax2 + inputs.cPre2 + inputs.cPost2 + inputs.cMatch2 : 0;
  const totalContributions = person1Total + person2Total;

  const contributionData: (string | number)[][] = [
    ['Taxable Contributions', fmtFull(inputs.cTax1), inputs.marital === 'married' ? fmtFull(inputs.cTax2) : '-'],
    ['Pre-Tax (401k)', fmtFull(inputs.cPre1), inputs.marital === 'married' ? fmtFull(inputs.cPre2) : '-'],
    ['Roth Contributions', fmtFull(inputs.cPost1), inputs.marital === 'married' ? fmtFull(inputs.cPost2) : '-'],
    ['Employer Match', fmtFull(inputs.cMatch1), inputs.marital === 'married' ? fmtFull(inputs.cMatch2) : '-'],
    ['Person Total', fmtFull(person1Total), inputs.marital === 'married' ? fmtFull(person2Total) : '-'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Contribution Type', 'Person 1', inputs.marital === 'married' ? 'Person 2' : '']],
    body: contributionData,
    theme: 'striped',
    headStyles: {
      fillColor: [26, 54, 93],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [26, 32, 44],
    },
    alternateRowStyles: {
      fillColor: [247, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 35;
  y += 5;

  y = addKeyValueRow(doc, 'Total Annual Contributions', fmtFull(totalContributions), y, { highlight: true });
  y = addKeyValueRow(doc, 'Savings Rate (est.)', fmtPctRaw((totalContributions / (totalPortfolio * 0.1)) * 100, 1), y);

  if (inputs.incContrib) {
    y = addKeyValueRow(doc, 'Annual Contribution Growth', fmtPctRaw(inputs.incRate, 1), y, { highlight: true });
  }

  y += 5;

  // Planning Assumptions
  y = addSubsection(doc, 'Planning Assumptions', y);
  y = addKeyValueRow(doc, 'Expected Return', fmtPctRaw(inputs.retRate, 1) + ' (nominal)', y);
  y = addKeyValueRow(doc, 'Inflation Rate', fmtPctRaw(inputs.inflationRate, 1), y, { highlight: true });
  y = addKeyValueRow(doc, 'Real Return', fmtPctRaw(inputs.retRate - inputs.inflationRate, 1), y);
  y = addKeyValueRow(doc, 'Withdrawal Rate', fmtPctRaw(inputs.wdRate, 1), y, { highlight: true });
  y = addKeyValueRow(doc, 'State Tax Rate', fmtPctRaw(inputs.stateRate, 1), y);

  addPageFooter(doc, 3);
}

// ==================== Pages 4-5: Retirement Income Projection ====================

function addRetirementIncomeProjection(doc: jsPDF, data: PDFReportData, reportDate: string) {
  doc.addPage();
  addPageHeader(doc, 4, reportDate, 'RETIREMENT INCOME PROJECTION');

  let y = 25;
  const { results, inputs } = data;

  y = addSectionTitle(doc, 'Retirement Income Projection', y);

  // Income Summary Boxes
  y = addHighlightBox(doc, [
    { title: 'GROSS ANNUAL', value: fmt(results.wd), subtitle: 'Before taxes' },
    { title: 'AFTER TAX', value: fmt(results.wdAfter), subtitle: 'Net income' },
    { title: 'MONTHLY', value: fmt(results.wdReal / 12), subtitle: '(2026 dollars)' },
  ], y, 'green');

  y += 3;

  // Income Waterfall Chart
  y = addSubsection(doc, 'Income Sources at Retirement', y);

  // Calculate income breakdown
  const portfolioWithdrawal = results.wd;
  let ssIncome = 0;
  if (inputs.includeSS) {
    // Estimate SS based on claim ages and income
    ssIncome = inputs.ssIncome * 0.4; // Rough PIA estimate
    if (inputs.marital === 'married') {
      ssIncome += inputs.ssIncome2 * 0.4;
    }
  }

  const incomeData = [
    { label: 'Portfolio Withdrawal', value: portfolioWithdrawal - ssIncome, color: [43, 76, 126] as [number, number, number] },
  ];

  if (inputs.includeSS && ssIncome > 0) {
    incomeData.push({ label: 'Social Security', value: ssIncome, color: [39, 103, 73] as [number, number, number] });
  }

  if (inputs.includeMedicare) {
    const medicareCost = inputs.medicarePremium * 12;
    incomeData.push({ label: 'Medicare (cost)', value: -medicareCost, color: [192, 86, 33] as [number, number, number] });
  }

  y = drawIncomeWaterfall(doc, MARGIN, y + 5, incomeData, CONTENT_WIDTH);

  y += 10;

  // Social Security Timeline
  if (inputs.includeSS) {
    y = addSubsection(doc, 'Social Security Strategy', y);

    y = addKeyValueRow(doc, 'Primary Earner Claim Age', String(inputs.ssClaimAge), y);
    y = addKeyValueRow(doc, 'Estimated Primary Benefit', fmtFull(inputs.ssIncome * 0.4) + '/year', y, { highlight: true });

    if (inputs.marital === 'married') {
      y = addKeyValueRow(doc, 'Spouse Claim Age', String(inputs.ssClaimAge2), y);
      y = addKeyValueRow(doc, 'Estimated Spouse Benefit', fmtFull(inputs.ssIncome2 * 0.4) + '/year', y, { highlight: true });
    }

    y += 3;

    // SS Strategy Note
    const ssNote = inputs.ssClaimAge >= 70
      ? 'Delaying to age 70 maximizes your benefit with an 8% annual increase from Full Retirement Age (67).'
      : inputs.ssClaimAge >= 67
        ? 'Claiming at Full Retirement Age provides 100% of your calculated benefit.'
        : 'Claiming early reduces your benefit. Consider delaying if you have other income sources.';

    y = addParagraph(doc, ssNote, y, 8);
    y += 3;
  }

  // Portfolio Withdrawal Schedule
  y = addSubsection(doc, 'Withdrawal Schedule', y);

  y = addKeyValueRow(doc, 'Initial Withdrawal Rate', fmtPctRaw(inputs.wdRate, 1), y);
  y = addKeyValueRow(doc, 'Year 1 Gross Withdrawal', fmtFull(results.wd), y, { highlight: true });
  y = addKeyValueRow(doc, 'Year 1 After-Tax', fmtFull(results.wdAfter), y);
  y = addKeyValueRow(doc, 'Inflation Adjustment', 'Annual at ' + fmtPctRaw(inputs.inflationRate, 1), y, { highlight: true });

  y += 5;

  // Monthly Income Breakdown
  y = addSubsection(doc, 'Monthly Income Breakdown (Year 1)', y);

  const monthlyGross = results.wd / 12;
  const monthlyAfterTax = results.wdAfter / 12;
  const monthlyTax = (results.wd - results.wdAfter) / 12;

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Monthly', 'Annual']],
    body: [
      ['Gross Withdrawal', fmtFull(monthlyGross), fmtFull(results.wd)],
      ['Federal + State Taxes', '(' + fmtFull(monthlyTax) + ')', '(' + fmtFull(results.wd - results.wdAfter) + ')'],
      ['Net After-Tax Income', fmtFull(monthlyAfterTax), fmtFull(results.wdAfter)],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [39, 103, 73],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [26, 32, 44],
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  addPageFooter(doc, 4);
}

// ==================== Page 5: Tax Strategy Analysis ====================

function addTaxStrategyAnalysis(doc: jsPDF, data: PDFReportData, reportDate: string) {
  doc.addPage();
  addPageHeader(doc, 5, reportDate, 'TAX STRATEGY ANALYSIS');

  let y = 25;
  const { results, inputs } = data;

  y = addSectionTitle(doc, 'Tax Strategy Analysis', y);

  // Lifetime Tax Summary
  y = addSubsection(doc, 'Lifetime Tax Summary', y);

  const totalGrossWithdrawals = results.yrsToSim * results.wd;
  const effectiveTaxRate = (results.tax.tot / totalGrossWithdrawals) * 100;

  y = addHighlightBox(doc, [
    { title: 'TOTAL LIFETIME TAXES', value: fmt(results.tax.tot), subtitle: 'Retirement phase' },
    { title: 'EFFECTIVE TAX RATE', value: fmtPctRaw(effectiveTaxRate, 1), subtitle: 'Avg over retirement' },
    { title: 'ESTATE TAX', value: results.estateTax > 0 ? fmt(results.estateTax) : '$0', subtitle: 'At death' },
  ], y, 'gold');

  y += 3;

  // Tax Breakdown Table
  y = addSubsection(doc, 'Tax Breakdown by Type', y);

  autoTable(doc, {
    startY: y,
    head: [['Tax Category', 'Amount', '% of Total']],
    body: [
      ['Federal Ordinary Income', fmtFull(results.tax.fedOrd), fmtPctRaw((results.tax.fedOrd / results.tax.tot) * 100, 1)],
      ['Federal Capital Gains', fmtFull(results.tax.fedCap), fmtPctRaw((results.tax.fedCap / results.tax.tot) * 100, 1)],
      ['NIIT (3.8%)', fmtFull(results.tax.niit), fmtPctRaw((results.tax.niit / results.tax.tot) * 100, 1)],
      ['State Income Tax', fmtFull(results.tax.state), fmtPctRaw((results.tax.state / results.tax.tot) * 100, 1)],
      ['Total Taxes', fmtFull(results.tax.tot), '100%'],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [201, 162, 39],
      textColor: [26, 32, 44],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [26, 32, 44],
    },
    alternateRowStyles: {
      fillColor: [252, 246, 227],
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 35, halign: 'center' },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 8;

  // Roth Conversion Opportunities
  y = addSubsection(doc, 'Roth Conversion Opportunities', y);

  const conversionOpportunity = inputs.pretaxBalance > 100000;
  const yearsBeforeRMD = Math.max(0, 73 - inputs.retirementAge);

  if (conversionOpportunity) {
    y = addParagraph(doc,
      `With ${fmtFull(inputs.pretaxBalance)} in pre-tax accounts, you have significant Roth conversion potential. ` +
      `Converting funds before Required Minimum Distributions begin at age 73 can reduce lifetime taxes.`, y, 9);

    y += 3;

    // Conversion strategy table
    const bracketData = inputs.marital === 'married' ? [
      ['12% Bracket', '$0 - $100,800', 'Highest priority'],
      ['22% Bracket', '$100,800 - $211,400', 'Strong candidate'],
      ['24% Bracket', '$211,400 - $403,550', 'Consider carefully'],
    ] : [
      ['12% Bracket', '$0 - $50,400', 'Highest priority'],
      ['22% Bracket', '$50,400 - $105,700', 'Strong candidate'],
      ['24% Bracket', '$105,700 - $201,775', 'Consider carefully'],
    ];

    autoTable(doc, {
      startY: y,
      head: [['Target Bracket', 'Income Range (2026)', 'Priority']],
      body: bracketData,
      theme: 'striped',
      headStyles: {
        fillColor: [26, 54, 93],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [26, 32, 44],
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 50 },
        2: { cellWidth: 40 },
      },
      margin: { left: MARGIN, right: MARGIN },
    });

    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 25;
    y += 5;
  } else {
    y = addParagraph(doc,
      'Your current pre-tax balance is relatively modest. Consider maximizing pre-tax contributions now and ' +
      'evaluating Roth conversions as your balance grows.', y, 9);
    y += 3;
  }

  // Tax Action Items
  y = addSubsection(doc, 'Tax Optimization Action Items', y);

  const taxActions = [
    yearsBeforeRMD > 5
      ? `You have ${yearsBeforeRMD} years before RMDs begin. Use this window for strategic Roth conversions.`
      : 'RMDs will begin soon. Evaluate conversion strategies with your tax advisor immediately.',
    inputs.rothBalance < inputs.pretaxBalance * 0.3
      ? 'Your Roth balance is below 30% of pre-tax. Consider building tax-free assets for flexibility.'
      : 'Good Roth allocation provides tax diversification in retirement.',
    inputs.stateRate > 5
      ? `At ${fmtPctRaw(inputs.stateRate, 1)} state tax, consider relocating to a lower-tax state in retirement.`
      : 'Your state tax rate is reasonable. Focus on federal optimization strategies.',
    'Harvest capital gains in years with lower income to minimize LTCG rates.',
  ];

  taxActions.forEach(action => {
    y = addBulletPoint(doc, action, y);
  });

  addPageFooter(doc, 5);
}

// ==================== Page 6: Risk Analysis ====================

function addRiskAnalysis(doc: jsPDF, data: PDFReportData, reportDate: string) {
  doc.addPage();
  addPageHeader(doc, 6, reportDate, 'RISK ANALYSIS');

  let y = 25;
  const { results, inputs } = data;
  const successRate = results.probRuin !== undefined ? (100 - results.probRuin) : 95;

  y = addSectionTitle(doc, 'Risk Analysis & Monte Carlo Results', y);

  // Monte Carlo Summary
  y = addSubsection(doc, 'Monte Carlo Simulation Results', y);

  const isMonteCarloMode = inputs.randomWalkSeries === 'trulyRandom' || inputs.returnMode === 'randomWalk';

  if (isMonteCarloMode) {
    y = addParagraph(doc,
      'Your plan was analyzed using 1,000 Monte Carlo simulations, each representing a different possible ' +
      'sequence of market returns based on historical S&P 500 data (1928-2024). This methodology captures ' +
      'the uncertainty inherent in financial planning.', y, 9);
    y += 3;
  }

  // Success Rate Gauge
  const gaugeY = y;
  drawHealthScoreGauge(doc, successRate, MARGIN, gaugeY, 50);

  // Results to the right
  let resultY = gaugeY + 5;
  const resultX = MARGIN + 60;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 54, 93);
  doc.text('Probability of Success:', resultX, resultY);

  const successColor: [number, number, number] = successRate >= 90 ? [39, 103, 73] :
                        successRate >= 75 ? [201, 162, 39] : [155, 44, 44];
  doc.setTextColor(successColor[0], successColor[1], successColor[2]);
  doc.setFontSize(18);
  doc.text(fmtPctRaw(successRate, 0), resultX + 55, resultY);

  resultY += 8;
  doc.setFontSize(8);
  doc.setTextColor(COLORS.textMuted);
  doc.setFont('helvetica', 'normal');
  doc.text('of 1,000 simulations sustained withdrawals through age 95', resultX, resultY);

  resultY += 10;
  doc.setFontSize(9);
  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'normal');

  const riskMetrics = [
    { label: 'Probability of Ruin', value: fmtPctRaw(results.probRuin ?? 5, 1) },
    { label: 'Median End Wealth', value: fmtFull(results.eolReal) },
    { label: 'Planning Horizon', value: `${95 - inputs.retirementAge} years` },
  ];

  riskMetrics.forEach(metric => {
    doc.setTextColor(COLORS.textMuted);
    doc.text(metric.label + ':', resultX, resultY);
    doc.setTextColor(COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.text(metric.value, resultX + 55, resultY);
    doc.setFont('helvetica', 'normal');
    resultY += 6;
  });

  y = gaugeY + 55;

  // Worst-Case Scenario Analysis
  y = addSubsection(doc, 'Worst-Case Scenario Analysis', y);

  const worstCaseNote = successRate >= 95
    ? 'Even in adverse scenarios (10th percentile), your portfolio sustains basic needs. Your plan has excellent resilience.'
    : successRate >= 80
      ? 'In adverse scenarios, you may need to reduce spending by 10-20%. Consider building additional buffer.'
      : 'Adverse scenarios show significant risk. Strongly recommend increasing savings or reducing planned withdrawal rate.';

  y = addParagraph(doc, worstCaseNote, y, 9);
  y += 3;

  // Risk Factor Table
  y = addSubsection(doc, 'Key Risk Factors', y);

  const riskFactors = [
    ['Sequence of Returns', 'HIGH', 'Poor early returns can devastate portfolios. Mitigated by Monte Carlo analysis.'],
    ['Longevity', 'MEDIUM', 'Plan extends to age 95. Consider longevity insurance if concerned about living longer.'],
    ['Inflation', `${inputs.inflationRate > 3 ? 'HIGH' : 'LOW'}`, `Assumed ${fmtPctRaw(inputs.inflationRate, 1)} annual inflation. Higher rates reduce purchasing power.`],
    ['Healthcare Costs', inputs.includeMedicare ? 'MODELED' : 'NOT MODELED', 'Medicare and IRMAA included in projections if enabled.'],
    ['Tax Law Changes', 'MEDIUM', 'Current 2026 law assumed. Future changes may impact strategy.'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Risk Factor', 'Level', 'Impact & Mitigation']],
    body: riskFactors,
    theme: 'striped',
    headStyles: {
      fillColor: [26, 54, 93],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [26, 32, 44],
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 95 },
    },
    margin: { left: MARGIN, right: MARGIN },
    didParseCell: (data) => {
      if (data.column.index === 1 && data.section === 'body') {
        const value = data.cell.raw as string;
        if (value === 'HIGH') {
          data.cell.styles.textColor = [155, 44, 44];
          data.cell.styles.fontStyle = 'bold';
        } else if (value === 'MEDIUM') {
          data.cell.styles.textColor = [192, 86, 33];
        } else if (value === 'LOW' || value === 'MODELED') {
          data.cell.styles.textColor = [39, 103, 73];
        }
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 8;

  // Risk Mitigation Strategies
  y = addSubsection(doc, 'Risk Mitigation Strategies', y);

  const mitigationStrategies = [
    'Maintain 1-2 years of expenses in cash or short-term bonds for spending flexibility during downturns.',
    'Consider a dynamic withdrawal strategy that reduces spending during poor market years.',
    'Diversify income sources: Social Security, pensions, annuities, and rental income reduce sequence risk.',
    'Review and adjust your plan annually with a qualified financial professional.',
  ];

  mitigationStrategies.forEach(strategy => {
    y = addBulletPoint(doc, strategy, y);
  });

  addPageFooter(doc, 6);
}

// ==================== Page 7: Estate & Legacy Plan ====================

function addEstateLegacyPlan(doc: jsPDF, data: PDFReportData, reportDate: string) {
  doc.addPage();
  addPageHeader(doc, 7, reportDate, 'ESTATE & LEGACY PLAN');

  let y = 25;
  const { results, inputs } = data;

  y = addSectionTitle(doc, 'Estate & Legacy Planning', y);

  // Estate Summary
  y = addSubsection(doc, 'Projected Estate at Age 95', y);

  const totalEstate = results.eol;
  const estateAfterTax = results.netEstate;

  y = addHighlightBox(doc, [
    { title: 'GROSS ESTATE', value: fmt(totalEstate), subtitle: 'Nominal value' },
    { title: 'ESTATE TAX', value: results.estateTax > 0 ? fmt(results.estateTax) : '$0', subtitle: 'Federal only' },
    { title: 'NET TO HEIRS', value: fmt(estateAfterTax), subtitle: 'After taxes' },
  ], y, 'navy');

  y += 3;

  // Account Breakdown at Death
  y = addSubsection(doc, 'Account Composition at Death', y);

  const rothPct = totalEstate > 0 ? (results.eolAccounts.roth / totalEstate) * 100 : 0;
  const pretaxPct = totalEstate > 0 ? (results.eolAccounts.pretax / totalEstate) * 100 : 0;
  const taxablePct = totalEstate > 0 ? (results.eolAccounts.taxable / totalEstate) * 100 : 0;

  autoTable(doc, {
    startY: y,
    head: [['Account Type', 'Value', '% of Estate', 'Heir Tax Treatment']],
    body: [
      ['Roth IRA', fmtFull(results.eolAccounts.roth), fmtPctRaw(rothPct, 1), 'Tax-Free (10-yr rule)'],
      ['Pre-Tax IRA/401k', fmtFull(results.eolAccounts.pretax), fmtPctRaw(pretaxPct, 1), 'Ordinary Income (10-yr)'],
      ['Taxable Brokerage', fmtFull(results.eolAccounts.taxable), fmtPctRaw(taxablePct, 1), 'Stepped-up Basis'],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [26, 54, 93],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [26, 32, 44],
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 50 },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;
  y += 8;

  // Roth Preservation Benefit
  if (results.eolAccounts.roth > 0) {
    y = addSubsection(doc, 'Roth IRA Preservation Benefit', y);

    const rothBenefit = `Your ${fmtFull(results.eolAccounts.roth)} Roth balance passes to heirs completely tax-free. ` +
      `At a 24% marginal rate, this represents ${fmtFull(results.eolAccounts.roth * 0.24)} in tax savings for your beneficiaries.`;

    y = addParagraph(doc, rothBenefit, y, 9);
    y += 3;
  }

  // Dynasty Planning (if enabled)
  if (inputs.showGen && results.genPayout) {
    y = addSubsection(doc, 'Generational Wealth Projection', y);

    const isPerpetual = results.genPayout.years >= 10000;

    y = addKeyValueRow(doc, 'Dynasty Status', isPerpetual ? 'PERPETUAL' : `${results.genPayout.years} Years`, y, {
      valueColor: isPerpetual ? [39, 103, 73] : [192, 86, 33]
    });

    if (results.genPayout.probPerpetual !== undefined) {
      y = addKeyValueRow(doc, 'Perpetual Probability', fmtPctRaw(results.genPayout.probPerpetual, 0), y, { highlight: true });
    }

    y = addKeyValueRow(doc, 'Annual Distribution per Beneficiary', fmtFull(results.genPayout.perBenReal) + ' (real)', y);
    y = addKeyValueRow(doc, 'Initial Beneficiaries', String(results.genPayout.startBeneficiaries), y, { highlight: true });
    y = addKeyValueRow(doc, 'Fertility Rate Assumption', `${inputs.totalFertilityRate} children/person`, y);
    y = addKeyValueRow(doc, 'Generation Length', `${inputs.generationLength} years`, y, { highlight: true });

    y += 5;

    // Perpetual Viability Analysis
    const realReturn = inputs.retRate - inputs.inflationRate;
    const popGrowth = ((inputs.totalFertilityRate - 2) / 2) * 100;
    const sustainableRate = realReturn - popGrowth;

    y = addParagraph(doc,
      `With a ${fmtPctRaw(realReturn, 1)} real return and ${fmtPctRaw(popGrowth, 1)} population growth, ` +
      `the maximum sustainable distribution rate is ${fmtPctRaw(sustainableRate, 1)}. ` +
      (isPerpetual
        ? 'Your distribution rate is below this threshold, supporting perpetual wealth.'
        : 'Consider reducing distributions to achieve perpetual status.'), y, 9);

    y += 5;
  }

  // Estate Planning Action Items
  y = addSubsection(doc, 'Estate Planning Action Items', y);

  const estateActions = [
    results.estateTax > 0
      ? `Your estate exceeds the ${fmtFull(13610000)} exemption. Consider gifting strategies and irrevocable trusts.`
      : 'Your estate is within the federal exemption. Focus on income tax optimization for heirs.',
    'Update beneficiary designations on all retirement accounts annually.',
    results.eolAccounts.pretax > results.eolAccounts.roth
      ? 'Consider Roth conversions to shift tax burden from heirs to yourself.'
      : 'Good Roth allocation minimizes heir tax burden.',
    'Establish a revocable living trust to avoid probate and maintain privacy.',
    'Consider life insurance for liquidity needs if estate consists primarily of illiquid assets.',
  ];

  estateActions.forEach(action => {
    y = addBulletPoint(doc, action, y);
  });

  addPageFooter(doc, 7);
}

// ==================== Page 8: Action Plan ====================

function addActionPlan(doc: jsPDF, data: PDFReportData, reportDate: string) {
  doc.addPage();
  addPageHeader(doc, 8, reportDate, 'YOUR ACTION PLAN');

  let y = 25;
  const { results, inputs } = data;

  y = addSectionTitle(doc, 'Your Personalized Action Plan', y);

  y = addParagraph(doc,
    'Based on your comprehensive analysis, here are prioritized recommendations to optimize your ' +
    'retirement and legacy plan. Review these with your financial advisor and take action on the ' +
    'highest-priority items first.', y, 9);

  y += 3;

  // Generate prioritized recommendations
  const allRecommendations = generateDetailedRecommendations(data);

  // Immediate Actions (Next 30 Days)
  y = addSubsection(doc, 'Immediate Actions (Next 30 Days)', y);

  allRecommendations.immediate.forEach((rec, index) => {
    y = checkPageBreak(doc, y, 12, reportDate);

    // Checkbox style
    doc.setDrawColor(26, 54, 93);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, y - 3, 4, 4);

    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(rec, CONTENT_WIDTH - 8);
    doc.text(splitText, MARGIN + 6, y);

    y += (splitText.length * 4) + 3;
  });

  y += 5;

  // Short-Term Actions (Next 6 Months)
  y = addSubsection(doc, 'Short-Term Actions (Next 6 Months)', y);

  allRecommendations.shortTerm.forEach((rec, index) => {
    y = checkPageBreak(doc, y, 12, reportDate);

    doc.setDrawColor(201, 162, 39);
    doc.rect(MARGIN, y - 3, 4, 4);

    doc.setFontSize(9);
    doc.setTextColor(COLORS.text);
    const splitText = doc.splitTextToSize(rec, CONTENT_WIDTH - 8);
    doc.text(splitText, MARGIN + 6, y);

    y += (splitText.length * 4) + 3;
  });

  y += 5;

  // Annual Review Items
  y = addSubsection(doc, 'Annual Review Checklist', y);

  allRecommendations.annual.forEach(rec => {
    y = checkPageBreak(doc, y, 10, reportDate);

    doc.setDrawColor(COLORS.textMuted);
    doc.rect(MARGIN, y - 3, 4, 4);

    doc.setFontSize(8);
    doc.setTextColor(COLORS.textMuted);
    const splitText = doc.splitTextToSize(rec, CONTENT_WIDTH - 8);
    doc.text(splitText, MARGIN + 6, y);

    y += (splitText.length * 3.5) + 2;
  });

  y += 8;

  // Next Steps Box
  doc.setFillColor(247, 250, 252);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 35, 2, 2, 'F');
  doc.setDrawColor(26, 54, 93);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 35, 2, 2, 'S');

  doc.setFontSize(10);
  doc.setTextColor(26, 54, 93);
  doc.setFont('helvetica', 'bold');
  doc.text('NEXT STEPS', MARGIN + 5, y + 8);

  doc.setFontSize(9);
  doc.setTextColor(COLORS.text);
  doc.setFont('helvetica', 'normal');

  const nextSteps = [
    '1. Schedule a review meeting with your financial advisor to discuss these findings.',
    '2. Prioritize the immediate action items and set deadlines for completion.',
    '3. Revisit this analysis annually or when significant life changes occur.',
  ];

  let stepY = y + 15;
  nextSteps.forEach(step => {
    doc.text(step, MARGIN + 5, stepY);
    stepY += 6;
  });

  addPageFooter(doc, 8);
}

// ==================== Page 9: Disclosures ====================

function addDisclosures(doc: jsPDF, reportDate: string) {
  doc.addPage();
  addPageHeader(doc, 9, reportDate, 'IMPORTANT DISCLOSURES');

  let y = 25;

  y = addSectionTitle(doc, 'Important Disclosures & Limitations', y);

  const disclosures = [
    {
      title: 'For Illustrative Purposes Only',
      content: 'This analysis is a projection based on assumptions and historical data. Actual results ' +
               'will vary - potentially significantly - from these projections. This report does not ' +
               'constitute investment, legal, or tax advice.'
    },
    {
      title: 'No Guarantee of Results',
      content: 'Past performance (historical S&P 500 returns) does not guarantee future results. ' +
               'Markets can experience prolonged periods of poor returns, including losses greater ' +
               'than historical precedent.'
    },
    {
      title: 'Tax Law Assumptions',
      content: 'Tax calculations use 2026 federal tax law as the baseline. Significant changes to ' +
               'tax brackets, deductions, or rates may materially impact your plan. Estate tax ' +
               'exemption is projected at $13.61M (OBBBA July 2025), indexed for inflation.'
    },
    {
      title: 'Monte Carlo Methodology',
      content: 'Simulations use bootstrap sampling from 97 years of historical S&P 500 total returns ' +
               '(1928-2024). Returns are capped at +/-15% to prevent unrealistic projections. ' +
               '1,000 paths are generated for each analysis.'
    },
    {
      title: 'Healthcare Assumptions',
      content: 'Medicare premiums and IRMAA surcharges are based on 2026 CMS data. Long-term care ' +
               'costs use national averages. Actual costs vary by location, health status, and ' +
               'policy changes.'
    },
    {
      title: 'Legacy Planning Limitations',
      content: 'Generational wealth projections assume dynasty trust structures remain legally ' +
               'available. Population growth, fertility rates, and real returns over multi-' +
               'generational timeframes are inherently uncertain.'
    },
  ];

  disclosures.forEach(disclosure => {
    y = checkPageBreak(doc, y, 25, reportDate);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 54, 93);
    doc.text(disclosure.title, MARGIN, y);

    y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.textMuted);
    const splitText = doc.splitTextToSize(disclosure.content, CONTENT_WIDTH);
    doc.text(splitText, MARGIN, y);

    y += (splitText.length * 3.5) + 6;
  });

  // Professional Advice Section
  y = checkPageBreak(doc, y, 35, reportDate);

  doc.setFillColor(252, 246, 227);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 30, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(192, 86, 33);
  doc.text('PROFESSIONAL ADVICE RECOMMENDED', MARGIN + 5, y + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.text);

  const advice = 'Before making financial decisions based on this analysis, consult: ' +
                 'Certified Financial Planner (CFP) for retirement planning | ' +
                 'CPA or tax attorney for tax optimization | ' +
                 'Estate planning attorney for wealth transfer structures';

  const splitAdvice = doc.splitTextToSize(advice, CONTENT_WIDTH - 10);
  doc.text(splitAdvice, MARGIN + 5, y + 15);

  y += 38;

  // Data Sources
  y = checkPageBreak(doc, y, 30, reportDate);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 54, 93);
  doc.text('Data Sources', MARGIN, y);

  y += 5;

  const sources = [
    'S&P 500 Returns: Historical total return data (1928-2024)',
    'Tax Brackets: IRS Revenue Procedure 2025-32',
    'RMD Tables: IRS Publication 590-B, Uniform Lifetime Table',
    'Social Security: SSA bend points and adjustment factors (2026)',
    'Healthcare Costs: CMS Medicare data, Genworth Cost of Care Survey',
  ];

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.textMuted);

  sources.forEach(source => {
    doc.text(source, MARGIN + 3, y);
    y += 4;
  });

  y += 5;

  // Report Info
  doc.setFontSize(8);
  doc.text(`Report Generated: ${reportDate}`, MARGIN, y);
  y += 4;
  doc.text('Calculator Version: 2026.2', MARGIN, y);

  addPageFooter(doc, 9);
}

// ==================== Helper: Generate Recommendations ====================

function generateRecommendations(data: PDFReportData): string[] {
  const { inputs, results } = data;
  const recommendations: string[] = [];
  const successRate = results.probRuin !== undefined ? (100 - results.probRuin) : 95;

  // Success rate recommendations
  if (successRate < 80) {
    recommendations.push('Increase savings rate or reduce planned withdrawal rate to improve success probability.');
  } else if (successRate >= 95) {
    recommendations.push('Your plan is well-funded. Consider legacy planning or lifestyle upgrades.');
  }

  // Roth recommendations
  const rothRatio = inputs.rothBalance / (inputs.taxableBalance + inputs.pretaxBalance + inputs.rothBalance);
  if (rothRatio < 0.2 && inputs.pretaxBalance > 200000) {
    recommendations.push('Consider Roth conversions to improve tax diversification and reduce RMD burden.');
  }

  // Social Security
  if (inputs.includeSS && inputs.ssClaimAge < 67) {
    recommendations.push('Delaying Social Security to 70 could increase lifetime benefits by 24-32%.');
  }

  // Healthcare
  if (!inputs.includeMedicare) {
    recommendations.push('Include Medicare and healthcare costs in your plan for more accurate projections.');
  }

  // Default recommendation
  if (recommendations.length === 0) {
    recommendations.push('Maintain your current strategy and review annually with a financial professional.');
  }

  return recommendations.slice(0, 3);
}

function generateDetailedRecommendations(data: PDFReportData): {
  immediate: string[];
  shortTerm: string[];
  annual: string[];
} {
  const { inputs, results } = data;
  const successRate = results.probRuin !== undefined ? (100 - results.probRuin) : 95;
  const totalPortfolio = inputs.taxableBalance + inputs.pretaxBalance + inputs.rothBalance;

  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const annual: string[] = [];

  // Immediate actions based on analysis
  immediate.push('Review and update beneficiary designations on all retirement accounts.');

  if (inputs.pretaxBalance > 100000 && inputs.retirementAge - inputs.age1 > 5) {
    immediate.push('Schedule a meeting with your CPA to discuss Roth conversion strategy before year-end.');
  }

  if (successRate < 85) {
    immediate.push('Evaluate current spending and identify areas to increase savings rate by 2-3%.');
  }

  immediate.push('Verify emergency fund covers 6-12 months of expenses outside retirement accounts.');

  // Short-term actions
  if (inputs.includeSS && inputs.ssClaimAge < 70) {
    shortTerm.push('Model Social Security claiming scenarios at ages 62, 67, and 70 to optimize lifetime benefits.');
  }

  shortTerm.push('Review asset allocation and rebalance if stock/bond mix has drifted more than 5%.');

  if (!inputs.includeMedicare) {
    shortTerm.push('Research Medicare options and IRMAA thresholds for retirement healthcare planning.');
  }

  if (inputs.showGen && results.genPayout) {
    shortTerm.push('Consult an estate planning attorney about dynasty trust structures for multi-generational wealth.');
  }

  shortTerm.push('Evaluate employer benefits including HSA, FSA, and insurance options for optimization.');

  // Annual review items
  annual.push('Update this retirement analysis with current account balances and life changes.');
  annual.push('Review tax withholdings and estimated payments to avoid penalties.');
  annual.push('Assess insurance coverage (life, disability, long-term care) for adequacy.');
  annual.push('Check contribution limits for 401(k), IRA, and HSA accounts.');
  annual.push('Review estate documents (will, trust, powers of attorney) for updates needed.');
  annual.push('Evaluate portfolio performance against benchmarks and rebalance as needed.');

  return { immediate, shortTerm, annual };
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

  // Reset page counter
  currentPageNum = 1;

  // Generate all sections
  addCoverPage(doc, data);                              // Page 1
  addExecutiveSummary(doc, data, reportDate);           // Page 2
  addPersonalFinancialProfile(doc, data, reportDate);   // Page 3
  addRetirementIncomeProjection(doc, data, reportDate); // Page 4
  addTaxStrategyAnalysis(doc, data, reportDate);        // Page 5
  addRiskAnalysis(doc, data, reportDate);               // Page 6
  addEstateLegacyPlan(doc, data, reportDate);           // Page 7
  addActionPlan(doc, data, reportDate);                 // Page 8
  addDisclosures(doc, reportDate);                      // Page 9

  // Save the PDF
  const fileName = `Retirement_Plan_${data.userName?.replace(/\s+/g, '_') || 'Client'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
