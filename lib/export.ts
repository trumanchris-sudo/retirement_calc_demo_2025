/**
 * Multiple Export Format Support for Retirement Calculator
 *
 * Provides comprehensive data export in various formats:
 * 1. PDF (enhanced with charts) - Full professional report
 * 2. Excel/CSV - Detailed data tables
 * 3. JSON - Backup/restore functionality
 * 4. Apple Wallet - Key metrics pass
 * 5. Google Sheets - Cloud integration
 * 6. Print-optimized view - Formatted for printing
 */

import type { CalculationResult, CalculatorInputs, ChartDataPoint } from '@/types/calculator';
import type { PDFReportData, PDFReportInputs } from '@/lib/pdfReport';
import { generatePDFReport } from '@/lib/pdfReport';
import { buildWalletPassRequest, requestLegacyPass, type LegacyResult } from '@/lib/walletPass';
import { fmt, fmtFull, fmtPercent } from '@/lib/utils';

// ==================== Types ====================

export type ExportFormat =
  | 'pdf'
  | 'excel'
  | 'csv'
  | 'json'
  | 'wallet'
  | 'google-sheets'
  | 'print';

export interface ExportOptions {
  format: ExportFormat;
  includeCharts?: boolean;
  includeProjections?: boolean;
  includeInputs?: boolean;
  includeTaxAnalysis?: boolean;
  includeGenerational?: boolean;
  fileName?: string;
  userName?: string;
}

export interface ExportData {
  inputs: Partial<CalculatorInputs>;
  results: CalculationResult;
  metadata: ExportMetadata;
}

export interface ExportMetadata {
  exportedAt: string;
  version: string;
  calculatorVersion: string;
  checksum?: string;
}

export interface GoogleSheetsConfig {
  spreadsheetId?: string;
  sheetName?: string;
  accessToken?: string;
}

export interface ExportResult {
  success: boolean;
  format: ExportFormat;
  fileName?: string;
  url?: string;
  error?: string;
}

// ==================== Constants ====================

const EXPORT_VERSION = '1.0.0';
const CALCULATOR_VERSION = '2026.2';

// ==================== Utility Functions ====================

/**
 * Generate a simple checksum for data integrity verification
 */
function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Format date for file names
 */
function formatDateForFileName(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Sanitize file name
 */
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}

/**
 * Trigger browser download
 */
function triggerDownload(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ==================== PDF Export ====================

export async function exportToPDF(
  inputs: Partial<CalculatorInputs>,
  results: CalculationResult,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    const pdfInputs: PDFReportInputs = {
      marital: inputs.marital || 'single',
      age1: inputs.age1 || 30,
      age2: inputs.age2 || 30,
      retirementAge: inputs.retirementAge || 65,
      taxableBalance: inputs.taxableBalance || 0,
      pretaxBalance: inputs.pretaxBalance || 0,
      rothBalance: inputs.rothBalance || 0,
      cTax1: inputs.cTax1 || 0,
      cPre1: inputs.cPre1 || 0,
      cPost1: inputs.cPost1 || 0,
      cMatch1: inputs.cMatch1 || 0,
      cTax2: inputs.cTax2 || 0,
      cPre2: inputs.cPre2 || 0,
      cPost2: inputs.cPost2 || 0,
      cMatch2: inputs.cMatch2 || 0,
      retRate: inputs.retRate || 7,
      inflationRate: inputs.inflationRate || 2.5,
      stateRate: inputs.stateRate || 5,
      wdRate: inputs.wdRate || 4,
      incContrib: inputs.incContrib || false,
      incRate: inputs.incRate || 2,
      returnMode: inputs.returnMode || 'fixed',
      randomWalkSeries: inputs.randomWalkSeries || 'nominal',
      includeSS: inputs.includeSS || false,
      ssIncome: inputs.ssIncome || 0,
      ssClaimAge: inputs.ssClaimAge || 67,
      ssIncome2: inputs.ssIncome2 || 0,
      ssClaimAge2: inputs.ssClaimAge2 || 67,
      includeMedicare: inputs.includeMedicare || false,
      medicarePremium: inputs.medicarePremium || 175,
      medicalInflation: inputs.medicalInflation || 5,
      irmaaThresholdSingle: inputs.irmaaThresholdSingle || 103000,
      irmaaThresholdMarried: inputs.irmaaThresholdMarried || 206000,
      irmaaSurcharge: inputs.irmaaSurcharge || 70,
      includeLTC: inputs.includeLTC || false,
      ltcAnnualCost: inputs.ltcAnnualCost || 100000,
      ltcProbability: inputs.ltcProbability || 50,
      ltcDuration: inputs.ltcDuration || 3,
      ltcOnsetAge: inputs.ltcOnsetAge || 85,
      showGen: inputs.showGen || false,
      hypPerBen: inputs.hypPerBen || 50000,
      numberOfBeneficiaries: inputs.numberOfBeneficiaries || 2,
      totalFertilityRate: inputs.totalFertilityRate || 2.1,
      generationLength: inputs.generationLength || 30,
      fertilityWindowStart: inputs.fertilityWindowStart || 25,
      fertilityWindowEnd: inputs.fertilityWindowEnd || 35,
    };

    const reportData: PDFReportData = {
      inputs: pdfInputs,
      results,
      userName: options.userName || 'Client',
      reportId: `RPT-${Date.now()}`,
    };

    await generatePDFReport(reportData);

    return {
      success: true,
      format: 'pdf',
      fileName: `Retirement_Plan_${sanitizeFileName(options.userName || 'Client')}_${formatDateForFileName()}.pdf`,
    };
  } catch (error) {
    return {
      success: false,
      format: 'pdf',
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    };
  }
}

// ==================== Excel/CSV Export ====================

/**
 * Convert chart data to CSV rows
 */
function chartDataToCSV(data: ChartDataPoint[]): string {
  const headers = ['Year', 'Age 1', 'Age 2', 'Nominal Balance', 'Real Balance', 'P10', 'P90'];
  const rows = data.map(point => [
    point.year,
    point.a1,
    point.a2 ?? '',
    point.bal,
    point.real,
    point.p10 ?? '',
    point.p90 ?? '',
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
}

/**
 * Generate Excel-compatible CSV with multiple sheets (tabs separated by headers)
 */
export function exportToExcel(
  inputs: Partial<CalculatorInputs>,
  results: CalculationResult,
  options: ExportOptions
): ExportResult {
  try {
    const sections: string[] = [];

    // Summary Section
    sections.push('=== RETIREMENT PLAN SUMMARY ===');
    sections.push(`Generated: ${new Date().toLocaleString()}`);
    sections.push(`User: ${options.userName || 'Client'}`);
    sections.push('');

    // Key Results
    sections.push('=== KEY RESULTS ===');
    sections.push(`Metric,Value`);
    sections.push(`Portfolio at Retirement (Nominal),${fmtFull(results.finNom)}`);
    sections.push(`Portfolio at Retirement (Real),${fmtFull(results.finReal)}`);
    sections.push(`Year 1 Withdrawal (Gross),${fmtFull(results.wd)}`);
    sections.push(`Year 1 Withdrawal (After-Tax),${fmtFull(results.wdAfter)}`);
    sections.push(`Year 1 Withdrawal (Real),${fmtFull(results.wdReal)}`);
    sections.push(`End of Life Wealth (Nominal),${fmtFull(results.eol)}`);
    sections.push(`End of Life Wealth (Real),${fmtFull(results.eolReal)}`);
    sections.push(`Estate Tax,${fmtFull(results.estateTax)}`);
    sections.push(`Net Estate,${fmtFull(results.netEstate)}`);
    sections.push(`Years to Retirement,${results.yrsToRet}`);
    sections.push(`Portfolio Survival Years,${results.survYrs}`);
    sections.push(`Probability of Ruin,${results.probRuin !== undefined ? fmtPercent(results.probRuin / 100, 1) : 'N/A'}`);
    sections.push('');

    // Tax Breakdown
    if (options.includeTaxAnalysis !== false) {
      sections.push('=== TAX ANALYSIS ===');
      sections.push(`Tax Category,Amount`);
      sections.push(`Federal Ordinary Income,${fmtFull(results.tax.fedOrd)}`);
      sections.push(`Federal Capital Gains,${fmtFull(results.tax.fedCap)}`);
      sections.push(`NIIT (3.8%),${fmtFull(results.tax.niit)}`);
      sections.push(`State Tax,${fmtFull(results.tax.state)}`);
      sections.push(`Total Taxes,${fmtFull(results.tax.tot)}`);
      sections.push('');
    }

    // Account Balances at EOL
    sections.push('=== END OF LIFE ACCOUNT BALANCES ===');
    sections.push(`Account,Balance`);
    sections.push(`Taxable,${fmtFull(results.eolAccounts.taxable)}`);
    sections.push(`Pre-Tax,${fmtFull(results.eolAccounts.pretax)}`);
    sections.push(`Roth,${fmtFull(results.eolAccounts.roth)}`);
    sections.push('');

    // Inputs Section
    if (options.includeInputs !== false) {
      sections.push('=== INPUT PARAMETERS ===');
      sections.push(`Parameter,Value`);
      sections.push(`Filing Status,${inputs.marital || 'single'}`);
      sections.push(`Age (Person 1),${inputs.age1 || ''}`);
      sections.push(`Age (Person 2),${inputs.age2 || ''}`);
      sections.push(`Retirement Age,${inputs.retirementAge || ''}`);
      sections.push(`Taxable Balance,${fmtFull(inputs.taxableBalance || 0)}`);
      sections.push(`Pre-Tax Balance,${fmtFull(inputs.pretaxBalance || 0)}`);
      sections.push(`Roth Balance,${fmtFull(inputs.rothBalance || 0)}`);
      sections.push(`Expected Return,${inputs.retRate || ''}%`);
      sections.push(`Inflation Rate,${inputs.inflationRate || ''}%`);
      sections.push(`State Tax Rate,${inputs.stateRate || ''}%`);
      sections.push(`Withdrawal Rate,${inputs.wdRate || ''}%`);
      sections.push('');
    }

    // Year-by-Year Projections
    if (options.includeProjections !== false && results.data.length > 0) {
      sections.push('=== YEAR-BY-YEAR PROJECTIONS ===');
      sections.push(chartDataToCSV(results.data));
      sections.push('');
    }

    // RMD Data
    if (results.rmdData && results.rmdData.length > 0) {
      sections.push('=== RMD vs SPENDING TIMELINE ===');
      sections.push('Age,Spending,RMD');
      results.rmdData.forEach(point => {
        sections.push(`${point.age},${point.spending},${point.rmd}`);
      });
      sections.push('');
    }

    // Generational Wealth
    if (options.includeGenerational !== false && results.genPayout) {
      sections.push('=== GENERATIONAL WEALTH PROJECTION ===');
      sections.push(`Metric,Value`);
      sections.push(`Per Beneficiary Distribution (Real),${fmtFull(results.genPayout.perBenReal)}`);
      sections.push(`Sustainability Years,${results.genPayout.years >= 10000 ? 'Perpetual' : results.genPayout.years}`);
      sections.push(`Starting Beneficiaries,${results.genPayout.startBeneficiaries}`);
      sections.push(`Fund Remaining (Real),${fmtFull(results.genPayout.fundLeftReal)}`);
      if (results.genPayout.probPerpetual !== undefined) {
        sections.push(`Perpetual Probability,${fmtPercent(results.genPayout.probPerpetual / 100, 0)}`);
      }
      sections.push('');
    }

    const csvContent = sections.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = options.fileName ||
      `Retirement_Plan_${sanitizeFileName(options.userName || 'Client')}_${formatDateForFileName()}.csv`;

    triggerDownload(blob, fileName);

    return {
      success: true,
      format: 'excel',
      fileName,
    };
  } catch (error) {
    return {
      success: false,
      format: 'excel',
      error: error instanceof Error ? error.message : 'Failed to generate Excel/CSV',
    };
  }
}

/**
 * Export to simple CSV (projections only)
 */
export function exportToCSV(
  results: CalculationResult,
  options: ExportOptions
): ExportResult {
  try {
    const csvContent = chartDataToCSV(results.data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = options.fileName ||
      `Retirement_Projections_${formatDateForFileName()}.csv`;

    triggerDownload(blob, fileName);

    return {
      success: true,
      format: 'csv',
      fileName,
    };
  } catch (error) {
    return {
      success: false,
      format: 'csv',
      error: error instanceof Error ? error.message : 'Failed to generate CSV',
    };
  }
}

// ==================== JSON Export (Backup/Restore) ====================

export interface BackupData {
  version: string;
  exportedAt: string;
  calculatorVersion: string;
  checksum: string;
  inputs: Partial<CalculatorInputs>;
  results: CalculationResult;
}

/**
 * Export data as JSON for backup/restore
 */
export function exportToJSON(
  inputs: Partial<CalculatorInputs>,
  results: CalculationResult,
  options: ExportOptions
): ExportResult {
  try {
    const data: BackupData = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      calculatorVersion: CALCULATOR_VERSION,
      checksum: '', // Will be computed
      inputs,
      results,
    };

    // Compute checksum excluding the checksum field itself
    const checksumData = JSON.stringify({ inputs, results });
    data.checksum = generateChecksum(checksumData);

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const fileName = options.fileName ||
      `Retirement_Backup_${sanitizeFileName(options.userName || 'Client')}_${formatDateForFileName()}.json`;

    triggerDownload(blob, fileName);

    return {
      success: true,
      format: 'json',
      fileName,
    };
  } catch (error) {
    return {
      success: false,
      format: 'json',
      error: error instanceof Error ? error.message : 'Failed to generate JSON backup',
    };
  }
}

/**
 * Import/restore data from JSON backup
 */
export function importFromJSON(jsonString: string): {
  success: boolean;
  data?: BackupData;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString) as BackupData;

    // Verify structure
    if (!data.version || !data.inputs || !data.results) {
      return {
        success: false,
        error: 'Invalid backup file structure',
      };
    }

    // Verify checksum
    const checksumData = JSON.stringify({ inputs: data.inputs, results: data.results });
    const computedChecksum = generateChecksum(checksumData);

    if (data.checksum && data.checksum !== computedChecksum) {
      return {
        success: false,
        error: 'Checksum mismatch - file may be corrupted',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse backup file',
    };
  }
}

/**
 * Read a file and return its contents as string
 */
export function readBackupFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ==================== Apple Wallet Export ====================

/**
 * Export key metrics to Apple Wallet pass
 */
export async function exportToWallet(
  results: CalculationResult,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    // Build legacy result from calculation results
    const userName = options.userName || 'Client';
    const legacyResult: LegacyResult = {
      legacyAmount: results.eolReal,
      legacyAmountDisplay: fmt(results.eolReal),
      legacyType: results.genPayout && results.genPayout.years >= 10000
        ? 'Perpetual Legacy'
        : 'Finite Legacy',
      withdrawalRate: (results.wdReal / results.finReal) || 0.04,
      successProbability: results.probRuin !== undefined
        ? (100 - results.probRuin) / 100
        : 0.95,
      explanationText: `${userName}'s projected legacy of ${fmt(results.eolReal)} at age 95 with ${
        results.probRuin !== undefined ? (100 - results.probRuin).toFixed(0) : '95'
      }% success rate.`,
    };

    const walletRequest = buildWalletPassRequest(legacyResult);
    await requestLegacyPass(walletRequest);

    return {
      success: true,
      format: 'wallet',
      fileName: `LegacyCard-${walletRequest.serialNumber}.pkpass`,
    };
  } catch (error) {
    return {
      success: false,
      format: 'wallet',
      error: error instanceof Error ? error.message : 'Failed to generate Wallet pass',
    };
  }
}

// ==================== Google Sheets Integration ====================

/**
 * Generate Google Sheets URL with pre-filled data
 * Note: For full integration, users would need to authorize via OAuth2
 */
export function exportToGoogleSheets(
  inputs: Partial<CalculatorInputs>,
  results: CalculationResult,
  config?: GoogleSheetsConfig
): ExportResult {
  // Note: inputs parameter reserved for future full Google Sheets API integration
  void inputs;

  try {
    if (config?.spreadsheetId && config?.accessToken) {
      // TODO: Implement actual Google Sheets API integration
      // This would require OAuth2 authentication flow
      return {
        success: false,
        format: 'google-sheets',
        error: 'Google Sheets API integration requires OAuth2 setup. Please export as CSV and import manually.',
      };
    }

    // Fallback: Generate a CSV that can be imported into Google Sheets
    const csvContent = [
      'Year,Age 1,Age 2,Nominal Balance,Real Balance',
      ...results.data.map(point =>
        `${point.year},${point.a1},${point.a2 ?? ''},${point.bal},${point.real}`
      ),
    ].join('\n');

    // Create Google Sheets URL for new spreadsheet
    const googleSheetsUrl = `https://docs.google.com/spreadsheets/create?title=Retirement_Plan_${formatDateForFileName()}`;

    // Open Google Sheets in new tab
    window.open(googleSheetsUrl, '_blank');

    // Also download CSV for manual import
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = `Google_Sheets_Import_${formatDateForFileName()}.csv`;
    triggerDownload(blob, fileName);

    return {
      success: true,
      format: 'google-sheets',
      url: googleSheetsUrl,
      fileName,
    };
  } catch (error) {
    return {
      success: false,
      format: 'google-sheets',
      error: error instanceof Error ? error.message : 'Failed to prepare Google Sheets export',
    };
  }
}

// ==================== Print-Optimized View ====================

/**
 * Generate print-optimized HTML content
 */
export function generatePrintContent(
  inputs: Partial<CalculatorInputs>,
  results: CalculationResult,
  options: ExportOptions
): string {
  const userName = options.userName || 'Client';
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalPortfolio = (inputs.taxableBalance || 0) +
    (inputs.pretaxBalance || 0) + (inputs.rothBalance || 0);
  const successRate = results.probRuin !== undefined ? (100 - results.probRuin) : 95;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Retirement Plan - ${userName}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a202c;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.5in;
    }

    .header {
      text-align: center;
      border-bottom: 3px solid #1a365d;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .header h1 {
      color: #1a365d;
      font-size: 28px;
      margin-bottom: 5px;
    }

    .header .subtitle {
      color: #c9a227;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .header .client-info {
      margin-top: 15px;
      font-size: 18px;
      color: #4a5568;
    }

    .section {
      margin-bottom: 25px;
    }

    .section-title {
      background: #1a365d;
      color: white;
      padding: 8px 15px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 3px solid #c9a227;
      margin-bottom: 15px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }

    .metric-box {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-top: 3px solid #1a365d;
      padding: 15px;
      text-align: center;
    }

    .metric-box .label {
      font-size: 11px;
      color: #718096;
      text-transform: uppercase;
      margin-bottom: 5px;
    }

    .metric-box .value {
      font-size: 20px;
      font-weight: bold;
      color: #1a365d;
    }

    .metric-box .subtitle {
      font-size: 10px;
      color: #a0aec0;
    }

    .metric-box.success .value { color: #276749; }
    .metric-box.warning .value { color: #c05621; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 15px;
    }

    th {
      background: #1a365d;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: 600;
    }

    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
    }

    tr:nth-child(even) {
      background: #f7fafc;
    }

    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      color: #718096;
      text-align: center;
    }

    .disclaimer {
      background: #fff5f5;
      border: 1px solid #feb2b2;
      padding: 10px 15px;
      font-size: 10px;
      color: #c53030;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Retirement & Legacy Plan</h1>
    <div class="subtitle">Comprehensive Financial Analysis</div>
    <div class="client-info">
      Prepared for <strong>${userName}</strong> | ${dateStr}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Executive Summary</div>
    <div class="metrics-grid">
      <div class="metric-box">
        <div class="label">Current Portfolio</div>
        <div class="value">${fmt(totalPortfolio)}</div>
        <div class="subtitle">Total invested assets</div>
      </div>
      <div class="metric-box">
        <div class="label">At Retirement</div>
        <div class="value">${fmt(results.finReal)}</div>
        <div class="subtitle">2026 dollars</div>
      </div>
      <div class="metric-box ${successRate >= 90 ? 'success' : successRate >= 75 ? '' : 'warning'}">
        <div class="label">Success Rate</div>
        <div class="value">${successRate.toFixed(0)}%</div>
        <div class="subtitle">Monte Carlo</div>
      </div>
    </div>
    <div class="metrics-grid">
      <div class="metric-box success">
        <div class="label">Annual Withdrawal</div>
        <div class="value">${fmt(results.wdReal)}</div>
        <div class="subtitle">After-tax, real</div>
      </div>
      <div class="metric-box">
        <div class="label">Legacy Wealth</div>
        <div class="value">${fmt(results.eolReal)}</div>
        <div class="subtitle">At age 95</div>
      </div>
      <div class="metric-box">
        <div class="label">Years to Retirement</div>
        <div class="value">${results.yrsToRet}</div>
        <div class="subtitle">Age ${inputs.retirementAge || 65}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Account Summary</div>
    <table>
      <thead>
        <tr>
          <th>Account Type</th>
          <th class="text-right">Current Balance</th>
          <th class="text-center">% of Total</th>
          <th class="text-right">At End of Life</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Taxable Brokerage</td>
          <td class="text-right">${fmtFull(inputs.taxableBalance || 0)}</td>
          <td class="text-center">${totalPortfolio > 0 ? ((inputs.taxableBalance || 0) / totalPortfolio * 100).toFixed(1) : 0}%</td>
          <td class="text-right">${fmtFull(results.eolAccounts.taxable)}</td>
        </tr>
        <tr>
          <td>Pre-Tax (401k/IRA)</td>
          <td class="text-right">${fmtFull(inputs.pretaxBalance || 0)}</td>
          <td class="text-center">${totalPortfolio > 0 ? ((inputs.pretaxBalance || 0) / totalPortfolio * 100).toFixed(1) : 0}%</td>
          <td class="text-right">${fmtFull(results.eolAccounts.pretax)}</td>
        </tr>
        <tr>
          <td>Roth IRA</td>
          <td class="text-right">${fmtFull(inputs.rothBalance || 0)}</td>
          <td class="text-center">${totalPortfolio > 0 ? ((inputs.rothBalance || 0) / totalPortfolio * 100).toFixed(1) : 0}%</td>
          <td class="text-right">${fmtFull(results.eolAccounts.roth)}</td>
        </tr>
        <tr class="font-bold">
          <td>Total</td>
          <td class="text-right">${fmtFull(totalPortfolio)}</td>
          <td class="text-center">100%</td>
          <td class="text-right">${fmtFull(results.eol)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Tax Summary</div>
    <table>
      <thead>
        <tr>
          <th>Tax Category</th>
          <th class="text-right">Lifetime Amount</th>
          <th class="text-center">% of Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Federal Ordinary Income</td>
          <td class="text-right">${fmtFull(results.tax.fedOrd)}</td>
          <td class="text-center">${results.tax.tot > 0 ? (results.tax.fedOrd / results.tax.tot * 100).toFixed(1) : 0}%</td>
        </tr>
        <tr>
          <td>Federal Capital Gains</td>
          <td class="text-right">${fmtFull(results.tax.fedCap)}</td>
          <td class="text-center">${results.tax.tot > 0 ? (results.tax.fedCap / results.tax.tot * 100).toFixed(1) : 0}%</td>
        </tr>
        <tr>
          <td>NIIT (3.8%)</td>
          <td class="text-right">${fmtFull(results.tax.niit)}</td>
          <td class="text-center">${results.tax.tot > 0 ? (results.tax.niit / results.tax.tot * 100).toFixed(1) : 0}%</td>
        </tr>
        <tr>
          <td>State Income Tax</td>
          <td class="text-right">${fmtFull(results.tax.state)}</td>
          <td class="text-center">${results.tax.tot > 0 ? (results.tax.state / results.tax.tot * 100).toFixed(1) : 0}%</td>
        </tr>
        <tr class="font-bold">
          <td>Total Lifetime Taxes</td>
          <td class="text-right">${fmtFull(results.tax.tot)}</td>
          <td class="text-center">100%</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Planning Parameters</div>
    <table>
      <thead>
        <tr>
          <th>Parameter</th>
          <th class="text-right">Value</th>
          <th>Parameter</th>
          <th class="text-right">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Filing Status</td>
          <td class="text-right">${inputs.marital === 'married' ? 'Married' : 'Single'}</td>
          <td>Expected Return</td>
          <td class="text-right">${inputs.retRate || 7}%</td>
        </tr>
        <tr>
          <td>Current Age</td>
          <td class="text-right">${inputs.age1 || ''}</td>
          <td>Inflation Rate</td>
          <td class="text-right">${inputs.inflationRate || 2.5}%</td>
        </tr>
        <tr>
          <td>Retirement Age</td>
          <td class="text-right">${inputs.retirementAge || 65}</td>
          <td>Withdrawal Rate</td>
          <td class="text-right">${inputs.wdRate || 4}%</td>
        </tr>
        <tr>
          <td>Planning Horizon</td>
          <td class="text-right">To Age 95</td>
          <td>State Tax Rate</td>
          <td class="text-right">${inputs.stateRate || 5}%</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="disclaimer">
    <strong>Important:</strong> This report is for illustrative purposes only and does not constitute
    investment, legal, or tax advice. Past performance does not guarantee future results.
    Please consult qualified financial, tax, and legal professionals before making decisions.
  </div>

  <div class="footer">
    <p>Generated by Tax-Aware Retirement Calculator | Version ${CALCULATOR_VERSION}</p>
    <p>Report ID: RPT-${Date.now()} | Confidential</p>
  </div>
</body>
</html>
`;
}

/**
 * Open print-optimized view in new window
 */
export function exportToPrint(
  inputs: Partial<CalculatorInputs>,
  results: CalculationResult,
  options: ExportOptions
): ExportResult {
  try {
    const printContent = generatePrintContent(inputs, results, options);
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      return {
        success: false,
        format: 'print',
        error: 'Pop-up blocked. Please allow pop-ups and try again.',
      };
    }

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Trigger print dialog after content loads
    printWindow.onload = () => {
      printWindow.print();
    };

    return {
      success: true,
      format: 'print',
    };
  } catch (error) {
    return {
      success: false,
      format: 'print',
      error: error instanceof Error ? error.message : 'Failed to open print view',
    };
  }
}

// ==================== Main Export Function ====================

/**
 * Universal export function that handles all formats
 */
export async function exportData(
  inputs: Partial<CalculatorInputs>,
  results: CalculationResult,
  options: ExportOptions
): Promise<ExportResult> {
  switch (options.format) {
    case 'pdf':
      return exportToPDF(inputs, results, options);

    case 'excel':
      return exportToExcel(inputs, results, options);

    case 'csv':
      return exportToCSV(results, options);

    case 'json':
      return exportToJSON(inputs, results, options);

    case 'wallet':
      return exportToWallet(results, options);

    case 'google-sheets':
      return exportToGoogleSheets(inputs, results);

    case 'print':
      return exportToPrint(inputs, results, options);

    default:
      return {
        success: false,
        format: options.format,
        error: `Unknown export format: ${options.format}`,
      };
  }
}

// ==================== Export Format Metadata ====================

export interface ExportFormatInfo {
  id: ExportFormat;
  name: string;
  description: string;
  icon: string;
  available: boolean;
  requiresAuth?: boolean;
}

export function getAvailableFormats(): ExportFormatInfo[] {
  const isIOS = typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  return [
    {
      id: 'pdf',
      name: 'PDF Report',
      description: 'Professional multi-page report with charts and analysis',
      icon: 'FileText',
      available: true,
    },
    {
      id: 'excel',
      name: 'Excel/CSV',
      description: 'Spreadsheet with all data and projections',
      icon: 'Table',
      available: true,
    },
    {
      id: 'json',
      name: 'JSON Backup',
      description: 'Save your data to restore later',
      icon: 'Database',
      available: true,
    },
    {
      id: 'wallet',
      name: 'Apple Wallet',
      description: 'Add key metrics to Apple Wallet',
      icon: 'Wallet',
      available: isIOS || true, // Available on all platforms, iOS gets native experience
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      description: 'Export to Google Sheets (opens new spreadsheet)',
      icon: 'Cloud',
      available: true,
    },
    {
      id: 'print',
      name: 'Print View',
      description: 'Print-optimized summary report',
      icon: 'Printer',
      available: true,
    },
  ];
}
