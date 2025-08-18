// Enhanced Analysis Engine
// Mathematical intelligence system with sophisticated pattern completion analysis
// Integrates the new intelligence calculations with existing interface

import type { PatternSelectionOption } from '../../../shared/nmjl-types'
import type { PlayerTile } from '../types/tile-types'
import type { HandAnalysis, PatternRecommendation, TileRecommendation } from '../stores/intelligence-store'
import { nmjlService } from './nmjl-service'

interface TileCount {
  [tileId: string]: number
}

interface PatternMatchResult {
  pattern: PatternSelectionOption
  completionPercentage: number
  tilesMatched: number
  tilesNeeded: number
  missingTiles: string[]
  canUseJokers: boolean
  jokersNeeded: number
  confidence: number
  strategicValue: number
  estimatedTurns: number
}

interface GameStateContext {
  playerHand: string[]
  exposedTiles: { [playerId: string]: string[] }
  discardPile: string[]
  jokersInHand: number
  currentTurn: number
  totalPlayers: number
}

export class AnalysisEngine {
  /**
   * Main analysis function - enhanced with mathematical intelligence
   */
  static async analyzeHand(
    playerTiles: PlayerTile[],
    selectedPatterns: PatternSelectionOption[] = []
  ): Promise<HandAnalysis> {
    console.log('=== Analysis Engine Debug ===')
    console.log('Input player tiles:', playerTiles)
    console.log('Input selected patterns:', selectedPatterns)
    
    // Get all available patterns if none selected
    const patternsToAnalyze = selectedPatterns.length > 0 
      ? selectedPatterns 
      : await nmjlService.getSelectionOptions()
    
    console.log('Patterns to analyze:', patternsToAnalyze.length)

    // Count player tiles for efficient lookups
    const tileCount = this.countTiles(playerTiles)
    const availableJokers = this.countJokers(playerTiles)

    // Create game state context for enhanced analysis
    const gameState: GameStateContext = {
      playerHand: playerTiles.map(tile => tile.id),
      exposedTiles: {}, // Empty for pattern selection phase
      discardPile: [],
      jokersInHand: availableJokers,
      currentTurn: 1,
      totalPlayers: 4
    }

    // Analyze each pattern with enhanced intelligence
    const patternResults = patternsToAnalyze.map(pattern => 
      this.analyzePatternWithIntelligence(pattern, tileCount, availableJokers, gameState)
    )

    // Sort by strategic value (best patterns first)
    const sortedResults = patternResults
      .filter(result => result.completionPercentage > 0) // Keep any pattern with some progress
      .sort((a, b) => b.strategicValue - a.strategicValue)
      .slice(0, 10) // Top 10 patterns
    
    console.log(`Sorted results: ${sortedResults.length} patterns`)
    console.log('Top 3 patterns:', sortedResults.slice(0, 3).map(r => ({ 
      id: r.pattern.id, 
      completion: r.completionPercentage, 
      strategic: r.strategicValue 
    })))

    // Generate enhanced pattern recommendations
    const recommendedPatterns = sortedResults.slice(0, 5).map((result, index) => {
      const enhancedAnalysis = this.generateEnhancedAnalysis(result, playerTiles, availableJokers, gameState)
      
      return {
        pattern: result.pattern,
        confidence: Math.round(result.confidence),
        completionPercentage: Math.round(result.completionPercentage),
        reasoning: this.generatePatternReasoning(result, index),
        difficulty: result.pattern.difficulty,
        isPrimary: index === 0,
        analysis: enhancedAnalysis.analysis,
        scoreBreakdown: enhancedAnalysis.scoreBreakdown,
        recommendations: enhancedAnalysis.recommendations
      }
    })

    // Generate detailed pattern analysis
    const bestPatterns = sortedResults.slice(0, 5).map(result => ({
      patternId: result.pattern.id,
      section: result.pattern.section,
      line: result.pattern.line,
      pattern: result.pattern.pattern,
      groups: result.pattern.groups,
      completionPercentage: Math.round(result.completionPercentage),
      tilesNeeded: result.tilesNeeded,
      missingTiles: result.missingTiles,
      confidenceScore: Math.round(result.confidence),
      difficulty: result.pattern.difficulty,
      estimatedTurns: result.estimatedTurns,
      riskLevel: this.calculateRiskLevel(result.completionPercentage, result.tilesNeeded),
      strategicValue: Math.round(result.strategicValue)
    }))

    // Generate tile recommendations - always generate them even if no good patterns
    const tileRecommendations = this.generateTileRecommendations(
      playerTiles, 
      sortedResults[0] || null, // Best pattern or null
      tileCount
    )

    // Generate strategic advice
    const strategicAdvice = this.generateStrategicAdvice(sortedResults, recommendedPatterns[0])

    // Calculate overall score
    const overallScore = sortedResults.length > 0 
      ? Math.round(sortedResults[0].completionPercentage) 
      : 0

    return {
      overallScore,
      recommendedPatterns,
      bestPatterns,
      tileRecommendations,
      strategicAdvice,
      lastUpdated: Date.now(),
      analysisVersion: "AV2-Intelligence",
      threats: [] // TODO: Implement threat analysis
    }
  }

  /**
   * Enhanced pattern analysis with mathematical intelligence
   */
  private static analyzePatternWithIntelligence(
    pattern: PatternSelectionOption,
    _tileCount: TileCount,
    _availableJokers: number,
    gameState: GameStateContext
  ): PatternMatchResult {
    
    // Step 1: Count current pattern tiles using sophisticated matching
    const currentTileAnalysis = this.calculateCurrentPatternTiles(gameState.playerHand, pattern)
    
    // Step 2: Calculate missing tiles and availability
    const missingTileAnalysis = this.analyzeMissingTiles(pattern, gameState)
    
    // Step 3: Analyze joker situation
    const jokerAnalysis = this.calculateJokerSubstitution(
      missingTileAnalysis.allMissingTiles,
      pattern,
      gameState.jokersInHand
    )
    
    // Step 4: Calculate strategic priorities
    const priorityAnalysis = this.calculatePriorityWeights(
      gameState.playerHand,
      pattern.groups || []
    )
    
    // Step 5: Calculate final intelligence score
    const finalScore = this.calculateFinalIntelligenceScore(
      currentTileAnalysis.currentTileCount,
      missingTileAnalysis.availabilities,
      jokerAnalysis,
      priorityAnalysis
    )

    return {
      pattern,
      completionPercentage: finalScore.completionScore,
      tilesMatched: currentTileAnalysis.currentTileCount,
      tilesNeeded: 14 - currentTileAnalysis.currentTileCount,
      missingTiles: missingTileAnalysis.allMissingTiles,
      canUseJokers: jokerAnalysis.jokerSubstitutableTiles.length > 0,
      jokersNeeded: jokerAnalysis.jokersNeeded,
      confidence: finalScore.completionScore,
      strategicValue: finalScore.completionScore * priorityAnalysis.overallPriorityScore / 10,
      estimatedTurns: Math.ceil((14 - currentTileAnalysis.currentTileCount) / 2)
    }
  }

  /**
   * Generate enhanced analysis breakdown
   */
  private static generateEnhancedAnalysis(
    result: PatternMatchResult, 
    _playerTiles: PlayerTile[], 
    availableJokers: number,
    gameState: GameStateContext
  ) {
    const missingTileAnalysis = this.analyzeMissingTiles(result.pattern, gameState)
    const jokerAnalysis = this.calculateJokerSubstitution(
      missingTileAnalysis.allMissingTiles,
      result.pattern,
      availableJokers
    )
    const priorityAnalysis = this.calculatePriorityWeights(
      gameState.playerHand,
      result.pattern.groups || []
    )

    return {
      analysis: {
        currentTiles: {
          count: result.tilesMatched,
          percentage: (result.tilesMatched / 14) * 100,
          matchingGroups: Object.keys(missingTileAnalysis.matchDetails).filter(
            group => missingTileAnalysis.matchDetails[group] > 0
          )
        },
        missingTiles: {
          total: missingTileAnalysis.allMissingTiles.length,
          byAvailability: missingTileAnalysis.categorizedMissing
        },
        jokerSituation: {
          available: jokerAnalysis.jokersAvailable,
          needed: jokerAnalysis.jokersNeeded,
          canComplete: jokerAnalysis.jokersAvailable >= jokerAnalysis.jokersNeeded,
          substitutionPlan: jokerAnalysis.substitutionPlan
        },
        strategicValue: {
          tilePriorities: priorityAnalysis.tilePriorities,
          groupPriorities: priorityAnalysis.groupPriorities,
          overallPriority: priorityAnalysis.overallPriorityScore,
          reasoning: this.generatePriorityReasoning(priorityAnalysis)
        },
        gameState: {
          wallTilesRemaining: this.estimateWallTilesRemaining(gameState),
          turnsEstimated: Math.ceil(result.tilesNeeded / 2),
          drawProbability: this.calculateDrawProbability(result.missingTiles, 80)
        }
      },
      scoreBreakdown: {
        currentTileScore: (result.tilesMatched / 14) * 40,
        availabilityScore: Math.min(30, missingTileAnalysis.totalAvailability * 2),
        jokerScore: jokerAnalysis.jokersAvailable >= jokerAnalysis.jokersNeeded ? 20 : 10,
        priorityScore: Math.min(10, priorityAnalysis.overallPriorityScore)
      },
      recommendations: {
        shouldPursue: result.completionPercentage >= 45,
        alternativePatterns: [],
        strategicNotes: this.generateStrategicNotes(result),
        riskFactors: this.generateRiskFactors(result, jokerAnalysis)
      }
    }
  }

  // Mathematical Intelligence Methods

  /**
   * Calculate current pattern tiles using actual NMJL pattern analysis
   */
  private static calculateCurrentPatternTiles(playerHand: string[], pattern: PatternSelectionOption) {
    const handCounts = this.countTileIds(playerHand)
    let currentTileCount = 0
    const matchDetails: { [groupName: string]: number } = {}

    console.log('=== DETAILED PATTERN ANALYSIS WALKTHROUGH ===')
    console.log('🎯 Pattern being analyzed:', pattern.displayName)
    console.log('🎲 Player hand tiles:', playerHand)
    console.log('🔢 Hand tile counts:', handCounts)
    console.log('📋 Pattern has', pattern.groups?.length || 0, 'groups to analyze')
    console.log('')

    // Track which tiles have already been allocated to prevent double-counting
    const allocatedTiles: { [tileId: string]: number } = {}
    
    // Check if this pattern has special constraints
    const hasConsecutiveConstraint = pattern.groups?.some((g: any) => 
      (g.Constraint_Extra || '').includes('consecutive')
    )
    const hasMustMatchConstraint = pattern.groups?.some((g: any) => 
      (g.Constraint_Must_Match || '').length > 0
    )
    
    if (hasConsecutiveConstraint || hasMustMatchConstraint) {
      console.log('🔗 SPECIAL CONSTRAINT PATTERN detected - using constraint analysis')
      console.log('🔍 Pattern name:', pattern.displayName || 'unknown pattern')
      const constraintResult = this.analyzeConsecutivePattern(pattern.groups, handCounts)
      currentTileCount = constraintResult.matchingTiles
      
      // Set match details for display
      pattern.groups.forEach((group: any, index: number) => {
        matchDetails[group.Group || `group_${index}`] = 
          index < constraintResult.candidates.length ? 1 : 0
      })
    } else {
      // Normal group-by-group analysis
      if (pattern.groups && pattern.groups.length > 0) {
        for (const group of pattern.groups) {
          const groupMatch = this.analyzePatternGroup(group, handCounts)
          matchDetails[group.Group || 'unknown'] = groupMatch.matchingTiles
          
          // Calculate how many tiles from this group we can actually use
          // considering what's already been allocated to other groups
          let actualContribution = 0
          
          for (const candidate of groupMatch.candidates) {
            const availableCount = (handCounts[candidate] || 0) - (allocatedTiles[candidate] || 0)
            if (availableCount > 0) {
              // For each group type, be very conservative about how much progress we count
              let maxToAllocate = 0
              
              if (group.Constraint_Type === 'kong' && groupMatch.matchingTiles >= 4) {
                maxToAllocate = Math.min(availableCount, 4)
              } else if (group.Constraint_Type === 'pung' && groupMatch.matchingTiles >= 3) {
                maxToAllocate = Math.min(availableCount, 3)
              } else if (group.Constraint_Type === 'pair' && groupMatch.matchingTiles >= 2) {
                maxToAllocate = Math.min(availableCount, 2)
              } else if (group.Constraint_Type === 'sequence') {
                // For sequences, only count if we have substantial progress
                maxToAllocate = Math.min(availableCount, 1) // Very conservative for sequences
              } else {
                // Generic group - only count substantial progress
                maxToAllocate = groupMatch.matchingTiles >= 2 ? Math.min(availableCount, 2) : 0
              }
              
              actualContribution += maxToAllocate
              allocatedTiles[candidate] = (allocatedTiles[candidate] || 0) + maxToAllocate
            }
          }
          
          currentTileCount += actualContribution
          
          console.log(`📊 GROUP ${group.Group} ANALYSIS:`)
          console.log(`   Type: ${group.Constraint_Type}`)
          console.log(`   Values: ${group.Constraint_Values}`)
          console.log(`   Raw matching tiles: ${groupMatch.matchingTiles}/${groupMatch.requiredTiles}`)
          console.log(`   Candidates found: [${groupMatch.candidates.join(', ')}]`)
          console.log(`   Actual contribution after deduplication: ${actualContribution}`)
          console.log(`   Allocated tiles tracker: ${JSON.stringify(allocatedTiles)}`)
          console.log('')
        }
      } else {
        // Fallback for patterns without detailed group data
        console.log('No group data, using fallback analysis')
        const totalHandTiles = playerHand.length
        const matchPercentage = 0.35 // Conservative estimate
        currentTileCount = Math.floor(totalHandTiles * matchPercentage)
        
        Object.entries(handCounts).forEach(([tileId, count]) => {
          if (count > 0) {
            matchDetails[tileId] = Math.min(count, 1)
          }
        })
      }
    }

    console.log('🎯 FINAL CALCULATION SUMMARY:')
    console.log(`   Total tiles counted: ${currentTileCount}`)
    console.log(`   Out of required: 14`)
    console.log(`   Completion percentage: ${(currentTileCount / 14 * 100).toFixed(1)}%`)
    console.log(`   Match details per group: ${JSON.stringify(matchDetails)}`)
    console.log(`   Final allocated tiles: ${JSON.stringify(allocatedTiles)}`)
    console.log('=== END ANALYSIS WALKTHROUGH ===')
    console.log('')

    return {
      currentTileCount,
      matchDetails,
      bestVariation: pattern
    }
  }

  /**
   * Analyze missing tiles and their availability
   */
  private static analyzeMissingTiles(_pattern: PatternSelectionOption, gameState: GameStateContext) {
    const allExposedTiles = Object.values(gameState.exposedTiles).flat()
    const handCounts = this.countTileIds(gameState.playerHand)
    const allMissingTiles: string[] = []
    const availabilities: Array<{ remainingInWall: number, canUseJoker: boolean }> = []
    
    // Generate realistic missing tiles based on what we don't have enough of
    // For mahjong, we need sets of 3 or 4, so identify tiles we need more of
    const commonTiles = ['1B', '2B', '3B', '4B', '5B', '6B', '7B', '8B', '9B',
                        '1C', '2C', '3C', '4C', '5C', '6C', '7C', '8C', '9C',
                        '1D', '2D', '3D', '4D', '5D', '6D', '7D', '8D', '9D',
                        'east', 'south', 'west', 'north', 'red', 'green', 'white']
    
    const categorizedMissing = {
      easy: [] as string[],
      moderate: [] as string[],
      difficult: [] as string[],
      impossible: [] as string[]
    }
    
    let totalAvailability = 0
    const matchDetails: { [groupName: string]: number } = {}
    
    // Find tiles we need more of (have fewer than 3 of each)
    for (const tileId of commonTiles) {
      const inHand = handCounts[tileId] || 0
      matchDetails[tileId] = inHand
      
      // If we have 0-2 of this tile, we might need more for sets
      if (inHand < 3) {
        allMissingTiles.push(tileId)
        
        const availability = this.calculateTileAvailability(
          tileId,
          gameState.playerHand,
          allExposedTiles,
          gameState.discardPile
        )
        
        availabilities.push({
          remainingInWall: availability.remainingInWall,
          canUseJoker: true
        })
        
        totalAvailability += availability.remainingInWall
        
        // Categorize by difficulty
        if (availability.remainingInWall >= 3) {
          categorizedMissing.easy.push(tileId)
        } else if (availability.remainingInWall >= 1) {
          categorizedMissing.moderate.push(tileId)
        } else {
          categorizedMissing.difficult.push(tileId)
        }
      }
    }
    
    // Limit to reasonable number of missing tiles (6-10 for a pattern)
    const limitedMissing = allMissingTiles.slice(0, 8)
    const limitedAvailabilities = availabilities.slice(0, 8)
    
    return {
      allMissingTiles: limitedMissing,
      availabilities: limitedAvailabilities,
      categorizedMissing,
      totalAvailability,
      matchDetails
    }
  }

  /**
   * Calculate joker substitution possibilities
   */
  private static calculateJokerSubstitution(
    missingTiles: string[],
    pattern: PatternSelectionOption,
    jokersInHand: number
  ) {
    const jokerSubstitutableTiles: string[] = []
    const substitutionPlan: { [tileId: string]: boolean } = {}
    
    for (const tileId of missingTiles) {
      const canSubstitute = this.canJokerSubstituteForTile(tileId, pattern)
      if (canSubstitute) {
        jokerSubstitutableTiles.push(tileId)
      }
      substitutionPlan[tileId] = canSubstitute
    }
    
    const jokersNeeded = Math.min(jokerSubstitutableTiles.length, missingTiles.length)
    
    return {
      jokerSubstitutableTiles,
      jokersNeeded,
      jokersAvailable: jokersInHand,
      substitutionPlan
    }
  }

  /**
   * Calculate strategic priority weights
   */
  private static calculatePriorityWeights(tiles: string[], groups: any[]) {
    const tilePriorities: { [tileId: string]: number } = {}
    const groupPriorities: { [groupName: string]: number } = {}
    
    // Calculate individual tile priorities
    for (const tileId of tiles) {
      tilePriorities[tileId] = this.getTilePriorityScore(tileId)
    }
    
    // Calculate group priorities
    for (const group of groups) {
      groupPriorities[group.Group || 'group'] = this.getGroupPriorityScore(group)
    }
    
    // Calculate overall priority score
    const tilePrioritySum = Object.values(tilePriorities).reduce((a, b) => a + b, 0)
    const groupPrioritySum = Object.values(groupPriorities).reduce((a, b) => a + b, 0)
    const overallPriorityScore = (tilePrioritySum + groupPrioritySum) / (tiles.length + groups.length) || 5
    
    return {
      tilePriorities,
      groupPriorities,
      overallPriorityScore
    }
  }

  /**
   * Calculate final intelligence score using mathematical formula
   */
  private static calculateFinalIntelligenceScore(
    currentTiles: number,
    tileAvailabilities: Array<{ remainingInWall: number, canUseJoker: boolean }>,
    jokerAnalysis: { jokersNeeded: number, jokersAvailable: number },
    priorityWeights: { overallPriorityScore: number }
  ) {
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
   * Analyze patterns with special constraints (consecutive, must_match, etc.)
   */
  private static analyzeConsecutivePattern(allGroups: any[], handCounts: { [tile: string]: number }) {
    console.log(`   🔍 Analyzing constraint pattern with ${allGroups.length} groups`)
    
    // Check for must_match constraints (like QUINTS #3: FF 11111 11 11111)
    const hasMustMatch = allGroups.some(g => (g.Constraint_Must_Match || '').length > 0)
    
    if (hasMustMatch) {
      console.log('   🎯 MUST_MATCH pattern detected (e.g., QUINTS #3)')
      return this.analyzeMustMatchPattern(allGroups, handCounts)
    }
    
    // Handle consecutive patterns (like QUINTS #1: FF 111 2222 3333)
    console.log('   🔄 CONSECUTIVE pattern detected (e.g., QUINTS #1)')
    return this.analyzeConsecutiveNumberPattern(allGroups, handCounts)
  }

  /**
   * Analyze must_match patterns like QUINTS #3: FF 11111 11 11111
   * All number groups must be the same number
   */
  private static analyzeMustMatchPattern(allGroups: any[], handCounts: { [tile: string]: number }) {
    let bestMatch = 0
    let bestCandidates: string[] = []
    
    // Try each possible number (1-9)
    for (let targetNum = 1; targetNum <= 9; targetNum++) {
      let currentMatch = 0
      let currentCandidates: string[] = []
      let totalRequiredOfThisNumber = 0
      
      console.log(`     Testing must-match number: ${targetNum}`)
      
      // Calculate total requirement for this number across all groups
      for (const group of allGroups) {
        if (group.Constraint_Values === 'flower') continue // Skip flowers
        
        const constraintType = group.Constraint_Type
        if (constraintType === 'quint') {
          totalRequiredOfThisNumber += 5
        } else if (constraintType === 'kong') {
          totalRequiredOfThisNumber += 4
        } else if (constraintType === 'pung') {
          totalRequiredOfThisNumber += 3
        } else if (constraintType === 'pair') {
          totalRequiredOfThisNumber += 2
        }
      }
      
      console.log(`       Total required of ${targetNum}: ${totalRequiredOfThisNumber}`)
      
      // Count how many of this number we actually have
      const suits = ['B', 'C', 'D']
      let totalAvailableOfThisNumber = 0
      let bestSuitTile = ''
      
      for (const suit of suits) {
        const tileId = `${targetNum}${suit}`
        const count = handCounts[tileId] || 0
        totalAvailableOfThisNumber += count
        if (count > 0 && !bestSuitTile) {
          bestSuitTile = tileId
        }
      }
      
      console.log(`       Available of ${targetNum}: ${totalAvailableOfThisNumber}`)
      
      // Calculate how much progress we have toward this number choice
      const progressForThisNumber = Math.min(totalAvailableOfThisNumber, totalRequiredOfThisNumber)
      
      // Add flower progress if applicable  
      const flowerGroups = allGroups.filter(g => g.Constraint_Values === 'flower')
      if (flowerGroups.length > 0) {
        const flowerCount = (handCounts['f1'] || 0) + (handCounts['f2'] || 0) + 
                           (handCounts['f3'] || 0) + (handCounts['f4'] || 0)
        const flowerProgress = Math.min(flowerCount, 2) // FF = 2 flowers
        currentMatch = progressForThisNumber + flowerProgress
        
        if (flowerCount > 0) currentCandidates.push('f1')
      } else {
        currentMatch = progressForThisNumber
      }
      
      if (bestSuitTile) currentCandidates.push(bestSuitTile)
      
      console.log(`       Progress for ${targetNum}: ${currentMatch} tiles`)
      
      if (currentMatch > bestMatch) {
        bestMatch = currentMatch
        bestCandidates = currentCandidates
      }
    }
    
    console.log(`   → Best must-match result: ${bestMatch} tiles with candidates [${bestCandidates.join(', ')}]`)
    
    return {
      matchingTiles: bestMatch,
      requiredTiles: 14,
      candidates: bestCandidates,
      completionPercentage: (bestMatch / 14) * 100
    }
  }

  /**
   * Analyze consecutive number patterns like CONSECUTIVE RUN #7: 112345 1111 1111
   */
  private static analyzeConsecutiveNumberPattern(allGroups: any[], handCounts: { [tile: string]: number }) {
    let bestMatch = 0
    let bestCandidates: string[] = []
    
    // Check if this is CONSECUTIVE RUN #7 pattern (112345 1111 1111)
    const has112345Group = allGroups.some(g => g.Group === '112345')
    
    if (has112345Group) {
      console.log('   🎯 CONSECUTIVE RUN #7 detected: 112345 + matching kongs')
      return this.analyzeConsecutiveRun7Pattern(allGroups, handCounts)
    }
    
    // Handle other consecutive patterns
    console.log('   🔄 Generic consecutive pattern')
    
    // Try each possible starting number (1-7)
    for (let startNum = 1; startNum <= 7; startNum++) {
      let currentMatch = 0
      let currentCandidates: string[] = []
      
      console.log(`     Testing consecutive sequence starting at ${startNum}`)
      
      // Check each group in sequence
      for (let groupIndex = 0; groupIndex < allGroups.length; groupIndex++) {
        const group = allGroups[groupIndex]
        const groupType = group.Constraint_Type
        const currentNum = startNum + groupIndex
        
        if (groupType === 'pair' && group.Constraint_Values === 'flower') {
          const flowerCount = (handCounts['f1'] || 0) + (handCounts['f2'] || 0) + 
                             (handCounts['f3'] || 0) + (handCounts['f4'] || 0)
          if (flowerCount >= 2) {
            currentMatch += 2
            currentCandidates.push('f1')
          } else if (flowerCount === 1) {
            currentMatch += 1
            currentCandidates.push('f1')
          }
        } else if (groupType === 'pung') {
          const suits = ['B', 'C', 'D']
          let bestPungMatch = 0
          let bestPungTile = ''
          
          for (const suit of suits) {
            const tileId = `${currentNum}${suit}`
            const count = handCounts[tileId] || 0
            if (count > bestPungMatch) {
              bestPungMatch = count
              bestPungTile = tileId
            }
          }
          
          currentMatch += Math.min(bestPungMatch, 3)
          if (bestPungTile) currentCandidates.push(bestPungTile)
        }
        // Add other group types as needed
      }
      
      if (currentMatch > bestMatch) {
        bestMatch = currentMatch
        bestCandidates = currentCandidates
      }
    }
    
    console.log(`   → Best consecutive match: ${bestMatch} tiles`)
    
    return {
      matchingTiles: bestMatch,
      requiredTiles: 14,
      candidates: bestCandidates,
      completionPercentage: (bestMatch / 14) * 100
    }
  }

  /**
   * Analyze CONSECUTIVE RUN #7: 112345 1111 1111
   * Sequence with pair + two matching kongs - simplified to match manual calculation
   */
  private static analyzeConsecutiveRun7Pattern(_allGroups: any[], handCounts: { [tile: string]: number }) {
    let bestMatch = 0
    let bestCandidates: string[] = []
    
    console.log('   🎯 Analyzing CONSECUTIVE RUN #7: 112345 1111 1111')
    
    // Try each possible pair number (1-9)
    for (let pairNum = 1; pairNum <= 9; pairNum++) {
      console.log(`     Testing pair number ${pairNum}`)
      
      // Count total tiles of this number across all suits
      let totalPairNumTiles = 0
      const suits = ['B', 'C', 'D']
      for (const suit of suits) {
        totalPairNumTiles += handCounts[`${pairNum}${suit}`] || 0
      }
      
      if (totalPairNumTiles === 0) continue // Skip if we have none of this number
      
      console.log(`       Total ${pairNum}s available: ${totalPairNumTiles}`)
      
      // Find best consecutive sequence that includes this pair number
      let bestSequenceScore = 0
      let bestSuit = ''
      
      for (const suit of suits) {
        // Try sequences where pairNum is at different positions
        // Sequence is 6 tiles: 1,2,3,4,4,5 where 4,4 is the pair
        
        for (let seqStart = Math.max(1, pairNum - 4); seqStart <= Math.min(5, pairNum); seqStart++) {
          if (seqStart + 4 > 9) continue // Sequence would go beyond 9
          if (pairNum < seqStart || pairNum > seqStart + 4) continue // Pair not in sequence
          
          let sequenceScore = 0
          console.log(`         Testing sequence ${seqStart}-${seqStart+4} in ${suit} suit`)
          
          // Check each position in the 5-consecutive-number sequence
          for (let pos = seqStart; pos <= seqStart + 4; pos++) {
            const tileId = `${pos}${suit}`
            const available = handCounts[tileId] || 0
            const needed = (pos === pairNum) ? 2 : 1 // Pair position needs 2
            
            sequenceScore += Math.min(available, needed)
            console.log(`           ${tileId}: need ${needed}, have ${available}, counted ${Math.min(available, needed)}`)
          }
          
          if (sequenceScore > bestSequenceScore) {
            bestSequenceScore = sequenceScore
            bestSuit = suit
          }
          
          console.log(`         Sequence score: ${sequenceScore}`)
        }
      }
      
      console.log(`       Best sequence score for ${pairNum}s: ${bestSequenceScore} (in ${bestSuit})`)
      
      // Calculate kong contribution (remaining tiles after sequence pair)
      const tilesUsedForSequencePair = Math.min(2, totalPairNumTiles)
      const remainingForKongs = Math.max(0, totalPairNumTiles - tilesUsedForSequencePair)
      
      // Total pattern needs: 6 (sequence) + 4 (kong) + 4 (kong) = 14
      // We have: bestSequenceScore + remainingForKongs
      const totalScore = bestSequenceScore + remainingForKongs
      
      console.log(`       Kong calculation: ${totalPairNumTiles} total - ${tilesUsedForSequencePair} for pair = ${remainingForKongs} remaining`)
      console.log(`       Final score for ${pairNum}s: ${bestSequenceScore} (seq) + ${remainingForKongs} (kong) = ${totalScore}`)
      
      if (totalScore > bestMatch) {
        bestMatch = totalScore
        bestCandidates = [`${pairNum}${bestSuit}`, `${pairNum}B`, `${pairNum}C`, `${pairNum}D`].filter(
          tile => (handCounts[tile] || 0) > 0
        )
      }
    }
    
    console.log(`   → FINAL CONSECUTIVE RUN #7 result: ${bestMatch} tiles`)
    
    return {
      matchingTiles: bestMatch,
      requiredTiles: 14,
      candidates: bestCandidates,
      completionPercentage: (bestMatch / 14) * 100
    }
  }

  /**
   * Analyze a specific pattern group to count matching tiles
   */
  private static analyzePatternGroup(group: any, handCounts: { [tile: string]: number }, allGroups?: any[]) {
    const constraintType = group.Constraint_Type || 'unknown'
    const constraintValues = group.Constraint_Values || ''
    const jokersAllowed = group.Jokers_Allowed || false
    const constraintExtra = group.Constraint_Extra || ''
    
    // Check if this pattern has consecutive constraints
    const hasConsecutiveConstraint = constraintExtra.includes('consecutive:')
    
    if (hasConsecutiveConstraint && allGroups) {
      console.log(`   🔗 CONSECUTIVE CONSTRAINT detected: ${constraintExtra}`)
      // For consecutive patterns, we need to find the best consecutive combination
      return this.analyzeConsecutivePattern(allGroups, handCounts)
    }
    
    let matchingTiles = 0
    let requiredTiles = 0
    let candidates: string[] = []
    
    console.log(`🔍 ANALYZING GROUP: ${group.Group}`)
    console.log(`   Constraint Type: ${constraintType}`)
    console.log(`   Constraint Values: "${constraintValues}"`)
    console.log(`   Jokers Allowed: ${jokersAllowed}`)
    console.log(`   Hand tile counts being checked: ${JSON.stringify(handCounts)}`)
    
    switch (constraintType) {
      case 'kong':
        requiredTiles = 4
        if (constraintValues === 'flower') {
          // For flower kong, count total flowers we have
          const flowerTiles = ['f1', 'f2', 'f3', 'f4']
          for (const tile of flowerTiles) {
            const count = handCounts[tile] || 0
            if (count > 0) {
              matchingTiles += count // Count actual flowers
              candidates.push(tile)
            }
          }
        } else {
          // For other kongs, we need 4 of the SAME tile, not 4 different matching tiles
          const tiles = this.parseConstraintValues(constraintValues)
          console.log(`   Parsed candidate tiles for kong: [${tiles.join(', ')}]`)
          for (const tile of tiles) {
            const count = handCounts[tile] || 0
            console.log(`   Checking tile "${tile}": have ${count} in hand`)
            if (count > matchingTiles) {
              matchingTiles = count // Take the highest count for any single matching tile
              candidates = [tile]
              console.log(`   → New best kong candidate: ${tile} with ${count} tiles`)
            }
          }
        }
        break
        
      case 'pung':
        requiredTiles = 3
        // For pungs, we need 3 of the SAME tile
        const pungTiles = this.parseConstraintValues(constraintValues)
        console.log(`   Parsed candidate tiles for pung: [${pungTiles.join(', ')}]`)
        for (const tile of pungTiles) {
          const count = handCounts[tile] || 0
          console.log(`   Checking tile "${tile}": have ${count} in hand`)
          if (count > matchingTiles) {
            matchingTiles = count // Take the highest count for any single matching tile
            candidates = [tile]
            console.log(`   → New best pung candidate: ${tile} with ${count} tiles`)
          }
        }
        break
        
      case 'sequence':
        // Handle complex sequence patterns like "112345"
        const groupName = group.Group || 'sequence'
        console.log(`   Analyzing sequence group: ${groupName}`)
        
        if (groupName === '112345') {
          // CONSECUTIVE RUN pattern: 112345 means pair + 4 consecutive tiles
          // We need to find the best consecutive sequence in the hand
          requiredTiles = 6 // 1 + 1 (pair) + 2 + 3 + 4 + 5 = 6 tiles total
          
          // Look for consecutive sequences in each suit
          const suits = ['B', 'C', 'D']
          let bestSequenceMatch = 0
          
          for (const suit of suits) {
            // Check each possible starting position (1-5 for 1,2,3,4,5 sequence)
            for (let start = 1; start <= 5; start++) {
              // Count how many of these tiles we have for sequence starting at 'start'
              let sequenceProgress = 0
              const pairCount = handCounts[`${start}${suit}`] || 0
              
              // For the pair position, we need at least 2 tiles
              if (pairCount >= 2) {
                sequenceProgress += 2 // Count the pair
                
                // Check consecutive tiles
                for (let i = 1; i <= 4; i++) {
                  const consecutiveTile = `${start + i}${suit}`
                  if ((handCounts[consecutiveTile] || 0) > 0) {
                    sequenceProgress += 1
                    candidates.push(consecutiveTile)
                  }
                }
                
                candidates.push(`${start}${suit}`) // Add the pair tile
              } else if (pairCount === 1) {
                // Partial progress toward pair
                sequenceProgress += 1
                candidates.push(`${start}${suit}`)
              }
              
              bestSequenceMatch = Math.max(bestSequenceMatch, sequenceProgress)
            }
          }
          
          matchingTiles = bestSequenceMatch
          console.log(`   → Consecutive sequence analysis: ${matchingTiles}/${requiredTiles} tiles found`)
        } else {
          // Fallback for other sequence types
          const sequencePattern = constraintValues.split(',').map((v: string) => v.trim())
          requiredTiles = sequencePattern.length
          
          // Very conservative counting for generic sequences
          let sequenceMatches = 0
          for (const value of sequencePattern) {
            if (value !== '0') {
              const positionTiles = [`${value}B`, `${value}C`, `${value}D`]
              const totalForThisValue = positionTiles.reduce((sum, tile) => 
                sum + (handCounts[tile] || 0), 0
              )
              if (totalForThisValue > 0) {
                sequenceMatches += 1
                const bestTile = positionTiles.find(tile => (handCounts[tile] || 0) > 0)
                if (bestTile && !candidates.includes(bestTile)) {
                  candidates.push(bestTile)
                }
              }
            }
          }
          matchingTiles = Math.min(sequenceMatches, 3) // Very conservative
        }
        break
        
      case 'pair':
        requiredTiles = 2
        // For pairs, we need 2 of the SAME tile
        const pairTiles = this.parseConstraintValues(constraintValues)
        for (const tile of pairTiles) {
          const count = handCounts[tile] || 0
          if (count >= 2) {
            matchingTiles = 2 // We have a complete pair
            candidates = [tile]
            break
          } else if (count === 1 && matchingTiles === 0) {
            matchingTiles = 1 // We have one tile toward a pair
            candidates = [tile]
          }
        }
        break
        
      default:
        // Generic group analysis - look for any tiles that might fit
        requiredTiles = 3 // Default assumption
        const allPossibleTiles = this.parseConstraintValues(constraintValues)
        for (const tile of allPossibleTiles) {
          const count = handCounts[tile] || 0
          if (count > 0) {
            matchingTiles += Math.min(count, 2) // Conservative contribution
            candidates.push(tile)
          }
        }
    }
    
    // Add joker contribution if allowed
    if (jokersAllowed) {
      const jokerCount = handCounts['joker'] || 0
      const jokerContribution = Math.min(jokerCount, Math.max(0, requiredTiles - matchingTiles))
      matchingTiles += jokerContribution
      if (jokerCount > 0) candidates.push('joker')
    }
    
    console.log(`📊 GROUP ANALYSIS COMPLETE:`)
    console.log(`   → Matching tiles: ${matchingTiles}`)
    console.log(`   → Required tiles: ${requiredTiles}`)
    console.log(`   → Candidates: [${candidates.join(', ')}]`)
    console.log(`   → Group completion: ${requiredTiles > 0 ? ((matchingTiles / requiredTiles) * 100).toFixed(1) : 0}%`)
    console.log('')
    
    return {
      matchingTiles,
      requiredTiles,
      candidates,
      completionPercentage: requiredTiles > 0 ? (matchingTiles / requiredTiles) * 100 : 0
    }
  }

  /**
   * Parse constraint values into actual tile IDs
   */
  private static parseConstraintValues(constraintValues: string): string[] {
    if (!constraintValues) return []
    
    const tiles: string[] = []
    const values = constraintValues.split(',').map(v => v.trim())
    
    for (const value of values) {
      // Handle special cases
      if (value === 'flower') {
        tiles.push('f1', 'f2', 'f3', 'f4')
      } else if (value === 'joker') {
        tiles.push('joker')
      } else if (value.match(/^\d+$/)) {
        // Number constraint - add all suits
        const num = value
        if (num !== '0') { // 0 is often neutral/joker in NMJL
          tiles.push(`${num}B`, `${num}C`, `${num}D`)
        }
      } else if (['east', 'south', 'west', 'north', 'red', 'green', 'white'].includes(value.toLowerCase())) {
        tiles.push(value.toLowerCase())
      }
      // Add more parsing logic as needed for other constraint formats
    }
    
    return tiles
  }


  // Helper Methods

  private static calculateTileAvailability(
    tileId: string,
    playerHand: string[],
    exposedTiles: string[],
    discardPile: string[]
  ) {
    const handCounts = this.countTileIds(playerHand)
    const exposedCounts = this.countTileIds(exposedTiles)
    const discardCounts = this.countTileIds(discardPile)
    
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

  private static getTilePriorityScore(tileId: string): number {
    let score = 5 // Base score
    
    // Extract number from tile ID (1B, 2C, 3D format)
    const numberMatch = tileId.match(/^(\d+)[BCD]$/)
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
    }
    
    // Honor tiles get moderate bonus (winds and dragons)
    if (['east', 'south', 'west', 'north', 'red', 'green', 'white'].includes(tileId)) {
      score += 2
    }
    
    // Jokers get maximum priority
    if (tileId === 'joker') {
      score += 5
    }
    
    // Flowers get penalty
    if (tileId.startsWith('f')) {
      score -= 2
    }
    
    return score
  }

  private static getGroupPriorityScore(group: any): number {
    let score = 5 // Base score
    
    const constraintType = group.Constraint_Type || group.type || 'unknown'
    const constraintValues = group.Constraint_Values || group.values || ''
    
    if (constraintType === 'sequence') {
      // Terminal sequences get highest bonus
      if (constraintValues.includes('1') || constraintValues.includes('9')) {
        score += 4
      } else {
        score += 1
      }
    } else if (constraintType === 'kong') {
      score += 3
    } else if (constraintType === 'pung') {
      score += 2
    } else if (constraintType === 'pair') {
      score += 1
    }
    
    // Special bonuses
    if (constraintValues === 'joker') {
      score += 5
    }
    
    if (constraintValues.includes('1') || constraintValues.includes('9')) {
      score += 2
    }
    
    return score
  }

  // Pattern tile extraction - future implementation for complex pattern parsing
  /*
  private static extractPatternTiles(_pattern: string): string[] {
    // Convert NMJL pattern format to our tile IDs
    // NMJL patterns like "FFFF 2025 222 222" need to be converted to tile IDs like "1B", "2C", etc.
    
    // For now, return a reasonable set of diverse tiles for analysis
    // This is a simplified implementation - full pattern parsing would be much more complex
    const sampleTiles = [
      '1B', '2B', '3B', // Bams
      '1C', '2C', '3C', // Cracks  
      '1D', '2D', '3D', // Dots
      'east', 'south', 'west', 'north', // Winds
      'red', 'green', 'white', // Dragons
      'joker' // Jokers
    ]
    
    return sampleTiles.slice(0, 8) // Return first 8 for variety
  }
  */

  private static canJokerSubstituteForTile(tileId: string, _pattern: PatternSelectionOption): boolean {
    // Jokers can't substitute for other jokers
    if (tileId.includes('joker')) return false
    
    // Most tiles can use jokers (simplified)
    return true
  }

  private static getOriginalTileCount(tileId: string): number {
    if (tileId === 'joker') return 8
    if (tileId.startsWith('f')) return 1 // Flowers like f1, f2, f3, f4
    return 4 // Standard tiles (4 of each suit tile and honor tile)
  }

  private static estimateWallTilesRemaining(gameState: GameStateContext): number {
    const totalTiles = 144
    const handTiles = gameState.playerHand.length * gameState.totalPlayers
    const exposedTiles = Object.values(gameState.exposedTiles).flat().length
    const discardedTiles = gameState.discardPile.length
    
    return totalTiles - handTiles - exposedTiles - discardedTiles
  }

  private static calculateDrawProbability(missingTiles: string[], wallTilesRemaining: number): number {
    const uniqueMissingTiles = [...new Set(missingTiles)]
    const estimatedAvailableTiles = uniqueMissingTiles.length * 2
    
    return Math.min(1.0, estimatedAvailableTiles / wallTilesRemaining)
  }

  private static generatePriorityReasoning(priorityAnalysis: any): string[] {
    const reasoning: string[] = []
    
    const highPriorityTiles = Object.entries(priorityAnalysis.tilePriorities)
      .filter(([_, priority]) => (priority as number) >= 7)
      .map(([tile, _]) => tile)
    
    if (highPriorityTiles.length > 0) {
      reasoning.push(`High-value tiles: ${highPriorityTiles.join(', ')}`)
    }
    
    if (priorityAnalysis.overallPriority >= 6) {
      reasoning.push('Above-average strategic value pattern')
    } else if (priorityAnalysis.overallPriority <= 4) {
      reasoning.push('Below-average strategic value - consider alternatives')
    }
    
    return reasoning
  }

  private static generateStrategicNotes(result: PatternMatchResult): string[] {
    const notes: string[] = []
    
    if (result.completionPercentage >= 80) {
      notes.push('Excellent completion prospects - prioritize this pattern')
    } else if (result.completionPercentage >= 65) {
      notes.push('Good pattern choice with solid fundamentals')
    } else if (result.completionPercentage >= 45) {
      notes.push('Viable option but monitor for better alternatives')
    } else {
      notes.push('Consider switching to a more viable pattern')
    }
    
    return notes
  }

  private static generateRiskFactors(result: PatternMatchResult, jokerAnalysis: any): string[] {
    const risks: string[] = []
    
    if (jokerAnalysis.jokersNeeded > jokerAnalysis.jokersAvailable) {
      risks.push(`Requires ${jokerAnalysis.jokersNeeded - jokerAnalysis.jokersAvailable} more jokers`)
    }
    
    if (result.tilesNeeded > 8) {
      risks.push('High dependency on hard-to-get tiles')
    }
    
    return risks
  }

  // Existing helper methods (preserved from original)

  private static countTiles(tiles: PlayerTile[]): TileCount {
    const count: TileCount = {}
    tiles.forEach(tile => {
      count[tile.id] = (count[tile.id] || 0) + 1
    })
    return count
  }

  private static countTileIds(tiles: string[]): { [tile: string]: number } {
    const counts: { [tile: string]: number } = {}
    for (const tile of tiles) {
      counts[tile] = (counts[tile] || 0) + 1
    }
    return counts
  }

  private static countJokers(tiles: PlayerTile[]): number {
    return tiles.filter(tile => 
      tile.id.toLowerCase().includes('joker') || 
      tile.suit === 'jokers'
    ).length
  }

  private static generatePatternReasoning(result: PatternMatchResult, index: number): string {
    if (index === 0) return "Best completion prospects with current hand"
    if (result.completionPercentage > 70) return "Strong alternative with good fundamentals"
    if (result.completionPercentage > 50) return "Viable backup option worth considering"
    return "Lower probability but still achievable"
  }

  private static calculateRiskLevel(completionPercentage: number, tilesNeeded: number): 'low' | 'medium' | 'high' {
    if (completionPercentage > 70 && tilesNeeded < 5) return 'low'
    if (completionPercentage > 50 && tilesNeeded < 8) return 'medium'
    return 'high'
  }

  private static generateTileRecommendations(
    playerTiles: PlayerTile[], 
    bestPattern: PatternMatchResult | null, 
    _tileCount: TileCount
  ): TileRecommendation[] {
    // Generate basic tile recommendations even without a good pattern
    console.log('Generating tile recommendations for', playerTiles.length, 'tiles')
    console.log('Best pattern:', bestPattern?.pattern?.id || 'none')
    
    const recommendations: TileRecommendation[] = []
    const handCounts = this.countTileIds(playerTiles.map(t => t.id))
    
    // Get tiles needed for the best pattern (if any)
    const patternNeededTiles = new Set<string>()
    if (bestPattern?.missingTiles) {
      bestPattern.missingTiles.forEach(tileId => patternNeededTiles.add(tileId))
    }
    
    // For CONSECUTIVE RUN patterns, identify sequence tiles that should be kept
    const consecutiveKeepTiles = new Set<string>()
    if (bestPattern?.pattern?.displayName?.includes('CONSECUTIVE RUN')) {
      // For CONSECUTIVE RUN, keep all tiles 1-5 as they could be part of the sequence
      for (let num = 1; num <= 5; num++) {
        for (const suit of ['B', 'C', 'D']) {
          const tileId = `${num}${suit}`
          if (handCounts[tileId] > 0) {
            consecutiveKeepTiles.add(tileId)
          }
        }
      }
    }

    // Analyze each tile for strategic value
    playerTiles.forEach(tile => {
      const tileId = tile.id
      const count = handCounts[tileId] || 0
      let action: 'keep' | 'pass' | 'discard' = 'pass'
      let confidence = 60
      let reasoning = 'Evaluate for strategic value'
      let priority = 5
      
      // First priority: tiles needed for the current pattern
      if (patternNeededTiles.has(tileId)) {
        action = 'keep'
        confidence = 95
        reasoning = `Keep - needed for ${bestPattern?.pattern?.displayName || 'current pattern'}`
        priority = 10
      }
      // Second priority: sequence tiles for CONSECUTIVE RUN patterns  
      else if (consecutiveKeepTiles.has(tileId)) {
        action = 'keep'
        confidence = 85
        reasoning = 'Keep - part of potential consecutive sequence (1-5)'
        priority = 8
      }
      // Keep tiles we have multiples of (building sets)
      else if (count >= 2) {
        action = 'keep'
        confidence = 85
        reasoning = `Keep - you have ${count} of these tiles (building a set)`
        priority = 8
      }
      // Keep jokers
      else if (tileId === 'joker') {
        action = 'keep'
        confidence = 95
        reasoning = 'Keep - jokers are valuable for completing patterns'
        priority = 10
      }
      // Keep terminal tiles (1s and 9s) - valuable for patterns
      else if (tileId.match(/^[19][BCD]$/)) {
        action = 'keep'
        confidence = 75
        reasoning = 'Keep - terminal tiles (1s and 9s) are valuable for many patterns'
        priority = 7
      }
      // Keep honor tiles if we have few of them
      else if (['east', 'south', 'west', 'north', 'red', 'green', 'white'].includes(tileId)) {
        action = 'keep'
        confidence = 70
        reasoning = 'Keep - honor tiles work well in many patterns'
        priority = 6
      }
      // Middle tiles can be passed if we have too many different ones
      else if (tileId.match(/^[456][BCD]$/)) {
        action = 'pass'
        confidence = 65
        reasoning = 'Pass - middle tiles unless building specific sequences'
        priority = 4
      }
      // Single flowers can usually be passed
      else if (tileId.startsWith('f') && count === 1) {
        action = 'pass'
        confidence = 80
        reasoning = 'Pass - single flowers are less useful unless needed for specific patterns'
        priority = 3
      }
      
      // For CONSECUTIVE RUN patterns, identify clear discard candidates
      if (bestPattern?.pattern?.displayName?.includes('CONSECUTIVE RUN')) {
        // Tiles 6-9 are usually safe to discard for CONSECUTIVE RUN patterns  
        // since sequences are typically 1-5
        if (tileId.match(/^[6789][BCD]$/) && count === 1 && 
            !patternNeededTiles.has(tileId)) {
          action = 'discard'
          confidence = 90
          reasoning = 'Discard - high numbers less useful for consecutive sequences'
          priority = 1
        }
        // Isolated tiles (not part of any building sequence)
        else if (count === 1 && !consecutiveKeepTiles.has(tileId) && 
                 !patternNeededTiles.has(tileId) && !tileId.startsWith('f') &&
                 !tileId.match(/^[19][BCD]$/)) { // Don't discard terminals
          action = 'discard'
          confidence = 75  
          reasoning = 'Discard - isolated tile not useful for current pattern'
          priority = 2
        }
      }
      
      recommendations.push({
        tileId,
        action,
        confidence,
        reasoning,
        priority
      })
    })
    
    // Return top recommendations sorted by priority
    return recommendations
      .sort((a, b) => b.priority - a.priority)
      .slice(0, Math.min(10, playerTiles.length))
  }

  private static generateStrategicAdvice(_sortedResults: PatternMatchResult[], primaryPattern: PatternRecommendation | undefined): string[] {
    if (!primaryPattern) return ["Focus on collecting matching tiles"]
    
    return [
      `Target ${primaryPattern.pattern.displayName} (${primaryPattern.completionPercentage}% completion)`,
      "Keep tiles that match multiple viable patterns",
      "Monitor for better opportunities as hand develops"
    ]
  }
}