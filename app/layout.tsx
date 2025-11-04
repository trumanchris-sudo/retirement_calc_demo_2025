import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tax-Aware Retirement Planner',
  description: 'Advanced retirement planning tool with tax-aware projections, Monte Carlo simulations, and generational wealth modeling',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
