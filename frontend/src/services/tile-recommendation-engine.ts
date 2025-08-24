// Engine 3: Tile Recommendation Engine
// Generates keep/pass/discard recommendations with opponent analysis
// Provides contextual actions and danger warnings

import type { RankedPatternResults } from './pattern-ranking-engine'

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
  static async generateRecommendations(
    playerTiles: string[],
    patternRankings: RankedPatternResults,
    gameContext: {
      phase: 'charleston' | 'gameplay'
      discardPile: string[]
      exposedTiles: { [playerId: string]: string[] }
      playerHands?: { [playerId: string]: number } // hand sizes
      wallTilesRemaining: number
    },
    analysisFacts?: unknown[] // Engine 1 pattern analysis facts with actual tile matching data
  ): Promise<TileRecommendationResults> {
    
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
    
    // Sort by priority (highest first)
    tileActions.sort((a, b) => b.priority - a.priority)
    
    // Categorize actions
    const keepTiles = tileActions.filter(a => a.primaryAction === 'keep')
    let passTiles = tileActions.filter(a => a.primaryAction === 'pass')
    let discardTiles = tileActions.filter(a => a.primaryAction === 'discard')
    
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
      tileActions,
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
    
    // Debug the recommendation decision process
    
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
    } else if (tileContributions.helpsMultiplePatterns && tileContributions.patternCount >= 3) {
      // Very flexible tile
      primaryAction = 'keep'
      confidence = 75
      priority = 7
      reasoning = `Flexible tile helping ${tileContributions.patternCount} patterns`
    } else if (tileContributions.patternCount === 0) {
      // Tile doesn't help any viable patterns - MUST recommend discard/pass
      primaryAction = gameContext.phase === 'charleston' ? 'pass' : 'discard'
      confidence = 85
      priority = 1
      reasoning = 'Does not contribute to any viable patterns'
    } else if (tileContributions.patternCount === 1 && tileContributions.totalValue < 0.3) {
      // Low value single tile - recommend discard/pass
      primaryAction = gameContext.phase === 'charleston' ? 'pass' : 'discard'
      confidence = 70
      priority = 2
      reasoning = 'Low strategic value for current patterns'
    } else {
      // Moderate value tile - lean toward keeping but could pass/discard
      primaryAction = 'neutral'
      confidence = 50
      priority = 4
      reasoning = 'Moderate strategic value - evaluate with hand balance'
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
   * Analyze tile contributions using actual Engine 1 pattern analysis facts
   */
  private static analyzeTileContributions(tileId: string, analysisFacts?: unknown[]) {
    const patterns: string[] = []
    let totalValue = 0
    let isCritical = false
    let topPattern = ''
    
    if (!analysisFacts || analysisFacts.length === 0) {
      // No Engine 1 facts - return no contributions so tiles get discarded
      return {
        patterns: [],
        patternCount: 0,
        totalValue: 0,
        isCritical: false,
        helpsMultiplePatterns: false,
        topPattern: ''
      }
    }
    
    try {
      // Using Engine 1 facts for tile analysis with safe property access
      
      // Check ALL viable patterns that have meaningful progress (not just top 3)
      const viablePatterns = analysisFacts
        .filter(fact => {
          // Validate fact structure silently - log only critical errors
          if (!fact?.tileMatching?.bestVariation) {
            return false
          }
          try {
            return fact.tileMatching.bestVariation.completionRatio > 0.15 // At least 15% complete (2+ tiles)
          } catch {
            // Silent - expected data validation failure
            return false
          }
        })
        .sort((a, b) => {
          const aRatio = a?.tileMatching?.bestVariation?.completionRatio || 0
          const bRatio = b?.tileMatching?.bestVariation?.completionRatio || 0
          return bRatio - aRatio
        })
      
      // Check each viable pattern's analysis facts for tile contributions
      for (const patternFact of viablePatterns) {
        try {
          const bestVariation = patternFact?.tileMatching?.bestVariation
          
          if (!bestVariation) {
            // Expected case for incomplete pattern analysis - skip silently
            continue
          }
          
          
          // Check if this tile has contributions in the best variation
          const tileContributions = bestVariation.tileContributions
          if (!tileContributions || !Array.isArray(tileContributions)) {
            // Expected case for patterns without tile contribution data - skip silently
            continue
          }
          
          const tileContribution = tileContributions.find((contrib: unknown) => {
            if (typeof contrib === 'object' && contrib !== null && 'tileId' in contrib) {
              return (contrib as { tileId: string }).tileId === tileId
            }
            return false
          })
          
          if (tileContribution && 
              typeof tileContribution === 'object' && 
              tileContribution !== null && 
              'isRequired' in tileContribution && 
              (tileContribution as { isRequired: boolean }).isRequired) {
            patterns.push(patternFact.patternId)
            
            // Calculate value based on actual contribution
            let contributionValue = 0.5 // Base value for required tiles
            
            if ('isCritical' in tileContribution && (tileContribution as { isCritical: boolean }).isCritical === true) {
              contributionValue += 0.3
              isCritical = true
            }
            
            if ('positionsInPattern' in tileContribution && 
                Array.isArray((tileContribution as { positionsInPattern: unknown[] }).positionsInPattern) && 
                (tileContribution as { positionsInPattern: unknown[] }).positionsInPattern.length > 1) {
              contributionValue += 0.2 // Bonus for multi-position tiles
            }
            
            // Pattern completion affects tile value
            const completionRatio = bestVariation.completionRatio || 0
            contributionValue *= (0.5 + completionRatio) // Scale by pattern progress
            
            totalValue += contributionValue
            
            if (!topPattern) {
              topPattern = patternFact.patternId
            }
          } else {
            // Tile not required for this pattern - skip
          }
        } catch {
          // Silent - expected data validation failure
          continue
        }
      }
    
      const result = {
        patterns,
        patternCount: patterns.length,
        totalValue,
        isCritical,
        helpsMultiplePatterns: patterns.length >= 2,
        topPattern
      }
      
      return result
      
    } catch (analysisError) {
      // Keep this error - it indicates tile contribution analysis failures
      console.error(`🚨 ENGINE 3 CRITICAL ERROR: Failed to analyze tile contributions for ${tileId}:`, analysisError)
      console.error('Engine 1 facts structure:', analysisFacts?.map(f => ({ 
        patternId: f?.patternId, 
        hasTileMatching: !!f?.tileMatching,
        hasBestVariation: !!f?.tileMatching?.bestVariation,
        hasTileContributions: !!f?.tileMatching?.bestVariation?.tileContributions
      })))
      
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
    
    for (const [playerId, exposed] of Object.entries(exposedTiles)) {
      if (exposed.length === 0) continue
      
      const analysis: OpponentAnalysis = {
        playerId,
        likelyNeeds: this.inferOpponentNeeds(exposed, discardPile),
        exposedPatterns: this.identifyExposedPatterns(exposed),
        safeDiscards: this.identifySafeDiscards(exposed, discardPile),
        riskyDiscards: this.identifyRiskyDiscards(exposed),
        patternClues: this.analyzePatternClues(exposed, discardPile)
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
    const discardedTypes = new Set(discardPile.map(tile => tile.replace(/[0-9]/g, '')))
    
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
    
    // Check for sequence patterns (simplified)
    const numbers = exposed.filter(t => t.match(/^[1-9][BCD]$/))
    if (numbers.length >= 2) {
      // Could be building sequences - adjust probability based on discards
      const sequenceProbability = discardPile.length > 5 ? 0.4 : 0.6
      needs.push({
        tileId: '5B', // Placeholder
        probability: sequenceProbability,
        reasoning: ['Building number sequences']
      })
    }
    
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
      const topPattern = patternRankings.topRecommendations[0]
      dangers.push({
        type: 'pattern_destruction',
        severity: topPattern?.totalScore > 70 ? 'high' : 'medium',
        message: `Discarding ${tileId} would destroy your best pattern`,
        impact: `${patternValue.topPattern} completion would drop significantly (current score: ${topPattern?.totalScore})`
      })
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
    const topPattern = patternRankings.topRecommendations[0]
    const backupPattern = patternRankings.topRecommendations[1] || null
    
    // Calculate expected completion based on current recommendations
    const keepTiles = tileActions.filter(a => a.primaryAction === 'keep').length
    const expectedCompletion = Math.min(95, (keepTiles / 14) * 100 + topPattern.totalScore / 2)
    
    let pivotCondition: string | null = null
    if (backupPattern && patternRankings.switchAnalysis?.shouldSuggestSwitch) {
      pivotCondition = `Switch if ${topPattern.patternId} completion drops below 60%`
    }
    
    return {
      primaryPattern: topPattern.patternId,
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
    const topPattern = patternRankings.topRecommendations[0]
    
    // Primary strategy advice
    advice.push(`Focus on ${topPattern.patternId} (${topPattern.recommendation} viability)`)
    
    // Realistic tile management advice
    const keepCount = tileActions.filter(a => a.primaryAction === 'keep').length
    const passCount = tileActions.filter(a => a.primaryAction === 'pass').length
    const discardCount = tileActions.filter(a => a.primaryAction === 'discard').length
    const totalHand = tileActions.length
    
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