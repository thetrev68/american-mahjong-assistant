# Zustand Refactor - Fixes Applied

**Date:** 2025-10-09
**Status:** Room creation working, some features still need migration

## Issues Fixed

### 1. ✅ Infinite Re-render Loop
**Problem:** Components creating new object references on every render
**Files Fixed:**
- `useRoomSetup.ts` - Changed object selector to individual primitive selectors
- `room-setup.store.ts` - Converted to proper Zustand hook pattern
- `player.store.ts` - Fixed selector pattern
- `history-store.ts` - Fixed selector pattern
- `dev-perspective.store.ts` - Fixed selector pattern

### 2. ✅ Initial Step Mismatch
**Problem:** Store had `step: 'initial'` but component only handled specific step names
**Fix:** Changed initial step to `'mode-selection'` in `useRoomStore.ts`

### 3. ✅ Missing Store Methods
**Problem:** `room-multiplayer.ts` calling old store methods that don't exist
**Files Fixed:**
- `room-multiplayer.ts` - Changed `updateRoom()` → `actions.setCurrentRoom()`
- `room-multiplayer.ts` - Changed all store method calls to use `.actions.xxx()`
- `useRoomStore.ts` - Added 9 legacy compatibility stub methods

**Compatibility stubs added:**
```typescript
removePlayer, transferHost, updateHostPermissions,
updatePlayers, setCurrentPhase, updatePlayerState,
setPlayerReadiness, addSpectator, setCurrentRoomSettings
```

### 4. ✅ Alert Method Not Found
**Problem:** `room-multiplayer.ts` calling `addAlert()` directly instead of `actions.addAlert()`
**Fix:** Changed all 18 instances to use `useGameStore.getState().actions.addAlert()`

## Current Status

### ✅ Working Features
- Home page loads
- Room setup page renders
- Room creation (multiplayer mode)
- Socket connection
- Backend communication

### ⚠️ Partially Working
- Player positioning (backend emits populate-test-players, waiting for response)
- Room updates (warnings logged but don't crash)

### ❌ Not Yet Tested
- Tile input flow
- Charleston phase
- Gameplay mode
- Pattern selection

## Technical Debt

### High Priority
**`room-multiplayer.ts` needs full refactor** - Currently using compatibility stubs
- File has 535 lines calling old store API
- 9 methods are stubs that just log warnings
- Real implementations needed for:
  - `updatePlayers` - Convert Room players to CrossPhasePlayerState
  - `setPlayerReadiness` - Track ready states per phase
  - `setCurrentPhase` - Phase transitions
  - Others as needed

### Medium Priority
**Wrapper stores should be eliminated**
- `room-setup.store.ts`, `player.store.ts`, `history-store.ts`, `dev-perspective.store.ts`
- Components should use consolidated stores directly
- Migration path: Update components one-by-one to use `useRoomStore`, `useUIStore` directly

### Low Priority
**SessionStorage versioning**
- Old persisted state can cause issues
- Need version check + auto-migration logic
- Currently requires manual `sessionStorage.clear()`

## Files Modified

```
packages/frontend/src/
├── stores/
│   ├── useRoomStore.ts (added compatibility stubs)
│   ├── room-setup.store.ts (fixed hook pattern)
│   ├── player.store.ts (fixed selector pattern)
│   ├── history-store.ts (fixed selector pattern)
│   └── dev-perspective.store.ts (fixed selector pattern)
├── hooks/
│   ├── useRoomSetup.ts (fixed object selector → primitives)
│   └── useMultiplayer.ts (added debug logging)
└── lib/services/
    └── room-multiplayer.ts (fixed all store method calls)
```

## Next Steps

1. **Test room creation flow end-to-end**
   - Verify populate-test-players backend response
   - Check if player positioning works

2. **Refactor `room-multiplayer.ts` (4-6 hours)**
   - Implement all stub methods properly
   - Update to use new store structure
   - Remove compatibility warnings

3. **Test remaining flows**
   - Tile input
   - Charleston
   - Gameplay
   - Fix any issues found

4. **Migrate components to use stores directly**
   - Remove wrapper store usage
   - Use proper selectors everywhere

5. **Execute AI Service Cleanup Plan**
   - See `AI_SERVICE_CLEANUP_PLAN.md`
   - Estimated 6 hours

## Known Issues

1. **`populate-test-players` response not received** - Need to verify backend is handling event
2. **Some store methods are stubs** - Log warnings but don't implement functionality
3. **SessionStorage can have stale data** - Requires manual clear

## Testing Checklist

- ✅ Home page loads
- ✅ Room setup renders
- ✅ Room creation (multiplayer)
- ⚠️ Player positioning (in progress)
- ❓ Tile input
- ❓ Charleston
- ❓ Gameplay
- ❓ Pattern selection
- ❓ Dev shortcuts (partially tested)
