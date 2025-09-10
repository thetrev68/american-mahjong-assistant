// Game End Coordination Hook
// Handles multiplayer game end synchronization and client-side coordination

import { useEffect, useState } from 'react'
import { useRoomSetupStore } from '../stores/room-setup.store'
import { usePatternStore } from '../stores/pattern-store'
import { useTileStore } from '../stores/tile-store'
import { useGameStore } from '../stores/game-store'
import { getUnifiedMultiplayerManager } from '../services/unified-multiplayer-manager'
import type { PlayerTile } from '../types/tile-types'

interface GameEndCoordinationState {
  isCoordinatingGameEnd: boolean
  gameEndData: Record<string, unknown> | null
  allPlayerHands: Record<string, PlayerTile[]> | null
  finalScores: Array<{ playerId: string; playerName: string; score: number; pattern?: string }> | null
  shouldNavigateToPostGame: boolean
}

interface GameEndRequest {
  requestId: string
  type: 'final-hand' | 'selected-patterns'
  requestingPlayerId: string
  gameId: string
}

export const useGameEndCoordination = () => {
  const [state, setState] = useState<GameEndCoordinationState>({
    isCoordinatingGameEnd: false,
    gameEndData: null,
    allPlayerHands: null,
    finalScores: null,
    shouldNavigateToPostGame: false
  })

  const [pendingRequests, setPendingRequests] = useState<GameEndRequest[]>([])
  
  const roomSetupStore = useRoomSetupStore()
  const patternStore = usePatternStore()
  const tileStore = useTileStore()
  const gameStore = useGameStore()
  
  const multiplayerManager = getUnifiedMultiplayerManager()

  useEffect(() => {
    if (!multiplayerManager?.socket) return

    const socket = multiplayerManager.socket

    // Listen for game end coordination
    const handleGameEndCoordinated = (data: Record<string, unknown>) => {
      console.log('Game end coordinated:', data)
      
      setState(prev => ({
        ...prev,
        isCoordinatingGameEnd: true,
        gameEndData: data,
        finalScores: Array.isArray(data.finalScores) ? data.finalScores as Array<{ playerId: string; playerName: string; score: number; pattern?: string }> : null,
        shouldNavigateToPostGame: true
      }))
      
      // Show game end notification
      gameStore.addAlert({
        type: String(data.endType) === 'mahjong' ? 'success' : 'info',
        title: 'Game Complete',
        message: String(data.reason) || `Game ended: ${String(data.endType)}`,
        duration: 5000
      })
    }

    // Listen for requests to provide final hand
    const handleProvideHandRequest = (data: Record<string, unknown>) => {
      const { requestingPlayerId, gameId, responseId } = data
      
      // Add to pending requests
      setPendingRequests(prev => [...prev, {
        requestId: String(responseId),
        type: 'final-hand',
        requestingPlayerId: String(requestingPlayerId),
        gameId: String(gameId)
      }])

      // Automatically provide our current hand
      const currentHand = tileStore.playerHand
      socket.emit('provide-final-hand-response', {
        hand: currentHand,
        responseId
      })
    }

    // Listen for requests to provide selected patterns
    const handleProvidePatternRequest = (data: Record<string, unknown>) => {
      const { requestingPlayerId, gameId, responseId } = data
      
      // Add to pending requests
      setPendingRequests(prev => [...prev, {
        requestId: String(responseId),
        type: 'selected-patterns',
        requestingPlayerId: String(requestingPlayerId),
        gameId: String(gameId)
      }])

      // Automatically provide our selected patterns
      const selectedPatterns = patternStore.getTargetPatterns()
      socket.emit('provide-patterns-response', {
        patterns: selectedPatterns,
        responseId
      })
    }

    // Listen for final hand responses (for collecting all hands)
    const handleFinalHandProvided = (data: Record<string, unknown>) => {
      const { playerId, hand } = data
      
      setState(prev => ({
        ...prev,
        allPlayerHands: {
          ...prev.allPlayerHands,
          [String(playerId)]: hand as PlayerTile[]
        }
      }))
    }

    // Register event listeners
    socket.on('game-end-coordinated', handleGameEndCoordinated)
    socket.on('provide-final-hand', handleProvideHandRequest)
    socket.on('provide-selected-patterns', handleProvidePatternRequest)
    socket.on('final-hand-provided', handleFinalHandProvided)

    // Cleanup on unmount
    return () => {
      socket.off('game-end-coordinated', handleGameEndCoordinated)
      socket.off('provide-final-hand', handleProvideHandRequest)
      socket.off('provide-selected-patterns', handleProvidePatternRequest)
      socket.off('final-hand-provided', handleFinalHandProvided)
    }
  }, [multiplayerManager, gameStore, tileStore, patternStore])

  // Clear game end state
  const clearGameEndState = () => {
    setState({
      isCoordinatingGameEnd: false,
      gameEndData: null,
      allPlayerHands: null,
      finalScores: null,
      shouldNavigateToPostGame: false
    })
    setPendingRequests([])
  }

  // Manually trigger post-game navigation
  const navigateToPostGame = () => {
    setState(prev => ({
      ...prev,
      shouldNavigateToPostGame: true
    }))
  }

  return {
    ...state,
    pendingRequests,
    clearGameEndState,
    navigateToPostGame,
    isMultiplayerSession: roomSetupStore.coPilotMode === 'everyone'
  }
}