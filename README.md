# Tax-Aware Retirement Planner

A comprehensive retirement planning calculator with **AI-powered insights** powered by Claude, built with **Next.js**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**.

---

## Table of Contents

- [About](#about)  
- [Features](#features)  
- [Tech Stack](#tech-stack)  
- [Getting Started](#getting-started)  
  - [Prerequisites](#prerequisites)  
  - [Installation](#installation)  
  - [Running Locally](#running-locally)  
  - [Building for Production](#building-for-production)  
- [Project Structure](#project-structure)  
- [Contributing](#contributing)  
- [License](#license)  
- [Acknowledgments](#acknowledgments)  

---

## About

The **Tax-Aware Retirement Planner** is a sophisticated financial planning tool that helps users project their retirement wealth with comprehensive tax calculations. It features:

- **2026 tax laws** including official IRS contribution limits and OBBBA permanent estate tax exemption
- **Multiple account types** (taxable brokerage, pre-tax 401k/IRA, Roth)
- **AI-powered insights** using Claude to analyze your retirement plan
- **Random walk simulations** using 50 years of S&P 500 historical data
- **Generational wealth modeling** to project multi-generational financial impact

---

## Features

### 💰 Comprehensive Tax Calculations
- Federal ordinary income tax with standard deductions
- Long-term capital gains tax (LTCG) with proper stacking
- Net Investment Income Tax (NIIT) for high earners
- State tax support
- Tax-optimized withdrawal strategies

### 📊 Advanced Projections
- Mid-year contribution modeling for accuracy
- Inflation-adjusted "real" values
- Two return models: Fixed rate or Random Walk (S&P 500 bootstrap)
- Contribution increase tracking over time
- Multi-decade projections to age 95

### 🤖 AI-Powered Insights
- Personalized retirement plan analysis using Claude
- Actionable recommendations based on your specific situation
- Assessment of plan strength and areas for improvement

### 📈 Beautiful Visualizations
- Interactive area charts showing nominal vs real wealth
- Color-coded stat cards with hover effects
- Responsive design optimized for all devices
- Modern gradient UI with shadcn/ui components

### 🔮 Generational Wealth Modeling
- Per-beneficiary payout simulations
- Birth/death cohort modeling
- Real dollar (inflation-adjusted) projections
- Multi-generational fund sustainability analysis

---

## Tech Stack

- **Framework**: Next.js 15 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Charts**: Recharts
- **AI**: Claude 3.5 Sonnet (Anthropic)
- **Package Manager**: npm  

---

## Getting Started

### Prerequisites

- Node.js (v18 or newer)
- npm (comes with Node.js)
- Claude API key from [Anthropic](https://console.anthropic.com/) (optional, for AI insights)

### Installation

```bash
git clone https://github.com/YOUR-USERNAME/retirement_calc_demo_2025.git
cd retirement_calc_demo_2025
npm install
```

### Configuration

#### Setting up Claude AI (Optional)

1. Get your API key from [https://console.anthropic.com/](https://console.anthropic.com/)
2. Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

3. Add your API key to `.env.local`:

```env
ANTHROPIC_API_KEY=your_actual_api_key_here
```

**Note:** The app works perfectly fine without an API key - you just won't get AI-powered insights. All retirement calculations remain fully functional.

### Running Locally

```bash
npm run dev
```

Open your browser at `http://localhost:3000`.

### Building for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
.
├── app/
│   ├── api/
│   │   └── analyze/         # Claude AI analysis endpoint
│   │       └── route.ts
│   ├── page.tsx             # Main retirement calculator page
│   ├── layout.tsx           # Root layout
│   └── loading.tsx          # Loading state
├── components/
│   └── ui/                  # shadcn/ui components
├── lib/                     # Utility functions
├── public/                  # Static assets
├── .env.example             # Environment variables template
├── next.config.mjs          # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

---

## How It Works

### Tax Calculations

The planner uses 2026 federal tax laws and IRS limits:

- **2026 Contribution Limits**: 401(k) $24,500 ($32,500 with catch-up), IRA $7,500 ($8,600 with catch-up)
- **Ordinary Income**: Progressive tax brackets (10% to 37%) with standard deductions
- **Long-Term Capital Gains**: 0%, 15%, or 20% depending on income
- **NIIT**: 3.8% tax on investment income for high earners ($200k+ single, $250k+ married)
- **Estate Tax**: $15M single / $30M married exemption (OBBBA permanent, no sunset)
- **State Tax**: Configurable percentage

### Return Models

1. **Fixed Rate**: Uses a constant annual return (default: 9.8%, the S&P 500 historical average)
2. **Random Walk**: Bootstrap simulation using 50 years of actual S&P 500 returns (1975-2024)
   - Nominal: Uses actual historical returns
   - Real: Adjusts for inflation
   - Truly Random: New seed each run for different scenarios

### AI Analysis

When you click "Calculate," the app:
1. Computes your retirement projections locally
2. Sends summary data to the Claude API
3. Receives personalized insights about your plan
4. Displays actionable recommendations

---

## Contributing

Contributions are welcome! Feel free to:
- Report bugs or request features via GitHub Issues
- Submit pull requests with improvements
- Share your experience using the planner

---

## License

Licensed under the **MIT License**.

---

## Acknowledgments

- **Anthropic Claude** for AI-powered retirement insights
- **shadcn/ui** for beautiful, accessible UI components
- **Recharts** for interactive data visualizations
- S&P 500 historical data from public sources

---

## Disclaimer

This tool is for educational and planning purposes only. It uses illustrative tax brackets and historical data to project potential outcomes. **This is not financial advice.** Please consult with a qualified financial advisor for personalized retirement planning.
