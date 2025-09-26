// Verification Test for Improved Scoring Architecture
// Tests the two key improvements: individual tile difficulty and joker integration

import { PatternRankingEngine } from '../pattern-ranking-engine'
import type { TileAvailability, PatternAnalysisFacts, ProgressMetrics } from '../pattern-analysis-engine'
import type { PatternSelectionOption } from 'shared-types'

// Mock pattern analysis facts creator
function createVerificationFacts(scenario: 'easy_bottleneck' | 'hard_bottleneck' | 'joker_helps'): PatternAnalysisFacts {
  const baseFacts = {
    patternId: '2025-SINGLES_AND_PAIRS-4-1',
    tileMatching: {
      bestVariation: {
        variationId: 'test-variation',
        patternId: 'test-pattern',
        sequence: 1,
        tilesMatched: 3,
        tilesNeeded: 11,
        completionRatio: 3/14,
        missingTiles: ['1B', 'f1'], // These should match the tiles in tileAvailability.missingTileCounts
        tileContributions: [],
        patternTiles: ['1B', '1B', '1B', 'f1', '2C', '2C', '2C', '3D', '3D', '3D', 'red', 'green', 'white', 'east'] // 14-tile pattern
      },
      worstVariation: {
        variationId: 'test-variation-worst',
        patternId: 'test-pattern',
        sequence: 2,
        tilesMatched: 1,
        tilesNeeded: 13,
        completionRatio: 1/14,
        missingTiles: ['1B', 'f1'], // These should match the tiles in tileAvailability.missingTileCounts
        tileContributions: [],
        patternTiles: ['1B', '1B', '1B', 'f1', '2C', '2C', '2C', '3D', '3D', '3D', 'red', 'green', 'white', 'east'] // 14-tile pattern
      },
      allResults: [],
      totalVariations: 1,
      averageCompletion: 3/14
    },
    tileAvailability: {
      missingTileCounts: [] as TileAvailability[],
      totalMissingInWall: 0,
      totalMissingNeeded: 2,
      availabilityRatio: 0
    },
    jokerAnalysis: {
      jokersAvailable: 0,
      substitutablePositions: [],
      maxJokersUseful: 0,
      withJokersCompletion: 3/14,
      jokersToComplete: 11
    },
    progressMetrics: {
      tilesCollected: 3,
      tilesRemaining: 11,
      progressPercentage: 21.4,
      pairsFormed: 0,
      setsFormed: 0
    } as ProgressMetrics
  }

  switch (scenario) {
    case 'easy_bottleneck':
      // Need 1B (2 available) + Flower (8 available) - should recognize 1B bottleneck
      baseFacts.tileAvailability = {
        missingTileCounts: [
          { tileId: '1B', remainingAvailable: 2, inWall: 2, inDiscards: 2, exposedByOthers: 0, totalOriginal: 4 },
          { tileId: 'f1', remainingAvailable: 8, inWall: 8, inDiscards: 0, exposedByOthers: 0, totalOriginal: 8 }
        ],
        totalMissingInWall: 10, // 2 + 8
        totalMissingNeeded: 2,
        availabilityRatio: 5.0 // (2+8)/2 = 5.0 (old method)
      }
      baseFacts.jokerAnalysis.jokersAvailable = 0
      break
      
    case 'hard_bottleneck':
      // Need 1B (1 available) + Flower (6 available) - more dramatic bottleneck
      baseFacts.tileAvailability = {
        missingTileCounts: [
          { tileId: '1B', remainingAvailable: 1, inWall: 1, inDiscards: 3, exposedByOthers: 0, totalOriginal: 4 },
          { tileId: 'f1', remainingAvailable: 6, inWall: 6, inDiscards: 2, exposedByOthers: 0, totalOriginal: 8 }
        ],
        totalMissingInWall: 7, // 1 + 6
        totalMissingNeeded: 2,
        availabilityRatio: 3.5 // (1+6)/2 = 3.5 (old method)
      }
      baseFacts.jokerAnalysis.jokersAvailable = 0
      break
      
    case 'joker_helps':
      // Same as hard_bottleneck but with jokers available
      baseFacts.tileAvailability = {
        missingTileCounts: [
          { tileId: '1B', remainingAvailable: 1, inWall: 1, inDiscards: 3, exposedByOthers: 0, totalOriginal: 4 },
          { tileId: 'f1', remainingAvailable: 6, inWall: 6, inDiscards: 2, exposedByOthers: 0, totalOriginal: 8 }
        ],
        totalMissingInWall: 7,
        totalMissingNeeded: 2,
        availabilityRatio: 3.5
      }
      baseFacts.jokerAnalysis.jokersAvailable = 8
      baseFacts.jokerAnalysis.maxJokersUseful = 2
      baseFacts.jokerAnalysis.substitutablePositions = [0, 1, 3] // Positions where jokers can substitute in the pattern
      break
  }

  return baseFacts
}

const mockPatterns: PatternSelectionOption[] = [
  {
    id: '2025-SINGLES_AND_PAIRS-4-1',
    patternId: 1,
    displayName: 'Singles and Pairs Pattern 4-1',
    pattern: '11 22 33 DD FF',
    points: 25,
    difficulty: 'medium' as const,
    description: 'Singles and Pairs Pattern 4-1',
    section: 'SINGLES AND PAIRS',
    line: 1,
    allowsJokers: false,
    concealed: false,
    groups: []
  }
]

describe('Improved Scoring Architecture Verification', () => {
  
  test('should recognize tile availability bottlenecks', async () => {
    const easyBottleneckFacts = createVerificationFacts('easy_bottleneck')
    const hardBottleneckFacts = createVerificationFacts('hard_bottleneck')
    
    const easyResults = await PatternRankingEngine.rankPatterns([easyBottleneckFacts], mockPatterns, { phase: 'gameplay', wallTilesRemaining: 84 })
    const hardResults = await PatternRankingEngine.rankPatterns([hardBottleneckFacts], mockPatterns, { phase: 'gameplay', wallTilesRemaining: 84 })
    
    const easyScore = easyResults.rankings[0].components.availabilityScore
    const hardScore = hardResults.rankings[0].components.availabilityScore
    
    // Hard bottleneck should have lower availability score due to individual tile difficulty assessment
    expect(hardScore).toBeLessThan(easyScore)
    
    console.log(`📊 Bottleneck Recognition Test:`)
    console.log(`   Easy bottleneck (1B:2, f1:8): ${easyScore.toFixed(1)} points`)
    console.log(`   Hard bottleneck (1B:1, f1:6): ${hardScore.toFixed(1)} points`)
    console.log(`   ✅ Improvement: ${(easyScore - hardScore).toFixed(1)} points difference`)
  })
  
  test('should integrate joker benefits into availability scoring', async () => {
    const withoutJokersFacts = createVerificationFacts('hard_bottleneck')
    const withJokersFacts = createVerificationFacts('joker_helps')
    
    const withoutJokersResults = await PatternRankingEngine.rankPatterns([withoutJokersFacts], mockPatterns, { phase: 'gameplay', wallTilesRemaining: 84 })
    const withJokersResults = await PatternRankingEngine.rankPatterns([withJokersFacts], mockPatterns, { phase: 'gameplay', wallTilesRemaining: 84 })
    
    const withoutJokersScore = withoutJokersResults.rankings[0].components.availabilityScore
    const withJokersScore = withJokersResults.rankings[0].components.availabilityScore
    
    // Joker availability should improve the availability score
    expect(withJokersScore).toBeGreaterThan(withoutJokersScore)
    
    // Joker component should always be 0 (integrated into availability)
    expect(withJokersResults.rankings[0].components.jokerScore).toBe(0)
    expect(withoutJokersResults.rankings[0].components.jokerScore).toBe(0)
    
    console.log(`🃏 Joker Integration Test:`)
    console.log(`   Without jokers: ${withoutJokersScore.toFixed(1)} availability points`)
    console.log(`   With jokers: ${withJokersScore.toFixed(1)} availability points`)
    console.log(`   ✅ Joker benefit: ${(withJokersScore - withoutJokersScore).toFixed(1)} points improvement`)
    console.log(`   ✅ Joker component eliminated: ${withJokersResults.rankings[0].components.jokerScore} points`)
  })
  
  test('should maintain 100-point total scoring system', async () => {
    const facts = createVerificationFacts('joker_helps')
    const results = await PatternRankingEngine.rankPatterns([facts], mockPatterns, { phase: 'gameplay', wallTilesRemaining: 84 })
    
    const components = results.rankings[0].components
    const totalComponentSum = components.currentTileScore + components.availabilityScore + components.jokerScore + components.priorityScore
    
    // Total should still be within 0-100 range
    expect(results.rankings[0].totalScore).toBeGreaterThanOrEqual(0)
    expect(results.rankings[0].totalScore).toBeLessThanOrEqual(100)
    expect(totalComponentSum).toEqual(results.rankings[0].totalScore)
    
    console.log(`📊 Scoring System Verification:`)
    console.log(`   Current Tile: ${components.currentTileScore}/40`)
    console.log(`   Availability: ${components.availabilityScore}/50`) 
    console.log(`   Joker: ${components.jokerScore}/0 (eliminated)`)
    console.log(`   Priority: ${components.priorityScore}/10`)
    console.log(`   ✅ Total: ${results.rankings[0].totalScore}/100`)
  })
})