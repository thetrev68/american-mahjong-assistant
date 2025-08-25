// Debug script to test Engine 3 logic directly

// Test data matching the exact bug scenario
const testTileContributions = {
  '4C': { patterns: ['2025-SINGLES_AND_PAIRS-2-1'], patternCount: 1, totalValue: 0.5, isCritical: false, helpsMultiplePatterns: false },
  'green': { patterns: ['2025-SINGLES_AND_PAIRS-2-1'], patternCount: 1, totalValue: 0.5, isCritical: false, helpsMultiplePatterns: false },
  'red': { patterns: ['2025-SINGLES_AND_PAIRS-2-1'], patternCount: 1, totalValue: 0.5, isCritical: false, helpsMultiplePatterns: false },
  '8B': { patterns: ['2025-SINGLES_AND_PAIRS-2-1'], patternCount: 1, totalValue: 0.5, isCritical: false, helpsMultiplePatterns: false },
  '2C': { patterns: ['2025-SINGLES_AND_PAIRS-2-1'], patternCount: 1, totalValue: 0.5, isCritical: false, helpsMultiplePatterns: false },
  '1B': { patterns: [], patternCount: 0, totalValue: 0, isCritical: false, helpsMultiplePatterns: false },
  '3C': { patterns: [], patternCount: 0, totalValue: 0, isCritical: false, helpsMultiplePatterns: false },
  '1D': { patterns: [], patternCount: 0, totalValue: 0, isCritical: false, helpsMultiplePatterns: false },
  '3D': { patterns: [], patternCount: 0, totalValue: 0, isCritical: false, helpsMultiplePatterns: false },
  '9D': { patterns: [], patternCount: 0, totalValue: 0, isCritical: false, helpsMultiplePatterns: false },
  'south': { patterns: [], patternCount: 0, totalValue: 0, isCritical: false, helpsMultiplePatterns: false }
}

console.log('=== ENGINE 3 LOGIC SIMULATION ===');
console.log('Test scenario: SINGLES AND PAIRS #2 with sample hand');
console.log('');

function simulateRecommendationLogic(tileId, tileContributions, gamePhase) {
  const contributions = tileContributions[tileId];
  
  console.log(`\n--- Tile: ${tileId} ---`);
  console.log(`Pattern count: ${contributions.patternCount}`);
  console.log(`Total value: ${contributions.totalValue}`);
  console.log(`Is critical: ${contributions.isCritical}`);
  
  // Simulate Engine 3 decision logic
  let primaryAction = 'neutral';
  let reasoning = 'Neutral strategic value';
  
  if (contributions.patternCount === 0) {
    // Tile doesn't help any viable patterns
    primaryAction = gamePhase === 'charleston' ? 'pass' : 'discard';
    reasoning = 'Does not contribute to any viable patterns';
  } else if (contributions.patternCount === 1 && contributions.totalValue < 0.3) {
    // Low value single tile
    primaryAction = gamePhase === 'charleston' ? 'pass' : 'discard';  
    reasoning = 'Low strategic value for current patterns';
  } else if (contributions.isCritical) {
    // Critical tile
    primaryAction = 'keep';
    reasoning = 'Critical single tile';
  } else {
    // Default for tiles that help patterns
    primaryAction = 'keep';
    reasoning = 'Helps viable pattern';
  }
  
  console.log(`Recommendation: ${primaryAction} (${reasoning})`);
  return primaryAction;
}

// Test all tiles
console.log('Expected KEEP tiles: 4C, green, red, 8B, 2C');
console.log('Expected DISCARD tiles: 1B, 3C, 1D, 3D, 9D, south');
console.log('');

const gamePhase = 'gameplay';
const results = {};

for (const tileId of Object.keys(testTileContributions)) {
  results[tileId] = simulateRecommendationLogic(tileId, testTileContributions, gamePhase);
}

console.log('\n=== FINAL RECOMMENDATIONS ===');
const keepTiles = Object.entries(results).filter(([_, action]) => action === 'keep').map(([tile, _]) => tile);
const discardTiles = Object.entries(results).filter(([_, action]) => action === 'discard').map(([tile, _]) => tile);

console.log('KEEP:', keepTiles.join(', '));
console.log('DISCARD:', discardTiles.join(', '));

console.log('\n=== ISSUE ANALYSIS ===');
console.log('Expected KEEP (tiles in pattern):', ['4C', 'green', 'red', '8B', '2C']);
console.log('Actual KEEP:', keepTiles);
console.log('Match:', JSON.stringify(keepTiles.sort()) === JSON.stringify(['4C', 'green', 'red', '8B', '2C'].sort()));

console.log('\nExpected DISCARD (tiles NOT in pattern):', ['1B', '3C', '1D', '3D', '9D', 'south']);
console.log('Actual DISCARD:', discardTiles);
console.log('Match:', JSON.stringify(discardTiles.sort()) === JSON.stringify(['1B', '3C', '1D', '3D', '9D', 'south'].sort()));