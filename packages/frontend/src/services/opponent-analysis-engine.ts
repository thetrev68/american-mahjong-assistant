// Opponent Analysis Engine
// Hand reading and opponent behavior analysis based on visible actions

import type { Tile } from '../types/tile-types'
import type { NMJL2025Pattern } from 'shared-types'
import type { GameState, GameAction, ExposedTileSet } from './turn-intelligence-engine'

export interface OpponentProfile {
  playerId: string
  discardPatterns: DiscardPatternAnalysis
  callBehavior: CallBehaviorAnalysis
  suspectedPatterns: PatternSuspicion[]
  threatLevel: ThreatLevel
  safeTiles: Tile[]
  dangerousTiles: Tile[]
  handReadingConfidence: number
}

export interface DiscardPatternAnalysis {
  preferredSuits: string[]
  avoidedSuits: string[]
  discardTiming: 'early' | 'middle' | 'late'
  riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  consistencyScore: number
}

export interface CallBehaviorAnalysis {
  callFrequency: number // 0-1 scale
  preferredCallTypes: ('pung' | 'kong')[]
  callTiming: 'early' | 'late' | 'opportunistic'
  passedOpportunities: number
  aggressiveness: number // 0-1 scale
}

export interface PatternSuspicion {
  pattern: NMJL2025Pattern
  confidence: number // 0-1 scale
  evidence: string[]
  tilesNeeded: Tile[]
  completionEstimate: number // 0-1 scale
}

export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical'

export interface DangerousTileAnalysis {
  tile: Tile
  dangerLevel: number // 0-1 scale
  reasons: string[]
  shouldAvoidDiscard: boolean
  affectedOpponents: string[]
}

export class OpponentAnalysisEngine {
  private readonly TILE_SUITS = ['dots', 'bams', 'cracks', 'winds', 'dragons', 'flowers']
  private readonly ALL_TILE_IDS = [
    // Number tiles
    '1D', '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D',
    '1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B', 
    '1C', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C',
    // Honor tiles
    'east', 'south', 'west', 'north', 'red', 'green', 'white',
    // Special tiles
    'f1', 'f2', 'f3', 'f4', 'joker'
  ]

  analyzeOpponent(gameState: GameState, targetPlayerId: string): OpponentProfile {
    const visibleActions = this.getVisibleActions(gameState, targetPlayerId)
    const exposedTiles = gameState.exposedTiles[targetPlayerId] || []

    return {
      playerId: targetPlayerId,
      discardPatterns: this.analyzeDiscardPatterns(visibleActions),
      callBehavior: this.analyzeCallBehavior(visibleActions),
      suspectedPatterns: this.inferPatternTargets(visibleActions, exposedTiles),
      threatLevel: this.calculateThreatLevel(visibleActions, gameState),
      safeTiles: this.identifySafeTiles(visibleActions),
      dangerousTiles: this.identifyDangerousTiles(visibleActions, exposedTiles),
      handReadingConfidence: this.calculateHandReadingConfidence(visibleActions, exposedTiles)
    }
  }

  analyzeAllOpponents(gameState: GameState, excludePlayerId: string): OpponentProfile[] {
    const opponents: OpponentProfile[] = []
    
    for (const playerId in gameState.playerHands) {
      if (playerId !== excludePlayerId) {
        opponents.push(this.analyzeOpponent(gameState, playerId))
      }
    }

    return opponents.sort((a, b) => b.handReadingConfidence - a.handReadingConfidence)
  }

  identifyDangerousTilesForAll(gameState: GameState, forPlayerId: string): DangerousTileAnalysis[] {
    const allOpponents = this.analyzeAllOpponents(gameState, forPlayerId)
    const dangerAnalysis: DangerousTileAnalysis[] = []
    
    for (const tileId of this.ALL_TILE_IDS) {
      const tile = this.createTileFromId(tileId)
      let maxDanger = 0
      const reasons: string[] = []
      const affectedOpponents: string[] = []

      for (const opponent of allOpponents) {
        const danger = this.calculateTileDanger(tile, opponent)
        if (danger > 0.3) {
          maxDanger = Math.max(maxDanger, danger)
          affectedOpponents.push(opponent.playerId)
          
          if (opponent.suspectedPatterns.length > 0) {
            reasons.push(`May complete ${opponent.suspectedPatterns[0].pattern.Hand_Description} for ${opponent.playerId}`)
          }
        }
      }

      if (maxDanger > 0) {
        dangerAnalysis.push({
          tile,
          dangerLevel: maxDanger,
          reasons,
          shouldAvoidDiscard: maxDanger > 0.7,
          affectedOpponents
        })
      }
    }
    
    return dangerAnalysis.sort((a, b) => b.dangerLevel - a.dangerLevel)
  }

  private getVisibleActions(gameState: GameState, playerId: string): GameAction[] {
    return gameState.actionHistory.filter(action => 
      action.playerId === playerId && action.isVisible
    )
  }

  private analyzeDiscardPatterns(visibleActions: GameAction[]): DiscardPatternAnalysis {
    const discardActions = visibleActions.filter(action => action.action === 'discard')
    
    if (discardActions.length === 0) {
      return {
        preferredSuits: [],
        avoidedSuits: [],
        discardTiming: 'early',
        riskTolerance: 'moderate',
        consistencyScore: 0
      }
    }

    // Analyze suit preferences
    const suitCounts: Record<string, number> = {}
    for (const action of discardActions) {
      if (action.tile) {
        suitCounts[action.tile.suit] = (suitCounts[action.tile.suit] || 0) + 1
      }
    }

    const totalDiscards = discardActions.length
    const preferredSuits = Object.entries(suitCounts)
      .filter(([, count]) => count / totalDiscards > 0.3)
      .map(([suit]) => suit)

    const avoidedSuits = this.TILE_SUITS.filter(suit => 
      !suitCounts[suit] || suitCounts[suit] / totalDiscards < 0.1
    )

    // Analyze timing patterns
    const earlyDiscards = discardActions.filter(a => a.turnNumber <= 5).length
    const lateDiscards = discardActions.filter(a => a.turnNumber > 10).length
    let discardTiming: 'early' | 'middle' | 'late' = 'middle'
    
    if (earlyDiscards / totalDiscards > 0.6) discardTiming = 'early'
    else if (lateDiscards / totalDiscards > 0.4) discardTiming = 'late'

    // Analyze risk tolerance based on honor tile discards
    const honorDiscards = discardActions.filter(a => 
      a.tile && (a.tile.suit === 'winds' || a.tile.suit === 'dragons')
    ).length
    const honorRatio = honorDiscards / totalDiscards
    
    let riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
    if (honorRatio < 0.2) riskTolerance = 'conservative'
    else if (honorRatio > 0.5) riskTolerance = 'aggressive'

    // Calculate consistency score
    const consistencyScore = this.calculateConsistencyScore(discardActions)

    return {
      preferredSuits,
      avoidedSuits,
      discardTiming,
      riskTolerance,
      consistencyScore
    }
  }

  private analyzeCallBehavior(visibleActions: GameAction[]): CallBehaviorAnalysis {
    const callActions = visibleActions.filter(action => action.action === 'call')
    const totalActions = visibleActions.length

    const callFrequency = totalActions > 0 ? callActions.length / totalActions : 0

    // Analyze call types
    const callTypeCounts: Record<string, number> = {}
    for (const action of callActions) {
      // This would need to be enhanced to track call type from action data
      const callType = action.action === 'kong' ? 'kong' : 'pung' // Default call type mapping
      callTypeCounts[callType] = (callTypeCounts[callType] || 0) + 1
    }

    const preferredCallTypes = Object.entries(callTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([type]) => type as 'pung' | 'kong')

    // Analyze timing
    const earlyCalls = callActions.filter(a => a.turnNumber <= 6).length
    const lateCalls = callActions.filter(a => a.turnNumber > 12).length
    let callTiming: 'early' | 'late' | 'opportunistic' = 'opportunistic'
    
    if (callActions.length > 0) {
      if (earlyCalls / callActions.length > 0.6) callTiming = 'early'
      else if (lateCalls / callActions.length > 0.4) callTiming = 'late'
    }

    // Estimate passed opportunities (simplified)
    const passedOpportunities = Math.max(0, Math.floor(totalActions * 0.1 - callActions.length))

    const aggressiveness = Math.min(1, callFrequency * 2 + (preferredCallTypes.includes('kong') ? 0.2 : 0))

    return {
      callFrequency,
      preferredCallTypes,
      callTiming,
      passedOpportunities,
      aggressiveness
    }
  }

  private inferPatternTargets(visibleActions: GameAction[], exposedTiles: ExposedTileSet[]): PatternSuspicion[] {
    const suspicions: PatternSuspicion[] = []

    // Analyze exposed tiles for pattern clues
    if (exposedTiles.length > 0) {
      // This is a simplified implementation
      // In practice, this would use sophisticated pattern matching
      suspicions.push({
        pattern: {
          Year: 2025,
          Section: 'SUSPICIOUS',
          Line: 1,
          'Pattern ID': 1,
          Hands_Key: 'SUSPECTED-1',
          Hand_Pattern: 'SUSPECTED PATTERN',
          Hand_Description: 'Suspected pattern based on exposed tiles',
          Hand_Points: 25,
          Hand_Conceiled: false,
          Hand_Difficulty: 'medium' as const,
          Hand_Notes: null,
          Groups: []
        } as NMJL2025Pattern,
        confidence: 0.6,
        evidence: [`${exposedTiles.length} exposed sets suggest specific pattern targeting`],
        tilesNeeded: [],
        completionEstimate: exposedTiles.length * 0.2
      })
    }

    // Analyze discard patterns for clues
    const discardActions = visibleActions.filter(action => action.action === 'discard')
    if (discardActions.length > 5) {
      const suitAvoidance = this.analyzeSuitAvoidance(discardActions)
      if (suitAvoidance.length > 0) {
        suspicions.push({
          pattern: {
            Year: 2025,
            Section: 'SUSPICIOUS',
            Line: 2,
            'Pattern ID': 2,
            Hands_Key: 'SUSPECTED-2',
            Hand_Pattern: 'SUIT AVOIDANCE PATTERN',
            Hand_Description: `Pattern avoiding ${suitAvoidance.join(', ')} suits`,
            Hand_Points: 30,
            Hand_Conceiled: false,
            Hand_Difficulty: 'medium' as const,
            Hand_Notes: null,
            Groups: []
          } as NMJL2025Pattern,
          confidence: 0.4,
          evidence: [`Consistently avoiding ${suitAvoidance.join(', ')} tiles`],
          tilesNeeded: [],
          completionEstimate: Math.min(0.8, discardActions.length * 0.05)
        })
      }
    }

    return suspicions.sort((a, b) => b.confidence - a.confidence)
  }

  private calculateThreatLevel(visibleActions: GameAction[], gameState: GameState): ThreatLevel {
    const callActions = visibleActions.filter(a => a.action === 'call')
    const turnNumber = gameState.turnNumber

    // Early game - low threat
    if (turnNumber <= 5) return 'low'

    // Mid game assessment
    if (turnNumber <= 10) {
      return callActions.length > 2 ? 'medium' : 'low'
    }

    // Late game assessment
    if (turnNumber <= 15) {
      if (callActions.length > 3) return 'high'
      if (callActions.length > 1) return 'medium'
      return 'low'
    }

    // End game - high threat by default
    return callActions.length > 2 ? 'critical' : 'high'
  }

  private identifySafeTiles(visibleActions: GameAction[]): Tile[] {
    const safeTiles: Tile[] = []
    const discardActions = visibleActions.filter(action => action.action === 'discard')

    // Tiles that opponent has discarded are generally safer to discard
    const discardedTileIds = new Set()
    for (const action of discardActions) {
      if (action.tile) {
        discardedTileIds.add(action.tile.id)
      }
    }

    // Convert to tile objects
    for (const tileId of discardedTileIds) {
      safeTiles.push(this.createTileFromId(tileId as string))
    }

    return safeTiles
  }

  private identifyDangerousTiles(_visibleActions: GameAction[], exposedTiles: ExposedTileSet[]): Tile[] {
    const dangerousTiles: Tile[] = []

    // Tiles related to exposed sets might be dangerous
    for (const exposedSet of exposedTiles) {
      for (const tile of exposedSet.tiles) {
        // Related tiles (same suit, adjacent numbers) could be dangerous
        if (tile.suit === 'dots' || tile.suit === 'bams' || tile.suit === 'cracks') {
          const num = parseInt(tile.value)
          if (!isNaN(num)) {
            // Adjacent numbers might be needed
            if (num > 1) {
              dangerousTiles.push(this.createTileFromId(`${num-1}${tile.suit[0].toUpperCase()}`))
            }
            if (num < 9) {
              dangerousTiles.push(this.createTileFromId(`${num+1}${tile.suit[0].toUpperCase()}`))
            }
          }
        }
      }
    }

    return dangerousTiles.slice(0, 8) // Limit to most relevant
  }

  private calculateTileDanger(tile: Tile, opponent: OpponentProfile): number {
    let danger = 0

    // Base danger from suspected patterns
    for (const suspicion of opponent.suspectedPatterns) {
      if (suspicion.tilesNeeded.some(t => t.id === tile.id)) {
        danger += suspicion.confidence * suspicion.completionEstimate
      }
    }

    // Increase danger based on threat level
    switch (opponent.threatLevel) {
      case 'critical': danger += 0.3; break
      case 'high': danger += 0.2; break
      case 'medium': danger += 0.1; break
      case 'low': danger += 0.05; break
    }

    // Reduce danger if opponent has discarded this tile before
    if (opponent.safeTiles.some(t => t.id === tile.id)) {
      danger *= 0.3
    }

    return Math.min(1, danger)
  }

  private calculateHandReadingConfidence(visibleActions: GameAction[], exposedTiles: ExposedTileSet[]): number {
    let confidence = 0.2 // Base confidence

    // More visible actions = higher confidence
    confidence += Math.min(0.4, visibleActions.length * 0.02)

    // Exposed tiles provide strong evidence
    confidence += exposedTiles.length * 0.15

    // Call actions provide behavioral data
    const callActions = visibleActions.filter(a => a.action === 'call')
    confidence += callActions.length * 0.1

    return Math.min(0.9, confidence)
  }

  private calculateConsistencyScore(discardActions: GameAction[]): number {
    if (discardActions.length < 3) return 0

    // Analyze consistency in suit preferences
    const suitCounts: Record<string, number> = {}
    for (const action of discardActions) {
      if (action.tile) {
        suitCounts[action.tile.suit] = (suitCounts[action.tile.suit] || 0) + 1
      }
    }

    const variance = this.calculateVariance(Object.values(suitCounts))
    return Math.max(0, 1 - variance / discardActions.length)
  }

  private analyzeSuitAvoidance(discardActions: GameAction[]): string[] {
    const suitCounts: Record<string, number> = {}
    for (const action of discardActions) {
      if (action.tile) {
        suitCounts[action.tile.suit] = (suitCounts[action.tile.suit] || 0) + 1
      }
    }

    const totalDiscards = discardActions.length
    const avoidedSuits: string[] = []

    for (const suit of this.TILE_SUITS) {
      const count = suitCounts[suit] || 0
      if (count / totalDiscards < 0.15 && totalDiscards > 5) {
        avoidedSuits.push(suit)
      }
    }

    return avoidedSuits
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squareDiffs = values.map(value => Math.pow(value - mean, 2))
    return squareDiffs.reduce((a, b) => a + b, 0) / values.length
  }

  private createTileFromId(tileId: string): Tile {
    // Basic tile creation - this should be enhanced to use proper tile definitions
    return {
      id: tileId,
      suit: 'dots', // Simplified
      value: '1',   // Simplified  
      displayName: tileId
    } as Tile
  }
}

// Singleton instance
let opponentAnalysisEngine: OpponentAnalysisEngine | null = null

export const getOpponentAnalysisEngine = (): OpponentAnalysisEngine => {
  if (!opponentAnalysisEngine) {
    opponentAnalysisEngine = new OpponentAnalysisEngine()
  }
  return opponentAnalysisEngine
}