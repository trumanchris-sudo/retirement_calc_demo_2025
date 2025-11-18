'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type ImpliedBudget = {
  grossIncome: number;
  taxes: number;
  housing: number;
  discretionary: number;
  contributions401k: number;
  contributionsRoth: number;
  contributionsTaxable: number;
  maritalStatus: 'single' | 'married';
  age?: number;
  spouseAge?: number;
};

type BudgetContextType = {
  implied: ImpliedBudget | null;
  setImplied: (budget: ImpliedBudget) => void;
};

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider = ({
  children,
  initialImplied
}: {
  children: ReactNode;
  initialImplied?: ImpliedBudget
}) => {
  const [implied, setImplied] = useState<ImpliedBudget | null>(initialImplied || null);
  return (
    <BudgetContext.Provider value={{ implied, setImplied }}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = () => {
  const context = useContext(BudgetContext);
  // During SSR, context might not be available - return null state
  if (!context) {
    if (typeof window === 'undefined') {
      return { implied: null, setImplied: () => {} };
    }
    throw new Error('useBudget must be used within BudgetProvider');
  }
  return context;
};
