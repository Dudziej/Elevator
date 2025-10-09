// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import pluginImport from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import vueParser from 'vue-eslint-parser';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'eslint.config.mjs'] },

  eslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.app.json', './tsconfig.json'],
      },
    },
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      eslintPluginPrettierRecommended,
    ],
    plugins: { import: pluginImport },
    rules: {
      'no-console': 'off',
      'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'warn',
    },
  },

  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
    extends: [
      pluginVue.configs['flat/recommended'],
      ...tseslint.configs.recommended,
      eslintPluginPrettierRecommended,
    ],
    plugins: { import: pluginImport },
    rules: {
      'no-console': 'off',
      'import/order': ['warn', { 'newlines-between': 'always', alphabetize: { order: 'asc' } }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
);
