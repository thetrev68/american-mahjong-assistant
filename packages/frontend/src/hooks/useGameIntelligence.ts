import { useEffect, useState } from 'react'
import { useIntelligenceStore } from '../stores/intelligence-store'
import type { GameState } from '../features/intelligence-panel/services/turn-intelligence-engine'

export const useGameIntelligence = (gameState: GameState | null, playerId: string | null) => {
  const [lastAnalysisUpdate, setLastAnalysisUpdate] = useState<number>(0)
  const intelligenceStore = useIntelligenceStore()
  
  // Extract stable functions
  const { analyzeTurnSituation, analyzeOpponents, updateDefensiveAnalysis } = intelligenceStore
  
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
          analyzeTurnSituation(playerId, gameState),
          analyzeOpponents(gameState, playerId),
          updateDefensiveAnalysis(gameState, playerId)
        ])
        
        setLastAnalysisUpdate(currentTime)
      } catch (error) {
        console.error('Intelligence update failed:', error)
      }
    }
    
    updateIntelligence()
  }, [
    gameState,
    playerId,
    lastAnalysisUpdate,
    analyzeTurnSituation,
    analyzeOpponents
  ])
  
  // Return current intelligence state
  return {
    analysis: intelligenceStore.currentAnalysis,
    isAnalyzing: intelligenceStore.isAnalyzing,
    error: intelligenceStore.analysisError
  }
}