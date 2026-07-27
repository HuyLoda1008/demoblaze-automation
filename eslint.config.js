// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ['node_modules/**', 'reports/**', 'test-results/**', 'test-cases/test-cases.xlsx'],
  },
  {
    // This file itself: a plain Node CommonJS config, not part of the
    // TS/browser-oriented rules applied to the rest of the repo.
    files: ['eslint.config.js'],
    languageOptions: {
      globals: { require: 'readonly', module: 'readonly', __dirname: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      // CODE_CONVENTIONS.md: "don't add `any` to route around a type error"
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Playwright Test fixtures that depend on nothing still take an empty
    // `{}` first param by convention -- not a code smell here.
    files: ['src/fixtures/**/*.ts'],
    rules: {
      'no-empty-pattern': 'off',
    },
  },
  {
    // Library code (page objects, utils, config) shouldn't have stray debug
    // prints; teardown warnings are the one deliberate exception.
    files: ['src/**/*.ts', 'config/**/*.ts'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Test/tooling output (perf timings, xlsx-generation progress) is
    // meant to be read in CI/terminal output, not library code.
    files: ['tests/**/*.ts', 'test-cases/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // CODE_CONVENTIONS.md "Page Object Model": tests call page-object
    // methods, they don't drive the DOM directly. This is the one
    // repo-specific convention plain ESLint rules can't express (it's about
    // *which files* a raw Playwright call is allowed in, not the call
    // itself), so it's encoded as a scoped no-restricted-syntax rule instead
    // of a written-only rule nobody enforces.
    files: ['tests/**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='page'][callee.property.name=/^(click|fill|check|uncheck|selectOption|hover|dblclick|tap|type)$/]",
          message:
            'Tests must not drive the DOM directly via page.<action>() -- add or use a page object method instead (see CODE_CONVENTIONS.md "Page Object Model"). page.goto() for navigation is fine.',
        },
      ],
    },
  }
);
