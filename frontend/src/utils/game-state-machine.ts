// frontend/src/utils/game-state-machine.ts
// Game Flow State Machine - Phase transition logic and validation

import type { 
  GameRoom, 
  Player, 
  PlayerPosition,
  CharlestonState
} from '../types';

/*
========================================
CONFIGURABLE CONSTANTS - Easy to tweak!
========================================
*/

// Phase time limits (in minutes) - adjust these as needed after testing
export const PHASE_TIME_LIMITS = {
  POSITIONING_MINUTES: 5,      // Host assigns positions
  TILE_INPUT_MINUTES: 10,      // Players input tiles  
  CHARLESTON_MINUTES: 8,       // All Charleston phases combined
  OVERTIME_FLASH_MS: 500,      // How fast the overtime indicator flashes
} as const;

// Phase transition constants
export const PHASE_SETTINGS = {
  MIN_PLAYERS: 3,              // Minimum players needed
  MAX_PLAYERS: 4,              // Maximum players allowed
  DEALER_TILE_COUNT: 14,       // East (dealer) tile count
  PLAYER_TILE_COUNT: 13,       // Other players tile count
  REQUIRED_CHARLESTON_TILES: 3, // Tiles to pass in Charleston
} as const;

// Convert to milliseconds (used internally)
const PHASE_TIME_LIMITS_MS = {
  positioning: PHASE_TIME_LIMITS.POSITIONING_MINUTES * 60 * 1000,
  'tile-input': PHASE_TIME_LIMITS.TILE_INPUT_MINUTES * 60 * 1000,
  charleston: PHASE_TIME_LIMITS.CHARLESTON_MINUTES * 60 * 1000,
  waiting: undefined,    // No time limit
  playing: undefined,    // Managed by turn timer system
  finished: undefined,   // No time limit
} as const;

/*
========================================
TYPES & INTERFACES
========================================
*/

// Game phases in order
export type GamePhase = 'waiting' | 'positioning' | 'tile-input' | 'charleston' | 'playing' | 'finished';

// Phase transition result
export interface PhaseTransitionResult {
  success: boolean;
  newPhase?: GamePhase;
  error?: string;
  validationErrors?: string[];
  canRollback?: boolean;
  previousPhase?: GamePhase;
}

// Phase validation context
export interface PhaseValidationContext {
  room: GameRoom;
  targetPhase: GamePhase;
  currentPhase: GamePhase;
  players: Player[];
  playerPositions?: Map<string, PlayerPosition>;
  charlestonState?: CharlestonState;
}

// Phase timer info compatible with TurnTimer.tsx
export interface PhaseTimerInfo {
  phase: GamePhase;
  startTime: number;
  timeLimit?: number; // milliseconds
  isOvertime: boolean;
  remainingTime: number;
  shouldFlash: boolean; // for red flash when overtime - compatible with TurnTimer
  // TurnTimer compatible fields
  timeRemaining: number; // in seconds for TurnTimer
  totalTime: number;     // in seconds for TurnTimer
  isActive: boolean;
  urgencyLevel: 'normal' | 'warning' | 'urgent';
}

/**
 * Game State Machine Class
 * Handles phase transitions, validation, and rollback
 */
export class GameStateMachine {
  // Valid phase transitions (from -> to[])
  private static readonly VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
    'waiting': ['positioning', 'tile-input'], // Can skip positioning if already set
    'positioning': ['tile-input', 'waiting'], // Can go back to waiting
    'tile-input': ['charleston', 'positioning'], // Can go back to positioning
    'charleston': ['playing', 'tile-input'], // Can go back to tile input
    'playing': ['finished', 'charleston'], // Can go back to charleston
    'finished': ['waiting'] // Can restart game
  };

  // Phase time limits (in minutes, converted to milliseconds)
  private static readonly PHASE_TIME_LIMITS: Record<GamePhase, number | undefined> = PHASE_TIME_LIMITS_MS;

  /**
   * Validate if a phase transition is allowed
   */
  static validateTransition(context: PhaseValidationContext): PhaseTransitionResult {
    const { targetPhase, currentPhase } = context;
    
    // Check if transition is valid in the state machine
    const allowedTransitions = this.VALID_TRANSITIONS[currentPhase];
    if (!allowedTransitions.includes(targetPhase)) {
      return {
        success: false,
        error: `Cannot transition from ${currentPhase} to ${targetPhase}`,
        canRollback: this.canRollbackFromPhase(currentPhase),
        previousPhase: this.getPreviousPhase(currentPhase)
      };
    }

    // Validate specific phase requirements
    const validationResult = this.validatePhaseRequirements(context);
    if (!validationResult.success) {
      return validationResult;
    }

    return {
      success: true,
      newPhase: targetPhase,
      canRollback: this.canRollbackFromPhase(targetPhase),
      previousPhase: currentPhase
    };
  }

  /**
   * Validate requirements for entering a specific phase
   */
  private static validatePhaseRequirements(context: PhaseValidationContext): PhaseTransitionResult {
    const { targetPhase, players, playerPositions, charlestonState } = context;
    const validationErrors: string[] = [];

    switch (targetPhase) {
      case 'waiting':
        // Can always go back to waiting
        break;

      case 'positioning': {
        // Need at least 3 players to assign positions
        if (players.length < PHASE_SETTINGS.MIN_PLAYERS) {
          validationErrors.push(`Need at least ${PHASE_SETTINGS.MIN_PLAYERS} players for positioning`);
        }
        if (players.length > PHASE_SETTINGS.MAX_PLAYERS) {
          validationErrors.push(`Cannot have more than ${PHASE_SETTINGS.MAX_PLAYERS} players`);
        }
        break;
      }

      case 'tile-input': {
        // All players must be assigned unique positions
        if (!playerPositions || playerPositions.size !== players.length) {
          validationErrors.push('All players must be assigned positions');
        }
        
        if (playerPositions) {
          const positions = Array.from(playerPositions.values());
          const uniquePositions = new Set(positions);
          if (uniquePositions.size !== positions.length) {
            validationErrors.push('All players must have unique positions');
          }

          // Must have exactly one East (dealer)
          const eastCount = positions.filter(pos => pos === 'east').length;
          if (eastCount !== 1) {
            validationErrors.push('Must have exactly one East (dealer) position');
          }
        }
        break;
      }

      case 'charleston': {
        // Validate tile counts: dealer has 14, others have 13
        const validTileCounts = this.validateTileCounts(players, playerPositions);
        if (!validTileCounts.isValid) {
          validationErrors.push(...validTileCounts.errors);
        }
        break;
      }

      case 'playing': {
        // Charleston must be complete or skipped
        if (charlestonState) {
          // Check if Charleston is still active and not complete
          // Note: Assuming CharlestonState has properties to check completion status
          const isCharlestonComplete = this.isCharlestonComplete(charlestonState);
          if (!isCharlestonComplete) {
            validationErrors.push('Charleston must be completed before playing');
          }
        }
        
        // Final tile count validation
        const finalTileValidation = this.validateTileCounts(players, playerPositions);
        if (!finalTileValidation.isValid) {
          validationErrors.push(...finalTileValidation.errors);
        }
        break;
      }

      case 'finished':
        // Game must be in playing state to finish
        break;
    }

    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `Cannot enter ${targetPhase} phase`,
        validationErrors,
        canRollback: this.canRollbackFromPhase(context.currentPhase),
        previousPhase: this.getPreviousPhase(context.currentPhase)
      };
    }

    return { success: true };
  }

  /**
   * Check if Charleston is complete based on the CharlestonState
   */
  private static isCharlestonComplete(charlestonState: CharlestonState): boolean {
    // This method checks if Charleston is complete based on the actual CharlestonState structure
    // Since we don't know the exact structure, we'll provide a flexible implementation
    
    // Method 1: Check if there's a completion property
    if ('isComplete' in charlestonState && typeof charlestonState.isComplete === 'boolean') {
      return charlestonState.isComplete;
    }
    
    // Method 2: Check if phase is 'complete' 
    if ('phase' in charlestonState && charlestonState.phase === 'complete') {
      return true;
    }
    
    // Method 3: Check if active flag is false (meaning Charleston ended)
    if ('active' in charlestonState && typeof charlestonState.active === 'boolean') {
      return !charlestonState.active;
    }
    
    // Default: assume not complete if we can't determine
    console.warn('GameStateMachine: Unable to determine Charleston completion status', charlestonState);
    return false;
  }

  /**
   * Validate tile counts for current phase
   */
  private static validateTileCounts(
    players: Player[], 
    playerPositions?: Map<string, PlayerPosition>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!playerPositions) {
      return { isValid: false, errors: ['Player positions not set'] };
    }

    for (const player of players) {
      const position = playerPositions.get(player.id);
      if (!position) {
        errors.push(`Player ${player.name} has no position assigned`);
        continue;
      }

      const expectedCount = position === 'east' ? PHASE_SETTINGS.DEALER_TILE_COUNT : PHASE_SETTINGS.PLAYER_TILE_COUNT;
      
      // Get tile count from player object - handle different possible structures
      let actualCount = 0;
      if ('tiles' in player && Array.isArray(player.tiles)) {
        actualCount = player.tiles.length;
      } else if ('tilesCount' in player && typeof player.tilesCount === 'number') {
        actualCount = player.tilesCount;
      } else if ('tileCount' in player && typeof player.tileCount === 'number') {
        actualCount = player.tileCount;
      } else {
        errors.push(`Player ${player.name} has no tile count information`);
        continue;
      }

      if (actualCount !== expectedCount) {
        const role = position === 'east' ? 'dealer' : 'player';
        errors.push(`${player.name} (${role}) has ${actualCount} tiles, should have ${expectedCount}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check if rollback is possible from a phase
   */
  private static canRollbackFromPhase(phase: GamePhase): boolean {
    // Can rollback from any phase except waiting
    return phase !== 'waiting';
  }

  /**
   * Get the previous phase for rollback
   */
  private static getPreviousPhase(currentPhase: GamePhase): GamePhase | undefined {
    const phaseOrder: GamePhase[] = ['waiting', 'positioning', 'tile-input', 'charleston', 'playing', 'finished'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    return currentIndex > 0 ? phaseOrder[currentIndex - 1] : undefined;
  }

  /**
   * Get phase timer information compatible with TurnTimer.tsx
   */
  static getPhaseTimerInfo(phase: GamePhase, phaseStartTime: number): PhaseTimerInfo {
    const now = Date.now();
    const elapsed = now - phaseStartTime;
    const timeLimit = this.PHASE_TIME_LIMITS[phase];
    
    const remainingTimeMs = timeLimit ? Math.max(0, timeLimit - elapsed) : 0;
    const isOvertime = timeLimit ? elapsed > timeLimit : false;
    const shouldFlash = isOvertime && (Math.floor(now / PHASE_TIME_LIMITS.OVERTIME_FLASH_MS) % 2 === 0);
    
    // Convert to seconds for TurnTimer compatibility
    const remainingTimeSeconds = Math.floor(remainingTimeMs / 1000);
    const totalTimeSeconds = timeLimit ? Math.floor(timeLimit / 1000) : 0;
    
    // Calculate urgency level (compatible with TurnTimer.tsx)
    const percentage = timeLimit ? (remainingTimeMs / timeLimit) * 100 : 100;
    const urgencyLevel = percentage > 50 ? 'normal' : percentage > 25 ? 'warning' : 'urgent';
    
    return {
      phase,
      startTime: phaseStartTime,
      timeLimit,
      isOvertime,
      remainingTime: remainingTimeMs,
      shouldFlash,
      // TurnTimer.tsx compatible fields
      timeRemaining: remainingTimeSeconds,
      totalTime: totalTimeSeconds,
      isActive: !isOvertime && timeLimit !== undefined,
      urgencyLevel
    };
  }

  /**
   * Format remaining time for display (compatible with TurnTimer.tsx)
   */
  static formatRemainingTime(remainingTimeMs: number): string {
    if (remainingTimeMs <= 0) {
      return 'OVERTIME';
    }

    const totalSeconds = Math.floor(remainingTimeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Create a TurnTimer-compatible props object for phase timers
   */
  static createTurnTimerProps(
    phase: GamePhase, 
    phaseStartTime: number, 
    currentPosition: PlayerPosition = 'east'
  ) {
    const timerInfo = this.getPhaseTimerInfo(phase, phaseStartTime);
    
    return {
      timeRemaining: timerInfo.timeRemaining,
      totalTime: timerInfo.totalTime,
      isActive: timerInfo.isActive,
      currentTurn: currentPosition, // For display purposes
      onTimeUp: () => {
        console.log(`Phase ${phase} has exceeded time limit`);
        // Could emit socket event or show notification here
      }
    };
  }

  /**
   * Get phase display name
   */
  static getPhaseDisplayName(phase: GamePhase): string {
    const displayNames: Record<GamePhase, string> = {
      'waiting': 'Waiting for Players',
      'positioning': 'Assigning Positions',
      'tile-input': 'Input Tiles',
      'charleston': 'Charleston',
      'playing': 'Playing',
      'finished': 'Game Complete'
    };
    return displayNames[phase];
  }

  /**
   * Get phase description for display
   */
  static getPhaseDescription(phase: GamePhase): string {
    const descriptions: Record<GamePhase, string> = {
      'waiting': 'Waiting for all players to join the game',
      'positioning': 'Host is assigning player positions (East, South, West, North)',
      'tile-input': 'Players are entering their tiles (Dealer gets 14, others get 13)',
      'charleston': 'Players are coordinating tile passes (Right, Across, Left, Optional)',
      'playing': 'Game in progress - making moves and building hands',
      'finished': 'Game completed - view final scores and hands'
    };
    return descriptions[phase];
  }

  /**
   * Perform a phase transition with validation
   */
  static transitionToPhase(context: PhaseValidationContext): PhaseTransitionResult {
    console.log(`State Machine: Attempting transition from ${context.currentPhase} to ${context.targetPhase}`);
    
    const result = this.validateTransition(context);
    
    if (result.success) {
      console.log(`State Machine: Transition successful to ${result.newPhase}`);
    } else {
      console.warn(`State Machine: Transition failed:`, result.error, result.validationErrors);
    }
    
    return result;
  }

  /**
   * Rollback to previous phase
   */
  static rollbackToPreviousPhase(currentPhase: GamePhase): PhaseTransitionResult {
    const previousPhase = this.getPreviousPhase(currentPhase);
    
    if (!previousPhase) {
      return {
        success: false,
        error: 'Cannot rollback from waiting phase',
        canRollback: false
      };
    }

    if (!this.canRollbackFromPhase(currentPhase)) {
      return {
        success: false,
        error: `Cannot rollback from ${currentPhase} phase`,
        canRollback: false
      };
    }

    console.log(`State Machine: Rolling back from ${currentPhase} to ${previousPhase}`);
    
    return {
      success: true,
      newPhase: previousPhase,
      previousPhase: currentPhase,
      canRollback: this.canRollbackFromPhase(previousPhase)
    };
  }

  /**
   * Get next logical phase (for automatic progression suggestions)
   */
  static getNextPhase(currentPhase: GamePhase): GamePhase | undefined {
    const phaseOrder: GamePhase[] = ['waiting', 'positioning', 'tile-input', 'charleston', 'playing', 'finished'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    return currentIndex < phaseOrder.length - 1 ? phaseOrder[currentIndex + 1] : undefined;
  }

  /**
   * Check if a phase requires host action
   */
  static requiresHostAction(phase: GamePhase): boolean {
    return phase === 'positioning' || phase === 'waiting';
  }

  /**
   * Check if a phase allows player input
   */
  static allowsPlayerInput(phase: GamePhase): boolean {
    return phase === 'tile-input' || phase === 'charleston' || phase === 'playing';
  }

}