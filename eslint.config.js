import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// Root ESLint configuration for the monorepo
// Contains shared rules that apply to all packages
export default tseslint.config([
  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**', 
      '**/node_modules/**',
      '**/*.d.ts',
      'packages/*/dist/**'
    ]
  },
  
  // Base configuration for all TypeScript/JavaScript files
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: null, // Disable type-aware linting to fix path issues
      },
    },
    rules: {
      // Shared rules (without type-aware rules)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      // Disable type-aware rules that cause issues in monorepo
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    }
  }
]);
