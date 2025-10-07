# Zustand Store Refactoring Plan

## 1. Introduction & Goals

The primary goal of this refactoring is to consolidate the 15 existing Zustand stores into 4 domain-oriented stores. This will address critical architectural issues, including:

-   **Eliminating Infinite Loops:** By removing complex cross-store dependencies and useEffect chains.
-   **Simplifying State Management:** By creating a single source of truth for each domain, making the data flow predictable.
-   **Improving Maintainability:** By making the codebase easier to understand, debug, and extend.

This document outlines the precise plan for creating the new files, mapping the old state to the new structure, and deleting the old files.

---

## 2. New File Structure

All work will be done within the `packages/frontend/src/stores/` directory.

#### **Files to Create:**

1.  `packages/frontend/src/stores/useGameStore.ts`
2.  `packages/frontend/src/stores/useIntelligenceStore.ts`
3.  `packages/frontend/src/stores/useRoomStore.ts`
4.  `packages/frontend/src/stores/useUIStore.ts`
5.  `packages/frontend/src/stores/index.ts` (for clean exports of the new stores)

#### **Files to Delete:**

Upon successful migration, the following 15 files will be deleted:

1.  `charleston-store.ts`
2.  `connection.store.ts`
3.  `dev-perspective.store.ts`
4.  `game-store.ts`
5.  `history-store.ts`
6.  `intelligence-store.ts`
7.  `multiplayer-store.ts`
8.  `pattern-store.ts`
9.  `player.store.ts`
10. `room-setup.store.ts`
11. `room.store.ts`
12. `tile-store.ts`
13. `turn-store.ts`
14. `tutorial-store.ts`
15. `ui-store.ts`

---

## 3. Store Consolidation Map

This section details the mapping from the old stores to the new, consolidated stores.

### **A. `useGameStore.ts`**

This store will become the single source of truth for all state related to active gameplay.

-   **Source Stores:** `game-store`, `charleston-store`, `turn-store`, `tile-store`, `pattern-store`.

| New Property | Old Property(s) | Old Store(s) | Notes |
| :--- | :--- | :--- | :--- |
| `phase` | `gamePhase` | `game-store` | Will be expanded to include `'charleston'`. |
| `playerHand` | `playerHand` | `tile-store` | The array of the player's tiles. |
| `exposedTiles` | `exposedTiles` | `tile-store` | Tiles from completed calls (pungs, kongs). |
| `discardPile` | `discardPile` | `turn-store` | The array of discarded tiles. |
| `wallCount` | `wallTilesRemaining` | `game-store` | Number of tiles left in the wall. |
| `turnOrder` | `turnOrder` | `turn-store` | An array of player IDs in order. |
| `currentPlayerId` | `currentPlayer` | `turn-store` | The ID of the player whose turn it is. |
| `targetPatterns` | `targetPatterns` | `pattern-store` | An array of pattern IDs the user is considering. |
| `charleston` | `currentPhase`, `selectedTiles` | `charleston-store` | Charleston-specific state will be nested in this object. |
| `actions.drawTile()` | `addTile()` | `tile-store` | **Refactor:** Will now also decrement `wallCount`. |
| `actions.discardTile()` | `removeTile()` | `tile-store` | **Refactor:** Will add the tile to `discardPile` and call `advanceTurn()`. |
| `actions.advanceTurn()` | `advanceTurn()` | `turn-store` | Logic will be self-contained within this store. |
| `actions.startCharleston()` | `startCharleston()` | `charleston-store` | Will set `phase` to `'charleston'`. |
| `actions.selectPattern()` | `addTargetPattern()` | `pattern-store` | Direct logic move. |

### **B. `useIntelligenceStore.ts`**

This store will only hold the results of AI analysis. It will not contain any analysis logic itself.

-   **Source Store:** `intelligence-store`.

| New Property | Old Property(s) | Old Store(s) | Notes |
| :--- | :--- | :--- | :--- |
| `handAnalysis` | `currentAnalysis` | `intelligence-store` | The complete analysis object for the current hand. |
| `tileRecommendations` | `tileRecommendations` | `intelligence-store` | A map of tile instance IDs to their recommendation. |
| `patternRankings` | `recommendedPatterns` | `intelligence-store` | A ranked list of the best patterns to pursue. |
| `isAnalyzing` | `isAnalyzing` | `intelligence-store` | A boolean to indicate when analysis is in progress. |
| `actions.setAnalysis()` | `analyzeHand` (partial) | `intelligence-store` | **Refactor:** This will be a simple setter. The analysis logic will be moved to a separate service that calls this action when complete. |

### **C. `useRoomStore.ts`**

This store will manage all aspects of multiplayer connectivity, room state, and player management.

-   **Source Stores:** `multiplayer-store`, `room-store`, `room-setup-store`, `connection.store`, `player.store`.

| New Property | Old Property(s) | Old Store(s) | Notes |
| :--- | :--- | :--- | :--- |
| `socket` | (new) | - | The actual Socket.IO client instance will be stored here. |
| `isConnected` | `isConnected` | `connection.store` | Boolean for socket connection status. |
| `room` | `currentRoom` | `multiplayer-store` | The room object, containing the list of players. |
| `roomCode` | `currentRoomCode` | `room.store` | The 4-letter code for the room. |
| `setup.mode` | `coPilotMode` | `room-setup-store` | The selected mode ('solo' or 'everyone'). |
| `setup.step` | `currentStep` | `room-setup-store` | The current step of the room setup UI. |
| `actions.createRoom()` | `handleRoomCreated` | `room-setup-store` | Will contain the socket logic to create a room. |
| `actions.joinRoom()` | `handleRoomJoined` | `room-setup-store` | Will contain the socket logic to join a room. |
| `actions.setPlayerPosition()` | `setPlayerPosition` | `player.store` | Direct logic move. |

### **D. `useUIStore.ts`**

This store will manage global UI state, user preferences, and long-term user data like game history.

-   **Source Stores:** `ui-store`, `tutorial-store`, `history-store`, `dev-perspective.store`.

| New Property | Old Property(s) | Old Store(s) | Notes |
| :--- | :--- | :--- | :--- |
| `theme` | `theme` | `ui-store` | 'light' or 'dark'. |
| `activeModal` | (new) | - | A string to control which modal is open (e.g., 'settings', 'history'). |
| `tutorial` | `progress`, `isActive` | `tutorial-store` | All tutorial-related state will be nested here. |
| `history` | `completedGames` | `history-store` | The list of past games for the analytics view. |
| `dev` | `activeDevPlayerId` | `dev-perspective.store` | Developer-only state will be nested here for clarity. |
| `actions.toggleTheme()` | `setTheme` | `ui-store` | Direct logic move. |
| `actions.startTutorial()` | `startTutorial()` | `tutorial-store` | Direct logic move. |
| `actions.addGameToHistory()` | `completeGame` | `history-store` | Direct logic move. |

---

## 4. Impact Analysis & Refactoring Strategy

This refactoring will touch many components. The strategy is to perform the migration incrementally, one store at a time, to minimize disruption.

#### **Addressing Side Effects (The Infinite Loop Problem)**

The current architecture causes infinite loops because state updates are spread across multiple stores, triggering a cascade of `useEffect` hooks.

-   **Before:** `discardTile()` in `tile-store` -> `useEffect` in component -> `advanceTurn()` in `turn-store` -> `useEffect` in another component -> `analyzeHand()` in `intelligence-store`.
-   **After:** `discardTile()` in `useGameStore` will update the `playerHand`, `discardPile`, and `currentPlayerId` all in a **single, atomic `set` operation**. This completely removes the cascading updates, solving the root cause of the loops.

#### **Refactoring Process for Each Component:**

For every file that imports from the old `stores` directory, we will follow these steps:

1.  **Update Import:** Change `import { useOldStore } from '...';` to `import { useNewStore } from '...';`.
2.  **Update State Selection:** Modify the state selectors to point to the new, consolidated store.
    -   **Before:** `const hand = useTileStore(s => s.playerHand);` and `const turn = useTurnStore(s => s.turnNumber);`
    -   **After:** `const { hand, turn } = useGameStore(s => ({ hand: s.playerHand, turn: s.turnNumber }));`
3.  **Update Action Calls:** Change the action calls to use the new store's `actions` object.
    -   **Before:** `useTileStore.getState().removeTile(tileId);`
    -   **After:** `useGameStore.getState().actions.discardTile(tileId);`

---

## 5. State Persistence & Consistency Plan

We will continue to use Zustand's `persist` middleware, but with a more deliberate strategy to ensure consistency across sessions without storing stale data.

-   **`useGameStore`:**
    -   **Persist:** `playerHand`, `exposedTiles`, `targetPatterns`, `wallCount`, `discardPile`, `currentPlayerId`.
    -   **Rationale:** This allows a user to refresh the page or close the browser and resume an active game exactly where they left off.

-   **`useRoomStore`:**
    -   **Persist:** `roomCode`, `currentPlayerId`.
    -   **Rationale:** This allows for quick reconnection to a multiplayer game without needing to re-enter the room code. The full room state will be fetched from the server on reconnect.

-   **`useUIStore`:**
    -   **Persist:** `theme`, `tutorial.completedSections`, `history`, `dev`.
    -   **Rationale:** This maintains the user's visual preferences and long-term progress across all sessions.

-   **`useIntelligenceStore`:**
    -   **Do Not Persist.**
    -   **Rationale:** AI analysis results can become stale quickly as the game state changes. This data should always be recalculated on app load based on the fresh `useGameStore` state to ensure accuracy.

This persistence strategy ensures a seamless user experience for both resuming games and maintaining preferences, while preventing data corruption from stale, persisted state.
