import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [
      '**/node_modules/**',
      '**/tests/e2e/**',
      '**/tests/accessibility/**',
      '**/tests/visual/**',
      '**/*.spec.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'lib/planConfig.ts',
        'lib/constants.ts',
        'lib/constants/**/*.ts',
        'lib/calculations/buildSimulationInputs.ts',
        'lib/calculations/retirementEngine.ts',
        'lib/calculations/taxCalculations.ts',
        'lib/calculations/withdrawalTax.ts',
        'lib/calculations/selfEmployed2026.ts',
        'lib/calculations/shared/**/*.ts',
      ],
      thresholds: {
        lines: 65,
        functions: 60,
        branches: 65,
        statements: 65,
      },
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '.next/**',
        'coverage/**',
        'playwright.config.ts',
        'next.config.mjs',
        'postcss.config.mjs',
        'tailwind.config.ts',
        'components.json',
        'app/**',
        'components/**',
        'features/wallet/**',
        'hooks/**',
        'types/**',
        'scripts/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
