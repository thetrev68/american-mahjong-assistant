Refer to GAME_SCREEN_VISION.md for context. Ticket 1 completed.

Replace X-badge removal with placeholder system and jump animations.

TASKS:
1. Update `frontend/src/features/tile-input/HandDisplay.tsx` lines 109-119:
   - Remove X-badge system
   - Add placeholder with tile ID when selected
   - Change click behavior to move tiles to selection area

2. Create `frontend/src/features/gameplay/TileStates.tsx`:
   - TILE_STATES constants (primary, selected, exposed, locked, placeholder)
   - getTileStateClass() for outline-based styling

3. Create `frontend/src/features/gameplay/SelectionArea.tsx`:
   - Conditional visibility based on game phase + selected tiles
   - Buttons: [Pass/Discard] [Lock] [Clear] [Delete]
   - Jump animation when tiles move from hand

4. Update `frontend/src/stores/tile-store.ts`:
   - selectedForAction: PlayerTile[] state
   - tileStates: Record<string, string> mapping
   - moveToSelection(), returnFromSelection(), lockTile() actions

ACCEPTANCE: Tile clicks move to selection area, placeholders show with tile ID, jump animations work, outline-based visual states, locked tiles excluded from discard recommendations.

```

● Perfect! The implementation is complete and building successfully. Let me summarize what was accomplished:

  Summary

  Successfully implemented the placeholder system and jump animations to replace the X-badge removal system:

  ✅ Completed Tasks:

  1. Created TileStates.tsx - Outline-based visual state management system with constants for primary, selected, exposed, locked, and placeholder states, plus getTileStateClass() utility function.
  2. Updated tile-store.ts - Added new state properties:
    - selectedForAction: PlayerTile[] - tiles moved to selection area
    - tileStates: Record<string, string> - maps tile instances to visual states
    - New actions: moveToSelection(), returnFromSelection(), lockTile(), clearSelection()
  3. Created SelectionArea.tsx - Conditional visibility component that appears during gameplay phases (charleston/playing) when tiles are selected, featuring:
    - Jump animations with staggered bouncing effects
    - Action buttons: Pass/Discard, Lock, Clear, Delete
    - Phase-appropriate button display (Pass for charleston, Discard for playing)
    - Fixed overlay positioning at bottom center
  4. Updated HandDisplay.tsx - Replaced X-badge system with placeholder system:
    - Removed X-badge removal buttons (lines 109-119)
    - Added placeholder tiles showing tile ID when selected for action
    - Changed click behavior from toggle selection to moveToSelection()
    - Applied outline-based visual states using getTileStateClass()
    - Locked tiles excluded from interactions
  5. Integrated SelectionArea into GameModeView.tsx - Added the selection area as a fixed overlay component

  ✅ Key Features Implemented:

  - Placeholder System: When tiles are clicked, they become placeholders in the hand showing the tile ID while the actual tile appears in the selection area
  - Jump Animations: Tiles animate with staggered bouncing effects when moved to selection area
  - Outline-Based Visual States: Clean ring-based styling for different tile states (primary, selected, exposed, locked, placeholder)
  - Locked Tile Protection: Locked tiles are excluded from discard recommendations and cannot be interacted with
  - Phase-Appropriate UI: Selection area shows different buttons based on game phase (Charleston vs Playing)

  The implementation maintains the acceptance criteria: tile clicks move tiles to selection area, placeholders show with tile ID, jump animations work, outline-based visual states are applied, and
  locked tiles are properly excluded from interactions.