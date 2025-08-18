// Pattern Analysis Script - Test all 71 patterns against user hand
const fs = require('fs');

// User's hand: 1D, 5D, 8D, 4B, 6B×3, 6C×2, east, south, white, f1, joker
const userHand = [
  { id: '1D', suit: 'dots', value: '1' },
  { id: '5D', suit: 'dots', value: '5' },
  { id: '8D', suit: 'dots', value: '8' },
  { id: '4B', suit: 'bams', value: '4' },
  { id: '6B', suit: 'bams', value: '6' },
  { id: '6B', suit: 'bams', value: '6' },
  { id: '6B', suit: 'bams', value: '6' },
  { id: '6C', suit: 'cracks', value: '6' },
  { id: '6C', suit: 'cracks', value: '6' },
  { id: 'east', suit: 'winds', value: 'east' },
  { id: 'south', suit: 'winds', value: 'south' },
  { id: 'white', suit: 'dragons', value: 'white' },
  { id: 'f1', suit: 'flowers', value: 'f1' },
  { id: 'joker', suit: 'jokers', value: 'joker' }
];

// Convert to hand counts format
function countTileIds(tiles) {
  const counts = {};
  tiles.forEach(tile => {
    counts[tile.id] = (counts[tile.id] || 0) + 1;
  });
  return counts;
}

const handCounts = countTileIds(userHand);
console.log('Hand counts:', handCounts);

// Load patterns
const patterns = JSON.parse(fs.readFileSync('./frontend/public/intelligence/nmjl-patterns/nmjl-card-2025.json', 'utf8'));

console.log(`\nAnalyzing ${patterns.length} patterns...\n`);

// Simple pattern analysis function (simplified version of the analysis engine)
function analyzePattern(pattern, handCounts) {
  if (!pattern.Groups || pattern.Groups.length === 0) {
    return { matchingTiles: 0, aiScore: 0, jokerBalance: 0, priority: 0 };
  }

  let totalMatching = 0;
  let jokerBalance = 0;
  let priority = 0;

  // Count jokers available
  const jokersAvailable = handCounts['joker'] || 0;
  let jokersNeeded = 0;

  // Analyze each group
  for (const group of pattern.Groups) {
    const constraintType = group.Constraint_Type;
    const constraintValues = group.Constraint_Values;
    
    if (constraintType === 'pair' && constraintValues === 'flower') {
      // Flower pair
      const flowerCount = (handCounts['f1'] || 0) + (handCounts['f2'] || 0) + 
                         (handCounts['f3'] || 0) + (handCounts['f4'] || 0);
      totalMatching += Math.min(flowerCount, 2);
      if (flowerCount < 2) jokersNeeded += (2 - flowerCount);
      
    } else if (constraintType === 'kong' || constraintType === 'pung' || constraintType === 'pair') {
      const tilesNeeded = constraintType === 'kong' ? 4 : constraintType === 'pung' ? 3 : 2;
      
      if (constraintValues && typeof constraintValues === 'string' && constraintValues.includes(',')) {
        // Multiple possible values
        const values = constraintValues.split(',');
        let bestMatch = 0;
        
        for (const value of values) {
          const trimmedValue = value.trim();
          
          if (['east', 'south', 'west', 'north'].includes(trimmedValue)) {
            bestMatch = Math.max(bestMatch, handCounts[trimmedValue] || 0);
          } else if (['red', 'green', 'white'].includes(trimmedValue)) {
            bestMatch = Math.max(bestMatch, handCounts[trimmedValue] || 0);
          } else if (!isNaN(trimmedValue)) {
            // Number tile
            const num = trimmedValue;
            const suits = ['B', 'C', 'D'];
            for (const suit of suits) {
              const tileId = `${num}${suit}`;
              bestMatch = Math.max(bestMatch, handCounts[tileId] || 0);
            }
          }
        }
        
        totalMatching += Math.min(bestMatch, tilesNeeded);
        if (bestMatch < tilesNeeded) {
          jokersNeeded += (tilesNeeded - bestMatch);
        }
        
      } else if (constraintValues === 'flower') {
        const flowerCount = (handCounts['f1'] || 0) + (handCounts['f2'] || 0) + 
                           (handCounts['f3'] || 0) + (handCounts['f4'] || 0);
        totalMatching += Math.min(flowerCount, tilesNeeded);
        if (flowerCount < tilesNeeded) jokersNeeded += (tilesNeeded - flowerCount);
      }
    }
  }

  // Calculate joker balance
  jokerBalance = jokersAvailable - jokersNeeded;

  // Calculate priority (simplified)
  priority = 5; // Default priority

  // Calculate AI score components
  const currentTileScore = (totalMatching / 14) * 40;
  const availabilityScore = 25; // Assume good availability for first round
  const jokerScore = jokerBalance >= 0 ? 15 : Math.max(0, 10 + jokerBalance * 3);
  const priorityScore = priority;
  
  const aiScore = Math.min(100, currentTileScore + availabilityScore + jokerScore + priorityScore);

  return {
    matchingTiles: totalMatching,
    aiScore: Math.round(aiScore),
    jokerBalance: jokerBalance,
    priority: priority,
    completionPercentage: Math.round((totalMatching / 14) * 100)
  };
}

// Analyze all patterns
const results = patterns.map(pattern => {
  const analysis = analyzePattern(pattern, handCounts);
  
  return {
    pattern: `${pattern.Section}-${pattern.Line}`,
    description: pattern.Hand_Description,
    handPattern: pattern.Hand_Pattern,
    points: pattern.Hand_Points,
    difficulty: pattern.Hand_Difficulty,
    completionPercentage: analysis.completionPercentage,
    matchingTiles: analysis.matchingTiles,
    aiScore: analysis.aiScore,
    jokerBalance: analysis.jokerBalance > 0 ? `+${analysis.jokerBalance}` : analysis.jokerBalance.toString(),
    priority: analysis.priority
  };
});

// Sort by completion percentage (descending)
results.sort((a, b) => b.completionPercentage - a.completionPercentage);

// Output results as table
console.log('| Pattern | Description | Hand Pattern | Points | Difficulty | Completion % | Matching Tiles | AI Score | Joker +/- | Priority |');
console.log('|---------|-------------|--------------|--------|------------|-------------|----------------|----------|-----------|----------|');

results.forEach(result => {
  console.log(`| ${result.pattern} | ${result.description} | ${result.handPattern} | ${result.points} | ${result.difficulty} | ${result.completionPercentage}% | ${result.matchingTiles}/14 | ${result.aiScore} | ${result.jokerBalance} | ${result.priority} |`);
});

console.log(`\nAnalysis complete. Top 10 patterns by completion percentage:`);
results.slice(0, 10).forEach((result, index) => {
  console.log(`${index + 1}. ${result.pattern}: ${result.completionPercentage}% (${result.matchingTiles}/14 tiles)`);
});