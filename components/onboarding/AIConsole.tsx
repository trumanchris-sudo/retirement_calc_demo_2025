'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { processOnboardingClientSide } from '@/lib/processOnboardingClientSide';
import { createDefaultPlanConfig } from '@/types/plan-config';
import type {
  ExtractedData,
  AssumptionWithReasoning,
} from '@/types/ai-onboarding';
import { AssumptionsReview } from './AssumptionsReview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface AIConsoleProps {
  onComplete: (data: ExtractedData, assumptions: AssumptionWithReasoning[]) => void;
  onSkip: () => void;
  onBack?: () => void;
}

type EmploymentChoice = NonNullable<ExtractedData['employmentType1']>;
type GuidedPhase = 'profile' | 'review' | 'complete';

interface ProfileFormState {
  maritalStatus: 'single' | 'married';
  age: string;
  spouseAge: string;
  state: string;
  employmentType1: EmploymentChoice;
  employmentType2: EmploymentChoice;
  primaryIncome: string;
  spouseIncome: string;
  numChildren: string;
  retirementAge: string;
  currentTraditional: string;
  currentRoth: string;
  currentTaxable: string;
  emergencyFund: string;
  contributionTraditional: string;
  contributionRoth: string;
  contributionTaxable: string;
  contributionMatch: string;
  monthlyMortgageRent: string;
  monthlyInsurancePropertyTax: string;
  monthlyHealthcareP1: string;
  monthlyHealthcareP2: string;
  monthlyChildcare: string;
  desiredRetirementSpending: string;
}

interface StoredGuidedState {
  profile: ProfileFormState;
  extractedData: ExtractedData;
  assumptions: AssumptionWithReasoning[];
  phase: GuidedPhase;
  summary: string;
  showOptional: boolean;
}

const STORAGE_KEY = 'guided_onboarding_profile_state';
const LEGACY_STORAGE_KEY = 'ai_onboarding_state';
const SHOW_DEV_PRESET = process.env.NODE_ENV !== 'production';
const DEFAULT_PLAN_CONFIG = createDefaultPlanConfig();

/**
 * Admin preset for fast beta testing. Hidden outside development builds.
 */
const ADMIN_PRESETS: Record<string, ExtractedData> = {
  admin1: {
    age: 35,
    spouseAge: 34,
    maritalStatus: 'married',
    state: 'TX',
    numChildren: 1,
    employmentType1: 'self-employed',
    employmentType2: 'w2',
    primaryIncome: 750000,
    spouseIncome: 145000,
    currentTraditional: 400000,
    currentRoth: 128000,
    currentTaxable: 74000,
    emergencyFund: 80000,
    contributionTraditional: 96500,
    contributionRoth: 15000,
    contributionTaxable: 100000,
    contributionMatch: 15000,
    retirementAge: 65,
    monthlyMortgageRent: 5859,
    monthlyUtilities: 400,
    monthlyInsurancePropertyTax: 3375,
    monthlyHealthcareP1: 1000,
    monthlyHealthcareP2: 1000,
    monthlyOtherExpenses: 3500,
    monthlyHouseholdExpenses: 3500,
    monthlyDiscretionary: 6000,
    monthlyChildcare: 1500,
    annualLifeInsuranceP1: 3000,
    annualLifeInsuranceP2: 2000,
  },
};

const EMPTY_PROFILE: ProfileFormState = {
  maritalStatus: 'married',
  age: '',
  spouseAge: '',
  state: '',
  employmentType1: 'w2',
  employmentType2: 'w2',
  primaryIncome: '',
  spouseIncome: '',
  numChildren: '0',
  retirementAge: '65',
  currentTraditional: '',
  currentRoth: '',
  currentTaxable: '',
  emergencyFund: '',
  contributionTraditional: '',
  contributionRoth: '',
  contributionTaxable: '',
  contributionMatch: '',
  monthlyMortgageRent: '',
  monthlyInsurancePropertyTax: '',
  monthlyHealthcareP1: '',
  monthlyHealthcareP2: '',
  monthlyChildcare: '',
  desiredRetirementSpending: '',
};

const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
};

const STATE_CODES = new Set(Object.values(STATE_NAME_TO_CODE));

const employmentOptions: Array<{ value: EmploymentChoice; label: string; description: string }> = [
  { value: 'w2', label: 'W-2', description: 'Employee wages' },
  { value: 'self-employed', label: 'K-1 / Self-employed', description: 'Partner, 1099, solo' },
  { value: 'both', label: 'Both', description: 'W-2 plus self-employed' },
  { value: 'other', label: 'Other', description: 'Retired or unusual income' },
];

function parseMoney(value: string): number | undefined {
  const cleaned = value.trim().toLowerCase().replace(/[$,\s]/g, '');
  if (!cleaned) return undefined;

  const suffix = cleaned.at(-1);
  const multiplier = suffix === 'k' ? 1000 : suffix === 'm' ? 1000000 : 1;
  const numeric = multiplier === 1 ? cleaned : cleaned.slice(0, -1);
  const parsed = parseFloat(numeric);

  if (!Number.isFinite(parsed)) return undefined;
  return Math.round(parsed * multiplier);
}

function parseInteger(value: string): number | undefined {
  const parsed = parseInt(value.replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeState(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase();
  if (STATE_CODES.has(upper)) return upper;

  const mapped = STATE_NAME_TO_CODE[trimmed.toLowerCase()];
  return mapped ?? trimmed;
}

function currencyForInput(value?: number): string {
  if (value === undefined || value === null) return '';
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function currencyForDisplay(value?: number): string {
  if (value === undefined || value === null) return 'Not provided';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function futureNominalValue(todayValue: number | undefined, years: number): number | undefined {
  if (todayValue === undefined || todayValue === null) return undefined;
  return Math.round(
    todayValue * Math.pow(1 + (DEFAULT_PLAN_CONFIG.inflationRate ?? 2.6) / 100, Math.max(0, years))
  );
}

function employmentLabel(value?: ExtractedData['employmentType1']): string {
  switch (value) {
    case 'w2':
      return 'W-2';
    case 'self-employed':
      return 'K-1 / self-employed';
    case 'both':
      return 'W-2 + self-employed';
    case 'retired':
      return 'Retired';
    case 'other':
      return 'Other';
    default:
      return 'Not provided';
  }
}

function profileFromExtractedData(data: ExtractedData): ProfileFormState {
  return {
    ...EMPTY_PROFILE,
    maritalStatus: data.maritalStatus ?? EMPTY_PROFILE.maritalStatus,
    age: data.age?.toString() ?? '',
    spouseAge: data.spouseAge?.toString() ?? '',
    state: data.state ?? '',
    employmentType1: data.employmentType1 ?? EMPTY_PROFILE.employmentType1,
    employmentType2: data.employmentType2 ?? EMPTY_PROFILE.employmentType2,
    primaryIncome: currencyForInput(data.primaryIncome),
    spouseIncome: currencyForInput(data.spouseIncome),
    numChildren: data.numChildren?.toString() ?? '0',
    retirementAge: data.retirementAge?.toString() ?? '65',
    currentTraditional: currencyForInput(data.currentTraditional),
    currentRoth: currencyForInput(data.currentRoth),
    currentTaxable: currencyForInput(data.currentTaxable),
    emergencyFund: currencyForInput(data.emergencyFund),
    contributionTraditional: currencyForInput(data.contributionTraditional),
    contributionRoth: currencyForInput(data.contributionRoth),
    contributionTaxable: currencyForInput(data.contributionTaxable),
    contributionMatch: currencyForInput(data.contributionMatch),
    monthlyMortgageRent: currencyForInput(data.monthlyMortgageRent),
    monthlyInsurancePropertyTax: currencyForInput(data.monthlyInsurancePropertyTax),
    monthlyHealthcareP1: currencyForInput(data.monthlyHealthcareP1),
    monthlyHealthcareP2: currencyForInput(data.monthlyHealthcareP2),
    monthlyChildcare: currencyForInput(data.monthlyChildcare),
    desiredRetirementSpending: currencyForInput(data.desiredRetirementSpending),
  };
}

function profileToExtractedData(profile: ProfileFormState): ExtractedData {
  const isMarried = profile.maritalStatus === 'married';
  const age = parseInteger(profile.age);
  const spouseAge = parseInteger(profile.spouseAge);
  const retirementAge = parseInteger(profile.retirementAge);
  const numChildren = Math.max(0, parseInteger(profile.numChildren) ?? 0);

  const data: ExtractedData = {
    maritalStatus: profile.maritalStatus,
    employmentType1: profile.employmentType1,
    state: normalizeState(profile.state),
    numChildren,
    ...(age !== undefined && { age }),
    ...(retirementAge !== undefined && { retirementAge }),
    ...(parseMoney(profile.primaryIncome) !== undefined && { primaryIncome: parseMoney(profile.primaryIncome) }),
    ...(parseMoney(profile.currentTraditional) !== undefined && { currentTraditional: parseMoney(profile.currentTraditional) }),
    ...(parseMoney(profile.currentRoth) !== undefined && { currentRoth: parseMoney(profile.currentRoth) }),
    ...(parseMoney(profile.currentTaxable) !== undefined && { currentTaxable: parseMoney(profile.currentTaxable) }),
    ...(parseMoney(profile.emergencyFund) !== undefined && { emergencyFund: parseMoney(profile.emergencyFund) }),
    ...(parseMoney(profile.contributionTraditional) !== undefined && { contributionTraditional: parseMoney(profile.contributionTraditional) }),
    ...(parseMoney(profile.contributionRoth) !== undefined && { contributionRoth: parseMoney(profile.contributionRoth) }),
    ...(parseMoney(profile.contributionTaxable) !== undefined && { contributionTaxable: parseMoney(profile.contributionTaxable) }),
    ...(parseMoney(profile.contributionMatch) !== undefined && { contributionMatch: parseMoney(profile.contributionMatch) }),
    ...(parseMoney(profile.monthlyMortgageRent) !== undefined && { monthlyMortgageRent: parseMoney(profile.monthlyMortgageRent) }),
    ...(parseMoney(profile.monthlyInsurancePropertyTax) !== undefined && { monthlyInsurancePropertyTax: parseMoney(profile.monthlyInsurancePropertyTax) }),
    ...(parseMoney(profile.monthlyHealthcareP1) !== undefined && { monthlyHealthcareP1: parseMoney(profile.monthlyHealthcareP1) }),
    ...(parseMoney(profile.monthlyChildcare) !== undefined && { monthlyChildcare: parseMoney(profile.monthlyChildcare) }),
    ...(parseMoney(profile.desiredRetirementSpending) !== undefined && { desiredRetirementSpending: parseMoney(profile.desiredRetirementSpending) }),
  };

  if (isMarried) {
    data.employmentType2 = profile.employmentType2;
    if (spouseAge !== undefined) data.spouseAge = spouseAge;
    const spouseIncome = parseMoney(profile.spouseIncome);
    if (spouseIncome !== undefined) data.spouseIncome = spouseIncome;

    const spouseHealthcare = parseMoney(profile.monthlyHealthcareP2);
    if (spouseHealthcare !== undefined) data.monthlyHealthcareP2 = spouseHealthcare;
  }

  return data;
}

function validateProfile(profile: ProfileFormState): string | null {
  const isMarried = profile.maritalStatus === 'married';
  const age = parseInteger(profile.age);
  const spouseAge = parseInteger(profile.spouseAge);
  const primaryIncome = parseMoney(profile.primaryIncome);
  const spouseIncome = parseMoney(profile.spouseIncome);
  const retirementAge = parseInteger(profile.retirementAge);

  if (!age || age < 18 || age > 90) return 'Enter your age between 18 and 90.';
  if (isMarried && (!spouseAge || spouseAge < 18 || spouseAge > 90)) {
    return "Enter your spouse's age between 18 and 90.";
  }
  if (!normalizeState(profile.state)) return 'Enter your state, such as TX or Texas.';
  if (!primaryIncome || primaryIncome <= 0) return 'Enter your annual income before taxes.';
  if (isMarried && (spouseIncome === undefined || spouseIncome < 0)) {
    return "Enter your spouse's annual income, or 0 if they do not have income.";
  }
  if (!retirementAge || retirementAge <= age || retirementAge > 90) {
    return 'Enter a retirement age greater than your current age and no higher than 90.';
  }

  return null;
}

function upsertOverrideAssumptions(
  assumptions: AssumptionWithReasoning[],
  overrides: Record<string, string | number | boolean | null>
): AssumptionWithReasoning[] {
  return assumptions.map((assumption) => {
    if (overrides[assumption.field] !== undefined) {
      return {
        ...assumption,
        value: overrides[assumption.field],
        userProvided: true,
        confidence: 'high' as const,
      };
    }
    return assumption;
  });
}

export function AIConsole({ onComplete, onSkip, onBack }: AIConsoleProps) {
  const [profile, setProfile] = useState<ProfileFormState>(EMPTY_PROFILE);
  const [phase, setPhase] = useState<GuidedPhase>('profile');
  const [summary, setSummary] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData>({});
  const [assumptions, setAssumptions] = useState<AssumptionWithReasoning[]>([]);
  const [showOptional, setShowOptional] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMarried = profile.maritalStatus === 'married';
  const visibleAssumptions = phase === 'review' && assumptions.length > 0;

  useEffect(() => {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      const state = JSON.parse(saved) as StoredGuidedState;
      setProfile({ ...EMPTY_PROFILE, ...state.profile });
      setExtractedData(state.extractedData ?? {});
      setAssumptions(state.assumptions ?? []);
      setSummary(state.summary ?? '');
      setShowOptional(Boolean(state.showOptional));
      setPhase(state.phase ?? 'profile');
    } catch (loadError) {
      console.error('[GuidedOnboarding] Failed to load saved state:', loadError);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const state: StoredGuidedState = {
      profile,
      extractedData,
      assumptions,
      phase,
      summary,
      showOptional,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [assumptions, extractedData, phase, profile, showOptional, summary]);

  const updateProfile = useCallback(<K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  const formatMoneyField = useCallback((field: keyof ProfileFormState) => {
    setProfile((prev) => {
      const value = prev[field];
      if (typeof value !== 'string') return prev;

      const parsed = parseMoney(value);
      if (parsed === undefined) return prev;
      return { ...prev, [field]: currencyForInput(parsed) };
    });
  }, []);

  const processProfile = useCallback(async (data: ExtractedData) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = processOnboardingClientSide({ ...data });
      setExtractedData(result.extractedData);
      setAssumptions(result.assumptions);
      setSummary(result.summary);
      setPhase('review');
    } catch (processError) {
      const message = processError instanceof Error ? processError.message : 'Failed to process the profile.';
      console.error('[GuidedOnboarding] Processing error:', processError);
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateProfile(profile);
    if (validationError) {
      setError(validationError);
      return;
    }

    await processProfile(profileToExtractedData(profile));
  }, [processProfile, profile]);

  const handleUpdateAssumptions = useCallback(async (overrides: Record<string, string | number | boolean | null>) => {
    if (isUpdating) return;

    setIsUpdating(true);
    setError(null);

    try {
      const updatedData = { ...extractedData, ...overrides } as ExtractedData;
      const result = processOnboardingClientSide(updatedData);
      const finalData = { ...result.extractedData, ...overrides } as ExtractedData;

      setExtractedData(finalData);
      setAssumptions(upsertOverrideAssumptions(result.assumptions, overrides));
      setSummary(`Updated ${Object.keys(overrides).length} assumption(s). Review the refreshed plan below.`);
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Failed to update assumptions.';
      console.error('[GuidedOnboarding] Update error:', updateError);
      setError(message);
    } finally {
      setIsUpdating(false);
    }
  }, [extractedData, isUpdating]);

  const handleComplete = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setPhase('complete');
    onComplete(extractedData, assumptions);
  }, [assumptions, extractedData, onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    onSkip();
  }, [onSkip]);

  const loadPreset = useCallback(() => {
    setProfile(profileFromExtractedData(ADMIN_PRESETS.admin1));
    setShowOptional(true);
    setPhase('profile');
    setSummary('');
    setAssumptions([]);
    setExtractedData({});
    setError(null);
  }, []);

  const requiredProgress = useMemo(() => {
    const fields = [
      parseInteger(profile.age) !== undefined,
      isMarried ? parseInteger(profile.spouseAge) !== undefined : true,
      normalizeState(profile.state) !== undefined,
      parseMoney(profile.primaryIncome) !== undefined,
      isMarried ? parseMoney(profile.spouseIncome) !== undefined : true,
      parseInteger(profile.retirementAge) !== undefined,
    ];
    const complete = fields.filter(Boolean).length;
    return { complete, total: fields.length };
  }, [isMarried, profile]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-background">
      <header className="shrink-0 flex items-center justify-between px-3 py-2 sm:px-6 sm:py-3 border-b">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8"
              aria-label="Go back to mode selection"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-foreground">
              Guided Setup
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {phase === 'profile' && `${requiredProgress.complete}/${requiredProgress.total} essentials complete`}
              {phase === 'review' && 'Review your plan'}
              {phase === 'complete' && 'Complete'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSkip}
          className="text-xs min-h-[32px] px-3"
          aria-label="Skip guided setup and proceed to manual data entry"
        >
          Skip
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto px-3 py-5 sm:px-6 sm:py-8 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
            >
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Check this before continuing</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {phase === 'profile' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <section className="rounded-xl border bg-card p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      Fast plan setup
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                      Start with the facts that actually move the math.
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                      Fill the essentials, add any known expense or savings details, then review every assumption before it touches the calculator.
                    </p>
                  </div>
                  {SHOW_DEV_PRESET && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={loadPreset}
                      className="shrink-0"
                    >
                      Load test profile
                    </Button>
                  )}
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <Label className="text-sm font-semibold">Household</Label>
                    <SegmentedControl
                      value={profile.maritalStatus}
                      onChange={(value) => updateProfile('maritalStatus', value)}
                      options={[
                        { value: 'single', label: 'Single' },
                        { value: 'married', label: 'Married' },
                      ]}
                      className="mt-2 grid-cols-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <NumberField
                      id="guided-age"
                      label="Your age"
                      value={profile.age}
                      onChange={(value) => updateProfile('age', value)}
                      placeholder="35"
                    />
                    {isMarried && (
                      <NumberField
                        id="guided-spouse-age"
                        label="Spouse age"
                        value={profile.spouseAge}
                        onChange={(value) => updateProfile('spouseAge', value)}
                        placeholder="34"
                      />
                    )}
                    <TextField
                      id="guided-state"
                      label="State"
                      value={profile.state}
                      onChange={(value) => updateProfile('state', value)}
                      placeholder="TX"
                    />
                    <NumberField
                      id="guided-children"
                      label="Children"
                      value={profile.numChildren}
                      onChange={(value) => updateProfile('numChildren', value)}
                      placeholder="0"
                      min={0}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border bg-card p-4 sm:p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold">Your income type</Label>
                      <SegmentedControl
                        value={profile.employmentType1}
                        onChange={(value) => updateProfile('employmentType1', value)}
                        options={employmentOptions}
                        className="mt-2 grid-cols-2"
                      />
                    </div>
                    <MoneyField
                      id="guided-primary-income"
                      label="Your annual income"
                      value={profile.primaryIncome}
                      onChange={(value) => updateProfile('primaryIncome', value)}
                      onBlur={() => formatMoneyField('primaryIncome')}
                      placeholder="$750,000"
                    />
                  </div>

                  {isMarried && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold">Spouse income type</Label>
                        <SegmentedControl
                          value={profile.employmentType2}
                          onChange={(value) => updateProfile('employmentType2', value)}
                          options={employmentOptions}
                          className="mt-2 grid-cols-2"
                        />
                      </div>
                      <MoneyField
                        id="guided-spouse-income"
                        label="Spouse annual income"
                        value={profile.spouseIncome}
                        onChange={(value) => updateProfile('spouseIncome', value)}
                        onBlur={() => formatMoneyField('spouseIncome')}
                        placeholder="$145,000"
                      />
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-xl border bg-card p-4 sm:p-6">
                <button
                  type="button"
                  onClick={() => setShowOptional((value) => !value)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                  aria-expanded={showOptional}
                >
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      Optional, but high-impact
                    </span>
                    <span className="block text-sm text-muted-foreground mt-1">
                      Add these when you know them. Otherwise they become editable assumptions.
                    </span>
                  </span>
                  <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
                    {showOptional ? 'Hide' : 'Show'}
                  </span>
                </button>

                {showOptional && (
                  <div className="mt-5 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <NumberField
                        id="guided-retirement-age"
                        label="Retirement age"
                        value={profile.retirementAge}
                        onChange={(value) => updateProfile('retirementAge', value)}
                        placeholder="65"
                      />
                      <MoneyField
                        id="guided-housing"
                        label="Mortgage / rent"
                        value={profile.monthlyMortgageRent}
                        onChange={(value) => updateProfile('monthlyMortgageRent', value)}
                        onBlur={() => formatMoneyField('monthlyMortgageRent')}
                        placeholder="$5,859 / mo"
                      />
                      <MoneyField
                        id="guided-property-insurance"
                        label="Property tax + insurance"
                        value={profile.monthlyInsurancePropertyTax}
                        onChange={(value) => updateProfile('monthlyInsurancePropertyTax', value)}
                        onBlur={() => formatMoneyField('monthlyInsurancePropertyTax')}
                        placeholder="$3,375 / mo"
                      />
                      <MoneyField
                        id="guided-childcare"
                        label="Childcare"
                        value={profile.monthlyChildcare}
                        onChange={(value) => updateProfile('monthlyChildcare', value)}
                        onBlur={() => formatMoneyField('monthlyChildcare')}
                        placeholder="$1,500 / mo"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <MoneyField
                        id="guided-pretax-balance"
                        label="Pre-tax accounts"
                        value={profile.currentTraditional}
                        onChange={(value) => updateProfile('currentTraditional', value)}
                        onBlur={() => formatMoneyField('currentTraditional')}
                        placeholder="$400,000"
                      />
                      <MoneyField
                        id="guided-roth-balance"
                        label="Roth accounts"
                        value={profile.currentRoth}
                        onChange={(value) => updateProfile('currentRoth', value)}
                        onBlur={() => formatMoneyField('currentRoth')}
                        placeholder="$128,000"
                      />
                      <MoneyField
                        id="guided-taxable-balance"
                        label="Taxable brokerage"
                        value={profile.currentTaxable}
                        onChange={(value) => updateProfile('currentTaxable', value)}
                        onBlur={() => formatMoneyField('currentTaxable')}
                        placeholder="$74,000"
                      />
                      <MoneyField
                        id="guided-cash"
                        label="Cash / emergency fund"
                        value={profile.emergencyFund}
                        onChange={(value) => updateProfile('emergencyFund', value)}
                        onBlur={() => formatMoneyField('emergencyFund')}
                        placeholder="$80,000"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <MoneyField
                        id="guided-pretax-contrib"
                        label="Annual pre-tax savings"
                        value={profile.contributionTraditional}
                        onChange={(value) => updateProfile('contributionTraditional', value)}
                        onBlur={() => formatMoneyField('contributionTraditional')}
                        placeholder="$96,500"
                      />
                      <MoneyField
                        id="guided-roth-contrib"
                        label="Annual Roth savings"
                        value={profile.contributionRoth}
                        onChange={(value) => updateProfile('contributionRoth', value)}
                        onBlur={() => formatMoneyField('contributionRoth')}
                        placeholder="$15,000"
                      />
                      <MoneyField
                        id="guided-taxable-contrib"
                        label="Annual taxable savings"
                        value={profile.contributionTaxable}
                        onChange={(value) => updateProfile('contributionTaxable', value)}
                        onBlur={() => formatMoneyField('contributionTaxable')}
                        placeholder="$100,000"
                      />
                      <MoneyField
                        id="guided-match"
                        label="Annual employer match"
                        value={profile.contributionMatch}
                        onChange={(value) => updateProfile('contributionMatch', value)}
                        onBlur={() => formatMoneyField('contributionMatch')}
                        placeholder="$15,000"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <MoneyField
                        id="guided-healthcare-self"
                        label="Your healthcare premium"
                        value={profile.monthlyHealthcareP1}
                        onChange={(value) => updateProfile('monthlyHealthcareP1', value)}
                        onBlur={() => formatMoneyField('monthlyHealthcareP1')}
                        placeholder="$1,000 / mo"
                      />
                      {isMarried && (
                        <MoneyField
                          id="guided-healthcare-spouse"
                          label="Spouse healthcare premium"
                          value={profile.monthlyHealthcareP2}
                          onChange={(value) => updateProfile('monthlyHealthcareP2', value)}
                          onBlur={() => formatMoneyField('monthlyHealthcareP2')}
                          placeholder="$1,000 / mo"
                        />
                      )}
                      <MoneyField
                        id="guided-retirement-spending"
                        label="Desired retirement spending (today's dollars)"
                        value={profile.desiredRetirementSpending}
                        onChange={(value) => updateProfile('desiredRetirementSpending', value)}
                        onBlur={() => formatMoneyField('desiredRetirementSpending')}
                        placeholder="$250,000 / yr today"
                      />
                    </div>
                  </div>
                )}
              </section>

              <div className="sticky bottom-0 z-10 -mx-3 border-t bg-background/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6">
                <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Missing optional values will be shown as editable assumptions before the full calculator opens.
                  </p>
                  <Button type="submit" disabled={isProcessing} className="min-h-[44px] px-6">
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Building review...
                      </>
                    ) : (
                      <>
                        Review assumptions
                        <CheckCircle2 className="ml-2 h-4 w-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {visibleAssumptions && (
            <section className="space-y-5">
              <div className="rounded-xl border bg-card p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-950/40 dark:text-green-300">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      First pass ready
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-foreground">
                      Review the assumptions before building the full plan.
                    </h3>
                    {summary && (
                      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                        {summary}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setPhase('profile')}
                    className="shrink-0"
                  >
                    Edit profile
                  </Button>
                </div>
              </div>

              <ProfileValuesPanel data={extractedData} />

              <AssumptionsReview
                assumptions={assumptions}
                onUpdateAssumptions={handleUpdateAssumptions}
                isUpdating={isUpdating}
              />

              <div className="flex justify-center gap-4 py-4">
                <Button
                  onClick={handleComplete}
                  disabled={isUpdating}
                  className="min-h-[48px] px-6"
                  aria-label="Confirm and complete onboarding"
                >
                  These Look Right — Build My Plan
                </Button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function ProfileValuesPanel({ data }: { data: ExtractedData }) {
  const isMarried = data.maritalStatus === 'married';
  const combinedIncome = (data.primaryIncome ?? 0) + (data.spouseIncome ?? 0);
  const yearsToRetirement = Math.max(0, (data.retirementAge ?? data.age ?? 0) - (data.age ?? 0));
  const nominalRetirementSpending = futureNominalValue(data.desiredRetirementSpending, yearsToRetirement);
  const totalAnnualSavings =
    (data.contributionTraditional ?? 0) +
    (data.contributionRoth ?? 0) +
    (data.contributionTaxable ?? 0) +
    (data.contributionMatch ?? 0);

  const rows = [
    {
      label: 'Household',
      value: [
        isMarried ? 'Married' : 'Single',
        data.state,
        data.age ? `age ${data.age}` : undefined,
        isMarried && data.spouseAge ? `spouse ${data.spouseAge}` : undefined,
        data.numChildren !== undefined ? `${data.numChildren} kid${data.numChildren === 1 ? '' : 's'}` : undefined,
      ].filter(Boolean).join(' · '),
    },
    {
      label: 'Income',
      value: `${currencyForDisplay(data.primaryIncome)} ${employmentLabel(data.employmentType1)}${
        isMarried ? ` + ${currencyForDisplay(data.spouseIncome)} ${employmentLabel(data.employmentType2)}` : ''
      }`,
    },
    {
      label: 'Combined income',
      value: currencyForDisplay(combinedIncome || undefined),
    },
    {
      label: 'Housing',
      value: `${currencyForDisplay(data.monthlyMortgageRent)} mortgage/rent · ${currencyForDisplay(data.monthlyInsurancePropertyTax)} tax/insurance`,
    },
    {
      label: 'Childcare',
      value: currencyForDisplay(data.monthlyChildcare),
    },
    {
      label: 'Current portfolio',
      value: `${currencyForDisplay(data.currentTraditional)} pre-tax · ${currencyForDisplay(data.currentRoth)} Roth · ${currencyForDisplay(data.currentTaxable)} taxable`,
    },
    {
      label: 'Annual savings',
      value: currencyForDisplay(totalAnnualSavings || undefined),
    },
    {
      label: 'Retirement target',
      value: `Age ${data.retirementAge ?? 'not provided'} · ${currencyForDisplay(data.desiredRetirementSpending)} today${
        nominalRetirementSpending
          ? ` (~${currencyForDisplay(nominalRetirementSpending)} nominal in year one)`
          : ''
      }`,
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-foreground">Profile values carried into the plan</h3>
        <p className="text-sm text-muted-foreground">
          These are the values you supplied or confirmed before the assumption engine fills the gaps below.
        </p>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border bg-background p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  min,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; description?: string }>;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-2', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              'rounded-lg border px-3 py-2 text-left transition-colors',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background hover:bg-muted'
            )}
          >
            <span className="block text-sm font-medium">{option.label}</span>
            {option.description && (
              <span className="block text-xs text-muted-foreground mt-0.5">
                {option.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
