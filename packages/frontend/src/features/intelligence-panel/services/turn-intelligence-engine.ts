// Turn Intelligence Engine
// Context-sensitive AI analysis for turn-aware strategic recommendations

import type { Tile, PlayerTile } from '../../../types/tile-types'
import type { NMJL2025Pattern } from 'shared-types'
import { AnalysisEngine } from '../../../lib/services/analysis-engine'

export interface GameState {
  currentPlayer: string | null
  turnNumber: number
  roundNumber: number
  playerHands: Record<string, PlayerTile[]>
  playerActions: Record<string, PlayerActionState>
  discardPile: Tile[]
  exposedTiles: Record<string, ExposedTileSet[]>
  wallCount: number
  actionHistory: GameAction[]
}

export interface PlayerActionState {
  hasDrawn: boolean
  hasDiscarded: boolean
  lastAction: string | null
  actionCount: number
}

export interface GameAction {
  playerId: string
  action: string
  tile?: Tile
  timestamp: Date
  isVisible: boolean
  turnNumber: number
}

export interface ExposedTileSet {
  type: 'pung' | 'kong' | 'quint' | 'sextet'
  tiles: Tile[]
  timestamp: Date
}

export interface TurnRecommendations {
  drawRecommendation: DrawRecommendation | null
  discardRecommendations: DiscardRecommendation[]
  callAnalysis: CallAnalysis | null
  defensiveAnalysis: DefensiveAnalysis
  patternSwitchSuggestions: PatternSwitchSuggestion[]
  confidence: number
  reasoning: string[]
}

export interface DrawRecommendation {
  shouldDraw: boolean
  reasoning: string
  confidence: number
  riskAssessment: string
}

export interface DiscardRecommendation {
  tile: PlayerTile
  riskLevel: 'safe' | 'moderate' | 'dangerous'
  patternProgress: PatternProgressScore
  reasoning: string
  recommended: boolean
  confidence: number
}

export interface PatternProgressScore {
  score: number
  tilesCompleted: number
  totalTiles: number
  description: string
  improvements: string[]
}

export interface CallAnalysis {
  shouldCall: boolean
  callType: 'pung' | 'kong'
  tiles: Tile[]
  netValue: number
  reasoning: string[]
  confidence: number
}

export interface DefensiveAnalysis {
  threatLevel: 'low' | 'medium' | 'high'
  dangerousTiles: Tile[]
  safeTiles: Tile[]
  recommendations: string[]
}

export interface PatternSwitchSuggestion {
  fromPattern: NMJL2025Pattern
  toPattern: NMJL2025Pattern
  improvement: number
  reasoning: string
  confidence: number
  requiredTiles: Tile[]
}

export class TurnIntelligenceEngine {

  async analyzeCurrentTurn(gameState: GameState, playerId: string): Promise<TurnRecommendations> {
    const playerHand = gameState.playerHands[playerId] || []
    const isPlayerTurn = gameState.currentPlayer === playerId
    const availableActions = this.getAvailableActions(gameState, playerId)
    const playerActions = gameState.playerActions[playerId]

    const recommendations: TurnRecommendations = {
      drawRecommendation: null,
      discardRecommendations: [],
      callAnalysis: null,
      defensiveAnalysis: await this.analyzeDefensivePlays(gameState),
      patternSwitchSuggestions: await this.analyzePatternSwitches(playerHand, gameState),
      confidence: 0,
      reasoning: []
    }

    // Draw recommendations (if player can draw)
    if (isPlayerTurn && availableActions.includes('draw')) {
      recommendations.drawRecommendation = await this.analyzeDrawOptions(gameState, playerId)
      recommendations.reasoning.push('Analyzed draw options for current turn')
    }

    // Discard recommendations (if player has drawn)
    if (playerActions?.hasDrawn && playerHand.length > 13) {
      recommendations.discardRecommendations = await this.analyzeDiscardOptions(playerHand, gameState)
      recommendations.reasoning.push('Analyzed discard options after drawing')
    }

    // Call opportunity analysis (if not player's turn)
    if (!isPlayerTurn && this.hasCallOpportunity(gameState)) {
      recommendations.callAnalysis = await this.analyzeCallValue(gameState, playerId)
      recommendations.reasoning.push('Analyzed call opportunity from current discard')
    }

    // Calculate overall confidence
    recommendations.confidence = this.calculateOverallConfidence(recommendations)

    return recommendations
  }

  private getAvailableActions(gameState: GameState, playerId: string): string[] {
    const actions: string[] = []
    const isPlayerTurn = gameState.currentPlayer === playerId
    const playerActions = gameState.playerActions[playerId]

    if (isPlayerTurn) {
      if (!playerActions?.hasDrawn && gameState.wallCount > 0) {
        actions.push('draw')
      }
      if (playerActions?.hasDrawn) {
        actions.push('discard', 'mahjong')
      }
      actions.push('pass-out')
    } else {
      // Check for call opportunities from last discard
      if (gameState.discardPile.length > 0 && this.hasCallOpportunity(gameState)) {
        actions.push('call')
      }
    }

    actions.push('joker-swap') // Always potentially available
    return actions
  }

  private async analyzeDrawOptions(gameState: GameState, playerId: string): Promise<DrawRecommendation> {
    const playerHand = gameState.playerHands[playerId] || []
    const wallCount = gameState.wallCount

    // Basic draw recommendation logic
    const shouldDraw = wallCount > 20 // Don't draw if wall is too low
    let reasoning = 'Standard turn draw recommended'
    let confidence = 0.8
    let riskAssessment = 'low'

    if (wallCount <= 20) {
      reasoning = 'Wall running low - consider conservative play'
      confidence = 0.6
      riskAssessment = 'moderate'
    }

    if (wallCount <= 10) {
      reasoning = 'Wall critically low - high risk to continue'
      confidence = 0.4
      riskAssessment = 'high'
    }

    if (playerHand.length >= 13) {
      // Check if close to winning
      const currentAnalysis = await AnalysisEngine.analyzeHand(
        playerHand,
        []
      )

      if (currentAnalysis.recommendedPatterns.length > 0) {
        const bestPattern = currentAnalysis.recommendedPatterns[0]
        if (bestPattern.completionPercentage > 80) {
          reasoning = 'Close to winning - aggressive draw recommended'
          confidence = 0.9
          riskAssessment = 'low'
        }
      }
    }

    return {
      shouldDraw,
      reasoning,
      confidence,
      riskAssessment
    }
  }

  private async analyzeDiscardOptions(hand: PlayerTile[], gameState: GameState): Promise<DiscardRecommendation[]> {
    const recommendations: DiscardRecommendation[] = []

    for (const tile of hand) {
      const riskLevel = await this.calculateDiscardRisk(tile, gameState)
      const patternProgress = await this.calculatePatternProgress(
        hand.filter(t => t.instanceId !== tile.instanceId)
      )

      recommendations.push({
        tile,
        riskLevel,
        patternProgress,
        reasoning: `${riskLevel} discard - ${patternProgress.description}`,
        recommended: riskLevel === 'safe' && patternProgress.score > 0.6,
        confidence: this.calculateDiscardConfidence(riskLevel, patternProgress)
      })
    }

    return recommendations.sort((a, b) => b.patternProgress.score - a.patternProgress.score)
  }

  private async calculateDiscardRisk(tile: PlayerTile, gameState: GameState): Promise<'safe' | 'moderate' | 'dangerous'> {
    // Basic risk assessment based on game state
    const discardPile = gameState.discardPile
    const roundNumber = gameState.roundNumber

    // Check if tile already discarded (safer)
    const alreadyDiscarded = discardPile.some(d => d.id === tile.id)
    if (alreadyDiscarded) {
      return 'safe'
    }

    // Early rounds are generally safer
    if (roundNumber <= 3) {
      return 'safe'
    }

    // Late rounds with honor tiles can be dangerous
    if (roundNumber >= 8 && (tile.suit === 'winds' || tile.suit === 'dragons')) {
      return 'dangerous'
    }

    return 'moderate'
  }

  private async calculatePatternProgress(hand: PlayerTile[]): Promise<PatternProgressScore> {
    if (hand.length === 0) {
      return {
        score: 0,
        tilesCompleted: 0,
        totalTiles: 14,
        description: 'No tiles remaining',
        improvements: []
      }
    }

    // Use existing analysis engine for pattern progress
    const analysis = await AnalysisEngine.analyzeHand(hand, [])
    
    if (analysis.recommendedPatterns.length === 0) {
      return {
        score: 0,
        tilesCompleted: 0,
        totalTiles: 14,
        description: 'No viable patterns found',
        improvements: ['Consider pattern switching']
      }
    }

    const bestPattern = analysis.recommendedPatterns[0]
    return {
      score: bestPattern.completionPercentage / 100,
      tilesCompleted: Math.floor((bestPattern.completionPercentage / 100) * 14),
      totalTiles: 14,
      description: `${bestPattern.completionPercentage.toFixed(1)}% toward ${bestPattern.pattern.displayName}`,
      improvements: []
    }
  }

  private calculateDiscardConfidence(riskLevel: string, patternProgress: PatternProgressScore): number {
    let confidence = 0.5

    // Higher confidence for safer discards
    if (riskLevel === 'safe') confidence += 0.3
    else if (riskLevel === 'dangerous') confidence -= 0.3

    // Higher confidence for good pattern progress
    confidence += patternProgress.score * 0.4

    return Math.max(0.1, Math.min(0.9, confidence))
  }

  private hasCallOpportunity(gameState: GameState): boolean {
    // Check if there's a recent discard that could be called
    return gameState.discardPile.length > 0
  }

  private async analyzeCallValue(gameState: GameState, playerId: string): Promise<CallAnalysis | null> {
    const playerHand = gameState.playerHands[playerId] || []
    const lastDiscard = gameState.discardPile[gameState.discardPile.length - 1]

    if (!lastDiscard) {
      return null
    }

    // Check if player can make a call with this tile
    const matchingTiles = playerHand.filter(t => t.id === lastDiscard.id)
    
    if (matchingTiles.length >= 2) {
      // Can make pung
      const handAfterCall = playerHand.filter(t => t.id !== lastDiscard.id)
      handAfterCall.splice(0, 2) // Remove two matching tiles

      const progressBefore = await this.calculatePatternProgress(playerHand)
      const progressAfter = await this.calculatePatternProgress(handAfterCall)

      const netValue = progressAfter.score - progressBefore.score
      const shouldCall = netValue > 0.1

      return {
        shouldCall,
        callType: 'pung',
        tiles: [lastDiscard, ...matchingTiles.slice(0, 2)],
        netValue,
        reasoning: [
          `Pattern progress change: ${(netValue * 100).toFixed(1)}%`,
          shouldCall ? 'Call improves hand position' : 'Call does not improve position significantly'
        ],
        confidence: Math.abs(netValue) > 0.2 ? 0.8 : 0.5
      }
    }

    return null
  }

  private async analyzeDefensivePlays(gameState: GameState): Promise<DefensiveAnalysis> {
    const roundNumber = gameState.roundNumber
    const discardPile = gameState.discardPile
    
    // Basic defensive analysis
    let threatLevel: 'low' | 'medium' | 'high' = 'low'
    if (roundNumber >= 6) threatLevel = 'medium'
    if (roundNumber >= 10) threatLevel = 'high'

    const dangerousTiles: Tile[] = []
    const safeTiles: Tile[] = []

    // Identify safe tiles (already discarded)
    const discardedTileIds = new Set(discardPile.map(t => t.id))
    
    // All unique tiles that haven't been discarded are potentially dangerous
    // This is a simplified implementation
    const allTileIds = ['1D', '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D',
                       '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B',
                       '1C', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C',
                       'east', 'south', 'west', 'north', 'red', 'green', 'white']

    for (const tileId of allTileIds) {
      if (discardedTileIds.has(tileId)) {
        safeTiles.push({ id: tileId, suit: 'dots', value: '1', displayName: tileId } as Tile)
      } else if (roundNumber >= 8) {
        dangerousTiles.push({ id: tileId, suit: 'dots', value: '1', displayName: tileId } as Tile)
      }
    }

    return {
      threatLevel,
      dangerousTiles: dangerousTiles.slice(0, 10), // Limit to top 10
      safeTiles: safeTiles.slice(0, 10),
      recommendations: [
        `Game is in ${threatLevel} threat phase`,
        roundNumber >= 8 ? 'Consider defensive discards' : 'Focus on hand development',
        `${safeTiles.length} safe tiles available for discard`
      ]
    }
  }

  private async analyzePatternSwitches(hand: PlayerTile[], gameState: GameState): Promise<PatternSwitchSuggestion[]> {
    // This would integrate with the existing pattern analysis system
    // For now, return basic suggestions
    const suggestions: PatternSwitchSuggestion[] = []
    
    if (hand.length >= 10 && gameState.roundNumber >= 5) {
      // Suggest considering pattern switches in mid-game
      suggestions.push({
        fromPattern: {
          Year: 2025,
          Section: 'SWITCH',
          Line: 1,
          'Pattern ID': 1,
          Hands_Key: 'current',
          Hand_Pattern: 'CURRENT TARGET',
          Hand_Description: 'Current target',
          Hand_Points: 25,
          Hand_Conceiled: false,
          Hand_Difficulty: 'medium' as const,
          Hand_Notes: null,
          Groups: []
        } as NMJL2025Pattern,
        toPattern: {
          Year: 2025,
          Section: 'SWITCH',
          Line: 2,
          'Pattern ID': 2,
          Hands_Key: 'alternative',
          Hand_Pattern: 'ALTERNATIVE PATTERN',
          Hand_Description: 'Alternative pattern',
          Hand_Points: 25,
          Hand_Conceiled: false,
          Hand_Difficulty: 'medium' as const,
          Hand_Notes: null,
          Groups: []
        } as NMJL2025Pattern,
        improvement: 0.15,
        reasoning: 'Consider alternative patterns in mid-game',
        confidence: 0.6,
        requiredTiles: []
      })
    }

    return suggestions
  }

  private calculateOverallConfidence(recommendations: TurnRecommendations): number {
    let totalConfidence = 0
    let count = 0

    if (recommendations.drawRecommendation) {
      totalConfidence += recommendations.drawRecommendation.confidence
      count++
    }

    if (recommendations.discardRecommendations.length > 0) {
      totalConfidence += recommendations.discardRecommendations[0].confidence
      count++
    }

    if (recommendations.callAnalysis) {
      totalConfidence += recommendations.callAnalysis.confidence
      count++
    }

    return count > 0 ? totalConfidence / count : 0.5
  }
}

// Singleton instance
let turnIntelligenceEngine: TurnIntelligenceEngine | null = null

export const getTurnIntelligenceEngine = (): TurnIntelligenceEngine => {
  if (!turnIntelligenceEngine) {
    turnIntelligenceEngine = new TurnIntelligenceEngine()
  }
  return turnIntelligenceEngine
}