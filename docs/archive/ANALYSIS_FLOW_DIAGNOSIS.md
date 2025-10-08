# Analysis Flow Diagnosis

## Current Problem
App gets stuck after navigating to GameModeView. Analysis starts but never completes.

## Flow Sequence (from logs)

### 1. App Initialization ✅
```
main.tsx → Preload NMJL data → patterns loaded (71) → Mount React app
```

### 2. Room Setup → Tile Input ✅
```
RoomSetupView → "Start Game" clicked → navigate('/tiles') → TileInputPage mounts
```

### 3. Tile Input → Game (STUCK HERE ❌)
```
TileInputPage → "Start Game" clicked → navigate('/game') → GameModeView mounts
```

### 4. GameModeView Initialization (HANGS)
```
GameModeView useEffect (line 125) triggers →
  intelligenceStore.analyzeHand() called →
    lazyAnalysisEngine.analyzeHand() called →
      AnalysisEngine.analyzeHand() called →
        nmjlService.getSelectionOptions() called →
          Returns Promise with setTimeout(..., 0) →
            ❌ setTimeout NEVER FIRES
```

## The Smoking Gun

**Line order in console:**
```javascript
nmjl-service.ts:188 📋 Mapped to 71 selection options, scheduling resolution...
GameModeView.tsx:484 GameModeView initialized  // <-- This is AFTER the setTimeout is scheduled!
```

**The setTimeout callback NEVER fires:**
```javascript
setTimeout(() => {
  console.log('📋 setTimeout fired, resolving with', result.length, 'results')  // ❌ NEVER LOGS
  resolve(result)
}, 0)
```

## Root Cause Hypothesis

### Theory 1: Event Loop Blocked
- GameModeView continues rendering while analysis is waiting
- Something is blocking the event loop from processing the setTimeout queue
- React's rendering cycle might be preventing macro-task execution

### Theory 2: React Effect Infinite Loop
- GameModeView useEffect has `intelligenceStore` in dependencies
- When analysis starts, store updates
- Effect re-triggers before previous analysis completes
- **Fixed in latest commit** by removing `isAnalyzing` from deps

### Theory 3: Async Context Lost
- The `await` in analysis-engine.ts line 203 is in an async function
- When setTimeout schedules the resolution, the async context is abandoned
- React component unmount/remount interferes with Promise resolution

### Theory 4: Event Loop Queues Blocked
- `Promise.resolve()` schedules callbacks on **microtask queue** (high priority)
- `setTimeout()` schedules callbacks on **macrotask queue** (lower priority)
- **Microtasks run BEFORE macrotasks** in normal JavaScript execution
- Both failed to execute, suggesting React is blocking the entire event loop
- React's rendering cycle prevents BOTH queues from processing until render completes
- But render is waiting for async operations → **circular deadlock**

## Key Files Involved

### 1. GameModeView.tsx (lines 125-148)
**Role:** Triggers initial analysis on mount
```typescript
useEffect(() => {
  if (/* conditions */) {
    intelligenceStore.analyzeHand(playerHand, [])
  }
}, [/* dependencies */])
```

### 2. intelligence-store.ts (lines 224-276)
**Role:** Coordinates analysis with 30s timeout
```typescript
analyzeHand: async (tiles, patterns) => {
  const analysisPromise = lazyAnalysisEngine.analyzeHand(...)
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 30000)
  )
  const analysis = await Promise.race([analysisPromise, timeoutPromise])
}
```

### 3. analysis-engine-lazy.ts
**Role:** Lazy loads the analysis engine
```typescript
async analyzeHand(...) {
  if (analysisEngineClass) {
    return analysisEngineClass.analyzeHand(...)  // Direct call if cached
  }
  const EngineClass = await getAnalysisEngine()  // Load if needed
  return EngineClass.analyzeHand(...)
}
```

### 4. analysis-engine.ts (lines 184-280)
**Role:** Core analysis engine - THIS IS WHERE IT HANGS
```typescript
static async analyzeHand(playerTiles, selectedPatterns, gameContext, isPatternSwitching) {
  const tileIds = playerTiles.map(tile => tile.id)

  // ❌ HANGS HERE - await never resumes
  const patternsToAnalyze = await nmjlService.getSelectionOptions()

  // Never reached:
  const analysisFacts = await this.getEngine1Facts(...)
  const patternRankings = await PatternRankingEngine.rankPatterns(...)
  const tileRecommendations = await TileRecommendationEngine.generateRecommendations(...)
}
```

### 5. nmjl-service.ts (lines 172-193)
**Role:** Provides pattern data - setTimeout never fires
```typescript
getSelectionOptions(): Promise<PatternSelectionOption[]> {
  if (!this.loaded) {
    return this.loadPatterns().then(...)
  }

  // ❌ setTimeout NEVER FIRES
  return new Promise((resolve) => {
    const result = this.mapPatternsToSelectionOptions()
    setTimeout(() => {
      console.log('📋 setTimeout fired...')  // ❌ NEVER LOGS
      resolve(result)
    }, 0)
  })
}
```

## Attempted Fixes (All Failed)

1. ✅ Removed React StrictMode (fixed double-mount issues)
2. ✅ Preloaded all pattern data at app startup
3. ❌ Made getSelectionOptions() async-only
4. ❌ Removed await, used explicit .then() chains
5. ❌ Used Promise.resolve() to return synchronously
6. ❌ Used setTimeout(..., 0) to break out of execution context
7. ✅ Removed `isAnalyzing` from useEffect dependencies

## What We Know For Sure

1. ✅ Pattern data loads successfully (71 patterns)
2. ✅ Navigation from Room Setup → Tile Input works
3. ✅ Navigation from Tile Input → Game works
4. ✅ GameModeView mounts successfully
5. ✅ Analysis starts (logs show it begins)
6. ❌ `nmjlService.getSelectionOptions()` returns a Promise
7. ❌ The Promise never resolves (callback never fires)
8. ❌ `await` in analysis-engine.ts never resumes
9. ❌ Analysis never completes
10. ❌ Game screen shows empty (no tiles, no patterns)

## Next Steps to Consider

### Option 1: Bypass Async Completely
Make `getSelectionOptions()` return data synchronously when cached:
```typescript
getSelectionOptions(): PatternSelectionOption[] | Promise<PatternSelectionOption[]> {
  if (this.loaded) {
    return this.mapPatternsToSelectionOptions()  // Return array directly
  }
  return this.loadPatterns().then(...)  // Return promise only if not loaded
}
```

Then update caller to handle both:
```typescript
const result = nmjlService.getSelectionOptions()
const patternsToAnalyze = Array.isArray(result) ? result : await result
```

### Option 2: Force Synchronous Execution Path
Skip analysis on mount, let user manually trigger it:
- Remove auto-analysis from GameModeView useEffect
- Add "Analyze Hand" button
- User clicks button → analysis runs in response to user interaction
- User interaction context might not have same async issues

### Option 3: Simplify Analysis Flow
Remove lazy loading and always use direct analysis engine:
- Pre-instantiate AnalysisEngine at app startup
- Remove all async wrappers
- Make analysis completely synchronous

### Option 4: Debug Event Loop State
Add diagnostics to check event loop health:
```typescript
console.log('Microtask queue:', queueMicrotask.length)
console.log('Macro task queue:', setTimeout.length)
console.log('React render phase:', /* check React internals */)
```

## Recommendation

**Try Option 1 first** - revert to sync/async union type for `getSelectionOptions()`.

The CodeRabbit recommendation to enforce async-only was theoretically correct but practically causes this deadlock. Since patterns are preloaded, we should return them synchronously to avoid Promise resolution issues.
