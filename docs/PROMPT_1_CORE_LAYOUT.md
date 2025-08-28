Refer to GAME_SCREEN_VISION.md for context. No tickets completed yet.

Create the foundational 5-zone vertical mobile layout to replace current GameModeView.

TASKS:
1. Create `frontend/src/features/gameplay/GameScreenLayout.tsx`
   - Props: { gamePhase: 'charleston' | 'gameplay', currentPlayer: string, timeElapsed: number }
   - 5 vertical zones with proper spacing
   
2. Create `frontend/src/features/gameplay/TopZone.tsx`
   - Game phase, elapsed timer (MM:SS), current/next player, action buttons
   - formatTimer() and getNextPlayer() helper functions
   
3. Update `frontend/src/features/gameplay/GameModeView.tsx`
   - Replace lines 422-636 with <GameScreenLayout> component
   
4. Create supporting components:
   - `YourHandZone.tsx` (extract lines 489-574 from GameModeView)
   - `DiscardPileZone.tsx` (new component)
   - `OpponentExposedZone.tsx` (extract lines 459-485)
   - `IntelligencePanel.tsx` (extract lines 577-635)

5. Add to `frontend/src/stores/game-store.ts`:
   - turnStartTime: Date state
   - startTurn() action

ACCEPTANCE: 5-zone layout renders on mobile, integrates without breaking existing functionality, ESLint 0 warnings.