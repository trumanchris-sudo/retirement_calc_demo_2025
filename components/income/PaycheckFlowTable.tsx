"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Paycheck {
  paycheckNum: number;
  date: string;
  baseGross: number;
  bonus: number;
  totalGross: number;
  healthIns: number;
  depFSA: number;
  dental: number;
  vision: number;
  medFSA: number;
  totalPreTax: number;
  fitTaxable: number;
  fitBase: number;
  extraFIT: number;
  totalFIT: number;
  ss: number;
  med145: number;
  med235: number;
  totalMed: number;
  fixedExpenses: number;
  preInvRemainder: number;
  max401kPercent: number;
  contribution401k: number;
  hysaContribution: number;
  brokerageContribution: number;
  ytdWages: number;
  ytdSS: number;
  ytdMedicare: number;
  ytd401k: number;
  ytdDepFSA: number;
  ytdMedFSA: number;
  ytdHYSA: number;
  // Individual tracking
  p1YtdWages?: number;
  p2YtdWages?: number;
  p1Ytd401k?: number;
  p2Ytd401k?: number;
}

interface PaycheckFlowTableProps {
  paychecks: Paycheck[];
}

export function PaycheckFlowTable({ paychecks }: PaycheckFlowTableProps) {
  const MAX_401K = 24500; // 2026 401(k) limit
  const MAX_DEP_FSA = 5000;
  const MAX_MED_FSA = 3200;
  const SS_WAGE_BASE = 184500; // 2026 Social Security wage base

  const formatCurrency = (value: number, showSign: boolean = false) => {
    // Handle null/undefined values by defaulting to 0
    const safeValue = value ?? 0;
    const absValue = Math.abs(safeValue);
    const formatted = absValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    if (safeValue === 0) return '0.00';
    if (safeValue < 0) return `-${formatted}`;
    if (showSign && safeValue > 0) return `+${formatted}`;
    return formatted;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  };

  // Table row component for cleaner code
  const TableRow = ({
    label,
    values,
    isNegative = false,
    isHighlight = false,
    isSection = false,
    className = ""
  }: {
    label: string;
    values: number[] | ((p: Paycheck) => number | string)[];
    isNegative?: boolean;
    isHighlight?: boolean;
    isSection?: boolean;
    className?: string;
  }) => {
    if (isSection) {
      return (
        <tr className="bg-muted/50">
          <td colSpan={25} className="py-2 px-3 font-bold text-sm border-b-2 border-t-2">
            {label}
          </td>
        </tr>
      );
    }

    return (
      <tr className={`hover:bg-muted/30 ${isHighlight ? 'bg-blue-50 dark:bg-blue-950/20 font-semibold border-y' : ''} ${className}`}>
        <td className="py-1.5 px-3 text-sm whitespace-nowrap sticky left-0 bg-background border-r-2">
          {label}
        </td>
        {paychecks.map((p, idx) => {
          const value = typeof values[idx] === 'function'
            ? (values[idx] as (p: Paycheck) => number | string)(p)
            : values[idx];

          if (typeof value === 'string') {
            return (
              <td key={p.paycheckNum} className="py-1.5 px-2 text-xs text-right font-mono whitespace-nowrap border-l">
                {value}
              </td>
            );
          }

          const numValue = value as number;
          const displayValue = formatCurrency(Math.abs(numValue));
          const isEmpty = numValue === 0;

          return (
            <td
              key={p.paycheckNum}
              className={`py-1.5 px-2 text-xs text-right font-mono whitespace-nowrap border-l ${
                isNegative && !isEmpty ? 'text-red-700 dark:text-red-400' : ''
              } ${isHighlight && !isEmpty ? 'text-blue-800 dark:text-blue-300 font-semibold' : ''}`}
            >
              {isEmpty ? '-' : isNegative ? `-${displayValue}` : displayValue}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>24-Paycheck Linear Income Flow Table</CardTitle>
        <CardDescription>
          Complete paycheck-by-paycheck waterfall showing every deduction, tax, and investment allocation across all 24 paychecks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-[800px] overflow-y-auto border rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-background z-20">
              {/* Paycheck Numbers */}
              <tr className="border-b-2">
                <th className="sticky left-0 bg-background z-30 py-2 px-3 text-left font-bold border-r-2">
                  Row Label
                </th>
                {paychecks.map((p) => (
                  <th key={p.paycheckNum} className="py-2 px-2 text-center font-bold whitespace-nowrap border-l min-w-[90px]">
                    Paycheck {p.paycheckNum}
                  </th>
                ))}
              </tr>

              {/* Payment Dates */}
              <tr className="border-b bg-muted/20">
                <th className="sticky left-0 bg-muted/20 z-30 py-1.5 px-3 text-left text-muted-foreground font-normal border-r-2">
                  Payment Date
                </th>
                {paychecks.map((p) => (
                  <th key={p.paycheckNum} className="py-1.5 px-2 text-center font-normal text-muted-foreground border-l">
                    {formatDate(p.date)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* GROSS INCOME SECTION */}
              <TableRow label="GROSS INCOME" values={[]} isSection />

              <TableRow
                label="Base Pay"
                values={paychecks.map(p => p.baseGross)}
              />

              <TableRow
                label="Bonus"
                values={paychecks.map(p => p.bonus)}
              />

              <TableRow
                label="Total Gross Income"
                values={paychecks.map(p => p.totalGross)}
                className="bg-green-50 dark:bg-green-950/20 font-semibold border-y"
              />

              {/* PRE-TAX DEDUCTIONS SECTION */}
              <TableRow label="PRE-TAX DEDUCTIONS" values={[]} isSection />

              <TableRow
                label="  Health Insurance"
                values={paychecks.map(p => p.healthIns)}
                isNegative
              />

              <TableRow
                label="  Dependent Care FSA"
                values={paychecks.map(p => p.depFSA)}
                isNegative
              />

              <TableRow
                label="  Dental"
                values={paychecks.map(p => p.dental)}
                isNegative
              />

              <TableRow
                label="  Vision"
                values={paychecks.map(p => p.vision)}
                isNegative
              />

              <TableRow
                label="  Medical FSA"
                values={paychecks.map(p => p.medFSA)}
                isNegative
              />

              <TableRow
                label="Total Pre-Tax Deductions"
                values={paychecks.map(p => p.totalPreTax)}
                isNegative
                className="font-semibold border-b"
              />

              {/* FEDERAL INCOME TAX SECTION */}
              <TableRow label="FEDERAL INCOME TAX" values={[]} isSection />

              <TableRow
                label="FIT Taxable Income"
                values={paychecks.map(p => p.fitTaxable)}
              />

              <TableRow
                label="FIT Base Withholding"
                values={paychecks.map(p => p.fitBase)}
                isNegative
              />

              <TableRow
                label="Extra FIT Withholding"
                values={paychecks.map(p => p.extraFIT)}
                isNegative
              />

              <TableRow
                label="Total FIT"
                values={paychecks.map(p => p.totalFIT)}
                isNegative
                className="font-semibold border-b"
              />

              {/* FICA TAXES SECTION */}
              <TableRow label="FICA TAXES" values={[]} isSection />

              <TableRow
                label="Social Security (6.2%)"
                values={paychecks.map(p => p.ss)}
                isNegative
              />

              <TableRow
                label="Medicare 1.45%"
                values={paychecks.map(p => p.med145)}
                isNegative
              />

              <TableRow
                label="Medicare 0.9% (Add'l)"
                values={paychecks.map(p => p.med235)}
                isNegative
              />

              <TableRow
                label="Total FICA"
                values={paychecks.map(p => p.ss + p.totalMed)}
                isNegative
                className="font-semibold border-b"
              />

              {/* FIXED EXPENSES SECTION */}
              <TableRow label="FIXED EXPENSES" values={[]} isSection />

              <TableRow
                label="Fixed Expenses (All)"
                values={paychecks.map(p => p.fixedExpenses)}
                isNegative
                className="border-b"
              />

              {/* PRE-INVESTMENT REMAINDER */}
              <TableRow
                label="PRE-INVESTMENT REMAINDER"
                values={paychecks.map(p => p.preInvRemainder)}
                isHighlight
              />

              {/* INVESTMENT ALLOCATIONS SECTION */}
              <TableRow label="INVESTMENT ALLOCATIONS" values={[]} isSection />

              <TableRow
                label="401(k) Contribution"
                values={paychecks.map(p => p.contribution401k)}
              />

              <TableRow
                label="HYSA (Expense Reserve)"
                values={paychecks.map(p => p.hysaContribution)}
              />

              <TableRow
                label="Taxable Brokerage (Rem)"
                values={paychecks.map(p => p.brokerageContribution)}
                className="border-b"
              />

              {/* RUNNING BALANCES (YEAR-TO-DATE) SECTION */}
              <TableRow label="RUNNING BALANCES (YEAR-TO-DATE)" values={[]} isSection />

              <TableRow
                label="401(k) YTD"
                values={paychecks.map(p => p.ytd401k)}
                className="bg-blue-50 dark:bg-blue-950/10"
              />

              <TableRow
                label="HYSA YTD"
                values={paychecks.map(p => p.ytdHYSA)}
                className="bg-blue-50 dark:bg-blue-950/10"
              />

              <TableRow
                label="Brokerage YTD"
                values={paychecks.map(p => {
                  // Calculate cumulative brokerage
                  const index = paychecks.indexOf(p);
                  return paychecks.slice(0, index + 1).reduce((sum, pc) => sum + pc.brokerageContribution, 0);
                })}
                className="bg-blue-50 dark:bg-blue-950/10"
              />

              <TableRow
                label="SS Wages YTD"
                values={paychecks.map(p => p.ytdWages)}
                className="bg-blue-50 dark:bg-blue-950/10"
              />

              <TableRow
                label="Medicare Wages YTD"
                values={paychecks.map(p => p.ytdWages)}
                className="bg-blue-50 dark:bg-blue-950/10 border-b"
              />

              {/* LIMIT MARKERS SECTION */}
              <TableRow label="LIMIT MARKERS" values={[]} isSection />

              <TableRow
                label="401(k) Room Remaining (Combined)"
                values={paychecks.map(p => Math.max(0, (MAX_401K * 2) - p.ytd401k))}
                className="bg-amber-50 dark:bg-amber-950/10"
              />

              <TableRow
                label="P1 401(k) Room"
                values={paychecks.map(p => Math.max(0, MAX_401K - (p.p1Ytd401k || 0)))}
                className="bg-amber-50 dark:bg-amber-950/10"
              />

              <TableRow
                label="P2 401(k) Room"
                values={paychecks.map(p => Math.max(0, MAX_401K - (p.p2Ytd401k || 0)))}
                className="bg-amber-50 dark:bg-amber-950/10"
              />

              <TableRow
                label="P1 SS Wage Room"
                values={paychecks.map(p => Math.max(0, SS_WAGE_BASE - (p.p1YtdWages || 0)))}
                className="bg-amber-50 dark:bg-amber-950/10"
              />

              <TableRow
                label="P2 SS Wage Room"
                values={paychecks.map(p => Math.max(0, SS_WAGE_BASE - (p.p2YtdWages || 0)))}
                className="bg-amber-50 dark:bg-amber-950/10"
              />

              <TableRow
                label="Dep FSA Room Remaining"
                values={paychecks.map(p => Math.max(0, MAX_DEP_FSA - p.ytdDepFSA))}
                className="bg-amber-50 dark:bg-amber-950/10"
              />

              <TableRow
                label="Med FSA Room Remaining"
                values={paychecks.map(p => Math.max(0, MAX_MED_FSA - p.ytdMedFSA))}
                className="bg-amber-50 dark:bg-amber-950/10"
              />
            </tbody>
          </table>
        </div>

        {/* Footer Notes */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>How to Read This Table:</strong> Each column represents one paycheck. Read left-to-right to see progression through the year.
            Read top-to-bottom within a column to see a single paycheck's complete waterfall from gross pay to final investment allocation.
            Watch for transitions where values change (FSA caps, SS wage base limits, Medicare threshold crossings).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
