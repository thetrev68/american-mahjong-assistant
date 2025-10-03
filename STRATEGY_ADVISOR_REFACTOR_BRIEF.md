# Strategy Advisor Refactor Task Brief

## Context
The Strategy Advisor feature in the American Mahjong Assistant app has infinite render loop issues caused by improper Zustand store subscription patterns. We've partially fixed the main hook, but the UI components still have issues.

## Problem Statement
**Symptom:** When `useStrategyAdvisorInterface = true` in `EnhancedIntelligencePanel.tsx`, the entire GameModeView enters an infinite render loop, causing console spam and performance issues.

**Root Cause:** Multiple hooks throughout the Strategy Advisor feature subscribe to entire Zustand stores instead of using granular selectors, causing re-renders on every state change.

## What We've Already Fixed ✅

### 1. **useStrategyAdvisor Hook** (`packages/frontend/src/features/strategy-advisor/hooks/useStrategyAdvisor.ts`)
- **Lines 47-57:** Replaced whole-store subscriptions with granular selectors
  ```typescript
  // BEFORE (caused infinite loops)
  const intelligenceStore = useIntelligenceStore()
  const strategyStore = useStrategyAdvisorStore()

  // AFTER (fixed)
  const currentAnalysis = useIntelligenceStore(state => state.currentAnalysis)
  const isIntelligenceAnalyzing = useIntelligenceStore(state => state.isAnalyzing)
  const currentMessages = useStrategyAdvisorStore(state => state.currentMessages)
  const isActive = useStrategyAdvisorStore(state => state.isActive)
  // ... etc for all needed properties
  ```

- **Lines 289-327:** Fixed computed values to use `useMemo` instead of unstable selectors
  - `mostUrgentMessage` - Replicated logic directly in hook
  - `actionableMessages` - Filtered in useMemo
  - `hasNewInsights` - Computed in useMemo

- **Line 232:** Removed immediate `setTimeout` refresh on mount to prevent auto-trigger loops

### 2. **DisclosureManager Component** (`packages/frontend/src/features/strategy-advisor/components/DisclosureManager.tsx`)
- **Line 53:** Fixed useEffect dependency from `disclosure` (entire object) to `disclosure.adaptToUrgency` (just the function)

## What Still Needs Fixing ❌

### Components with Render Loops
When `GlanceModePanel` renders, it triggers infinite re-renders. The issue is in one or more of these components/hooks:

**Primary Suspect Files:**
1. `packages/frontend/src/features/strategy-advisor/components/GlanceModePanel.tsx`
2. `packages/frontend/src/features/strategy-advisor/hooks/useUrgencyDetection.ts`
3. `packages/frontend/src/features/strategy-advisor/hooks/useStrategyMode.ts`
4. `packages/frontend/src/features/strategy-advisor/hooks/usePerformanceMonitoring.ts`
5. `packages/frontend/src/features/strategy-advisor/hooks/useMemoryOptimization.ts`
6. `packages/frontend/src/features/strategy-advisor/hooks/useErrorRecovery.ts`

**Common Patterns to Look For:**
- ❌ `const store = useStrategyAdvisorStore()` - subscribing to entire store
- ❌ `useEffect(() => { ... }, [storeObject])` - depending on entire store object
- ❌ Selectors that return new arrays/objects every time (need memoization)
- ❌ `useMemo` depending on store objects instead of primitive values

## Your Task

### Step 1: Identify the Culprit
1. Start by reading `GlanceModePanel.tsx` and identify which hooks it uses
2. Check each hook for whole-store subscriptions
3. Look for `useEffect` hooks with unstable dependencies (store objects, functions that recreate)

### Step 2: Apply the Fix Pattern
For each problematic hook, apply this pattern:

**Pattern A: Replace Whole-Store Subscriptions**
```typescript
// BEFORE
const store = useStrategyAdvisorStore()

// AFTER - subscribe to individual properties
const messages = useStrategyAdvisorStore(state => state.currentMessages)
const isActive = useStrategyAdvisorStore(state => state.isActive)
const config = useStrategyAdvisorStore(state => state.config)
```

**Pattern B: Fix Computed Values with Unstable Selectors**
```typescript
// BEFORE - returns new array every time
const urgentMessages = useStrategyAdvisorStore(strategyAdvisorSelectors.urgentMessages)

// AFTER - compute in useMemo with proper dependencies
const urgentMessages = useMemo(() => {
  return currentMessages.filter(msg => msg.urgency === 'critical' || msg.urgency === 'high')
}, [currentMessages])
```

**Pattern C: Fix useEffect Dependencies**
```typescript
// BEFORE - entire object in deps causes re-runs
useEffect(() => {
  disclosure.adaptToUrgency(urgencyLevel)
}, [urgencyLevel, disclosure])

// AFTER - only depend on the function
useEffect(() => {
  disclosure.adaptToUrgency(urgencyLevel)
}, [urgencyLevel, disclosure.adaptToUrgency])
```

**Pattern D: Subscribe to Primitive Values from Config Objects**
```typescript
// BEFORE - config object changes even if contents same
const config = useStrategyAdvisorStore(state => state.config)
const refreshInterval = config.refreshInterval

// AFTER - subscribe directly to the primitive
const refreshInterval = useStrategyAdvisorStore(state => state.config.refreshInterval)
```

### Step 3: Test Incrementally
1. After fixing each hook, test by setting `useStrategyAdvisorInterface = true` in `EnhancedIntelligencePanel.tsx` (line 54)
2. Navigate to Game Mode (Tile Input → Start Game)
3. Watch console - if it's spamming logs constantly, the loop still exists
4. If console is clean and patterns display, the hook is fixed ✅

### Step 4: Verify Success
**Success Criteria:**
- ✅ Navigation works (Tile Input → Game Mode)
- ✅ Patterns display (should see 5 patterns)
- ✅ Strategy Advisor UI appears (GlanceModePanel component renders)
- ✅ Console is clean (no constant re-render logs)
- ✅ No "Maximum update depth exceeded" errors

## Current Test State
**File:** `packages/frontend/src/features/gameplay/EnhancedIntelligencePanel.tsx`
**Line 54:** `const useStrategyAdvisorInterface = false`
**Line 59:** Feature is disabled with explanatory comment

When you've fixed the issues, change line 59 to `true` and uncomment lines 51, 56-61.

## Architecture Notes

### Store Structure
The app uses **Zustand** for state management with two main stores:
- `useIntelligenceStore` - Hand analysis, pattern recommendations, AI scores
- `useStrategyAdvisorStore` - Strategy messages, UI state, disclosure config

### Zustand Best Practice
**Always use selectors** when subscribing to avoid unnecessary re-renders:
```typescript
// ✅ GOOD - only re-renders when messages change
const messages = useStore(state => state.messages)

// ❌ BAD - re-renders on ANY store change
const store = useStore()
const messages = store.messages
```

### Existing Selectors
The store already has selectors defined in `strategy-advisor.store.ts` lines 418-481, but many return new objects/arrays. Use them carefully or replicate logic with `useMemo`.

## Debug Commands
```bash
# Start dev servers
npm run dev:frontend    # http://localhost:5175
npm run dev:backend     # http://localhost:5000

# Run linter (should be 0 errors before committing)
npm run lint
```

## Questions to Ask If Stuck
1. "Show me all the hooks used by GlanceModePanel"
2. "Find all instances where useStrategyAdvisorStore is called without a selector"
3. "Show me the useUrgencyDetection hook implementation"
4. "Are there any useEffect hooks depending on store objects?"

## Expected Outcome
After this refactor:
- Strategy Advisor UI renders without performance issues
- GlanceModePanel displays strategic messages based on hand analysis
- All game features work together: patterns, tiles, timer, AND Strategy Advisor

Good luck! The pattern is clear from what we've already fixed - just apply it systematically to the remaining hooks.
