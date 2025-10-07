// Game End Coordination Hook
// Handles multiplayer game end synchronization and client-side coordination

import { useEffect, useState } from 'react';
import { useRoomStore, useGameStore } from '../stores';
import { getUnifiedMultiplayerManager } from '../lib/services/unified-multiplayer-manager';
import type { PlayerTile } from 'shared-types';

interface GameEndCoordinationState {
  isCoordinatingGameEnd: boolean;
  gameEndData: Record<string, unknown> | null;
  allPlayerHands: Record<string, PlayerTile[]> | null;
  finalScores: Array<{ playerId: string; playerName: string; score: number; pattern?: string }> | null;
  shouldNavigateToPostGame: boolean;
}

interface GameEndRequest {
  requestId: string;
  type: 'final-hand' | 'selected-patterns';
  requestingPlayerId: string;
  gameId: string;
}

export const useGameEndCoordination = () => {
  const [state, setState] = useState<GameEndCoordinationState>({
    isCoordinatingGameEnd: false,
    gameEndData: null,
    allPlayerHands: null,
    finalScores: null,
    shouldNavigateToPostGame: false,
  });

  const [pendingRequests, setPendingRequests] = useState<GameEndRequest[]>([]);

  const coPilotMode = useRoomStore((s) => s.setup.mode);
  const gameActions = useGameStore((s) => s.actions);
  const playerHand = useGameStore((s) => s.playerHand);
  const targetPatterns = useGameStore((s) => s.targetPatterns);

  const multiplayerManager = getUnifiedMultiplayerManager();

  useEffect(() => {
    if (!multiplayerManager?.socket) return;

    const socket = multiplayerManager.socket;

    // Listen for game end coordination
    const handleGameEndCoordinated = (data: Record<string, unknown>) => {
      console.log('Game end coordinated:', data);

      setState((prev) => ({
        ...prev,
        isCoordinatingGameEnd: true,
        gameEndData: data,
        finalScores: Array.isArray(data.finalScores)
          ? (data.finalScores as Array<{
              playerId: string;
              playerName: string;
              score: number;
              pattern?: string;
            }>)
          : null,
        shouldNavigateToPostGame: true,
      }));

      // Show game end notification
      gameActions.addAlert({
        type: String(data.endType) === 'mahjong' ? 'success' : 'info',
        title: 'Game Complete',
        message: String(data.reason) || `Game ended: ${String(data.endType)}`,
        duration: 5000,
      });
    };

    // Listen for requests to provide final hand
    const handleProvideHandRequest = (data: Record<string, unknown>) => {
      const { requestingPlayerId, gameId, responseId } = data;

      // Add to pending requests
      setPendingRequests((prev) => [
        ...prev,
        {
          requestId: String(responseId),
          type: 'final-hand',
          requestingPlayerId: String(requestingPlayerId),
          gameId: String(gameId),
        },
      ]);

      // Automatically provide our current hand
      socket.emit('provide-final-hand-response', {
        hand: playerHand,
        responseId,
      });
    };

    // Listen for requests to provide selected patterns
    const handleProvidePatternRequest = (data: Record<string, unknown>) => {
      const { requestingPlayerId, gameId, responseId } = data;

      // Add to pending requests
      setPendingRequests((prev) => [
        ...prev,
        {
          requestId: String(responseId),
          type: 'selected-patterns',
          requestingPlayerId: String(requestingPlayerId),
          gameId: String(gameId),
        },
      ]);

      // Automatically provide our selected patterns
      socket.emit('provide-patterns-response', {
        patterns: targetPatterns,
        responseId,
      });
    };

    // Listen for final hand responses (for collecting all hands)
    const handleFinalHandProvided = (data: Record<string, unknown>) => {
      const { playerId, hand } = data;

      setState((prev) => ({
        ...prev,
        allPlayerHands: {
          ...prev.allPlayerHands,
          [String(playerId)]: hand as PlayerTile[],
        },
      }));
    };

    // Register event listeners
    socket.on('game-end-coordinated', handleGameEndCoordinated);
    socket.on('provide-final-hand', handleProvideHandRequest);
    socket.on('provide-selected-patterns', handleProvidePatternRequest);
    socket.on('final-hand-provided', handleFinalHandProvided);

    // Cleanup on unmount
    return () => {
      socket.off('game-end-coordinated', handleGameEndCoordinated);
      socket.off('provide-final-hand', handleProvideHandRequest);
      socket.off('provide-selected-patterns', handleProvidePatternRequest);
      socket.off('final-hand-provided', handleFinalHandProvided);
    };
  }, [multiplayerManager, gameActions, playerHand, targetPatterns]);

  // Clear game end state
  const clearGameEndState = () => {
    setState({
      isCoordinatingGameEnd: false,
      gameEndData: null,
      allPlayerHands: null,
      finalScores: null,
      shouldNavigateToPostGame: false,
    });
    setPendingRequests([]);
  };

  // Manually trigger post-game navigation
  const navigateToPostGame = () => {
    setState((prev) => ({
      ...prev,
      shouldNavigateToPostGame: true,
    }));
  };

  return {
    ...state,
    pendingRequests,
    clearGameEndState,
    navigateToPostGame,
    isMultiplayerSession: coPilotMode === 'everyone',
  };
};