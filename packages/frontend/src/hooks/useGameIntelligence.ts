import { useEffect, useState } from 'react';
import { useIntelligenceStore } from '../stores';
import { runGameIntelligenceAnalysis } from '../services/intelligenceService';
import type { GameState } from '../features/intelligence-panel/services/turn-intelligence-engine';

export const useGameIntelligence = (gameState: GameState | null, playerId: string | null) => {
  const [lastAnalysisUpdate, setLastAnalysisUpdate] = useState<number>(0);
  const { handAnalysis, isAnalyzing, analysisError } = useIntelligenceStore((s) => ({
    handAnalysis: s.handAnalysis,
    isAnalyzing: s.isAnalyzing,
    analysisError: s.analysisError,
  }));

  // Trigger intelligence updates on game state changes
  useEffect(() => {
    if (!gameState || !playerId) return;

    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - lastAnalysisUpdate;

    // Rate limit analysis updates (max every 2 seconds)
    if (timeSinceLastUpdate < 2000) return;

    const updateIntelligence = async () => {
      try {
        await runGameIntelligenceAnalysis(gameState, playerId);
        setLastAnalysisUpdate(currentTime);
      } catch (error) {
        console.error('Intelligence update failed:', error);
      }
    };

    updateIntelligence();
  }, [gameState, playerId, lastAnalysisUpdate]);

  // Return current intelligence state
  return {
    analysis: handAnalysis,
    isAnalyzing: isAnalyzing,
    error: analysisError,
  };
};