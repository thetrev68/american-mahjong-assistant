// /frontend/src/hooks/useSocket.ts
// React hooks for Socket.io room management

import { useEffect, useState, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

// Type definitions for room data
interface Player {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string | Date;
}

interface GameState {
  phase: 'waiting' | 'playing' | 'finished';
  currentRound: number;
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

  useEffect(() => {
    // Create socket connection
    const newSocket = io(SOCKET_URL, {
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('Connected to server:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('Disconnected:', reason);
      setIsConnected(false);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
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

    const handlePlayerDisconnected = (data: PlayerEventData) => {
      console.log('Player disconnected');
      if (data.room) {
        setRoom(data.room);
      }
    };

    const handleRoomInfo = (data: Room) => {
      setRoom(data);
      setIsLoading(false);
    };

    const handleRoomError = (data: RoomError) => {
      console.error('Room error:', data.message);
      setError(data.message);
      setIsLoading(false);
    };

    // Register event listeners
    socket.on('room-created', handleRoomCreated);
    socket.on('room-joined', handleRoomJoined);
    socket.on('room-left', handleRoomLeft);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('player-disconnected', handlePlayerDisconnected);
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
      socket.off('room-info', handleRoomInfo);
      socket.off('room-error', handleRoomError);
    };
  }, [socket]);

  // Get current room info on connect
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('get-room-info');
    }
  }, [socket, isConnected]);

  // Room actions
  const createRoom = useCallback((playerName: string) => {
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
    if (!socket || !isConnected) return;
    socket.emit('get-room-info');
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
      socket.off('pong', handlePong); // Clean up listener
    };

    socket.on('pong', handlePong);
    socket.emit('ping');
  }, [socket, isConnected]);

  return { testConnection, pingTime, isConnected };
};