// frontend/src/hooks/useCharleston.ts
// Charleston phase management hook with real socket integration

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Tile } from '../types';
import type { 
  CharlestonPhase, 
  CharlestonRecommendation
} from '../types/charleston-types';
import { CHARLESTON_CONSTANTS } from '../types/charleston-types';
import { getCharlestonRecommendations, validateCharlestonSelection } from '../utils/charleston-engine';
import { useSocket } from './useSocket';

interface UseCharlestonProps {
  playerId: string;
  roomId: string;
  playerTiles: Tile[];
  totalPlayers: number;
}

interface UseCharlestonReturn {
  // Current Charleston state
  currentPhase: CharlestonPhase;
  selectedTiles: Tile[];
  isConfirmed: boolean;
  recommendations: CharlestonRecommendation | null;
  
  // Other players' state
  playersReady: string[];
  allPlayersReady: boolean;
  
  // Actions
  selectTile: (tile: Tile) => void;
  deselectTile: (tile: Tile) => void;
  clearSelection: () => void;
  confirmSelection: () => void;
  
  // Phase management (host only)
  canAdvancePhase: boolean;
  advancePhase: () => void;
  skipOptionalPhase: () => void;
  skipRemainingCharleston: () => void; // Skip all remaining Charleston phases
  
  // Status
  isLoading: boolean;
  error: string | null;
  isComplete: boolean;
}

export const useCharleston = (props: UseCharlestonProps): UseCharlestonReturn => {
  const { playerId, roomId, playerTiles, totalPlayers } = props;
  const { socket, isConnected } = useSocket();
  
  // Local Charleston state
  const [currentPhase, setCurrentPhase] = useState<CharlestonPhase>('right');
  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [playersReady, setPlayersReady] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate recommendations when tiles or phase changes
  const recommendations = useMemo(() => {
    if (playerTiles.length < 13) return null;
    
    try {
      return getCharlestonRecommendations(playerTiles, currentPhase, totalPlayers - 1);
    } catch (err) {
      console.error('Error generating Charleston recommendations:', err);
      return null;
    }
  }, [playerTiles, currentPhase, totalPlayers]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleCharlestonPhaseStarted = (data: { phase: CharlestonPhase; playersReady: string[] }) => {
      console.log('Charleston: Phase started', data);
      setCurrentPhase(data.phase);
      setPlayersReady(data.playersReady);
      setSelectedTiles([]);
      setIsConfirmed(false);
      setError(null);
    };

    const handleCharlestonSelectionUpdate = (data: { playerId: string; isReady: boolean; playersReady: string[] }) => {
      console.log('Charleston: Selection update', data);
      setPlayersReady(data.playersReady);
    };

    const handleCharlestonPhaseComplete = (data: { phase: CharlestonPhase; nextPhase?: CharlestonPhase; tilesReceived?: Tile[] }) => {
      console.log('Charleston: Phase complete', data);
      if (data.nextPhase) {
        setCurrentPhase(data.nextPhase);
        setSelectedTiles([]);
        setIsConfirmed(false);
        setPlayersReady([]);
      }
      // TODO: Handle tilesReceived - update playerTiles through parent
    };

    const handleCharlestonComplete = () => {
      console.log('Charleston: All phases complete');
      setCurrentPhase('complete');
      setSelectedTiles([]);
      setIsConfirmed(false);
      setPlayersReady([]);
    };

    const handleCharlestonError = (data: { message: string }) => {
      console.error('Charleston error:', data.message);
      setError(data.message);
      setIsLoading(false);
    };

    // Register socket event listeners
    socket.on('charleston-phase-started', handleCharlestonPhaseStarted);
    socket.on('charleston-selection-update', handleCharlestonSelectionUpdate);
    socket.on('charleston-phase-complete', handleCharlestonPhaseComplete);
    socket.on('charleston-complete', handleCharlestonComplete);
    socket.on('charleston-error', handleCharlestonError);

    return () => {
      socket.off('charleston-phase-started', handleCharlestonPhaseStarted);
      socket.off('charleston-selection-update', handleCharlestonSelectionUpdate);
      socket.off('charleston-phase-complete', handleCharlestonPhaseComplete);
      socket.off('charleston-complete', handleCharlestonComplete);
      socket.off('charleston-error', handleCharlestonError);
    };
  }, [socket, isConnected]);

  // Tile selection functions
  const selectTile = useCallback((tile: Tile) => {
    if (isConfirmed) return;
    if (selectedTiles.length >= CHARLESTON_CONSTANTS.TILES_TO_PASS) return;
    if (selectedTiles.includes(tile)) return; // Already selected
    
    setSelectedTiles(prev => [...prev, tile]);
    setError(null);
  }, [selectedTiles, isConfirmed]);

  const deselectTile = useCallback((tile: Tile) => {
    if (isConfirmed) return;
    
    setSelectedTiles(prev => prev.filter(t => t !== tile));
  }, [isConfirmed]);

  const clearSelection = useCallback(() => {
    if (isConfirmed) return;
    
    setSelectedTiles([]);
    setError(null);
  }, [isConfirmed]);

  // Confirm selection and notify server
  const confirmSelection = useCallback(() => {
    if (!socket || !isConnected) {
      setError('Not connected to server');
      return;
    }

    if (selectedTiles.length !== CHARLESTON_CONSTANTS.TILES_TO_PASS) {
      setError(`Must select exactly ${CHARLESTON_CONSTANTS.TILES_TO_PASS} tiles`);
      return;
    }

    const validation = validateCharlestonSelection(selectedTiles, playerTiles);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid selection');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Send selection to server
    socket.emit('charleston-confirm-selection', {
      roomId,
      playerId,
      phase: currentPhase,
      selectedTiles
    });

    setIsConfirmed(true);
    setIsLoading(false);
    
    console.log(`Charleston ${currentPhase}: Player confirmed selection`, selectedTiles);
  }, [socket, isConnected, selectedTiles, playerTiles, roomId, playerId, currentPhase]);

  // Phase management (host only)
  const allPlayersReady = useMemo(() => {
    return isConfirmed && playersReady.length >= totalPlayers - 1;
  }, [isConfirmed, playersReady.length, totalPlayers]);

  const canAdvancePhase = useMemo(() => {
    return allPlayersReady && isConnected;
  }, [allPlayersReady, isConnected]);

  const advancePhase = useCallback(() => {
    if (!socket || !canAdvancePhase) return;

    setIsLoading(true);
    socket.emit('charleston-advance-phase', {
      roomId,
      currentPhase
    });
  }, [socket, canAdvancePhase, roomId, currentPhase]);

  const skipOptionalPhase = useCallback(() => {
    if (!socket || !isConnected || currentPhase !== 'optional') return;

    setIsLoading(true);
    socket.emit('charleston-skip-optional', {
      roomId
    });
  }, [socket, isConnected, currentPhase, roomId]);

  const skipRemainingCharleston = useCallback(() => {
    if (!socket || !isConnected) return;

    setIsLoading(true);
    socket.emit('charleston-skip-remaining', {
      roomId,
      currentPhase
    });
  }, [socket, isConnected, roomId, currentPhase]);

  // Check if Charleston is complete
  const isComplete = currentPhase === 'complete';

  // Clear error after delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    // Current Charleston state
    currentPhase,
    selectedTiles,
    isConfirmed,
    recommendations,
    
    // Other players' state
    playersReady,
    allPlayersReady,
    
    // Actions
    selectTile,
    deselectTile,
    clearSelection,
    confirmSelection,
    
    // Phase management
    canAdvancePhase,
    advancePhase,
    skipOptionalPhase,
    skipRemainingCharleston,
    
    // Status
    isLoading,
    error,
    isComplete
  };
};