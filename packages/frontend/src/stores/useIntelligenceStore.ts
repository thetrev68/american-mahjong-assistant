import { create } from 'zustand';
import { HandAnalysis, TileRecommendation, PatternRanking } from '@shared-types/game-types';

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
