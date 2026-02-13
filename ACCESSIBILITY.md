# Accessibility (a11y) Documentation

This document outlines the accessibility features, standards, and best practices implemented in the Retirement Calculator application.

## WCAG 2.1 AA Compliance

The application is designed to meet **WCAG 2.1 Level AA** standards. This ensures the calculator is usable by people with various disabilities, including visual, auditory, motor, and cognitive impairments.

## Table of Contents

1. [Keyboard Navigation](#keyboard-navigation)
2. [Screen Reader Support](#screen-reader-support)
3. [Focus Management](#focus-management)
4. [Color and Contrast](#color-and-contrast)
5. [Skip Navigation](#skip-navigation)
6. [ARIA Implementation](#aria-implementation)
7. [Components Reference](#components-reference)
8. [Testing](#testing)
9. [Best Practices for Contributors](#best-practices-for-contributors)

---

## Keyboard Navigation

### Global Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Move focus to next interactive element |
| `Shift + Tab` | Move focus to previous interactive element |
| `Enter` / `Space` | Activate focused button or link |
| `Escape` | Close modals, dropdowns, or tooltips |
| `Ctrl/Cmd + Enter` | Submit calculation (when in form) |

### Tab Navigation

The main tab navigation (`TabNavigation.tsx`) implements the WAI-ARIA Tabs pattern:

| Key | Action |
|-----|--------|
| `Arrow Left` / `Arrow Up` | Move to previous tab |
| `Arrow Right` / `Arrow Down` | Move to next tab |
| `Home` | Move to first tab |
| `End` | Move to last tab |
| `Enter` / `Space` | Activate tab |

### Form Navigation

- All form inputs are keyboard accessible
- Sliders support arrow key navigation with appropriate step values
- Number inputs support increment/decrement with arrow keys
- `Ctrl/Cmd + A` selects all text in numeric inputs

### Tab Order

The application follows a logical tab order:

1. Skip link (visible on focus)
2. Header navigation and controls
3. Main tab navigation
4. Active panel content (inputs, buttons)
5. Results section (when visible)
6. Footer elements

---

## Screen Reader Support

### Live Regions

The application uses ARIA live regions to announce dynamic content changes:

```tsx
// Import the announcement utility
import { announceToScreenReader } from "@/components/a11y/LiveRegion";

// Announce calculation progress
announceToScreenReader("Calculating your retirement projection...", "polite");

// Announce urgent errors
announceToScreenReader("Error: Invalid input value", "assertive");
```

### Live Region Components

Located in `/components/a11y/LiveRegion.tsx`:

- **`LiveRegion`**: Root-level component for global announcements
- **`LiveRegionProvider`**: React context provider for component-level announcements
- **`useLiveRegion`**: Hook for announcing from any component
- **`announceToScreenReader`**: Utility function for DOM-based announcements

### Screen Reader Text

Use `ScreenReaderOnly` components for content only visible to screen readers:

```tsx
import { ScreenReaderOnly, ScreenReaderHeading } from "@/components/a11y/ScreenReaderOnly";

// Hidden text for context
<ScreenReaderOnly>Additional context for screen readers</ScreenReaderOnly>

// Hidden section headings
<ScreenReaderHeading level={2}>Results Summary</ScreenReaderHeading>

// Accessible icons
<AccessibleIcon label="Settings">
  <SettingsIcon aria-hidden="true" />
</AccessibleIcon>
```

---

## Focus Management

### Focus Indicators

All interactive elements have visible focus indicators:

```css
/* Base focus style */
:focus-visible {
  outline: 3px solid hsl(217.2 91.2% 59.8%);
  outline-offset: 2px;
}

/* Enhanced focus for buttons, inputs, etc. */
button:focus-visible,
input:focus-visible {
  outline: 3px solid hsl(217.2 91.2% 59.8%);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}
```

### Focus Trap

For modal dialogs and overlays, use the `FocusTrap` component:

```tsx
import { FocusTrap } from "@/components/a11y/ScreenReaderOnly";

<FocusTrap active={isModalOpen}>
  <dialog>
    {/* Modal content - focus cannot escape */}
  </dialog>
</FocusTrap>
```

### Focus Restoration

When closing modals or navigating away, focus is restored to the previously focused element.

---

## Color and Contrast

### WCAG AA Requirements

- **Normal text**: Minimum contrast ratio of 4.5:1
- **Large text** (18px+ or 14px bold): Minimum contrast ratio of 3:1
- **UI components**: Minimum contrast ratio of 3:1

### Color Variables

Colors are defined in CSS custom properties with both light and dark mode variants:

```css
/* Light mode - meets 4.5:1 contrast */
:root {
  --foreground: 0 0% 3.9%;      /* Very dark text */
  --muted-foreground: 0 0% 45%; /* Muted text meets 4.5:1 */
}

/* Dark mode */
.dark {
  --foreground: 0 0% 98%;       /* Very light text */
  --muted-foreground: 0 0% 64%; /* Adjusted for dark backgrounds */
}
```

### Enhanced Contrast Classes

```css
.text-muted-enhanced  /* Higher contrast muted text */
.text-error           /* Accessible error color */
.text-success         /* Accessible success color */
.text-warning         /* Accessible warning color */
```

### High Contrast Mode

The application respects `prefers-contrast: high`:

```css
@media (prefers-contrast: high) {
  button, input, select {
    border-width: 2px;
  }
}
```

### Color Not Sole Indicator

- Error states use both color AND icons/text
- Success states include checkmarks
- Progress indicators include percentage text
- Chart data points use patterns in addition to colors

---

## Skip Navigation

The skip link allows keyboard users to bypass repetitive navigation:

```tsx
// In layout.tsx
<SkipLink />

// Targets the main content landmark
<main id="main-content" tabIndex={-1}>
```

### Skip Link Behavior

1. Hidden by default (using `sr-only` class)
2. Becomes visible on focus
3. Clicking scrolls to and focuses main content
4. High-contrast styling for visibility

---

## ARIA Implementation

### Landmarks

The application uses semantic HTML5 landmarks:

```html
<header>     <!-- Page header -->
<nav>        <!-- Navigation -->
<main>       <!-- Main content -->
<aside>      <!-- Supplementary content -->
<footer>     <!-- Page footer -->
```

### ARIA Roles and Attributes

#### Tabs

```tsx
<nav role="tablist" aria-label="Calculator sections">
  <button
    role="tab"
    id="tab-results"
    aria-selected={isActive}
    aria-controls="tabpanel-results"
    tabIndex={isActive ? 0 : -1}
  >
    Results
  </button>
</nav>

<div
  role="tabpanel"
  id="tabpanel-results"
  aria-labelledby="tab-results"
  tabIndex={0}
>
  {/* Tab content */}
</div>
```

#### Forms

```tsx
<input
  id="age-input"
  aria-label="Your current age"
  aria-describedby="age-description age-error"
  aria-invalid={hasError}
  aria-required="true"
/>
<span id="age-description" className="sr-only">
  Enter your age in years (18-100)
</span>
<span id="age-error" role="alert">
  {errorMessage}
</span>
```

#### Buttons

```tsx
<button
  aria-label="Calculate retirement projection"
  aria-busy={isCalculating}
  aria-disabled={isDisabled}
>
  Calculate
</button>
```

### State Communication

| State | ARIA Attribute |
|-------|---------------|
| Selected | `aria-selected="true"` |
| Expanded | `aria-expanded="true"` |
| Disabled | `aria-disabled="true"` |
| Loading | `aria-busy="true"` |
| Invalid | `aria-invalid="true"` |
| Current | `aria-current="page"` |

---

## Components Reference

### `/components/a11y/`

| Component | Purpose |
|-----------|---------|
| `SkipLink.tsx` | Skip navigation link |
| `LiveRegion.tsx` | Screen reader announcements |
| `ScreenReaderOnly.tsx` | Visually hidden content |

### Key Exports from `ScreenReaderOnly.tsx`

| Export | Description |
|--------|-------------|
| `ScreenReaderOnly` | Visually hidden content wrapper |
| `VisuallyHidden` | Alias for ScreenReaderOnly |
| `ScreenReaderText` | Simple inline hidden text |
| `ScreenReaderHeading` | Hidden section heading |
| `DescribedBy` | Hidden description (aria-describedby target) |
| `AccessibleIcon` | Icon with accessible label |
| `SkipToContent` | Alternative skip link |
| `LoadingAnnouncement` | Loading state announcer |
| `ErrorAnnouncement` | Error state announcer |
| `FocusTrap` | Modal focus containment |

### Keyboard Navigation Hook

```tsx
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";

const { handleKeyDown, getTabIndex } = useKeyboardNavigation({
  itemCount: items.length,
  onSelect: (index) => selectItem(index),
  orientation: "vertical",
  wrap: true,
});
```

---

## Testing

### Automated Testing

The project includes Playwright accessibility tests in `/tests/accessibility/a11y.spec.ts`:

```bash
# Run accessibility tests
pnpm test:a11y

# Run all tests
pnpm test
```

### Test Coverage

- WCAG 2.1 AA automated checks using axe-core
- Keyboard navigation tests
- Focus indicator visibility tests
- Label association verification
- Color contrast checks
- Touch target size validation

### Manual Testing Checklist

#### Keyboard Testing

- [ ] All interactive elements reachable via Tab
- [ ] Tab order follows logical reading order
- [ ] Focus indicator visible on all elements
- [ ] Arrow keys work in tabs, menus, sliders
- [ ] Escape closes modals/dropdowns
- [ ] Enter/Space activates buttons and links

#### Screen Reader Testing

Test with at least one of:
- VoiceOver (macOS/iOS)
- NVDA (Windows)
- JAWS (Windows)

- [ ] All content announced in logical order
- [ ] Form labels read correctly
- [ ] Error messages announced
- [ ] Dynamic updates announced via live regions
- [ ] Images have alt text or are marked decorative

#### Visual Testing

- [ ] Works at 200% zoom
- [ ] Works at 400% zoom (content reflows)
- [ ] High contrast mode functional
- [ ] Reduced motion mode respected
- [ ] Dark mode maintains contrast

#### Motor Impairment Testing

- [ ] Touch targets at least 44x44px on mobile
- [ ] Clickable areas appropriately sized
- [ ] No time-limited interactions
- [ ] No rapid interactions required

---

## Best Practices for Contributors

### Do

1. **Use semantic HTML first** - `<button>` not `<div onClick>`
2. **Always provide labels** - Every input needs a label
3. **Announce dynamic changes** - Use live regions for updates
4. **Test with keyboard** - Before committing any UI changes
5. **Respect user preferences** - `prefers-reduced-motion`, `prefers-color-scheme`
6. **Write alt text for images** - Or use `aria-hidden` for decorative images
7. **Use relative units** - `rem`/`em` over `px` where possible

### Don't

1. **Don't remove focus outlines** - Style them instead
2. **Don't use color alone** - Always provide secondary indicators
3. **Don't trap focus** - Unless intentional (modals)
4. **Don't use `tabindex > 0`** - Disrupts natural tab order
5. **Don't auto-focus on page load** - Unless necessary
6. **Don't use ARIA when HTML works** - First rule of ARIA
7. **Don't make text unselectable** - Users may need to copy

### Code Review Checklist

- [ ] New interactive elements have visible focus states
- [ ] New forms have proper labels and descriptions
- [ ] Dynamic content changes are announced
- [ ] Tab order is logical
- [ ] No new color contrast issues
- [ ] Keyboard navigation works as expected
- [ ] Touch targets meet minimum size

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/)
- [Inclusive Components](https://inclusive-components.design/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

---

## Reporting Issues

If you encounter accessibility barriers in this application:

1. Open an issue with the `accessibility` label
2. Describe the barrier you experienced
3. Include your assistive technology (if applicable)
4. Provide steps to reproduce

We take accessibility seriously and will address issues promptly.
