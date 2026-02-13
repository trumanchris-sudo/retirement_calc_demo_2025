/**
 * Tab Components Index
 *
 * This file exports all tab components for the retirement calculator.
 * Each tab is a self-contained component that handles its own UI and
 * receives shared state as props.
 */

// Main configuration tab (accumulation/distribution settings)
export { ConfigureTab } from "./ConfigureTab";
export type { ConfigureTabProps } from "./ConfigureTab";

// Legacy/generational wealth planning tab
export { LegacyTab } from "./LegacyTab";
export type { LegacyTabProps } from "./LegacyTab";

// Stress testing and scenario comparison tab
export { ScenariosTab } from "./ScenariosTab";
export type { ScenariosTabProps } from "./ScenariosTab";

// Results and charts display tab
export { ResultsTab } from "./ResultsTab";
export type { ResultsTabProps } from "./ResultsTab";

// Re-export CheckUsTab from its original location
export { CheckUsTab } from "../CheckUsTab";
