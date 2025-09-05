import { useEffect, useState } from 'react'
import { useIntelligenceStore } from '../stores/intelligence-store'
import type { GameState } from '../services/turn-intelligence-engine'

export const useGameIntelligence = (gameState: GameState | null, playerId: string | null) => {
  const [lastAnalysisUpdate, setLastAnalysisUpdate] = useState<number>(0)
  const intelligenceStore = useIntelligenceStore()
  
  // Trigger intelligence updates on game state changes
  useEffect(() => {
    if (!gameState || !playerId) return
    
    const currentTime = Date.now()
    const timeSinceLastUpdate = currentTime - lastAnalysisUpdate
    
    // Rate limit analysis updates (max every 2 seconds)
    if (timeSinceLastUpdate < 2000) return
    
    const updateIntelligence = async () => {
      try {
        // Parallel intelligence updates
        await Promise.all([
          intelligenceStore.analyzeTurnSituation(playerId, gameState),
          intelligenceStore.analyzeOpponents(gameState, playerId),
          intelligenceStore.updateDefensiveAnalysis(gameState, playerId)
        ])
        
        setLastAnalysisUpdate(currentTime)
      } catch (error) {
        console.error('Intelligence update failed:', error)
      }
    }
    
    updateIntelligence()
  }, [
    gameState?.turnNumber,
    gameState?.currentPlayer,
    gameState?.discardPile?.length,
    playerId,
    lastAnalysisUpdate,
    intelligenceStore
  ])
  
  // Return current intelligence state
  return {
    analysis: intelligenceStore.currentAnalysis,
    isAnalyzing: intelligenceStore.isAnalyzing,
    error: intelligenceStore.analysisError
  }
}