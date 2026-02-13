'use client';

import {
  AnimatedBarChart,
  ChartAnimationStyles,
} from '@/components/calculator/ChartAnimations';

export const MonteCarloHistogram = ({ bins }: { bins: { range: string; count: number }[] }) => (
  <>
    <ChartAnimationStyles />
    <AnimatedBarChart
      data={bins}
      bars={[
        {
          dataKey: 'count',
          fill: '#1a5fb4',
          name: 'Simulations',
          radius: [4, 4, 0, 0],
        },
      ]}
      xAxisKey="range"
      height={200}
      showGrid={true}
      showLegend={false}
      showTooltip={true}
      animationPreset="smooth"
    />
  </>
);
