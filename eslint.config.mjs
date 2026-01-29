// @ts-check
import eslint from '@eslint/js';
import prettierPlugin from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';

export default tseslint.config(
  {
    ignores: [
      '**/eslint.config.mjs',
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.config.js',
      '**/__mocks__/**',
      '**/*.spec.ts',
      '**/*.test.ts',
      './src/migrations/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.ts'],
    ...prettierPlugin,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      security,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-non-literal-fs-filename': 'warn',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
      'import/no-duplicates': 'error',
      'unicorn/filename-case': [
        'error',
        {
          cases: { kebabCase: true },
          ignore: [/^[a-z0-9]+(-[a-z0-9]+){0,2}(\.[a-z0-9]+)?\.ts$/],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['src/*'],
              message:
                'Do not use absolute imports like "src/...". Use relative paths instead (e.g., "../../utils").',
            },
          ],
        },
      ],
    },
  },
);
