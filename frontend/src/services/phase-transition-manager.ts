// Phase Transition Manager
// Seamless integration between all game phases with proper state management

import { useRoomStore } from '../stores/room-store'
import { useGameStore } from '../stores/game-store'
import { useTurnStore } from '../stores/turn-store'
import { useCharlestonStore } from '../stores/charleston-store'
import { getRoomMultiplayerService } from './room-multiplayer'
// Turn multiplayer service integration would go here if needed

export type GamePhase = 'waiting' | 'setup' | 'charleston' | 'playing' | 'scoring' | 'finished'

interface PhaseTransitionConfig {
  fromPhase: GamePhase
  toPhase: GamePhase
  requiredReadiness: 'room' | 'charleston' | 'gameplay' | null
  validationRules: (() => boolean)[]
  setupActions: (() => void | Promise<void>)[]
  cleanupActions: (() => void)[]
}

export class PhaseTransitionManager {
  private static instance: PhaseTransitionManager | null = null
  private currentPhase: GamePhase = 'waiting'
  private transitionInProgress = false

  private constructor() {}

  static getInstance(): PhaseTransitionManager {
    if (!PhaseTransitionManager.instance) {
      PhaseTransitionManager.instance = new PhaseTransitionManager()
    }
    return PhaseTransitionManager.instance
  }

  // Define phase transition configurations
  private getTransitionConfig(fromPhase: GamePhase, toPhase: GamePhase): PhaseTransitionConfig | null {
    const configs: Record<string, PhaseTransitionConfig> = {
      // Room setup to Charleston
      'waiting->setup': {
        fromPhase: 'waiting',
        toPhase: 'setup',
        requiredReadiness: 'room',
        validationRules: [
          () => useRoomStore.getState().getConnectedPlayers().length >= 2,
          () => useRoomStore.getState().getConnectedPlayers().every(p => p.roomReadiness)
        ],
        setupActions: [
          async () => {
            // Initialize player positions if not set
            const roomStore = useRoomStore.getState()
            const players = roomStore.getConnectedPlayers()
            const positions = ['east', 'north', 'west', 'south']
            
            players.forEach((player, index) => {
              if (!player.position && index < positions.length) {
                roomStore.updatePlayerState(player.id, { position: positions[index] as any })
              }
            })
          }
        ],
        cleanupActions: []
      },

      // Setup to Charleston
      'setup->charleston': {
        fromPhase: 'setup',
        toPhase: 'charleston',
        requiredReadiness: 'charleston',
        validationRules: [
          () => useRoomStore.getState().getConnectedPlayers().length >= 2,
          () => useRoomStore.getState().getConnectedPlayers().every(p => p.position)
        ],
        setupActions: [
          async () => {
            // Initialize Charleston phase
            const charlestonStore = useCharlestonStore.getState()
            const roomStore = useRoomStore.getState()
            const players = roomStore.getConnectedPlayers()
            
            // Set up Charleston multiplayer mode
            charlestonStore.setMultiplayerMode(true, roomStore.currentRoomCode || undefined)
            
            // Initialize Charleston for each player
            players.forEach(player => {
              charlestonStore.setPlayerReady(player.id, false)
            })

            // Set initial Charleston phase
            charlestonStore.setPhase('right')
          }
        ],
        cleanupActions: []
      },

      // Charleston to Turn Management/Playing
      'charleston->playing': {
        fromPhase: 'charleston',
        toPhase: 'playing',
        requiredReadiness: 'gameplay',
        validationRules: [
          () => {
            // Check if Charleston is complete - all phases done
            const charlestonStore = useCharlestonStore.getState()
            return charlestonStore.currentPhase === 'complete' || 
                   (charlestonStore.phaseHistory.length >= 3 && !charlestonStore.isActive)
          },
          () => useRoomStore.getState().getConnectedPlayers().every(p => p.charlestonReadiness)
        ],
        setupActions: [
          async () => {
            // Initialize turn management
            const turnStore = useTurnStore.getState()
            const roomStore = useRoomStore.getState()
            const players = roomStore.getConnectedPlayers()
            
            // Convert players to TurnPlayer format
            const turnPlayers = players.map(p => ({
              id: p.id,
              name: p.name,
              position: p.position!,
              isReady: true
            }))
            
            // Initialize turns and multiplayer
            turnStore.initializeTurns(turnPlayers)
            turnStore.setMultiplayerMode(true, roomStore.currentRoomCode || undefined)
            
            // Initialize turn multiplayer service if available
            const roomService = getRoomMultiplayerService()
            if (roomService) {
              // This would need socket integration - placeholder for now
              console.log('Turn multiplayer service initialization needed')
            }
            
            // Start the game
            turnStore.startGame()
            
            // Set game phase in game store
            useGameStore.getState().setGamePhase('playing')
          }
        ],
        cleanupActions: [
          () => {
            // Clean up Charleston state
            useCharlestonStore.getState().endCharleston()
          }
        ]
      },

      // Playing to Scoring
      'playing->scoring': {
        fromPhase: 'playing',
        toPhase: 'scoring',
        requiredReadiness: null,
        validationRules: [
          () => {
            // Game completion logic - placeholder
            // In real game, this would check for winning conditions
            return true
          }
        ],
        setupActions: [
          async () => {
            // Set up scoring phase
            useGameStore.getState().setGamePhase('finished')
          }
        ],
        cleanupActions: [
          () => {
            // Clean up turn management
            useTurnStore.getState().resetTurns()
          }
        ]
      },

      // Scoring to Finished
      'scoring->finished': {
        fromPhase: 'scoring',
        toPhase: 'finished',
        requiredReadiness: null,
        validationRules: [
          () => true // Always allow finishing
        ],
        setupActions: [
          async () => {
            useGameStore.getState().setGamePhase('finished')
          }
        ],
        cleanupActions: []
      }
    }

    return configs[`${fromPhase}->${toPhase}`] || null
  }

  // Initiate phase transition
  async transitionToPhase(targetPhase: GamePhase): Promise<{ success: boolean; error?: string }> {
    if (this.transitionInProgress) {
      return { success: false, error: 'Transition already in progress' }
    }

    const fromPhase = this.currentPhase
    const config = this.getTransitionConfig(fromPhase, targetPhase)
    
    if (!config) {
      return { success: false, error: `Invalid transition from ${fromPhase} to ${targetPhase}` }
    }

    this.transitionInProgress = true

    try {
      // Validate transition requirements
      const validationResults = config.validationRules.map(rule => {
        try {
          return rule()
        } catch (error) {
          console.error('Validation rule error:', error)
          return false
        }
      })

      if (!validationResults.every(Boolean)) {
        return { success: false, error: 'Validation requirements not met' }
      }

      // Check readiness requirements
      if (config.requiredReadiness) {
        const roomStore = useRoomStore.getState()
        const readinessSummary = roomStore.getReadinessSummary(config.requiredReadiness)
        
        if (readinessSummary.notReady.length > 0) {
          return { 
            success: false, 
            error: `Waiting for players: ${readinessSummary.notReady.join(', ')}` 
          }
        }
      }

      // Execute setup actions
      for (const action of config.setupActions) {
        try {
          await action()
        } catch (error) {
          console.error('Setup action error:', error)
          return { success: false, error: 'Failed to execute setup actions' }
        }
      }

      // Update phase in stores
      useRoomStore.getState().setCurrentPhase(targetPhase)
      this.currentPhase = targetPhase

      // Notify multiplayer service if available
      const roomService = getRoomMultiplayerService()
      if (roomService) {
        roomService.initiatePhaseTransition(fromPhase, targetPhase)
      }

      // Execute cleanup actions for previous phase
      config.cleanupActions.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          console.error('Cleanup action error:', error)
        }
      })

      // Add success alert
      useGameStore.getState().addAlert({
        type: 'success',
        title: 'Phase Transition',
        message: `Transitioned from ${fromPhase} to ${targetPhase}`
      })

      return { success: true }

    } catch (error) {
      console.error('Phase transition error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown transition error' 
      }
    } finally {
      this.transitionInProgress = false
    }
  }

  // Get current phase
  getCurrentPhase(): GamePhase {
    return this.currentPhase
  }

  // Check if transition is valid
  canTransitionTo(targetPhase: GamePhase): { canTransition: boolean; reason?: string } {
    if (this.transitionInProgress) {
      return { canTransition: false, reason: 'Transition in progress' }
    }

    const config = this.getTransitionConfig(this.currentPhase, targetPhase)
    if (!config) {
      return { canTransition: false, reason: `Invalid transition from ${this.currentPhase} to ${targetPhase}` }
    }

    // Check validation rules
    try {
      const validationResults = config.validationRules.map(rule => rule())
      if (!validationResults.every(Boolean)) {
        return { canTransition: false, reason: 'Validation requirements not met' }
      }
    } catch (error) {
      return { canTransition: false, reason: 'Validation error' }
    }

    // Check readiness if required
    if (config.requiredReadiness) {
      const roomStore = useRoomStore.getState()
      const readinessSummary = roomStore.getReadinessSummary(config.requiredReadiness)
      
      if (readinessSummary.notReady.length > 0) {
        return { 
          canTransition: false, 
          reason: `Waiting for: ${readinessSummary.notReady.join(', ')}` 
        }
      }
    }

    return { canTransition: true }
  }

  // Get next available phase
  getNextPhase(): GamePhase | null {
    const phaseOrder: GamePhase[] = ['waiting', 'setup', 'charleston', 'playing', 'scoring', 'finished']
    const currentIndex = phaseOrder.indexOf(this.currentPhase)
    
    if (currentIndex === -1 || currentIndex === phaseOrder.length - 1) {
      return null
    }
    
    return phaseOrder[currentIndex + 1]
  }

  // Auto-advance to next phase if possible
  async autoAdvancePhase(): Promise<{ success: boolean; phase?: GamePhase; error?: string }> {
    const nextPhase = this.getNextPhase()
    if (!nextPhase) {
      return { success: false, error: 'No next phase available' }
    }

    const canAdvance = this.canTransitionTo(nextPhase)
    if (!canAdvance.canTransition) {
      return { success: false, error: canAdvance.reason }
    }

    const result = await this.transitionToPhase(nextPhase)
    return { ...result, phase: nextPhase }
  }

  // Reset to initial phase
  resetPhases(): void {
    // Clean up all stores
    useRoomStore.getState().clearAll()
    useGameStore.getState().resetGame()
    useTurnStore.getState().resetTurns()
    useCharlestonStore.getState().endCharleston()
    
    this.currentPhase = 'waiting'
    this.transitionInProgress = false
  }

  // Sync phase with room store
  syncWithRoomStore(): void {
    const roomPhase = useRoomStore.getState().currentPhase
    if (roomPhase !== this.currentPhase) {
      this.currentPhase = roomPhase
    }
  }
}

// Export singleton instance getter
export const getPhaseTransitionManager = (): PhaseTransitionManager => {
  return PhaseTransitionManager.getInstance()
}

// Helper hooks for React components
export const usePhaseTransition = () => {
  const manager = getPhaseTransitionManager()
  
  return {
    currentPhase: manager.getCurrentPhase(),
    transitionTo: (phase: GamePhase) => manager.transitionToPhase(phase),
    canTransitionTo: (phase: GamePhase) => manager.canTransitionTo(phase),
    getNextPhase: () => manager.getNextPhase(),
    autoAdvance: () => manager.autoAdvancePhase(),
    reset: () => manager.resetPhases()
  }
}