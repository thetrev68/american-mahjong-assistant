// Pattern Completion Analysis Engine
// Calculates realistic completion probabilities based on tile availability and game state

interface TileAvailability {
  tileId: string
  stillNeeded: number           // How many more of this tile we need
  originalCount: number          // Total tiles of this type in complete set (usually 4)
  inPlayerHand: number          // Count in current player's hand
  exposedByOthers: number       // Count in other players' exposed sets (pungs/kongs)
  inDiscardPile: number         // Count in discard/dead pile
  remainingInWall: number       // Available tiles left to draw
  canUseJoker: boolean          // Whether joker can substitute for this tile
}

interface PatternCompletion {
  patternId: string
  patternName: string
  bestVariation: any            // Best matching variation of this pattern
  currentTiles: number          // Tiles already in hand for this pattern
  missingTiles: MissingTileGroup[]
  completionScore: number       // 0-100 overall completion score
  jokersAvailable: number       // Jokers available for this pattern
  jokersNeeded: number          // Minimum jokers needed
  probabilityScore: number      // Realistic probability of completion
  priorityAdjustment: number    // Bonus/penalty based on tile priorities
  detailedAnalysis: CompletionDetails
}

interface MissingTileGroup {
  groupName: string             // e.g., "222_1", "FFFF", "2025"
  groupType: 'pung' | 'kong' | 'sequence' | 'pair'
  tilesNeeded: TileAvailability[]
  groupPriority: number         // Strategic priority of this group
  completionProbability: number // Probability of completing this specific group
}

interface CompletionDetails {
  easyToComplete: string[]      // Tiles with high availability
  difficultToComplete: string[] // Tiles with low availability
  impossibleToComplete: string[] // Tiles with 0 availability
  jokerDependentTiles: string[] // Must use jokers
  strategicRecommendations: string[]
}

/**
 * Advanced Pattern Completion Analysis Engine
 * Calculates realistic completion probabilities based on actual game state
 */
export class PatternCompletionAnalyzer {
  
  /**
   * Analyze all patterns for completion probability based on current game state
   */
  static analyzePatternCompletions(
    playerHand: string[],
    exposedTiles: { [playerId: string]: string[] },  // Other players' exposed tiles
    discardPile: string[],
    availablePatterns: any[],
    jokersInHand: number = 0
  ): PatternCompletion[] {
    
    const allExposedTiles = Object.values(exposedTiles).flat()
    const completions: PatternCompletion[] = []
    
    for (const pattern of availablePatterns) {
      const completion = this.analyzePatternCompletion(
        pattern,
        playerHand,
        allExposedTiles,
        discardPile,
        jokersInHand
      )
      
      if (completion.completionScore > 0) {
        completions.push(completion)
      }
    }
    
    // Sort by completion score (highest first)
    return completions.sort((a, b) => b.completionScore - a.completionScore)
  }
  
  /**
   * Analyze single pattern for completion probability
   */
  static analyzePatternCompletion(
    pattern: any,
    playerHand: string[],
    exposedTiles: string[],
    discardPile: string[],
    jokersInHand: number
  ): PatternCompletion {
    
    // Step 1: Find best variation of this pattern that matches current hand
    const bestVariation = this.findBestPatternVariation(pattern, playerHand)
    
    // Step 2: Count current tiles for this pattern
    const currentTiles = this.countCurrentPatternTiles(playerHand, bestVariation)
    
    // Step 3: Analyze missing tiles and their availability
    const missingTileGroups = this.analyzeMissingTiles(
      bestVariation,
      playerHand,
      exposedTiles,
      discardPile
    )
    
    // Step 4: Calculate joker requirements
    const { jokersNeeded, jokersAvailable } = this.calculateJokerRequirements(
      missingTileGroups,
      jokersInHand
    )
    
    // Step 5: Calculate probability score
    const probabilityScore = missingTileGroups.length > 0 ? 
      missingTileGroups.reduce((avg, group) => avg + group.completionProbability, 0) / missingTileGroups.length : 
      1.0
    
    // Step 6: Apply priority adjustments (1s, 9s, sequences, etc.)
    const priorityAdjustment = this.calculatePriorityAdjustment(bestVariation)
    
    // Step 7: Calculate final completion score
    const completionScore = this.calculateFinalCompletionScore(
      currentTiles,
      probabilityScore,
      priorityAdjustment,
      jokersNeeded,
      jokersAvailable
    )
    
    // Step 8: Generate detailed analysis
    const detailedAnalysis = this.generateDetailedAnalysis(missingTileGroups)
    
    return {
      patternId: pattern.Hands_Key,
      patternName: pattern.Hand_Description,
      bestVariation,
      currentTiles,
      missingTiles: missingTileGroups,
      completionScore,
      jokersAvailable,
      jokersNeeded,
      probabilityScore,
      priorityAdjustment,
      detailedAnalysis
    }
  }
  
  /**
   * Find the pattern variation that best matches current hand
   */
  static findBestPatternVariation(pattern: any, playerHand: string[]): any {
    // This would expand the pattern into all possible variations
    // and find the one with the most tiles already in hand
    
    const handCounts = this.countTiles(playerHand)
    let bestMatch = null
    let bestScore = 0
    
    // For now, simplified - would need full pattern expansion
    const variations = this.expandPatternToVariations(pattern)
    
    for (const variation of variations) {
      const matchScore = this.calculateVariationMatch(variation, handCounts)
      if (matchScore > bestScore) {
        bestScore = matchScore
        bestMatch = variation
      }
    }
    
    return bestMatch || variations[0]
  }
  
  /**
   * Analyze missing tiles and their availability
   */
  static analyzeMissingTiles(
    patternVariation: any,
    playerHand: string[],
    exposedTiles: string[],
    discardPile: string[]
  ): MissingTileGroup[] {
    
    const handCounts = this.countTiles(playerHand)
    const exposedCounts = this.countTiles(exposedTiles)
    const discardCounts = this.countTiles(discardPile)
    const missingGroups: MissingTileGroup[] = []
    
    // Analyze each group in the pattern
    for (const group of patternVariation.groups) {
      const groupMissing = this.analyzeGroupMissing(
        group,
        handCounts,
        exposedCounts,
        discardCounts
      )
      
      if (groupMissing.tilesNeeded.length > 0) {
        missingGroups.push(groupMissing)
      }
    }
    
    return missingGroups
  }
  
  /**
   * Analyze missing tiles for a specific group
   */
  static analyzeGroupMissing(
    group: any,
    handCounts: {[tile: string]: number},
    exposedCounts: {[tile: string]: number},
    discardCounts: {[tile: string]: number}
  ): MissingTileGroup {
    
    const tilesNeeded: TileAvailability[] = []
    const requiredTiles = this.getRequiredTilesForGroup(group)
    
    for (const [tileId, neededCount] of Object.entries(requiredTiles)) {
      const inPlayerHand = handCounts[tileId] || 0
      const exposedByOthers = exposedCounts[tileId] || 0
      const inDiscardPile = discardCounts[tileId] || 0
      
      if (inPlayerHand < neededCount) {
        const stillNeeded = neededCount - inPlayerHand
        const originalCount = this.getOriginalTileCount(tileId)
        const remainingInWall = Math.max(0, 
          originalCount - inPlayerHand - exposedByOthers - inDiscardPile
        )
        
        tilesNeeded.push({
          tileId,
          stillNeeded,
          originalCount,
          inPlayerHand,
          exposedByOthers,
          inDiscardPile,
          remainingInWall,
          canUseJoker: this.canJokerSubstitute(tileId, group)
        })
      }
    }
    
    const completionProbability = this.calculateGroupCompletionProbability(tilesNeeded)
    const groupPriority = this.calculateGroupPriority(group)
    
    return {
      groupName: group.Group,
      groupType: this.getGroupType(group),
      tilesNeeded,
      groupPriority,
      completionProbability
    }
  }
  
  /**
   * Calculate completion probability for a group based on tile availability
   */
  static calculateGroupCompletionProbability(tilesNeeded: TileAvailability[]): number {
    if (tilesNeeded.length === 0) return 1.0
    
    let probability = 1.0
    
    for (const tile of tilesNeeded) {
      // Probability of getting this tile = available tiles / estimated remaining draws
      const estimatedRemainingDraws = 20 // Simplified - would calculate based on game state
      let tileProbability = Math.min(1.0, tile.remainingInWall / estimatedRemainingDraws)
      
      // If joker can substitute, add joker probability
      if (tile.canUseJoker) {
        const jokerProbability = 0.1 // Estimate based on joker availability
        tileProbability = Math.min(1.0, tileProbability + jokerProbability)
      }
      
      probability *= tileProbability
    }
    
    return probability
  }
  
  /**
   * Calculate priority adjustment based on tile/group strategic value
   */
  static calculatePriorityAdjustment(patternVariation: any): number {
    let priorityScore = 0
    
    for (const group of patternVariation.groups) {
      priorityScore += this.getGroupPriorityBonus(group)
    }
    
    return priorityScore
  }
  
  /**
   * Get priority bonus for specific group types
   */
  static getGroupPriorityBonus(group: any): number {
    let bonus = 0
    
    // Jokers are always highest priority
    if (group.Constraint_Values === 'joker') {
      return 20
    }
    
    // Terminal tiles (1s and 9s) get priority bonus
    if (group.Constraint_Values?.includes('1') || group.Constraint_Values?.includes('9')) {
      bonus += 5
    }
    
    // Terminal sequences (123, 789) get bonus
    if (group.Constraint_Type === 'sequence') {
      const values = group.Constraint_Values?.split(',') || []
      if (values.includes('1') || values.includes('9')) {
        bonus += 8
      }
    }
    
    // Dragons and winds get moderate bonus
    if (['winds', 'dragons'].includes(group.Constraint_Values)) {
      bonus += 3
    }
    
    // Flowers get penalty (harder to complete)
    if (group.Constraint_Values === 'flower') {
      bonus -= 2
    }
    
    // Pairs get penalty vs pungs/kongs
    if (group.Constraint_Type === 'pair') {
      bonus -= 3
    } else if (group.Constraint_Type === 'kong') {
      bonus += 4
    }
    
    return bonus
  }
  
  /**
   * Calculate final completion score (0-100)
   */
  static calculateFinalCompletionScore(
    currentTiles: number,
    probabilityScore: number,
    priorityAdjustment: number,
    jokersNeeded: number,
    jokersAvailable: number
  ): number {
    
    // Base score from current tiles (0-70 points)
    const baseScore = (currentTiles / 14) * 70
    
    // Probability bonus (0-20 points)  
    const probabilityBonus = probabilityScore * 20
    
    // Priority adjustment (-10 to +10 points)
    const priorityPoints = Math.max(-10, Math.min(10, priorityAdjustment))
    
    // Joker penalty if we need more jokers than available
    const jokerPenalty = Math.max(0, (jokersNeeded - jokersAvailable) * 5)
    
    const finalScore = Math.max(0, Math.min(100, 
      baseScore + probabilityBonus + priorityPoints - jokerPenalty
    ))
    
    return finalScore
  }
  
  /**
   * Generate detailed strategic analysis
   */
  static generateDetailedAnalysis(missingTileGroups: MissingTileGroup[]): CompletionDetails {
    const easyToComplete: string[] = []
    const difficultToComplete: string[] = []
    const impossibleToComplete: string[] = []
    const jokerDependentTiles: string[] = []
    const strategicRecommendations: string[] = []
    
    for (const group of missingTileGroups) {
      for (const tile of group.tilesNeeded) {
        if (tile.remainingInWall === 0 && !tile.canUseJoker) {
          impossibleToComplete.push(tile.tileId)
        } else if (tile.remainingInWall >= 2) {
          easyToComplete.push(tile.tileId)
        } else if (tile.remainingInWall === 1 || tile.canUseJoker) {
          if (tile.canUseJoker) {
            jokerDependentTiles.push(tile.tileId)
          } else {
            difficultToComplete.push(tile.tileId)
          }
        }
      }
    }
    
    // Generate recommendations
    if (impossibleToComplete.length > 0) {
      strategicRecommendations.push(
        `Consider switching patterns - ${impossibleToComplete.length} tiles are impossible to get`
      )
    }
    
    if (jokerDependentTiles.length > 3) {
      strategicRecommendations.push(
        `High joker dependency - consider patterns requiring fewer jokers`
      )
    }
    
    if (easyToComplete.length >= difficultToComplete.length) {
      strategicRecommendations.push(
        `Good completion prospects - focus on this pattern`
      )
    }
    
    return {
      easyToComplete,
      difficultToComplete,
      impossibleToComplete,
      jokerDependentTiles,
      strategicRecommendations
    }
  }
  
  // Helper methods
  private static countTiles(tiles: string[]): {[tile: string]: number} {
    const counts: {[tile: string]: number} = {}
    for (const tile of tiles) {
      counts[tile] = (counts[tile] || 0) + 1
    }
    return counts
  }
  
  private static getOriginalTileCount(tileId: string): number {
    // Most tiles have 4 copies, jokers typically 8, flowers might vary
    if (tileId === 'joker') return 8
    if (tileId.startsWith('flower')) return 1
    return 4
  }
  
  private static canJokerSubstitute(tileId: string, group: any): boolean {
    // Jokers typically can't substitute for other jokers or in some special groups
    if (tileId === 'joker') return false
    return group.Jokers_Allowed !== false
  }
  
  private static getGroupType(group: any): 'pung' | 'kong' | 'sequence' | 'pair' {
    return group.Constraint_Type || 'sequence'
  }
  
  private static expandPatternToVariations(pattern: any): any[] {
    // Simplified - would use the full pattern expansion logic
    return [pattern] // Placeholder
  }
  
  private static calculateVariationMatch(variation: any, handCounts: {[tile: string]: number}): number {
    // Calculate how well this variation matches current hand
    let totalMatches = 0
    
    for (const group of variation.groups || []) {
      // Count how many tiles we have for this group
      const requiredTiles = this.getGroupRequiredTiles(group)
      for (const tileId of requiredTiles) {
        const haveCount = handCounts[tileId] || 0
        const needCount = 1 // Simplified - each tile needed once
        totalMatches += Math.min(haveCount, needCount)
      }
    }
    
    return totalMatches
  }
  
  private static countCurrentPatternTiles(playerHand: string[], variation: any): number {
    // Count tiles in hand that match this pattern variation
    const handCounts = this.countTiles(playerHand)
    return this.calculateVariationMatch(variation, handCounts)
  }
  
  private static getRequiredTilesForGroup(group: any): {[tile: string]: number} {
    // Extract required tiles for this group
    const requiredTiles: {[tile: string]: number} = {}
    
    // Parse group constraints to determine required tiles
    const constraintType = group.Constraint_Type || 'sequence'
    const constraintValues = group.Constraint_Values || ''
    
    if (constraintType === 'sequence') {
      // Example: parse "123" into tiles like "1dots", "2dots", "3dots" 
      for (const char of constraintValues) {
        if (char >= '1' && char <= '9') {
          requiredTiles[`${char}dots`] = 1 // Simplified - would need suit parsing
        }
      }
    }
    
    return requiredTiles
  }
  
  private static getGroupRequiredTiles(group: any): string[] {
    // Get array of required tiles for this group (used by calculateVariationMatch)
    const requiredTilesMap = this.getRequiredTilesForGroup(group)
    return Object.keys(requiredTilesMap)
  }

  private static calculateJokerRequirements(
    missingGroups: MissingTileGroup[], 
    jokersInHand: number
  ): { jokersNeeded: number, jokersAvailable: number } {
    // Calculate minimum jokers needed vs available
    let totalJokersNeeded = 0
    
    for (const group of missingGroups) {
      // Count tiles that can only be completed with jokers
      for (const tileInfo of group.tilesNeeded) {
        if (tileInfo.remainingInWall === 0 && tileInfo.canUseJoker) {
          totalJokersNeeded += Math.min(tileInfo.stillNeeded || 1, 1)
        }
      }
    }
    
    return { 
      jokersNeeded: totalJokersNeeded, 
      jokersAvailable: jokersInHand 
    }
  }
  
  private static calculateGroupPriority(group: any): number {
    // Calculate strategic priority for this group
    let priority = 5 // Base priority
    
    const constraintType = group.Constraint_Type || 'sequence'
    const constraintValues = group.Constraint_Values || ''
    
    // Higher priority for terminal sequences (1-2-3, 7-8-9)
    if (constraintType === 'sequence') {
      if (constraintValues.includes('1') || constraintValues.includes('9')) {
        priority += 2
      }
    }
    
    // Higher priority for honor tiles
    if (constraintValues.includes('dragon') || constraintValues.includes('wind')) {
      priority += 1
    }
    
    // Kong and pung get priority bonuses
    if (constraintType === 'kong') {
      priority += 3
    } else if (constraintType === 'pung') {
      priority += 2
    }
    
    return priority
  }
}