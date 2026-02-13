/**
 * Shared Expense Calculation Functions
 *
 * Pure expense calculation functions with no browser/DOM dependencies.
 * Used by both main app and Monte Carlo worker.
 */

import { CHILD_EXPENSE_CONSTANTS, PRE_MEDICARE_HEALTHCARE_CONSTANTS } from "./constants";

/**
 * Calculate annual child-related expenses for all children
 * @param childrenAges - Array of children's starting ages
 * @param simulationYear - Current year in the simulation
 * @param inflationFactor - Cumulative inflation factor
 * @returns Total annual child expenses
 */
export function calculateChildExpenses(
  childrenAges: number[],
  simulationYear: number,
  inflationFactor: number
): number {
  if (!childrenAges || childrenAges.length === 0) return 0;

  let totalExpenses = 0;

  for (const startAge of childrenAges) {
    const currentAge = startAge + simulationYear;

    // Skip if child is past college age
    if (currentAge >= CHILD_EXPENSE_CONSTANTS.collegeEndAge) continue;

    let childExpense = 0;

    // Childcare/K-12/College costs (mutually exclusive by age)
    if (currentAge < CHILD_EXPENSE_CONSTANTS.childcareEndAge) {
      childExpense += CHILD_EXPENSE_CONSTANTS.childcareAnnual;
    } else if (currentAge < CHILD_EXPENSE_CONSTANTS.k12EndAge) {
      childExpense += CHILD_EXPENSE_CONSTANTS.k12Annual;
    } else if (currentAge < CHILD_EXPENSE_CONSTANTS.collegeEndAge) {
      childExpense += CHILD_EXPENSE_CONSTANTS.collegeAnnual;
    }

    // Dependent base costs (general expenses - food, clothing, activities)
    if (currentAge < CHILD_EXPENSE_CONSTANTS.dependentEndAge) {
      // Age-based factor: younger children cost relatively more for basics
      const ageFactor = currentAge < 6 ? 1.0 : currentAge < 13 ? 0.85 : 0.7;
      childExpense += CHILD_EXPENSE_CONSTANTS.dependentBaseAnnual * ageFactor;
    } else if (currentAge < CHILD_EXPENSE_CONSTANTS.collegeEndAge) {
      // College-age dependents: reduced but still some support
      childExpense += CHILD_EXPENSE_CONSTANTS.dependentBaseAnnual * 0.5;
    }

    totalExpenses += childExpense;
  }

  return totalExpenses * inflationFactor;
}

/**
 * Calculate pre-Medicare healthcare costs for a given age
 * @param age - Current age of the individual
 * @returns Annual healthcare cost in base-year dollars
 */
export function getPreMedicareHealthcareCost(age: number): number {
  if (age >= PRE_MEDICARE_HEALTHCARE_CONSTANTS.medicareAge) {
    return 0; // Medicare kicks in at 65
  }

  const { individual } = PRE_MEDICARE_HEALTHCARE_CONSTANTS;

  if (age < 30) return individual.under30;
  if (age < 40) return individual.age30to39;
  if (age < 50) return individual.age40to49;
  if (age < 55) return individual.age50to54;
  if (age < 60) return individual.age55to59;
  return individual.age60to64;
}

/**
 * Calculate total pre-Medicare healthcare costs for a household
 * @param age1 - Age of primary person
 * @param age2 - Age of spouse (null if single)
 * @param numChildren - Number of dependent children
 * @param medicalInflationFactor - Cumulative medical inflation factor
 * @returns Total annual healthcare cost in current-year dollars
 */
export function calculatePreMedicareHealthcareCosts(
  age1: number,
  age2: number | null,
  numChildren: number,
  medicalInflationFactor: number
): number {
  let totalCost = 0;

  // Person 1's healthcare cost (if under 65)
  const person1Cost = getPreMedicareHealthcareCost(age1);
  totalCost += person1Cost;

  // Person 2's healthcare cost (if married and under 65)
  if (age2 !== null) {
    const person2Cost = getPreMedicareHealthcareCost(age2);
    totalCost += person2Cost;
  }

  // Add per-child costs for dependent children
  if (numChildren > 0 && (age1 < PRE_MEDICARE_HEALTHCARE_CONSTANTS.medicareAge ||
      (age2 !== null && age2 < PRE_MEDICARE_HEALTHCARE_CONSTANTS.medicareAge))) {
    totalCost += numChildren * PRE_MEDICARE_HEALTHCARE_CONSTANTS.perChildAdditional;
  }

  // Apply medical inflation
  return totalCost * medicalInflationFactor;
}
