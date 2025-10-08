# Clean Async Analysis Architecture Plan

## Problem Summary
Analysis completes (71 patterns in ~470ms) but the intelligence store never receives the results, leaving the loading overlay stuck. GameModeView mounts but shows "Analyzing hand for recommendations..." indefinitely.

## Root Cause
We've been fighting async/await deadlocks by trying to make everything synchronous. This created complexity with dual return types and still didn't fix the core issue: **the analysis result isn't reaching the intelligence store**.

## The Clean Solution

### Phase 1: Revert to Clean Async (ALL METHODS ASYNC)
1. **Keep preloading** in `main.tsx` - it's good, avoids network stalls
2. **Make all methods properly async** - no dual return types, embrace async/await
3. **Remove all synchronous workarounds** - type casts, conditional awaits, etc.

### Phase 2: Add Comprehensive Logging
Add logs at EVERY step to find where the analysis chain breaks:
1. `PatternAnalysisEngine.analyzePatterns()` - Entry and exit
2. `AnalysisEngine.getEngine1Facts()` - Entry, cache check, call, return
3. `PatternRankingEngine.rankPatterns()` - Entry and exit (Engine 2)
4. `TileRecommendationEngine.generateRecommendations()` - Entry and exit (Engine 3)
5. `AnalysisEngine.analyzeHand()` - Entry, conversion, return
6. `intelligence-store.ts` - Promise race, result received, state set

### Phase 3: Fix the Actual Hang Point
Once we see where it hangs, fix THAT specific location, not everything.

## Files to Revert

### 1. `pattern-analysis-engine.ts`
**Revert from:**
```typescript
static analyzePatterns(...): PatternAnalysisFacts[] {
  // No await keywords
  const variations = PatternVariationLoader.getPatternVariations(patternId) as PatternVariation[]
}
```

**Back to:**
```typescript
static async analyzePatterns(...): Promise<PatternAnalysisFacts[]> {
  await PatternVariationLoader.loadVariations()
  const variations = await PatternVariationLoader.getPatternVariations(patternId)
}
```

### 2. `pattern-variation-loader.ts`
**Keep current dual return types** - data IS preloaded, so:
- `loadVariations()` returns `void` when loaded, `Promise<void>` when loading
- `getPatternVariations()` returns array when loaded, Promise when loading

**BUT**: Add safety checks:
```typescript
static getPatternVariations(patternId: string): PatternVariation[] | Promise<PatternVariation[]> {
  if (this.isLoaded) {
    return this.index?.byPattern?.[patternId] || []
  }

  // Not loaded - this shouldn't happen with preloading, but handle gracefully
  return this.loadVariations().then(() => {
    return this.index?.byPattern?.[patternId] || []
  }) as Promise<PatternVariation[]>
}
```

### 3. `analysis-engine.ts` - `getEngine1Facts()`
**Revert from:**
```typescript
const facts = PatternAnalysisEngine.analyzePatterns(...) // No await
```

**Back to:**
```typescript
const facts = await PatternAnalysisEngine.analyzePatterns(...)
```

### 4. `analyzePatternVariations()`
**Keep it synchronous** - it does pure computation, no I/O:
```typescript
private static analyzePatternVariations(...): PatternAnalysisFacts {
  // No async, pure computation
}
```

## Critical Insight: Where the Deadlock Really Is

The deadlock is NOT in pattern analysis (that completes). It's likely in:
1. **Engine 2**: `PatternRankingEngine.rankPatterns()`
2. **Engine 3**: `TileRecommendationEngine.generateRecommendations()`
3. **Result conversion**: `convertToHandAnalysis()`

One of these is probably async and hanging on an await that never resumes.

## Logging Strategy

Add these specific logs:

```typescript
// analysis-engine.ts line ~241
console.log('✅ Engine 1 (getEngine1Facts) returned:', analysisFacts.length, 'facts')

// analysis-engine.ts line ~259
console.log('🔄 Calling Engine 2: PatternRankingEngine.rankPatterns...')
const patternRankings = await PatternRankingEngine.rankPatterns(...)
console.log('✅ Engine 2 complete:', patternRankings.topPatterns?.length, 'patterns')

// analysis-engine.ts line ~272
console.log('🔄 Calling Engine 3: TileRecommendationEngine.generateRecommendations...')
const tileRecommendations = await TileRecommendationEngine.generateRecommendations(...)
console.log('✅ Engine 3 complete:', tileRecommendations.tileActions?.length, 'actions')

// analysis-engine.ts line ~292
console.log('🔄 Converting to HandAnalysis...')
const result = this.convertToHandAnalysis(...)
console.log('✅ HandAnalysis created, returning to intelligence store')

// intelligence-store.ts line ~256
console.log('✅ Analysis promise resolved!')
console.log('✅ Setting currentAnalysis and isAnalyzing: false')
```

## Expected Log Flow (Clean)

```
🎯 PatternAnalysisEngine.analyzePatterns called
✅ PatternAnalysisEngine.analyzePatterns returning 71 results
✅ Engine 1 (getEngine1Facts) returned: 71 facts
🔄 Calling Engine 2: PatternRankingEngine.rankPatterns...
✅ Engine 2 complete: 10 patterns
🔄 Calling Engine 3: TileRecommendationEngine.generateRecommendations...
✅ Engine 3 complete: 13 actions
🔄 Converting to HandAnalysis...
✅ HandAnalysis created, returning to intelligence store
✅ Analysis promise resolved!
✅ Setting currentAnalysis and isAnalyzing: false
```

Whatever log is MISSING shows us where it hangs.

## Next Session Continuation

If we run out of context:

1. Check git status to see what files changed
2. Read this plan
3. Look at the last console log output to see where it stopped
4. Focus on fixing THAT specific method, not everything
5. Likely culprits: Engine 2 or Engine 3 (we already fixed Engine 1)

## Key Principle

**Don't fight async - embrace it properly.** The issue isn't that things are async, it's that we're awaiting in the wrong place or something is returning a broken Promise.
