# Game Screen UI/UX Redesign Implementation Plan

## Vision Overview

Transform the current Charleston-focused interface into a comprehensive game screen with 5 distinct zones optimized for mobile gameplay. The new design emphasizes intuitive tile selection with visual "picked up" mechanics and real-time game state awareness.

## Main Screen Structure (Mobile Vertical Layout)

```
┌─────────────────────────────────────┐
│ TOP ZONE                            │
│ Charleston Phase 1 | Current: You  │ 
│ ⏱️ Turn: 0:28 | Next: East          │
│ 🀄 [Draw] 📞 [Call] ↶ [Undo] ❌ [Quit] │
├─────────────────────────────────────┤
│ ZONE 1: YOUR HAND                  │
│ Primary Pattern (green squares):    │
│ 🟩🀇 🟩🀈 🟩🀉 ⬜2B 🟩🀋 🟩🀌        │
│                ↑                   │
│            thin outline with       │
│            tile ID "2B"            │
│                                    │
│ SELECTED TO PASS (when active):    │
│ 🟦🀊 [Pass] [Lock] [Clear] [Delete] │
│                                    │
│ [+ Add Tiles] (game start only)    │
├─────────────────────────────────────┤
│ ZONE 2: DISCARD PILE               │
│ 🀫 🀬 🀭 🀮 [Blank Swap]*            │
│ (*when house rule enabled)         │
├─────────────────────────────────────┤
│ ZONE 3: ALL OPPONENT EXPOSED TILES │
│ East:  🟨🀇🟨🀈🟨🀉 (pung) ⚠️         │
│ South: 🟨🀋🟨🀌🟨🀍🟨🀎 (kong)        │
│ West:  🟨🀐🟨🀑🟨🀒 (pung)           │
├─────────────────────────────────────┤
│ ZONE 4: PRIMARY PATTERN DETAILS    │
│ SINGLES & PAIRS #4                 │
│ 🟩🟩🟩⬜⬜ 73% complete             │
│ Need: 2C, 3C | AI Score: 89        │
│ Strategy: Focus on pairs...         │
├─────────────────────────────────────┤
│ ZONE 5: ALTERNATIVE PATTERNS       │
│ 🥈 CONSECUTIVE RUN #7: 67%          │
│ 🥉 ANY LIKE NUMBERS #2: 45%        │
│ [See All Patterns]                 │
└─────────────────────────────────────┘
```

## Tile Selection Behavior

### Before Selection (Normal State)
```
YOUR HAND:
🟩🀇 🟩🀈 🟩🀉 🀊 🀋 🟩🀌 🀍 🀎 🀏 🀐 🀑 🀒 🀓
Green outline = Primary Pattern tiles
Regular = Available for selection
```

### After Selecting 🀊 for Charleston
```
YOUR HAND:
🟩🀇 🟩🀈 🟩🀉 ⬜2B 🀋 🟩🀌 🀍 🀎 🀏 🀐 🀑 🀒 🀓
                ↑
        Thin outline showing "2B" 
        (where tile returns if deselected)

SELECTED TO PASS: (appears below hand)
🟦🀊 [Pass] [Lock] [Clear] [Delete]
Blue square = Selected for action
```

## Enhanced Tile Input Modal

```
┌─────────── Select Charleston Tiles ───────────┐
│ Select 3 tiles you received from other players│
│                                               │
│ YOUR CURRENT HAND:                            │
│ 1B 2B 3B __ 5B 6B 7B 8B 9B 1C 2C 3C 4C       │
│ Colorized abbreviation sorted alphabetically  │
│                                               │
│ MODAL SELECTION:                              │
│ 🟦4B 🟦5C [Selected: 2/3 tiles]              │
│                                               │
│ TILE PICKER:                                  │
│ 🃏 Jokers │ 🎋 Bams │ ⚪ Dots │ 🧱 Cracks       │
│ 🀄 1B 2B 3B 4B 5B 6B 7B 8B 9B                 │
│ [Tile selection with animations & sound]      │
│                                               │
│ [Cancel] [Confirm - Need 1 more tile]         │
└───────────────────────────────────────────────┘
```

## Visual Tile State System

| State | Visual | Description |
|-------|--------|-------------|
| **Primary Pattern** | 🟩 Green square | Tiles that match current primary pattern |
| **Selected** | 🟦 Blue square | Tiles picked up for charleston/discard |
| **Exposed** | 🟨 Yellow square + 🔒 | Tiles in exposed sets (pung/kong) |
| **Empty Placeholder** | ⬜2B | Thin outline with tile ID where selected tile returns |
| **Alert** | ⚠️ | Opponent exposed tiles needed for your primary |

## Implementation Phases

### **Phase 1: Game Screen Restructure** (2-3 days)
**Goal**: Create the 5-zone vertical mobile layout

**Tasks**:
1. **Create GameScreenLayout component** 
   - Mobile-first vertical stacking design
   - Responsive zone sizing and spacing
   - Clean separation between all 5 zones

2. **Redesign Zone 1 (Your Hand)**
   - Replace X-badge system with placeholder/selection area
   - Implement visual tile states (green/blue/yellow outlines)
   - Create SelectionArea component (conditional visibility)

3. **Build Top Zone**
   - Game phase indicator (Charleston/Gameplay)
   - Per-turn timer (30 seconds countdown) *TFC - should be elapsed timer, not countdown
   - Current player and next player display
   - Action buttons: [Draw] [Call] [Undo] [Quit]

4. **Create Zone 3 (Opponent Exposed)**
   - Display all players' exposed tiles simultaneously
   - Visual grouping by player (East/South/West/North)  *TFC - use player names
   - Alert badges (⚠️) for tiles needed in primary pattern

**Files to Modify**:
- Create: `frontend/src/features/gameplay/GameScreenLayout.tsx`
- Create: `frontend/src/features/gameplay/YourHand.tsx`
- Create: `frontend/src/features/gameplay/SelectionArea.tsx`
- Create: `frontend/src/features/gameplay/TopZone.tsx`
- Create: `frontend/src/features/gameplay/OpponentExposed.tsx`

### **Phase 2: Enhanced Tile Selection** (1-2 days)
**Goal**: Implement the "picked up" tile selection behavior

**Tasks**:
1. **Modify HandDisplay component**
   - Show thin outline placeholders instead of X badges
   - Include tile ID in placeholder (e.g., "2B")
   - Implement smooth animations for tile pickup/return  *TFC - would be great if it would "jump" from it's hand position to the selection area.

2. **Create visual tile state system**
   - Green outlines for primary pattern matches
   - Blue outlines for selected tiles
   - Yellow outlines with lock badges for exposed tiles
   - lock badges for tiles selected and locked (player wants to hold. should not appear in discard recommendation.)

3. **Selection area conditional visibility**
   - Only show when tiles are selected
   - Based on game phase and player turn
   - Include action buttons: [Pass/Discard] [Lock] [Clear] [Delete]

**Files to Modify**:
- Modify: `frontend/src/features/tile-input/HandDisplay.tsx`
- Create: `frontend/src/features/gameplay/TileStates.tsx`
- Modify: `frontend/src/stores/tile-store.ts` (add selection state)

### **Phase 3: Modal Improvements** (1 day)
**Goal**: Enhance tile input modal with colorized hand display

**Tasks**:
1. **Add background hand display to modal**
   - Show current hand as colorized abbreviation
   - Alphabetically sorted like intelligence panel
   - Update in real-time as tiles are selected

2. **Improve modal visual feedback**
   - Better selected tile display with blue squares
   - Enhanced animations and sound integration
   - Clear progress indicators (2/3 selected)

**Files to Modify**:
- Modify: `frontend/src/features/shared/TileInputModal.tsx`
- Enhance: Modal animations and sound hooks

### **Phase 4: Game Flow Integration** (1-2 days)
**Goal**: Connect all components into cohesive game experience

**Tasks**:
1. **Integrate Charleston phases with new layout**
   - Connect existing Charleston logic to new UI
   - Proper state management across all zones
   - Smooth phase transitions

2. **Add discard pile management (Zone 2)**
   - Display recent discards
   - House rule: [Blank Swap] functionality
   - Call opportunity detection

3. **Implement alerts and notifications**
   - Modal alerts for call opportunities
   - "Opponent may be going for X" warnings
   - "One tile needed for mahjong!" notifications

4. **Add per-turn timer functionality**
   - 30-second countdown per turn *TFC - elapsed timer
   - Visual and audio warnings
   - Auto-advance on timeout (configurable) *TFC - don't do this

**Files to Create/Modify**:
- Create: `frontend/src/features/gameplay/DiscardPile.tsx`
- Create: `frontend/src/features/gameplay/GameTimer.tsx` 
- Create: `frontend/src/features/gameplay/AlertSystem.tsx`
- Modify: Charleston integration files

## Technical Specifications

### **Game Timer**
- **Duration**: 30 seconds per turn (configurable)
- **Visual**: Countdown display in top zone
- **Audio**: Warning sounds at 10 seconds, 5 seconds
- **Behavior**: Auto-advance turn on timeout (with house rule setting)

### **Opponent Display**
- **Layout**: All 4 players' exposed tiles shown simultaneously
- **Grouping**: By player position (East/South/West/North)
- **Alerts**: ⚠️ badges on tiles needed for user's primary pattern
- **Updates**: Real-time as opponents make plays

### **Empty Placeholders**
- **Style**: Thin outline border (1px, gray)
- **Content**: Tile ID text (e.g., "2B", "joker", "east")
- **Size**: Same as regular tile
- **Behavior**: Click to deselect and return tile

### **Selection Area Visibility Rules**
```javascript
const showSelectionArea = (
  (gamePhase === 'charleston' && currentPlayer === 'user' && selectedTiles.length > 0) ||
  (gamePhase === 'gameplay' && currentPlayer === 'user' && selectedTiles.length > 0)
)
```

## Success Criteria

### **Phase 1 Complete**
- [ ] Mobile-optimized 5-zone vertical layout renders correctly
- [ ] Top zone shows game state, timer, and action buttons
- [ ] All opponent exposed tiles display properly
- [ ] Zone separation is clear and usable

### **Phase 2 Complete**
- [ ] Tile selection shows placeholder with tile ID
- [ ] Visual states work: green (primary), blue (selected), yellow (exposed)
- [ ] Selection area appears/disappears based on game state
- [ ] Smooth animations for tile pickup/return

### **Phase 3 Complete**
- [ ] Modal shows colorized hand abbreviation in background
- [ ] Enhanced visual feedback and animations
- [ ] Clear progress indicators and tile selection

### **Phase 4 Complete**
- [ ] Full Charleston integration with new UI
- [ ] Per-turn timer with audio warnings
- [ ] Alert system for call opportunities
- [ ] Discard pile with house rules support

## Next Steps

1. **Review and approve this plan**
2. **Start Phase 1**: Create the basic 5-zone layout structure
3. **Iterate on each phase** with user testing and feedback
4. **Maintain existing intelligence system** integration throughout

---

# DEVELOPMENT TICKETS

## 🎫 TICKET 1: Core Game Screen Layout Components
**Priority: HIGH | Estimated: 2-3 days | Dependencies: None**

### Objective
Create the foundational 5-zone vertical mobile layout structure to replace the current gameplay interface.

### Specific Implementation Tasks

#### Task 1.1: Create GameScreenLayout Component
- **File**: `frontend/src/features/gameplay/GameScreenLayout.tsx`
- **Component**: `GameScreenLayout`
- **Props Interface**: `{ gamePhase: 'charleston' | 'gameplay', currentPlayer: string, timeElapsed: number }`
- **Structure**: 5 vertical zones using Tailwind CSS Grid
- **Implementation**:
  ```tsx
  export const GameScreenLayout: React.FC<GameScreenLayoutProps> = ({
    gamePhase, currentPlayer, timeElapsed, children
  }) => {
    return (
      <div className="max-w-full mx-auto p-2 sm:p-4 md:p-6 md:max-w-4xl">
        <div className="space-y-4">
          {/* TOP ZONE */}
          <TopZone gamePhase={gamePhase} currentPlayer={currentPlayer} timeElapsed={timeElapsed} />
          
          {/* ZONE 1: YOUR HAND */}
          <YourHandZone />
          
          {/* ZONE 2: DISCARD PILE */}
          <DiscardPileZone />
          
          {/* ZONE 3: OPPONENT EXPOSED */}
          <OpponentExposedZone />
          
          {/* ZONE 4 & 5: INTELLIGENCE PANEL */}
          <IntelligencePanel />
        </div>
      </div>
    )
  }
  ```

#### Task 1.2: Create TopZone Component
- **File**: `frontend/src/features/gameplay/TopZone.tsx`
- **Component**: `TopZone`
- **Hooks**: `useGameStore((state) => ({ phase: state.phase, currentPlayerId: state.currentPlayerId }))`
- **Functions to implement**:
  ```tsx
  const formatTimer = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
  
  const getNextPlayer = (currentPlayer: string): string => {
    const players = ['You', 'Right', 'Across', 'Left']
    const currentIndex = players.indexOf(currentPlayer)
    return players[(currentIndex + 1) % 4]
  }
  ```
- **UI Elements**: Phase indicator, elapsed timer, current/next player, action buttons

#### Task 1.3: Update GameModeView Integration
- **File**: `frontend/src/features/gameplay/GameModeView.tsx`
- **Lines to replace**: 422-636 (entire return JSX)
- **Replace with**: `<GameScreenLayout gamePhase="gameplay" currentPlayer={playerNames[currentPlayerIndex]} timeElapsed={gameHistory.length * 30}>`
- **Import**: `import { GameScreenLayout } from './GameScreenLayout'`
- **Remove**: Current complex JSX structure in favor of new layout

#### Task 1.4: Create Supporting Zone Components
- **File**: `frontend/src/features/gameplay/YourHandZone.tsx`
  - Extract hand display logic from GameModeView lines 489-574
  - Add placeholder system for selected tiles
- **File**: `frontend/src/features/gameplay/DiscardPileZone.tsx`
  - Create new discard pile display (currently not implemented)
- **File**: `frontend/src/features/gameplay/OpponentExposedZone.tsx`
  - Extract opponent logic from GameModeView (player order display lines 459-485)
- **File**: `frontend/src/features/gameplay/IntelligencePanel.tsx`
  - Extract AI panel from GameModeView lines 577-635

### Store Integration Requirements
- **Access**: `useGameStore`, `useTileStore`, `useIntelligenceStore`, `usePatternStore`
- **State needed**: game phase, current player, exposed tiles, player names, time tracking
- **New state**: Add `timeElapsed: number` to game store for elapsed timer functionality

### Acceptance Criteria
- [ ] 5-zone vertical layout renders correctly on mobile (375px width tested)
- [ ] Top zone displays: game phase, elapsed timer, current/next player, action buttons
- [ ] Each zone is visually separated with proper spacing
- [ ] Component integrates with GameModeView without breaking existing functionality
- [ ] ESLint passes with 0 warnings
- [ ] All existing game logic continues to work

### Files Created
- ✅ `frontend/src/features/gameplay/GameScreenLayout.tsx`
- ✅ `frontend/src/features/gameplay/TopZone.tsx`
- ✅ `frontend/src/features/gameplay/YourHandZone.tsx`
- ✅ `frontend/src/features/gameplay/DiscardPileZone.tsx`
- ✅ `frontend/src/features/gameplay/OpponentExposedZone.tsx`
- ✅ `frontend/src/features/gameplay/IntelligencePanel.tsx`

### Files Modified
- ✅ `frontend/src/features/gameplay/GameModeView.tsx` (lines 422-636)
- ✅ `frontend/src/stores/game-store.ts` (add timeElapsed state)

---

## 🎫 TICKET 2: Visual Tile Selection System  
**Priority: HIGH | Estimated: 2 days | Dependencies: TICKET 1**

### Objective
Replace the current X-badge removal system with visual placeholder system and implement "picked up" tile mechanics with outline-based visual states.

### Specific Implementation Tasks

#### Task 2.1: Update HandDisplay Component
- **File**: `frontend/src/features/tile-input/HandDisplay.tsx`
- **Lines to modify**: 109-119 (remove X-badge system)
- **Replace with placeholder system**:
  ```tsx
  // Replace the X button removal system
  {(tile.isSelected || false) && (
    <div className="absolute inset-0 border border-gray-300 rounded bg-white bg-opacity-50 flex items-center justify-center text-xs text-gray-600">
      {tile.id}
    </div>
  )}
  ```
- **Add state**: `selectedForAction: PlayerTile[]` to track tiles moved to selection area
- **New click behavior**: Move selected tiles to separate selection area instead of showing X

#### Task 2.2: Create TileStates Component
- **File**: `frontend/src/features/gameplay/TileStates.tsx`
- **Export**: Tile state constants and helper functions
- **Implementation**:
  ```tsx
  export const TILE_STATES = {
    PRIMARY: 'primary',      // Green outlines
    SELECTED: 'selected',    // Blue outlines  
    EXPOSED: 'exposed',      // Yellow outlines with lock
    LOCKED: 'locked',        // Purple outlines (player wants to hold)
    PLACEHOLDER: 'placeholder' // Thin outline with tile ID
  } as const
  
  export const getTileStateClass = (state: string): string => {
    switch (state) {
      case 'primary': return 'border-2 border-green-400 shadow-green-200'
      case 'selected': return 'border-2 border-blue-400 shadow-blue-200'
      case 'exposed': return 'border-2 border-yellow-400 shadow-yellow-200'
      case 'locked': return 'border-2 border-purple-400 shadow-purple-200'
      case 'placeholder': return 'border border-gray-300 bg-gray-50'
      default: return 'border border-gray-200'
    }
  }
  ```

#### Task 2.3: Create SelectionArea Component
- **File**: `frontend/src/features/gameplay/SelectionArea.tsx`
- **Visibility logic**: Based on game phase and selected tiles
- **Props**: `{ selectedTiles: PlayerTile[], onPass: () => void, onLock: () => void, onClear: () => void, onDelete: () => void }`
- **Conditional rendering**:
  ```tsx
  const showSelectionArea = (
    (gamePhase === 'charleston' && currentPlayer === 'user' && selectedTiles.length > 0) ||
    (gamePhase === 'gameplay' && currentPlayer === 'user' && selectedTiles.length > 0)
  )
  ```
- **Integration**: Add to YourHandZone component below hand display
- **Animation**: Tiles should "jump" from hand position to selection area

#### Task 2.4: Update Tile Store for Selection State
- **File**: `frontend/src/stores/tile-store.ts`
- **Add state properties**:
  ```tsx
  interface TileStoreState {
    selectedForAction: PlayerTile[]      // Tiles moved to selection area
    tileStates: Record<string, string>   // instanceId -> state mapping
    // ... existing properties
  }
  ```
- **Add actions**:
  ```tsx
  moveToSelection: (instanceId: string) => void
  returnFromSelection: (instanceId: string) => void  
  lockTile: (instanceId: string) => void
  setTileState: (instanceId: string, state: string) => void
  ```

### Animation Requirements
- **Tile pickup**: Smooth transition from hand to selection area with "jump" animation
- **Placeholder appearance**: Fade-in thin outline where tile was
- **Return animation**: Reverse movement when deselecting
- **Integration**: Use existing `AnimatedTile` component with new `context="selection"`

### Acceptance Criteria
- [ ] Clicking tile moves it to selection area (not X-badge removal)
- [ ] Placeholder appears with tile ID in original position
- [ ] Selection area only shows when tiles are selected
- [ ] Visual states work: green (primary), blue (selected), yellow (exposed), purple (locked) - all as outlines
- [ ] Smooth jump animations for tile pickup/return
- [ ] Action buttons in selection area work correctly
- [ ] Locked tiles don't appear in discard recommendations
- [ ] Existing tile functionality continues to work

### Files Created
- ✅ `frontend/src/features/gameplay/TileStates.tsx`
- ✅ `frontend/src/features/gameplay/SelectionArea.tsx`

### Files Modified  
- ✅ `frontend/src/features/tile-input/HandDisplay.tsx` (lines 109-119, click handlers)
- ✅ `frontend/src/stores/tile-store.ts` (add selection state management)
- ✅ `frontend/src/features/gameplay/YourHandZone.tsx` (integrate SelectionArea)

---

## 🎫 TICKET 3: Enhanced Tile Input Modal
**Priority: MEDIUM | Estimated: 1 day | Dependencies: TICKET 2**

### Objective
Enhance the tile input modal with background hand display and improved visual feedback.

### Specific Implementation Tasks

#### Task 3.1: Add Background Hand Display
- **File**: `frontend/src/features/shared/TileInputModal.tsx`
- **Location**: Add after title section (around line 45)
- **Implementation**:
  ```tsx
  {/* Background Hand Display */}
  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
    <h4 className="text-sm font-medium text-gray-700 mb-2">Your Current Hand:</h4>
    <div className="text-sm font-mono text-gray-600 flex flex-wrap gap-1">
      {playerHand
        .map(tile => tile.id.toUpperCase())
        .sort()
        .map((tileId, index) => (
          <span 
            key={index} 
            className="px-1 py-0.5 bg-white rounded border text-xs"
          >
            {tileId}
          </span>
        ))
      }
    </div>
  </div>
  ```
- **Real-time updates**: Connect to tile store to update when tiles selected in modal
- **Alphabetical sorting**: Match intelligence panel format

#### Task 3.2: Improve Selected Tile Display
- **Section**: Modal selection display area
- **Current**: Simple tile list
- **Enhanced**: Blue outlined tiles with count indicator
- **Implementation**:
  ```tsx
  {/* Enhanced Selection Display */}
  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-medium text-blue-800">Selected for {actionType}:</h4>
      <span className="text-sm text-blue-600">
        {selectedTiles.length}/{maxTiles} tiles
      </span>
    </div>
    <div className="flex flex-wrap gap-2">
      {selectedTiles.map((tile, index) => (
        <AnimatedTile
          key={index}
          tile={{ ...tile, instanceId: `modal-${tile.id}`, isSelected: true }}
          size="sm"
          className="border-2 border-blue-400"
          context="modal"
        />
      ))}
    </div>
  </div>
  ```

#### Task 3.3: Enhanced Progress Indicators
- **Location**: Below tile selection area
- **Current**: Simple text counter
- **Enhanced**: Progress bar and contextual messaging
- **Implementation**:
  ```tsx
  {/* Progress Indicator */}
  <div className="mb-4">
    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
        style={{ width: `${(selectedTiles.length / maxTiles) * 100}%` }} 
      />
    </div>
    <p className="text-sm text-gray-600 text-center">
      {selectedTiles.length === 0 && `Select ${maxTiles} tiles to ${actionType}`}
      {selectedTiles.length > 0 && selectedTiles.length < maxTiles && 
        `Need ${maxTiles - selectedTiles.length} more tile${maxTiles - selectedTiles.length !== 1 ? 's' : ''}`}
      {selectedTiles.length === maxTiles && "Ready to confirm!"}
    </p>
  </div>
  ```

### Modal Integration Points
- **Store connections**: `useTileStore()` for current hand, `useCharlestonStore()` for context
- **Animation hooks**: Use existing animation system with modal context
- **Sound integration**: Use existing haptic feedback hooks for tile selection

### Acceptance Criteria
- [ ] Modal shows current hand as sorted colorized abbreviations
- [ ] Hand display updates in real-time during tile selection
- [ ] Selected tiles display with blue outlines and count
- [ ] Progress bar and contextual messages work correctly
- [ ] Enhanced animations and sound integration functional
- [ ] Modal integrates properly with Charleston and gameplay phases
- [ ] Existing modal functionality continues to work

### Files Modified
- ✅ `frontend/src/features/shared/TileInputModal.tsx` (add background hand, progress indicators)

---

## 🎫 TICKET 4: Game Flow Integration & Timer System
**Priority: MEDIUM | Estimated: 2 days | Dependencies: TICKETS 1-3**

### Objective
Integrate all new components into cohesive game experience with elapsed timer and enhanced game flow.

### Specific Implementation Tasks

#### Task 4.1: Implement Game Timer System
- **File**: `frontend/src/features/gameplay/GameTimer.tsx`
- **Component**: `GameTimer`
- **Timer type**: Elapsed timer (not countdown) per user feedback
- **Implementation**:
  ```tsx
  export const GameTimer: React.FC<{ startTime: Date }> = ({ startTime }) => {
    const [elapsed, setElapsed] = useState(0)
    
    useEffect(() => {
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000))
      }, 1000)
      
      return () => clearInterval(interval)
    }, [startTime])
    
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    
    return (
      <div className="text-sm text-gray-600">
        ⏱️ {formatTime(elapsed)}
      </div>
    )
  }
  ```
- **Integration**: Add to TopZone component
- **Store**: Add `turnStartTime: Date` to game store

#### Task 4.2: Create Discard Pile Component  
- **File**: `frontend/src/features/gameplay/DiscardPile.tsx`
- **Component**: `DiscardPile`
- **State**: Track recent discards from game history
- **Implementation**:
  ```tsx
  export const DiscardPile: React.FC = () => {
    const gameHistory = useGameStore((state) => state.gameHistory)
    
    const recentDiscards = gameHistory
      .filter(turn => turn.action === 'discard')
      .slice(0, 6)
      .map(turn => turn.tile)
    
    return (
      <Card className="p-3">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Discards</h3>
        <div className="flex flex-wrap gap-1">
          {recentDiscards.map((tile, index) => (
            <AnimatedTile
              key={index}
              tile={{ ...tile, instanceId: `discard-${index}`, isSelected: false }}
              size="sm"
              className="pointer-events-none opacity-75"
              context="discard"
            />
          ))}
        </div>
      </Card>
    )
  }
  ```

#### Task 4.3: Create Alert System
- **File**: `frontend/src/features/gameplay/AlertSystem.tsx`
- **Component**: `AlertSystem`
- **Alert types**: Call opportunities, pattern warnings, game notifications
- **Implementation**:
  ```tsx
  export const AlertSystem: React.FC = () => {
    const [alerts, setAlerts] = useState<GameAlert[]>([])
    const currentAnalysis = useIntelligenceStore((state) => state.currentAnalysis)
    
    const showAlert = (alert: GameAlert) => {
      setAlerts(prev => [...prev, { ...alert, id: Date.now().toString() }])
      setTimeout(() => removeAlert(alert.id), alert.duration || 5000)
    }
    
    return (
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {alerts.map(alert => (
          <Card key={alert.id} className={`p-3 ${alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="text-sm">
              {alert.type === 'warning' && '⚠️ '}
              {alert.type === 'info' && 'ℹ️ '}
              {alert.message}
            </div>
          </Card>
        ))}
      </div>
    )
  }
  ```

#### Task 4.4: Charleston Phase Integration
- **Files to modify**: Charleston components to work with new layout
- **Integration point**: `frontend/src/features/charleston/CharlestonView.tsx`
- **Change**: Replace current layout with `GameScreenLayout` when in Charleston phase
- **State management**: Ensure Charleston data flows properly to new YourHandZone
- **Selection flow**: Connect Charleston tile selection to new SelectionArea

#### Task 4.5: Game Store Enhancements
- **File**: `frontend/src/stores/game-store.ts`
- **Add state**:
  ```tsx
  interface GameStoreState {
    turnStartTime: Date
    gameHistory: GameTurn[]
    alerts: GameAlert[]
    // ... existing state
  }
  ```
- **Add actions**:
  ```tsx
  startTurn: () => void           // Set turnStartTime to now
  addAlert: (alert: GameAlert) => void
  removeAlert: (alertId: string) => void
  ```

### Integration Testing Requirements
- **Charleston flow**: Pattern selection → Tile input → Charleston → Game mode
- **Game flow**: Draw → Analyze → Discard → Opponent turns → Repeat  
- **Timer accuracy**: Elapsed time tracking per turn (not countdown)
- **State persistence**: All data maintained across phase transitions

### Acceptance Criteria
- [ ] Elapsed timer tracks time accurately and displays in TopZone
- [ ] Discard pile shows recent discards with proper tile animations
- [ ] Alert system displays notifications for game events
- [ ] Charleston phases integrate smoothly with new layout
- [ ] All existing game functionality continues to work
- [ ] Performance remains good with new components
- [ ] Mobile responsiveness maintained across all screen sizes
- [ ] No auto-advance on timeout (per user feedback)

### Files Created
- ✅ `frontend/src/features/gameplay/GameTimer.tsx`
- ✅ `frontend/src/features/gameplay/DiscardPile.tsx` 
- ✅ `frontend/src/features/gameplay/AlertSystem.tsx`

### Files Modified
- ✅ `frontend/src/stores/game-store.ts` (add timer, alerts, history state)
- ✅ `frontend/src/features/charleston/CharlestonView.tsx` (integrate with GameScreenLayout)
- ✅ `frontend/src/features/gameplay/TopZone.tsx` (add GameTimer)
- ✅ `frontend/src/features/gameplay/GameScreenLayout.tsx` (integrate DiscardPile, AlertSystem)

---

## Technical Implementation Notes

### Performance Considerations
- **Timer updates**: Use RAF (requestAnimationFrame) for smooth updates
- **Animation performance**: Leverage CSS transforms over property changes
- **State updates**: Batch related state changes to minimize re-renders
- **Memory management**: Clean up intervals and event listeners

### Mobile Optimization
- **Touch targets**: Minimum 44px touch areas for all interactive elements
- **Viewport handling**: Account for mobile browser UI changes
- **Performance**: Optimize for 60fps animations on mobile devices
- **Accessibility**: Maintain focus management and screen reader support

### Visual State System (Updated)
- **Primary Pattern**: Green outlines (not filled squares)
- **Selected Tiles**: Blue outlines (not filled squares)
- **Exposed Tiles**: Yellow outlines with lock badges
- **Locked Tiles**: Purple outlines (player wants to hold, excluded from discard recommendations)
- **Placeholders**: Thin gray outlines with tile ID text

### Testing Strategy
- **Unit tests**: Each component individually
- **Integration tests**: Full game flow from pattern selection to completion
- **Mobile testing**: Physical device testing on iOS/Android
- **Performance testing**: Monitor render times and memory usage
- **Animation testing**: Verify smooth tile jump animations work correctly

### Rollback Plan
- **Feature flags**: Gate new layout behind feature toggle
- **Gradual rollout**: A/B test with subset of users first
- **Monitoring**: Track user engagement and error rates
- **Quick revert**: Ability to switch back to current layout if issues arise

---

*Each ticket is designed to be copy-pasteable and executable by future Claude with all necessary context, file paths, and implementation details included. The design has been updated to use outline-based visual states and elapsed timers per user feedback.*