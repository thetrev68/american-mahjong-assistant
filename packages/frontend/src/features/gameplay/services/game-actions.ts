// Game Actions Service
// Complete action system for American Mahjong gameplay with validation and coordination

import type { Tile, NMJL2025Pattern } from 'shared-types'
import { useGameStore } from '../../../stores/useGameStore'
import { useTileStore } from '../../../stores/tile-store'
import { useTurnStore } from '../../../stores/turn-store'
import { useRoomSetupStore } from '../../../stores/room-setup.store'
import { useRoomStore } from '../../../stores/useRoomStore'
import { useIntelligenceStore } from '../../../stores/useIntelligenceStore'
import { getUnifiedMultiplayerManager } from '../../../lib/services/unified-multiplayer-manager'

const getGameActions = () => useGameStore.getState().actions

export type GameAction = 'draw' | 'discard' | 'call' | 'joker-swap' | 'mahjong' | 'declare-mahjong' | 'pass-out' | 'other-player-mahjong' | 'game-drawn'
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
      getGameActions().addAlert({
        type: 'warning',
        title: 'Invalid Action',
        message: validation.reason || 'Cannot draw tile at this time'
      })
      return null
    }

    try {
      // In multiplayer mode, request from server
      if (useRoomSetupStore.getState().coPilotMode === 'everyone' && this.multiplayerManager) {
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
        useTileStore.getState().addTile(tile.id)
        
        // Update turn state
        const turnStore = useTurnStore.getState()
        if (turnStore.currentPlayer === playerId) {
          // Mark that player has drawn
          this.markPlayerAction(playerId, 'hasDrawn', true)
          
          // Update available actions
          this.updateAvailableActions(playerId)
        }

        console.log(`Player ${playerId} drew tile:`, tile.id)
      }

      return tile
    } catch (error) {
      console.error('Error drawing tile:', error)
      getGameActions().addAlert({
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
      getGameActions().addAlert({
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
      if (useRoomSetupStore.getState().coPilotMode === 'everyone' && this.multiplayerManager) {
        const success = await this.multiplayerManager.emitToService('turn', 'discard-tile', {
          playerId,
          roomId: useRoomStore.getState().currentRoomCode,
          tile: {
            id: tile.id,
            suit: tile.suit,
            value: tile.value,
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


      // Analyze hand after discard for AI recommendations
      const intelligenceStore = useIntelligenceStore.getState()
      const currentHand = useTileStore.getState().playerHand
      intelligenceStore.analyzeHand(currentHand, [])

      console.log(`Player ${playerId} discarded:`, tile.id)
      return true
    } catch (error) {
      console.error('Error discarding tile:', error)
      getGameActions().addAlert({
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
      getGameActions().addAlert({
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
      // Add exposed tiles - use proper method
      useTileStore.getState().addExposedTiles(
        tiles.map(t => ({ ...t, instanceId: t.id, isSelected: false })),
        callType
      )
      
      // In multiplayer mode, broadcast call
      if (useRoomSetupStore.getState().coPilotMode === 'everyone' && this.multiplayerManager) {
        const success = await this.multiplayerManager.emitToService('turn', 'player-call', {
          playerId,
          roomId: useRoomStore.getState().currentRoomCode,
          callType,
          tiles: tiles.map(tile => ({
            id: tile.id,
            suit: tile.suit,
            value: tile.value,
            displayName: tile.id
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

      console.log(`Player ${playerId} called ${callType} with:`, tiles.map(t => t.id))
      
      getGameActions().addAlert({
        type: 'success',
        title: 'Call Made',
        message: `${callType.toUpperCase()} call successful`
      })
      
      return true
    } catch (error) {
      console.error('Error making call:', error)
      getGameActions().addAlert({
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
      getGameActions().addAlert({
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
          updatedExposed[jokerIndex] = { ...targetTile, instanceId: targetTile.id, isSelected: false }
          
          // Add joker to hand
          const jokerTile: Tile = {
            id: 'joker',
            suit: 'jokers',
            value: 'joker',
            displayName: 'Joker',
            isJoker: true
          }
          
          tileStore.addTile(jokerTile.id)
          tileStore.setExposedTiles(updatedExposed)
        }
      } else {
        // Opponent joker swap - would need multiplayer coordination
        if (useRoomSetupStore.getState().coPilotMode === 'everyone' && this.multiplayerManager) {
          const success = await this.multiplayerManager.emitToService('turn', 'joker-swap-request', {
            playerId,
            roomId: useRoomStore.getState().currentRoomCode,
            targetTile: {
              id: targetTile.id,
              suit: targetTile.suit,
              value: targetTile.value,
              displayName: targetTile.id,
              isJoker: targetTile.isJoker
            }
          }, { priority: 'medium' })

          if (!success) {
            console.log('Joker swap request queued due to connection issues')
            return false
          }
        }
      }

      console.log(`Player ${playerId} swapped joker for:`, targetTile.id)
      
      getGameActions().addAlert({
        type: 'success',
        title: 'Joker Swapped',
        message: `Joker swapped for ${targetTile.id}`
      })
      
      return true
    } catch (error) {
      console.error('Error swapping joker:', error)
      getGameActions().addAlert({
        type: 'warning',
        title: 'Joker Swap Failed',
        message: 'Failed to swap joker. Please try again.'
      })
      return false
    }
  }

  async declareMahjong(playerId: string, hand: Tile[], pattern: NMJL2025Pattern): Promise<boolean> {
    const validation = this.validateMahjongClaim(hand)
    if (!validation.isValid) {
      console.error('Mahjong claim invalid:', validation.reason)
      getGameActions().addAlert({
        type: 'warning',
        title: 'Invalid Mahjong',
        message: validation.reason || 'Hand does not match claimed pattern'
      })
      return false
    }

    try {
      // In multiplayer mode, broadcast mahjong claim
      if (useRoomSetupStore.getState().coPilotMode === 'everyone' && this.multiplayerManager) {
        const success = await this.multiplayerManager.emitToService('turn', 'mahjong-claim', {
          playerId,
          roomId: useRoomStore.getState().currentRoomCode,
          pattern: {
            id: pattern['Pattern ID'],
            name: pattern.Hand_Description,
            points: pattern.Hand_Points
          },
          hand: hand.map(tile => ({
            id: tile.id,
            suit: tile.suit,
            value: tile.value,
            isJoker: tile.isJoker
          }))
        }, { priority: 'critical', requiresAck: true })

        if (!success) {
          console.log('Mahjong claim queued due to connection issues')
          return false
        }
      }

      // End game
      getGameActions().setPhase('finished')
      getGameActions().addAlert({
        type: 'success',
        title: 'MAHJONG!',
        message: `${pattern.Hand_Description} - ${pattern.Hand_Points} points!`
      })

      console.log(`Player ${playerId} declared mahjong with pattern:`, pattern.Hand_Description)
      return true
    } catch (error) {
      console.error('Error declaring mahjong:', error)
      getGameActions().addAlert({
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
      if (useRoomSetupStore.getState().coPilotMode === 'everyone' && this.multiplayerManager) {
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
      
      // Mark player as passed out in game state
      getGameActions().markPlayerPassedOut(playerId)
      
      getGameActions().addAlert({
        type: 'info',
        title: 'Player Passed Out',
        message: `${playerId} has passed out: ${reason}`
      })

      // Check if game should end due to all players passed out
      if (getGameActions().checkForGameEnd()) {
        getGameActions().addAlert({
          type: 'success',
          title: 'Game Ended',
          message: 'Game ended - all players have passed out',
          duration: 5000
        })
      }

      // If current player, advance turn
      if (turnStore.currentPlayer === playerId) {
        turnStore.advanceTurn()
      }

      console.log(`Player ${playerId} passed out:`, reason)
      return true
    } catch (error) {
      console.error('Error declaring pass out:', error)
      getGameActions().addAlert({
        type: 'warning',
        title: 'Pass Out Failed',
        message: 'Failed to declare pass out. Please try again.'
      })
      return false
    }
  }

  async declareOtherPlayerMahjong(_playerId: string, winnerName: string): Promise<boolean> {
    try {
      getGameActions().addAlert({
        type: 'success',
        title: 'Game Won',
        message: `${winnerName} declared mahjong!`
      })

      // End the game for the app user (they didn't win)
      const gameEndData = {
        endReason: 'other-player-mahjong' as const,
        winner: winnerName,
        appUserResult: 'lost' as const
      }

      getGameActions().setGameEndResult(gameEndData)
      
      // Trigger game end
      if (getGameActions().checkForGameEnd()) {
        getGameActions().addAlert({
          type: 'info',
          title: 'Game Ended',
          message: 'Recording game results...',
          duration: 3000
        })
      }

      console.log(`Other player ${winnerName} won the game`)
      return true
    } catch (error) {
      console.error('Error recording other player mahjong:', error)
      getGameActions().addAlert({
        type: 'warning',
        title: 'Game End Failed',
        message: 'Failed to record game end. Please try again.'
      })
      return false
    }
  }

  async declareGameDrawn(_playerId: string, reason: string): Promise<boolean> {
    try {
      getGameActions().addAlert({
        type: 'info',
        title: 'Game Drawn',
        message: `Game ended: ${reason}`
      })

      // End the game as a draw
      const gameEndData = {
        endReason: 'drawn' as const,
        drawReason: reason,
        appUserResult: 'drawn' as const
      }

      getGameActions().setGameEndResult(gameEndData)
      
      // Trigger game end
      if (getGameActions().checkForGameEnd()) {
        getGameActions().addAlert({
          type: 'info',
          title: 'Game Ended',
          message: 'Recording game results...',
          duration: 3000
        })
      }

      console.log(`Game drawn: ${reason}`)
      return true
    } catch (error) {
      console.error('Error recording game draw:', error)
      getGameActions().addAlert({
        type: 'warning',
        title: 'Game End Failed',
        message: 'Failed to record game end. Please try again.'
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

      case 'other-player-mahjong':
        // Solo mode - app user can record other player wins
        return { isValid: true }

      case 'game-drawn':
        // Solo mode - app user can record game draws
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
      discardPile: useTurnStore.getState().discardPile,
      exposedTiles: {
        [roomStore.hostPlayerId || 'current']: tileStore.exposedTiles
      },
      wallCount: 152 - (tileStore.playerHand.length + tileStore.exposedTiles.length), // Simplified
      playerActions: {
        [roomStore.hostPlayerId || 'current']: {
          hasDrawn: useTurnStore.getState().getPlayerActions(roomStore.hostPlayerId || 'current')?.hasDrawn || false,
          hasDiscarded: false,
          availableActions: []
        }
      }
    }
  }

  private generateDrawnTile(): Tile {
    // Simple tile generation - wall management is handled elsewhere in the system
    // This method is primarily used for development and solo mode simulation
    const suits = ['bams', 'cracks', 'dots', 'dragons', 'winds'] as const
    const values = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
    
    const randomSuit = suits[Math.floor(Math.random() * suits.length)]
    const randomValue = values[Math.floor(Math.random() * values.length)]
    
    return {
      id: `${randomValue}${randomSuit[0]}`,
      suit: randomSuit,
      value: randomValue,
      displayName: `${randomValue} ${randomSuit}`,
      isJoker: false
    }
  }

  private addToDiscardPile(tile: Tile, playerId: string): void {
    // Discard pile management is handled by turn store actions
    console.log(`Discarded: ${tile.id} from ${playerId}`)
  }

  private markPlayerAction(playerId: string, action: string, value: boolean): void {
    // Player action tracking - use turn store's method with correct signature
    const actionType = action === 'draw' ? 'hasDrawn' : 'hasDiscarded'
    useTurnStore.getState().markPlayerAction(playerId, actionType as 'hasDrawn' | 'hasDiscarded', value)
  }

  private updateAvailableActions(playerId: string): void {
    // Available actions are calculated dynamically in turn store selectors
    // No need to explicitly update - they are derived from game state
    console.log(`Available actions updated for player ${playerId}`)
  }


  private validateMahjongClaim(hand: Tile[]): ActionValidationResult {
    // Use mahjong validator service for proper pattern matching
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
    declareMahjong: (playerId: string, hand: Tile[], pattern: NMJL2025Pattern) => service.declareMahjong(playerId, hand, pattern),
    declarePassOut: (playerId: string, reason: string) => service.declarePassOut(playerId, reason),
    validateAction: (action: GameAction, gameState: GameState, playerId: string, actionData?: unknown) => service.validateAction(action, gameState, playerId, actionData),
    getAvailableActions: (playerId: string, gameState: GameState) => service.getAvailableActions(playerId, gameState)
  }
}


