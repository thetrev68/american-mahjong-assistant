# Strategy Advisor Infinite Loop Debug Prompt

## Problem Statement
The Strategy Advisor feature has multiple cascading infinite loops preventing the game from starting. When enabled, it causes mount/unmount cycles and "Maximum update depth exceeded" errors.

## Current Status
- Strategy Advisor is temporarily disabled in `EnhancedIntelligencePanel.tsx` (line 54: `useStrategyAdvisorInterface = false`)
- Core gameplay works fine without it
- All TypeScript/ESLint errors are resolved

## What's Been Tried (Don't Repeat These)
1. ✅ Fixed circular dependencies by reordering useCallback declarations
2. ✅ Removed unstable function dependencies from useEffect/useMemo arrays
3. ✅ Removed problematic performance tracking useEffect in GlanceModePanel
4. ❌ Component still enters mount/unmount cycle
5. ❌ "Maximum update depth exceeded" in useMemoryOptimization at lines 314 and 511

## Root Causes Identified

### 1. useMemoryOptimization Hook (PRIMARY ISSUE)
**File:** `packages/frontend/src/features/strategy-advisor/hooks/useMemoryOptimization.ts`
**Lines 314 and 511:** setState calls happening during cleanup/unmount phases

**Pattern:**
```
Component mounts → addCleanupTask (calls setState) →
Component unmounts → cleanup runs → setState called during unmount →
React throws error → Component remounts → Infinite cycle
```

### 2. GlanceModePanel Mount/Unmount Cycle
**File:** `packages/frontend/src/features/strategy-advisor/components/GlanceModePanel.tsx`
**Issue:** Component constantly mounting and unmounting due to unstable hook results

**Console Pattern:**
```
[MemoryOptimization] Added cleanup task
[useStrategyAdvisor] Hook cleanup completed
[MemoryOptimization] Added cleanup task
[useStrategyAdvisor] Hook cleanup completed
(repeats infinitely)
```

### 3. Multiple Hook Interdependencies
The hooks form a dependency chain that creates instability:
- `useStrategyAdvisor` depends on `useMemoryOptimization`
- `useMemoryOptimization` depends on `usePerformanceMonitoring`
- All use setState in ways that trigger re-renders
- Re-renders cause hooks to return new object references
- New references trigger effects that call setState
- Infinite cycle

## Task: Fix the Infinite Loops

### Approach 1: Fix useMemoryOptimization setState Issues
The hook calls setState in two problematic places:
1. `addCleanupTask` function (line 285) - called during component mount/render
2. `removeCleanupTask` function (line 292) - called during cleanup

**Potential Solution:** Use refs instead of state for cleanup task tracking, only use state for metrics that need to trigger re-renders.

### Approach 2: Stabilize Hook Return Values
All Strategy Advisor hooks return objects with functions. These objects are recreated on every render, causing infinite dependency chains.

**Potential Solution:** Wrap all return values in useMemo with proper dependencies.

### Approach 3: Redesign Cleanup Architecture
The current pattern of adding/removing cleanup tasks during mount/unmount is fundamentally incompatible with React's lifecycle.

**Potential Solution:** Use useEffect cleanup returns properly, avoid setState in cleanup phases entirely.

## Files to Focus On (In Order)
1. `packages/frontend/src/features/strategy-advisor/hooks/useMemoryOptimization.ts` (PRIMARY)
2. `packages/frontend/src/features/strategy-advisor/hooks/useStrategyAdvisor.ts`
3. `packages/frontend/src/features/strategy-advisor/components/GlanceModePanel.tsx`
4. `packages/frontend/src/features/strategy-advisor/hooks/usePerformanceMonitoring.ts`

## Success Criteria
1. Set `useStrategyAdvisorInterface = true` in `EnhancedIntelligencePanel.tsx` (line 54)
2. Start game from Room Setup
3. No console errors
4. No infinite mount/unmount cycles
5. Strategy Advisor panel renders and stays stable

## Key Constraints
- Cannot break existing gameplay functionality
- Must maintain all TypeScript type safety
- Cannot remove the Strategy Advisor feature (just fix it)
- All ESLint rules must pass

## Debugging Commands
```bash
# Start development
npm run dev:frontend    # Frontend at http://localhost:5175
npm run dev:backend     # Backend at http://localhost:5000

# Check for errors
npm run lint           # Must pass with 0 errors, 0 warnings
npm run type-check     # TypeScript check

# Test the game
# 1. Navigate to http://localhost:5175
# 2. Click "Quick Start" or set up room
# 3. Import hand with random tiles
# 4. Click "Start Game"
# 5. Watch console for loops
```

## Expected Logs When Working
```
GameModeView initialized
[MemoryOptimization] Added cleanup task: StrategyAdvisorAdapter cleanup
[MemoryOptimization] Added cleanup task: Clean up LRU cache entries
[MemoryOptimization] Added cleanup task: GlanceModePanel component cleanup
(Should stop here - no repeated mount/unmount cycles)
```

## Git Context
- Current branch: main
- Last working commit before Strategy Advisor: Check git log
- All fixes so far are committed
- Latest commit: "fix: Temporarily disable Strategy Advisor to stop infinite loops"

## Additional Context
This is a React 18 + TypeScript + Vite + Zustand app. The Strategy Advisor is a new feature (Phase 6) that provides AI-powered gameplay recommendations. It was working in isolation but breaks when integrated into the main game view.

The feature uses advanced patterns like:
- Performance monitoring with metrics tracking
- Memory optimization with LRU caching
- Cleanup task management
- Progressive disclosure UI
- Error recovery systems

All of these were built separately and tested in isolation, but when combined they create circular dependencies that React can't resolve.

## Recommended Approach
1. Start with useMemoryOptimization - convert state to refs where possible
2. Ensure all hook return values are stable (wrapped in useMemo)
3. Remove any setState calls from cleanup functions
4. Test incrementally - enable Strategy Advisor and check console
5. Once stable, verify full gameplay flow works

Good luck! The codebase is well-structured and the issue is isolated to these specific hooks.