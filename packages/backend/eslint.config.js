import globals from 'globals'
import tseslint from 'typescript-eslint'
// Import root configuration
import rootConfig from '../../eslint.config.js'

// Backend-specific ESLint configuration
// Extends the root config with Node.js-specific rules
export default tseslint.config([
  // Extend root configuration
  ...rootConfig,
  
  // Backend-specific configuration
  {
    files: ['src/**/*.{ts,js}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      // Node.js specific rules
      'no-console': 'off', // Allow console.log in backend
      'no-process-env': 'off', // Allow process.env usage
      
      // Backend-specific overrides
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
    }
  }
])