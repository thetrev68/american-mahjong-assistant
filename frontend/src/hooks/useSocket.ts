// frontend/src/hooks/useSocket.ts
// React hooks for Socket.io room management - Enhanced for tile data

import { useEffect, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import type { Tile, PlayerPosition } from '../types';

const SOCKET_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000'
  : 'http://192.168.1.77:5000';

// Type definitions for room data
interface Player {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string | Date;
  isParticipating: boolean;
  isOnline: boolean;
  tilesInputted: boolean;
  tilesCount: number;
  tiles?: Tile[]; // NEW: actual tile data
  isReady: boolean;
}

interface GameState {
  phase: 'waiting' | 'tile-input' | 'charleston' | 'playing' | 'finished';
  currentRound: number;
  startedAt?: string | Date;
  participatingPlayers: string[];
  playersReady: string[];
}

interface Room {
  code: string;
  players: Player[];
  gameState: GameState;
  playerPositions?: Record<string, PlayerPosition>; // NEW
  positionsConfirmed?: boolean; // NEW
}

interface RoomData {
  roomCode?: string;
  room?: Room;
}

interface RoomError {
  message: string;
}

interface PlayerEventData {
  player?: Player;
  room?: Room;
  playerId?: string;
}

// SINGLETON SOCKET - Created once and reused everywhere
let socketInstance: Socket | null = null;
let isConnected = false;

const createSocket = (): Socket => {
  if (socketInstance) {
    return socketInstance;
  }

  console.log('Creating singleton socket connection...');
  
  socketInstance = io(SOCKET_URL, {
    autoConnect: true,
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socketInstance.on('connect', () => {
    console.log('Connected to server:', socketInstance?.id);
    isConnected = true;
  });

  socketInstance.on('disconnect', (reason: string) => {
    console.log('Disconnected:', reason);
    isConnected = false;
  });

  socketInstance.on('reconnect', () => {
    console.log('Reconnected to server');
    isConnected = true;
  });

  return socketInstance;
};

// Simple socket connection hook
export const useSocket = () => {
  const [socket] = useState<Socket>(() => createSocket());
  const [connected, setConnected] = useState<boolean>(isConnected);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleConnect);

    // Set initial state
    setConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleConnect);
    };
  }, [socket]);

  return { socket, isConnected: connected };
};

// Room management hook
export const useRoom = () => {
  const { socket, isConnected } = useSocket();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error after a delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data: RoomData) => {
      console.log('Room created:', data);
      if (data.room) {
        setRoom(data.room);
      }
      setIsLoading(false);
      setError(null);
    };

    const handleRoomJoined = (data: Room) => {
      console.log('Room joined:', data);
      setRoom(data);
      setIsLoading(false);
      setError(null);
    };

    const handleRoomLeft = () => {
      console.log('Left room');
      setRoom(null);
      setIsLoading(false);
      setError(null);
    };

    const handlePlayerJoined = (data: PlayerEventData) => {
      console.log('Player joined:', data.player?.name);
      if (data.room) {
        setRoom(data.room);
      }
    };

    const handlePlayerLeft = (data: PlayerEventData) => {
      console.log('Player left room');
      if (data.room) {
        setRoom(data.room);
      }
    };

    const handleRoomUpdated = (data: Room) => {
      console.log('Room updated:', data);
      setRoom(data);
    };

    const handleGameStarted = (data: { phase: string; participatingPlayers: string[]; startedAt: string | Date }) => {
      console.log('Game started:', data);
    };

    const handlePhaseChanged = (data: { newPhase: string; message?: string }) => {
      console.log('Phase changed:', data);
      if (data.message) {
        console.log('Phase change message:', data.message);
      }
    };

    const handleRoomInfo = (data: Room) => {
      setRoom(data);
      setIsLoading(false);
    };

    const handleRoomError = (data: RoomError) => {
      console.log('Room error:', data.message);
      if (data.message !== 'Not in any room') {
        setError(data.message);
      }
      setIsLoading(false);
    };

    const handlePositionsUpdated = (data: { positions: Record<string, PlayerPosition> }) => {
      console.log('Positions updated:', data.positions);
      // This will be handled by the consuming component (GameLobbyPage)
      // We'll emit a custom event or store in room state
      setRoom(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          playerPositions: data.positions // Add positions to room state
        };
      });
    };

    const handlePositionsConfirmed = (data: { positions: Record<string, PlayerPosition> }) => {
      console.log('Positions confirmed:', data.positions);
      setRoom(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          playerPositions: data.positions,
          positionsConfirmed: true // Flag that positions are locked
        };
      });
    };

    const handlePositionError = (data: { message: string }) => {
      console.log('Position error:', data.message);
      setError(data.message);
    };

    // Register all event listeners
    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-left', handleRoomLeft);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('room-updated', handleRoomUpdated);
    socket.on('game-started', handleGameStarted);
    socket.on('phase-changed', handlePhaseChanged);
    socket.on('room-info', handleRoomInfo);
    socket.on('room-error', handleRoomError);
    socket.on('positions-updated', handlePositionsUpdated);
    socket.on('positions-confirmed', handlePositionsConfirmed);
    socket.on('position-error', handlePositionError);

    // Cleanup
    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-left', handleRoomLeft);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('player-left', handlePlayerLeft);
      socket.off('room-updated', handleRoomUpdated);
      socket.off('game-started', handleGameStarted);
      socket.off('phase-changed', handlePhaseChanged);
      socket.off('room-info', handleRoomInfo);
      socket.off('room-error', handleRoomError);
      socket.off('positions-updated', handlePositionsUpdated);
      socket.off('positions-confirmed', handlePositionsConfirmed);
      socket.off('position-error', handlePositionError);
    };
  }, [socket]);

  // Room actions
  const createRoom = useCallback((playerName: string) => {
    console.log('createRoom called with:', playerName);
    if (!socket || !isConnected) return;
    setIsLoading(true);
    setError(null);
    socket.emit('create-room', { playerName });
  }, [socket, isConnected]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    if (!socket || !isConnected) return;
    setIsLoading(true);
    setError(null);
    socket.emit('join-room', { roomCode, playerName });
  }, [socket, isConnected]);

  const leaveRoom = useCallback(() => {
    if (!socket || !isConnected) return;
    setIsLoading(true);
    setError(null);
    socket.emit('leave-room');
  }, [socket, isConnected]);

  const refreshRoom = useCallback(() => {
    if (!socket || !isConnected || !room) return;
    socket.emit('get-room-info');
  }, [socket, isConnected, room]);

  // Game phase actions
  const startGame = useCallback(() => {
    if (!socket || !isConnected) return;
    setIsLoading(true);
    setError(null);
    socket.emit('start-game');
  }, [socket, isConnected]);

  const toggleReady = useCallback(() => {
    if (!socket || !isConnected) return;
    socket.emit('toggle-ready');
  }, [socket, isConnected]);

  // UPDATED: Now sends actual tile data instead of just count
  const updateTiles = useCallback((tiles: Tile[]) => {
    if (!socket || !isConnected) return;
    console.log('Sending tiles to server:', tiles);
    socket.emit('update-tiles', { tiles, tileCount: tiles.length });
  }, [socket, isConnected]);

  const updatePlayerStatus = useCallback((targetPlayerId: string, updates: { isParticipating?: boolean; tilesInputted?: boolean }) => {
    if (!socket || !isConnected) return;
    socket.emit('update-player-status', { 
      targetPlayerId, 
      ...updates 
    });
  }, [socket, isConnected]);

  // NEW: Position assignment actions
  const assignPosition = useCallback((playerId: string, position: PlayerPosition) => {
    if (!socket || !isConnected) return;
    console.log('Assigning position:', { playerId, position });
    socket.emit('assign-position', { playerId, position });
  }, [socket, isConnected]);

  const confirmPositions = useCallback((positions: Map<string, PlayerPosition>) => {
    if (!socket || !isConnected) return;
    // Convert Map to object for JSON serialization
    const positionsObj = Object.fromEntries(positions);
    console.log('Confirming positions:', positionsObj);
    socket.emit('confirm-positions', { positions: positionsObj });
  }, [socket, isConnected]);

  // NEW: Gameplay functions for active game phase
  const advanceToPlaying = useCallback(() => {
    if (!socket || !isConnected) return;
    console.log('Advancing to playing phase');
    socket.emit('advance-to-playing');
  }, [socket, isConnected]);

  const discardTile = useCallback((tile: Tile) => {
    if (!socket || !isConnected) return;
    console.log('Discarding tile:', tile);
    socket.emit('discard-tile', { tile });
  }, [socket, isConnected]);

  const drawTile = useCallback(() => {
    if (!socket || !isConnected) return;
    console.log('Drawing tile');
    socket.emit('draw-tile');
  }, [socket, isConnected]);

  const callTile = useCallback((tile: Tile, type: 'pung' | 'kong' | 'quint') => {
    if (!socket || !isConnected) return;
    console.log('Calling tile:', { tile, type });
    socket.emit('call-tile', { tile, type });
  }, [socket, isConnected]);

  const declareMahjong = useCallback(() => {
    if (!socket || !isConnected) return;
    console.log('Declaring Mahjong');
    socket.emit('declare-mahjong');
  }, [socket, isConnected]);

  return {
    room,
    isLoading,
    error,
    isConnected,
    createRoom,
    joinRoom,
    leaveRoom,
    refreshRoom,
    startGame,
    toggleReady,
    updateTiles,
    updatePlayerStatus,
    assignPosition,
    confirmPositions,
    // NEW: Gameplay functions
    advanceToPlaying,
    discardTile,
    drawTile,
    callTile,
    declareMahjong,
    // DEBUG: Add room state for debugging
    _debug: { room, isLoading, error, isConnected }
  };
};

// Simple connection test hook
export const useConnectionTest = () => {
  const { socket, isConnected } = useSocket();
  const [pingTime, setPingTime] = useState<number | null>(null);

  const testConnection = useCallback(() => {
    if (!socket || !isConnected) return;

    const startTime = Date.now();
    
    const handlePong = () => {
      const endTime = Date.now();
      setPingTime(endTime - startTime);
      socket.off('pong', handlePong);
    };

    socket.on('pong', handlePong);
    socket.emit('ping');
  }, [socket, isConnected]);

  return { testConnection, pingTime, isConnected };
};

