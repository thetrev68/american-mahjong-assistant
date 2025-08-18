// Intelligence Calculations Example
// Shows exactly how the mathematical formulas work with real game data

import { IntelligenceCalculations } from './intelligence-calculations'

/**
 * Example calculation for Pattern: "FFFF 2025 222 222"
 * Your hand: [F1, F1, F2, F3, 2B, white, 2C, 2C, 5D, 5D, 5D, joker, 1D, 8B]
 */
export function demonstrateIntelligenceCalculations() {
  
  console.log('=== INTELLIGENCE CALCULATIONS EXAMPLE ===')
  
  // Game state
  const playerHand = ['flower1', 'flower1', 'flower2', 'flower3', '2bams', 'white', 
                     '2cracks', '2cracks', '5dots', '5dots', '5dots', 'joker', '1dots', '8bams']
  
  const exposedTiles = ['3dots', '3dots', '3dots', 'east', 'east', 'east'] // Other players' exposed sets
  const discardPile = ['6bams', '7cracks', 'flower4', '9dots', '9dots']
  
  const targetPattern = {
    "Hand_Pattern": "FFFF 2025 222 222",
    "Hand_Description": "Any 3 Suits, Like Pungs 2s or 5s In Opp. Suits",
    groups: [
      { Group: "FFFF", Constraint_Type: "kong", Constraint_Values: "flower" },
      { Group: "2025", Constraint_Type: "sequence", Constraint_Values: "2,0,2,5" },
      { Group: "222_1", Constraint_Type: "pung", Constraint_Values: "2,5" },
      { Group: "222_2", Constraint_Type: "pung", Constraint_Values: "2,5" }
    ]
  }
  
  console.log('Player Hand:', playerHand)
  console.log('Target Pattern:', targetPattern.Hand_Pattern)
  console.log('')
  
  // Step 1: Count current pattern tiles
  console.log('=== STEP 1: COUNT CURRENT PATTERN TILES ===')
  const currentAnalysis = IntelligenceCalculations.calculateCurrentPatternTiles(
    playerHand, 
    targetPattern
  )
  
  console.log(`Current tiles matching pattern: ${currentAnalysis.currentTileCount}/14`)
  console.log('Match details by group:')
  for (const [group, count] of Object.entries(currentAnalysis.matchDetails)) {
    console.log(`  ${group}: ${count} tiles`)
  }
  console.log('')
  
  // Step 2: Analyze missing tiles
  console.log('=== STEP 2-3: TILE AVAILABILITY ANALYSIS ===')
  const missingTiles = ['flower4', '5bams', '2dots'] // Example missing tiles
  
  for (const tileId of missingTiles) {
    const availability = IntelligenceCalculations.calculateTileAvailability(
      tileId, 
      playerHand, 
      exposedTiles, 
      discardPile
    )
    
    console.log(`${tileId}:`)
    console.log(`  Originally in set: ${availability.originalCount}`)
    console.log(`  In your hand: ${availability.inPlayerHand}`)
    console.log(`  Exposed by others: ${availability.exposedByOthers}`)
    console.log(`  In discard pile: ${availability.inDiscardPile}`)
    console.log(`  Remaining in wall: ${availability.remainingInWall}`)
    console.log('')
  }
  
  // Step 4: Joker analysis
  console.log('=== STEP 4: JOKER SUBSTITUTION ANALYSIS ===')
  const jokersInHand = 1
  const jokerAnalysis = IntelligenceCalculations.calculateJokerSubstitution(
    missingTiles,
    targetPattern,
    jokersInHand
  )
  
  console.log(`Jokers in hand: ${jokerAnalysis.jokersAvailable}`)
  console.log(`Jokers needed: ${jokerAnalysis.jokersNeeded}`)
  console.log('Tiles that can use jokers:')
  for (const tile of jokerAnalysis.jokerSubstitutableTiles) {
    console.log(`  ${tile}: ${jokerAnalysis.substitutionPlan[tile] ? 'Yes' : 'No'}`)
  }
  console.log('')
  
  // Step 5: Priority calculations
  console.log('=== STEP 5: PRIORITY WEIGHT CALCULATIONS ===')
  const priorities = IntelligenceCalculations.calculatePriorityWeights(
    playerHand,
    targetPattern.groups
  )
  
  console.log('Tile priorities (higher = better):')
  for (const [tile, priority] of Object.entries(priorities.tilePriorities)) {
    console.log(`  ${tile}: ${priority.toFixed(1)}`)
  }
  
  console.log('Group priorities:')
  for (const [group, priority] of Object.entries(priorities.groupPriorities)) {
    console.log(`  ${group}: ${priority.toFixed(1)}`)
  }
  console.log(`Overall priority score: ${priorities.overallPriorityScore.toFixed(1)}`)
  console.log('')
  
  // Final calculation
  console.log('=== FINAL INTELLIGENCE SCORE ===')
  const tileAvailabilities = missingTiles.map(tile => ({
    remainingInWall: Math.floor(Math.random() * 4), // Simplified
    canUseJoker: !tile.includes('joker')
  }))
  
  const finalScore = IntelligenceCalculations.calculateFinalIntelligenceScore(
    currentAnalysis.currentTileCount,
    tileAvailabilities,
    jokerAnalysis,
    priorities
  )
  
  console.log(`COMPLETION SCORE: ${finalScore.completionScore.toFixed(1)}/100`)
  console.log(`RECOMMENDATION: ${finalScore.recommendation.toUpperCase()}`)
  console.log('')
  console.log('Score breakdown:')
  console.log(`  Current tiles: ${finalScore.components.currentTileScore.toFixed(1)}/40`)
  console.log(`  Availability: ${finalScore.components.availabilityScore.toFixed(1)}/30`)
  console.log(`  Joker situation: ${finalScore.components.jokerScore.toFixed(1)}/20`)
  console.log(`  Strategic priority: ${finalScore.components.priorityScore.toFixed(1)}/10`)
  
  return finalScore
}

/**
 * Mathematical formulas summary
 */
export const INTELLIGENCE_FORMULAS = {
  
  currentTileScore: {
    formula: '(currentTiles / 14) × 40',
    description: 'Points for tiles already matching the pattern',
    maxPoints: 40
  },
  
  availabilityScore: {
    formula: 'min(30, totalAvailability × 2)',
    calculation: 'totalAvailability = Σ(remainingInWall + (canUseJoker ? 2 : 0))',
    description: 'Points based on how many needed tiles are still available',
    maxPoints: 30
  },
  
  jokerScore: {
    formula: 'jokerBalance ≥ 0 ? min(20, balance × 5 + 10) : max(0, 10 + balance × 3)',
    calculation: 'jokerBalance = jokersAvailable - jokersNeeded',
    description: 'Bonus for having enough jokers, penalty for shortage',
    maxPoints: 20
  },
  
  priorityScore: {
    formula: 'min(10, overallPriorityScore)',
    calculation: '(Σ tilePriorities + Σ groupPriorities) / (tiles.length + groups.length)',
    description: 'Bonus for strategically valuable tiles and groups',
    maxPoints: 10
  },
  
  tilePriority: {
    base: 5,
    bonuses: {
      'terminals (1,9)': +3,
      'middle (4,5,6)': -1,
      'honors (winds/dragons)': +2,
      'jokers': +5,
      'flowers': -2
    }
  },
  
  groupPriority: {
    base: 5,
    bonuses: {
      'terminal sequences (123/789)': +4,
      'other sequences': +1,
      'kongs': +3,
      'pungs': +2,
      'pairs': +1,
      'joker groups': +5,
      'groups with terminals': +2
    }
  },
  
  finalScore: {
    formula: 'min(100, currentTileScore + availabilityScore + jokerScore + priorityScore)',
    recommendations: {
      '≥80': 'excellent',
      '≥65': 'good', 
      '≥45': 'fair',
      '≥25': 'poor',
      '<25': 'impossible'
    }
  }
}

// Example usage:
// const result = demonstrateIntelligenceCalculations()
// console.log('Final intelligence score:', result.completionScore)