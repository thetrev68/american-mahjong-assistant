import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import testingLibrary from 'eslint-plugin-testing-library'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Frontend-specific ESLint configuration
export default tseslint.config([
  // Global ignores
  {
    ignores: [
      'dist/**',
      'coverage/**', 
      'node_modules/**',
      '**/*.d.ts',
      'src/features/gameplay/GameModeView.tsx',
      'src/__tests__/integration/solo-game-workflow.test.tsx'
    ]
  },

  // JavaScript files
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      }
    }
  },

  // TypeScript files
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        project: ['tsconfig.app.json'],
        tsconfigRootDir: __dirname,
      }
    },
    rules: {
      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // React Refresh rules
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    }
  },

  // Relaxed rules for test files
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    plugins: {
      'testing-library': testingLibrary,
    },
    rules: {
      ...testingLibrary.configs.react.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'testing-library/no-unnecessary-act': 'off',
    }
  }
])
