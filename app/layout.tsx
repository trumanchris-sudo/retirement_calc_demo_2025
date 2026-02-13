import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Providers } from '@/components/Providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SkipLink } from '@/components/a11y/SkipLink'
import { LiveRegion } from '@/components/a11y/LiveRegion'

export const metadata: Metadata = {
  title: 'WORK DIE RETIRE - Free Retirement Calculator',
  description: 'Free retirement planning tool with tax-aware projections and Monte Carlo simulations. No ads. No bullshit.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zoom for accessibility (WCAG 1.4.4)
  userScalable: true, // Enable pinch-to-zoom for users who need it
  themeColor: '#000000', // Match app black background
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              margin: 0.5in;
              size: letter;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .no-print {
              display: none !important;
            }
            .print-break-before {
              page-break-before: always;
            }
            button, input, select {
              border: 1px solid #ccc !important;
            }
          }
          @media (max-width: 640px) {
            input[type="number"], select {
              font-size: 16px !important;
            }
          }
        `}} />
      </head>
      <body>
        <SkipLink />
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
        <LiveRegion />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
