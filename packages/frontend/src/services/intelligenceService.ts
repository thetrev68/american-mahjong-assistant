import { useIntelligenceStore } from '../stores';
import { getTurnIntelligenceEngine } from '../features/intelligence-panel/services/turn-intelligence-engine';
import { getOpponentAnalysisEngine } from '../features/intelligence-panel/services/analysis-engines-lazy';
import type { GameState } from '../features/intelligence-panel/services/turn-intelligence-engine';

async function analyzeTurnSituation(playerId: string, gameState: GameState) {
  const turnIntelligenceEngine = getTurnIntelligenceEngine();
  const turnRecommendations = await turnIntelligenceEngine.analyzeCurrentTurn(gameState, playerId);
  useIntelligenceStore.setState((state) => ({
    handAnalysis: state.handAnalysis
      ? {
          ...state.handAnalysis,
          turnIntelligence: turnRecommendations,
          analysisVersion: '4C-turn-aware',
        }
      : null,
  }));
}

async function analyzeOpponents(gameState: GameState, excludePlayerId: string) {
  const opponentAnalysisEngine = await getOpponentAnalysisEngine();
  const opponentProfiles = opponentAnalysisEngine.analyzeAllOpponents(gameState, excludePlayerId);
  const dangerousTiles = opponentAnalysisEngine.identifyDangerousTilesForAll(gameState, excludePlayerId);
  useIntelligenceStore.setState((state) => ({
    handAnalysis: state.handAnalysis
      ? {
          ...state.handAnalysis,
          opponentAnalysis: opponentProfiles,
          dangerousTiles: dangerousTiles,
        }
      : null,
  }));
}

async function updateDefensiveAnalysis(gameState: GameState, playerId: string) {
  const turnIntelligenceEngine = getTurnIntelligenceEngine();
  const mockTurnRecommendations = await turnIntelligenceEngine.analyzeCurrentTurn(gameState, playerId);
  useIntelligenceStore.setState((state) => ({
    handAnalysis: state.handAnalysis
      ? {
          ...state.handAnalysis,
          defensiveAnalysis: mockTurnRecommendations.defensiveAnalysis,
          patternSwitchSuggestions: mockTurnRecommendations.patternSwitchSuggestions,
        }
      : null,
  }));
}

export async function runGameIntelligenceAnalysis(gameState: GameState, playerId: string) {
  useIntelligenceStore.setState({ isAnalyzing: true, analysisError: null });
  try {
    await Promise.all([
      analyzeTurnSituation(playerId, gameState),
      analyzeOpponents(gameState, playerId),
      updateDefensiveAnalysis(gameState, playerId),
    ]);
  } catch (error) {
    console.error('Intelligence update failed:', error);
    useIntelligenceStore.setState({ analysisError: error instanceof Error ? error.message : 'Analysis failed' });
  } finally {
    useIntelligenceStore.setState({ isAnalyzing: false });
  }
}
