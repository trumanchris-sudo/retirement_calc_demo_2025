import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Providers } from '@/components/Providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SkipLink } from '@/components/a11y/SkipLink'
import { LiveRegion } from '@/components/a11y/LiveRegion'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { OfflineUI } from '@/components/pwa/OfflineUI'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'WORK DIE RETIRE - Free Retirement Calculator',
  description: 'Free retirement planning tool with tax-aware projections and Monte Carlo simulations. No ads. No bullshit.',
  manifest: '/app.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Retirement Calc',
  },
  applicationName: 'WORK DIE RETIRE',
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA: Apple touch icons */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />
        {/* PWA: Splash screens for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Retirement Calc" />
        {/* Prevent flash of wrong theme - inline script runs before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('retirement-calc-theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var resolved = theme === 'dark' || (theme !== 'light' && systemDark) ? 'dark' : 'light';
                  document.documentElement.classList.add(resolved);
                  document.documentElement.style.colorScheme = resolved;
                } catch (e) {
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
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
            <InstallPrompt />
            <OfflineUI />
            <Toaster />
          </Providers>
        </ErrorBoundary>
        <LiveRegion />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
