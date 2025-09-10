# Refactoring Task: Standardize Project Tooling

## 1. Goal

The goal is to create a more consistent and streamlined developer experience by unifying the testing and linting tools across the entire monorepo.

## 2. The Problem

Currently, the project uses a mix of tools for similar jobs:

- **Testing:** The `frontend` uses **Vitest**, while the `backend` uses **Jest**.
- **Linting:** There are separate ESLint configurations (`eslint.config.mts` at the root, `frontend/eslint.config.js`) which could be consolidated.

While functional, this inconsistency adds cognitive overhead for developers switching between packages and complicates the root-level scripts and CI/CD configuration.

## 3. Step-by-Step Implementation Plan

### Step 3.1: Unify on a Single Test Runner (Vitest)

Vitest is a modern choice that integrates well with the Vite-based frontend. Migrating the backend to Vitest will unify the testing framework.

1.  **Add Vitest to Backend:** In `packages/backend/package.json`, remove Jest dependencies and add Vitest:
    ```bash
    npm uninstall jest ts-jest @types/jest
    npm install -D vitest @vitest/coverage-v8
    ```
2.  **Configure Vitest for Backend:** Create a `vitest.config.ts` file in `packages/backend`. A simple configuration for a Node.js environment would be:
    ```typescript
    import { defineConfig } from 'vitest/config';

    export default defineConfig({
      test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./src/__tests__/setup.ts'], // Reuse existing setup
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html'],
        },
      },
    });
    ```
3.  **Update Backend Test Scripts:** In `packages/backend/package.json`, update the `scripts` section:
    ```json
    "scripts": {
      ...
      "test": "vitest",
      "test:watch": "vitest",
      "test:coverage": "vitest run --coverage"
    },
    ```
4.  **Migrate Tests:** Jest `describe`, `it`, and `expect` are compatible with Vitest when `globals: true` is set. The primary change will be migrating any Jest-specific APIs (e.g., `jest.mock`, `jest.spyOn`) to their Vitest equivalents (`vi.mock`, `vi.spyOn`). The migration should be straightforward for most unit tests.
5.  **Delete Jest Config:** Delete `packages/backend/jest.config.js`.

### Step 3.2: Consolidate ESLint Configuration

1.  **Establish a Root Config:** Use the `eslint.config.mts` at the project root as the base configuration for the entire monorepo. This file should contain rules that apply to all packages (e.g., basic TypeScript rules, formatting).
2.  **Extend in Packages:** In `packages/frontend` and `packages/backend`, create simpler `eslint.config.js` files that *import and extend* the root configuration, only adding rules specific to that package's environment (e.g., `eslint-plugin-react-hooks` for the frontend).
    ```javascript
    // Example for packages/frontend/eslint.config.js
    import rootConfig from '../../eslint.config.mts';
    import reactHooks from 'eslint-plugin-react-hooks';

    export default [
      ...rootConfig,
      {
        // Frontend-specific rules here
        files: ['src/**/*.ts', 'src/**/*.tsx'],
        plugins: {
          'react-hooks': reactHooks
        },
        rules: {
          'react-hooks/rules-of-hooks': 'error',
          'react-hooks/exhaustive-deps': 'warn'
        }
      }
    ];
    ```
3.  **Update Lint Scripts:** Ensure the root `package.json` has a lint script that can target all workspaces.
    ```json
    "scripts": {
      "lint": "eslint .",
      "lint:fix": "eslint . --fix"
    }
    ```

## 4. Verification

1.  **Testing:** From the project root, run `npm test --workspaces`. This command should now execute Vitest in both the `frontend` and `backend` packages, and all tests should pass. Verify that code coverage reports are generated correctly for both.
2.  **Linting:** From the project root, run `npm run lint`. This should lint all files in the monorepo according to the new cascaded configuration, and there should be no errors.
3.  Manually inspect the configurations to ensure there is minimal duplication and that package-specific settings correctly override or extend the base rules.
4.  After verification, commit the changes with the message: `chore(tooling): standardize on vitest and consolidate eslint config`.
