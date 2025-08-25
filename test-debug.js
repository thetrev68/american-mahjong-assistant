// Node.js script to test the exact matching logic

// Test data
const testHand = ['1B', '8B', '2C', '3C', '4C', '1D', '3D', '3D', '9D', 'green', 'green', 'red', 'south'];
const patternVariation = ['flower', 'flower', '2B', '4B', '6B', '8B', 'green', 'green', '2C', '4C', '6C', '8C', 'red', 'red'];

console.log('=== MATCHING LOGIC TEST ===');
console.log('Test hand tiles:', testHand);
console.log('Pattern variation tiles:', patternVariation);
console.log('');

console.log('Testing isRequired logic for each tile:');
for (const playerTile of new Set(testHand)) {
  const isRequired = patternVariation.includes(playerTile);
  console.log(`${playerTile}: isRequired = ${isRequired} (${isRequired ? 'KEEP' : 'DISCARD'})`);
}

console.log('');
console.log('Expected results:');
console.log('KEEP: 8B, 2C, 4C, green, red (should be isRequired=true)'); 
console.log('DISCARD: 1B, 3C, 1D, 3D, 9D, south (should be isRequired=false)');

console.log('');
console.log('Issue check:');
console.log("patternVariation.includes('4C'):", patternVariation.includes('4C'));
console.log("patternVariation.includes('green'):", patternVariation.includes('green'));
console.log("patternVariation.includes('red'):", patternVariation.includes('red'));
console.log("patternVariation.includes('8B'):", patternVariation.includes('8B'));
console.log("patternVariation.includes('2C'):", patternVariation.includes('2C'));