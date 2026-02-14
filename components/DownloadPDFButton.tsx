"use client";

import React, { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { generatePDFReport, type PDFReportData, type PDFReportInputs } from '@/lib/pdfReport';
import type { CalculationResult } from '@/types/calculator';
import type { FilingStatus } from '@/lib/calculations/taxCalculations';
import type { ReturnMode, WalkSeries } from '@/types/planner';
import { Download, FileText, Loader2 } from 'lucide-react';

interface DownloadPDFButtonProps {
  // All calculator inputs
  marital: FilingStatus;
  age1: number;
  age2: number;
  retirementAge: number;
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;
  cTax2: number;
  cPre2: number;
  cPost2: number;
  cMatch2: number;
  retRate: number;
  inflationRate: number;
  stateRate: number;
  wdRate: number;
  incContrib: boolean;
  incRate: number;
  returnMode: ReturnMode;
  randomWalkSeries: WalkSeries;
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2: number;
  ssClaimAge2: number;
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
  showGen: boolean;
  hypPerBen: number;
  numberOfBeneficiaries: number;
  totalFertilityRate: number;
  generationLength: number;
  fertilityWindowStart: number;
  fertilityWindowEnd: number;

  // Calculation results
  results: CalculationResult | null;

  // Optional customization
  userName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const DownloadPDFButton: React.FC<DownloadPDFButtonProps> = ({
  marital,
  age1,
  age2,
  retirementAge,
  taxableBalance,
  pretaxBalance,
  rothBalance,
  cTax1,
  cPre1,
  cPost1,
  cMatch1,
  cTax2,
  cPre2,
  cPost2,
  cMatch2,
  retRate,
  inflationRate,
  stateRate,
  wdRate,
  incContrib,
  incRate,
  returnMode,
  randomWalkSeries,
  includeSS,
  ssIncome,
  ssClaimAge,
  ssIncome2,
  ssClaimAge2,
  includeMedicare,
  medicarePremium,
  medicalInflation,
  irmaaThresholdSingle,
  irmaaThresholdMarried,
  irmaaSurcharge,
  includeLTC,
  ltcAnnualCost,
  ltcProbability,
  ltcDuration,
  ltcOnsetAge,
  showGen,
  hypPerBen,
  numberOfBeneficiaries,
  totalFertilityRate,
  generationLength,
  fertilityWindowStart,
  fertilityWindowEnd,
  results,
  userName,
  variant = 'default',
  size = 'default',
  showIcon = true,
  className = '',
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    if (!results) {
      toast.warning('Please run calculations before generating a report');
      return;
    }

    setIsGenerating(true);

    try {
      const inputs: PDFReportInputs = {
        marital,
        age1,
        age2,
        retirementAge,
        taxableBalance,
        pretaxBalance,
        rothBalance,
        cTax1,
        cPre1,
        cPost1,
        cMatch1,
        cTax2,
        cPre2,
        cPost2,
        cMatch2,
        retRate,
        inflationRate,
        stateRate,
        wdRate,
        incContrib,
        incRate,
        returnMode,
        randomWalkSeries,
        includeSS,
        ssIncome,
        ssClaimAge,
        ssIncome2,
        ssClaimAge2,
        includeMedicare,
        medicarePremium,
        medicalInflation,
        irmaaThresholdSingle,
        irmaaThresholdMarried,
        irmaaSurcharge,
        includeLTC,
        ltcAnnualCost,
        ltcProbability,
        ltcDuration,
        ltcOnsetAge,
        showGen,
        hypPerBen,
        numberOfBeneficiaries,
        totalFertilityRate,
        generationLength,
        fertilityWindowStart,
        fertilityWindowEnd,
      };

      const reportData: PDFReportData = {
        inputs,
        results,
        userName: userName || 'Client',
        reportId: `RPT-${Date.now()}`,
      };

      await generatePDFReport(reportData);

      // Success feedback
      console.log('PDF report generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownloadPDF}
      disabled={!results || isGenerating}
      variant={variant}
      size={size}
      className={className}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          {showIcon && <FileText className="mr-2 h-4 w-4" />}
          Download Full Report (PDF)
        </>
      )}
    </Button>
  );
};

export default DownloadPDFButton;
