# Phase 2: Turn Management System - Single Session Breakout Plan

## 🎯 **Session Goal: Basic Turn Rotation Without Complex Actions**

**Context Window**: Single session implementation (3-4 hours)  
**Scope**: Core turn management only - no complex game actions yet  
**Success Criteria**: 4 players can take turns in proper East→North→West→South order

---

## 📋 **Pre-Session Assessment (5 minutes)**

### **Files to Examine First:**
1. `frontend/src/stores/game-store.ts` - Current game state management
2. `frontend/src/features/gameplay/GameModeView.tsx` - Existing gameplay interface  
3. `backend/src/features/socket-communication/socket-handlers.ts` - Socket events
4. `shared/multiplayer-types.ts` - Type definitions

### **Key Questions to Answer:**
- Does `game-store.ts` already have turn management state?
- What turn-related events already exist in socket handlers?
- How is current player tracked in GameModeView?

---

## 🛠️ **Implementation Tasks (Priority Order)**

### **Task 1: Create Turn Management Store (45 minutes)**
**File**: `frontend/src/stores/turn-store.ts` (NEW)

```typescript
interface TurnState {
  // Core turn rotation
  currentPlayer: string | null
  turnOrder: string[] // ['east', 'north', 'west', 'south']  
  turnNumber: number
  roundNumber: number
  
  // Multiplayer coordination
  isMultiplayerMode: boolean
  roomId: string | null
  
  // Turn timing
  turnStartTime: Date | null
  turnTimeRemaining: number | null
  
  // Actions
  advanceTurn: () => void
  setTurnOrder: (playerIds: string[]) => void
  setMultiplayerMode: (enabled: boolean, roomId?: string) => void
  initializeTurns: (playerIds: string[]) => void
  resetTurns: () => void
}
```

**Success Check**: Store compiles and basic turn advancement works

### **Task 2: Add Backend Turn Events (30 minutes)**
**File**: `backend/src/features/socket-communication/socket-handlers.ts`

**Add 3 New Events:**
```typescript
// Turn management events
'turn-start': (data: { roomId: string; playerId: string; turnNumber: number }) => void
'turn-advance': (data: { roomId: string; currentPlayerId: string; nextPlayerId: string }) => void  
'turn-status': (data: { roomId: string; currentPlayer: string; turnNumber: number })
```

**Success Check**: Events emit correctly and reach all room participants

### **Task 3: Create Turn Multiplayer Service (30 minutes)**  
**File**: `frontend/src/services/turn-multiplayer.ts` (NEW)

**Core Functions:**
- `advanceTurn(currentPlayerId)` - Notify server of turn completion
- `requestTurnStatus()` - Get current turn state from server
- Event listeners for turn updates from other players

**Success Check**: Turn advances synchronize across 2+ browser windows

### **Task 4: Update Game Store Integration (20 minutes)**
**File**: `frontend/src/stores/game-store.ts`

**Add Turn Integration:**
- `currentTurnPlayer: string | null`  
- `isMyTurn: boolean` (computed property)
- Integration with existing `gamePhase` management

**Success Check**: Game store properly tracks whose turn it is

### **Task 5: Basic Turn UI Components (45 minutes)**
**Files**: 
- `frontend/src/features/gameplay/TurnIndicator.tsx` (NEW)
- `frontend/src/features/gameplay/GameModeView.tsx` (MODIFY)

**TurnIndicator Component:**
```jsx
// Simple turn status display
<div className="turn-indicator">
  <h3>Current Turn: {currentPlayerName}</h3>
  <div className="turn-order">
    {turnOrder.map(player => (
      <PlayerTurnCard key={player} active={player === currentPlayer} />
    ))}
  </div>
  {isMyTurn && <Button onClick={handleEndTurn}>End Turn</Button>}
</div>
```

**Success Check**: UI shows current player and allows turn advancement

### **Task 6: Solo Mode Turn Simulation (20 minutes)**
**File**: `frontend/src/stores/turn-store.ts`

**Add Solo Mode Logic:**
- Manual turn advancement for solo players
- Simple "Next Player" button interface
- Timer simulation (optional)

**Success Check**: Solo mode can cycle through all 4 players

---

## 🧪 **Testing Plan (30 minutes)**

### **Test 1: Single Player Turn Management**
1. Start app in solo mode
2. Initialize 4 players (You, Player 2, Player 3, Player 4)  
3. Verify turn order: East → North → West → South → East
4. Test manual turn advancement

### **Test 2: Multiplayer Turn Synchronization**
1. Start backend server
2. Open 2 browser windows
3. Create room and join with both
4. Verify turn synchronization when one player advances

### **Test 3: Integration with Existing Game Flow**
1. Complete Charleston phase (from Phase 1)
2. Transition to gameplay phase  
3. Verify turn management starts correctly

---

## ⚡ **Quick Wins & Shortcuts**

### **Use Existing Infrastructure:**
- Charleston multiplayer service pattern → Copy for turn service
- Room coordination from Phase 1 → Reuse for turn events  
- Game store patterns → Extend for turn state

### **Simplified First Version:**
- **No action validation** (draw/discard logic) - just turn rotation
- **No timers** - manual advancement only
- **No game actions** - focus purely on "whose turn is it"

### **Defer Complex Features:**
- Call opportunities (pung/kong) → Phase 3
- Action validation → Phase 3  
- Turn timeouts → Phase 4
- Game end detection → Phase 5

---

## 🎯 **Session Success Criteria**

### **Must Have (MVP):**
- ✅ 4 players in proper turn order (East→North→West→South)
- ✅ Turn advancement synchronizes in multiplayer
- ✅ UI shows whose turn it is currently  
- ✅ Solo mode can simulate all 4 players

### **Nice to Have (Stretch):**
- ✅ Turn counter display (Turn 1, Turn 2, etc.)
- ✅ Simple turn timing display
- ✅ Integration with Charleston→Gameplay flow

### **Explicit Non-Goals:**
- ❌ Draw/discard mechanics (Phase 3)
- ❌ Call opportunities (Phase 3)  
- ❌ Tile validation (Phase 3)
- ❌ Game end conditions (Phase 5)

---

## 📁 **Expected File Changes**

### **New Files (3):**
- `frontend/src/stores/turn-store.ts`
- `frontend/src/services/turn-multiplayer.ts`  
- `frontend/src/features/gameplay/TurnIndicator.tsx`

### **Modified Files (4):**
- `backend/src/features/socket-communication/socket-handlers.ts`
- `frontend/src/stores/game-store.ts`
- `frontend/src/features/gameplay/GameModeView.tsx`
- `shared/multiplayer-types.ts`

### **Estimated LOC:** ~400-500 lines total

---

## 🚀 **Next Session Prep**

**After Phase 2 Success:**
- **Phase 3**: Add draw/discard mechanics to turn system
- **Phase 4**: Implement call opportunities (pung/kong)
- **Phase 5**: Add turn timeouts and game end conditions

**Context Window Strategy:**
Each phase builds incrementally on the turn management foundation from Phase 2.

---

## ⚠️ **Risk Mitigation**

### **Potential Issues:**
1. **Turn state conflicts** - Use last-timestamp-wins strategy
2. **Player disconnection** - Skip turns for offline players  
3. **Integration complexity** - Keep turn logic separate from game actions

### **Rollback Plan:**
All changes are additive - existing Charleston functionality remains untouched.

**This plan delivers working turn management in a single focused session while preserving all Phase 1 Charleston functionality.**