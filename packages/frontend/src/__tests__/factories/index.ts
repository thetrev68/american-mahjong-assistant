/**
 * Test Data Factories
 * 
 * Provides consistent, reusable test data for all test suites
 * Reduces duplication and ensures test data consistency across the application
 */

export * from './tile-factories'
export * from './pattern-factories' 
export * from './game-state-factories'
export * from './analysis-factories'
export * from './mock-service-factories'

// Re-export commonly used types for convenience
export type { PlayerTile } from 'shared-types'
export type { NMJL2025Pattern, PatternSelectionOption } from 'shared-types'
export type { PatternVariation } from '../intelligence-panel/services/pattern-variation-loader'
export type { HandAnalysis } from '../../stores/intelligence-store'