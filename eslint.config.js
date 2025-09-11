import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      'packages/*/dist/**',
      // Exclude files with parsing issues for now
      'packages/frontend/public/intelligence/nmjl-patterns/pattern-analysis-script.js',
      'packages/frontend/src/__tests__/integration/solo-game-workflow.test.tsx',
      'packages/frontend/src/features/room-setup/__tests__/*.test.tsx'
    ]
  },
  
  // Base JavaScript configuration
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    }
  },

  // TypeScript-specific configuration
  {
    files: ['**/*.{ts,mts,cts}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: null, // Disable type-aware linting to fix path issues
        tsconfigRootDir: __dirname, // Explicitly set root directory to resolve path ambiguity
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
  },
  
  // Relaxed rules for test files
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in test files for mocking
      '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in tests
    }
  }
]);
