'use client';
import { ReactNode } from 'react';
import { BudgetProvider } from '@/lib/budget-context';
import { PlanConfigProvider } from '@/lib/plan-config-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PlanConfigProvider>
      <BudgetProvider>
        {children}
      </BudgetProvider>
    </PlanConfigProvider>
  );
}
