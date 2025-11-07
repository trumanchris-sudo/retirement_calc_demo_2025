# Component Architecture Plan

## Directory Structure

```
components/
├── layout/
│   ├── Hero.tsx                    # Hero section with gradient background
│   ├── PageHeader.tsx              # App header with dark mode toggle
│   └── Section.tsx                 # Reusable section wrapper
│
├── form/
│   ├── PersonalInfoSection.tsx     # Age, marital status inputs
│   ├── BalancesSection.tsx         # Current account balances
│   ├── ContributionsSection.tsx    # Annual contributions (collapsible)
│   ├── AssumptionsSection.tsx      # Return rate, inflation, etc. (collapsible)
│   ├── SocialSecuritySection.tsx   # SS benefits (optional)
│   ├── GenerationalWealthSection.tsx # Legacy modeling (optional)
│   ├── CollapsibleSection.tsx      # Reusable accordion wrapper
│   ├── SliderInput.tsx             # Custom slider with live value
│   ├── NumberInput.tsx             # Formatted number input
│   └── CalculateButton.tsx         # Large gradient CTA button
│
├── results/
│   ├── ResultsGrid.tsx             # 4-column stat card grid
│   ├── StatCard.tsx                # Individual metric card
│   ├── AnimatedStatCard.tsx        # Stat card with counting animation
│   ├── AccumulationChart.tsx       # Area chart for projections
│   ├── TaxBreakdownChart.tsx       # Pie chart for taxes
│   ├── AccountMixChart.tsx         # Pie chart for account types
│   ├── RMDAnalysisChart.tsx        # Line chart for RMD warnings
│   ├── AIInsightsSection.tsx       # Claude analysis panel
│   └── ChartContainer.tsx          # Reusable chart wrapper with title
│
├── ui/
│   ├── AnimatedNumber.tsx          # Counting animation for numbers
│   ├── LoadingSpinner.tsx          # Loading state indicator
│   ├── SkeletonCard.tsx            # Loading placeholder for cards
│   └── ErrorMessage.tsx            # Error display component
│   └── (existing shadcn/ui components...)
│
├── FlippingCard.tsx                # Keep existing, enhance styling
├── LegacyResultCard.tsx            # Keep existing, enhance styling
└── ...
```

---

## Component Specifications

### Layout Components

#### `Hero.tsx`
```tsx
interface HeroProps {
  title: string;
  subtitle: string;
  showScrollIndicator?: boolean;
}
```
**Purpose:** Eye-catching hero section with gradient background
**Features:**
- Gradient overlay background
- Large display typography
- Optional scroll indicator animation
- Responsive text sizing

---

#### `PageHeader.tsx`
```tsx
interface PageHeaderProps {
  showActions?: boolean; // Show print/share buttons
  onToggleDarkMode: () => void;
}
```
**Purpose:** Top navigation with logo and utilities
**Features:**
- Dark mode toggle
- Print/Share buttons (conditional)
- Sticky on scroll
- Smooth transitions

---

#### `Section.tsx`
```tsx
interface SectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  background?: 'default' | 'muted' | 'gradient';
}
```
**Purpose:** Consistent section wrapper with optional header
**Features:**
- Automatic spacing and margins
- Optional background variants
- Title/subtitle support
- Container width management

---

### Form Components

#### `CollapsibleSection.tsx`
```tsx
interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  badge?: string | number; // Show count/status
  children: React.ReactNode;
}
```
**Purpose:** Accordion-style form section
**Features:**
- Smooth expand/collapse animation
- Chevron icon rotation
- Optional badge for summary info
- Accessible keyboard support

---

#### `SliderInput.tsx`
```tsx
interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string; // %, $, years
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  description?: string;
}
```
**Purpose:** Enhanced slider with live value display
**Features:**
- Gradient track fill
- Large, grabbable thumb
- Live value tooltip
- Formatted display (currency, percentage)
- Optional helper text

---

#### `NumberInput.tsx`
```tsx
interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string; // $
  suffix?: string; // %, years
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  error?: string;
}
```
**Purpose:** Formatted numeric input with validation
**Features:**
- Auto-formatting (currency, percentages)
- Prefix/suffix display
- Error state styling
- Focus ring
- Optional description

---

#### `PersonalInfoSection.tsx`
**Purpose:** Age and marital status inputs
**Fields:**
- Marital status toggle (Single/Married)
- Your age
- Spouse age (conditional)
- Retirement age

**Features:**
- 2-column responsive grid
- Conditional spouse field
- Age validation

---

#### `BalancesSection.tsx`
**Purpose:** Current account balances
**Fields:**
- Taxable brokerage
- Pre-tax (401k/IRA)
- Post-tax (Roth)
- Total balance display (calculated)

**Features:**
- 3-column grid on desktop
- Auto-calculating total
- Large, clear currency formatting
- Visual separator for total

---

#### `ContributionsSection.tsx`
**Purpose:** Annual contribution inputs (collapsible)
**Fields:**
- Contributions for primary (taxable, pre-tax, post-tax)
- Employer match
- Spouse contributions (conditional)
- "Increase annually" toggle
- Increase rate % (conditional)

**Features:**
- Collapsible by default
- Dual-column for primary/spouse
- Conditional field visibility
- Summary badge showing total contributions

---

#### `AssumptionsSection.tsx`
**Purpose:** Advanced calculation parameters (collapsible)
**Fields:**
- Return rate slider
- Inflation rate slider
- State tax rate
- Return model selector (Fixed/Random Walk)
- Series basis (Nominal/Real/Truly Random)
- Seed input
- Withdrawal rate slider

**Features:**
- Collapsible by default
- Sliders for key rates
- Conditional seed field
- Tooltips explaining each assumption

---

#### `CalculateButton.tsx`
```tsx
interface CalculateButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
}
```
**Purpose:** Primary CTA to run calculation
**Features:**
- Large, gradient background
- Loading spinner state
- Disabled state styling
- Error message display below
- Pulse animation to draw attention

---

### Results Components

#### `AnimatedStatCard.tsx`
```tsx
interface AnimatedStatCardProps {
  label: string;
  value: number;
  format: 'currency' | 'number' | 'percentage';
  sublabel?: string;
  change?: number; // For +/- indicators
  icon?: React.ReactNode;
  delay?: number; // Stagger animations
}
```
**Purpose:** Stat card with counting animation
**Features:**
- Odometer-style counting animation
- Currency/percentage formatting
- Optional change indicator (+5%)
- Icon support
- Staggered entrance animation
- Optional flip-to-reveal detail

---

#### `ResultsGrid.tsx`
```tsx
interface ResultsGridProps {
  stats: Array<StatData>;
  loading?: boolean;
}
```
**Purpose:** Responsive grid for stat cards
**Features:**
- 4-col desktop → 2-col tablet → 1-col mobile
- Skeleton loaders during calculation
- Staggered fade-in animation
- Even spacing and alignment

---

#### `AccumulationChart.tsx`
```tsx
interface AccumulationChartProps {
  data: Array<{year: number; nominal: number; real: number; p10?: number; p90?: number}>;
  showPercentiles: boolean;
  spaghettiData?: Array<Array<{year: number; value: number}>>;
  showSpaghetti: boolean;
}
```
**Purpose:** Main projection area chart
**Features:**
- Gradient fill under curves
- Dashed percentile lines
- Optional spaghetti overlay
- Responsive sizing
- Custom tooltip with all data points
- Legend with toggle controls

---

#### `TaxBreakdownChart.tsx`
```tsx
interface TaxBreakdownChartProps {
  data: {
    federalOrdinary: number;
    federalCapGains: number;
    niit: number;
    state: number;
  };
}
```
**Purpose:** Pie chart showing tax composition
**Features:**
- Color-coded segments
- Percentage labels
- Interactive hover states
- Legend
- Empty state if no taxes

---

#### `RMDAnalysisChart.tsx`
```tsx
interface RMDAnalysisChartProps {
  data: Array<{age: number; rmd: number; spending: number}>;
  showWarning: boolean;
}
```
**Purpose:** Line chart comparing RMDs to spending
**Features:**
- Dual Y-axis lines
- Warning badge if RMD > spending
- Age-based X-axis
- Highlight crossover point
- Conditional rendering (only show if RMDs apply)

---

#### `AIInsightsSection.tsx`
```tsx
interface AIInsightsSectionProps {
  planData: FullPlanData;
  autoGenerate?: boolean;
}
```
**Purpose:** Claude-powered insights panel
**Features:**
- Auto-generated analysis on calculation
- "Ask Claude" interactive Q&A
- Loading states
- Error handling
- Markdown rendering for responses
- Collapsible for power users

---

### Utility Components

#### `AnimatedNumber.tsx`
```tsx
interface AnimatedNumberProps {
  value: number;
  duration?: number; // ms
  format?: (n: number) => string;
  delay?: number;
}
```
**Purpose:** Smooth counting animation for numbers
**Features:**
- Configurable duration
- Custom formatting function
- Stagger delay support
- Easing function
- Maintains formatting during animation

---

#### `LoadingSpinner.tsx`
```tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}
```
**Purpose:** Loading indicator
**Features:**
- Multiple sizes
- Spin animation
- Theme-aware colors
- Accessible (aria-label)

---

#### `SkeletonCard.tsx`
```tsx
interface SkeletonCardProps {
  variant?: 'stat' | 'chart' | 'text';
  count?: number;
}
```
**Purpose:** Placeholder during loading
**Features:**
- Shimmer animation
- Multiple variants for different content types
- Matches real content dimensions
- Theme-aware colors

---

#### `ErrorMessage.tsx`
```tsx
interface ErrorMessageProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
}
```
**Purpose:** Error display component
**Features:**
- Red accent styling
- Icon indicator
- Optional dismiss button
- Smooth entrance animation
- Accessible (role="alert")

---

## Enhanced Existing Components

### `FlippingCard.tsx` (Modifications)
**Enhancements:**
- Update styling to match new design system
- Add gradient accents
- Smooth shadow transitions
- Better dark mode support
- Optional icon prop
- Loading state variant

### `LegacyResultCard.tsx` (Modifications)
**Enhancements:**
- Maintain existing gradient
- Add entrance animation
- Hover lift effect
- Icon size adjustments
- Responsive font sizing

---

## State Management Strategy

### Current Approach
- All state in `app/page.tsx`
- Props drilling to child components

### Recommended Improvements (Future)
- Consider context for form state
- Zustand for global UI state (dark mode, loading)
- Form library (React Hook Form) for validation

---

## Implementation Order

1. ✅ Define architecture
2. Create layout components (Hero, Section, PageHeader)
3. Create utility components (AnimatedNumber, LoadingSpinner, ErrorMessage)
4. Create form components (start with simple, build to complex)
5. Refactor main page to use new form components
6. Create results components
7. Enhance existing FlippingCard and LegacyResultCard
8. Add micro-interactions and polish
9. Test and refine responsive design
10. Validate accessibility

---

## Migration Strategy

Since `app/page.tsx` is currently 126KB and monolithic:

1. **Phase 1:** Create new components without touching page.tsx
2. **Phase 2:** Extract one section at a time (start with Hero)
3. **Phase 3:** Replace sections incrementally (test after each)
4. **Phase 4:** Final cleanup and optimization

This allows testing at each step without breaking the existing calculator.
