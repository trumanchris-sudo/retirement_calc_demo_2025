'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * PrintLayout - Professional print wrapper component
 *
 * Features:
 * - Header with branding on each page
 * - Footer with page numbers, date/time stamp, and legal disclaimer
 * - QR code linking back to digital version
 * - Proper page break controls
 * - Hidden interactive elements
 * - Optimized chart rendering
 */

interface PrintLayoutProps {
  children: React.ReactNode;
  reportTitle?: string;
  userName?: string;
  reportId?: string;
  digitalUrl?: string;
  showQRCode?: boolean;
  companyName?: string;
  legalDisclaimer?: string;
}

interface PrintMetadata {
  generatedAt: string;
  formattedDate: string;
  formattedTime: string;
  pageUrl: string;
}

export function PrintLayout({
  children,
  reportTitle = 'Retirement Planning Report',
  userName = '',
  reportId = '',
  digitalUrl,
  showQRCode = true,
  companyName = 'WorkDieRetire.com',
  legalDisclaimer = 'This report is for informational purposes only and does not constitute financial advice. Consult a qualified financial advisor before making investment decisions.',
}: PrintLayoutProps) {
  const [metadata, setMetadata] = useState<PrintMetadata>({
    generatedAt: '',
    formattedDate: '',
    formattedTime: '',
    pageUrl: '',
  });

  useEffect(() => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    setMetadata({
      generatedAt: now.toISOString(),
      formattedDate,
      formattedTime,
      pageUrl: digitalUrl || (typeof window !== 'undefined' ? window.location.href : ''),
    });
  }, [digitalUrl]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Generate a unique report ID if not provided
  const displayReportId = reportId || `RPT-${Date.now().toString(36).toUpperCase()}`;

  return (
    <div className="print-layout">
      {/* Print-only header - appears on each page */}
      <header className="print-header">
        <div className="print-header-content">
          <div className="print-header-left">
            <div className="print-logo">
              {/* Simple cube logo for print */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 100 100"
                className="print-logo-svg"
              >
                <polygon
                  points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
                  fill="none"
                  stroke="#1a5fb4"
                  strokeWidth="3"
                />
                <polygon
                  points="50,5 95,27.5 50,50 5,27.5"
                  fill="#1a5fb4"
                  opacity="0.3"
                />
                <line x1="50" y1="50" x2="50" y2="95" stroke="#1a5fb4" strokeWidth="2"/>
                <line x1="50" y1="50" x2="95" y2="27.5" stroke="#1a5fb4" strokeWidth="2"/>
                <line x1="50" y1="50" x2="5" y2="27.5" stroke="#1a5fb4" strokeWidth="2"/>
              </svg>
              <span className="print-logo-text">{companyName}</span>
            </div>
            <h1 className="print-title">{reportTitle}</h1>
            {userName && (
              <p className="print-prepared-for">
                Prepared for: <strong>{userName}</strong>
              </p>
            )}
          </div>
          <div className="print-header-right">
            <div className="print-metadata">
              <div className="print-date">
                <span className="print-label">Generated:</span>
                <span className="print-value">{metadata.formattedDate}</span>
                <span className="print-value print-time">{metadata.formattedTime}</span>
              </div>
              <div className="print-report-id">
                <span className="print-label">Report ID:</span>
                <span className="print-value">{displayReportId}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="print-content">
        {children}
      </main>

      {/* Print-only footer with QR code - appears on each page */}
      <footer className="print-footer">
        <div className="print-footer-content">
          <div className="print-footer-left">
            <p className="print-disclaimer">{legalDisclaimer}</p>
            <p className="print-copyright">
              &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
            </p>
          </div>

          {showQRCode && metadata.pageUrl && (
            <div className="print-footer-right">
              <div className="print-qr-container">
                <QRCodeSVG
                  value={metadata.pageUrl}
                  size={64}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                  className="print-qr-code"
                />
                <span className="print-qr-label">Scan to view digital version</span>
              </div>
            </div>
          )}
        </div>

        {/* Page counter placeholder - CSS counters handle actual numbering */}
        <div className="print-page-number">
          <span className="print-current-page"></span>
        </div>
      </footer>

      {/* Print button - only visible on screen */}
      <div className="print-button-container no-print">
        <button
          onClick={handlePrint}
          className="print-button"
          aria-label="Print this report"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Print Report
        </button>
      </div>
    </div>
  );
}

/**
 * PrintSection - Wrapper for content that should avoid page breaks
 */
interface PrintSectionProps {
  children: React.ReactNode;
  className?: string;
  breakBefore?: boolean;
  breakAfter?: boolean;
}

export function PrintSection({
  children,
  className = '',
  breakBefore = false,
  breakAfter = false,
}: PrintSectionProps) {
  const breakClasses = [
    breakBefore ? 'print-page-break-before' : '',
    breakAfter ? 'print-page-break-after' : '',
  ].filter(Boolean).join(' ');

  return (
    <section className={`print-section ${breakClasses} ${className}`}>
      {children}
    </section>
  );
}

/**
 * PrintPageBreak - Force a page break at this point
 */
export function PrintPageBreak() {
  return <div className="print-page-break" aria-hidden="true" />;
}

/**
 * PrintOnly - Content only visible when printing
 */
export function PrintOnly({ children }: { children: React.ReactNode }) {
  return <div className="print-only">{children}</div>;
}

/**
 * ScreenOnly - Content only visible on screen (hidden when printing)
 */
export function ScreenOnly({ children }: { children: React.ReactNode }) {
  return <div className="no-print">{children}</div>;
}

/**
 * PrintChart - Wrapper for charts optimized for print
 */
interface PrintChartProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function PrintChart({ children, title, className = '' }: PrintChartProps) {
  return (
    <div className={`print-chart-container ${className}`}>
      {title && <h3 className="print-chart-title">{title}</h3>}
      <div className="print-chart-content">
        {children}
      </div>
    </div>
  );
}

/**
 * PrintTable - Wrapper for tables optimized for print
 */
interface PrintTableProps {
  children: React.ReactNode;
  caption?: string;
  className?: string;
}

export function PrintTable({ children, caption, className = '' }: PrintTableProps) {
  return (
    <div className={`print-table-container ${className}`}>
      <table className="print-table">
        {caption && <caption className="print-table-caption">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

/**
 * PrintSummaryCard - Styled card for key metrics in print
 */
interface PrintSummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function PrintSummaryCard({
  title,
  value,
  subtitle,
  variant = 'default',
}: PrintSummaryCardProps) {
  return (
    <div className={`print-summary-card print-summary-card--${variant}`}>
      <h4 className="print-summary-card-title">{title}</h4>
      <p className="print-summary-card-value">{value}</p>
      {subtitle && <p className="print-summary-card-subtitle">{subtitle}</p>}
    </div>
  );
}

export default PrintLayout;
