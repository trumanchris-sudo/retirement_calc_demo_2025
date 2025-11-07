# Retirement Calculator - Design System

## Overall Theme & Mood

**Core Feeling:** Clean, Trustworthy & Sophisticated with Modern Financial Flair

**Visual Inspiration:**
- Linear.app's subtle gradients and dark mode
- Stripe.com's generous whitespace and professional aesthetic
- Modern fintech apps (smooth animations, clear hierarchy)

**Key Principles:**
- Build trust through clarity and professionalism
- Make complex financial data approachable
- Guide users through the calculation journey
- Celebrate positive outcomes with tasteful visual flair

---

## Color Palette

### Light Mode
- **Background Base:** `#FFFFFF` (Pure white)
- **Surface/Card:** `#FAFBFC` (Off-white for subtle elevation)
- **Text Primary:** `#0F172A` (Slate 900 - near black)
- **Text Secondary:** `#64748B` (Slate 500 - muted)

### Dark Mode
- **Background Base:** `#0F172A` (Slate 900)
- **Surface/Card:** `#1E293B` (Slate 800)
- **Text Primary:** `#F8FAFC` (Slate 50)
- **Text Secondary:** `#94A3B8` (Slate 400)

### Brand & Accent Colors
- **Primary (Financial Blue):** `#2563EB` (Blue 600) → Used for CTAs, key actions
- **Primary Gradient:** `linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)`
- **Success (Growth Green):** `#10B981` (Emerald 500) → Positive outcomes, growth
- **Warning (Alert Amber):** `#F59E0B` (Amber 500) → Alerts, RMD warnings
- **Danger (Loss Red):** `#EF4444` (Red 500) → Errors, negative scenarios

### Chart Colors (Recharts Palette)
- **Nominal Returns:** `#3B82F6` (Blue 500)
- **Real Returns:** `#8B5CF6` (Violet 500)
- **10th Percentile:** `#F59E0B` (Amber 500, dashed)
- **90th Percentile:** `#10B981` (Emerald 500, dashed)
- **Spaghetti Lines:** `#94A3B8` (Slate 400, low opacity)

### Gradient Overlays
- **Hero Gradient:** `linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)`
- **Success Card Glow:** `radial-gradient(120% 120% at 50% -10%, rgba(16, 185, 129, 0.15), transparent 50%)`
- **Premium Legacy Gradient:** Keep existing blue gradient from LegacyResultCard

---

## Typography

### Font Families
- **Headlines:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Body:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Monospace (Numbers):** `'JetBrains Mono', 'Fira Code', monospace`

### Hierarchy
- **Display (Hero):** 48-56px, font-weight: 700, letter-spacing: -0.02em
- **H1 (Section Headers):** 32-36px, font-weight: 600
- **H2 (Card Titles):** 20-24px, font-weight: 600
- **H3 (Subsections):** 18px, font-weight: 600
- **Body (Default):** 16px, font-weight: 400, line-height: 1.6
- **Small (Labels):** 14px, font-weight: 500
- **Tiny (Captions):** 12px, font-weight: 400

### Number Formatting
- Use tabular numbers for alignment
- Monospace font for large financial figures
- Smooth counting animations for stat reveals

---

## Layout & Spacing

### Layout Approach
- **Container Width:** `max-w-7xl` (1280px) for main content
- **Full-bleed:** Hero section, chart backgrounds
- **Sidebar Pattern:** Future enhancement - settings/presets sidebar

### Spacing Scale (Tailwind-based)
- **Generous whitespace:** Use 8px base scale (space-2, space-4, space-6, space-8, etc.)
- **Section Gaps:** 80-120px (space-20 to space-32)
- **Card Padding:** 24-32px (space-6 to space-8)
- **Form Element Spacing:** 16-24px (space-4 to space-6)

### Grid Systems
- **Results Cards:** 4-column grid on desktop → 2-column tablet → 1-column mobile
- **Input Sections:** 2-column grid for related fields
- **Chart Grid:** Full-width with contained labels

---

## Component Design Patterns

### Buttons
- **Primary CTA:** Gradient background, rounded-lg, shadow-lg, hover: scale + brightness
- **Secondary:** Border, transparent bg, hover: bg-slate-50
- **Ghost:** No border, hover: bg-slate-100
- **Icon Buttons:** Circular, subtle hover states

### Input Fields
- **Text Inputs:** Minimal borders, focus ring (blue 500), rounded corners
- **Sliders:** Custom styled with gradient track fill, large thumb
- **Toggles/Checkboxes:** Modern switch components, smooth transitions

### Cards
- **Result Cards:** Subtle shadow, rounded-xl, hover: lift effect (translateY -2px)
- **Flipping Cards:** Keep existing 3D flip, enhance styling
- **Glass Cards:** backdrop-blur for floating elements
- **Bordered Cards:** 1px border, no shadow for nested content

### Charts
- **Background:** Subtle grid, light background overlay
- **Lines:** Smooth curves, gradient fills for area charts
- **Tooltips:** Glass effect, rounded corners, drop shadow
- **Axes:** Minimal, light gray, clear labels

---

## Micro-interactions & Animation

### Timing Functions
- **Fast:** 150ms (hover states, small UI changes)
- **Medium:** 300ms (card flips, reveals)
- **Slow:** 500ms (page transitions, large animations)
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out)

### Interaction Patterns
- **Hover States:** Subtle scale (1.02), brightness increase, lift effect
- **Click/Active:** Scale down (0.98), brightness decrease
- **Loading:** Skeleton loaders with shimmer effect
- **Success:** Gentle bounce + color pulse
- **Error Shake:** 3-frame shake animation

### Scroll Animations
- **Fade-in/Slide-up:** Results cards on reveal
- **Parallax:** Subtle background gradients
- **Sticky Elements:** Header on scroll

### Number Counting
- **Odometer Effect:** Smooth counting animation for large numbers
- **Duration:** 1-1.5s for dramatic effect
- **Format:** Maintain currency/percentage formatting during animation

---

## Page Structure

### Hero Section
```
┌─────────────────────────────────────────┐
│  BACKGROUND: Gradient overlay           │
│                                         │
│  🏆 Tax-Aware Retirement Calculator     │
│  [Large headline with gradient text]    │
│                                         │
│  [Compelling subtitle about financial   │
│   independence and smart planning]      │
│                                         │
│  [Scroll indicator / CTA]               │
└─────────────────────────────────────────┘
```

### Input Form (Progressive Disclosure)
```
┌─────────────────────────────────────────┐
│  📊 Build Your Plan                     │
│  ─────────────────────────────────────  │
│                                         │
│  ▼ Personal Information [Always Open]   │
│    [2-column grid: age, status fields]  │
│                                         │
│  ▼ Current Balances [Always Open]       │
│    [3-column grid: Taxable/Pre/Post]    │
│    [Total balance preview]              │
│                                         │
│  ▶ Annual Contributions [Collapsed]     │
│                                         │
│  ▶ Advanced Assumptions [Collapsed]     │
│                                         │
│  ▶ Social Security (Optional)           │
│                                         │
│  ▶ Generational Wealth (Optional)       │
│                                         │
│  [CALCULATE BUTTON - Gradient, Large]   │
└─────────────────────────────────────────┘
```

### Results Section
```
┌─────────────────────────────────────────┐
│  🎉 Your Retirement Projection          │
│  ─────────────────────────────────────  │
│                                         │
│  [4-column grid of flipping stat cards] │
│  │ Future │ Today's │ Annual │ After- ││
│  │Balance │ Dollars │Withdraw│Tax Inc ││
│                                         │
│  [Full-width area chart]                │
│  Accumulation Projection                │
│                                         │
│  [2-column grid]                        │
│  │ Tax Breakdown │ Account Mix │       │
│  │  Pie Chart    │  Pie Chart  │       │
│                                         │
│  [Full-width line chart]                │
│  RMD Analysis (if applicable)           │
│                                         │
│  [Legacy Card - if enabled]             │
│                                         │
│  [AI Insights Section]                  │
│  💡 Plan Analysis                       │
└─────────────────────────────────────────┘
```

---

## Accessibility

- **Color Contrast:** WCAG AA minimum (4.5:1 for text)
- **Focus Indicators:** Clear blue rings on all interactive elements
- **Keyboard Navigation:** Full support, logical tab order
- **Screen Readers:** Semantic HTML, aria-labels where needed
- **Motion Preferences:** Respect `prefers-reduced-motion`
- **Dark Mode:** Complete theme coverage, automatic detection

---

## Implementation Notes

### CSS Strategy
- **Tailwind First:** Use utility classes for rapid iteration
- **Custom CSS:** Only for complex animations and 3D effects
- **CSS Variables:** Leverage existing HSL theme variables
- **Component-scoped:** Keep CSS modules for FlippingCard, LegacyCard

### Component Library
- **shadcn/ui:** Continue using for base components
- **Radix Primitives:** Leverage for accessible interactions
- **Lucide Icons:** Consistent icon system
- **Recharts:** Enhanced with custom styling

### Performance
- **Code Splitting:** Lazy load charts and heavy components
- **Image Optimization:** Use Next.js Image component
- **Animation Performance:** Use transform/opacity for GPU acceleration
- **Debounce:** Input validation and calculations

---

## Next Steps

1. ✅ Document design system
2. Create hero section component
3. Refactor input form with progressive disclosure
4. Enhance stat cards with counting animations
5. Restyle charts with new color palette
6. Add loading states and micro-interactions
7. Test responsive design
8. Validate dark mode coverage
