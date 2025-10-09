import { useCallback, useMemo } from 'react';
import { useRoomStore } from '../stores';
import { useMultiplayer } from './useMultiplayer';
import type { Player, Room } from '../stores';

export interface UseRoomSetupReturn {
  coPilotMode: 'solo' | 'everyone'
  roomCode: string | null
  isHost: boolean
  isCreatingRoom: boolean
  isJoiningRoom: boolean
  error: string | null
  setupProgress: {
    currentStep: string
    completedSteps: number
    totalSteps: number
  }
  setCoPilotMode: (mode: 'solo' | 'everyone') => void
  createRoom: (hostName: string, otherPlayerNames?: string[]) => Promise<void>
  joinRoom: (roomCode: string, playerName: string) => Promise<void>
  generateRoomCode: () => string
  clearError: () => void
}

export const useRoomSetup = (): UseRoomSetupReturn => {
  // Select ONLY primitives - NO objects or functions
  const currentPlayerId = useRoomStore((state) => state.currentPlayerId);
  const roomCreationStatus = useRoomStore((state) => state.roomCreationStatus);
  const joinRoomStatus = useRoomStore((state) => state.joinRoomStatus);
  const error = useRoomStore((state) => state.error);
  const roomCode = useRoomStore((state) => state.roomCode);
  const isHost = useRoomStore((state) => state.isHost);
  const setupMode = useRoomStore((state) => state.setup.mode);
  const setupStep = useRoomStore((state) => state.setup.step);
  const coPilotModeSelected = useRoomStore((state) => state.setup.coPilotModeSelected);

  const multiplayer = useMultiplayer();

  const generateRoomCode = useCallback((): string => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed I and O to avoid confusion
    return Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  }, []);

  const generateRoomCodeFromId = useCallback((_roomId: string): string => {
    // For now, just generate a random code. In the future, you could hash the roomId
    return generateRoomCode();
  }, [generateRoomCode]);

  const generatePlayerId = useCallback((): string => {
    return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const createRoom = useCallback(async (hostName: string, otherPlayerNames?: string[]) => {
    if (roomCreationStatus === 'creating') {
      console.warn('⚠️ Room creation already in progress, ignoring duplicate call');
      return;
    }
    if (!hostName.trim()) {
      useRoomStore.getState().actions.handleRoomCreationError('Please enter your name');
      return;
    }

    try {
      useRoomStore.getState().actions.setRoomCreationStatus('creating');
      if (setupMode === 'solo') {
        const roomCode = generateRoomCode();
        const hostPlayerId = currentPlayerId || generatePlayerId();
        useRoomStore.getState().actions.setCurrentPlayerId(hostPlayerId);

        const players: Player[] = [{ id: hostPlayerId, name: hostName.trim(), isHost: true, isConnected: true, isReady: false, joinedAt: new Date() }];
        if (otherPlayerNames) {
          otherPlayerNames.filter(name => name.trim().length > 0).forEach((name) => {
            players.push({ id: generatePlayerId(), name: name.trim(), isHost: false, isConnected: true, isReady: false, joinedAt: new Date() });
          });
        }

        const room: Room = { id: roomCode, hostId: hostPlayerId, players, phase: 'setup', maxPlayers: 4, isPrivate: true, gameMode: 'nmjl-2025', createdAt: new Date() };
        console.log('🏠 SOLO: Created room:', room);
        useRoomStore.getState().actions.setCurrentRoom(room);
        console.log('🏠 SOLO: Room set in store, checking:', useRoomStore.getState().room);
        useRoomStore.getState().actions.handleRoomJoined(roomCode);
        console.log('🏠 SOLO: handleRoomJoined called');
      } else {
        const roomData = await multiplayer.createRoom({ hostName: hostName.trim(), maxPlayers: 4, gameMode: 'nmjl-2025', isPrivate: false });
        const roomCode = generateRoomCodeFromId(roomData.id);
        useRoomStore.getState().actions.setCurrentPlayerId(roomData.hostId);
        useRoomStore.getState().actions.setCurrentRoom(roomData);
        useRoomStore.getState().actions.handleRoomJoined(roomCode);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create room';
      useRoomStore.getState().actions.handleRoomCreationError(errorMessage);
    }
  }, [roomCreationStatus, setupMode, currentPlayerId, multiplayer, generatePlayerId, generateRoomCode, generateRoomCodeFromId]);

  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    const actions = useRoomStore.getState().actions;
    if (!actions.isValidRoomCode(roomCode)) {
      actions.handleRoomJoinError('Please enter a valid 4-character room code');
      return;
    }
    if (!playerName.trim()) {
      actions.handleRoomJoinError('Please enter your name');
      return;
    }

    try {
      actions.setJoinRoomStatus('joining');
      await multiplayer.joinRoom(roomCode.toUpperCase(), playerName.trim());
      actions.handleRoomJoined(roomCode.toUpperCase());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room';
      actions.handleRoomJoinError(errorMessage);
    }
  }, [multiplayer]);

  const setupProgress = useMemo(() => {
    // This logic should be moved into the store as a selector/getter if it gets more complex
    let completedSteps = 0;
    if (coPilotModeSelected) completedSteps = 1;
    if (roomCreationStatus === 'success' || joinRoomStatus === 'success') completedSteps = 2;
    // ... more steps
    return { currentStep: setupStep, completedSteps, totalSteps: 4 };
  }, [coPilotModeSelected, roomCreationStatus, joinRoomStatus, setupStep]);

  return {
    coPilotMode: setupMode,
    roomCode,
    isHost,
    isCreatingRoom: roomCreationStatus === 'creating',
    isJoiningRoom: joinRoomStatus === 'joining',
    error,
    setupProgress,
    setCoPilotMode: (mode: 'solo' | 'everyone') => useRoomStore.getState().actions.setMode(mode),
    createRoom,
    joinRoom,
    generateRoomCode,
    clearError: () => useRoomStore.getState().actions.clearError(),
  };
};
