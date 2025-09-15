# Codebase Cleanup Plan

This document outlines a detailed plan for refactoring the codebase to eliminate dead, redundant, and unused code. The analysis was performed using a combination of manual inspection and automated analysis with `ts-prune`.

The plan is divided into several phases, starting with the safest and most high-confidence changes.

---

## Phase 1: Immediate Deletions (High-Confidence)

These files are determined to be unnecessary and can be safely deleted.

1.  **Delete Backup Configuration File:**
    *   **File:** `packages/frontend/tailwind.config.js.backup`
    *   **Reason:** This is a backup file and is not used by the application.

2.  **Delete Orphaned Script:**
    *   **File:** `packages/frontend/public/intelligence/nmjl-patterns/pattern-analysis-script.js`
    *   **Reason:** This is a JavaScript file in a TypeScript project located in the `public` directory. It does not appear to be part of the build process and is likely a remnant of a previous development effort.

---

## Phase 2: Consolidate Duplicate Type Definitions

This phase addresses redundant type definitions between the `frontend` and `shared-types` packages.

1.  **Identify Redundancy:**
    *   **File A:** `packages/frontend/src/types/tile-types.ts`
    *   **File B:** `packages/shared-types/src/tile-types.ts`
    *   **Reason:** The existence of a `shared-types` package implies that types should be centralized. The file in the `frontend` package is likely a duplicate and should be removed in favor of the shared one.

2.  **Action Plan:**
    *   **Step 2.1:** Compare the contents of File A and File B to ensure the shared one is complete.
    *   **Step 2.2:** Delete `packages/frontend/src/types/tile-types.ts`.
    *   **Step 2.3:** Search the codebase for any imports pointing to the deleted file and update them to point to `packages/shared-types/src/tile-types.ts`.

---

## Phase 3: Refactor Unused Exports

This is the largest phase, based on the output from `ts-prune`. It's broken into two parts.

### Part A: Remove `export` from Unused Exports (Used in Module)

These are functions, types, and variables that are exported but only ever used within the file they are defined in. Removing the `export` keyword is a safe change that improves encapsulation.

**Action:** For each item identified by `ts-prune` as `(used in module)`, remove the `export` keyword.

**Examples:**

*   In `packages/frontend/src/hooks/useAccessibility.ts`:
    *   `AccessibilityOptions`
    *   `AriaLiveOptions`
*   In `packages/frontend/src/stores/charleston-store.ts`:
    *   `CharlestonSelectorState`
*   In `packages/backend/src/server.ts`:
    *   `io`

*(Note: This is a small sample. The full list is available in the `ts-prune` output from the analysis.)*

### Part B: Delete Completely Unused Code

These are exports that are not used anywhere in the project. They represent dead code and can be removed.

**Action:** For each of these items, the entire code block (function, class, type, const, etc.) should be deleted.

**Examples of code to be deleted:**

*   From `packages/frontend/src/types/tile-types.ts`:
    *   `TileCount`
*   From `packages/frontend/src/hooks/useAnimations.ts`:
    *   `useCharlestonAnimations`
*   From `packages/frontend/src/stores/history-store.ts`:
    *   `useGameHistory`
    *   `usePerformanceStats`
*   From `packages/shared-types/src/index.ts`:
    *   `HandAnalysis`
    *   `DefensiveAnalysis`

*(Note: This is a small sample. The full list is extensive.)*

**Important:** After deleting a set of related code blocks, it is crucial to run the project's test suite to ensure no breakages have occurred.

---

## Phase 4: Verification

After each phase, and especially after making significant changes in Phase 3, the following commands should be run to ensure the integrity of the application.

*   **Run Linter:**
    ```bash
    npm run lint --workspaces
    ```
*   **Run Frontend Tests:**
    ```bash
    npm test --workspace=frontend
    ```
*   **Run Backend Tests:**
    ```bash
    npm test --workspace=backend
    ```

This structured approach will ensure a safe and effective codebase cleanup.
