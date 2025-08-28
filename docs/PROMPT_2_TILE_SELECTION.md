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