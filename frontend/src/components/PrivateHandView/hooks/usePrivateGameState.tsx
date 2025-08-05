// frontend/src/components/PrivateHandView/hooks/usePrivateGameState.tsx
// Custom hook for managing private player state - FIXED to work properly

import { useState, useEffect } from 'react';
import type { PrivatePlayerState, Tile } from '../../../types';

interface UsePrivateGameStateReturn {
  privateState: PrivatePlayerState | null;
  updatePrivateState: (state: Partial<PrivatePlayerState>) => void;
  updateTiles: (tiles: Tile[]) => void;
  isLoading: boolean;
  error: string | null;
}

export const usePrivateGameState = (playerId: string): UsePrivateGameStateReturn => {
  const [privateState, setPrivateState] = useState<PrivatePlayerState | null>(null);
  const [isLoading, setIsLoading] = useState(false); // FIXED: Don't start with loading
  const [error] = useState<string | null>(null);

  console.log('usePrivateGameState: Hook called for player', playerId);

  // FIXED: Initialize private state immediately instead of waiting
  useEffect(() => {
    console.log('usePrivateGameState: Initializing state for player', playerId);
    
    // Create initial mock state immediately
    const initialState: PrivatePlayerState = {
      playerId,
      tiles: [], // Start with empty tiles
      recommendations: {
        bestPatterns: [],
        recommendations: {
          keep: [],
          discard: [],
          charleston: []
        },
        probabilities: {
          completion: 0,
          turnsEstimate: 0
        },
        threats: {
          dangerousTiles: [],
          safeTiles: [],
          opponentThreats: []
        }
      },
      charlestonSelection: []
    };

    setPrivateState(initialState);
    setIsLoading(false);
    
    console.log('usePrivateGameState: State initialized for player', playerId);
  }, [playerId]);

  // FIXED: Update private state properly
  const updatePrivateState = (updates: Partial<PrivatePlayerState>) => {
    console.log('usePrivateGameState: Updating state', updates);
    setPrivateState(prev => {
      if (!prev) return null;
      const newState = { ...prev, ...updates };
      console.log('usePrivateGameState: New state', newState);
      return newState;
    });
  };

  // FIXED: Update tiles specifically and trigger re-render
  const updateTiles = (tiles: Tile[]) => {
    console.log('usePrivateGameState: Updating tiles', { playerId, tiles });
    setPrivateState(prev => {
      if (!prev) {
        console.warn('usePrivateGameState: No previous state when updating tiles');
        return null;
      }
      const newState = { ...prev, tiles };
      console.log('usePrivateGameState: Tiles updated, new state:', newState);
      return newState;
    });
  };

  // TODO: Add Socket.io event listeners when ready
  useEffect(() => {
    // When Socket.io is integrated, add listeners here:
    /*
    socket.on('private-hand-update', (update: PrivatePlayerState) => {
      if (update.playerId === playerId) {
        console.log('usePrivateGameState: Received socket update', update);
        setPrivateState(update);
        setIsLoading(false);
      }
    });

    socket.on('private-recommendations', (analysis: HandAnalysis) => {
      console.log('usePrivateGameState: Received recommendations', analysis);
      setPrivateState(prev => prev ? { ...prev, recommendations: analysis } : null);
    });

    socket.on('error', (error: { message: string }) => {
      console.error('usePrivateGameState: Socket error', error);
      setError(error.message);
      setIsLoading(false);
    });

    // Request initial private state
    socket.emit('request-private-state', { playerId });

    return () => {
      socket.off('private-hand-update');
      socket.off('private-recommendations');
      socket.off('error');
    };
    */
  }, [playerId]);

  console.log('usePrivateGameState: Returning state', { privateState, isLoading, error });

  return {
    privateState,
    updatePrivateState,
    updateTiles,
    isLoading,
    error
  };
};