Refer to GAME_SCREEN_VISION.md for context. Tickets 1-2 completed.

Add background hand display and improved feedback to tile input modal.

TASKS:
1. Update `frontend/src/features/shared/TileInputModal.tsx` around line 45:
   - Add "Your Current Hand" section with sorted tile abbreviations
   - Real-time updates when tiles selected in modal
   
2. Improve selected tile display:
   - Blue outlined tiles with count indicator
   - Enhanced visual feedback
   
3. Add progress indicators:
   - Progress bar showing selection completion
   - Contextual messages ("Need X more tiles", "Ready to confirm!")

INTEGRATION: Connect to useTileStore() for current hand, useCharlestonStore() for context, existing animation system.

ACCEPTANCE: Modal shows sorted hand abbreviations, real-time updates, blue outlined selected tiles, progress bar works, integrates with Charleston/gameplay phases.