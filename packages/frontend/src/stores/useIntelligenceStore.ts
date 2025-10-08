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
  actions: {
    setAnalysis: (analysis: HandAnalysis) => void;
  };
}

export const useIntelligenceStore = create<IntelligenceState>((set) => ({
  handAnalysis: null,
  tileRecommendations: [],
  patternRankings: [],
  isAnalyzing: false,
  analysisError: null,
  actions: {
    setAnalysis: (analysis) => set({ handAnalysis: analysis }),
  },
}));
