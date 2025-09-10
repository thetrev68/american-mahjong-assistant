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
export type { PlayerTile } from '../../types/tile-types'
export type { NMJL2025Pattern, PatternSelectionOption } from '@shared/nmjl-types'
export type { PatternVariation } from '../../services/pattern-variation-loader'
export type { HandAnalysis } from '../../stores/intelligence-store'