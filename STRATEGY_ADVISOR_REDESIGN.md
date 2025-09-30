# Strategy Advisor Redesign - Task Brief

## Context

The **Strategy Advisor** is a feature intended to provide conversational, glance-mode AI guidance during American Mahjong gameplay. It should replace the current `EnhancedIntelligencePanel` with a simpler, more conversational interface.

The current implementation has critical architectural flaws that make it unusable:

## Critical Issues with Current Implementation

1. **Infinite Re-render Loop** - `GlanceModePanel` re-renders 20+ times per second, causing performance issues
2. **No Message Generation** - `useStrategyAdvisor()` returns empty `messages` array despite having valid analysis data
3. **Mount/Unmount Cycles** - Hook mounts/unmounts repeatedly, causing cleanup to run constantly
4. **Performance Monitoring Overhead** - Hooks like `usePerformanceMonitoring`, `useMemoryOptimization`, `useErrorRecovery` block the main analysis engine even when stubbed out

## Current State

- **Location**: `packages/frontend/src/features/strategy-advisor/`
- **Main Components**:
  - `hooks/useStrategyAdvisor.ts` - Main hook orchestrating Strategy Advisor
  - `components/GlanceModePanel.tsx` - UI component showing strategy messages
  - `services/strategy-advisor-adapter.service.ts` - Adapter converting intelligence data to messages
  - `stores/strategy-advisor.store.ts` - Zustand store for Strategy Advisor state

- **Status**: Disabled in `EnhancedIntelligencePanel.tsx` (line 50-60)
- **Working Alternative**: `EnhancedIntelligencePanel` shows pattern analysis correctly and runs in ~80ms

## What Needs to Happen

### Requirements

1. **Simple Message Generation**
   - Take `HandAnalysis` from `useIntelligenceStore().currentAnalysis`
   - Generate 1-3 simple conversational messages like:
     - "Focus on CONSECUTIVE RUN #3 - you have 9/14 tiles (64%)"
     - "Consider discarding 8B - it doesn't help any top patterns"
     - "Keep jokers - they're valuable for 3 different patterns"

2. **Lightweight Implementation**
   - NO performance monitoring hooks
   - NO memory optimization hooks
   - NO error recovery hooks
   - Use simple `useState`, `useEffect`, `useMemo`, `useCallback` only
   - Ensure stable references to prevent infinite re-renders

3. **Progressive Disclosure**
   - Show brief glance message by default
   - Allow user to expand for detailed reasoning
   - Support different urgency levels (normal, important, urgent)

4. **Replace EnhancedIntelligencePanel**
   - Once working, Strategy Advisor should be the default
   - `EnhancedIntelligencePanel` can be deprecated

### Architecture Guidance

**DON'T:**
- Create new monitoring/optimization hooks
- Call `usePerformanceMonitoring`, `useMemoryOptimization`, `useErrorRecovery`
- Use complex adapter services with multiple layers
- Have unstable function references in useEffect dependencies

**DO:**
- Create simple, focused hooks with minimal dependencies
- Use `useCallback` with proper dependency arrays for stability
- Generate messages directly from `HandAnalysis` data structure
- Keep component render cycles predictable

### Key Data Structures

```typescript
// Available from intelligence-store.ts
interface HandAnalysis {
  overallScore: number
  recommendedPatterns: PatternRecommendation[]  // Top 5 patterns
  bestPatterns: PatternAnalysis[]
  tileRecommendations: TileRecommendation[]     // Keep/discard guidance
  strategicAdvice: string[]
  threats: Array<{
    level: 'low' | 'medium' | 'high'
    description: string
    mitigation: string
  }>
}

interface PatternRecommendation {
  pattern: PatternSelectionOption
  confidence: number
  totalScore: number  // AI score 0-100
  completionPercentage: number
  reasoning: string
  expandedTiles?: string[]  // 14-tile array
}

interface TileRecommendation {
  tileId: string
  action: 'keep' | 'pass' | 'discard' | 'neutral'
  confidence: number
  reasoning: string
  priority: number
}
```

### Expected Usage

```tsx
// In EnhancedIntelligencePanel.tsx (or replace it)
import { useStrategyAdvisor } from '../strategy-advisor/hooks/useStrategyAdvisor'

const { messages, isLoading } = useStrategyAdvisor()

// messages should be array of 1-3 simple strategy messages like:
// [
//   {
//     id: '1',
//     type: 'pattern-focus',
//     urgency: 'normal',
//     headline: 'Focus on CONSECUTIVE RUN #3',
//     summary: 'You have 9/14 tiles (64% complete)',
//     details: 'This pattern has the highest AI score...',
//   }
// ]
```

### Testing Requirements

1. Analysis should complete in ~80-100ms (currently works when Strategy Advisor disabled)
2. No infinite re-render loops (check console for repeated logs)
3. Messages should appear after analysis completes
4. Component should mount once and stay mounted (no mount/unmount cycles)

## Files to Review

- `packages/frontend/src/stores/intelligence-store.ts` - Source of analysis data
- `packages/frontend/src/features/gameplay/EnhancedIntelligencePanel.tsx` - Where Strategy Advisor gets used
- `packages/frontend/src/features/strategy-advisor/` - Current broken implementation

## Success Criteria

✅ Analysis completes in <100ms
✅ Strategy Advisor shows 1-3 conversational messages
✅ No infinite re-renders (console logs should be minimal)
✅ No mount/unmount cycles
✅ Messages update when analysis data changes
✅ Simple, maintainable code (~200 lines for hook + component)

## Notes

- The existing `EnhancedIntelligencePanel` works perfectly - use it as reference for what data is available
- Focus on simplicity over features - get basic message generation working first
- React 18 StrictMode will double-mount in dev - that's expected, but repeated mounting is not
- See `CLAUDE.md` in repo root for development setup and architecture patterns

Good luck! The goal is a simple, performant Strategy Advisor that makes the game guidance more conversational and easier to glance at during gameplay.
