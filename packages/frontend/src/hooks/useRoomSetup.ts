import { useCallback, useMemo } from 'react';
import { useRoomStore } from '../stores';
import { useMultiplayer } from './useMultiplayer';
import type { Player, Room } from '../stores';

// ... (interface remains the same)

export const useRoomSetup = (): UseRoomSetupReturn => {
  const roomStore = useRoomStore();
  const roomActions = useRoomStore((s) => s.actions);
  const multiplayer = useMultiplayer();

  const generateRoomCode = useCallback((): string => {
    // ... (implementation remains the same)
  }, []);

  const generateRoomCodeFromId = useCallback((_roomId: string): string => {
    // ... (implementation remains the same)
  }, []);

  const generatePlayerId = useCallback((): string => {
    return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const createRoom = useCallback(async (hostName: string, otherPlayerNames?: string[]) => {
    if (roomStore.roomCreationStatus === 'creating') {
      console.warn('⚠️ Room creation already in progress, ignoring duplicate call');
      return;
    }
    if (!hostName.trim()) {
      roomActions.handleRoomCreationError('Please enter your name');
      return;
    }

    try {
      roomActions.setRoomCreationStatus('creating');
      if (roomStore.setup.mode === 'solo') {
        const roomCode = generateRoomCode();
        const hostPlayerId = roomStore.currentPlayerId || generatePlayerId();
        roomActions.setCurrentPlayerId(hostPlayerId);

        const players: Player[] = [{ id: hostPlayerId, name: hostName.trim(), isHost: true, isConnected: true, isReady: false, joinedAt: new Date() }];
        if (otherPlayerNames) {
          otherPlayerNames.filter(name => name.trim().length > 0).forEach((name) => {
            players.push({ id: generatePlayerId(), name: name.trim(), isHost: false, isConnected: true, isReady: false, joinedAt: new Date() });
          });
        }

        const room: Room = { id: roomCode, hostId: hostPlayerId, players, phase: 'setup', maxPlayers: 4, isPrivate: true, gameMode: 'nmjl-2025', createdAt: new Date() };
        roomActions.setCurrentRoom(room);
        roomActions.handleRoomJoined(roomCode);
      } else {
        const roomData = await multiplayer.createRoom({ hostName: hostName.trim(), maxPlayers: 4, gameMode: 'nmjl-2025', isPrivate: false });
        const roomCode = generateRoomCodeFromId(roomData.id);
        roomActions.setCurrentPlayerId(roomData.hostId);
        roomActions.setCurrentRoom(roomData);
        roomActions.handleRoomJoined(roomCode);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create room';
      roomActions.handleRoomCreationError(errorMessage);
    }
  }, [roomStore, roomActions, multiplayer, generatePlayerId, generateRoomCode, generateRoomCodeFromId]);

  const joinRoom = useCallback(async (roomCode: string, playerName: string) => {
    if (!roomActions.isValidRoomCode(roomCode)) {
      roomActions.handleRoomJoinError('Please enter a valid 4-character room code');
      return;
    }
    if (!playerName.trim()) {
      roomActions.handleRoomJoinError('Please enter your name');
      return;
    }

    try {
      roomActions.setJoinRoomStatus('joining');
      await multiplayer.joinRoom(roomCode.toUpperCase(), playerName.trim());
      roomActions.handleRoomJoined(roomCode.toUpperCase());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room';
      roomActions.handleRoomJoinError(errorMessage);
    }
  }, [roomActions, multiplayer]);

  const setupProgress = useMemo(() => {
    // This logic should be moved into the store as a selector/getter if it gets more complex
    let completedSteps = 0;
    if (roomStore.coPilotModeSelected) completedSteps = 1;
    if (roomStore.roomCreationStatus === 'success' || roomStore.joinRoomStatus === 'success') completedSteps = 2;
    // ... more steps
    return { currentStep: roomStore.setup.step, completedSteps, totalSteps: 4 };
  }, [roomStore.coPilotModeSelected, roomStore.roomCreationStatus, roomStore.joinRoomStatus, roomStore.setup.step]);

  const isHost = useMemo(() => roomStore.isHost, [roomStore.isHost]);

  return {
    coPilotMode: roomStore.setup.mode,
    roomCode: roomStore.roomCode,
    isHost,
    isCreatingRoom: roomStore.roomCreationStatus === 'creating',
    isJoiningRoom: roomStore.joinRoomStatus === 'joining',
    error: roomStore.error,
    setupProgress,
    setCoPilotMode: roomActions.setMode,
    createRoom,
    joinRoom,
    generateRoomCode,
    clearError: roomActions.clearError,
  };
};