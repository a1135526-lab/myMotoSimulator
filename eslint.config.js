import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Layer boundaries (dependencies point inward only):
 *   ui ──► application ──► domain ◄── data
 *
 * Each entry lists the layers a folder must NOT import from.
 * Patterns cover both the "@/" alias and relative paths.
 */
const layer = (name) => [`@/${name}`, `@/${name}/**`, `**/${name}`, `**/${name}/**`];

const boundary = (forbidden, { allowTypeImportsFrom = [] } = {}) => ({
  '@typescript-eslint/no-restricted-imports': [
    'error',
    {
      patterns: [
        ...forbidden.map((name) => ({
          group: layer(name),
          message: `Layer boundary: this layer must not import from "${name}".`,
        })),
        ...allowTypeImportsFrom.map((name) => ({
          group: layer(name),
          allowTypeImports: true,
          message: `Layer boundary: only "import type" is allowed from "${name}".`,
        })),
      ],
    },
  ],
});

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results'] },

  js.configs.recommended,
  ...tseslint.configs.strict,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'max-lines': ['error', { max: 300, skipBlankLines: false, skipComments: false }],
      'no-restricted-globals': [
        'error',
        {
          name: 'setInterval',
          message: 'Physics must run on a fixed-timestep loop driven by requestAnimationFrame.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'setInterval',
          message: 'Physics must run on a fixed-timestep loop driven by requestAnimationFrame.',
        },
      ],
    },
  },

  // ---- Layer boundaries ----
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      ...boundary(['data', 'application', 'ui', 'app']),
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'requestAnimationFrame',
        'setInterval',
        'setTimeout',
      ],
    },
  },
  {
    files: ['src/data/**/*.ts'],
    rules: boundary(['application', 'ui', 'app']),
  },
  {
    files: ['src/application/**/*.{ts,tsx}'],
    rules: boundary(['ui', 'app']),
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: boundary(['data', 'app'], { allowTypeImportsFrom: ['domain'] }),
  },

  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },

  prettier,
);
