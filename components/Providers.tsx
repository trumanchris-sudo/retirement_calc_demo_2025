'use client';
import { ReactNode } from 'react';
import { BudgetProvider } from '@/lib/budget-context';
import { PlanConfigProvider } from '@/lib/plan-config-context';
import { ThemeProvider } from '@/lib/theme-context';
import { KeyboardShortcutsProvider } from '@/lib/keyboard-shortcuts-context';
import { OfflineProvider } from '@/lib/offline-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <KeyboardShortcutsProvider>
      <ThemeProvider>
        <OfflineProvider>
          <PlanConfigProvider>
            <BudgetProvider>
              {children}
            </BudgetProvider>
          </PlanConfigProvider>
        </OfflineProvider>
      </ThemeProvider>
    </KeyboardShortcutsProvider>
  );
}
