/**
 * SSOT Debug Panel
 *
 * Verifies Single Source of Truth (PlanConfig) is working correctly.
 * Shows the complete data flow from wizard → API → SSOT → calculator
 */

'use client';

import React from 'react';
import { usePlanConfig } from '@/contexts/PlanConfigContext';

interface SSOTDebugPanelProps {
  wizardData?: Record<string, any>; // Data explicitly provided by user in wizard
  apiAssumptions?: Array<{
    field: string;
    value: any;
    reasoning: string;
    confidence: string;
  }>;
}

export default function SSOTDebugPanel({ wizardData, apiAssumptions }: SSOTDebugPanelProps) {
  const { planConfig } = usePlanConfig();

  // Define all fields we care about tracking
  const criticalFields = [
    { key: 'age1', label: 'Age (Person 1)', category: 'personal' },
    { key: 'age2', label: 'Age (Person 2)', category: 'personal' },
    { key: 'marital', label: 'Marital Status', category: 'personal' },
    { key: 'state', label: 'State', category: 'personal' },
    { key: 'retAge', label: 'Retirement Age', category: 'personal', critical: true },
    { key: 'annualIncome1', label: 'Annual Income 1', category: 'income' },
    { key: 'annualIncome2', label: 'Annual Income 2', category: 'income' },
    { key: 'cPre1', label: 'Pre-tax 401k Contribution 1', category: 'contributions', critical: true },
    { key: 'cPost1', label: 'Roth Contribution 1', category: 'contributions', critical: true },
    { key: 'cTax1', label: 'Taxable Contribution 1', category: 'contributions', critical: true },
    { key: 'cPre2', label: 'Pre-tax 401k Contribution 2', category: 'contributions' },
    { key: 'cPost2', label: 'Roth Contribution 2', category: 'contributions' },
    { key: 'cTax2', label: 'Taxable Contribution 2', category: 'contributions' },
    { key: 'bal1Pre', label: 'Current Pre-tax Balance', category: 'balances' },
    { key: 'bal1Post', label: 'Current Roth Balance', category: 'balances' },
    { key: 'bal1Tax', label: 'Current Taxable Balance', category: 'balances' },
    { key: 'balCash', label: 'Emergency Fund', category: 'balances' },
    { key: 'mortgage', label: 'Monthly Housing Cost', category: 'expenses' },
    { key: 'utilities', label: 'Monthly Utilities', category: 'expenses' },
    { key: 'propertyTax', label: 'Monthly Insurance/Tax', category: 'expenses' },
    { key: 'healthcare1', label: 'Monthly Healthcare 1', category: 'expenses' },
    { key: 'healthcare2', label: 'Monthly Healthcare 2', category: 'expenses' },
    { key: 'otherExpenses', label: 'Monthly Other Expenses', category: 'expenses' },
  ];

  const categories = [
    { id: 'personal', label: 'Personal Info', color: 'blue' },
    { id: 'income', label: 'Income', color: 'green' },
    { id: 'contributions', label: 'Contributions', color: 'purple' },
    { id: 'balances', label: 'Account Balances', color: 'yellow' },
    { id: 'expenses', label: 'Expenses', color: 'orange' },
  ];

  const getValueSource = (key: string): 'user' | 'api' | 'default' | 'missing' => {
    if (wizardData && wizardData[key] !== undefined) return 'user';
    if (apiAssumptions?.find(a => a.field === key)) return 'api';
    if (planConfig[key as keyof typeof planConfig] !== undefined) return 'default';
    return 'missing';
  };

  const formatValue = (value: any): string => {
    if (value === undefined || value === null) return '—';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const getSourceBadge = (source: ReturnType<typeof getValueSource>) => {
    const badges = {
      user: { label: 'User', color: 'bg-green-600/80 text-green-100' },
      api: { label: 'AI Assumed', color: 'bg-blue-600/80 text-blue-100' },
      default: { label: 'App Default', color: 'bg-slate-600/80 text-slate-100' },
      missing: { label: 'Missing', color: 'bg-red-600/80 text-red-100' },
    };
    const badge = badges[source];
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${badge.color} font-medium`}>
        {badge.label}
      </span>
    );
  };

  const getCategoryColor = (categoryId: string) => {
    const colors: Record<string, string> = {
      personal: 'border-blue-500/30 bg-blue-950/20',
      income: 'border-green-500/30 bg-green-950/20',
      contributions: 'border-purple-500/30 bg-purple-950/20',
      balances: 'border-yellow-500/30 bg-yellow-950/20',
      expenses: 'border-orange-500/30 bg-orange-950/20',
    };
    return colors[categoryId] || 'border-slate-500/30 bg-slate-950/20';
  };

  return (
    <div className="space-y-6 p-6 bg-slate-900/50 rounded-lg border border-slate-700">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          🔍 SSOT Verification Panel
        </h2>
        <p className="text-sm text-slate-400">
          Verify the Single Source of Truth (PlanConfig) data flow from wizard → API → calculator
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-green-950/30 border border-green-700/50 rounded p-4">
          <div className="text-green-400 text-sm font-medium">User Provided</div>
          <div className="text-2xl font-bold text-green-100">
            {criticalFields.filter(f => getValueSource(f.key) === 'user').length}
          </div>
        </div>
        <div className="bg-blue-950/30 border border-blue-700/50 rounded p-4">
          <div className="text-blue-400 text-sm font-medium">AI Assumed</div>
          <div className="text-2xl font-bold text-blue-100">
            {criticalFields.filter(f => getValueSource(f.key) === 'api').length}
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-600/50 rounded p-4">
          <div className="text-slate-400 text-sm font-medium">App Defaults</div>
          <div className="text-2xl font-bold text-slate-100">
            {criticalFields.filter(f => getValueSource(f.key) === 'default').length}
          </div>
        </div>
        <div className="bg-red-950/30 border border-red-700/50 rounded p-4">
          <div className="text-red-400 text-sm font-medium">Missing</div>
          <div className="text-2xl font-bold text-red-100">
            {criticalFields.filter(f => getValueSource(f.key) === 'missing').length}
          </div>
        </div>
      </div>

      {/* Data by Category */}
      {categories.map(category => {
        const fields = criticalFields.filter(f => f.category === category.id);
        return (
          <div key={category.id} className={`border rounded-lg p-4 ${getCategoryColor(category.id)}`}>
            <h3 className="text-lg font-semibold text-slate-100 mb-3">{category.label}</h3>
            <div className="space-y-2">
              {fields.map(field => {
                const source = getValueSource(field.key);
                const value = planConfig[field.key as keyof typeof planConfig];
                const assumption = apiAssumptions?.find(a => a.field === field.key);

                return (
                  <div
                    key={field.key}
                    className={`flex items-start justify-between p-3 rounded bg-slate-900/40 ${
                      field.critical ? 'border-2 border-yellow-500/40' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-200">
                          {field.label}
                          {field.critical && (
                            <span className="ml-1 text-yellow-400" title="Critical field">
                              ⭐
                            </span>
                          )}
                        </span>
                        {getSourceBadge(source)}
                      </div>
                      <div className="text-lg font-mono text-slate-100">
                        {formatValue(value)}
                      </div>
                      {assumption && (
                        <div className="text-xs text-slate-400 italic mt-1">
                          {assumption.reasoning}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* API Assumptions Detail */}
      {apiAssumptions && apiAssumptions.length > 0 && (
        <div className="border border-blue-500/30 bg-blue-950/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-100 mb-3">
            AI Assumptions Detail ({apiAssumptions.length})
          </h3>
          <div className="space-y-2">
            {apiAssumptions.map((assumption, idx) => (
              <div key={idx} className="bg-slate-900/40 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-200">
                    {assumption.field}
                  </span>
                  <span className="text-xs text-slate-400">
                    Confidence: {assumption.confidence}
                  </span>
                </div>
                <div className="text-sm text-blue-200 font-mono mb-1">
                  Value: {formatValue(assumption.value)}
                </div>
                <div className="text-xs text-slate-400 italic">
                  {assumption.reasoning}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw PlanConfig Dump */}
      <details className="border border-slate-600 bg-slate-950/50 rounded-lg p-4">
        <summary className="text-sm font-medium text-slate-300 cursor-pointer hover:text-slate-100">
          🔧 Raw PlanConfig Data (for debugging)
        </summary>
        <pre className="mt-3 text-xs text-slate-400 overflow-auto max-h-96 bg-black/40 p-3 rounded">
          {JSON.stringify(planConfig, null, 2)}
        </pre>
      </details>
    </div>
  );
}
