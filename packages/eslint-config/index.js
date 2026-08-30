/**
 * Shared ESLint config.
 *
 * Deliberately short. Formatting is not litigated here — that is what
 * `forge fmt` and Prettier are for — so every rule below exists because
 * violating it can produce a wrong result rather than an ugly one.
 *
 * The float rule is the one that matters most in this codebase. Values from the
 * chain are uint256 and routinely exceed 2^53, so a stray `Number()` or `+`
 * coercion silently returns a wrong balance instead of throwing. That is a
 * correctness bug that looks like arithmetic.
 */

import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      // Correctness
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-implicit-coercion': ['error', { boolean: false }],
      '@typescript-eslint/no-floating-promises': 'off', // needs type info; on in typed configs
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // bigint discipline. Chain values are uint256 and lose precision above
      // 2^53, so a Number() around one returns a wrong answer rather than an
      // error. Conversions go through the sanctioned helpers.
      'no-restricted-globals': [
        'error',
        {
          name: 'Number',
          message:
            'Chain values are uint256. Use BigInt, or the toAmountString / fromAmountString helpers. Number() silently loses precision above 2^53.',
        },
      ],

      // Silent failure. An empty catch in this codebase hides exactly the class
      // of problem the system is built to surface: a proof that cannot be built
      // is a fact that will never land, and swallowing it makes that
      // indistinguishable from "this user has no history".
      'no-empty': ['error', { allowEmptyCatch: false }],

      // Style, but load-bearing for review
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Tests may reach for shapes production code should not.
    files: ['**/*.test.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-globals': 'off',
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.next/**', '**/out/**', 'lib/**'],
  },
];
