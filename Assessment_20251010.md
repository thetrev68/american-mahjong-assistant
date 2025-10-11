Complete Impact Assessment - Prioritized by Severity

  Based on my analysis of the codebase dependencies, here's the prioritized list:

  ---
  🔴 CRITICAL - Currently Breaking Production

  1. useGameHistory Hook - ENTIRE FEATURE NON-FUNCTIONAL
  - Location: packages/frontend/src/hooks/useGameHistory.ts
  - Impact: PostGameView.tsx imports and uses this hook extensively
  - Current State: Returns empty arrays/undefined for ALL functionality:
    - Line 24: filteredGames returns []
    - Line 31: gameSummary returns undefined
    - Line 38: selectedGame returns undefined
    - Line 45: quickFilters returns {}
    - Line 75: getPatternPerformance() returns undefined
    - Line 82: exportFormattedHistory() has no implementation
  - Users Affected: Anyone trying to view post-game analysis
  - Decision: DELETE - PostGameView expects real data but gets nothing, causing runtime errors

  ---
  🟠 HIGH - Potential Runtime Errors

  2. Game Action Handlers - Unknown Action Types
  - Location: packages/backend/src/services/game-logic.ts:313
  - Impact: Returns "Action not implemented" error for unhandled action types
  - Current State: Switch statement has default case that throws error
  - Analysis: Checked executeAction calls - ALL standard actions (draw, discard, call_pung, call_kong, joker-swap, call_mahjong, pass) ARE implemented
  - Users Affected: Only if unknown/new action types are sent
  - Decision: KEEP - This is actually a proper error handler, not incomplete code. The "not implemented" message is intentional for invalid actions.

  ---
  🟡 MEDIUM - Cosmetic/UX Issues

  3. Debug Logging
  - Locations:
    - packages/frontend/index.html:14 - Socket.IO debug enabled globally
    - packages/frontend/src/hooks/useSocket.ts:226 - Dev-only event logging
    - packages/backend/package.json:7-8 - DEBUG env vars
  - Impact: Console spam in development, potential performance hit
  - Users Affected: Developers only (all are dev-mode only)
  - Decision: KEEP (with cleanup) - Useful for debugging, but should be configurable

  4. Duplicate Socket Handler Comments
  - Location: packages/frontend/src/features/socket-communication/socket-handlers.ts:1739-1741
  - Impact: Commented-out duplicate handler code
  - Users Affected: None (already disabled)
  - Decision: DELETE - Dead code should be removed

  5. Player Name Hardcoded
  - Location: packages/frontend/src/hooks/useMultiplayer.ts:61
  - Impact: All players appear as "Player" instead of custom names
  - Users Affected: Multiplayer users
  - Decision: IMPLEMENT - Poor UX but not breaking functionality

  ---
  🟢 LOW - Feature Not Exposed to Users

  6. "AI Co-Pilot (Soon)" Feature
  - Location: packages/frontend/src/features/landing/LandingPage.tsx:120
  - Impact: Disabled button with "Coming soon" message
  - Users Affected: None (intentionally disabled)
  - Decision: KEEP - This is a placeholder for future feature

  ---
  Recommended Actions

  Immediate (Fix Today)

  1. DELETE useGameHistory hook entirely - it's breaking PostGameView
  2. DELETE duplicate handler code at socket-handlers.ts:1739-1741

  Short-term (This Week)

  3. IMPLEMENT player name system - create user context/profile
  4. REVIEW debug logging - make it configurable via env var

  Long-term (Future Sprint)

  5. REBUILD game history feature from scratch when needed
  6. Complete AI Co-Pilot feature or remove the placeholder button

  ---
  The biggest issue is useGameHistory - it's a skeleton that PostGameView depends on. This could be the source of your errors. Should I delete it and update PostGameView to handle the missing feature
  gracefully?