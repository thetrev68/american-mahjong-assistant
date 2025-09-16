# Refactoring Task: Co-locate Frontend Services with Features

## 1. Goal

The goal is to improve the structure and maintainability of the frontend codebase by moving service files from the monolithic `frontend/src/services` directory into the feature directories that primarily use them.

## 2. The Problem

The `frontend/src/services` directory currently contains over 20 service files. This "junk drawer" approach has several disadvantages:

- **Low Cohesion:** Code for a single feature (e.g., Charleston) is spread across `features/charleston` and `services`.
- **Poor Discoverability:** It's difficult to find all the code related to a specific feature.
- **High Coupling:** It's unclear which features depend on which services, making it risky to modify a service without understanding its full impact.

Co-locating services with their corresponding features (a principle of Feature-Sliced Design) will make the codebase more modular and easier to navigate.

## 3. Step-by-Step Implementation Plan

### Step 3.1: Analyze Service Usage and Define "Shared"

1.  **Identify which services are used by only one or two features.** These are primary candidates for co-location.
    - `charleston-multiplayer.ts` -> `features/charleston`
    - `charleston-resilient.ts` -> `features/charleston`
    - `game-end-coordinator.ts` -> `features/post-game` or `features/gameplay`
    - `multiplayer-game-end.ts` -> `features/post-game` or `features/gameplay`
    - `turn-intelligence-engine.ts` -> `features/intelligence-panel` or `features/gameplay`

2.  **Define a rule for "genuinely shared" services.** This removes ambiguity.
    - **Rule of Thumb:** If a service is imported by components or hooks in **three or more different feature directories** (e.g., `features/charleston`, `features/gameplay`, `features/tile-input`), it is a candidate for the shared `lib/services` directory. Otherwise, it should be moved into a specific feature's `services/` directory.

### Step 3.2: Move Single-Feature Services

For each service that is not "genuinely shared," perform the following:

1.  Create a `services` subdirectory within the corresponding feature directory. For example, `frontend/src/features/charleston/services`.
2.  Move the service file into this new directory. (e.g., move `frontend/src/services/charleston-multiplayer.ts` to `frontend/src/features/charleston/services/charleston-multiplayer.ts`).
3.  Update all relative import paths in the components and hooks within that feature to point to the new service location.

### Step 3.3: Create a Shared `lib/services` Layer

For services identified as "genuinely shared" by the rule above:

1.  Create a directory: `frontend/src/lib/services`.
2.  Move the cross-cutting services into this directory. Examples might include:
    - `nmjl-service.ts` (used for pattern selection, analysis, etc.)
    - `mahjong-validator.ts`
3.  Update the import paths in all features that use these shared services.

### Step 3.4: Refactor the `useGameIntelligence` Hook and Co-locate its Dependencies

The `useGameIntelligence` hook acts as a facade for the core analysis engines. The services it depends on should be co-located with the primary feature that uses them, likely the intelligence panel.

1.  Create a directory `frontend/src/features/intelligence-panel/services`.
2.  Move the core analysis engines (`pattern-analysis-engine.ts`, `pattern-ranking-engine.ts`, `tile-recommendation-engine.ts`) into this new directory.
3.  Update the `useGameIntelligence` hook to import from this new, co-located directory.

## 4. Verification

1.  After moving files and updating imports, run the TypeScript compiler to ensure all modules are resolved correctly (`npm run type-check --workspace=frontend`).
2.  Run the frontend development server and thoroughly test the features whose services were moved. Pay close attention to the Charleston pass, intelligence recommendations, and end-of-game logic.
3.  Run the entire frontend test suite (`npm test --workspace=frontend`). All tests, especially integration tests, must pass.
4.  After verification, commit the changes with the message: `refactor(services): co-locate feature services and create shared service layer`.
