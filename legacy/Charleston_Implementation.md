# Charleston & Positioning Master Implementation Plan
*American Mahjong Web Assistant - Complete Development Roadmap*

## OVERVIEW & CORE PRINCIPLES

### Primary Goal
Transform the app from basic tile input to full Charleston coordination with intelligent recommendations.

### Core Features to Build
1. **Player Positioning System** - Host assigns East/South/West/North positions
2. **Dealer & Tile Count Logic** - East gets 14 tiles, others get 13
3. **Charleston Recommendation Engine** - AI-powered passing suggestions
4. **Charleston Interface** - Three-phase tile passing coordination
5. **Game Flow Integration** - Smooth phase transitions

### Technical Constraints
- **Context Window Management**: One small component per session
- **No Function Renaming**: Maintain all existing function/variable names
- **Incremental Testing**: Each chunk must work independently
- **Socket.io Integration**: All real-time features use existing socket patterns

---

## IMPLEMENTATION CHUNKS

### CHUNK 1: Charleston Types & Recommendation Engine Core
**Session Goal**: Create recommendation engine foundation
**Files to Create**:
- `types/charleston-types.ts` - Charleston-specific type definitions
- `utils/charleston-engine.ts` - Core passing recommendation logic

**Key Types to Define**:
```typescript
interface CharlestonRecommendation {
  tilesToPass: Tile[];
  tilesToKeep: Tile[];
  reasoning: string[];
  confidence: number;
  alternativeOptions: Tile[][];
}

interface CharlestonPhaseState {
  phase: 'right' | 'across' | 'left' | 'optional' | 'complete';
  playerSelections: Map<string, Tile[]>;
  allPlayersReady: boolean;
  passDirection: PassDirection;
}
```

**Integration Points**:
- Must work with existing `Tile` and `HandAnalysis` types
- Should integrate with `useHandAnalysis.tsx` hook
- Output format compatible with existing recommendation display

---

### CHUNK 2: Charleston Tile Selection Component
**Session Goal**: Build tile selection UI with recommendations
**Files to Create**:
- `components/charleston/CharlestonTileSelector.tsx`

**Component Requirements**:
- Shows current hand with recommendation highlights
- Select exactly 3 tiles to pass
- Display recommendation reasoning
- Visual feedback for selection state
- Integration with recommendation engine from Chunk 1

**Props Interface**:
```typescript
interface CharlestonTileSelectorProps {
  playerTiles: Tile[];
  recommendations: CharlestonRecommendation;
  selectedTiles: Tile[];
  onTileSelect: (tile: Tile) => void;
  phase: CharlestonPhase;
  isReadyToPass: boolean;
  onConfirmSelection: () => void;
}
```

---

### CHUNK 3: Player Positioning Component
**Session Goal**: Host assigns player positions with drag/drop
**Files to Create**:
- `components/room/PlayerPositioning.tsx`

**Component Requirements**:
- Visual mahjong table layout
- Drag/drop players to positions
- Clear dealer (East) indicator
- Position validation (exactly 4 positions, one dealer)
- Socket integration for position updates

**Props Interface**:
```typescript
interface PlayerPositioningProps {
  players: Player[];
  currentPositions: Map<string, PlayerPosition>;
  isHost: boolean;
  onPositionChange: (playerId: string, position: PlayerPosition) => void;
  onConfirmPositions: () => void;
}
```

---

### CHUNK 4: Dealer Tile Count Logic
**Session Goal**: Update validation for 14/13 tile split
**Files to Modify**:
- `utils/tile-utils.ts` - Add dealer validation function
- Create: `utils/dealer-logic.ts` - Dealer-specific utilities

**New Functions Needed**:
```typescript
const validateDealerTileCount = (tiles: Tile[], isDealer: boolean): ValidationResult
const getTargetTileCount = (position: PlayerPosition): number
const isDealerPosition = (position: PlayerPosition): boolean
```

**Integration Points**:
- Must work with existing `validateTileCollection` function
- Should integrate with `HandTileGrid` maxTiles prop
- Compatible with existing socket tile update events

---

### CHUNK 5: Charleston Phase Management
**Session Goal**: Coordinate Charleston phases across players
**Files to Create**:
- `hooks/useCharleston.ts` - Charleston state management hook

**Hook Requirements**:
- Manages phase progression (right → across → left → optional)
- Tracks player selections and readiness
- Handles tile distribution after each phase
- Integrates with socket events for real-time sync

**Hook Interface**:
```typescript
interface UseCharlestonReturn {
  charlestonState: CharlestonPhaseState;
  selectTile: (tile: Tile) => void;
  confirmSelection: () => void;
  canAdvancePhase: boolean;
  advancePhase: () => void;
  skipOptionalPhase: () => void;
}
```

---

### CHUNK 6: Charleston Socket Integration
**Session Goal**: Add Charleston socket events
**Files to Modify**:
- `hooks/useSocket.ts` - Add Charleston socket events
- `server.ts` - Add server-side Charleston handlers
- `roomManager.ts` - Add Charleston state management

**New Socket Events**:
```typescript
'charleston-select-tiles': { playerId: string; tiles: Tile[] }
'charleston-confirm-selection': { playerId: string }
'charleston-phase-complete': { phase: CharlestonPhase; distributions: TileDistribution[] }
'charleston-advance-phase': { newPhase: CharlestonPhase }
```

---

### CHUNK 7: Position Assignment Socket Integration
**Session Goal**: Real-time position assignment
**Files to Modify**:
- `hooks/useSocket.ts` - Add position socket events
- `server.ts` - Add position assignment handlers
- `roomManager.ts` - Store player positions

**New Socket Events**:
```typescript
'assign-position': { playerId: string; position: PlayerPosition }
'positions-updated': { positions: Map<string, PlayerPosition> }
'confirm-positions': { positions: Map<string, PlayerPosition> }
```

---

### CHUNK 8: Game Flow State Machine
**Session Goal**: Orchestrate phase transitions
**Files to Create**:
- `utils/game-state-machine.ts` - Phase transition logic

**State Machine Flow**:
```
waiting → positioning → tile-input → charleston → playing → finished
```

**Phase Validation Rules**:
- positioning: All players assigned unique positions
- tile-input: Dealer has 14 tiles, others have 13
- charleston: All phases completed or skipped
- playing: Ready to begin actual game

---

### CHUNK 9: Charleston UI Integration
**Session Goal**: Integrate Charleston components into main game flow
**Files to Modify**:
- `GameLobbyPage.tsx` - Add Charleston phase rendering
- `PrivateHandView.tsx` - Add Charleston mode

**Integration Requirements**:
- Charleston tile selector appears during Charleston phase
- Recommendations panel shows Charleston-specific advice
- Progress indicators show phase status
- Smooth transitions between phases

---

### CHUNK 10: Enhanced Recommendation Display
**Session Goal**: Charleston-specific recommendation UI
**Files to Create**:
- `components/charleston/CharlestonRecommendationPanel.tsx`

**Panel Features**:
- Shows why tiles should be passed
- Explains what to do with received tiles
- Pattern analysis during Charleston
- Confidence indicators for suggestions

---

## INTEGRATION POINTS & CONSISTENCY RULES

### Socket Event Naming Convention
- All Charleston events prefixed with `charleston-`
- All positioning events prefixed with `position-`
- Follow existing camelCase pattern

### Component Props Pattern
- All components receive `isHost` and `playerId` props
- Socket functions passed as props, not direct hook usage
- Consistent error handling via error props

### State Management Pattern
- Phase state managed in `roomManager.ts`
- Private recommendations in individual player hooks
- Real-time sync via Socket.io events

### Type Definitions
- All new types in appropriate files under `types/`
- Extend existing types, don't replace them
- Maintain compatibility with existing `Player` and `Tile` interfaces

---

## 3-PLAYER CHARLESTON RULES

### Phase Adjustments
- **Pass Right**: Player 1→2, Player 2→3, Player 3→1
- **Pass Across**: SKIP (not possible with 3 players)
- **Pass Left**: Player 1→3, Player 2→1, Player 3→2
- **Optional**: Same as Pass Left if enabled

### UI Considerations
- Gray out "Pass Across" phase for 3-player games
- Show "Skipping Across Pass" message
- Adjust progress indicators accordingly

---

## SUCCESS CRITERIA

### Phase 1 Complete When:
- Players can be assigned to positions
- Dealer gets 14 tiles, others get 13
- Charleston recommendations work
- Basic Charleston tile selection works

### Phase 2 Complete When:
- Full Charleston coordination works
- Real-time tile passing
- All three phases work smoothly
- Integration with existing game flow

### Final Success When:
- Groups say "the Charleston feature makes the game better"
- Players trust and use the recommendations
- No confusion about tile counts or positions
- Smooth, intuitive user experience

---

## DEVELOPMENT SESSION CHECKLIST

### Before Each Session:
1. Review this master plan
2. Identify which chunk to work on
3. Check integration points with previous chunks
4. Confirm no function/variable name changes

### During Each Session:
1. Create/modify only the files listed for that chunk
2. Test the chunk independently
3. Document any integration notes
4. Update this plan if needed

### After Each Session:
1. Verify chunk works as expected
2. Note any issues for next session
3. Update integration points if changed
4. Mark chunk as complete

---

*This plan will be referenced at the start of each development session to maintain consistency and direction.*