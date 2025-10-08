// Browser console script to set up the test scenario

// Test hand: 1B, 8B, 2C, 3C, 4C, 1D, 3D, 3D, 9D, green×2, red, south wind
const testHandString = '1B 8B 2C 3C 4C 1D 3D 3D 9D green green red south';

// Instructions to run in browser console:
console.log('=== ENGINE 3 DEBUGGING SETUP ===');
console.log('1. Open http://localhost:5174');
console.log('2. Navigate to /tiles');  
console.log('3. Run: useTileStore.getState().importTilesFromString("' + testHandString + '")');
console.log('4. Navigate to /patterns');
console.log('5. Select SINGLES AND PAIRS #2 pattern');
console.log('6. Navigate to /intelligence');
console.log('7. Check console for debug output');
console.log('');
console.log('Test hand:', testHandString);
console.log('Target pattern: SINGLES AND PAIRS #2 (FF 2468 DD 2468 DD)');
console.log('Expected KEEP: 8B, 2C, 4C, green, red'); 
console.log('Expected DISCARD: 1B, 3C, 1D, 3D, 9D, south');