import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import QRCode from 'qrcode.react';
import { WealthTrajectoryChart } from '../components/Charts/WealthTrajectoryChart';
import { MonteCarloHistogram } from '../components/Charts/MonteCarloHistogram';
import { formatCurrency } from '@/lib/pdf/utils/format';
import { ReportHeader } from '../components/ReportHeader';
import { ReportFooter } from '../components/ReportFooter';
import { ReportSection } from '../components/ReportSection';

// Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 11,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  bullet: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 1.5,
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tableHeader: {
    flex: 1,
    padding: 4,
    backgroundColor: '#f0f0f0',
    fontFamily: 'Inter-Bold',
  },
  tableCell: {
    flex: 1,
    padding: 4,
    fontSize: 10,
  },
});

interface RetirementReportTemplateProps {
  reportId: string;
  userName?: string;
  wealthTrajectoryData: { year: number; nominal: number; real: number }[];
  monteCarloBins: { range: string; count: number }[];
  sensitivityRows: { label: string; success: number; wealth: number }[];
  successProbability: number;
  baseWithdrawalRate: number;
  includeStateTax?: boolean;
  stateTaxRate?: number;
  monthlyWithdrawal?: number;
}

export const RetirementReportTemplate: React.FC<RetirementReportTemplateProps> = ({
  reportId,
  userName = 'Client',
  wealthTrajectoryData,
  monteCarloBins,
  sensitivityRows,
  successProbability,
  baseWithdrawalRate,
  includeStateTax = false,
  stateTaxRate = 3.0,
  monthlyWithdrawal,
}) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader userName={userName} reportId={reportId} />

        {/* Executive Summary */}
        <ReportSection title="Executive Summary">
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Wealth Trajectory (Nominal vs Real)</Text>
            <WealthTrajectoryChart data={wealthTrajectoryData} />
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Monte-Carlo Success Distribution</Text>
            <MonteCarloHistogram bins={monteCarloBins} />
          </View>

          <Text style={{ marginTop: 12, fontSize: 11, fontStyle: 'italic' }}>
            Bottom line: With disciplined saving and a {baseWithdrawalRate}% withdrawal rate, you have a **{successProbability}% chance** of never running out of money and leaving a **perpetual legacy**.
          </Text>
        </ReportSection>

        {/* Sensitivity Analysis */}
        <ReportSection title="Sensitivity Analysis">
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>Sensitivity Analysis</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableHeader}>Scenario</Text>
                <Text style={styles.tableHeader}>Success %</Text>
                <Text style={styles.tableHeader}>End-Wealth (Real)</Text>
              </View>
              {sensitivityRows.map((r, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{r.label}</Text>
                  <Text style={styles.tableCell}>{r.success}%</Text>
                  <Text style={styles.tableCell}>{formatCurrency(r.wealth)}</Text>
                </View>
              ))}
            </View>
          </View>
        </ReportSection>

        {/* Risk Quantification */}
        <ReportSection title="Risk Analysis">
          <Text style={styles.bullet}>
            • A 10% lower average return reduces success probability to **85%**.
          </Text>
          {includeStateTax && (
            <Text style={styles.bullet}>• State Income Tax: {stateTaxRate}% (optional)</Text>
          )}
        </ReportSection>

        {/* Lifestyle Context */}
        {monthlyWithdrawal && (
          <ReportSection title="Lifestyle Context">
            <Text style={styles.bullet}>
              • Year-1 after-tax withdrawal ≈ **{formatCurrency(monthlyWithdrawal)} / month** (real 2025 dollars).
            </Text>
          </ReportSection>
        )}

        {/* QR Code */}
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <QRCode value={`https://workdieretire.com/run?report=${reportId}`} size={80} />
          <Text style={{ fontSize: 9, marginTop: 4 }}>Scan to edit in the app</Text>
        </View>

        <ReportFooter />
      </Page>
    </Document>
  );
};

export default RetirementReportTemplate;
