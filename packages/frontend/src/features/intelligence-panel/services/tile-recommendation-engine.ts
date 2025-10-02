// Engine 3: Tile Recommendation Engine
// Generates keep/pass/discard recommendations with opponent analysis
// Provides contextual actions and danger warnings

import type { RankedPatternResults } from './pattern-ranking-engine'
import type { PatternAnalysisFacts, TileContribution } from './pattern-analysis-engine'

export interface TileAction {
  tileId: string
  primaryAction: 'keep' | 'pass' | 'discard' | 'neutral'
  confidence: number
  priority: number // 1-10 scale
  reasoning: string
  
  // Contextual actions for different game phases
  contextualActions: {
    charleston: 'keep' | 'pass' | 'neutral'
    gameplay: 'keep' | 'discard' | 'neutral'
    exposition: 'expose' | 'keep' | 'never'
  }
  
  // Multi-pattern value
  patternsHelped: string[]
  multiPatternValue: number
  
  // Danger warnings (null if no dangers)
  dangers: DangerWarning[] | null
}

export interface DangerWarning {
  type: 'pattern_destruction' | 'opponent_feeding' | 'wall_depletion' | 'strategic_error'
  severity: 'low' | 'medium' | 'high'
  message: string
  impact: string
}

export interface OpponentAnalysis {
  playerId: string
  likelyNeeds: {
    tileId: string
    probability: number
    reasoning: string[]
  }[]
  exposedPatterns: string[]
  safeDiscards: string[]
  riskyDiscards: string[]
  patternClues: {
    pattern: string
    confidence: number
    evidence: string[]
  }[]
}

export interface TileRecommendationResults {
  tileActions: TileAction[]
  keepTiles: TileAction[]
  passTiles: TileAction[]
  discardTiles: TileAction[]
  
  optimalStrategy: {
    primaryPattern: string
    backupPattern: string | null
    pivotCondition: string | null
    expectedCompletion: number
  }
  
  opponentAnalysis: OpponentAnalysis[]
  
  strategicAdvice: string[]
  emergencyActions: TileAction[] // High-priority immediate actions
}

export class TileRecommendationEngine {
  /**
   * Generate comprehensive tile recommendations
   */
  static generateRecommendations(
    playerTiles: string[],
    patternRankings: RankedPatternResults,
    gameContext: {
      phase: 'charleston' | 'gameplay'
      discardPile: string[]
      exposedTiles: { [playerId: string]: string[] }
      playerHands?: { [playerId: string]: number } // hand sizes
      wallTilesRemaining: number
    },
    analysisFacts?: PatternAnalysisFacts[] // Engine 1 pattern analysis facts with actual tile matching data
  ): TileRecommendationResults {
    
    try {
    
    // Validate Engine 1 analysis facts
    if (!analysisFacts || !Array.isArray(analysisFacts)) {
      throw new Error('Engine 3 requires valid Engine 1 analysis facts')
    }
    
    if (analysisFacts.length === 0) {
      throw new Error('Engine 1 provided no analysis facts')
    }
    
    // Analyze opponents first (informs tile safety)
    const opponentAnalysis = this.analyzeOpponents(
      gameContext.exposedTiles,
      gameContext.discardPile
    )
    
    // Generate tile actions for each tile in hand
    const tileActions: TileAction[] = []
    
    for (const tileId of new Set(playerTiles)) {
      const action = this.generateTileAction(
        tileId,
        playerTiles,
        patternRankings,
        opponentAnalysis,
        gameContext,
        analysisFacts
      )
      tileActions.push(action)
    }
    
    // Sort by tile position (same as hand sorting), then by priority
    const sortedTileActions = this.sortTileActions(tileActions)
    
    // Categorize actions (maintaining sort order)
    const keepTiles = sortedTileActions.filter(a => a.primaryAction === 'keep')
    let passTiles = sortedTileActions.filter(a => a.primaryAction === 'pass')
    let discardTiles = sortedTileActions.filter(a => a.primaryAction === 'discard')
    
    // Ensure minimum recommendations based on game phase
    if (gameContext.phase === 'charleston') {
      // Charleston needs minimum 3 pass recommendations
      if (passTiles.length < 3) {
        const needMore = 3 - passTiles.length
        const candidates = tileActions
          .filter(a => a.primaryAction !== 'pass')
          .sort((a, b) => a.priority - b.priority) // lowest priority first for passing
          .slice(0, needMore)
        
        candidates.forEach(action => {
          action.primaryAction = 'pass'
          action.reasoning = `${action.reasoning} (Auto-selected for Charleston minimum)`
        })
        
        passTiles = tileActions.filter(a => a.primaryAction === 'pass')
      }
    } else {
      // Gameplay needs minimum 1 discard recommendation
      if (discardTiles.length < 1) {
        const candidates = tileActions
          .filter(a => a.primaryAction !== 'discard')
          .sort((a, b) => a.priority - b.priority) // lowest priority first for discarding
          .slice(0, 1)
        
        candidates.forEach(action => {
          action.primaryAction = 'discard'
          action.reasoning = `${action.reasoning} (Auto-selected for gameplay minimum)`
        })
        
        discardTiles = tileActions.filter(a => a.primaryAction === 'discard')
      }
    }
    
    // Generate optimal strategy
    const optimalStrategy = this.generateOptimalStrategy(patternRankings, tileActions)
    
    // Generate strategic advice
    const strategicAdvice = this.generateStrategicAdvice(patternRankings, tileActions, gameContext)
    
    // Identify emergency actions
    const emergencyActions = tileActions.filter(a => 
      a.dangers && a.dangers.some(d => d.severity === 'high')
    )
    
    return {
      tileActions: sortedTileActions,
      keepTiles,
      passTiles,
      discardTiles,
      optimalStrategy,
      opponentAnalysis,
      strategicAdvice,
      emergencyActions
    }
    
    } catch (error) {
      // Keep this error - it indicates actual Engine 3 failures
      console.error('🚨 ENGINE 3 CRITICAL ERROR: generateRecommendations failed:', error)
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack)
      }
      
      // Return safe fallback recommendations
      return {
        tileActions: [],
        keepTiles: [],
        passTiles: [],
        discardTiles: [],
        optimalStrategy: {
          primaryPattern: 'analysis_failed',
          backupPattern: null,
          pivotCondition: null,
          expectedCompletion: 0
        },
        opponentAnalysis: [],
        strategicAdvice: ['Engine 3 analysis failed - manual review recommended'],
        emergencyActions: []
      }
    }
  }

  /**
   * Generate action recommendation for a specific tile
   */
  private static generateTileAction(
    tileId: string,
    playerTiles: string[],
    patternRankings: RankedPatternResults,
    opponentAnalysis: OpponentAnalysis[],
    gameContext: {
      phase: 'charleston' | 'gameplay'
      discardPile: string[]
      exposedTiles: { [playerId: string]: string[] }
      playerHands?: { [playerId: string]: number }
      wallTilesRemaining: number
    },
    analysisFacts?: unknown[]
  ): TileAction {
    
    try {
      const tileCount = playerTiles.filter(t => t === tileId).length
      
      // Debug if analysisFacts are being passed
      
      // Get actual tile contribution data from Engine 1 facts
      const tileContributions = this.analyzeTileContributions(tileId, analysisFacts)
    
    
    // Determine base action
    let primaryAction: TileAction['primaryAction'] = 'neutral'
    let confidence = 50
    let priority = 5
    let reasoning = 'Neutral strategic value'
    
    // Realistic recommendations based on game context and tile value
    if (tileId === 'joker') {
      primaryAction = 'keep'
      confidence = 95
      priority = 10
      reasoning = 'Jokers are always valuable for pattern completion'
    } else if (tileCount >= 3) {
      // Already have 3+ copies - likely complete pung
      primaryAction = 'keep'
      confidence = 95
      priority = 9
      reasoning = `Complete set with ${tileCount} copies`
    } else if (tileCount === 2) {
      // Pair - good for building pung
      primaryAction = 'keep'
      confidence = 85
      priority = 8
      reasoning = `Pair building toward pung (${tileCount} copies)`
    } else if (tileContributions.isCritical) {
      // Critical single tile
      primaryAction = 'keep'
      confidence = 90
      priority = 9
      reasoning = `Critical single tile for ${tileContributions.topPattern}`
    } else if (tileContributions.isKeepTile) {
      // TIER-BASED SYSTEM: Use priority tier for recommendations
      if (tileContributions.priorityTier === 1) {
        // Tier 1: Critical tiles (required + cannot be replaced)
        primaryAction = 'keep'
        confidence = 90
        priority = 9
        reasoning = 'Critical tile for primary pattern'
      } else if (tileContributions.priorityTier === 2) {
        // Tier 2: Supporting tiles (required + can be replaced, or strategic value)
        primaryAction = 'keep'
        confidence = 80
        priority = 7
        reasoning = 'Supporting tile for primary pattern'
      } else if (tileContributions.priorityTier === 3) {
        // Tier 3: Flexible tiles (alternate pattern tiles)
        primaryAction = 'keep'
        confidence = 65
        priority = 6
        reasoning = 'Required for alternate pattern'
      } else {
        // Fallback keep (shouldn't happen with current logic)
        primaryAction = 'keep'
        confidence = 50
        priority = 5
        reasoning = 'Contributes to viable patterns'
      }
    } else {
      // Not a keep tile - recommend discard/pass
      primaryAction = gameContext.phase === 'charleston' ? 'pass' : 'discard'
      confidence = 80
      priority = 2
      reasoning = 'Does not contribute to priority patterns'
    }
    
    
    // Opponent safety analysis
    const opponentRisk = this.analyzeOpponentRisk(tileId, opponentAnalysis)
    if (opponentRisk.isRisky && primaryAction === 'discard') {
      // Demote risky discards
      confidence -= 20
      priority -= 1
      reasoning += ` (but ${opponentRisk.risk})`
    }
    
    // Generate contextual actions
    const contextualActions = this.generateContextualActions(
      tileId,
      primaryAction,
      tileContributions,
      opponentRisk,
      gameContext
    )
    
    // Calculate multi-pattern value
    const multiPatternValue = Math.min(10, tileContributions.patternCount * 2 + tileContributions.totalValue)
    
    // Detect dangers
    const dangers = this.detectTileDangers(
      tileId,
      primaryAction,
      tileContributions,
      opponentRisk,
      patternRankings
    )
    
      return {
        tileId,
        primaryAction,
        confidence: Math.min(95, Math.max(15, confidence)),
        priority: Math.min(10, Math.max(1, priority)),
        reasoning,
        contextualActions,
        patternsHelped: tileContributions.patterns,
        multiPatternValue,
        dangers: dangers.length > 0 ? dangers : null
      }
      
    } catch (error) {
      // Keep this error - it indicates tile action generation failures
      console.error(`🚨 ENGINE 3: Failed to generate tile action for ${tileId}:`, error)
      
      // Return safe fallback action
      return {
        tileId,
        primaryAction: 'neutral' as const,
        confidence: 50,
        priority: 5,
        reasoning: 'Engine 3 analysis failed - using neutral recommendation',
        contextualActions: {
          charleston: 'neutral' as const,
          gameplay: 'neutral' as const,
          exposition: 'keep' as const
        },
        patternsHelped: [],
        multiPatternValue: 0,
        dangers: [{
          type: 'strategic_error' as const,
          severity: 'medium' as const,
          message: 'Analysis engine error - manual review recommended',
          impact: 'Unable to provide strategic recommendations for this tile'
        }]
      }
    }
  }

  /**
   * Helper method to sort tile actions using the same logic as hand sorting
   */
   private static sortTileActions(tileActions: TileAction[]): TileAction[] {
    const suitOrder = ['dots', 'bams', 'cracks', 'winds', 'dragons', 'flowers', 'jokers']
    
    return [...tileActions].sort((a, b) => {
      // First sort by tile position (same as hand sorting)
      const getSuitFromTileId = (tileId: string) => {
        if (tileId.endsWith('D')) return 'dots'
        if (tileId.endsWith('B')) return 'bams' 
        if (tileId.endsWith('C')) return 'cracks'
        if (['east', 'south', 'west', 'north'].includes(tileId)) return 'winds'
        if (['red', 'green', 'white'].includes(tileId)) return 'dragons'
        if (tileId.startsWith('f') || tileId === 'flower') return 'flowers'
        if (tileId === 'joker') return 'jokers'
        return 'unknown'
      }
      
      const suitA = suitOrder.indexOf(getSuitFromTileId(a.tileId))
      const suitB = suitOrder.indexOf(getSuitFromTileId(b.tileId))
      if (suitA !== suitB) return suitA - suitB
      
      // Then by value within suit
      const getValue = (tileId: string) => {
        if (['east', 'south', 'west', 'north'].includes(tileId)) {
          const windOrder = ['east', 'south', 'west', 'north']
          return windOrder.indexOf(tileId)
        }
        if (['red', 'green', 'white'].includes(tileId)) {
          const dragonOrder = ['red', 'green', 'white']
          return dragonOrder.indexOf(tileId)
        }
        const num = parseInt(tileId)
        return !isNaN(num) ? num : tileId.localeCompare(tileId)
      }
      
      const valueA = getValue(a.tileId)
      const valueB = getValue(b.tileId)
      if (valueA !== valueB) return valueA - valueB
      
      // Finally by priority if tiles are the same
      return b.priority - a.priority
    })
  }

  /**
   * Helper method to find a tile's contribution in a specific pattern
   */
  private static findTileInPattern(tileId: string, patternFact: PatternAnalysisFacts): TileContribution | null {
    try {
      const bestVariation = patternFact?.tileMatching?.bestVariation
      if (!bestVariation) return null
      
      const tileContributions = bestVariation.tileContributions
      if (!tileContributions || !Array.isArray(tileContributions)) return null
      
      const tileContribution = tileContributions.find((contrib: TileContribution) => {
        return contrib.tileId === tileId
      })
      
      return tileContribution || null
    } catch {
      return null
    }
  }


  /**
   * Analyze tile contributions using sophisticated tier-based priority system
   * (1) Primary pattern, (2) Primary pattern variations, (3) Top alternate patterns
   * Target: ~11 keep tiles for balanced recommendations
   */
  private static analyzeTileContributions(tileId: string, analysisFacts?: unknown[]) {
    if (!analysisFacts || analysisFacts.length === 0) {
      // No Engine 1 facts - return no contributions so tiles get discarded
      return {
        patterns: [],
        patternCount: 0,
        totalValue: 0,
        isCritical: false,
        helpsMultiplePatterns: false,
        topPattern: '',
        priorityTier: 0,
        isKeepTile: false
      }
    }
    
    
    try {
      // TIER-BASED PRIORITY SYSTEM: Sophisticated keep/discard recommendations
      
      // Step 1: Get all viable patterns sorted by completion ratio
      const allViablePatterns = analysisFacts
        .filter((fact): fact is PatternAnalysisFacts => {
          // Type guard: validate fact structure silently - log only critical errors
          if (!fact || typeof fact !== 'object') return false
          const typedFact = fact as PatternAnalysisFacts
          if (!typedFact.tileMatching?.bestVariation) {
            return false
          }
          try {
            return typedFact.tileMatching.bestVariation.completionRatio > 0.15 // At least 15% complete (2+ tiles)
          } catch {
            // Silent - expected data validation failure
            return false
          }
        })
        .sort((a, b) => {
          const aRatio = a.tileMatching?.bestVariation?.completionRatio || 0
          const bRatio = b.tileMatching?.bestVariation?.completionRatio || 0
          return bRatio - aRatio
        })
      
      // Step 2: Determine tile's priority tier and value
      let priorityTier = 0
      let tileValue = 0
      let topPattern = ''
      let isCritical = false
      const patterns: string[] = []
      
      // Tier 1: Primary pattern (top completion ratio)
      if (allViablePatterns.length > 0) {
        const primaryPattern = allViablePatterns[0]
        const tileContribution = this.findTileInPattern(tileId, primaryPattern)
        
        if (tileContribution?.isRequired) {
          priorityTier = 1
          tileValue += 1.0 // High value for primary pattern
          topPattern = primaryPattern.patternId
          isCritical = tileContribution.isCritical
          patterns.push(primaryPattern.patternId)
        }
      }
      
      // Tier 2: Supporting tiles for primary pattern
      // These are required tiles that can be replaced (e.g., by jokers) or provide strategic flexibility
      if (priorityTier === 0 && allViablePatterns.length > 0) {
        const primaryPattern = allViablePatterns[0]

        // Check if this tile is a required but replaceable tile in the primary pattern
        const allTileContributions = primaryPattern?.tileMatching?.bestVariation?.tileContributions || []
        const supportingContribution = allTileContributions.find(contrib =>
          contrib.tileId === tileId && contrib.isRequired && contrib.canBeReplaced === true
        )

        // Also check if tile helps multiple groups within the same pattern (strategic value)
        const sameBaseTiles = allTileContributions.filter(contrib => {
          if (!contrib?.tileId || typeof contrib.tileId !== 'string' || !tileId || typeof tileId !== 'string') {
            return false
          }
          const baseType = contrib.tileId.replace(/[0-9]+$/, '') // Remove instance numbers
          const currentBaseType = tileId.replace(/[0-9]+$/, '')
          return baseType === currentBaseType && contrib.isRequired
        })

        if (supportingContribution || sameBaseTiles.length > 0) {
          priorityTier = 2
          tileValue += 0.75 // Medium-high value for supporting tiles
          if (!topPattern) topPattern = primaryPattern.patternId
          patterns.push(primaryPattern.patternId)
          isCritical = supportingContribution?.isCritical || sameBaseTiles.some(t => t.isCritical) || false
        }
      }
      
      // Tier 3: Top alternate patterns
      if (priorityTier === 0) {
        for (let i = 1; i < Math.min(4, allViablePatterns.length); i++) {
          const alternatePattern = allViablePatterns[i]
          const tileContribution = this.findTileInPattern(tileId, alternatePattern)
          if (tileContribution?.isRequired) {
            priorityTier = 3
            tileValue += 0.5 // Lower value for alternate patterns
            if (!topPattern) topPattern = alternatePattern.patternId
            patterns.push(alternatePattern.patternId)
          }
        }
      }
      
      // Determine if this is a keep tile based on tier system
      const isKeepTile = priorityTier > 0
      
        
      return {
        patterns,
        patternCount: patterns.length,
        totalValue: tileValue,
        isCritical,
        helpsMultiplePatterns: patterns.length >= 2,
        topPattern,
        priorityTier,
        isKeepTile
      }
      
    } catch (analysisError) {
      // Keep this error - it indicates tile contribution analysis failures
      console.error(`🚨 ENGINE 3 CRITICAL ERROR: Failed to analyze tile contributions for ${tileId}:`, analysisError)
      console.error('Engine 1 facts structure:', analysisFacts?.map(f => {
        const typedFact = f as PatternAnalysisFacts
        return {
          patternId: typedFact?.patternId, 
          hasTileMatching: !!typedFact?.tileMatching,
          hasBestVariation: !!typedFact?.tileMatching?.bestVariation,
          hasTileContributions: !!typedFact?.tileMatching?.bestVariation?.tileContributions
        }
      }))
      
      // Return safe fallback to prevent complete Engine 3 failure
      return {
        patterns: [],
        patternCount: 0,
        totalValue: 0,
        isCritical: false,
        helpsMultiplePatterns: false,
        topPattern: ''
      }
    }
  }

  /* FALLBACK FUNCTION - UNUSED IN NEW SYSTEM
  private static analyzeTilePatternValue(tileId: string, topPatterns: PatternRanking[]) {
    // ... function body commented out ...
  }
  */

  /**
   * Analyze opponents based on exposed tiles and discard patterns
   */
  private static analyzeOpponents(
    exposedTiles: { [playerId: string]: string[] },
    discardPile: string[]
  ): OpponentAnalysis[] {

    const opponents: OpponentAnalysis[] = []

    // Defensive null/undefined checks
    if (!exposedTiles || typeof exposedTiles !== 'object') {
      return opponents
    }

    const safeDiscardPile = Array.isArray(discardPile) ? discardPile : []

    for (const [playerId, exposed] of Object.entries(exposedTiles)) {
      // Defensive check: ensure exposed is a valid array
      if (!Array.isArray(exposed) || exposed.length === 0) continue
      
      const analysis: OpponentAnalysis = {
        playerId,
        likelyNeeds: this.inferOpponentNeeds(exposed, safeDiscardPile),
        exposedPatterns: this.identifyExposedPatterns(exposed),
        safeDiscards: this.identifySafeDiscards(exposed, safeDiscardPile),
        riskyDiscards: this.identifyRiskyDiscards(exposed),
        patternClues: this.analyzePatternClues(exposed, safeDiscardPile)
      }
      
      opponents.push(analysis)
    }
    
    return opponents
  }

  /**
   * Infer what tiles opponents likely need
   */
  private static inferOpponentNeeds(exposed: string[], discardPile: string[]) {
    const needs: OpponentAnalysis['likelyNeeds'] = []
    
    // Analyze what tiles they've discarded - they likely don't need these types
    const discardedTypes = new Set(discardPile
      .filter(tile => tile && typeof tile === 'string')
      .map(tile => tile.replace(/[0-9]/g, '')))
    
    // Simple pattern recognition - check for incomplete sets
    const tileCounts = this.countTiles(exposed)
    
    for (const [tileId, count] of Object.entries(tileCounts)) {
      if (count === 2) {
        // Likely building a pung, but check if they've discarded similar tiles
        const tileType = tileId.replace(/[0-9]/g, '')
        const probability = discardedTypes.has(tileType) ? 0.5 : 0.8
        
        needs.push({
          tileId,
          probability,
          reasoning: [`Has pair of ${tileId}, ${discardedTypes.has(tileType) ? 'but discarded similar tiles' : 'likely building pung'}`]
        })
      }
    }
    
    // Check for sequence patterns - analyze actual number tiles
    const numbers = exposed.filter(t => t.match(/^[1-9][BCD]$/))
    if (numbers.length >= 2) {
      // Group by suit and analyze potential sequences
      const suits = ['B', 'C', 'D']
      
      for (const suit of suits) {
        const suitTiles = numbers
          .filter(t => t.endsWith(suit))
          .map(t => parseInt(t.charAt(0)))
          .sort((a, b) => a - b)
        
        if (suitTiles.length >= 2) {
          // Look for potential sequence completion tiles
          const sequenceNeeds = this.findSequenceNeeds(suitTiles, suit, discardedTypes)
          
          // Adjust probability based on discard pile size (more discards = less likely to get needed tiles)
          const baseProbability = discardPile.length > 5 ? 0.4 : 0.6
          
          sequenceNeeds.forEach(need => {
            needs.push({
              tileId: need,
              probability: baseProbability,
              reasoning: [`Building ${suit} sequences with ${suitTiles.join(', ')}`]
            })
          })
        }
      }
    }
    
    return needs
  }

  /**
   * Find tiles needed to complete sequences from a set of number tiles
   */
  private static findSequenceNeeds(suitTiles: number[], suit: string, discardedTypes: Set<string>): string[] {
    const needs: string[] = []
    
    // Look for consecutive runs and identify missing tiles
    for (let i = 0; i < suitTiles.length - 1; i++) {
      const current = suitTiles[i]
      const next = suitTiles[i + 1]
      
      // If there's a gap of 1, they might need the middle tile
      if (next - current === 2) {
        const middleTile = `${current + 1}${suit}`
        if (!discardedTypes.has(suit)) {
          needs.push(middleTile)
        }
      }
      
      // If consecutive, they might want to extend the sequence
      if (next - current === 1) {
        // Add tiles to extend the sequence (if valid numbers)
        if (current > 1) {
          const lowerTile = `${current - 1}${suit}`
          if (!discardedTypes.has(suit)) {
            needs.push(lowerTile)
          }
        }
        if (next < 9) {
          const higherTile = `${next + 1}${suit}`
          if (!discardedTypes.has(suit)) {
            needs.push(higherTile)
          }
        }
      }
    }
    
    // For isolated tiles, check for adjacent tiles
    suitTiles.forEach(num => {
      if (num > 1) {
        const lowerTile = `${num - 1}${suit}`
        if (!discardedTypes.has(suit) && !needs.includes(lowerTile)) {
          needs.push(lowerTile)
        }
      }
      if (num < 9) {
        const higherTile = `${num + 1}${suit}`
        if (!discardedTypes.has(suit) && !needs.includes(higherTile)) {
          needs.push(higherTile)
        }
      }
    })
    
    return needs
  }

  /**
   * Analyze opponent risk for discarding a tile
   */
  private static analyzeOpponentRisk(tileId: string, opponents: OpponentAnalysis[]) {
    let maxRisk = 0
    const riskReasons: string[] = []
    
    for (const opponent of opponents) {
      for (const need of opponent.likelyNeeds) {
        if (need.tileId === tileId) {
          maxRisk = Math.max(maxRisk, need.probability)
          riskReasons.push(`${opponent.playerId} likely needs this`)
        }
      }
      
      if (opponent.riskyDiscards.includes(tileId)) {
        maxRisk = Math.max(maxRisk, 0.7)
        riskReasons.push(`Risky for ${opponent.playerId}`)
      }
    }
    
    return {
      isRisky: maxRisk > 0.5,
      riskLevel: maxRisk,
      risk: riskReasons.join(', ') || 'appears safe'
    }
  }

  /**
   * Generate contextual actions for different game phases
   */
  private static generateContextualActions(
    tileId: string,
    primaryAction: TileAction['primaryAction'],
    patternValue: {
      isCritical: boolean
      patternCount: number
    },
    opponentRisk: {
      isRisky: boolean
    },
    gameContext: {
      phase: 'charleston' | 'gameplay'
    }
  ): TileAction['contextualActions'] {
    
    let charleston: 'keep' | 'pass' | 'neutral' = 'neutral'
    let gameplay: 'keep' | 'discard' | 'neutral' = 'neutral'
    let exposition: 'expose' | 'keep' | 'never' = 'keep'
    
    // Charleston logic
    if (gameContext.phase === 'charleston') {
      if (patternValue.isCritical) charleston = 'keep'
      else if (patternValue.patternCount === 0) charleston = 'pass'
      else charleston = 'neutral'
    }
    
    // Gameplay logic
    if (primaryAction === 'keep') gameplay = 'keep'
    else if (primaryAction === 'discard' && !opponentRisk.isRisky) gameplay = 'discard'
    else gameplay = 'neutral'
    
    // Exposition logic (simplified)
    if (tileId === 'joker') exposition = 'never'
    else if (patternValue.isCritical) exposition = 'keep'
    else exposition = 'expose'
    
    return { charleston, gameplay, exposition }
  }

  /**
   * Detect dangers for tile actions
   */
  private static detectTileDangers(
    tileId: string,
    action: TileAction['primaryAction'],
    patternValue: {
      isCritical: boolean
      helpsMultiplePatterns: boolean
      topPattern: string
      patternCount: number
    },
    opponentRisk: {
      isRisky: boolean
      riskLevel: number
      risk: string
    },
    patternRankings: RankedPatternResults
  ): DangerWarning[] {
    
    const dangers: DangerWarning[] = []
    
    // Pattern destruction danger - check against top pattern rankings
    if (action === 'discard' && patternValue.isCritical) {
      const topPattern = patternRankings?.topRecommendations?.[0]
      if (topPattern) {
        dangers.push({
          type: 'pattern_destruction',
          severity: topPattern.totalScore > 70 ? 'high' : 'medium',
          message: `Discarding ${tileId} would destroy your best pattern`,
          impact: `${patternValue.topPattern} completion would drop significantly (current score: ${topPattern.totalScore})`
        })
      }
    }
    
    // Opponent feeding danger
    if (action === 'discard' && opponentRisk.isRisky) {
      dangers.push({
        type: 'opponent_feeding',
        severity: opponentRisk.riskLevel > 0.8 ? 'high' : 'medium',
        message: `${tileId} appears to help opponents`,
        impact: opponentRisk.risk
      })
    }
    
    // Strategic error danger - check viable patterns count
    if (action === 'pass' && patternValue.helpsMultiplePatterns) {
      const viableCount = patternRankings.viablePatterns.length
      dangers.push({
        type: 'strategic_error',
        severity: viableCount > 3 ? 'high' : 'medium',
        message: `${tileId} helps multiple viable patterns`,
        impact: `Passing reduces flexibility for ${patternValue.patternCount} patterns (${viableCount} viable options)`
      })
    }
    
    return dangers
  }

  /**
   * Generate optimal strategy recommendation
   */
  private static generateOptimalStrategy(
    patternRankings: RankedPatternResults,
    tileActions: TileAction[]
  ) {
    // Defensive null/undefined checks
    if (!patternRankings?.topRecommendations || !Array.isArray(patternRankings.topRecommendations) || patternRankings.topRecommendations.length === 0) {
      return {
        primaryPattern: 'fallback-pattern',
        backupPattern: null,
        pivotCondition: null,
        expectedCompletion: 0
      }
    }

    const topPattern = patternRankings.topRecommendations[0]
    const backupPattern = patternRankings.topRecommendations[1] || null

    // Calculate expected completion based on current recommendations
    const keepTiles = Array.isArray(tileActions) ? tileActions.filter(a => a?.primaryAction === 'keep').length : 0
    const expectedCompletion = Math.min(95, (keepTiles / 14) * 100 + (topPattern?.totalScore || 0) / 2)
    
    let pivotCondition: string | null = null
    if (backupPattern && patternRankings.switchAnalysis?.shouldSuggestSwitch) {
      pivotCondition = `Switch if ${topPattern?.patternId || 'current pattern'} completion drops below 60%`
    }

    return {
      primaryPattern: topPattern?.patternId || 'fallback-pattern',
      backupPattern: backupPattern?.patternId || null,
      pivotCondition,
      expectedCompletion
    }
  }

  /**
   * Generate strategic advice with realistic tile counts
   */
  private static generateStrategicAdvice(
    patternRankings: RankedPatternResults,
    tileActions: TileAction[],
    gameContext: {
      phase: 'charleston' | 'gameplay'
    }
  ): string[] {

    const advice: string[] = []

    // Defensive null/undefined checks
    if (!patternRankings?.topRecommendations || !Array.isArray(patternRankings.topRecommendations) || patternRankings.topRecommendations.length === 0) {
      advice.push('No pattern recommendations available - consider reviewing your hand')
      return advice
    }

    const topPattern = patternRankings.topRecommendations[0]

    // Primary strategy advice
    if (topPattern?.patternId && topPattern?.recommendation) {
      advice.push(`Focus on ${topPattern.patternId} (${topPattern.recommendation} viability)`)
    } else {
      advice.push('Focus on building viable patterns with current tiles')
    }

    // Realistic tile management advice
    const safeTileActions = Array.isArray(tileActions) ? tileActions : []
    const keepCount = safeTileActions.filter(a => a?.primaryAction === 'keep').length
    const passCount = safeTileActions.filter(a => a?.primaryAction === 'pass').length
    const discardCount = safeTileActions.filter(a => a?.primaryAction === 'discard').length
    const totalHand = safeTileActions.length
    
    // Phase-specific realistic advice
    if (gameContext.phase === 'charleston') {
      const needToPass = 3 // Charleston requires passing 3 tiles
      const passCandidates = passCount + discardCount
      
      if (passCandidates < needToPass) {
        advice.push(`Need ${needToPass - passCandidates} more tiles to pass - consider lower value keeps`)
      } else if (passCandidates > needToPass + 2) {
        advice.push('Many disposal options - pass lowest strategic value tiles first')
      } else {
        advice.push(`Pass the ${passCount} recommended tiles, plus ${needToPass - passCount} from neutral tiles`)
      }
    } else {
      // Gameplay phase - must discard at least 1 tile per turn
      if (discardCount === 0 && totalHand >= 14) {
        advice.push('Must discard at least one tile - consider breaking up low-value pairs')
      } else if (discardCount >= 3) {
        advice.push('Multiple disposal options - start with tiles that help opponents least')
      } else {
        advice.push('Discard recommended tiles while monitoring opponent needs')
      }
    }
    
    // Hand balance advice
    const keepRatio = keepCount / totalHand
    if (keepRatio > 0.85) {
      advice.push('Hand too rigid - consider strategic tile releases for flexibility')
    } else if (keepRatio < 0.50) {
      advice.push('Many disposal candidates - focus on pattern completion priorities')
    }
    
    // Risk management advice
    const dangerousTiles = tileActions.filter(a => a.dangers && a.dangers.length > 0)
    if (dangerousTiles.length > 0) {
      advice.push(`Review ${dangerousTiles.length} tiles with warnings before acting`)
    }
    
    return advice
  }

  // Utility methods (simplified implementations)
  
  private static countTiles(tiles: string[]): { [tileId: string]: number } {
    const counts: { [tileId: string]: number } = {}
    for (const tile of tiles) {
      counts[tile] = (counts[tile] || 0) + 1
    }
    return counts
  }

  private static identifyExposedPatterns(exposed: string[]): string[] {
    // Simple pattern recognition based on exposed tiles
    const patterns: string[] = []
    
    // Check for wind/dragon patterns
    const winds = exposed.filter(tile => tile.includes('F')).length
    if (winds >= 3) patterns.push('WINDS')
    
    // Check for number sequences
    const numbers = exposed.filter(tile => tile.match(/[1-9]/)).length
    if (numbers >= 6) patterns.push('SEQUENCES')
    
    return patterns.length > 0 ? patterns : ['UNKNOWN']
  }

  private static identifySafeDiscards(exposed: string[], discardPile: string[]): string[] {
    // Safe discards are tiles that opponents don't seem to need
    const safeTiles: string[] = []
    
    // Tiles that have been discarded multiple times are likely safe
    const discardCounts = new Map<string, number>()
    discardPile.forEach(tile => {
      discardCounts.set(tile, (discardCounts.get(tile) || 0) + 1)
    })
    
    for (const [tile, count] of discardCounts) {
      if (count >= 2) safeTiles.push(tile)
    }
    
    // Tiles not seen in exposed sets are generally safer
    const exposedTypes = new Set(exposed.map(tile => tile.charAt(1)))
    const allTiles = ['1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B']
    for (const tile of allTiles) {
      if (!exposedTypes.has(tile.charAt(1))) {
        safeTiles.push(tile)
      }
    }
    
    return safeTiles.length > 0 ? safeTiles.slice(0, 5) : ['7C', '8C', '9C']
  }

  private static identifyRiskyDiscards(exposed: string[]): string[] {
    // Risky discards are tiles that might help opponents based on exposed sets
    const riskyTiles: string[] = []
    
    // Tiles that match exposed patterns are risky
    const numbers = exposed.filter(tile => tile.match(/[1-9]/))
    
    // If opponent has exposed sequential tiles, adjacent numbers are risky
    if (numbers.length >= 2) {
      riskyTiles.push('4B', '5B', '6B') // Middle tiles often needed for sequences
    }
    
    // If opponent has exposed pairs, the same tile is risky (they might want a pung)
    const tileCounts = new Map<string, number>()
    exposed.forEach(tile => {
      tileCounts.set(tile, (tileCounts.get(tile) || 0) + 1)
    })
    
    for (const [tile, count] of tileCounts) {
      if (count === 2) riskyTiles.push(tile) // They have a pair, might want the third
    }
    
    return riskyTiles.length > 0 ? [...new Set(riskyTiles)] : ['1B', '9B']
  }

  private static analyzePatternClues(exposed: string[], discardPile: string[]) {
    // Analyze pattern clues based on exposed tiles and discards
    const clues = []
    
    // Check for wind/dragon patterns
    const winds = exposed.filter(tile => tile.includes('F')).length
    const dragonsDiscarded = discardPile.filter(tile => tile.includes('F')).length
    
    if (winds >= 2 && dragonsDiscarded === 0) {
      clues.push({
        pattern: 'WINDS_DRAGONS',
        confidence: 0.8,
        evidence: [`Exposed ${winds} winds`, 'No dragons discarded']
      })
    }
    
    // Check for number patterns
    const numbersExposed = exposed.filter(tile => tile.match(/[1-9]/)).length
    if (numbersExposed >= 4) {
      clues.push({
        pattern: 'NUMBER_SEQUENCES',
        confidence: 0.6,
        evidence: [`${numbersExposed} number tiles exposed`]
      })
    }
    
    return clues.length > 0 ? clues : [{
      pattern: 'UNKNOWN',
      confidence: 0.3,
      evidence: ['Insufficient pattern data']
    }]
  }

  /**
   * Calculate how valuable a specific tile is for a specific pattern (realistic assessment)
   * Returns 0-1 value indicating tile importance to pattern completion
   * UNUSED IN NEW ENGINE 1 FACTS SYSTEM
   */
  /*
  private static calculateTileValueForPattern(tileId: string, pattern: PatternRanking): number {
    // Start with very low base value - most tiles don't help most patterns
    let value = 0.1
    
    // Pattern must be somewhat viable to assign any significant value
    if (pattern.totalScore < 30) return 0.05 // Very low value for poor patterns
    if (pattern.recommendation === 'impossible') return 0.0
    
    const { components } = pattern
    
    // Only value tiles for patterns with reasonable current tile scores
    if (components.currentTileScore > 25) {
      value += 0.2 // Base value for contributing to pattern
      
      // Additional value based on pattern strength
      if (components.currentTileScore > 35) value += 0.2
      if (components.availabilityScore > 25) value += 0.15
      if (components.jokerScore > 15) value += 0.1
      if (components.priorityScore > 8) value += 0.1
    } else {
      // Pattern isn't progressing well, lower all tile values
      return 0.05
    }
    
    // Tile-specific adjustments (more conservative)
    if (tileId === 'joker') {
      // Jokers are valuable but not for impossible patterns
      value = pattern.totalScore > 40 ? 0.85 : 0.4
    } else if (tileId.match(/^(north|south|east|west|f1|f2|f3|f4)$/)) {
      // Winds/Dragons are valuable for specific patterns only
      value = pattern.patternId.includes('WIND') || pattern.patternId.includes('DRAGON') 
        ? value + 0.3 : Math.max(0.1, value - 0.2)
    } else if (tileId.match(/^[1-9][BCD]$/)) {
      // Numbered tiles get slight bonus for sequence/set patterns
      value += 0.05
    }
    
    // Pattern recommendation strongly affects tile value
    if (pattern.recommendation === 'excellent') value *= 1.3
    else if (pattern.recommendation === 'good') value *= 1.1
    else if (pattern.recommendation === 'fair') value *= 0.9
    else if (pattern.recommendation === 'poor') value *= 0.6
    
    return Math.min(1.0, Math.max(0.0, value))
  }
  */
}