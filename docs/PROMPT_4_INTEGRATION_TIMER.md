Refer to GAME_SCREEN_VISION.md for context. Tickets 1-3 completed.

Complete integration with elapsed timer and game flow enhancements.

TASKS:
1. Create `frontend/src/features/gameplay/GameTimer.tsx`:
   - Elapsed timer (not countdown), MM:SS format
   - useEffect with setInterval, proper cleanup
   
2. Create `frontend/src/features/gameplay/DiscardPile.tsx`:
   - Show recent discards from game history
   - AnimatedTile components with opacity
   
3. Create `frontend/src/features/gameplay/AlertSystem.tsx`:
   - Fixed position alerts for call opportunities
   - Warning/info alert types with auto-dismiss
   
4. Charleston integration:
   - Update `frontend/src/features/charleston/CharlestonView.tsx` to use GameScreenLayout
   - Connect Charleston tile selection to new SelectionArea
   
5. Update `frontend/src/stores/game-store.ts`:
   - alerts: GameAlert[] state
   - addAlert(), removeAlert() actions

ACCEPTANCE: Elapsed timer accurate in TopZone, discard pile shows recent tiles, Charleston integrates smoothly, no auto-advance on timeout, all existing functionality preserved.