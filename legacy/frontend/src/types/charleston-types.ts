// frontend/src/types/charleston-types.ts
// Charleston-specific type definitions for American Mahjong Web Assistant

import type { Tile, PlayerPosition, HandPattern } from './index';

// Charleston phase progression
export type CharlestonPhase = 'right' | 'across' | 'left' | 'optional' | 'complete';

// Pass direction for tile distribution
export type PassDirection = {
  from: PlayerPosition;
  to: PlayerPosition;
};

// Individual player's Charleston selection state
export interface CharlestonPlayerState {
  playerId: string;
  selectedTiles: Tile[];
  isReady: boolean;
  hasConfirmed: boolean;
  tilesReceived?: Tile[]; // Tiles received from previous phase
}

// Overall Charleston phase state
export interface CharlestonPhaseState {
  phase: CharlestonPhase;
  playerStates: Map<string, CharlestonPlayerState>;
  allPlayersReady: boolean;
  passDirections: PassDirection[];
  phaseStartTime: number;
  timeLimit: number; // seconds
  canSkipOptional: boolean;
}

// Recommendation confidence levels
export type RecommendationConfidence = 'low' | 'medium' | 'high' | 'certain';

// Reason categories for passing tiles
export type PassReason = 
  | 'isolated_tile'      // Tile has no support in current hand
  | 'excess_duplicates'  // Too many of this tile type
  | 'pattern_conflict'   // Tile conflicts with target patterns
  | 'low_probability'    // Low chance of completing with this tile
  | 'defensive_safe'     // Safe to pass, unlikely to help opponents
  | 'strategic_bait'     // Pass to potentially mislead opponents
  | 'pattern_switch';    // Switching to different pattern strategy

// Individual tile recommendation with reasoning
export interface TileRecommendation {
  tile: Tile;
  action: 'pass' | 'keep' | 'neutral';
  reason: PassReason;
  reasoning: string; // Human-readable explanation
  confidence: RecommendationConfidence;
  priority: number; // 1-10, higher = more important
}

// Complete Charleston recommendation for a player
export interface CharlestonRecommendation {
  // Primary recommendations
  tilesToPass: Tile[];
  tilesToKeep: Tile[];
  
  // Detailed analysis for each tile
  tileAnalysis: TileRecommendation[];
  
  // Alternative passing options
  alternativeOptions: {
    tiles: Tile[];
    reasoning: string;
    confidence: RecommendationConfidence;
  }[];
  
  // Overall strategy explanation
  overallStrategy: string;
  confidence: RecommendationConfidence;
  
  // Pattern analysis
  currentPatterns: HandPattern[];
  targetPatterns: HandPattern[];
  patternShift: string; // How Charleston affects pattern strategy
  
  // Phase-specific advice
  phaseAdvice: {
    whatToExpect: string; // What tiles might come back
    nextPhaseStrategy: string; // How this affects next phase
    riskAssessment: string; // Potential risks of this strategy
  };
}

// Charleston state for entire room
export interface CharlestonRoomState {
  isActive: boolean;
  currentPhase: CharlestonPhase;
  completedPhases: CharlestonPhase[];
  playerCount: number; // 3 or 4 players
  phaseState: CharlestonPhaseState;
  
  // Phase progression tracking
  canAdvanceToNext: boolean;
  nextPhase?: CharlestonPhase;
  hasOptionalPhase: boolean;
}

// Tile distribution result after a phase completes
export interface TileDistribution {
  fromPlayerId: string;
  toPlayerId: string;
  tiles: Tile[];
  phase: CharlestonPhase;
  timestamp: number;
}

// Charleston completion summary
export interface CharlestonSummary {
  totalPhases: number;
  completedPhases: CharlestonPhase[];
  skippedPhases: CharlestonPhase[];
  playerSummaries: {
    playerId: string;
    tilesGiven: number;
    tilesReceived: number;
    netChange: Tile[]; // Final tiles gained/lost
    strategySuccess: 'improved' | 'neutral' | 'worsened';
  }[];
  duration: number; // Total Charleston time in seconds
}

// Analysis context for recommendation engine
export interface CharlestonAnalysisContext {
  playerTiles: Tile[];
  currentPhase: CharlestonPhase;
  phasesRemaining: CharlestonPhase[];
  opponentCount: number; // 2 or 3 other players
  gameSettings: {
    enableOptional: boolean;
    timeLimit: number;
    cardYear: number; // For pattern matching
  };
  
  // Historical context (if available)
  previousPhases?: {
    phase: CharlestonPhase;
    tilesPassed: Tile[];
    tilesReceived: Tile[];
  }[];
}

// Error types for Charleston operations
export type CharlestonError = 
  | 'insufficient_tiles'     // Player doesn't have enough tiles
  | 'invalid_tile_count'     // Must pass exactly 3 tiles
  | 'phase_not_active'       // Charleston phase not currently active
  | 'player_not_ready'       // Player hasn't made selection
  | 'duplicate_selection'    // Same tile selected multiple times
  | 'tile_not_owned'         // Player doesn't own selected tile
  | 'phase_timeout'          // Phase time limit exceeded
  | 'invalid_phase_transition'; // Can't advance to next phase

// Charleston validation result
export interface CharlestonValidation {
  isValid: boolean;
  errors: CharlestonError[];
  warnings: string[];
  canProceed: boolean;
}

// Hook return type for Charleston functionality
export interface UseCharlestonReturn {
  // Current state
  charlestonState: CharlestonRoomState;
  playerState: CharlestonPlayerState;
  recommendations: CharlestonRecommendation | null;
  
  // Actions
  selectTile: (tile: Tile) => void;
  deselectTile: (tile: Tile) => void;
  confirmSelection: () => void;
  clearSelection: () => void;
  
  // Phase management
  canAdvancePhase: boolean;
  advancePhase: () => void;
  skipOptionalPhase: () => void;
  
  // State checks
  isLoading: boolean;
  error: string | null;
  validation: CharlestonValidation;
}

// Constants for Charleston mechanics
export const CHARLESTON_CONSTANTS = {
  TILES_TO_PASS: 3,
  MAX_PHASE_TIME: 120, // seconds
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 4,
  
  // Phase order
  PHASE_ORDER: ['right', 'across', 'left', 'optional'] as CharlestonPhase[],
  
  // 3-player adjustments
  THREE_PLAYER_SKIP_PHASES: ['across'] as CharlestonPhase[],
  
  // Confidence thresholds
  CONFIDENCE_THRESHOLDS: {
    LOW: 0.3,
    MEDIUM: 0.6,
    HIGH: 0.8,
    CERTAIN: 0.95
  },
  
  // Priority levels
  PRIORITY_LEVELS: {
    CRITICAL: 9,  // Must pass/keep
    HIGH: 7,      // Strongly recommended
    MEDIUM: 5,    // Good option
    LOW: 3,       // Neutral
    MINIMAL: 1    // Last resort
  }
} as const;