// Intelligence Calculations Engine
// Implements the specific mathematical formulas for pattern completion analysis

/**
 * Your Intelligence Calculations Implementation
 * Based on the specific requirements you outlined
 */
export class IntelligenceCalculations {
  
  /**
   * 1. Count how many tiles out of 14 are in hand for the selected pattern
   * Use the pattern version where the hand has the most tiles
   */
  static calculateCurrentPatternTiles(
    playerHand: string[],
    pattern: any
  ): {
    currentTileCount: number,
    bestVariation: any,
    matchDetails: { [groupName: string]: number }
  } {
    
    const patternVariations = this.expandPatternToAllVariations(pattern)
    let bestMatch = 0
    let bestVariation = null
    let bestMatchDetails = {}
    
    const handCounts = this.countTiles(playerHand)
    
    for (const variation of patternVariations) {
      let matchCount = 0
      const matchDetails: { [groupName: string]: number } = {}
      
      for (const group of variation.groups) {
        const groupMatches = this.countGroupMatches(group, handCounts)
        matchCount += groupMatches
        matchDetails[group.Group] = groupMatches
      }
      
      if (matchCount > bestMatch) {
        bestMatch = matchCount
        bestVariation = variation
        bestMatchDetails = matchDetails
      }
    }
    
    return {
      currentTileCount: bestMatch,
      bestVariation,
      matchDetails: bestMatchDetails
    }
  }
  
  /**
   * 2. Identify availability for each remaining tile (2a-2d)
   */
  static calculateTileAvailability(
    tileId: string,
    playerHand: string[],
    exposedTiles: string[],
    discardPile: string[]
  ): {
    originalCount: number,      // 2a. How many tiles included originally?
    inPlayerHand: number,       // 2b. How many tiles in this player's hand?
    exposedByOthers: number,    // 2c. How many tiles already exposed/public?
    inDiscardPile: number,      // 2d. How many tiles in discard/dead pile?
    remainingInWall: number     // 3. How many remain in the wall
  } {
    
    const handCounts = this.countTiles(playerHand)
    const exposedCounts = this.countTiles(exposedTiles)
    const discardCounts = this.countTiles(discardPile)
    
    const originalCount = this.getOriginalTileCount(tileId)
    const inPlayerHand = handCounts[tileId] || 0
    const exposedByOthers = exposedCounts[tileId] || 0
    const inDiscardPile = discardCounts[tileId] || 0
    
    const remainingInWall = Math.max(0, 
      originalCount - inPlayerHand - exposedByOthers - inDiscardPile
    )
    
    return {
      originalCount,
      inPlayerHand,
      exposedByOthers,
      inDiscardPile,
      remainingInWall
    }
  }
  
  /**
   * 4. Identify whether a joker could be used for any missing tiles
   */
  static calculateJokerSubstitution(
    missingTiles: string[],
    pattern: any,
    jokersInHand: number
  ): {
    jokerSubstitutableTiles: string[],
    jokersNeeded: number,
    jokersAvailable: number,
    substitutionPlan: { [tileId: string]: boolean }
  } {
    
    const jokerSubstitutableTiles: string[] = []
    const substitutionPlan: { [tileId: string]: boolean } = {}
    
    for (const tileId of missingTiles) {
      const canSubstitute = this.canJokerSubstituteForTile(tileId, pattern)
      if (canSubstitute) {
        jokerSubstitutableTiles.push(tileId)
      }
      substitutionPlan[tileId] = canSubstitute
    }
    
    // Prioritize which tiles to use jokers for
    const prioritizedJokerUse = this.prioritizeJokerUsage(
      jokerSubstitutableTiles, 
      pattern
    )
    
    const jokersNeeded = Math.min(prioritizedJokerUse.length, jokersInHand)
    
    return {
      jokerSubstitutableTiles,
      jokersNeeded,
      jokersAvailable: jokersInHand,
      substitutionPlan
    }
  }
  
  /**
   * 5. Add priority values to weight probabilities
   * (tiles 1 and 9 win more often than 6, sequences 123/789 more than others)
   */
  static calculatePriorityWeights(
    tiles: string[],
    groups: any[]
  ): {
    tilePriorities: { [tileId: string]: number },
    groupPriorities: { [groupName: string]: number },
    overallPriorityScore: number
  } {
    
    const tilePriorities: { [tileId: string]: number } = {}
    const groupPriorities: { [groupName: string]: number } = {}
    
    // Calculate individual tile priorities
    for (const tileId of tiles) {
      tilePriorities[tileId] = this.getTilePriorityScore(tileId)
    }
    
    // Calculate group priorities
    for (const group of groups) {
      groupPriorities[group.Group] = this.getGroupPriorityScore(group)
    }
    
    // Calculate overall priority score
    const tilePrioritySum = Object.values(tilePriorities).reduce((a, b) => a + b, 0)
    const groupPrioritySum = Object.values(groupPriorities).reduce((a, b) => a + b, 0)
    const overallPriorityScore = (tilePrioritySum + groupPrioritySum) / (tiles.length + groups.length)
    
    return {
      tilePriorities,
      groupPriorities,
      overallPriorityScore
    }
  }
  
  /**
   * Final weighted completion score combining all factors
   */
  static calculateFinalIntelligenceScore(
    currentTiles: number,
    tileAvailabilities: Array<{ remainingInWall: number, canUseJoker: boolean }>,
    jokerAnalysis: { jokersNeeded: number, jokersAvailable: number },
    priorityWeights: { overallPriorityScore: number }
  ): {
    completionScore: number,     // 0-100 overall completion score
    components: {
      currentTileScore: number,  // Points for tiles already in hand
      availabilityScore: number, // Points for tile availability
      jokerScore: number,        // Points for joker situation
      priorityScore: number      // Points for strategic priority
    },
    recommendation: 'excellent' | 'good' | 'fair' | 'poor' | 'impossible'
  } {
    
    // Component 1: Current tile score (0-40 points)
    const currentTileScore = (currentTiles / 14) * 40
    
    // Component 2: Availability score (0-30 points)
    const totalAvailability = tileAvailabilities.reduce((sum, tile) => 
      sum + tile.remainingInWall + (tile.canUseJoker ? 2 : 0), 0
    )
    const availabilityScore = Math.min(30, totalAvailability * 2)
    
    // Component 3: Joker score (0-20 points)
    const jokerBalance = jokerAnalysis.jokersAvailable - jokerAnalysis.jokersNeeded
    const jokerScore = jokerBalance >= 0 
      ? Math.min(20, jokerBalance * 5 + 10)  // Bonus for excess jokers
      : Math.max(0, 10 + jokerBalance * 3)   // Penalty for joker shortage
    
    // Component 4: Priority score (0-10 points)
    const priorityScore = Math.min(10, priorityWeights.overallPriorityScore)
    
    // Calculate final score
    const completionScore = Math.min(100, 
      currentTileScore + availabilityScore + jokerScore + priorityScore
    )
    
    // Generate recommendation
    let recommendation: 'excellent' | 'good' | 'fair' | 'poor' | 'impossible'
    if (completionScore >= 80) recommendation = 'excellent'
    else if (completionScore >= 65) recommendation = 'good'
    else if (completionScore >= 45) recommendation = 'fair'
    else if (completionScore >= 25) recommendation = 'poor'
    else recommendation = 'impossible'
    
    return {
      completionScore,
      components: {
        currentTileScore,
        availabilityScore,
        jokerScore,
        priorityScore
      },
      recommendation
    }
  }
  
  /**
   * Get priority score for individual tiles
   * Your rule: "tiles 1 and 9 win more often than 6"
   */
  private static getTilePriorityScore(tileId: string): number {
    let score = 5 // Base score
    
    // Extract number from tile ID (e.g., "1dots" -> "1")
    const numberMatch = tileId.match(/(\d+)/)
    if (numberMatch) {
      const number = parseInt(numberMatch[1])
      
      // Terminal tiles (1, 9) get highest priority
      if (number === 1 || number === 9) {
        score += 3
      }
      // Middle tiles (4, 5, 6) get lower priority  
      else if (number >= 4 && number <= 6) {
        score -= 1
      }
      // Other numbers (2, 3, 7, 8) get standard priority
    }
    
    // Honor tiles get moderate bonus
    if (tileId.includes('wind') || tileId.includes('dragon')) {
      score += 2
    }
    
    // Jokers get maximum priority
    if (tileId.includes('joker')) {
      score += 5
    }
    
    // Flowers get penalty (harder to collect)
    if (tileId.includes('flower')) {
      score -= 2
    }
    
    return score
  }
  
  /**
   * Get priority score for groups
   * Your rule: "sequences with 123 or 789 more often win than other groups"
   */
  private static getGroupPriorityScore(group: any): number {
    let score = 5 // Base score
    
    if (group.Constraint_Type === 'sequence') {
      const values = group.Constraint_Values?.split(',') || []
      
      // Terminal sequences (123, 789) get highest bonus
      if (this.isTerminalSequence(values)) {
        score += 4
      }
      // Middle sequences get standard score
      else {
        score += 1
      }
    }
    else if (group.Constraint_Type === 'kong') {
      // Kongs are harder but worth more
      score += 3
    }
    else if (group.Constraint_Type === 'pung') {
      // Pungs are balanced
      score += 2
    }
    else if (group.Constraint_Type === 'pair') {
      // Pairs are easier but worth less
      score += 1
    }
    
    // Special bonuses
    if (group.Constraint_Values === 'joker') {
      score += 5 // Joker groups are very valuable
    }
    
    if (group.Constraint_Values?.includes('1') || group.Constraint_Values?.includes('9')) {
      score += 2 // Groups with terminal tiles
    }
    
    return score
  }
  
  /**
   * Check if sequence contains terminal tiles (123 or 789 patterns)
   */
  private static isTerminalSequence(values: string[]): boolean {
    const numbers = values.map(v => parseInt(v)).filter(n => !isNaN(n)).sort()
    
    // Check for 123 pattern
    if (numbers.length >= 3 && numbers[0] === 1 && numbers[1] === 2 && numbers[2] === 3) {
      return true
    }
    
    // Check for 789 pattern  
    if (numbers.length >= 3 && numbers[0] === 7 && numbers[1] === 8 && numbers[2] === 9) {
      return true
    }
    
    return false
  }
  
  /**
   * Prioritize which tiles to use jokers for (use for hardest to get tiles first)
   */
  private static prioritizeJokerUsage(
    jokerSubstitutableTiles: string[],
    pattern: any
  ): string[] {
    // Sort by priority: harder to get tiles should use jokers first
    return jokerSubstitutableTiles.sort((a, b) => {
      const priorityA = this.getTilePriorityScore(a)
      const priorityB = this.getTilePriorityScore(b)
      return priorityB - priorityA // Higher priority first
    })
  }
  
  // Helper methods
  private static countTiles(tiles: string[]): { [tile: string]: number } {
    const counts: { [tile: string]: number } = {}
    for (const tile of tiles) {
      counts[tile] = (counts[tile] || 0) + 1
    }
    return counts
  }
  
  private static getOriginalTileCount(tileId: string): number {
    if (tileId.includes('joker')) return 8
    if (tileId.includes('flower')) return 1
    return 4 // Standard tiles
  }
  
  private static canJokerSubstituteForTile(tileId: string, pattern: any): boolean {
    // Jokers can't substitute for other jokers
    if (tileId.includes('joker')) return false
    
    // Check pattern rules for joker substitution
    // This would need to examine the specific group rules
    return true // Simplified
  }
  
  private static expandPatternToAllVariations(pattern: any): any[] {
    // This would expand the pattern into all possible tile combinations
    return [pattern] // Simplified
  }
  
  private static countGroupMatches(group: any, handCounts: { [tile: string]: number }): number {
    // Count how many tiles in hand match this group's requirements
    return 0 // Placeholder - would implement group matching logic
  }
}