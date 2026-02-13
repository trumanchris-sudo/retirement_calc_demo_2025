// Education module exports
// Provides visual explainers for key retirement planning concepts

// Types and constants
export type { EducationTopic, EducationProgress as EducationProgressType } from './types';
export { EDUCATION_TOPICS, TOTAL_TOPICS } from './types';

// Progress tracking hook
export { useEducationProgress } from './useEducationProgress';

// Explainer components (lazy-loaded in modal)
export { WhyRothIsBetter } from './WhyRothIsBetter';
export { TenYearRuleExplainer } from './TenYearRuleExplainer';
export { TaxBracketsSimplified } from './TaxBracketsSimplified';
export { CompoundGrowthVisualizer } from './CompoundGrowthVisualizer';
export { RichPeoplePlaybook } from './RichPeoplePlaybook';
export { TaxStrategyExplainer } from './TaxStrategyExplainer';

// Modal and integration components
export { EducationModal } from './EducationModal';
export { EducationInfoIcon, EducationLink } from './EducationInfoIcon';
export {
  EducationProgress,
  EducationProgressCompact,
  EducationComplete,
} from './EducationProgress';
