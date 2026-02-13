/**
 * Print Components
 *
 * Professional print layout components for generating high-quality printed reports.
 *
 * Features:
 * - PrintLayout: Main wrapper with header, footer, QR code, and date/time stamp
 * - PrintSection: Wrapper for content that should avoid page breaks
 * - PrintPageBreak: Force a page break at a specific point
 * - PrintOnly/ScreenOnly: Conditional rendering based on media
 * - PrintChart: Optimized chart container for print
 * - PrintTable: Styled table component for print
 * - PrintSummaryCard: Key metric display cards
 *
 * Usage:
 * ```tsx
 * import {
 *   PrintLayout,
 *   PrintSection,
 *   PrintChart,
 *   PrintSummaryCard
 * } from '@/components/print';
 *
 * function ReportPage() {
 *   return (
 *     <PrintLayout
 *       reportTitle="Retirement Planning Report"
 *       userName="John Doe"
 *       showQRCode={true}
 *     >
 *       <PrintSection>
 *         <h2>Executive Summary</h2>
 *         <div className="print-summary-3">
 *           <PrintSummaryCard
 *             title="Retirement Age"
 *             value="65"
 *             variant="success"
 *           />
 *           <PrintSummaryCard
 *             title="Monthly Income"
 *             value="$8,500"
 *             variant="default"
 *           />
 *         </div>
 *       </PrintSection>
 *
 *       <PrintChart title="Wealth Projection">
 *         <MyChart />
 *       </PrintChart>
 *     </PrintLayout>
 *   );
 * }
 * ```
 */

export {
  PrintLayout,
  PrintSection,
  PrintPageBreak,
  PrintOnly,
  ScreenOnly,
  PrintChart,
  PrintTable,
  PrintSummaryCard,
} from './PrintLayout';

export type { default as PrintLayoutDefault } from './PrintLayout';
