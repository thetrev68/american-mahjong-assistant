// frontend/src/utils/nmjl-2025-test.ts
// Test utility to verify NMJL 2025 data loading

import { nmjl2025Loader } from './nmjl-2025-loader';

/**
 * Test and validate NMJL 2025 data loading
 */
export function testNMJL2025Loading() {
  console.log('🔍 Testing NMJL 2025 data loading...');
  
  try {
    // Get basic statistics
    const stats = nmjl2025Loader.getStatistics();
    console.log('📊 Pattern Statistics:', stats);
    
    // Test pattern retrieval
    const allPatterns = nmjl2025Loader.getAllPatterns();
    console.log(`✅ Loaded ${allPatterns.length} patterns`);
    
    // Test first pattern
    if (allPatterns.length > 0) {
      const firstPattern = allPatterns[0];
      console.log('🎯 First Pattern:', {
        id: firstPattern["Pattern ID"],
        description: firstPattern.Hand_Description,
        points: firstPattern.Hand_Points,
        groups: firstPattern.Groups.length
      });
    }
    
    // Test indexing
    const pattern1 = nmjl2025Loader.getPatternById(1);
    if (pattern1) {
      console.log('🔍 Pattern #1 by ID:', pattern1.Hand_Description);
    }
    
    // Test constraint parsing
    if (allPatterns.length > 0) {
      const firstGroup = allPatterns[0].Groups[0];
      const parsedConstraint = nmjl2025Loader.parseConstraint(firstGroup);
      console.log('🎲 First constraint parsed:', {
        raw: parsedConstraint.raw,
        values: parsedConstraint.values,
        isFlower: parsedConstraint.isFlower,
        allowsZeroNeutral: parsedConstraint.allowsZeroNeutral
      });
    }
    
    // Test point-based filtering
    const highPointPatterns = nmjl2025Loader.getPatternsByPoints(50);
    console.log(`💎 50-point patterns: ${highPointPatterns.length}`);
    
    // Test difficulty filtering
    const easyPatterns = nmjl2025Loader.getPatternsByDifficulty('easy');
    console.log(`🟢 Easy patterns: ${easyPatterns.length}`);
    
    // Test joker patterns
    const jokerPatterns = nmjl2025Loader.getJokerPatterns();
    console.log(`🃏 Patterns allowing jokers: ${jokerPatterns.length}`);
    
    console.log('✅ NMJL 2025 data loading test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ NMJL 2025 data loading test failed:', error);
    return false;
  }
}

// Auto-run test in development
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  // Run test after a short delay to ensure module is loaded
  setTimeout(() => {
    testNMJL2025Loading();
  }, 1000);
}