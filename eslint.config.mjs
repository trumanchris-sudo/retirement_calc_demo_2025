import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      'prefer-const': 'warn',
    },
  },
  {
    ignores: [
      '.next/**',
      'coverage/**',
      'features/wallet/INTEGRATION_EXAMPLE.tsx',
      'out/**',
      'build/**',
      'qa-results/**',
      'public/monte-carlo-worker.js',
      'public/sw.js',
      'next-env.d.ts',
    ],
  },
];
