# Strategy Advisor - Root Cause Analysis & Fix Strategy

## Current State (After Gemini Restoration)

**Status**: Back to original complex implementation with known infinite loop issues

**What Gemini Did**:
1. Restored original complex `useStrategyAdvisor.ts` (499 lines)
2. Restored original complex `strategy-advisor.store.ts` (516 lines with disclosure/strategy mode features)
3. Deleted the simplified `message-generator.ts` we created
4. Kept the complex `message-generator.service.ts` instead

**Result**: We're back to the original infinite loop problem that started this whole redesign effort.

---

## Root Cause Analysis

### The Infinite Loop Mechanism

The infinite loop occurs due to **circular dependency in React hooks**:

```
useStrategyAdvisor.ts (lines 98-134)
↓
intelligenceData = useMemo(() => {
  // Calls getCacheItem, setCacheItem (lines 101-114)
  return adapter.adaptIntelligenceData(...)
}, [adapter, intelligenceStore.currentAnalysis, intelligenceStore.isAnalyzing])
↓
Used in refresh() callback (line 202)
↓
refresh() triggers in multiple useEffects:
  - Auto-refresh interval (line 293)
  - Manual refresh on intelligenceData change (line 387)
  - Component mount (line 290)
↓
Each refresh reads intelligenceStore
↓
Intelligence store updates trigger new intelligenceData calculation
↓
New intelligenceData triggers refresh useEffect (line 387)
↓
INFINITE LOOP
```

### Why The Simplified Version Failed

**GlanceModePanel.tsx Dependencies**:
- 890-line component heavily coupled to disclosure/strategy mode features
- References store functions: `setDisclosureLevel`, `setStrategyMode`, `currentStrategyMode`
- Uses `DisclosureManager` component that expects full feature set
- Whack-a-mole fixing individual references was ineffective

**Architecture Mismatch**:
- Simplified store removed features the UI depended on
- UI layer wasn't rebuilt - only data layer was simplified
- Created gap between data model and presentation layer

---

## The Real Problem

**NOT** the complexity of the store or hooks.

**IT IS**: Unstable dependency chains in React causing re-render cascades:

1. **useStrategyAdvisor** subscribes to intelligence store
2. Intelligence store updates trigger useMemo recalculation
3. useMemo produces new object reference (even if data identical)
4. New reference triggers useEffect with `intelligenceData` dependency
5. useEffect calls `refresh()`
6. `refresh()` reads intelligence store
7. Reading store may trigger Zustand subscriptions
8. Back to step 1

### Performance Monitoring Hooks (Disabled but Still Present)

Lines 16-19, 52-67 in `useStrategyAdvisor.ts`:
- Import performance/memory/error hooks
- Create stub implementations with useCallback
- These stubs are included in dependency arrays
- Even no-op functions cause re-renders if not perfectly stable

---

## Fix Strategy Options

### Option 1: Minimal Surgical Fix (RECOMMENDED)
**Goal**: Stop infinite loops without architectural changes

**Steps**:
1. **Stabilize intelligenceData memoization**:
   - Use `useRef` to cache previous result
   - Only update ref if actual data changed (deep equality check)
   - Return stable reference from ref

2. **Break the refresh loop**:
   - Add debounce to refresh trigger (already attempted line 389)
   - Use `useRef` for lastProcessedAnalysisId to prevent duplicate refreshes
   - Remove intelligenceData from refresh useEffect dependencies

3. **Remove disabled monitoring hooks entirely**:
   - Delete imports (lines 16-19)
   - Delete stub implementations (lines 52-67)
   - Remove from dependency arrays

**Code Changes Required**:
```typescript
// useStrategyAdvisor.ts

// 1. Add refs for stability
const lastProcessedAnalysisIdRef = useRef<number>(0)
const intelligenceDataRef = useRef<IntelligenceData | null>(null)

// 2. Stable memoization with deep equality
const intelligenceData = useMemo(() => {
  const currentId = intelligenceStore.currentAnalysis?.lastUpdated || 0

  // Return cached if same analysis
  if (currentId === lastProcessedAnalysisIdRef.current && intelligenceDataRef.current) {
    return intelligenceDataRef.current
  }

  const newData = adapter.adaptIntelligenceData(
    intelligenceStore.currentAnalysis,
    intelligenceStore.isAnalyzing
  )

  intelligenceDataRef.current = newData
  lastProcessedAnalysisIdRef.current = currentId

  return newData
}, [adapter, intelligenceStore.currentAnalysis?.lastUpdated, intelligenceStore.isAnalyzing])

// 3. Remove intelligenceData from refresh effect dependencies
useEffect(() => {
  if (!strategyStore.isActive) return

  const currentId = intelligenceStore.currentAnalysis?.lastUpdated || 0

  // Only refresh if analysis ID actually changed
  if (currentId !== lastProcessedAnalysisIdRef.current && !strategyStore.isLoading) {
    const timeoutId = setTimeout(refresh, 500)
    return () => clearTimeout(timeoutId)
  }
}, [
  // REMOVED: intelligenceData
  intelligenceStore.currentAnalysis?.lastUpdated,
  strategyStore.isActive,
  strategyStore.isLoading,
  refresh
])
```

**Pros**:
- Minimal changes to existing architecture
- Preserves all disclosure/strategy mode features
- GlanceModePanel works without modifications
- Can test tomorrow with high confidence

**Cons**:
- Still complex architecture underneath
- Doesn't address architectural debt

---

### Option 2: Complete Rebuild (NOT RECOMMENDED for immediate fix)
**Goal**: Proper separation of concerns

**Would Require**:
1. Rebuild GlanceModePanel.tsx (890 lines) to match simplified store
2. Remove all disclosure/strategy mode features from UI
3. Create new simplified message display components
4. Extensive testing of all UI states

**Timeline**: 2-3 days minimum

**Risk**: High - large surface area for bugs

---

### Option 3: Disable Strategy Advisor (REJECTED by user)
> "Without the Strategy Advisor the app is useless. No sense bypassing it."

---

## Recommended Immediate Action

**For Tomorrow's Testing**:

1. **Implement Option 1 (Minimal Surgical Fix)**
   - Focus on stabilizing useStrategyAdvisor hook
   - Remove monitoring hook imports/stubs
   - Add ref-based caching to prevent re-render loops

2. **Verify with debug-specialist agent**
   - Run debug specialist to identify any remaining infinite loop triggers
   - Test with actual user workflow

3. **Monitor console for errors**:
   - Check for "getSnapshot should be cached" warnings
   - Check for "Maximum update depth exceeded" errors
   - Verify messages are generated and displayed

**Success Criteria**:
- ✅ No infinite loops
- ✅ Strategy Advisor displays messages
- ✅ Messages update when analysis changes
- ✅ No console errors or warnings
- ✅ Performance acceptable (<100ms message generation)

---

## Long-term Architectural Recommendation

**After immediate fix is stable**:

1. **Phase 1**: Extract message generation to standalone service (1 day)
   - Move all message logic out of hooks
   - Use simple service class with no React dependencies

2. **Phase 2**: Simplify store (1 day)
   - Remove disclosure/strategy mode features
   - Keep only: messages, loading, error, config

3. **Phase 3**: Rebuild UI layer (2 days)
   - Create new GlanceModePanel with simple message display
   - Remove 890-line component complexity
   - Progressive enhancement approach

**Total**: ~4 days for proper architectural cleanup

---

## Files to Modify Tomorrow

**Priority 1 (Must fix)**:
- `packages/frontend/src/features/strategy-advisor/hooks/useStrategyAdvisor.ts`

**Priority 2 (If time permits)**:
- `packages/frontend/src/features/strategy-advisor/stores/strategy-advisor.store.ts` (add memoization)

**Do NOT touch**:
- `GlanceModePanel.tsx` - works with current complex store
- `strategy-advisor-adapter.service.ts` - already clean
- `message-generator.service.ts` - already works

---

## Debug Commands for Tomorrow

```bash
# Check for infinite loop warnings
npm run dev:frontend 2>&1 | grep -i "maximum update"

# Check for Zustand warnings
npm run dev:frontend 2>&1 | grep -i "getSnapshot"

# Run linter
npm run lint

# Check types
npm run type-check
```

---

## Notes for Next Session

- User will have console output from testing
- Focus on fixing the hook stability first
- Use debug-specialist agent if needed
- Keep GlanceModePanel.tsx unchanged - it works with complex store
- The simplified approach failed because UI wasn't rebuilt to match

**Key Insight**: The problem isn't complexity - it's **unstable React dependencies causing cascading re-renders**. Fix the stability, keep the features.
