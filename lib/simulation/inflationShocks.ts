/**
 * Inflation Shock Scenarios
 * Historical inflation periods for stress testing real wealth accumulation
 */

export interface InflationShockScenario {
  rate: number;
  duration: number;
  label: string;
  description: string;
  risk: "extreme" | "high" | "medium";
}

/**
 * Predefined inflation shock scenarios based on historical periods
 */
export const INFLATION_SHOCK_SCENARIOS: InflationShockScenario[] = [
  {
    rate: 8,
    duration: 5,
    label: "1970s Stagflation",
    description: "8% for 5 years (1973-1977)",
    risk: "high",
  },
  {
    rate: 6,
    duration: 4,
    label: "1940s WWII Inflation",
    description: "6% for 4 years (1946-1949)",
    risk: "medium",
  },
  {
    rate: 5,
    duration: 3,
    label: "Early 1990s Spike",
    description: "5% for 3 years",
    risk: "medium",
  },
  {
    rate: 10,
    duration: 5,
    label: "Severe Stagflation",
    description: "10% for 5 years (stress test)",
    risk: "extreme",
  },
  {
    rate: 12,
    duration: 3,
    label: "Hyperinflation Start",
    description: "12% for 3 years (worst case)",
    risk: "extreme",
  },
];

/**
 * Calculate effective inflation rate for a given year, accounting for inflation shocks.
 * @param yearInSimulation - Year index in the simulation (0 = start of accumulation)
 * @param yrsToRet - Years until retirement
 * @param baseInflation - Base inflation rate (%)
 * @param shockRate - Elevated inflation rate during shock (%)
 * @param shockDuration - Duration of shock in years
 * @returns Effective inflation rate (%) for that year
 */
export function getEffectiveInflation(
  yearInSimulation: number,
  yrsToRet: number,
  baseInflation: number,
  shockRate: number | null,
  shockDuration: number
): number {
  if (shockRate === null || shockRate === undefined) return baseInflation;

  // Shock starts at retirement year (yrsToRet) and lasts for shockDuration years
  const shockStartYear = yrsToRet;
  const shockEndYear = yrsToRet + shockDuration;

  if (yearInSimulation >= shockStartYear && yearInSimulation < shockEndYear) {
    return shockRate;
  }

  return baseInflation;
}

/**
 * Get scenario details by rate and duration
 */
export function getInflationShockScenario(
  rate: number,
  duration: number
): InflationShockScenario | undefined {
  return INFLATION_SHOCK_SCENARIOS.find(
    (s) => s.rate === rate && s.duration === duration
  );
}
