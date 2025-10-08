# TODO Implementation Plan

This document outlines the implementation plan for all active TODO items found in the codebase (excluding legacy folder). Each chunk is designed to be completed independently by future Claude sessions.

## Overview

**Total TODOs Found**: 12 active items
**Scope**: Current frontend codebase only (legacy folder excluded)
**Approach**: Incremental enhancement of existing working systems

---

## 🎯 CHUNK 1: Intelligence Panel Game Phase Integration
**Estimated Time**: 20-30 minutes
**Priority**: HIGH - Core functionality enhancement

### Current Issue
- `frontend/src/features/intelligence-panel/IntelligencePanelPage.tsx:319`
- Game phase is hardcoded to "charleston" instead of using actual game state

### Context
The Intelligence Panel currently shows hardcoded `gamePhase="charleston"` but should dynamically display the current game phase from the game store.

### Implementation Steps
1. **Read Current File**: Review `IntelligencePanelPage.tsx` to understand current structure
2. **Check Game Store**: Examine `frontend/src/stores/game-store.ts` for game phase state
3. **Import Game Store**: Add Zustand hook to access current game phase
4. **Replace Hardcoded Value**: Update the hardcoded "charleston" with dynamic game phase
5. **Test Integration**: Verify the component properly reflects game state changes

### Files to Modify
- `frontend/src/features/intelligence-panel/IntelligencePanelPage.tsx`

### Success Criteria
- Intelligence Panel shows correct game phase (charleston, gameplay, etc.)
- Component updates when game phase changes
- No TypeScript errors or console warnings

---

## 🎯 CHUNK 2: Analysis Engine Data Population (Part A)
**Estimated Time**: 45-60 minutes  
**Priority**: MEDIUM-HIGH - Core intelligence enhancement

### Current Issues
- `frontend/src/services/analysis-engine.ts:309` - `matchingGroups: []` needs population
- `frontend/src/services/analysis-engine.ts:327` - `tilePriorities: {}` needs population  
- `frontend/src/services/analysis-engine.ts:328` - `groupPriorities: {}` needs population

### Context
The Analysis Engine has placeholder empty objects/arrays where Engine 1 pattern facts should populate data structures for downstream processing.

### Implementation Steps
1. **Understand Engine 1 Integration**: Review `pattern-analysis-engine.ts` to see what facts are available
2. **Analyze Current Code**: Read `analysis-engine.ts` lines 300-340 to understand data flow
3. **Map Engine 1 Output**: Determine how pattern analysis facts map to missing data structures
4. **Implement matchingGroups Population**: 
   - Extract matching pattern groups from Engine 1 facts
   - Format as array of group identifiers/descriptions
5. **Implement tilePriorities Population**:
   - Use Engine 1 tile analysis to create priority mapping
   - Format as `{tileId: priority}` object
6. **Implement groupPriorities Population**:
   - Extract group importance from pattern analysis
   - Format as `{groupId: priority}` object
7. **Test Data Flow**: Verify populated data flows correctly to Engine 3

### Files to Review/Modify
- `frontend/src/services/analysis-engine.ts` (primary)
- `frontend/src/services/pattern-analysis-engine.ts` (reference)
- Related type definitions in `frontend/src/types/`

### Success Criteria
- All three TODO placeholders populated with real data
- Data structures properly typed and validated
- Engine pipeline flows correctly from 1→2→3
- No breaking changes to existing functionality

---

## 🎯 CHUNK 3: Tile Recommendation Engine Tier 2 Implementation
**Estimated Time**: 60-90 minutes
**Priority**: MEDIUM - Advanced feature enhancement

### Current Issue
- `frontend/src/services/tile-recommendation-engine.ts:507`
- Comment: "TODO: Tier 2: Top variations of primary pattern (not implemented yet)"

### Context
The tile recommendation engine currently provides basic recommendations but lacks Tier 2 functionality for analyzing top variations of the primary pattern.

### Implementation Steps
1. **Understand Current Architecture**: Review `tile-recommendation-engine.ts` structure and existing tiers
2. **Analyze Pattern Variations**: Study how pattern variations are loaded and structured
3. **Review Pattern Variation Loader**: Check `pattern-variation-loader.ts` for available data
4. **Design Tier 2 Logic**:
   - Identify top N variations of the primary pattern
   - Score variations based on current hand compatibility
   - Prioritize variations with highest completion potential
5. **Implement Tier 2 Function**:
   - Create function to analyze primary pattern variations
   - Integrate with existing recommendation scoring system
   - Ensure proper error handling and fallbacks
6. **Update Recommendation Flow**: Integrate Tier 2 into main recommendation pipeline
7. **Add Type Definitions**: Ensure proper TypeScript interfaces for new functionality

### Files to Review/Modify
- `frontend/src/services/tile-recommendation-engine.ts` (primary)
- `frontend/src/services/pattern-variation-loader.ts` (reference)
- `frontend/public/intelligence/nmjl-patterns/pattern-variations.json` (data source)
- Type definitions as needed

### Success Criteria
- Tier 2 recommendations implemented and functional
- Integration with existing recommendation system
- Proper scoring and prioritization of pattern variations
- No performance degradation in recommendation engine
- TypeScript compliance maintained

---

## 🎯 CHUNK 4: Code Quality Cleanup - "Hack" Comments
**Estimated Time**: 30-45 minutes
**Priority**: LOW-MEDIUM - Code quality improvement

### Current Issues
Found 3 instances of "hack" comments indicating suboptimal implementations:

1. `frontend/src/features/charleston/CharlestonView.tsx:330`
2. `frontend/src/services/__tests__/nmjl-service.test.ts:140` 
3. `legacy/frontend/src/components/room/PlayerPositioning.tsx:76` (SKIP - legacy)

### Context
These are working implementations but flagged as "hacks" - indicating they could be improved for better code quality and maintainability.

### Implementation Steps

#### 4A: Charleston View Hack
1. **Review Current Implementation**: Read Charleston View around line 330
2. **Understand the "Hack"**: Determine why the current approach is considered suboptimal
3. **Design Better Approach**: Find cleaner way to ensure UI components get updated data
4. **Implement Improvement**: Refactor to more elegant solution
5. **Test Functionality**: Ensure Charleston functionality still works correctly

#### 4B: NMJL Service Test Hack  
1. **Review Test Implementation**: Read the test around line 140
2. **Understand Singleton Testing Issue**: Determine why "hacky" approach was needed
3. **Research Better Testing Patterns**: Find cleaner way to test singleton services
4. **Refactor Test**: Implement improved testing approach
5. **Verify Test Coverage**: Ensure test still properly validates functionality

### Files to Modify
- `frontend/src/features/charleston/CharlestonView.tsx`
- `frontend/src/services/__tests__/nmjl-service.test.ts`

### Success Criteria
- Remove "hack" comments with proper implementations
- Maintain existing functionality
- Improve code maintainability and readability
- All tests continue to pass

---

## 🎯 CHUNK 5: Verification & Integration Testing
**Estimated Time**: 15-30 minutes
**Priority**: HIGH - Quality assurance

### Purpose
Comprehensive verification that all TODO implementations work together and don't break existing functionality.

### Implementation Steps
1. **Run Full Test Suite**: Execute all tests to ensure no regressions
2. **Manual Integration Testing**:
   - Test Intelligence Panel game phase switching
   - Verify Analysis Engine data population in real gameplay
   - Test Tier 2 recommendations with actual pattern selection
   - Confirm Charleston and test fixes work properly
3. **TypeScript Validation**: Run `npm run build` to ensure no type errors
4. **ESLint Validation**: Run `npm run lint` to ensure code quality standards
5. **Performance Check**: Verify no significant performance degradation
6. **Cross-Feature Testing**: Test full user flow from pattern selection → gameplay

### Success Criteria
- All tests pass
- No TypeScript errors
- No ESLint warnings/errors
- Acceptable performance (sub-300ms for analysis)
- Complete user flow works end-to-end

---

## 📋 Implementation Priority Order

1. **CHUNK 1** (Intelligence Panel) - Quick high-impact fix
2. **CHUNK 2** (Analysis Engine) - Core intelligence functionality  
3. **CHUNK 3** (Tier 2 Recommendations) - Advanced feature
4. **CHUNK 4** (Code Quality) - Clean up technical debt
5. **CHUNK 5** (Verification) - Final quality assurance

## 🔧 General Implementation Guidelines

### For Future Claude Sessions
- **Always read existing code first** to understand current patterns
- **Follow established conventions** in the codebase
- **Maintain TypeScript strict compliance** 
- **Run lint/build/test after each chunk**
- **Use existing Zustand patterns** for state management
- **Preserve working functionality** - enhance, don't rewrite
- **Test on actual user flows** not just unit tests

### Code Quality Standards
- No `any` types without justification
- Follow existing import patterns
- Maintain consistent error handling
- Use existing utility functions where possible
- Keep functions focused and testable

### Testing Requirements
- Unit tests for new functions
- Integration tests for state changes
- Manual testing of user flows
- Performance testing for analysis engines

---

## 📁 Key Files Reference

### Core Analysis System
- `frontend/src/services/analysis-engine.ts` - Main analysis coordination
- `frontend/src/services/pattern-analysis-engine.ts` - Engine 1 facts
- `frontend/src/services/pattern-ranking-engine.ts` - Engine 2 scoring  
- `frontend/src/services/tile-recommendation-engine.ts` - Engine 3 recommendations

### State Management
- `frontend/src/stores/game-store.ts` - Game phase and state
- `frontend/src/stores/pattern-store.ts` - Pattern selection
- `frontend/src/stores/intelligence-store.ts` - AI analysis state

### UI Components
- `frontend/src/features/intelligence-panel/IntelligencePanelPage.tsx` - Main intelligence UI
- `frontend/src/features/charleston/CharlestonView.tsx` - Charleston interface

This plan ensures all active TODOs are addressed while maintaining the existing working architecture and following established code patterns.