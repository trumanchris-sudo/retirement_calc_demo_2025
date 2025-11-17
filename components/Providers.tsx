'use client';
import { ReactNode } from 'react';
import { BudgetProvider } from '@/lib/budget-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BudgetProvider>
      {children}
    </BudgetProvider>
  );
}
