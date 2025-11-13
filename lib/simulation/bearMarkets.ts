/**
 * Bear Market Scenarios
 * Historical market crash data and utilities for stress testing retirement plans
 */

import { SP500_YOY_NOMINAL, SP500_START_YEAR } from "@/lib/constants";

export interface BearMarketScenario {
  year: number;
  label: string;
  description: string;
  risk: "extreme" | "high" | "medium";
  firstYear: string;
}

/**
 * Predefined bear market scenarios based on historical crashes
 */
export const BEAR_MARKET_SCENARIOS: BearMarketScenario[] = [
  {
    year: 1929,
    label: "Great Depression",
    description: "-43.8% → -8.3% → -25.1%",
    risk: "extreme",
    firstYear: "-43.8%",
  },
  {
    year: 1973,
    label: "Oil Crisis",
    description: "-14.3% → -25.9% bear market",
    risk: "high",
    firstYear: "-14.3%",
  },
  {
    year: 1987,
    label: "Black Monday",
    description: "Single-day crash, quick recovery",
    risk: "medium",
    firstYear: "+5.8%",
  },
  {
    year: 2000,
    label: "Dot-com Crash",
    description: "-9.0% → -11.9% → -22.0%",
    risk: "high",
    firstYear: "-9.0%",
  },
  {
    year: 2001,
    label: "9/11 Recession",
    description: "Tech bust continues",
    risk: "high",
    firstYear: "-11.9%",
  },
  {
    year: 2008,
    label: "Financial Crisis",
    description: "-36.6% worst year since 1931",
    risk: "extreme",
    firstYear: "-36.6%",
  },
  {
    year: 2022,
    label: "Inflation Shock",
    description: "-18.0% stocks + bonds down",
    risk: "medium",
    firstYear: "-18.0%",
  },
];

/**
 * Extract 3 years of returns starting from a historical year
 * for bear market scenario injection
 */
export function getBearReturns(year: number): number[] {
  const startIndex = year - SP500_START_YEAR;

  if (startIndex < 0 || startIndex + 2 >= SP500_YOY_NOMINAL.length) {
    // Fallback if year is out of range
    return [0, 0, 0];
  }
  return [
    SP500_YOY_NOMINAL[startIndex],
    SP500_YOY_NOMINAL[startIndex + 1],
    SP500_YOY_NOMINAL[startIndex + 2],
  ];
}

/**
 * Get scenario details by year
 */
export function getBearMarketScenario(year: number): BearMarketScenario | undefined {
  return BEAR_MARKET_SCENARIOS.find((s) => s.year === year);
}
