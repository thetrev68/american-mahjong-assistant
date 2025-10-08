# Gameplay Audit & Fix Plan

## Current Implementation Audit

### ✅ What Exists and Works
- **TopZone**: Basic structure with game phase, current player, timer
- **YourHandZone**: Tile display, highlighting, basic interaction
- **GameplayRecommendations**: Basic keep/discard recommendations
- **DiscardPileZone**: Basic discard pile display
- **OpponentExposedZone**: Basic exposed tiles by player
- **EnhancedIntelligencePanel**: Complex AI analysis display
- **Timer**: Floating timer with proper styling

### ❌ Critical Gaps Identified

## PRIORITY 1: TOP ZONE CRITICAL FIXES

### Missing Components
- **Wall tile counter** - not displayed anywhere
- **Pattern count display** - shows fixed text vs dynamic count
- **Missing action buttons**: "Swap Joker", "Dead Hand"
- **Next player indicator** - not shown in top zone format

### Current Issues
- TopZone layout doesn't match specification format
- Timer is floating but positioning may conflict with other elements
- "Playing ## patterns" shows placeholder text instead of actual count

## PRIORITY 2: GAME CONTROL PANEL (SOLO MODE)

### Completely Missing
- **Entire Game Control Panel section**
- No "Log Other Player Discard" functionality
- No "Log Other Player Call" functionality
- No "Undo Last Turn" capability
- No solo mode detection/special handling

### Implementation Needed
- Create new GameControlPanel component
- Add tile input modals for manual entry
- Implement turn advancement logic
- Add undo functionality

## PRIORITY 3: YOUR HAND ZONE ISSUES

### Current Problems
- **Tile selection panel**: Missing "Lock" functionality
- **Draw Tile button**: Present but may not follow proper enabling rules
- **Concealed vs Exposed grouping**: May not be properly separated
- **Tile highlighting**: Recently fixed but needs verification
- **Tile count logic**: 13/14 based on East player position needs verification

### Missing Features
- Lock/unlock tile functionality with padlock badge
- Proper tile selection animation
- Clear visual separation of concealed vs exposed

## PRIORITY 4: AI CO-PILOT ZONE RESTRUCTURE

### Current Issues
- **EnhancedIntelligencePanel**: Too complex, doesn't match simple spec requirements
- **Primary Pattern Container**: Missing proper layout and progress indicators
- **Alternate Pattern Container**: Missing checkbox functionality and proper display
- **"View All Patterns" button**: Not implemented

### Required Changes
- Simplify AI Co-Pilot section to match spec exactly
- Implement Primary Pattern container with:
  - Pattern name
  - Colorized visualizer
  - ##/14 counter with %
  - AI Score with breakdown
  - Progress bar
- Implement Alternate Pattern container with:
  - Top 5 patterns
  - Checkboxes for "play" selection
  - Proper scoring display
- Add "View All Patterns" modal

## PRIORITY 5: DISCARD PILE IMPROVEMENTS

### Current Issues
- **Tile organization**: Not organized by suit as specified
- **Tile overlap**: No overlapping for space efficiency
- **Call Tile link**: May be missing or not prominent

### Required Changes
- Reorganize tiles by suit (Dots, Bams, Cracks, Honors)
- Implement overlapping tile display
- Add prominent "Call Tile" action

## PRIORITY 6: GAMEPLAY FLOW & ACTIONS

### Missing Core Actions
- **Swap Joker**: Not implemented
- **Dead Hand**: Not implemented
- **Lock/Unlock tiles**: Not implemented
- **Call Tile**: Basic implementation but needs verification
- **Swap Primary**: Pattern swapping functionality

### Turn Flow Issues
- Turn advancement logic may not be complete
- Timer reset on turn change needs verification
- Analysis engine re-triggering needs verification
- Notification system for joker swaps, calls, mahjong

## PRIORITY 7: LAYOUT RESTRUCTURE

### Current Layout Issues
- Component order doesn't match specification
- Missing visual hierarchy
- Mobile responsiveness may need improvement

### Required Layout (Top to Bottom)
1. Top Zone (game info + actions)
2. Game Control Panel (solo mode only)
3. Your Hand Zone
4. AI Co-Pilot Zone (simplified)
5. Exposed Tile Zone
6. Discard Pile Zone

---

# PRIORITIZED FIX PLAN

## Phase 1: Critical Foundation (Blocking Issues)
**Estimated Impact**: High - Makes basic gameplay functional

1. **Fix Top Zone Layout**
   - Add wall tile counter display
   - Add dynamic pattern count
   - Add "Swap Joker" and "Dead Hand" buttons
   - Add next player indicator
   - Restructure layout to match spec

2. **Create Game Control Panel**
   - Create GameControlPanel component
   - Add solo mode detection
   - Implement "Log Other Player Discard" with tile input modal
   - Implement "Log Other Player Call" with tile input modal
   - Add "Undo Last Turn" functionality

3. **Fix Your Hand Zone Core Issues**
   - Verify/fix 13/14 tile count logic
   - Implement lock/unlock functionality with padlock badges
   - Fix tile selection panel to include all actions
   - Verify draw tile button enabling logic

## Phase 2: AI Co-Pilot Restructure (User Experience)
**Estimated Impact**: High - Core functionality users expect

4. **Implement Primary Pattern Container**
   - Create simplified primary pattern display
   - Add colorized pattern visualizer
   - Add tile counter with percentage
   - Add AI score with breakdown
   - Add progress bar

5. **Implement Alternate Pattern Container**
   - Create top 5 patterns display
   - Add checkboxes for "play" selection
   - Implement "View All Patterns" modal
   - Connect to pattern counting logic

6. **Simplify AI Co-Pilot Zone**
   - Replace complex EnhancedIntelligencePanel
   - Implement simple keep/discard lists with visualizers
   - Add strategy section

## Phase 3: Polish & Complete Actions (Quality of Life)
**Estimated Impact**: Medium - Improves user experience

7. **Implement Missing Actions**
   - Swap Joker functionality
   - Dead Hand functionality
   - Call Tile improvements
   - Swap Primary pattern functionality

8. **Polish Discard Pile**
   - Reorganize by suit with overlapping
   - Improve Call Tile prominence
   - Add tile count display

9. **Complete Gameplay Flow**
   - Verify turn advancement logic
   - Implement proper notification system
   - Ensure timer resets and analysis triggers

## Phase 4: Layout & Visual Polish (Final Touches)
**Estimated Impact**: Low-Medium - Professional appearance

10. **Layout Restructure**
    - Reorder components per specification
    - Improve mobile responsiveness
    - Polish visual hierarchy and spacing

---

# IMPLEMENTATION APPROACH

## Strategy
- **Incremental**: Implement phase by phase to maintain working state
- **Component-focused**: Create new components rather than heavily modifying existing
- **Backward compatible**: Ensure changes don't break existing functionality

## Testing Strategy
- Test each phase before moving to next
- Use dev shortcuts for rapid testing
- Focus on solo mode first (multiplayer later)

## Risk Assessment
- **Low Risk**: Phases 1-2 (mostly additive)
- **Medium Risk**: Phase 3 (action implementations)
- **Higher Risk**: Phase 4 (layout changes)

---

# REVIEW QUESTIONS

1. **Priority Order**: Do you agree with this prioritization?
2. **Phase Approach**: Should we tackle all of Phase 1 before moving on, or prefer smaller incremental changes?
3. **Scope Concerns**: Any items you want to defer or modify?
4. **Testing Preference**: How do you want to test/validate each phase?

**Ready for your approval to proceed with Phase 1?**