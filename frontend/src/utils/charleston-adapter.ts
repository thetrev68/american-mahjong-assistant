// Charleston Adapter
// Adapts the legacy Charleston recommendation engine for the modern co-pilot architecture

import type { PatternSelectionOption } from '../../../shared/nmjl-types'
import type { PlayerTile } from '../types/tile-types'

// Modern simplified types for Charleston in co-pilot architecture
export type CharlestonPhase = 'right' | 'across' | 'left' | 'optional' | 'complete'

export interface Tile {
  id: string
  suit: string
  value: string
  isJoker?: boolean
  display?: string
  instanceId?: string // Unique identifier for this tile instance
}

export interface CharlestonRecommendation {
  tilesToPass: Tile[]
  tilesToKeep: Tile[]
  confidence: number
  reasoning: string[]
  strategicAdvice: string[]
  alternativeOptions: Array<{
    tilesToPass: Tile[]
    score: number
    reasoning: string
  }>
}

export interface TileValue {
  tile: Tile
  keepValue: number
  passValue: number
  reasoning: string[]
}

/**
 * Modern Charleston Intelligence Adapter
 * Provides Charleston recommendations focused on selected target patterns
 */
export class CharlestonAdapter {

  /**
   * Convert PlayerTile from tile store to Charleston Tile format
   */
  static convertPlayerTileToCharlestonTile(playerTile: PlayerTile): Tile {
    return {
      id: playerTile.id,
      suit: playerTile.suit,
      value: playerTile.value.toString(),
      isJoker: playerTile.isJoker,
      display: playerTile.display,
      instanceId: playerTile.instanceId
    }
  }

  /**
   * Convert Charleston Tile back to PlayerTile format
   */
  static convertCharlestonTileToPlayerTile(charlestonTile: Tile): PlayerTile {
    return {
      id: charlestonTile.id,
      suit: charlestonTile.suit as any, // Charleston uses string, PlayerTile uses specific union
      value: parseInt(charlestonTile.value) || charlestonTile.value as any,
      isJoker: charlestonTile.isJoker || false,
      display: charlestonTile.display || charlestonTile.id,
      instanceId: `charleston-${charlestonTile.id}-${Date.now()}`,
      isSelected: false
    }
  }

  /**
   * Convert array of PlayerTiles to Charleston format
   */
  static convertPlayerTilesToCharlestonTiles(playerTiles: PlayerTile[]): Tile[] {
    return playerTiles.map(tile => this.convertPlayerTileToCharlestonTile(tile))
  }

  /**
   * Convert array of Charleston tiles back to PlayerTile format
   */
  static convertCharlestonTilesToPlayerTiles(charlestonTiles: Tile[]): PlayerTile[] {
    return charlestonTiles.map(tile => this.convertCharlestonTileToPlayerTile(tile))
  }
  
  /**
   * Generate Charleston recommendations based on target patterns
   */
  static generateRecommendations(
    playerTiles: Tile[],
    targetPatterns: PatternSelectionOption[],
    phase: CharlestonPhase = 'right',
    playerCount: number = 4
  ): CharlestonRecommendation {
    
    console.log('[Charleston] Generating recommendations:', {
      tileCount: playerTiles.length,
      targetPatternCount: targetPatterns.length,
      phase,
      playerCount
    })
    
    // Step 1: Evaluate each tile against target patterns
    const tileValues = this.evaluateTilesForTargetPatterns(playerTiles, targetPatterns)
    
    // Step 2: Generate optimal pass combinations
    const passOptions = this.generateOptimalPassCombinations(tileValues)
    
    // Step 3: Select best option
    const bestOption = passOptions[0] || {
      tilesToPass: this.getDefaultPass(playerTiles),
      score: 0,
      reasoning: 'Default safe pass - no clear pattern direction'
    }
    
    const tilesToPass = bestOption.tilesToPass
    const tilesToKeep = playerTiles.filter(tile => 
      !tilesToPass.some(passedTile => passedTile.id === tile.id)
    )
    
    // Step 4: Generate strategic advice
    const strategicAdvice = this.generateStrategicAdvice(
      playerTiles,
      targetPatterns,
      phase,
      playerCount
    )
    
    // Step 5: Calculate confidence
    const confidence = this.calculateConfidence(bestOption, targetPatterns)
    
    // Step 6: Generate detailed reasoning
    const reasoning = this.generateDetailedReasoning(
      tilesToPass,
      tilesToKeep,
      targetPatterns,
      phase
    )
    
    return {
      tilesToPass,
      tilesToKeep,
      confidence,
      reasoning,
      strategicAdvice,
      alternativeOptions: passOptions.slice(1, 3)
    }
  }
  
  /**
   * Evaluate each tile's value for target patterns
   */
  private static evaluateTilesForTargetPatterns(
    playerTiles: Tile[],
    targetPatterns: PatternSelectionOption[]
  ): TileValue[] {
    
    if (targetPatterns.length === 0) {
      // No target patterns - use basic evaluation
      return this.evaluateTilesBasic(playerTiles)
    }
    
    return playerTiles.map(tile => {
      const reasoning: string[] = []
      let keepValue = 0
      let passValue = 0
      
      // Never pass jokers
      if (tile.isJoker || tile.suit === 'jokers') {
        keepValue += 50
        passValue = -50
        reasoning.push('JOKERS ARE PRECIOUS - Never pass')
        return { tile, keepValue, passValue, reasoning }
      }
      
      // Evaluate against each target pattern
      let isNeededByAnyPattern = false
      let patternMatchCount = 0
      
      targetPatterns.forEach(pattern => {
        const isNeeded = this.isTileNeededForPattern(tile, pattern)
        if (isNeeded) {
          isNeededByAnyPattern = true
          patternMatchCount++
          keepValue += 10
          reasoning.push(`Needed for ${pattern.displayName}`)
        }
      })
      
      if (!isNeededByAnyPattern) {
        passValue += 8
        reasoning.push('Not needed for any target patterns')
      } else if (patternMatchCount > 1) {
        keepValue += 5
        reasoning.push(`Flexible - needed by ${patternMatchCount} patterns`)
      }
      
      // Add tile type modifiers
      const typeModifiers = this.getTileTypeModifiers(tile)
      keepValue += typeModifiers.keepBonus
      passValue += typeModifiers.passBonus
      reasoning.push(...typeModifiers.reasoning)
      
      return { tile, keepValue, passValue, reasoning }
    })
  }
  
  /**
   * Basic tile evaluation when no target patterns selected
   */
  private static evaluateTilesBasic(playerTiles: Tile[]): TileValue[] {
    return playerTiles.map(tile => {
      const reasoning: string[] = []
      let keepValue = 0
      let passValue = 0
      
      // Never pass jokers
      if (tile.isJoker || tile.suit === 'jokers') {
        keepValue += 50
        passValue = -50
        reasoning.push('JOKERS ARE PRECIOUS - Never pass')
        return { tile, keepValue, passValue, reasoning }
      }
      
      // Basic heuristics for tile value
      if (tile.suit === 'flowers') {
        passValue += 4
        reasoning.push('Flowers have limited pattern uses')
      } else if (tile.suit === 'winds' || tile.suit === 'dragons') {
        const sameType = playerTiles.filter(t => t.suit === tile.suit && t.value === tile.value)
        if (sameType.length === 1) {
          passValue += 3
          reasoning.push('Isolated honor tile')
        } else if (sameType.length >= 3) {
          keepValue += 5
          reasoning.push('Part of potential pung/kong')
        }
      } else if (['dots', 'bams', 'cracks'].includes(tile.suit)) {
        // Check for sequence potential
        const adjacentTiles = this.findAdjacentTiles(tile, playerTiles)
        if (adjacentTiles.length > 0) {
          keepValue += 3
          reasoning.push('Sequence potential')
        }
        
        // Check for same-number potential (like numbers)
        const sameNumber = playerTiles.filter(t => 
          t.value === tile.value && ['dots', 'bams', 'cracks'].includes(t.suit)
        )
        if (sameNumber.length >= 3) {
          keepValue += 4
          reasoning.push('Like numbers potential')
        }
      }
      
      return { tile, keepValue, passValue, reasoning }
    })
  }
  
  /**
   * Check if a tile is needed for a specific pattern
   */
  private static isTileNeededForPattern(tile: Tile, pattern: PatternSelectionOption): boolean {
    // Simple heuristic - check if tile appears in pattern string
    // This is a simplified version - the full engine would use the groups data
    const patternString = pattern.pattern.toLowerCase()
    const tileId = tile.id.toLowerCase()
    
    // Check for direct matches in pattern
    if (patternString.includes(tileId)) {
      return true
    }
    
    // Check for suit/type matches
    if (tile.suit === 'dots' && patternString.includes('dot')) return true
    if (tile.suit === 'bams' && patternString.includes('bam')) return true
    if (tile.suit === 'cracks' && patternString.includes('crak')) return true
    if (tile.suit === 'winds' && patternString.includes('wind')) return true
    if (tile.suit === 'dragons' && patternString.includes('dragon')) return true
    
    // Check for number patterns
    if (['dots', 'bams', 'cracks'].includes(tile.suit)) {
      const tileNumber = tile.value
      if (patternString.includes(tileNumber)) return true
      if (patternString.includes('2025') && ['2', '0', '5'].includes(tileNumber)) return true
      if (patternString.includes('like') && patternString.includes('number')) return true
    }
    
    return false
  }
  
  /**
   * Get tile type specific modifiers
   */
  private static getTileTypeModifiers(
    tile: Tile
  ): { keepBonus: number; passBonus: number; reasoning: string[] } {
    
    const reasoning: string[] = []
    const keepBonus = 0
    let passBonus = 0
    
    // Flowers - usually safe to pass
    if (tile.suit === 'flowers') {
      passBonus += 3
      reasoning.push('Flowers rarely used in patterns')
    }
    
    // Future: Phase-specific adjustments could be added here
    
    return { keepBonus, passBonus, reasoning }
  }
  
  /**
   * Find adjacent tiles for sequence potential
   */
  private static findAdjacentTiles(tile: Tile, playerTiles: Tile[]): Tile[] {
    if (!['dots', 'bams', 'cracks'].includes(tile.suit)) return []
    
    const tileNumber = parseInt(tile.value)
    if (isNaN(tileNumber)) return []
    
    return playerTiles.filter(t => {
      if (t.suit !== tile.suit) return false
      const otherNumber = parseInt(t.value)
      if (isNaN(otherNumber)) return false
      return Math.abs(otherNumber - tileNumber) === 1
    })
  }
  
  /**
   * Generate optimal pass combinations
   */
  private static generateOptimalPassCombinations(tileValues: TileValue[]): Array<{
    tilesToPass: Tile[]
    score: number
    reasoning: string
  }> {
    
    const combinations: Array<{ tilesToPass: Tile[]; score: number; reasoning: string }> = []
    
    // Filter out jokers completely
    const passableTiles = tileValues.filter(tv => 
      !tv.tile.isJoker && tv.tile.suit !== 'jokers'
    )
    
    if (passableTiles.length < 3) {
      return [{
        tilesToPass: passableTiles.slice(0, 3).map(tv => tv.tile),
        score: 0,
        reasoning: 'Insufficient non-joker tiles for optimal selection'
      }]
    }
    
    // Sort by pass value
    const sortedForPassing = [...passableTiles].sort((a, b) => b.passValue - a.passValue)
    
    // Generate top combinations
    for (let i = 0; i < Math.min(sortedForPassing.length - 2, 8); i++) {
      for (let j = i + 1; j < Math.min(sortedForPassing.length - 1, 8); j++) {
        for (let k = j + 1; k < Math.min(sortedForPassing.length, 8); k++) {
          const tile1 = sortedForPassing[i]
          const tile2 = sortedForPassing[j]
          const tile3 = sortedForPassing[k]
          
          const tilesToPass = [tile1.tile, tile2.tile, tile3.tile]
          const score = tile1.passValue + tile2.passValue + tile3.passValue
          const keepPenalty = (tile1.keepValue + tile2.keepValue + tile3.keepValue) * 0.3
          const finalScore = score - keepPenalty
          
          const reasoning = `Pass: ${tilesToPass.map(t => t.id).join(', ')}`
          
          combinations.push({ tilesToPass, score: finalScore, reasoning })
        }
      }
    }
    
    return combinations.sort((a, b) => b.score - a.score).slice(0, 5)
  }
  
  /**
   * Generate strategic advice
   */
  private static generateStrategicAdvice(
    playerTiles: Tile[],
    targetPatterns: PatternSelectionOption[],
    phase: CharlestonPhase,
    playerCount: number
  ): string[] {
    
    const advice: string[] = []
    
    // Pattern-specific advice
    if (targetPatterns.length > 0) {
      const topPattern = targetPatterns[0]
      advice.push(`Focusing on: ${topPattern.displayName} (${topPattern.points} points)`)
      
      if (targetPatterns.length > 1) {
        advice.push(`Backup options: ${targetPatterns.length - 1} alternative patterns selected`)
      }
    } else {
      advice.push('No target patterns selected - keeping options flexible')
    }
    
    // Phase-specific advice
    switch (phase) {
      case 'right':
        advice.push('Round 1: Pass obviously unwanted tiles while preserving pattern potential')
        break
      case 'across':
        if (playerCount === 3) {
          advice.push('3-player game: Across pass is skipped')
        } else {
          advice.push('Round 2: Focus more on your strongest pattern direction')
        }
        break
      case 'left':
        advice.push('Round 3: Final refinement - only pass tiles that clearly don\'t fit')
        break
      case 'optional':
        advice.push('Optional: Only participate if you have a clear advantage')
        break
    }
    
    // Joker advice
    const jokerCount = playerTiles.filter(t => t.isJoker || t.suit === 'jokers').length
    if (jokerCount === 0) {
      advice.push('No jokers: Focus on patterns with exact tile matches')
    } else {
      advice.push(`${jokerCount} jokers: Flexibility for challenging patterns`)
    }
    
    return advice
  }
  
  /**
   * Calculate recommendation confidence
   */
  private static calculateConfidence(
    bestOption: { score: number },
    targetPatterns: PatternSelectionOption[]
  ): number {
    
    let confidence = 0.5
    
    // Higher confidence with clear target patterns
    if (targetPatterns.length > 0) {
      confidence += 0.2
    }
    
    // Higher confidence with good scores
    confidence += Math.min(bestOption.score / 30, 0.3)
    
    return Math.max(0.3, Math.min(0.95, confidence))
  }
  
  /**
   * Generate detailed reasoning
   */
  private static generateDetailedReasoning(
    tilesToPass: Tile[],
    _tilesToKeep: Tile[],
    targetPatterns: PatternSelectionOption[],
    phase: CharlestonPhase
  ): string[] {
    
    const reasoning: string[] = []
    
    // Explain what we're passing
    reasoning.push(`**Passing ${tilesToPass.length} tiles:** ${tilesToPass.map(t => t.id).join(', ')}`)
    
    if (targetPatterns.length > 0) {
      reasoning.push(`**Strategy:** Optimizing hand for ${targetPatterns.length} target pattern${targetPatterns.length > 1 ? 's' : ''}`)
    } else {
      reasoning.push(`**Strategy:** Maintaining flexibility until patterns are selected`)
    }
    
    // Phase context
    const phaseAdvice = this.getPhaseAdvice(phase)
    reasoning.push(`**Phase Context:** ${phaseAdvice}`)
    
    return reasoning
  }
  
  /**
   * Get default safe pass
   */
  private static getDefaultPass(playerTiles: Tile[]): Tile[] {
    const nonJokers = playerTiles.filter(t => !t.isJoker && t.suit !== 'jokers')
    
    // Prefer flowers, then isolated honor tiles
    const flowers = nonJokers.filter(t => t.suit === 'flowers')
    const isolated = nonJokers.filter(t => {
      if (t.suit === 'winds' || t.suit === 'dragons') {
        const same = playerTiles.filter(other => other.suit === t.suit && other.value === t.value)
        return same.length === 1
      }
      return false
    })
    
    const candidates = [...flowers, ...isolated, ...nonJokers]
    return candidates.slice(0, 3)
  }
  
  /**
   * Get phase-specific advice
   */
  private static getPhaseAdvice(phase: CharlestonPhase): string {
    switch (phase) {
      case 'right':
        return 'Early phase - pass clearly unwanted tiles, keep potential'
      case 'across':
        return 'Mid phase - start focusing on strongest patterns'
      case 'left':
        return 'Final phase - only pass tiles that clearly don\'t help'
      case 'optional':
        return 'Optional phase - only participate with clear advantage'
      default:
        return 'Strategic tile passing to optimize your hand'
    }
  }
}