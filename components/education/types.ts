// Education module types and constants

export type EducationTopic =
  | 'roth-vs-traditional'
  | 'ten-year-rule'
  | 'tax-brackets'
  | 'compound-growth'
  | 'wealthy-strategies';

export interface EducationProgress {
  completedTopics: EducationTopic[];
  lastViewedAt: Record<EducationTopic, number>;
}

export const EDUCATION_TOPICS: Record<EducationTopic, { title: string; description: string }> = {
  'roth-vs-traditional': {
    title: 'Why Roth Wins',
    description: 'Understanding why paying taxes now often beats paying later',
  },
  'ten-year-rule': {
    title: 'The 10-Year Rule',
    description: 'What happens when your kids inherit your IRA',
  },
  'tax-brackets': {
    title: 'Tax Brackets Decoded',
    description: 'Marginal vs effective rates explained',
  },
  'compound-growth': {
    title: 'The Power of Time',
    description: 'Why starting early is the ultimate wealth hack',
  },
  'wealthy-strategies': {
    title: 'The Wealthy Playbook',
    description: 'Strategies the rich use that you can too',
  },
};

export const TOTAL_TOPICS = Object.keys(EDUCATION_TOPICS).length;
