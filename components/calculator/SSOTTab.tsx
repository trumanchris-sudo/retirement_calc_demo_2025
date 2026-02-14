'use client';

import { usePlanConfig } from '@/lib/plan-config-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CalculatorInputs, FilingStatus, EmploymentType } from '@/types/calculator';
import { createDefaultPlanConfig } from '@/types/plan-config';
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
  const D = createDefaultPlanConfig();

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
      'default': 'bg-slate-500/10 text-slate-500 border-slate-500/20',
      'imported': 'bg-green-500/10 text-green-500 border-green-500/20',
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
                value={config.marital ?? D.marital}
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
                value={config.age1 ?? D.age1}
                onChange={(e) => updateField('age1', parseInt(e.target.value) || D.age1)}
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
                  value={config.age2 ?? D.age2}
                  onChange={(e) => updateField('age2', parseInt(e.target.value) || D.age2)}
                />
              </div>
            )}

            {/* Retirement Age */}
            <div className="space-y-2">
              <Label htmlFor="ssot-retirementAge" className="flex items-center gap-2">
                Target Retirement Age
                <FieldBadge field="retirementAge" />
              </Label>
              <Input
                id="ssot-retirementAge"
                type="number"
                min="50"
                max="80"
                value={config.retirementAge ?? D.retirementAge}
                onChange={(e) => updateField('retirementAge', parseInt(e.target.value) || D.retirementAge)}
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
                value={config.numChildren ?? D.numChildren}
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
                value={config.employmentType1 ?? D.employmentType1}
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
              <Label htmlFor="ssot-primaryIncome" className="flex items-center gap-2">
                Your Annual Income
                <FieldBadge field="primaryIncome" />
              </Label>
              <Input
                id="ssot-primaryIncome"
                type="number"
                min="0"
                step="1000"
                value={config.primaryIncome ?? D.primaryIncome}
                onChange={(e) => updateField('primaryIncome', parseInt(e.target.value) || D.primaryIncome)}
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
                  <Label htmlFor="ssot-spouseIncome" className="flex items-center gap-2">
                    Spouse Annual Income
                    <FieldBadge field="spouseIncome" />
                  </Label>
                  <Input
                    id="ssot-spouseIncome"
                    type="number"
                    min="0"
                    step="1000"
                    value={config.spouseIncome ?? D.spouseIncome}
                    onChange={(e) => updateField('spouseIncome', parseInt(e.target.value) || 0)}
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
                value={config.emergencyFund ?? D.emergencyFund}
                onChange={(e) => updateField('emergencyFund', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-taxableBalance" className="flex items-center gap-2">
                Taxable Brokerage
                <FieldBadge field="taxableBalance" />
              </Label>
              <Input
                id="ssot-taxableBalance"
                type="number"
                min="0"
                step="1000"
                value={config.taxableBalance ?? D.taxableBalance}
                onChange={(e) => updateField('taxableBalance', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-pretaxBalance" className="flex items-center gap-2">
                Traditional 401k/IRA
                <FieldBadge field="pretaxBalance" />
              </Label>
              <Input
                id="ssot-pretaxBalance"
                type="number"
                min="0"
                step="1000"
                value={config.pretaxBalance ?? D.pretaxBalance}
                onChange={(e) => updateField('pretaxBalance', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-rothBalance" className="flex items-center gap-2">
                Roth Accounts
                <FieldBadge field="rothBalance" />
              </Label>
              <Input
                id="ssot-rothBalance"
                type="number"
                min="0"
                step="1000"
                value={config.rothBalance ?? D.rothBalance}
                onChange={(e) => updateField('rothBalance', parseInt(e.target.value) || 0)}
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
                value={config.cPre1 ?? D.cPre1}
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
                value={config.cPost1 ?? D.cPost1}
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
                value={config.cTax1 ?? D.cTax1}
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
                value={config.cMatch1 ?? D.cMatch1}
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
                  value={config.cPre2 ?? D.cPre2}
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
                  value={config.cPost2 ?? D.cPost2}
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
                  value={config.cTax2 ?? D.cTax2}
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
                  value={config.cMatch2 ?? D.cMatch2}
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
                value={config.retRate ?? D.retRate}
                onChange={(e) => updateField('retRate', parseFloat(e.target.value) || D.retRate)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-inflationRate" className="flex items-center gap-2">
                Inflation Rate (%)
                <FieldBadge field="inflationRate" />
              </Label>
              <Input
                id="ssot-inflationRate"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={config.inflationRate ?? D.inflationRate}
                onChange={(e) => updateField('inflationRate', parseFloat(e.target.value) || D.inflationRate)}
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
                value={config.dividendYield ?? D.dividendYield}
                onChange={(e) => updateField('dividendYield', parseFloat(e.target.value) || D.dividendYield)}
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
                value={config.wdRate ?? D.wdRate}
                onChange={(e) => updateField('wdRate', parseFloat(e.target.value) || D.wdRate)}
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
                value={config.stateRate ?? D.stateRate}
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
                value={config.incRate ?? D.incRate}
                onChange={(e) => updateField('incRate', parseFloat(e.target.value) || D.incRate)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Expenses</CardTitle>
          <CardDescription>Monthly budget items from AI onboarding</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ssot-monthlyMortgageRent" className="flex items-center gap-2">
                Mortgage/Rent
                <FieldBadge field="monthlyMortgageRent" />
              </Label>
              <Input
                id="ssot-monthlyMortgageRent"
                type="number"
                min="0"
                step="100"
                value={config.monthlyMortgageRent ?? 0}
                onChange={(e) => updateField('monthlyMortgageRent', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-monthlyUtilities" className="flex items-center gap-2">
                Utilities
                <FieldBadge field="monthlyUtilities" />
              </Label>
              <Input
                id="ssot-monthlyUtilities"
                type="number"
                min="0"
                step="50"
                value={config.monthlyUtilities ?? 0}
                onChange={(e) => updateField('monthlyUtilities', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-monthlyInsurancePropertyTax" className="flex items-center gap-2">
                Insurance & Property Tax
                <FieldBadge field="monthlyInsurancePropertyTax" />
              </Label>
              <Input
                id="ssot-monthlyInsurancePropertyTax"
                type="number"
                min="0"
                step="50"
                value={config.monthlyInsurancePropertyTax ?? 0}
                onChange={(e) => updateField('monthlyInsurancePropertyTax', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-monthlyHealthcareP1" className="flex items-center gap-2">
                Your Healthcare Premium
                <FieldBadge field="monthlyHealthcareP1" />
              </Label>
              <Input
                id="ssot-monthlyHealthcareP1"
                type="number"
                min="0"
                step="50"
                value={config.monthlyHealthcareP1 ?? 0}
                onChange={(e) => updateField('monthlyHealthcareP1', parseInt(e.target.value) || 0)}
              />
            </div>

            {config.marital === 'married' && (
              <div className="space-y-2">
                <Label htmlFor="ssot-monthlyHealthcareP2" className="flex items-center gap-2">
                  Spouse Healthcare Premium
                  <FieldBadge field="monthlyHealthcareP2" />
                </Label>
                <Input
                  id="ssot-monthlyHealthcareP2"
                  type="number"
                  min="0"
                  step="50"
                  value={config.monthlyHealthcareP2 ?? 0}
                  onChange={(e) => updateField('monthlyHealthcareP2', parseInt(e.target.value) || 0)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ssot-monthlyOtherExpenses" className="flex items-center gap-2">
                Other Monthly Expenses
                <FieldBadge field="monthlyOtherExpenses" />
              </Label>
              <Input
                id="ssot-monthlyOtherExpenses"
                type="number"
                min="0"
                step="100"
                value={config.monthlyOtherExpenses ?? 0}
                onChange={(e) => updateField('monthlyOtherExpenses', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bonus & Variable Compensation */}
      <Card>
        <CardHeader>
          <CardTitle>Bonus & Variable Compensation</CardTitle>
          <CardDescription>End-of-year bonuses and variable pay details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ssot-eoyBonusAmount" className="flex items-center gap-2">
                Annual Bonus Amount
                <FieldBadge field="eoyBonusAmount" />
              </Label>
              <Input
                id="ssot-eoyBonusAmount"
                type="number"
                min="0"
                step="1000"
                value={config.eoyBonusAmount ?? 0}
                onChange={(e) => updateField('eoyBonusAmount', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-eoyBonusMonth" className="flex items-center gap-2">
                Bonus Payment Month
                <FieldBadge field="eoyBonusMonth" />
              </Label>
              <Select
                value={config.eoyBonusMonth ?? 'December'}
                onValueChange={(value) => updateField('eoyBonusMonth', value)}
              >
                <SelectTrigger id="ssot-eoyBonusMonth">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="January">January</SelectItem>
                  <SelectItem value="February">February</SelectItem>
                  <SelectItem value="March">March</SelectItem>
                  <SelectItem value="April">April</SelectItem>
                  <SelectItem value="May">May</SelectItem>
                  <SelectItem value="June">June</SelectItem>
                  <SelectItem value="July">July</SelectItem>
                  <SelectItem value="August">August</SelectItem>
                  <SelectItem value="September">September</SelectItem>
                  <SelectItem value="October">October</SelectItem>
                  <SelectItem value="November">November</SelectItem>
                  <SelectItem value="December">December</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-firstPayDate" className="flex items-center gap-2">
                First Pay Date (YYYY-MM-DD)
                <FieldBadge field="firstPayDate" />
              </Label>
              <Input
                id="ssot-firstPayDate"
                type="text"
                placeholder="2025-01-01"
                value={config.firstPayDate ?? ''}
                onChange={(e) => updateField('firstPayDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Security */}
      <Card>
        <CardHeader>
          <CardTitle>Social Security</CardTitle>
          <CardDescription>Social Security benefits and claiming strategy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ssot-includeSS" className="flex items-center gap-2">
              <input
                id="ssot-includeSS"
                type="checkbox"
                checked={config.includeSS ?? D.includeSS}
                onChange={(e) => updateField('includeSS', e.target.checked)}
                className="rounded border-gray-300"
              />
              Include Social Security Benefits
              <FieldBadge field="includeSS" />
            </Label>
          </div>

          {config.includeSS && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ssot-ssIncome" className="flex items-center gap-2">
                  Your SS Benefit Basis (Annual Income)
                  <FieldBadge field="ssIncome" />
                </Label>
                <Input
                  id="ssot-ssIncome"
                  type="number"
                  min="0"
                  step="1000"
                  value={config.ssIncome ?? D.ssIncome}
                  onChange={(e) => updateField('ssIncome', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ssot-ssClaimAge" className="flex items-center gap-2">
                  Your Claim Age
                  <FieldBadge field="ssClaimAge" />
                </Label>
                <Input
                  id="ssot-ssClaimAge"
                  type="number"
                  min="62"
                  max="70"
                  value={config.ssClaimAge ?? D.ssClaimAge}
                  onChange={(e) => updateField('ssClaimAge', parseInt(e.target.value) || D.ssClaimAge)}
                />
              </div>

              {config.marital === 'married' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="ssot-ssIncome2" className="flex items-center gap-2">
                      Spouse SS Benefit Basis
                      <FieldBadge field="ssIncome2" />
                    </Label>
                    <Input
                      id="ssot-ssIncome2"
                      type="number"
                      min="0"
                      step="1000"
                      value={config.ssIncome2 ?? D.ssIncome2}
                      onChange={(e) => updateField('ssIncome2', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ssot-ssClaimAge2" className="flex items-center gap-2">
                      Spouse Claim Age
                      <FieldBadge field="ssClaimAge2" />
                    </Label>
                    <Input
                      id="ssot-ssClaimAge2"
                      type="number"
                      min="62"
                      max="70"
                      value={config.ssClaimAge2 ?? D.ssClaimAge2}
                      onChange={(e) => updateField('ssClaimAge2', parseInt(e.target.value) || D.ssClaimAge2)}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Family Planning */}
      <Card>
        <CardHeader>
          <CardTitle>Family Planning</CardTitle>
          <CardDescription>Children information for legacy wealth calculations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ssot-numChildren" className="flex items-center gap-2">
                Number of Children
                <FieldBadge field="numChildren" />
              </Label>
              <Input
                id="ssot-numChildren"
                type="number"
                min="0"
                max="20"
                value={config.numChildren ?? D.numChildren}
                onChange={(e) => updateField('numChildren', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssot-additionalChildrenExpected" className="flex items-center gap-2">
                Additional Children Expected
                <FieldBadge field="additionalChildrenExpected" />
              </Label>
              <Input
                id="ssot-additionalChildrenExpected"
                type="number"
                min="0"
                max="10"
                value={config.additionalChildrenExpected ?? D.additionalChildrenExpected}
                onChange={(e) => updateField('additionalChildrenExpected', parseInt(e.target.value) || 0)}
              />
            </div>

            {config.numChildren > 0 && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ssot-childrenAges" className="flex items-center gap-2">
                  Children Ages (comma-separated)
                  <FieldBadge field="childrenAges" />
                </Label>
                <Input
                  id="ssot-childrenAges"
                  type="text"
                  placeholder="5, 8, 12"
                  value={config.childrenAges?.join(', ') ?? ''}
                  onChange={(e) => {
                    const ages = e.target.value
                      .split(',')
                      .map(s => parseInt(s.trim()))
                      .filter(n => !isNaN(n));
                    updateField('childrenAges', ages);
                  }}
                />
              </div>
            )}
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
