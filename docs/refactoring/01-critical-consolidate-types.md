# Refactoring Task: Consolidate and Centralize Type Definitions

## 1. Goal

The goal of this task is to create a single source of truth for all shared TypeScript types in the project. This will be achieved by creating a new `shared-types` package, consolidating all duplicated and related types into it, and then updating the `frontend` and `backend` to consume these new centralized types.

## 2. The Problem

Currently, there is significant duplication and fragmentation of type definitions across the project. Core types like `Player` and `Room` are redefined in multiple places, including:

- `shared/game-types.ts`
- `shared/multiplayer-types.ts`
- `backend/src/types/room-types.ts`
- `frontend/src/stores/room-store.ts`
- `shared/tile-utils.ts`

This creates multiple sources of truth, which is a common source of bugs and makes the codebase difficult to maintain. The `shared/game-types.ts` file is particularly large and covers too many domains, from core tile types to UI-specific state.

## 3. Step-by-Step Implementation Plan

### Step 3.1: Create the `shared-types` Package Structure

1.  Create a new directory: `packages/shared-types`.
2.  Inside `packages/shared-types`, create a `package.json` file with the following content:
    ```json
    {
      "name": "shared-types",
      "version": "1.0.0",
      "main": "src/index.ts",
      "types": "src/index.ts",
      "private": true
    }
    ```
3.  Create a `src` directory inside `packages/shared-types`.
4.  Create an `index.ts` file inside `packages/shared-types/src` that will export all types from the other files in this directory.

### Step 3.2: Consolidate `tile-types`

1.  Create `packages/shared-types/src/tile-types.ts`.
2.  Move the following types and constants from `shared/game-types.ts` and `shared/tile-utils.ts` into `packages/shared-types/src/tile-types.ts`:
    - `TileSuit`
    - `TileValue`
    - `Tile`
    - `TileSprite`
    - `TILE_COUNTS`
    - `TILE_SUITS`
3.  Add `export * from './tile-types';` to `packages/shared-types/src/index.ts`.

### Step 3.3: Consolidate `room-types`

1.  Create `packages/shared-types/src/room-types.ts`.
2.  Create a definitive `Player` type in `room-types.ts` by merging the definitions from `shared/game-types.ts`, `shared/multiplayer-types.ts`, and `backend/src/types/room-types.ts`.
3.  Create a definitive `Room` type in `room-types.ts` by merging the various definitions.
4.  Move related types like `RoomConfig`, `PlayerPosition`, and `RoomPhase` into `room-types.ts`.
5.  Add `export * from './room-types';` to `packages/shared-types/src/index.ts`.

### Step 3.4: Consolidate `game-state-types`

1.  Create `packages/shared-types/src/game-state-types.ts`.
2.  Move types related to the state of a game in progress, such as `GameState`, `PlayerGameState`, `ExposedSet`, `DiscardedTile`, `CharlestonState`, and `GameSettings` into this file.
3.  Add `export * from './game-state-types';` to `packages/shared-types/src/index.ts`.

### Step 3.5: Consolidate `socket-event-types`

1.  Create `packages/shared-types/src/socket-event-types.ts`.
2.  Move the `SocketEvents` interface from `shared/game-types.ts` and `SocketEventMap` from `shared/socket-events.ts` into this file, merging them into a single, comprehensive `SocketEventMap`.
3.  Add `export * from './socket-event-types';` to `packages/shared-types/src/index.ts`.

### Step 3.6: Consolidate `nmjl-types`

1.  Move the contents of `shared/nmjl-types.ts` to `packages/shared-types/src/nmjl-types.ts`.
2.  Add `export * from './nmjl-types';` to `packages/shared-types/src/index.ts`.

### Step 3.7: Update `frontend` and `backend` Imports

**Note:** This step depends on the monorepo setup from task `02-critical-monorepo-setup.md` being complete.

1.  Go through every `.ts` and `.tsx` file in `frontend/src` and `backend/src`.
2.  Replace all imports from the old `shared` directory with imports from the new `shared-types` package.
    - **Example 1:**
        - **Before:** `import type { Room, Player } from '../../../shared/multiplayer-types';`
        - **After:** `import type { Room, Player } from 'shared-types';`
    - **Example 2:**
        - **Before:** `import type { Tile } from '../game-types';`
        - **After:** `import type { Tile } from 'shared-types';`
3.  Remove all duplicated type definitions that now exist in `shared-types`. For example, remove the `Room` and `Player` types from `frontend/src/stores/room-store.ts` and import them instead.

### Step 3.8: Clean Up Old Files and Types

1.  **Delete the following files from the `shared` directory.**
    - **Note:** These are compiled artifacts or redundant source files from the old structure. They are no longer needed as the `frontend` and `backend` will now directly import the TypeScript source from the new `shared-types` package via the monorepo symlinks.
    - `game-types.ts`
    - `multiplayer-types.ts`
    - `multiplayer-types.d.ts`
    - `multiplayer-types.js`
    - `multiplayer-types.js.map`
    - `nmjl-types.ts`
    - `socket-events.ts`
2.  Delete the `backend/src/types` directory.
3.  Move any frontend-specific types (like `UIState`, `Notification`) from the old `shared/game-types.ts` into a new `frontend/src/types/ui-types.ts` file.

## 4. Verification

1.  Run `npm install` from the root of the monorepo to link the new packages.
2.  Run `npx tsc --noEmit --pretty` in both the `packages/frontend` and `packages/backend` directories to confirm there are no type errors after the migration.
3.  Run the test suites for both `frontend` and `backend` (`npm test --workspace=frontend` and `npm test --workspace=backend`). All tests must pass.
4.  Manually inspect the codebase to ensure no duplicate shared types remain and all relevant imports point to the `shared-types` package.
5.  After verification, commit the changes with the message: `refactor(types): consolidate all shared types into shared-types package`.
