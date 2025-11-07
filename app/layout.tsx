import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'Tax-Aware Retirement Planner',
  description: 'Advanced retirement planning tool with tax-aware projections, Monte Carlo simulations, and generational wealth modeling',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
        <div className="logo-square" aria-label="App logo">
          R
        </div>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
