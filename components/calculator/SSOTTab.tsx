'use client';

import { usePlanConfig } from '@/lib/plan-config-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CalculatorInputs, FilingStatus, EmploymentType } from '@/types/calculator';
import type { UpdateSource } from '@/types/plan-config';

/**
 * Single Source of Truth (SSOT) Tab
 *
 * This is the MASTER editable view of PlanConfig.
 * All other UI components are just alternate views/editors of these same fields.
 *
 * Requirements:
 * - SSOT = PlanConfig (no new data layer)
 * - Fully editable, immediate write-through
 * - No hardcoded defaults - everything comes from PlanConfig
 * - Every field shows its source and last update
 */
export function SSOTTab() {
  const { config, updateConfig } = usePlanConfig();

  // Helper to update a single field
  const updateField = <K extends keyof CalculatorInputs>(
    field: K,
    value: CalculatorInputs[K],
    source: UpdateSource = 'user-entered'
  ) => {
    console.log(`[SSOT] Updating ${field}:`, value);
    updateConfig({ [field]: value }, source);
  };

  // Helper to get field metadata
  const getFieldMeta = (field: keyof CalculatorInputs) => {
    return config.fieldMetadata?.[field];
  };

  // Helper to render field badge showing source
  const FieldBadge = ({ field }: { field: keyof CalculatorInputs }) => {
    const meta = getFieldMeta(field);
    if (!meta) return null;

    const sourceColors: Record<UpdateSource, string> = {
      'user-entered': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'ai-suggested': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'system-calculated': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };

    return (
      <Badge variant="outline" className={`text-xs ${sourceColors[meta.source]}`}>
        {meta.source === 'user-entered' ? 'Manual' : meta.source === 'ai-suggested' ? 'AI' : 'System'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Single Source of Truth (SSOT)</h2>
        <p className="text-muted-foreground">
          Master data view. All calculator inputs, assumptions, and configurations in one place.
          Every field here is the authoritative source - all other UI components mirror these values.
        </p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Core demographic and family data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Marital Status */}
            <div className="space-y-2">
              <Label htmlFor="ssot-marital" className="flex items-center gap-2">
                Marital Status
                <FieldBadge field="marital" />
              </Label>
              <Select
                value={config.marital ?? 'single'}
                onValueChange={(value) => updateField('marital', value as FilingStatus)}
              >
                <SelectTrigger id="ssot-marital">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="married-separate">Married Filing Separately</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Age 1 */}
            <div className="space-y-2">
              <Label htmlFor="ssot-age1" className="flex items-center gap-2">
                Your Age
                <FieldBadge field="age1" />
              </Label>
              <Input
                id="ssot-age1"
                type="number"
                min="18"
                max="100"
                value={config.age1 ?? 35}
                onChange={(e) => updateField('age1', parseInt(e.target.value) || 35)}
              />
            </div>

            {/* Age 2 */}
            {config.marital === 'married' && (
              <div className="space-y-2">
                <Label htmlFor="ssot-age2" className="flex items-center gap-2">
                  Spouse Age
                  <FieldBadge field="age2" />
                </Label>
                <Input
                  id="ssot-age2"
                  type="number"
                  min="18"
                  max="100"
                  value={config.age2 ?? 35}
                  onChange={(e) => updateField('age2', parseInt(e.target.value) || 35)}
                />
              </div>
            )}

            {/* Retirement Age */}
            <div className="space-y-2">
              <Label htmlFor="ssot-retAge" className="flex items-center gap-2">
                Target Retirement Age
                <FieldBadge field="retAge" />
              </Label>
              <Input
                id="ssot-retAge"
                type="number"
                min="50"
                max="80"
                value={config.retAge ?? 65}
                onChange={(e) => updateField('retAge', parseInt(e.target.value) || 65)}
              />
            </div>

            {/* Number of Children */}
            <div className="space-y-2">
              <Label htmlFor="ssot-numChildren" className="flex items-center gap-2">
                Number of Children
                <FieldBadge field="numChildren" />
              </Label>
              <Input
                id="ssot-numChildren"
                type="number"
                min="0"
                max="10"
                value={config.numChildren ?? 0}
                onChange={(e) => updateField('numChildren', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment & Income */}
      <Card>
        <CardHeader>
          <CardTitle>Employment & Income</CardTitle>
          <CardDescription>Current employment status and annual income</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employment Type 1 */}
            <div className="space-y-2">
              <Label htmlFor="ssot-employmentType1" className="flex items-center gap-2">
                Your Employment Type
                <FieldBadge field="employmentType1" />
              </Label>
              <Select
                value={config.employmentType1 ?? 'w2'}
                onValueChange={(value) => updateField('employmentType1', value as EmploymentType)}
              >
                <SelectTrigger id="ssot-employmentType1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="w2">W-2 Employee</SelectItem>
                  <SelectItem value="self-employed">Self-Employed</SelectItem>
                  <SelectItem value="both">Both W-2 and Self-Employed</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Annual Income 1 */}
            <div className="space-y-2">
              <Label htmlFor="ssot-annualIncome1" className="flex items-center gap-2">
                Your Annual Income
                <FieldBadge field="annualIncome1" />
              </Label>
              <Input
                id="ssot-annualIncome1"
                type="number"
                min="0"
                step="1000"
                value={config.annualIncome1 ?? 100000}
                onChange={(e) => updateField('annualIncome1', parseInt(e.target.value) || 100000)}
              />
            </div>

            {/* Spouse Employment (if married) */}
            {config.marital === 'married' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ssot-employmentType2" className="flex items-center gap-2">
                    Spouse Employment Type
                    <FieldBadge field="employmentType2" />
                  </Label>
                  <Select
                    value={config.employmentType2 ?? 'w2'}
                    onValueChange={(value) => updateField('employmentType2', value as EmploymentType)}
                  >
                    <SelectTrigger id="ssot-employmentType2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="w2">W-2 Employee</SelectItem>
                      <SelectItem value="self-employed">Self-Employed</SelectItem>
                      <SelectItem value="both">Both W-2 and Self-Employed</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ssot-annualIncome2" className="flex items-center gap-2">
                    Spouse Annual Income
                    <FieldBadge field="annualIncome2" />
                  </Label>
                  <Input
                    id="ssot-annualIncome2"
                    type="number"
                    min="0"
                    step="1000"
                    value={config.annualIncome2 ?? 0}
                    onChange={(e) => updateField('annualIncome2', parseInt(e.target.value) || 0)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Current Account Balances</CardTitle>
          <CardDescription>Starting balances across all account types</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ssot-emergencyFund" className="flex items-center gap-2">
                Emergency Fund
                <FieldBadge field="emergencyFund" />
              </Label>
              <Input
                id="ssot-emergencyFund"
                type="number"
                min="0"
                step="1000"
                value={config.emergencyFund ?? 0}
                onChange={(e) => updateField('emergencyFund', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-sTax" className="flex items-center gap-2">
                Taxable Brokerage
                <FieldBadge field="sTax" />
              </Label>
              <Input
                id="ssot-sTax"
                type="number"
                min="0"
                step="1000"
                value={config.sTax ?? 0}
                onChange={(e) => updateField('sTax', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-sPre" className="flex items-center gap-2">
                Traditional 401k/IRA
                <FieldBadge field="sPre" />
              </Label>
              <Input
                id="ssot-sPre"
                type="number"
                min="0"
                step="1000"
                value={config.sPre ?? 0}
                onChange={(e) => updateField('sPre', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-sPost" className="flex items-center gap-2">
                Roth Accounts
                <FieldBadge field="sPost" />
              </Label>
              <Input
                id="ssot-sPost"
                type="number"
                min="0"
                step="1000"
                value={config.sPost ?? 0}
                onChange={(e) => updateField('sPost', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Annual Contributions - Person 1 */}
      <Card>
        <CardHeader>
          <CardTitle>Your Annual Contributions</CardTitle>
          <CardDescription>How much you contribute to each account type per year</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ssot-cPre1" className="flex items-center gap-2">
                Traditional 401k
                <FieldBadge field="cPre1" />
              </Label>
              <Input
                id="ssot-cPre1"
                type="number"
                min="0"
                step="500"
                value={config.cPre1 ?? 0}
                onChange={(e) => updateField('cPre1', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-cPost1" className="flex items-center gap-2">
                Roth IRA/401k
                <FieldBadge field="cPost1" />
              </Label>
              <Input
                id="ssot-cPost1"
                type="number"
                min="0"
                step="500"
                value={config.cPost1 ?? 0}
                onChange={(e) => updateField('cPost1', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-cTax1" className="flex items-center gap-2">
                Taxable Brokerage
                <FieldBadge field="cTax1" />
              </Label>
              <Input
                id="ssot-cTax1"
                type="number"
                min="0"
                step="500"
                value={config.cTax1 ?? 0}
                onChange={(e) => updateField('cTax1', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-cMatch1" className="flex items-center gap-2">
                Employer Match
                <FieldBadge field="cMatch1" />
              </Label>
              <Input
                id="ssot-cMatch1"
                type="number"
                min="0"
                step="500"
                value={config.cMatch1 ?? 0}
                onChange={(e) => updateField('cMatch1', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Annual Contributions - Person 2 (if married) */}
      {config.marital === 'married' && (
        <Card>
          <CardHeader>
            <CardTitle>Spouse Annual Contributions</CardTitle>
            <CardDescription>Spouse contributions to each account type per year</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ssot-cPre2" className="flex items-center gap-2">
                  Traditional 401k
                  <FieldBadge field="cPre2" />
                </Label>
                <Input
                  id="ssot-cPre2"
                  type="number"
                  min="0"
                  step="500"
                  value={config.cPre2 ?? 0}
                  onChange={(e) => updateField('cPre2', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ssot-cPost2" className="flex items-center gap-2">
                  Roth IRA/401k
                  <FieldBadge field="cPost2" />
                </Label>
                <Input
                  id="ssot-cPost2"
                  type="number"
                  min="0"
                  step="500"
                  value={config.cPost2 ?? 0}
                  onChange={(e) => updateField('cPost2', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ssot-cTax2" className="flex items-center gap-2">
                  Taxable Brokerage
                  <FieldBadge field="cTax2" />
                </Label>
                <Input
                  id="ssot-cTax2"
                  type="number"
                  min="0"
                  step="500"
                  value={config.cTax2 ?? 0}
                  onChange={(e) => updateField('cTax2', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ssot-cMatch2" className="flex items-center gap-2">
                  Employer Match
                  <FieldBadge field="cMatch2" />
                </Label>
                <Input
                  id="ssot-cMatch2"
                  type="number"
                  min="0"
                  step="500"
                  value={config.cMatch2 ?? 0}
                  onChange={(e) => updateField('cMatch2', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Return Assumptions */}
      <Card>
        <CardHeader>
          <CardTitle>Return & Inflation Assumptions</CardTitle>
          <CardDescription>Expected market returns and economic assumptions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ssot-retRate" className="flex items-center gap-2">
                Expected Return Rate (%)
                <FieldBadge field="retRate" />
              </Label>
              <Input
                id="ssot-retRate"
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={config.retRate ?? 9.8}
                onChange={(e) => updateField('retRate', parseFloat(e.target.value) || 9.8)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-infRate" className="flex items-center gap-2">
                Inflation Rate (%)
                <FieldBadge field="infRate" />
              </Label>
              <Input
                id="ssot-infRate"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={config.infRate ?? 2.6}
                onChange={(e) => updateField('infRate', parseFloat(e.target.value) || 2.6)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-dividendYield" className="flex items-center gap-2">
                Dividend Yield (%)
                <FieldBadge field="dividendYield" />
              </Label>
              <Input
                id="ssot-dividendYield"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={config.dividendYield ?? 2.0}
                onChange={(e) => updateField('dividendYield', parseFloat(e.target.value) || 2.0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-wdRate" className="flex items-center gap-2">
                Withdrawal Rate (%)
                <FieldBadge field="wdRate" />
              </Label>
              <Input
                id="ssot-wdRate"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={config.wdRate ?? 3.5}
                onChange={(e) => updateField('wdRate', parseFloat(e.target.value) || 3.5)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-stateRate" className="flex items-center gap-2">
                State Tax Rate (%)
                <FieldBadge field="stateRate" />
              </Label>
              <Input
                id="ssot-stateRate"
                type="number"
                min="0"
                max="15"
                step="0.1"
                value={config.stateRate ?? 0}
                onChange={(e) => updateField('stateRate', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-incRate" className="flex items-center gap-2">
                Income Growth Rate (%)
                <FieldBadge field="incRate" />
              </Label>
              <Input
                id="ssot-incRate"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={config.incRate ?? 4.5}
                onChange={(e) => updateField('incRate', parseFloat(e.target.value) || 4.5)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug: Full PlanConfig JSON */}
      <Card>
        <CardHeader>
          <CardTitle>Debug: Full PlanConfig</CardTitle>
          <CardDescription>Raw PlanConfig object for debugging</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
            {JSON.stringify(config, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
