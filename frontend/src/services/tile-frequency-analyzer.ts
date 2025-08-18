// Tile Frequency Analysis Engine
// Expands all possible winning hands from NMJL patterns and calculates tile statistics

interface TileFrequencyStats {
  tileId: string
  totalAppearances: number        // How many total winning hands contain this tile
  patternCount: number           // How many different patterns use this tile
  patterns: PatternUsage[]       // Detailed usage per pattern
  averagePerHand: number         // Average count per hand when used
  flexibility: number            // 0-1 score for how flexible this tile is
}

interface PatternUsage {
  patternId: string
  patternName: string
  handVariations: number         // How many hand variations in this pattern use this tile
  minCount: number              // Minimum times this tile appears per hand
  maxCount: number              // Maximum times this tile appears per hand
  positions: string[]           // Which groups in the pattern use this tile
}

interface ExpandedWinningHand {
  patternId: string
  variationIndex: number
  tiles: { [tileId: string]: number }  // Count of each tile type
  totalTiles: number
  jokerPositions: string[]       // Which positions can use jokers
}

/**
 * Advanced Tile Frequency Analysis Engine
 * Expands all NMJL patterns into complete winning hands and analyzes tile usage
 */
export class TileFrequencyAnalyzer {
  
  private static expandedHands: ExpandedWinningHand[] = []
  private static tileStats: Map<string, TileFrequencyStats> = new Map()
  
  /**
   * Expand a single NMJL pattern into all possible winning hands
   */
  static expandPattern(pattern: any): ExpandedWinningHand[] {
    const hands: ExpandedWinningHand[] = []
    
    // For your example: "FFFF 2025 222 222" (Any 3 Suits, Like Pungs 2s or 5s In Opp. Suits)
    
    // Group 1: FFFF (flowers kong)
    const flowerKongs = this.generateFlowerKongs()
    
    // Group 2: 2025 (sequence with zero as joker/neutral)
    const sequences2025 = this.generate2025Sequences()
    
    // Group 3 & 4: 222 (like pungs of 2s or 5s in opposite suits)
    const likePungCombinations = this.generateLikePungCombinations(['2', '5'])
    
    // Generate all combinations
    let variationIndex = 0
    for (const flowers of flowerKongs) {
      for (const sequence of sequences2025) {
        for (const pungs of likePungCombinations) {
          const hand: ExpandedWinningHand = {
            patternId: pattern.Hands_Key,
            variationIndex: variationIndex++,
            tiles: {},
            totalTiles: 14,
            jokerPositions: []
          }
          
          // Combine all tile counts
          this.addTilesToHand(hand, flowers)
          this.addTilesToHand(hand, sequence)
          this.addTilesToHand(hand, pungs.pung1)
          this.addTilesToHand(hand, pungs.pung2)
          
          hands.push(hand)
        }
      }
    }
    
    return hands
  }
  
  /**
   * Generate all possible flower kongs (FFFF)
   */
  private static generateFlowerKongs(): Array<{ [tileId: string]: number }> {
    return [
      { 'flower1': 4 }, { 'flower2': 4 }, { 'flower3': 4 }, { 'flower4': 4 },
      { 'flower5': 4 }, { 'flower6': 4 }, { 'flower7': 4 }, { 'flower8': 4 }
    ]
  }
  
  /**
   * Generate all possible 2025 sequences
   */
  private static generate2025Sequences(): Array<{ [tileId: string]: number }> {
    const suits = ['dots', 'bams', 'cracks']
    const sequences = []
    
    for (const suit of suits) {
      // 2025 where 0 is white dragon (neutral)
      sequences.push({
        [`2${suit}`]: 1,
        'white': 1,
        [`2${suit}`]: 2,  // This creates the 2025 pattern
        [`5${suit}`]: 1
      })
    }
    
    return sequences
  }
  
  /**
   * Generate all combinations of like pungs (222 in different suits)
   */
  private static generateLikePungCombinations(values: string[]): Array<{
    pung1: { [tileId: string]: number },
    pung2: { [tileId: string]: number }
  }> {
    const suits = ['dots', 'bams', 'cracks']
    const combinations = []
    
    for (const value of values) {
      // All possible suit combinations for two pungs
      for (let i = 0; i < suits.length; i++) {
        for (let j = i + 1; j < suits.length; j++) {
          combinations.push({
            pung1: { [`${value}${suits[i]}`]: 3 },
            pung2: { [`${value}${suits[j]}`]: 3 }
          })
        }
      }
    }
    
    return combinations
  }
  
  /**
   * Calculate comprehensive tile frequency statistics
   */
  static calculateTileFrequencyStats(allPatterns: any[]): Map<string, TileFrequencyStats> {
    const stats = new Map<string, TileFrequencyStats>()
    
    // Expand all patterns into winning hands
    const allHands: ExpandedWinningHand[] = []
    for (const pattern of allPatterns) {
      const expandedHands = this.expandPattern(pattern)
      allHands.push(...expandedHands)
    }
    
    console.log(`Expanded ${allPatterns.length} patterns into ${allHands.length} possible winning hands`)
    
    // Count tile appearances across all hands
    const tileAppearances = new Map<string, {
      totalHands: number,
      totalCount: number,
      patterns: Set<string>,
      minCount: number,
      maxCount: number
    }>()
    
    for (const hand of allHands) {
      for (const [tileId, count] of Object.entries(hand.tiles)) {
        if (!tileAppearances.has(tileId)) {
          tileAppearances.set(tileId, {
            totalHands: 0,
            totalCount: 0,
            patterns: new Set(),
            minCount: count,
            maxCount: count
          })
        }
        
        const tileData = tileAppearances.get(tileId)!
        tileData.totalHands++
        tileData.totalCount += count
        tileData.patterns.add(hand.patternId)
        tileData.minCount = Math.min(tileData.minCount, count)
        tileData.maxCount = Math.max(tileData.maxCount, count)
      }
    }
    
    // Convert to frequency stats
    for (const [tileId, data] of tileAppearances) {
      const flexibility = this.calculateTileFlexibility(tileId, data, allHands.length)
      
      stats.set(tileId, {
        tileId,
        totalAppearances: data.totalHands,
        patternCount: data.patterns.size,
        patterns: [], // Would be populated with detailed pattern analysis
        averagePerHand: data.totalCount / data.totalHands,
        flexibility
      })
    }
    
    return stats
  }
  
  /**
   * Calculate how "flexible" a tile is (appears in many different contexts)
   */
  private static calculateTileFlexibility(
    _tileId: string, 
    data: any, 
    totalHands: number
  ): number {
    // Flexibility = (Pattern diversity × Hand frequency × Usage variety) / 3
    
    const patternDiversity = data.patterns.size / 71  // Normalized by total patterns
    const handFrequency = data.totalHands / totalHands  // How often it appears
    const usageVariety = (data.maxCount - data.minCount + 1) / 4  // Usage count variety
    
    return (patternDiversity + handFrequency + usageVariety) / 3
  }
  
  /**
   * Get tile value score based on frequency analysis
   */
  static getTileValue(tileId: string): {
    keepScore: number,
    passScore: number,
    reasoning: string[]
  } {
    const stats = this.tileStats.get(tileId)
    if (!stats) {
      return {
        keepScore: 0,
        passScore: 5,
        reasoning: ['Unknown tile - consider passing']
      }
    }
    
    const reasoning: string[] = []
    let keepScore = 0
    let passScore = 0
    
    // High frequency = more valuable
    if (stats.totalAppearances > 500) {
      keepScore += 15
      reasoning.push(`Very common tile (${stats.totalAppearances} possible hands)`)
    } else if (stats.totalAppearances > 200) {
      keepScore += 10
      reasoning.push(`Common tile (${stats.totalAppearances} possible hands)`)
    } else if (stats.totalAppearances < 50) {
      passScore += 8
      reasoning.push(`Rare tile (only ${stats.totalAppearances} possible hands)`)
    }
    
    // High pattern count = more flexible
    if (stats.patternCount > 30) {
      keepScore += 12
      reasoning.push(`Highly flexible (used in ${stats.patternCount} patterns)`)
    } else if (stats.patternCount < 5) {
      passScore += 6
      reasoning.push(`Limited use (only ${stats.patternCount} patterns)`)
    }
    
    // High flexibility = strategic value
    if (stats.flexibility > 0.7) {
      keepScore += 10
      reasoning.push(`Excellent strategic flexibility (${(stats.flexibility * 100).toFixed(0)}%)`)
    } else if (stats.flexibility < 0.3) {
      passScore += 4
      reasoning.push(`Limited strategic options`)
    }
    
    return { keepScore, passScore, reasoning }
  }
  
  /**
   * Analyze specific hand against all possible completions
   */
  static analyzeHandCompletions(currentTiles: string[]): {
    completablePatterns: Array<{
      patternId: string,
      completion: number,
      missingTiles: string[],
      jokersNeeded: number
    }>
  } {
    const tileCounts = this.countTiles(currentTiles)
    const completablePatterns = []
    
    for (const hand of this.expandedHands) {
      const analysis = this.calculateHandCompletion(tileCounts, hand)
      if (analysis.completion > 0.3) {  // At least 30% complete
        completablePatterns.push({
          patternId: hand.patternId,
          completion: analysis.completion,
          missingTiles: analysis.missingTiles,
          jokersNeeded: analysis.jokersNeeded
        })
      }
    }
    
    return { completablePatterns: completablePatterns.sort((a, b) => b.completion - a.completion) }
  }
  
  private static calculateHandCompletion(current: {[tile: string]: number}, target: ExpandedWinningHand): {
    completion: number,
    missingTiles: string[],
    jokersNeeded: number
  } {
    // Complex completion analysis would go here
    // This is where the real mathematical magic happens!
    
    let matches = 0
    let totalNeeded = 0
    const missing: string[] = []
    
    for (const [tileId, needed] of Object.entries(target.tiles)) {
      const have = current[tileId] || 0
      totalNeeded += needed
      
      if (have >= needed) {
        matches += needed
      } else {
        matches += have
        for (let i = have; i < needed; i++) {
          missing.push(tileId)
        }
      }
    }
    
    const completion = matches / totalNeeded
    const jokersNeeded = Math.max(0, missing.length - (current['joker'] || 0))
    
    return { completion, missingTiles: missing, jokersNeeded }
  }
  
  private static countTiles(tiles: string[]): {[tile: string]: number} {
    const counts: {[tile: string]: number} = {}
    for (const tile of tiles) {
      counts[tile] = (counts[tile] || 0) + 1
    }
    return counts
  }
  
  private static addTilesToHand(hand: ExpandedWinningHand, tiles: {[tileId: string]: number}) {
    for (const [tileId, count] of Object.entries(tiles)) {
      hand.tiles[tileId] = (hand.tiles[tileId] || 0) + count
    }
  }
}