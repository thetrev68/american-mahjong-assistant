# Game Screen UI/UX Redesign Vision

## Objective
Transform the current Charleston-focused interface into a comprehensive game screen with 5 distinct zones optimized for mobile gameplay. Replace X-badge tile removal with visual "picked up" mechanics and real-time game state awareness.

## Current State Analysis
- **Primary file**: `frontend/src/features/gameplay/GameModeView.tsx` (lines 422-636 contain current layout)
- **Tile system**: `frontend/src/features/tile-input/HandDisplay.tsx` (lines 109-119 have X-badge removal)
- **Modal**: `frontend/src/features/shared/TileInputModal.tsx` (needs background hand display)
- **Stores**: All existing Zustand stores work, need minor enhancements for timer/selection state

## Target 5-Zone Mobile Layout

```
┌─────────────────────────────────────┐
│ TOP ZONE: Game phase, elapsed timer │
│ Current player, action buttons      │
├─────────────────────────────────────┤
│ ZONE 1: YOUR HAND                  │ 
│ Green outlines = Primary pattern    │
│ Placeholders when tiles selected    │
│ Selection area (conditional)        │
├─────────────────────────────────────┤
│ ZONE 2: DISCARD PILE               │
│ Recent discards, call opportunities │
├─────────────────────────────────────┤ 
│ ZONE 3: OPPONENT EXPOSED TILES     │
│ All players' exposed sets with      │
│ alert badges for needed tiles       │
├─────────────────────────────────────┤
│ ZONES 4-5: AI INTELLIGENCE PANEL   │
│ Pattern progress, recommendations   │
└─────────────────────────────────────┘
```

## Key Behavior Changes

### Tile Selection (Critical)
- **Before**: Click tile → X-badge appears → click X to remove
- **After**: Click tile → moves to selection area → placeholder remains → click placeholder to return
- **Animation**: Tile "jumps" from hand position to selection area
- **Visual states**: Outline-based (not filled squares)
  - Primary pattern: Green outlines
  - Selected: Blue outlines  
  - Exposed: Yellow outlines + lock badge
  - Locked: Purple outlines + lock badge (player holds, excluded from discard recs)
  - Placeholder: Thin gray outline + tile ID

### Timer System
- **Type**: Elapsed timer (not countdown)
- **Display**: MM:SS format in top zone
- **No auto-advance** on timeout

### Selection Area
- **Visibility**: Only when tiles selected + player's turn
- **Buttons**: [Pass/Discard] [Lock] [Clear] [Delete]
- **Location**: Below hand display in Zone 1

## Technical Constraints
- **Mobile-first**: Optimize for 375px width
- **Performance**: Maintain 60fps animations
- **Existing functionality**: All current game logic must continue working
- **ESLint**: Must pass with 0 warnings
- **Stores**: Use existing Zustand stores, minimal additions only

## Implementation Progress Checklist
- [ ] **Ticket 1**: Core 5-zone layout components created
- [ ] **Ticket 2**: Visual tile selection system with jump animations  
- [ ] **Ticket 3**: Enhanced modal with background hand display
- [ ] **Ticket 4**: Timer system and full integration

## Success Criteria
✅ Mobile-optimized 5-zone layout renders correctly  
✅ Tile selection uses placeholder system with jump animations  
✅ Visual states work as outlines (green/blue/yellow/purple)  
✅ Selection area appears/disappears based on game state  
✅ Elapsed timer tracks accurately in top zone  
✅ All existing game functionality preserved  
✅ Charleston and gameplay phases integrate smoothly  
✅ Modal shows current hand as sorted abbreviations  
✅ Performance maintained across all screen sizes  

---

*This vision maintains the world-class intelligence system while creating an intuitive, mobile-first game interface that feels like playing with physical tiles.*