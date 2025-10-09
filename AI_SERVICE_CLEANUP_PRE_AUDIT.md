# AI Service Cleanup - Pre-Implementation Audit

**Date:** 2025-10-08
**Status:** Ready for Phase 1

## Files Confirmed Present

### Phase 1: Dead Code (Target for deletion)

| File | Status | Imports Found | Notes |
|------|--------|--------------|-------|
| `turn-intelligence-engine.ts` | ✅ EXISTS | 10 files import it | **More usage than expected** - verify type-only |
| `opponent-analysis-engine.ts` | ✅ EXISTS | 2 files import it | Lower usage as predicted |
| `real-time-analysis-service.ts` | ✅ EXISTS | Not searched yet | Need to verify |
| `intelligenceService.ts` | ✅ EXISTS | 1 file (useGameIntelligence.ts) | Matches prediction |
| `useGameIntelligence.ts` | ✅ EXISTS | Not searched yet | Need to verify |

### Phase 2: Duplicate Logic (Strategy Advisor)

| File | Status | Notes |
|------|--------|-------|
| `pattern-prioritizer.service.ts` | ✅ EXISTS | Ready for deletion |
| `urgency-detection.service.ts` | ✅ EXISTS | To be simplified to function |
| `message-generator.service.ts` | ✅ EXISTS | To be simplified to function |
| `error-reporting.service.ts` | ✅ EXISTS | Move to error handling |
| `gesture-coordinator.service.ts` | ✅ EXISTS | Evaluate if needed |
| `strategy-advisor-adapter.service.ts` | ✅ EXISTS | Simplify to thin wrapper |
| `strategy-advisor.store.ts` | ✅ EXISTS | Delete - use useIntelligenceStore |

### Phase 3: Architectural Fix

| File | Status | Imports Found | Risk Level |
|------|--------|--------------|-----------|
| `call-opportunity-analyzer.ts` | ✅ EXISTS | 4 files import it | ⚠️ HIGH - Active usage |

**Files importing call-opportunity-analyzer:**
1. `EnhancedIntelligencePanel.tsx`
2. `GameModeView.tsx`
3. `CallOpportunitySection.tsx`
4. `CallOpportunityOverlay.tsx`

## Critical Discovery: turn-intelligence-engine.ts Usage

The plan assumed this was type-only, but 10 files import it:

1. `EnhancedIntelligencePanel.tsx`
2. `GameModeView.tsx`
3. `GameScreenLayout.tsx`
4. `useGameIntelligence.ts`
5. `intelligenceService.ts`
6. `game-state-factories.ts` (test file)
7. `opponent-analysis-engine.ts`
8. `call-opportunity-analyzer.ts`
9. `TurnRecommendationsSection.tsx`
10. `DefensivePlaySection.tsx`

**Action Required:** Before Phase 1, verify if these are type-only imports:

```bash
# Check if imports are type-only
grep -n "turn-intelligence-engine" packages/frontend/src/features/gameplay/GameModeView.tsx
# Look for: import type { ... } from 'turn-intelligence-engine'
```

## Revised Phase 1 Strategy

### Step 1A: Verify Type-Only Imports

```bash
# For each importing file, check if it's type-only
grep -A 2 "import.*turn-intelligence-engine" [file] | grep "import type"
```

### Step 1B: Extract Types First

Before deleting any files, extract useful types to `shared-types`:

```typescript
// shared-types/src/intelligence-types.ts (new file)

export interface TurnIntelligence {
  // From turn-intelligence-engine.ts
  currentTurn: number
  turnPhase: 'draw' | 'discard' | 'call'
  availableActions: string[]
  recommendations: TileRecommendation[]
}

export interface CallOpportunity {
  // From call-opportunity-analyzer.ts
  type: 'pung' | 'kong' | 'chow' | 'mahjong'
  tiles: Tile[]
  benefit: number
  risk: number
}

export interface OpponentInsight {
  // From opponent-analysis-engine.ts
  playerId: string
  likelyPatterns: string[]
  discardedSuits: string[]
  riskLevel: 'low' | 'medium' | 'high'
}
```

### Step 1C: Update Imports

```bash
# Replace type imports
find packages/frontend/src -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/from.*turn-intelligence-engine/from "shared-types\/intelligence-types"/g'
```

### Step 1D: Delete Files

Only after all imports updated:
```bash
rm packages/frontend/src/features/intelligence-panel/services/turn-intelligence-engine.ts
rm packages/frontend/src/features/intelligence-panel/services/opponent-analysis-engine.ts
rm packages/frontend/src/features/intelligence-panel/services/real-time-analysis-service.ts
rm packages/frontend/src/services/intelligenceService.ts
rm packages/frontend/src/hooks/useGameIntelligence.ts
```

## Phase 3 Risk Assessment

**HIGH RISK:** `call-opportunity-analyzer.ts` has 4 active component imports.

**Mitigation Strategy:**

1. **Don't delete immediately** - replace with store method first
2. **Create store method** in `useIntelligenceStore`:
   ```typescript
   // useIntelligenceStore.ts
   actions: {
     analyzeCallOpportunities: async (tiles, discardPile) => {
       const analysis = await AnalysisEngine.analyzeHand(...)
       const callOps = analysis.callOpportunities // Engine 3 should provide this
       set({ callOpportunities: callOps })
       return callOps
     }
   }
   ```

3. **Update components one by one:**
   ```typescript
   // BEFORE
   import { analyzeCallOpportunity } from './services/call-opportunity-analyzer'
   const callOpp = await analyzeCallOpportunity(tiles, patterns)

   // AFTER
   const analyzeCallOpportunities = useIntelligenceStore(s => s.actions.analyzeCallOpportunities)
   const callOpp = await analyzeCallOpportunities(tiles, patterns)
   ```

4. **Delete file last** - only after all 4 components updated

## Component Impact Matrix

| Component | turn-intel | opponent | call-opp | Risk |
|-----------|-----------|----------|----------|------|
| `EnhancedIntelligencePanel.tsx` | ✓ | × | ✓ | MEDIUM |
| `GameModeView.tsx` | ✓ | × | ✓ | HIGH |
| `CallOpportunitySection.tsx` | × | × | ✓ | LOW |
| `CallOpportunityOverlay.tsx` | × | × | ✓ | LOW |
| `OpponentInsightsSection.tsx` | × | ✓ | × | LOW |
| `TurnRecommendationsSection.tsx` | ✓ | × | × | LOW |
| `DefensivePlaySection.tsx` | ✓ | × | × | LOW |

**HIGH RISK:** `GameModeView.tsx` - Main game view, imports multiple services

## Recommended Execution Order

### Phase 1 (Revised): Extract Types → Delete Dead Code
1. Create `shared-types/intelligence-types.ts`
2. Extract all useful types
3. Update imports in all files
4. Verify TypeScript compiles
5. Delete 5 dead code files
6. Test build

**Estimated Time:** 1 hour (up from 30 min due to type extraction)

### Phase 2: Consolidate Strategy Advisor
As planned, no changes needed.

**Estimated Time:** 2 hours

### Phase 3: Single Entry Point (Revised)
1. Add `analyzeCallOpportunities` method to `useIntelligenceStore`
2. Update components one by one (7 components total)
3. Test after each component update
4. Delete `call-opportunity-analyzer.ts` last

**Estimated Time:** 3 hours (up from 2 hours due to component count)

## Total Revised Estimate
- **Original:** 4-5 hours
- **Revised:** 6 hours
- **Reason:** More active usage than expected, need careful migration

## Next Step

Before starting Phase 1, run this verification script:

```bash
# Save as verify-imports.sh
echo "=== Checking turn-intelligence-engine imports ==="
for file in $(grep -l "turn-intelligence-engine" packages/frontend/src/**/*.{ts,tsx} 2>/dev/null); do
  echo "File: $file"
  grep "import.*turn-intelligence-engine" "$file"
  echo ""
done

echo "=== Checking call-opportunity-analyzer imports ==="
for file in $(grep -l "call-opportunity-analyzer" packages/frontend/src/**/*.{ts,tsx} 2>/dev/null); do
  echo "File: $file"
  grep "import.*call-opportunity-analyzer" "$file"
  echo ""
done
```

This will show exactly which imports are type-only vs actual function imports.

## Status

- ✅ All target files exist
- ✅ Import analysis complete
- ⚠️ More active usage than plan predicted
- ⚠️ Need type extraction step added to Phase 1
- ⚠️ Need component-by-component migration for Phase 3
- ✅ Ready to proceed with revised plan

**Recommendation:** Start with revised Phase 1 once Zustand testing is complete.
