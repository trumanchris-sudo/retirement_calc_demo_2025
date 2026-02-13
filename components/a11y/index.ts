/**
 * Accessibility Components
 *
 * This module exports components and utilities for improving
 * accessibility (a11y) throughout the application.
 *
 * WCAG 2.1 AA Compliance Features:
 * - Skip navigation links (SkipLink)
 * - Live regions for dynamic announcements (LiveRegion)
 * - Screen reader only content (ScreenReaderOnly)
 * - Focus management utilities (FocusTrap)
 * - Accessible icon wrappers (AccessibleIcon)
 */

export { SkipLink } from "./SkipLink";
export {
  LiveRegion,
  LiveRegionProvider,
  useLiveRegion,
  announceToScreenReader
} from "./LiveRegion";
export {
  ScreenReaderOnly,
  VisuallyHidden,
  ScreenReaderText,
  ScreenReaderHeading,
  DescribedBy,
  AccessibleIcon,
  SkipToContent,
  LoadingAnnouncement,
  ErrorAnnouncement,
  FocusTrap,
} from "./ScreenReaderOnly";
