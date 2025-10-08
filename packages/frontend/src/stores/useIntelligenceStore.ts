import { create } from 'zustand';
import type { PatternRanking } from '@shared-types/game-types';
import type {
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
  actions: {
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

export const useIntelligenceStore = create<IntelligenceState>((set) => ({
  handAnalysis: null,
  tileRecommendations: [],
  patternRankings: [],
  isAnalyzing: false,
  analysisError: null,
  cacheVersion: 0,
  actions: {
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
}));
