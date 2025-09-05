// Game Actions Service
// Complete action system for American Mahjong gameplay with validation and coordination

import type { Tile } from '../types/tile-types'
import type { NMJLPattern } from '../../../shared/nmjl-types'
import { useGameStore } from '../stores/game-store'
import { useTileStore } from '../stores/tile-store'
import { useTurnStore } from '../stores/turn-store'
import { useRoomStore } from '../stores/room-store'
import { useIntelligenceStore } from '../stores/intelligence-store'
import { getUnifiedMultiplayerManager } from './unified-multiplayer-manager'

export type GameAction = 'draw' | 'discard' | 'call' | 'joker-swap' | 'mahjong' | 'pass-out'
export type CallType = 'pung' | 'kong' | 'quint' | 'sextet'

export interface ActionValidationResult {
  isValid: boolean
  reason?: string
  allowedActions?: GameAction[]
}

export interface DiscardRecommendation {
  tile: Tile
  riskLevel: 'safe' | 'moderate' | 'dangerous'
  patternProgress: {
    score: number
    description: string
  }
  reasoning: string
  recommended: boolean
}

export interface CallOpportunity {
  tile: Tile
  callType: CallType
  exposedTiles: Tile[]
  priority: 'high' | 'medium' | 'low'
  reasoning: string
  patternProgress: number
}

export interface GameState {
  currentPlayer: string | null
  turnNumber: number
  playerHands: Record<string, Tile[]>
  discardPile: Tile[]
  exposedTiles: Record<string, Tile[]>
  wallCount: number
  playerActions: Record<string, {
    hasDrawn: boolean
    hasDiscarded: boolean
    availableActions: GameAction[]
  }>
}

export class GameActionsService {
  private static instance: GameActionsService | null = null
  private multiplayerManager: ReturnType<typeof getUnifiedMultiplayerManager> | null = null

  private constructor() {
    this.multiplayerManager = getUnifiedMultiplayerManager()
  }

  static getInstance(): GameActionsService {
    if (!GameActionsService.instance) {
      GameActionsService.instance = new GameActionsService()
    }
    return GameActionsService.instance
  }

  // Core Actions - Enhanced Implementations

  async drawTile(playerId: string): Promise<Tile | null> {
    const validation = this.validateAction('draw', this.getCurrentGameState(), playerId)
    if (!validation.isValid) {
      console.error('Draw action invalid:', validation.reason)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Invalid Action',
        message: validation.reason || 'Cannot draw tile at this time'
      })
      return null
    }

    try {
      // In multiplayer mode, request from server
      if (useRoomStore.getState().coPilotMode === 'everyone' && this.multiplayerManager) {
        const success = await this.multiplayerManager.emitToService('turn', 'draw-tile-request', {
          playerId,
          roomId: useRoomStore.getState().currentRoomCode
        }, { priority: 'high', requiresAck: true })

        if (!success) {
          console.log('Draw tile request queued due to connection issues')
          return null
        }
      }

      // For solo mode or immediate response, generate tile locally
      const tile = this.generateDrawnTile()
      if (tile) {
        // Add to player hand
        useTileStore.getState().addTile(tile)
        
        // Update turn state
        const turnStore = useTurnStore.getState()
        if (turnStore.currentPlayer === playerId) {
          // Mark that player has drawn
          this.markPlayerAction(playerId, 'hasDrawn', true)
          
          // Update available actions
          this.updateAvailableActions(playerId)
        }

        console.log(`Player ${playerId} drew tile:`, tile.displayNameName)
      }

      return tile
    } catch (error) {
      console.error('Error drawing tile:', error)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Draw Failed',
        message: 'Failed to draw tile. Please try again.'
      })
      return null
    }
  }

  async discardTile(playerId: string, tile: Tile): Promise<boolean> {
    const validation = this.validateAction('discard', this.getCurrentGameState(), playerId, tile)
    if (!validation.isValid) {
      console.error('Discard action invalid:', validation.reason)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Invalid Discard',
        message: validation.reason || 'Cannot discard that tile'
      })
      return false
    }

    try {
      // Remove tile from hand
      useTileStore.getState().removeTile(tile.id)
      
      // Add to discard pile
      this.addToDiscardPile(tile, playerId)
      
      // In multiplayer mode, broadcast discard and check for call opportunities
      if (useRoomStore.getState().coPilotMode === 'everyone' && this.multiplayerManager) {
        const success = await this.multiplayerManager.emitToService('turn', 'discard-tile', {
          playerId,
          roomId: useRoomStore.getState().currentRoomCode,
          tile: {
            id: tile.id,
            suit: tile.suit,
            value: tile.value,
            displayName: tile.displayNameName,
            isJoker: tile.isJoker
          }
        }, { priority: 'high' })

        if (!success) {
          console.log('Discard broadcast queued due to connection issues')
        }
      }

      // Update player actions
      this.markPlayerAction(playerId, 'hasDiscarded', true)
      this.markPlayerAction(playerId, 'hasDrawn', false) // Reset for next turn
      
      // Update available actions
      this.updateAvailableActions(playerId)

      // Check for call opportunities (solo mode simulation)
      if (!useRoomStore.getState().coPilotMode === 'everyone') {
        this.simulateCallOpportunities(tile, playerId)
      }

      // Analyze hand after discard for AI recommendations
      const intelligenceStore = useIntelligenceStore.getState()
      const currentHand = useTileStore.getState().playerHand
      intelligenceStore.analyzeHand(currentHand, useTileStore.getState().exposedTiles)

      console.log(`Player ${playerId} discarded:`, tile.displayName)
      return true
    } catch (error) {
      console.error('Error discarding tile:', error)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Discard Failed',
        message: 'Failed to discard tile. Please try again.'
      })
      return false
    }
  }

  async makeCall(playerId: string, callType: CallType, tiles: Tile[]): Promise<boolean> {
    const validation = this.validateAction('call', this.getCurrentGameState(), playerId, { callType, tiles })
    if (!validation.isValid) {
      console.error('Call action invalid:', validation.reason)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Invalid Call',
        message: validation.reason || 'Cannot make that call'
      })
      return false
    }

    try {
      // Remove tiles from hand and add to exposed tiles
      tiles.forEach(tile => {
        useTileStore.getState().removeTile(tile.id)
      })
      
      // Add to exposed tiles
      useTileStore.getState().addExposedTiles(tiles, callType)
      
      // In multiplayer mode, broadcast call
      if (useRoomStore.getState().coPilotMode === 'everyone' && this.multiplayerManager) {
        const success = await this.multiplayerManager.emitToService('turn', 'player-call', {
          playerId,
          roomId: useRoomStore.getState().currentRoomCode,
          callType,
          tiles: tiles.map(tile => ({
            id: tile.id,
            suit: tile.suit,
            value: tile.value,
            displayName: tile.displayNameName
          }))
        }, { priority: 'critical' })

        if (!success) {
          console.log('Call broadcast queued due to connection issues')
        }
      }

      // Set current player turn (calls interrupt turn order)
      const turnStore = useTurnStore.getState()
      turnStore.setCurrentPlayer(playerId)
      
      // Update available actions (must discard after call)
      this.updateAvailableActions(playerId)

      console.log(`Player ${playerId} called ${callType} with:`, tiles.map(t => t.displayName))
      
      useGameStore.getState().addAlert({
        type: 'success',
        title: 'Call Made',
        message: `${callType.toUpperCase()} call successful`
      })
      
      return true
    } catch (error) {
      console.error('Error making call:', error)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Call Failed',
        message: 'Failed to make call. Please try again.'
      })
      return false
    }
  }

  // Advanced Actions

  async swapJoker(playerId: string, jokerLocation: 'own' | 'opponent', targetTile: Tile): Promise<boolean> {
    const validation = this.validateAction('joker-swap', this.getCurrentGameState(), playerId, { jokerLocation, targetTile })
    if (!validation.isValid) {
      console.error('Joker swap invalid:', validation.reason)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Invalid Joker Swap',
        message: validation.reason || 'Cannot swap that joker'
      })
      return false
    }

    try {
      const tileStore = useTileStore.getState()
      
      if (jokerLocation === 'own') {
        // Swap joker from own exposed tiles
        const exposedTiles = tileStore.exposedTiles
        const jokerIndex = exposedTiles.findIndex(tile => tile.isJoker)
        
        if (jokerIndex >= 0) {
          // Replace joker with target tile
          const updatedExposed = [...exposedTiles]
          updatedExposed[jokerIndex] = { ...targetTile }
          
          // Add joker to hand
          const jokerTile: Tile = {
            id: 'joker',
            suit: 'special',
            value: 'joker',
            display: 'Joker',
            isJoker: true
          }
          
          tileStore.addTile(jokerTile)
          tileStore.setExposedTiles(updatedExposed)
        }
      } else {
        // Opponent joker swap - would need multiplayer coordination
        if (useRoomStore.getState().coPilotMode === 'everyone' && this.multiplayerManager) {
          const success = await this.multiplayerManager.emitToService('turn', 'joker-swap-request', {
            playerId,
            roomId: useRoomStore.getState().currentRoomCode,
            targetTile: {
              id: targetTile.id,
              suit: targetTile.suit,
              value: targetTile.value,
              display: targetTile.display,
              isJoker: targetTile.isJoker
            }
          }, { priority: 'medium' })

          if (!success) {
            console.log('Joker swap request queued due to connection issues')
            return false
          }
        }
      }

      console.log(`Player ${playerId} swapped joker for:`, targetTile.display)
      
      useGameStore.getState().addAlert({
        type: 'success',
        title: 'Joker Swapped',
        message: `Joker swapped for ${targetTile.display}`
      })
      
      return true
    } catch (error) {
      console.error('Error swapping joker:', error)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Joker Swap Failed',
        message: 'Failed to swap joker. Please try again.'
      })
      return false
    }
  }

  async declareMahjong(playerId: string, hand: Tile[], pattern: NMJLPattern): Promise<boolean> {
    const validation = this.validateMahjongClaim(hand, pattern)
    if (!validation.isValid) {
      console.error('Mahjong claim invalid:', validation.reason)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Invalid Mahjong',
        message: validation.reason || 'Hand does not match claimed pattern'
      })
      return false
    }

    try {
      // In multiplayer mode, broadcast mahjong claim
      if (useRoomStore.getState().coPilotMode === 'everyone' && this.multiplayerManager) {
        const success = await this.multiplayerManager.emitToService('turn', 'mahjong-claim', {
          playerId,
          roomId: useRoomStore.getState().currentRoomCode,
          pattern: {
            id: pattern.ID,
            name: pattern.Pattern_Description,
            points: pattern.Points
          },
          hand: hand.map(tile => ({
            id: tile.id,
            suit: tile.suit,
            value: tile.value,
            displayName: tile.displayNameName,
            isJoker: tile.isJoker
          }))
        }, { priority: 'critical', requiresAck: true })

        if (!success) {
          console.log('Mahjong claim queued due to connection issues')
          return false
        }
      }

      // End game
      const gameStore = useGameStore.getState()
      gameStore.setGamePhase('finished')
      gameStore.addAlert({
        type: 'success',
        title: 'MAHJONG!',
        message: `${pattern.Pattern_Description} - ${pattern.Points} points!`
      })

      console.log(`Player ${playerId} declared mahjong with pattern:`, pattern.Pattern_Description)
      return true
    } catch (error) {
      console.error('Error declaring mahjong:', error)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Mahjong Declaration Failed',
        message: 'Failed to declare mahjong. Please try again.'
      })
      return false
    }
  }

  async declarePassOut(playerId: string, reason: string): Promise<boolean> {
    try {
      // In multiplayer mode, broadcast pass out
      if (useRoomStore.getState().coPilotMode === 'everyone' && this.multiplayerManager) {
        const success = await this.multiplayerManager.emitToService('turn', 'player-pass-out', {
          playerId,
          roomId: useRoomStore.getState().currentRoomCode,
          reason
        }, { priority: 'high' })

        if (!success) {
          console.log('Pass out declaration queued due to connection issues')
          return false
        }
      }

      // Remove player from active play
      const turnStore = useTurnStore.getState()
      const gameStore = useGameStore.getState()
      
      gameStore.addAlert({
        type: 'info',
        title: 'Player Passed Out',
        message: `${playerId} has passed out: ${reason}`
      })

      // If current player, advance turn
      if (turnStore.currentPlayer === playerId) {
        turnStore.advanceTurn()
      }

      console.log(`Player ${playerId} passed out:`, reason)
      return true
    } catch (error) {
      console.error('Error declaring pass out:', error)
      useGameStore.getState().addAlert({
        type: 'warning',
        title: 'Pass Out Failed',
        message: 'Failed to declare pass out. Please try again.'
      })
      return false
    }
  }

  // Action Validation

  validateAction(action: GameAction, gameState: GameState, playerId: string, actionData?: unknown): ActionValidationResult {
    const playerActions = gameState.playerActions[playerId]
    const isCurrentPlayer = gameState.currentPlayer === playerId

    switch (action) {
      case 'draw':
        if (!isCurrentPlayer) {
          return { isValid: false, reason: 'Not your turn to draw' }
        }
        if (playerActions?.hasDrawn) {
          return { isValid: false, reason: 'Already drew this turn' }
        }
        if (gameState.wallCount <= 0) {
          return { isValid: false, reason: 'Wall is empty' }
        }
        return { isValid: true }

      case 'discard':
        if (!isCurrentPlayer) {
          return { isValid: false, reason: 'Not your turn to discard' }
        }
        if (!playerActions?.hasDrawn) {
          return { isValid: false, reason: 'Must draw before discarding' }
        }
        if (!actionData || !(actionData as Tile)) {
          return { isValid: false, reason: 'No tile specified for discard' }
        }
        return { isValid: true }

      case 'call':
        if (isCurrentPlayer) {
          return { isValid: false, reason: 'Cannot call on your own discard' }
        }
        return { isValid: true }

      case 'joker-swap':
        return { isValid: true }

      case 'mahjong':
        if (!isCurrentPlayer) {
          return { isValid: false, reason: 'Not your turn to declare mahjong' }
        }
        return { isValid: true }

      case 'pass-out':
        return { isValid: true }

      default:
        return { isValid: false, reason: 'Unknown action' }
    }
  }

  getAvailableActions(playerId: string, gameState: GameState): GameAction[] {
    const actions: GameAction[] = []
    const isCurrentPlayer = gameState.currentPlayer === playerId
    const playerActions = gameState.playerActions[playerId]

    if (isCurrentPlayer) {
      if (!playerActions?.hasDrawn) {
        actions.push('draw')
      }
      if (playerActions?.hasDrawn) {
        actions.push('discard', 'mahjong')
      }
      actions.push('joker-swap', 'pass-out')
    } else {
      // Non-current players can make calls or swap jokers
      actions.push('call', 'joker-swap')
    }

    return actions
  }

  // Helper Methods

  private getCurrentGameState(): GameState {
    const turnStore = useTurnStore.getState()
    const tileStore = useTileStore.getState()
    const roomStore = useRoomStore.getState()

    return {
      currentPlayer: turnStore.currentPlayer,
      turnNumber: turnStore.turnNumber,
      playerHands: {
        [roomStore.hostPlayerId || 'current']: tileStore.playerHand
      },
      discardPile: [], // TODO: Implement discard pile tracking
      exposedTiles: {
        [roomStore.hostPlayerId || 'current']: tileStore.exposedTiles
      },
      wallCount: 152 - (tileStore.playerHand.length + tileStore.exposedTiles.length), // Simplified
      playerActions: {
        [roomStore.hostPlayerId || 'current']: {
          hasDrawn: false, // TODO: Track this properly
          hasDiscarded: false,
          availableActions: []
        }
      }
    }
  }

  private generateDrawnTile(): Tile {
    // Simplified tile generation for development
    // TODO: Implement proper wall management
    const suits = ['bamboo', 'character', 'dots', 'dragons', 'winds']
    const values = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
    
    const randomSuit = suits[Math.floor(Math.random() * suits.length)]
    const randomValue = values[Math.floor(Math.random() * values.length)]
    
    return {
      id: `${randomValue}${randomSuit[0]}`,
      suit: randomSuit,
      value: randomValue,
      display: `${randomValue}${randomSuit[0].toUpperCase()}`,
      isJoker: false
    }
  }

  private addToDiscardPile(tile: Tile, playerId: string): void {
    // TODO: Implement proper discard pile management
    console.log(`Added to discard pile: ${tile.displayName} from ${playerId}`)
  }

  private markPlayerAction(playerId: string, action: string, value: boolean): void {
    // TODO: Implement proper player action tracking
    console.log(`Player ${playerId} ${action}: ${value}`)
  }

  private updateAvailableActions(playerId: string): void {
    // TODO: Update available actions in turn store
    console.log(`Updated available actions for player ${playerId}`)
  }

  private simulateCallOpportunities(tile: Tile, playerId: string): void {
    // TODO: Implement call opportunity simulation for solo mode
    console.log(`Simulating call opportunities for tile ${tile.displayName} from ${playerId}`)
  }

  private validateMahjongClaim(hand: Tile[], pattern: NMJLPattern): ActionValidationResult {
    // Basic validation - TODO: Implement proper pattern matching
    if (hand.length !== 14) {
      return { isValid: false, reason: 'Hand must contain exactly 14 tiles' }
    }
    
    return { isValid: true }
  }
}

// Export singleton instance
export const gameActions = GameActionsService.getInstance()

// React hook for using game actions
export const useGameActions = () => {
  const service = GameActionsService.getInstance()
  
  return {
    drawTile: (playerId: string) => service.drawTile(playerId),
    discardTile: (playerId: string, tile: Tile) => service.discardTile(playerId, tile),
    makeCall: (playerId: string, callType: CallType, tiles: Tile[]) => service.makeCall(playerId, callType, tiles),
    swapJoker: (playerId: string, jokerLocation: 'own' | 'opponent', targetTile: Tile) => service.swapJoker(playerId, jokerLocation, targetTile),
    declareMahjong: (playerId: string, hand: Tile[], pattern: Pattern) => service.declareMahjong(playerId, hand, pattern),
    declarePassOut: (playerId: string, reason: string) => service.declarePassOut(playerId, reason),
    validateAction: (action: GameAction, gameState: GameState, playerId: string, actionData?: unknown) => service.validateAction(action, gameState, playerId, actionData),
    getAvailableActions: (playerId: string, gameState: GameState) => service.getAvailableActions(playerId, gameState)
  }
}