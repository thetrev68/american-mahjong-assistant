// Node.js integration test to debug the Engine 3 issue

// Since we can't run the full TS app in Node, let's simulate the exact data flow

// Mock the pattern variation data
const singlesPairsVariation = {
  "year": 2025,
  "section": "SINGLES AND PAIRS",
  "line": 2,
  "patternId": "2025-SINGLES_AND_PAIRS-2-1",
  "handKey": "2025-SINGLES_AND_PAIRS-2-1",
  "handPattern": "FF 2468 DD 2468 DD",
  "handCriteria": "Any 2 Suits w Matching Dragons",
  "handPoints": 50,
  "handConcealed": true,
  "sequence": 1,
  "tiles": [
    "flower",
    "flower", 
    "2B",
    "4B",
    "6B", 
    "8B",
    "green",
    "green",
    "2C",
    "4C",
    "6C",
    "8C",
    "red",
    "red"
  ]
};

const testHand = ['1B', '8B', '2C', '3C', '4C', '1D', '3D', '3D', '9D', 'green', 'green', 'red', 'south'];

console.log('=== ENGINE INTEGRATION DEBUG TEST ===');
console.log('Test hand:', testHand);
console.log('Pattern variation tiles:', singlesPairsVariation.tiles);
console.log('');

console.log('=== SIMULATING ENGINE 1 ANALYSIS ===');
const tileContributions = [];

for (const playerTile of new Set(testHand)) {
  const isRequired = singlesPairsVariation.tiles.includes(playerTile);
  
  console.log(`${playerTile}: isRequired = ${isRequired}`);
  
  tileContributions.push({
    tileId: playerTile,
    positionsInPattern: [], // simplified
    isRequired: isRequired,
    isCritical: false,
    canBeReplaced: true
  });
}

console.log('');
console.log('=== SIMULATING ENGINE 3 TILE CONTRIBUTION ANALYSIS ===');

function analyzeTileContributions(tileId, mockAnalysisFacts) {
  // Simulate Engine 3's analyzeTileContributions method
  const patterns = [];
  let totalValue = 0;
  let isCritical = false;
  let topPattern = '';
  
  // Mock analysis facts structure
  const mockFact = {
    patternId: '2025-SINGLES_AND_PAIRS-2-1',
    tileMatching: {
      bestVariation: {
        completionRatio: 0.4, // 40% complete
        tileContributions: tileContributions
      }
    }
  };
  
  const viablePatterns = [mockFact];
  
  for (const patternFact of viablePatterns) {
    const bestVariation = patternFact.tileMatching.bestVariation;
    const tileContributionList = bestVariation.tileContributions;
    
    const tileContribution = tileContributionList.find(contrib => contrib.tileId === tileId);
    
    if (tileContribution && tileContribution.isRequired) {
      patterns.push(patternFact.patternId);
      totalValue += 0.5; // base value
      topPattern = patternFact.patternId;
    }
  }
  
  return {
    patterns,
    patternCount: patterns.length,
    totalValue,
    isCritical,
    helpsMultiplePatterns: patterns.length >= 2,
    topPattern
  };
}

console.log('=== SIMULATING ENGINE 3 RECOMMENDATIONS ===');

const gameContext = { phase: 'gameplay' };
const recommendations = {};

for (const tileId of new Set(testHand)) {
  const tileContributions = analyzeTileContributions(tileId, []);
  
  console.log(`\n--- ${tileId} ---`);
  console.log(`Pattern count: ${tileContributions.patternCount}`);
  console.log(`Total value: ${tileContributions.totalValue}`);
  
  // Simulate Engine 3 decision logic
  let primaryAction = 'neutral';
  let reasoning = 'Neutral strategic value';
  
  if (tileContributions.patternCount === 0) {
    primaryAction = 'discard';
    reasoning = 'Does not contribute to any viable patterns';
  } else if (tileContributions.patternCount === 1 && tileContributions.totalValue < 0.3) {
    primaryAction = 'discard';
    reasoning = 'Low strategic value for current patterns';
  } else if (tileContributions.isCritical) {
    primaryAction = 'keep';
    reasoning = 'Critical single tile';
  } else if (tileContributions.patternCount >= 1) {
    primaryAction = 'keep';
    reasoning = 'Helps viable pattern';
  }
  
  console.log(`Recommendation: ${primaryAction} (${reasoning})`);
  recommendations[tileId] = primaryAction;
}

console.log('\n=== FINAL RESULTS ===');
const keepTiles = Object.entries(recommendations).filter(([_, action]) => action === 'keep').map(([tile, _]) => tile);
const discardTiles = Object.entries(recommendations).filter(([_, action]) => action === 'discard').map(([tile, _]) => tile);

console.log('KEEP recommendations:', keepTiles.join(', '));
console.log('DISCARD recommendations:', discardTiles.join(', '));

console.log('\n=== VERIFICATION ===');
const expectedKeep = ['8B', '2C', '4C', 'green', 'red'];
const expectedDiscard = ['1B', '3C', '1D', '3D', '9D', 'south'];

console.log('Expected KEEP:', expectedKeep.join(', '));
console.log('Expected DISCARD:', expectedDiscard.join(', '));

const keepMatch = JSON.stringify(keepTiles.sort()) === JSON.stringify(expectedKeep.sort());
const discardMatch = JSON.stringify(discardTiles.sort()) === JSON.stringify(expectedDiscard.sort());

console.log('\nKEEP match:', keepMatch);
console.log('DISCARD match:', discardMatch);

if (keepMatch && discardMatch) {
  console.log('\n✅ ENGINE LOGIC IS WORKING CORRECTLY');
  console.log('The issue must be elsewhere in the data flow or UI display');
} else {
  console.log('\n❌ ENGINE LOGIC HAS ISSUES');
  console.log('Need to debug the specific logic errors');
}