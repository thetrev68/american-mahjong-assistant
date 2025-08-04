// frontend/src/hooks/useSocket.ts
// React hooks for Socket.io room management

import { useEffect, useState, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

// Type definitions for room data
interface Player {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string | Date;
  isParticipating: boolean;  // Whether player is actively playing
  isOnline: boolean;         // Connection status
  tilesInputted: boolean;    // Whether they've entered their tiles
  tilesCount: number;        // Number of tiles they have (private count only)
}

interface GameState {
  phase: 'waiting' | 'tile-input' | 'charleston' | 'playing' | 'finished';
  currentRound: number;
  startedAt?: string | Date;
  participatingPlayers: string[]; // IDs of players actually playing
  playersReady: string[];         // IDs of players ready for next phase
}

interface Room {
  code: string;
  players: Player[];
  gameState: GameState;
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

// Main socket connection hook
export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
  const initRef = useRef<boolean>(false);

  useEffect(() => {
    // FIXED: Prevent duplicate connections in React StrictMode
    if (initRef.current || socketRef.current) {
      console.log('Socket already initialized, skipping...');
      return;
    }

    console.log('Initializing socket connection...');
    initRef.current = true;

    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      autoConnect: true,
      forceNew: false, // Allow reusing existing connection
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to server:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('reconnect', () => {
      console.log('Reconnected to server');
      setIsConnected(true);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      // FIXED: Don't cleanup socket in development mode to prevent React StrictMode issues
      if (process.env.NODE_ENV === 'production') {
        console.log('Cleaning up socket connection');
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
        initRef.current = false;
      } else {
        console.log('Skipping socket cleanup in development mode');
      }
    };
  }, []);

  return { socket, isConnected };
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
      console.log('Room data received:', JSON.stringify(data, null, 2));
      if (data.room) {
        setRoom(data.room);
        console.log('Room state updated successfully');
      } else {
        console.log('No room data in response');
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

    const handlePlayerDisconnected = (data: PlayerEventData) => {
      console.log('Player disconnected');
      if (data.room) {
        setRoom(data.room);
      }
    };

    // Handle room updates (from your backend)
    const handleRoomUpdated = (data: Room) => {
      console.log('Room updated:', data);
      setRoom(data);
    };

    // Handle game started event
    const handleGameStarted = (data: { phase: string; participatingPlayers: string[]; startedAt: string | Date }) => {
      console.log('Game started:', data);
      // Room will be updated via room-updated event, so just log for now
    };

    // Handle phase changes
    const handlePhaseChanged = (data: { newPhase: string; message?: string }) => {
      console.log('Phase changed:', data);
      if (data.message) {
        // Could show a notification here later
        console.log('Phase change message:', data.message);
      }
    };

    const handleRoomInfo = (data: Room) => {
      setRoom(data);
      setIsLoading(false);
    };

    const handleRoomError = (data: RoomError) => {
      console.log('Room error:', data.message);
      // FIXED: Don't show "Not in any room" error when user isn't trying to be in a room
      if (data.message !== 'Not in any room') {
        setError(data.message);
      }
      setIsLoading(false);
    };

    // Register all event listeners
    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-left', handleRoomLeft);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('player-disconnected', handlePlayerDisconnected);
    socket.on('room-updated', handleRoomUpdated);
    socket.on('game-started', handleGameStarted);
    socket.on('phase-changed', handlePhaseChanged);
    socket.on('room-info', handleRoomInfo);
    socket.on('room-error', handleRoomError);

    // Cleanup
    return () => {
      socket.off('room-created', handleRoomCreated);
      socket.off('room-joined', handleRoomJoined);
      socket.off('room-left', handleRoomLeft);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('player-left', handlePlayerLeft);
      socket.off('player-disconnected', handlePlayerDisconnected);
      socket.off('room-updated', handleRoomUpdated);
      socket.off('game-started', handleGameStarted);
      socket.off('phase-changed', handlePhaseChanged);
      socket.off('room-info', handleRoomInfo);
      socket.off('room-error', handleRoomError);
    };
  }, [socket]);

  // FIXED: Don't automatically request room info on connect - only when user is actually in a room
  // This was causing the "Not in any room" error spam

  // Room actions
  const createRoom = useCallback((playerName: string) => {
    console.log('createRoom called with:', playerName); 
    console.log('socket:', socket, 'isConnected:', isConnected); 

    if (!socket || !isConnected) return;
    setIsLoading(true);
    setError(null);

    console.log('Emitting create-room event');
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

  const updateTiles = useCallback((tileCount: number) => {
    if (!socket || !isConnected) return;
    socket.emit('update-tiles', { tileCount });
  }, [socket, isConnected]);

  const updatePlayerStatus = useCallback((targetPlayerId: string, updates: { isParticipating?: boolean; tilesInputted?: boolean }) => {
    if (!socket || !isConnected) return;
    socket.emit('update-player-status', { 
      targetPlayerId, 
      ...updates 
    });
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
    updateTiles,
    updatePlayerStatus,
  };
};

// Simple connection test hook (unchanged)
export const useConnectionTest = () => {
  const { socket, isConnected } = useSocket();
  const [pingTime, setPingTime] = useState<number | null>(null);

  const testConnection = useCallback(() => {
    if (!socket || !isConnected) return;

    const startTime = Date.now();
    
    const handlePong = () => {
      const endTime = Date.now();
      setPingTime(endTime - startTime);
      socket.off('pong', handlePong); // Clean up listener
    };

    socket.on('pong', handlePong);
    socket.emit('ping');
  }, [socket, isConnected]);

  return { testConnection, pingTime, isConnected };
};