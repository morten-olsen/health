import { FlatCompat } from '@eslint/eslintrc';
import importPlugin from 'eslint-plugin-import';
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  resolvePluginsRelativeTo: import.meta.dirname,
});

// React Native / Storybook plugins are loaded lazily — apps/mobile is the only
// workspace that uses them, and the root eslint run needs to keep working even
// before its deps are installed.
const loadOptional = async (name) => {
  try {
    return (await import(name)).default;
  } catch {
    return null;
  }
};

const [react, reactHooks, boundaries, storybook, globalsMod] = await Promise.all([
  loadOptional('eslint-plugin-react'),
  loadOptional('eslint-plugin-react-hooks'),
  loadOptional('eslint-plugin-boundaries'),
  loadOptional('eslint-plugin-storybook'),
  loadOptional('globals'),
]);

const MOBILE_FILES = ['apps/mobile/**/*.{ts,tsx}'];

const mobileBlocks = [];

if (globalsMod) {
  mobileBlocks.push({
    files: MOBILE_FILES,
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globalsMod.browser,
        __DEV__: 'readonly',
      },
    },
    settings: {
      react: { version: 'detect' },
    },
  });
}

if (react && reactHooks) {
  mobileBlocks.push({
    files: MOBILE_FILES,
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/forbid-elements': [
        'error',
        {
          forbid: [
            { element: 'TouchableOpacity', message: 'Use <Pressable> instead.' },
            { element: 'TouchableHighlight', message: 'Use <Pressable> instead.' },
            { element: 'TouchableWithoutFeedback', message: 'Use <Pressable> instead.' },
          ],
        },
      ],
    },
  });
}

if (boundaries) {
  mobileBlocks.push({
    files: MOBILE_FILES,
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'components', pattern: ['apps/mobile/src/components/**'] },
        { type: 'shared', pattern: ['apps/mobile/src/shared/**'] },
        { type: 'app', pattern: ['apps/mobile/app/**'] },
      ],
      'boundaries/ignore': ['**/*.test.{ts,tsx}', '**/*.stories.{ts,tsx}'],
    },
    rules: {
      'boundaries/dependencies': ['error', { default: 'allow', rules: [] }],
    },
  });
}

// Mobile-specific authoring rules: ban StyleSheet.create + console.
mobileBlocks.push({
  files: MOBILE_FILES,
  rules: {
    'no-console': 'error',
    'no-restricted-properties': [
      'error',
      {
        object: 'StyleSheet',
        property: 'create',
        message: 'StyleSheet.create is not allowed. Use NativeWind className instead.',
      },
    ],
  },
});

// Expo Router + stories need default exports and `index.tsx` / `_layout.tsx` filenames.
mobileBlocks.push({
  files: [
    'apps/mobile/app/**/*.{ts,tsx}',
    'apps/mobile/app.config.ts',
    'apps/mobile/**/*.stories.{ts,tsx}',
    'apps/mobile/.storybook/**/*.{ts,tsx}',
  ],
  rules: {
    'import/no-default-export': 'off',
    'no-restricted-syntax': 'off',
  },
});

const storybookBlocks = storybook
  ? [
      ...storybook.configs['flat/recommended'].map((block) => ({
        ...block,
        files: block.files ?? ['apps/mobile/**/*.stories.{ts,tsx}'],
      })),
      {
        files: ['apps/mobile/**/*.stories.{ts,tsx}'],
        rules: {
          'import/no-default-export': 'off',
          'max-lines-per-function': 'off',
        },
      },
    ]
  : [];

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  eslintConfigPrettier,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [importPlugin.flatConfigs.recommended, importPlugin.flatConfigs.typescript],
    rules: {
      'import/no-unresolved': 'off',
      // Disabled — the rule's exports-walker fails on packages with non-JS
      // entry points (react-native ships .flow + .d.ts as the public surface)
      // and emits a spurious "parser.parse is not a function" parse error.
      // We never use `import * as X` namespace patterns; TypeScript's own
      // type-checking covers what this rule is meant to enforce.
      'import/namespace': 'off',
      'import/extensions': ['error', 'ignorePackages'],
      'import/exports-last': 'error',
      'import/no-default-export': 'error',
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
        },
      ],
      'import/no-duplicates': 'error',
    },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'typeParameter', format: ['PascalCase'] },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          filter: { regex: '^__', match: false },
        },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'classProperty', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'classMethod', format: ['camelCase'] },
      ],
      complexity: ['error', 15],
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 4],
      'max-nested-callbacks': ['error', 3],
      'max-params': ['error', 4],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'FunctionDeclaration',
          message: 'Use arrow function syntax instead of function declarations',
        },
        {
          selector: 'PropertyDefinition[accessibility="private"]',
          message: 'Use # for private fields instead of the private keyword',
        },
        {
          selector: 'MethodDefinition[accessibility="private"]',
          message: 'Use # for private methods instead of the private keyword',
        },
      ],
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  {
    files: ['**/*.config.ts', '**/*.config.mjs', '**/*.config.js', '**/vitest.workspace.ts'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      'import/no-default-export': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/migrations/*.ts'],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },
  ...mobileBlocks,
  ...storybookBlocks,
  ...compat.extends('plugin:prettier/recommended'),
  {
    rules: {
      curly: ['error', 'all'],
    },
  },
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/.task/',
      '**/*.api-types.ts',
      'apps/mobile/.expo/',
      'apps/mobile/ios/',
      'apps/mobile/android/',
      'apps/mobile/patches/',
      'apps/mobile/storybook-static/',
      'apps/mobile/expo-env.d.ts',
      'apps/mobile/nativewind-env.d.ts',
    ],
  },
);
