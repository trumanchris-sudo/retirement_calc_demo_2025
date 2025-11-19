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
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
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
