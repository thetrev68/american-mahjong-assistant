import { create } from 'zustand';
import type { PatternRanking } from '@shared-types/game-types';
import type { HandAnalysis, TileRecommendation } from '../types/intelligence';
import type { PlayerTile, PatternSelectionOption } from 'shared-types';
import { AnalysisEngine } from '../lib/services/analysis-engine';
import type { GameContext } from '../features/intelligence-panel/services/pattern-analysis-engine';

export type {
  HandAnalysis,
  TileRecommendation,
  PatternRecommendation,
  PatternAnalysis,
  PatternScoreBreakdown,
  PatternAnalysisDetail,
  AnalysisThreat,
  IntelligenceSnapshot,
  TileAction,
} from '../types/intelligence';

interface IntelligenceState {
  handAnalysis: HandAnalysis | null;
  tileRecommendations: TileRecommendation[];
  patternRankings: PatternRanking[];
  isAnalyzing: boolean;
  analysisError: string | null;
  cacheVersion: number;
  // Top-level method for backward compatibility
  analyzeHand: (
    playerTiles: PlayerTile[],
    selectedPatterns?: PatternSelectionOption[],
    isPatternSwitching?: boolean,
    gameContext?: Partial<GameContext>
  ) => Promise<void>;
  actions: {
    analyzeHand: (
      playerTiles: PlayerTile[],
      selectedPatterns?: PatternSelectionOption[],
      isPatternSwitching?: boolean,
      gameContext?: Partial<GameContext>
    ) => Promise<void>;
    setAnalysis: (analysis: HandAnalysis) => void;
    clearAnalysis: () => void;
    setTileRecommendations: (recommendations: TileRecommendation[]) => void;
    setPatternRankings: (rankings: PatternRanking[]) => void;
    setAnalyzing: (isAnalyzing: boolean) => void;
    setError: (error: string | null) => void;
    clearCache: () => void;
    clearRecommendations: () => void;
  };
}

export const useIntelligenceStore = create<IntelligenceState>((set, get) => {
  // Shared analyzeHand implementation
  const analyzeHandImpl = async (
    playerTiles: PlayerTile[],
    selectedPatterns: PatternSelectionOption[] = [],
    isPatternSwitching = false,
    gameContext?: Partial<GameContext>
  ) => {
    set({ isAnalyzing: true, analysisError: null });
    try {
      const analysis = await AnalysisEngine.analyzeHand(
        playerTiles,
        selectedPatterns,
        gameContext,
        isPatternSwitching
      );
      set({
        handAnalysis: analysis,
        tileRecommendations: analysis?.tileRecommendations ?? [],
        patternRankings: analysis?.recommendedPatterns ?? [],
        analysisError: null,
        isAnalyzing: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      console.error('Intelligence analysis failed:', error);
      set({
        analysisError: errorMessage,
        isAnalyzing: false,
      });
    }
  };

  return {
    handAnalysis: null,
    tileRecommendations: [],
    patternRankings: [],
    isAnalyzing: false,
    analysisError: null,
    cacheVersion: 0,
    // Top-level for backward compatibility
    analyzeHand: analyzeHandImpl,
    actions: {
      analyzeHand: analyzeHandImpl,
      setAnalysis: (analysis) =>
        set({
          handAnalysis: analysis,
          tileRecommendations: analysis?.tileRecommendations ?? [],
          patternRankings: analysis?.recommendedPatterns ?? [],
          analysisError: null,
          isAnalyzing: false,
        }),
      clearAnalysis: () =>
        set({
          handAnalysis: null,
          tileRecommendations: [],
          patternRankings: [],
          analysisError: null,
          isAnalyzing: false,
        }),
      setTileRecommendations: (recommendations) => set({ tileRecommendations: recommendations }),
      setPatternRankings: (rankings) => set({ patternRankings: rankings }),
      setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setError: (error) => set({ analysisError: error }),
      clearCache: () => set((state) => ({ cacheVersion: state.cacheVersion + 1 })),
      clearRecommendations: () => set({ tileRecommendations: [] }),
    },
  };
});
