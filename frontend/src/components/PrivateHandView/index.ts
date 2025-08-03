// frontend/src/components/PrivateHandView/index.ts
// Export all PrivateHandView components and hooks

export { PrivateHandView } from './PrivateHandView';
export { HandTileGrid } from './HandTileGrid';
export { HandAnalysisPanel } from './HandAnalysisPanel';
export { TileActionBar } from './TileActionBar';

// Export hooks
export { usePrivateGameState } from './hooks/usePrivateGameState';
export { useHandAnalysis } from './hooks/useHandAnalysis';

// Re-export types for convenience
export type {
  Tile,
  PrivatePlayerState,
  HandAnalysis,
  PatternMatch,
  DefensiveAnalysis
} from '../../types';