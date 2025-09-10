# Refactoring Task: Decompose Frontend Zustand Store

## 1. Goal

The goal is to refactor the monolithic `room-store.ts` into multiple, smaller, domain-focused Zustand stores. This will improve code organization, make state management easier to reason about, and simplify testing.

## 2. The Problem

The `frontend/src/stores/room-store.ts` file is over 500 lines long and manages many unrelated pieces of state. It mixes concerns such as:

- Core room data (`room`, `players`)
- Connection and socket state (`connectionStatus`)
- Room configuration (`roomSettings`, `hostPermissions`)
- Local UI state (`roomCreationStatus`, `joinRoomStatus`)
- Client-side logic and computed properties (`getAvailablePositions`, `isRoomReadyForGame`)

This makes the store a bottleneck for changes, difficult to understand, and hard to test in isolation.

## 3. Step-by-Step Implementation Plan

### Step 3.1: Plan the New Store Structure

Identify the core domains within the existing `room-store.ts`. A good starting point for decomposition is:

- **`useRoomStore`**: For core, server-authoritative room data.
- **`usePlayerStore`**: For local player-specific state and interactions.
- **`useConnectionStore`**: For socket connection status and resilience.
- **`useRoomSetupStore`**: For UI state related to the room setup process (creating, joining, etc.).

### Step 3.2: Create `useRoomStore`

1.  Create `frontend/src/stores/room.store.ts` with the following skeleton. This provides a clear template.
    ```typescript
    import { create } from 'zustand';
    import type { Room, Player } from 'shared-types'; // Note the import from the new package

    interface RoomStore {
      room: Room | null;
      players: Player[];
      hostPlayerId: string | null;
      currentRoomCode: string | null;
      spectators: Player[];
      updateRoom: (newRoom: Partial<Room>) => void;
      updatePlayers: (players: Player[]) => void;
      // ... other actions and computed properties
    }

    export const useRoomStore = create<RoomStore>((set, get) => ({
      room: null,
      players: [],
      hostPlayerId: null,
      currentRoomCode: null,
      spectators: [],
      updateRoom: (newRoom) => set((state) => ({ room: { ...state.room, ...newRoom } as Room })),
      // ... other implementations
    }));
    ```
2.  Move the following state, actions, and computed properties from the old `room-store.ts` into the new `useRoomStore`:
    - **State**: `room`, `players`, `hostPlayerId`, `currentRoomCode`, `spectators`.
    - **Actions**: `updateRoom`, `updatePlayers`, `removePlayer`, `addSpectator`, `removeSpectator`, `transferHost`.
    - **Computed**: `isHost`, `getPlayerByPosition`.

### Step 3.3: Create `usePlayerStore`

1.  Create `frontend/src/stores/player.store.ts`.
2.  Move state and actions related to the local player's identity and position:
    - **State**: `playerPositions`, `otherPlayerNames` (for solo mode).
    - **Actions**: `setPlayerPosition`, `clearPlayerPosition`.
    - **Computed**: `getAvailablePositions`, `isPositionTaken`.

### Step 3.4: Create `useConnectionStore`

1.  Create `frontend/src/stores/connection.store.ts`.
2.  Move all connection-related state:
    - **State**: `connectionStatus`.
    - **Actions**: `updateConnectionStatus`, `setPlayerConnection`.
    - **Computed**: `getConnectedPlayers`, `getDisconnectedPlayers`.

### Step 3.5: Create `useRoomSetupStore`

1.  Create `frontend/src/stores/room-setup.store.ts`.
2.  This store will manage the multi-step UI flow for setting up a room.
    - **State**: `coPilotMode`, `coPilotModeSelected`, `roomCreationStatus`, `joinRoomStatus`, `error`.
    - **Actions**: `setCoPilotMode`, `setRoomCreationStatus`, `handleRoomCreated`, `handleRoomJoinError`, `clearError`, `resetToStart`.
    - **Computed**: `getRoomSetupProgress`.

### Step 3.6: Refactor Components and Handle Inter-Store Dependencies

1.  Go through all `.tsx` components in `frontend/src/features` and `frontend/src/ui-components`.
2.  Update them to use the new, smaller stores. A component should only import the stores that contain the state it needs.
3.  **Important Note on Inter-Store Dependencies:** During the refactor, you may find that an action in one store needs data from another. **Do not import one store into another at the top level**, as this can cause circular dependencies in module bundlers.
    - **Safe Pattern:** If an action in `usePlayerStore` needs to know the current `hostPlayerId` from `useRoomStore`, use `useRoomStore.getState()` inside the action.
      ```typescript
      // Inside a store action in usePlayerStore.ts
      someAction: () => {
        const { hostPlayerId } = useRoomStore.getState();
        // Now you can use hostPlayerId
      }
      ```

### Step 3.7: Clean Up

1.  Once all components and hooks have been migrated to the new stores, delete the original `frontend/src/stores/room-store.ts` file.
2.  Update the `frontend/src/stores/index.ts` barrel file to export the new stores.

## 4. Verification

1.  Run the frontend development server (`npm run dev --workspace=frontend`).
2.  Manually test all functionality related to room creation, joining, player positioning, and in-game state changes.
3.  Check the React DevTools to ensure that components are only re-rendering when the specific state they subscribe to changes. For example, a change in `connectionStatus` should not cause a component that only uses `room.players` to re-render.
4.  Run the frontend test suite (`npm test --workspace=frontend`). All existing tests for the store will need to be refactored to target the new, smaller stores. This is a good opportunity to write more focused unit tests for each store's logic.
5.  After verification, commit the changes with the message: `refactor(state): decompose monolithic room store into domain-focused stores`.
