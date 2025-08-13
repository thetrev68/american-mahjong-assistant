I'll help you draft a development plan for completing the American Mahjong Assistant web app! Let me first search your project knowledge to understand the current state and what's needed for regular gameplay.Now let me search for more specific information about the current functionality and what needs to be built for regular gameplay.Perfect! Now I understand the current state of your American Mahjong Assistant. Based on the project knowledge and your technical analysis documents, I can see you have:

✅ **Completed**: Game lobby/room creation, Charleston implementation, positioning system, tile input
🔄 **Current Gap**: Regular gameplay functionality (discard tracking, turn management, tile calling)

## **Development Plan for Regular Gameplay**

Here's a development plan broken down into context-window-sized chunks, each focused on a specific aspect of regular gameplay:

---

### **CHUNK 1: Game State Transition & Active Game Layout**
**Session Goal**: Complete the transition from Charleston to active gameplay
**Estimated Context**: ~3000 lines of code + debugging

**What we'll build**:
1. **Game Phase Transition Logic**
   - Complete the transition from `charleston` → `playing` phase
   - Integrate with existing `GameStateMachine.ts` 
   - Add validation for starting gameplay (all tiles distributed)

2. **Active Game Layout Component**
   - Create new `ActiveGamePage.tsx` 
   - Split view: Private hand (bottom) + Shared game state (top)
   - Mobile-responsive design for phone screens during actual gameplay

**Files to Create/Modify**:
- `src/pages/ActiveGamePage.tsx` (NEW)
- `src/components/game/GameActions.tsx` (NEW)  
- Modify `GameLobbyPage.tsx` to handle phase transition
- Update `game-state-machine.ts` transition validation

---

### **CHUNK 2: Turn Management & Player Actions**
**Session Goal**: Implement turn tracking and basic player actions  
**Estimated Context**: ~2800 lines of code + debugging

**What we'll build**:
1. **Turn Management System**
   - Track whose turn it is (East starts as dealer)
   - Turn rotation logic (East → South → West → North → East)
   - Visual turn indicators for all players

2. **Basic Player Actions**
   - Discard tile from hand
   - Draw tile (increment tile count)
   - Pass turn to next player

**Files to Create/Modify**:
- `src/hooks/useTurnManager.ts` (NEW)
- `src/components/game/TurnIndicator.tsx` (NEW)
- `src/components/game/PlayerActions.tsx` (NEW)
- Update socket events in backend for turn management

---

### **CHUNK 3: Discard Pile & Shared Game View**
**Session Goal**: Implement shared discard tracking visible to all players
**Estimated Context**: ~3200 lines of code + debugging  

**What we'll build**:
1. **Discard Pile Display**
   - Real-time shared view of all discarded tiles
   - Visual organization by player position
   - Recent discards highlighted

2. **Discard Action Integration**  
   - Discard tile from private hand
   - Real-time sync across all devices
   - Discard validation (can't discard what you don't have)

**Files to Create/Modify**:
- `src/components/game/DiscardPile.tsx` (NEW)
- `src/components/game/DiscardAction.tsx` (NEW)
- Update `SharedGameView.tsx` to show discards
- Backend socket handlers for discard events

---

### **CHUNK 4: Tile Calling System (Pung/Kong/Chow)**
**Session Goal**: Implement tile calling for exposed sets
**Estimated Context**: ~3500 lines of code + debugging

**What we'll build**:
1. **Call Detection & UI**
   - Detect when players can call discarded tiles
   - Show "Call" buttons for valid combinations  
   - Priority system (Mahjong > Pung/Kong > Chow)

2. **Exposed Set Management**
   - Create exposed sets from calls
   - Remove tiles from private hands
   - Display exposed sets for all players

**Files to Create/Modify**:
- `src/components/game/TileCallPanel.tsx` (NEW)
- `src/components/game/ExposedSets.tsx` (NEW) 
- `src/hooks/useTileCalling.ts` (NEW)
- `src/utils/call-validation.ts` (NEW)
- Backend validation for tile calls

---

### **CHUNK 5: Hand Analysis & Recommendations**
**Session Goal**: Integrate strategic recommendations during active play
**Estimated Context**: ~2900 lines of code + debugging

**What we'll build**:
1. **Real-time Hand Analysis**
   - Analyze current hand for possible patterns
   - Show progress toward winning combinations
   - Recommend which tiles to discard

2. **Strategic Suggestions**
   - Show probability of completing hands
   - Suggest whether to call tiles or keep them
   - Basic defensive play recommendations

**Files to Create/Modify**:
- Enhance existing `recommendation-engine.ts`
- `src/components/game/HandAnalysis.tsx` (NEW)
- `src/components/game/DiscardRecommendations.tsx` (NEW)  
- `src/hooks/useHandAnalysis.ts` (NEW)

---

### **CHUNK 6: Mahjong Declaration & Game End**
**Session Goal**: Handle winning conditions and game completion
**Estimated Context**: ~2600 lines of code + debugging

**What we'll build**:
1. **Mahjong Declaration**
   - "Mahjong" button when hand is complete
   - Validation of winning hand against card
   - Interrupt other players' actions

2. **Game End Flow**
   - Score calculation assistance
   - Final hand display for all players
   - Game statistics and summary

**Files to Create/Modify**:
- `src/components/game/MahjongDeclaration.tsx` (NEW)
- `src/components/game/GameEndSummary.tsx` (NEW)
- `src/utils/scoring-helper.ts` (NEW)
- `src/pages/GameCompletePage.tsx` (NEW)

---

## **Development Sequence Strategy**

**Session Structure**: Each chunk follows this pattern:
1. **Planning** (5 min): Review what we're building
2. **Core Implementation** (25-35 min): Build the main functionality  
3. **Integration** (10-15 min): Connect with existing systems
4. **Testing & Debug** (10-15 min): Fix immediate issues
5. **Validation** (5 min): Confirm it works with existing features

**Integration Points**: Each chunk builds on the previous ones and maintains compatibility with your existing:
- Socket.io real-time communication
- Mobile-first responsive design  
- Private/shared state boundaries
- Game state machine validation

**Rollback Safety**: After each chunk, the app remains in a working state - we won't break existing Charleston/lobby functionality.

---

Does this development plan look good to you? Should I start with **Chunk 1** (Game State Transition & Active Game Layout), or would you prefer to tackle a different piece first?

The plan respects your guidelines: no over-engineering, clear planning before coding, staying compatible with existing code, and keeping things simple for a beginner developer.