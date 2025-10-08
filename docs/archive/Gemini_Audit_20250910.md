## Code Audit and Recommendations


  This audit reveals several opportunities to improve the codebase's structure, maintainability, and consistency. While the project is functional, these changes will reduce complexity, prevent bugs, and make future development easier.

  ---

  ### CRITICAL CHANGES

  These issues are the most important to address. They relate to fundamental structural problems that can lead to bugs, inconsistencies, and development friction.

  #### 1. Consolidate and Centralize Type Definitions


  Problem: There is significant duplication and fragmentation of type definitions across the project. Player, Room, and other core types are redefined in multiple places (shared/game-types.ts, shared/multiplayer-types.ts, backend/src/types/room-types.ts, frontend/src/stores/room-store.ts, shared/tile-utils.ts). This creates multiple sources of truth and is a common source of bugs. The shared/game-types.ts file is particularly large and covers too many domains (from core tile types to UI state).


  Recommendation:
     Create a `packages/shared-types` directory:* Move all shared type definitions into this new package.
     Organize types by domain:* Instead of a few massive files, create smaller, more focused files within packages/shared-types/src/. For example:
      *   tile-types.ts: Tile, TileSuit, TileValue, etc.
      *   room-types.ts: Room, Player, RoomConfig, etc.
      *   game-state-types.ts: GameState, PlayerGameState, etc.
      *   socket-event-types.ts: A definitive source for all Socket.IO event payloads.
     Eliminate all duplicate type definitions:* Update the frontend and backend to import all shared types from the new shared-types package.
     Remove UI-specific types from shared packages:* Types like UIState and Notification in game-types.ts are frontend-specific and should be moved into the frontend codebase (e.g., frontend/src/types).

  #### 2. Fix Monorepo Setup and shared Package


  Problem: The project is structured as a monorepo but isn't configured as one. The frontend and backend don't formally depend on the shared package. This has led to compiled JavaScript files (.js, .js.map) and declaration files (.d.ts) being checked into source control inside the shared directory, which is not a standard practice.


  Recommendation:
     Use npm Workspaces:*
      1.  Modify the root package.json to define workspaces.
      2.  Create a packages directory and move frontend, backend, and the newly proposed shared-types (from recommendation #1) and a shared-utils (for shared functions) into it.
      3.  Update frontend and backend package.json files to reference the shared packages (e.g., "shared-types": "workspace:^1.0.0").
     Remove Compiled Files from Git:* Delete all .js, .js.map, and .d.ts files from the shared packages and add them to the .gitignore file. The TypeScript-aware packages will consume the .ts source files directly.
     Create a `shared-utils` package:* The shared/tile-utils.ts file contains utility functions. These should be moved to a packages/shared-utils package to be properly consumed by both frontend and backend.

  ---

  ### RECOMMENDED CHANGES


  These changes will significantly improve the codebase's organization and developer experience.

  #### 1. Refactor Frontend State Management


  Problem: The frontend/src/stores/room-store.ts file is over 500 lines long and manages many unrelated pieces of state (room settings, player state, connection status, UI state). This makes the store difficult to understand, test, and maintain.


  Recommendation:
     Decompose the `room-store`:* Break the single large store into multiple, smaller, domain-focused Zustand stores. For example:
      *   useRoomStore: Manages core room information (room, players).
      *   useConnectionStore: Manages connectionStatus and related logic.
      *   useRoomSettingsStore: Manages roomSettings and hostPermissions.
      *   usePlayerStore: Manages local player state, like position and readiness.

  ---

  ### SUGGESTED IMPROVEMENTS

  These are smaller changes that will improve code quality and consistency.

  #### 1. Refactor Frontend services Directory


  Problem: The frontend/src/services directory is very large and contains over 20 service files. This makes it hard to find code and understand which parts of the application a service affects.


  Recommendation:
     Co-locate services with features:* Move services that are only used by a single feature into that feature's directory. For example, charleston-multiplayer.ts could be moved to frontend/src/features/charleston/services. Services used by multiple features can remain in a shared services directory or be moved to a shared layer within the frontend.

  #### 2. Standardize Tooling


  Problem: The frontend uses Vitest for testing, while the backend uses Jest. The ESLint configurations are also separate.


  Recommendation:
     Unify on a single test runner:* Consider migrating the backend tests from Jest to Vitest to provide a consistent testing experience across the monorepo.
     Create a root ESLint configuration:* Create a base ESLint configuration at the root of the monorepo and extend it in the frontend and backend packages.