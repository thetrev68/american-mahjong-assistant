# Multiplayer Dev Testing Feature - Implementation Plan

## Overview
Add a dev-only player perspective switcher to test multiplayer mode on a single device. This allows switching between Player 1-4 perspectives to see different hands, patterns, and Charleston states without needing 4 physical devices.

## Goals
- Test full multiplayer game flow solo
- Switch player perspective on demand
- See each player's unique hand/patterns/state
- Preserve all 4 players' states in backend
- Integrate cleanly with existing DevShortcuts UI

## Architecture Strategy

### Core Concept: "Active Dev Perspective"
- Backend maintains all 4 players' states normally
- Frontend adds a "dev perspective" layer that switches which player's data to display
- All stores/components respect the "active perspective playerId"
- Socket connection remains as single client, but sends commands "as" different players

## Files to Modify

### 1. **DevShortcuts.tsx** ✏️
**Location:** `packages/frontend/src/ui-components/DevShortcuts.tsx`

**Changes:**
- Add new `multiplayer` variant to existing variants
- Add player switcher dropdown (Player 1 | 2 | 3 | 4)
- Display current perspective prominently
- Add visual indicator for which player is "you"

**New Props:**
```typescript
interface DevShortcutsProps {
  // ... existing props
  onSwitchPlayer?: (playerId: string) => void
  currentDevPlayerId?: string | null
  variant?: 'setup' | 'gameplay' | 'charleston' | 'tile-input' | 'multiplayer'
}
```

### 2. **Create Dev Perspective Store** 🆕
**Location:** `packages/frontend/src/stores/dev-perspective.store.ts`

**Purpose:** Manage dev-only player perspective switching

**State:**
```typescript
interface DevPerspectiveStore {
  isDevMode: boolean
  activeDevPlayerId: string | null
  allPlayerIds: string[] // Track all 4 players in the room

  setActiveDevPlayer: (playerId: string) => void
  registerPlayer: (playerId: string) => void
  clearDevMode: () => void

  // Utility
  getEffectivePlayerId: () => string | null // Returns dev player OR real player
}
```

**Key Logic:**
- Only active in dev mode (`import.meta.env.DEV`)
- Falls back to real `currentPlayerId` if not in dev mode
- Persists in sessionStorage (not localStorage - temp only)

### 3. **Multiplayer Store Integration** ✏️
**Location:** `packages/frontend/src/stores/multiplayer-store.ts`

**Changes:**
- Import dev perspective store
- Update `getCurrentPlayer()` to respect dev perspective
- Update `getPlayerGameState()` to use dev perspective
- Add `getDevEffectivePlayerId()` helper

**Example:**
```typescript
getCurrentPlayer: () => {
  const state = get()
  const devStore = useDevPerspectiveStore.getState()
  const effectivePlayerId = devStore.getEffectivePlayerId() || state.currentPlayerId

  if (!state.currentRoom || !effectivePlayerId) return null
  return state.currentRoom.players.find(p => p.id === effectivePlayerId) || null
}
```

### 4. **useMultiplayer Hook Enhancement** ✏️
**Location:** `packages/frontend/src/hooks/useMultiplayer.ts`

**Changes:**
- Add dev perspective awareness to state operations
- Modify socket emissions to include "acting as" player context
- Add `switchDevPerspective(playerId)` function
- Ensure state updates route to correct player

**New Return Values:**
```typescript
return {
  // ... existing returns

  // Dev testing additions
  switchDevPerspective: (playerId: string) => void
  currentDevPerspective: string | null
  isInDevMode: boolean
}
```

### 5. **Backend Socket Handling** ✏️
**Location:** `packages/backend/src/services/room-multiplayer.ts`

**Changes:**
- Accept optional `actingAsPlayerId` in state update events
- Route state updates to correct player in room
- Add dev helper: `dev:populate-players` event to auto-create 4 test players
- Add dev helper: `dev:set-player-hand` to set specific player's tiles

**New Events:**
```typescript
socket.on('dev:populate-players', ({ roomId }) => {
  // Create 3 AI placeholder players + current player
  // Assign positions: north, east, south, west
  // Initialize empty hands for each
})

socket.on('dev:set-player-hand', ({ roomId, playerId, tiles }) => {
  // Set specific player's hand for testing
})
```

### 6. **Player Store Integration** ✏️
**Location:** `packages/frontend/src/stores/player.store.ts`

**Changes:**
- Update `getCurrentPlayerPosition()` to use dev perspective
- Update `isCurrentPlayerHost()` to use dev perspective

### 7. **Game Components Updates** ✏️
**Affected Files:**
- `packages/frontend/src/features/gameplay/GameModeView.tsx`
- `packages/frontend/src/features/gameplay/YourHandZone.tsx`
- `packages/frontend/src/features/charleston/CharlestonView.tsx` (if exists)

**Changes:**
- Read effective player ID from dev perspective store
- Display "DEV MODE: Viewing as Player X" banner when in dev mode
- Render that player's hand/patterns/Charleston state
- All mutations still go through proper multiplayer flow

### 8. **Tile Store Integration** ✏️
**Location:** `packages/frontend/src/stores/tile-store.ts`

**Changes:**
- Store tiles per-player using playerId as key
- Use dev perspective to determine which player's tiles to display
- Update `setTiles()`, `getTiles()`, etc. to be player-aware

## Implementation Flow

### Phase 1: Foundation (Session 1)
1. Create `dev-perspective.store.ts`
2. Add multiplayer variant to `DevShortcuts.tsx`
3. Add player switcher UI dropdown
4. Wire up basic perspective switching (no backend yet)

### Phase 2: Store Integration (Session 2)
1. Update `multiplayer-store.ts` with dev perspective
2. Update `player.store.ts` with dev perspective
3. Update `tile-store.ts` to be multi-player aware
4. Test perspective switching updates UI correctly

### Phase 3: Backend Support (Session 3)
1. Add dev helper events to backend
2. Add `dev:populate-players` auto-creation
3. Add `dev:set-player-hand` for testing
4. Test with real socket connection

### Phase 4: Component Integration (Session 4)
1. Update `GameModeView.tsx` to show dev banner
2. Update `YourHandZone.tsx` to display correct player's hand
3. Update Charleston components (if applicable)
4. Add visual indicators for active perspective

### Phase 5: Testing & Polish (Session 5)
1. Test full game flow with perspective switching
2. Verify Charleston passes work per-player
3. Verify turn order respects perspectives
4. Add keyboard shortcuts (1/2/3/4 to switch players?)
5. Documentation updates

## Technical Considerations

### State Isolation
- Each player's state must be truly isolated
- Charleston passes should work independently per player
- Tile selections don't bleed across perspectives

### Socket Context
- Single socket connection but can "act as" different players
- Backend needs to validate dev mode is enabled
- Production builds MUST NOT allow perspective switching

### Performance
- Minimal overhead (only one extra store check)
- No duplicate state storage
- Lazy load player states as perspectives switch

### Security
- All dev features stripped in production builds
- `if (import.meta.env.DEV)` guards everywhere
- No dev events registered in prod backend

## Testing Scenarios

### Scenario 1: Charleston Flow
1. Create multiplayer room with 4 players (dev populated)
2. Switch to Player 1 → select tiles to pass
3. Switch to Player 2 → select different tiles
4. Switch to Player 3 → select different tiles
5. Switch to Player 4 → select different tiles
6. Verify each player passes correct tiles
7. Verify tiles received are correct per player

### Scenario 2: Gameplay Turns
1. All 4 players in gameplay phase
2. Switch to Player 1 → discard a tile
3. Switch to Player 2 → call the discard (or pass)
4. Switch to Player 3 → take turn
5. Verify turn order and game state consistency

### Scenario 3: Pattern Selection
1. Each player has different hand
2. Switch perspectives
3. Verify pattern recommendations differ per player
4. Verify intelligence panel shows player-specific insights

## UI/UX Design

### DevShortcuts Panel (Multiplayer Mode)
```
┌─────────────────────────────────┐
│ 🔧 DEV SHORTCUTS              ▼ │
├─────────────────────────────────┤
│ View As: [Player 1 ▼] ← You     │
│                                  │
│ [Player 1]  [Player 2]          │
│ [Player 3]  [Player 4]          │
│                                  │
│ 🎲 Populate Test Players        │
│ 🃏 Set Player Hand              │
│ 🔄 Reset Game                   │
└─────────────────────────────────┘
```

### Dev Mode Banner (in GameModeView)
```
┌────────────────────────────────────┐
│ 🔧 DEV MODE: Viewing as Player 2   │
│    Real player: Player 1           │
└────────────────────────────────────┘
```

## File Checklist

- [ ] `packages/frontend/src/stores/dev-perspective.store.ts` (NEW)
- [ ] `packages/frontend/src/ui-components/DevShortcuts.tsx` (EDIT)
- [ ] `packages/frontend/src/stores/multiplayer-store.ts` (EDIT)
- [ ] `packages/frontend/src/stores/player.store.ts` (EDIT)
- [ ] `packages/frontend/src/stores/tile-store.ts` (EDIT)
- [ ] `packages/frontend/src/hooks/useMultiplayer.ts` (EDIT)
- [ ] `packages/frontend/src/features/gameplay/GameModeView.tsx` (EDIT)
- [ ] `packages/frontend/src/features/gameplay/YourHandZone.tsx` (EDIT)
- [ ] `packages/backend/src/services/room-multiplayer.ts` (EDIT)

## Success Criteria

✅ Can switch between Player 1-4 perspectives seamlessly
✅ Each player sees their own hand/patterns/state
✅ Charleston passes work independently per player
✅ Turn order and game flow work correctly
✅ No state bleeding across player perspectives
✅ Zero impact on production builds
✅ Clear visual indicators of which player is active
✅ Backend maintains proper separation of player states

## Future Enhancements (Out of Scope)

- Recording/playback of multiplayer sessions
- AI bot players for automated testing
- Network latency simulation
- Snapshot/restore game states
- Multi-window sync for testing on multiple screens

---

**Ready to implement when approved!**
