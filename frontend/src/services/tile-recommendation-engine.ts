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
    analysisFacts?: any[] // Engine 1 pattern analysis facts with actual tile matching data
  ): Promise<TileRecommendationResults> {
    
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
    const passTiles = tileActions.filter(a => a.primaryAction === 'pass')
    const discardTiles = tileActions.filter(a => a.primaryAction === 'discard')
    
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
  }

  /**
   * Generate action recommendation for a specific tile
   */
  private static generateTileAction(
    tileId: string,
    playerTiles: string[],
    patternRankings: RankedPatternResults,
    opponentAnalysis: OpponentAnalysis[],
    gameContext: any,
    analysisFacts?: any[]
  ): TileAction {
    
    const tileCount = playerTiles.filter(t => t === tileId).length
    
    // Debug if analysisFacts are being passed
    // console.error(`🔧 TILE ${tileId} - analysisFacts:`, analysisFacts ? analysisFacts.length : 'UNDEFINED')
    
    // Get actual tile contribution data from Engine 1 facts
    const tileContributions = this.analyzeTileContributions(tileId, analysisFacts)
    
    // Debug the recommendation decision process
    // console.warn(`🎯 TILE DECISION: ${tileId}`)
    // console.warn('Contributions:', tileContributions)
    // console.warn('Count in hand:', tileCount)
    
    // Determine base action
    let primaryAction: TileAction['primaryAction'] = 'neutral'
    let confidence = 50
    let priority = 5
    let reasoning = 'Neutral strategic value'
    
    // High-value tiles (jokers, multiple copies, pattern-critical)
    if (tileId === 'joker') {
      primaryAction = 'keep'
      confidence = 95
      priority = 10
      reasoning = 'Jokers are always valuable for pattern completion'
      // console.log(`Decision: KEEP - ${reasoning}`)
    } else if (tileCount >= 2) {
      primaryAction = 'keep'
      confidence = 85
      priority = 8
      reasoning = `Building set with ${tileCount} copies`
      // console.log(`Decision: KEEP - ${reasoning}`)
    } else if (tileContributions.isCritical) {
      primaryAction = 'keep'
      confidence = 90
      priority = 9
      reasoning = `Critical for ${tileContributions.topPattern} pattern`
    } else if (tileContributions.helpsMultiplePatterns) {
      primaryAction = 'keep'
      confidence = 75
      priority = 7
      reasoning = `Useful for ${tileContributions.patternCount} patterns`
    } else if (tileContributions.patternCount === 0) {
      // Tile doesn't help any top patterns
      primaryAction = gameContext.phase === 'charleston' ? 'pass' : 'discard'
      confidence = 80
      priority = 2
      reasoning = 'Not needed for viable patterns'
    } else {
      // Default neutral case
      primaryAction = 'neutral'
      confidence = 50
      priority = 4
      reasoning = 'Moderate value - monitor for changes'
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
  }

  /**
   * Analyze tile contributions using actual Engine 1 pattern analysis facts
   */
  private static analyzeTileContributions(tileId: string, analysisFacts?: any[]) {
    const patterns: string[] = []
    let totalValue = 0
    let isCritical = false
    let topPattern = ''
    
    if (!analysisFacts || analysisFacts.length === 0) {
      // No Engine 1 facts - return no contributions so tiles get discarded
      // console.warn(`⚠️ NO ENGINE 1 FACTS for ${tileId} - returning ZERO contributions`)
      return {
        patterns: [],
        patternCount: 0,
        totalValue: 0,
        isCritical: false,
        helpsMultiplePatterns: false,
        topPattern: ''
      }
    }
    
    // Using Engine 1 facts for tile analysis
    
    // Check ALL viable patterns that have meaningful progress (not just top 3)
    const viablePatterns = analysisFacts
      .filter(fact => fact.tileMatching.bestVariation.completionRatio > 0.15) // At least 15% complete (2+ tiles)
      .sort((a, b) => b.tileMatching.bestVariation.completionRatio - a.tileMatching.bestVariation.completionRatio)
    
    // Check each viable pattern's analysis facts for tile contributions
    for (const patternFact of viablePatterns) {
      // console.log(`Checking pattern: ${patternFact.patternId}`)
      const bestVariation = patternFact.tileMatching.bestVariation
      // console.log(`Best variation tiles matched: ${bestVariation.tilesMatched}/14`)
      // console.log(`Tile contributions available:`, bestVariation.tileContributions.length)
      
      // Check if this tile has contributions in the best variation
      const tileContribution = bestVariation.tileContributions.find((contrib: any) => contrib.tileId === tileId)
      
      if (tileId === '1D' || tileId === 'west') {
        // console.error(`🔍 TILE ${tileId}:`, {
        //   found: !!tileContribution,
        //   isRequired: tileContribution?.isRequired,
        //   isCritical: tileContribution?.isCritical,
        //   positions: tileContribution?.positionsInPattern?.length || 0
        // })
      }
      
      if (tileContribution && tileContribution.isRequired) {
        patterns.push(patternFact.patternId)
        
        // Calculate value based on actual contribution
        let contributionValue = 0.5 // Base value for required tiles
        
        if (tileContribution.isCritical) {
          contributionValue += 0.3
          isCritical = true
        }
        
        if (tileContribution.positionsInPattern.length > 1) {
          contributionValue += 0.2 // Bonus for multi-position tiles
        }
        
        // Pattern completion affects tile value
        const completionRatio = bestVariation.completionRatio
        contributionValue *= (0.5 + completionRatio) // Scale by pattern progress
        
        totalValue += contributionValue
        
        if (!topPattern) {
          topPattern = patternFact.patternId
        }
      } else {
        // console.log(`✗ ${tileId} does NOT contribute to ${patternFact.patternId} - contribution:`, tileContribution)
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
    
    // console.log(`Final tile contribution result for ${tileId}:`, result)
    return result
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
    let riskReasons: string[] = []
    
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
    patternValue: any,
    opponentRisk: any,
    gameContext: any
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
    patternValue: any,
    opponentRisk: any,
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
   * Generate strategic advice
   */
  private static generateStrategicAdvice(
    patternRankings: RankedPatternResults,
    tileActions: TileAction[],
    gameContext: any
  ): string[] {
    
    const advice: string[] = []
    const topPattern = patternRankings.topRecommendations[0]
    
    // Primary strategy advice
    advice.push(`Focus on ${topPattern.patternId} (${topPattern.recommendation} viability)`)
    
    // Tile management advice
    const keepCount = tileActions.filter(a => a.primaryAction === 'keep').length
    if (keepCount > 10) {
      advice.push('Consider passing some tiles to improve hand flexibility')
    } else if (keepCount < 6) {
      advice.push('Be more selective - keep tiles that help multiple patterns')
    }
    
    // Phase-specific advice
    if (gameContext.phase === 'charleston') {
      advice.push('Pass tiles that don\'t fit your target patterns')
    } else {
      advice.push('Monitor opponent discards for safe disposal opportunities')
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