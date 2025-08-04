// /backend/src/roomManager.ts
// Room management system for mahjong assistant (TypeScript)

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: Date;
  isParticipating: boolean;  // Whether player is actively playing
  isOnline: boolean;         // Connection status
  tilesInputted: boolean;    // Whether they've entered their tiles
  tilesCount: number;        // Number of tiles they have (private count only)
  isReady: boolean;          // Whether player is ready to start (NEW)
}

interface GameState {
  phase: 'waiting' | 'tile-input' | 'charleston' | 'playing' | 'finished';
  currentRound: number;
  startedAt?: Date;
  participatingPlayers: string[]; // IDs of players actually playing
  playersReady: string[];         // IDs of players ready for next phase
}

interface Room {
  code: string;
  createdAt: Date;
  players: Map<string, Player>;
  gameState: GameState;
  minPlayers: number;
  maxPlayers: number;
}

interface CreateRoomResult {
  success: true;
  roomCode: string;
  room: Room;
}

interface JoinRoomResult {
  success: true;
  room: Room;
}

interface LeaveRoomResult {
  success: true;
  room?: Room;
  roomDeleted: boolean;
}

interface StartGameResult {
  success: true;
  room: Room;
}

interface UpdatePlayerResult {
  success: true;
  room: Room;
}

interface ErrorResult {
  success: false;
  error: string;
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private playerRooms: Map<string, string> = new Map();

  // Generate a 4-character room code
  generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code)); // Ensure uniqueness
    return code;
  }

  // Create a new room
  createRoom(creatorSocketId: string, creatorName: string = 'Player'): CreateRoomResult | ErrorResult {
    const roomCode = this.generateRoomCode();
    const room: Room = {
      code: roomCode,
      createdAt: new Date(),
      players: new Map(),
      gameState: {
        phase: 'waiting',
        currentRound: 0,
        participatingPlayers: [],
        playersReady: []
      },
      minPlayers: 2,
      maxPlayers: 4
    };

    // Add creator to room
    room.players.set(creatorSocketId, {
      id: creatorSocketId,
      name: creatorName,
      isHost: true,
      joinedAt: new Date(),
      isParticipating: true,
      isOnline: true,
      tilesInputted: false,
      tilesCount: 0,
      isReady: true // Host is automatically ready
    });

    this.rooms.set(roomCode, room);
    this.playerRooms.set(creatorSocketId, roomCode);

    console.log(`Room created: ${roomCode} by ${creatorName}`);
    return { success: true, roomCode, room };
  }

  // Join an existing room
  joinRoom(roomCode: string, socketId: string, playerName: string = 'Player'): JoinRoomResult | ErrorResult {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.players.has(socketId)) {
      return { success: false, error: 'Already in this room' };
    }

    if (room.players.size >= room.maxPlayers) {
      return { success: false, error: `Room is full (max ${room.maxPlayers} players)` };
    }

    // Can't join if game is already in progress
    if (room.gameState.phase !== 'waiting') {
      return { success: false, error: 'Game is already in progress' };
    }

    // Add player to room
    room.players.set(socketId, {
      id: socketId,
      name: playerName,
      isHost: false,
      joinedAt: new Date(),
      isParticipating: true,
      isOnline: true,
      tilesInputted: false,
      tilesCount: 0,
      isReady: false // New players start as not ready
    });

    this.playerRooms.set(socketId, roomCode);

    console.log(`${playerName} joined room ${roomCode.toUpperCase()}`);
    return { success: true, room };
  }

  // Toggle player ready status (NEW)
  togglePlayerReady(socketId: string): UpdatePlayerResult | ErrorResult {
    const room = this.getRoomByPlayer(socketId);
    if (!room) {
      return { success: false, error: 'Not in any room' };
    }

    const player = room.players.get(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Can only toggle ready in waiting phase
    if (room.gameState.phase !== 'waiting') {
      return { success: false, error: 'Can only toggle ready in waiting phase' };
    }

    // Host is always ready, can't toggle
    if (player.isHost) {
      return { success: false, error: 'Host is always ready' };
    }

    // Toggle ready status
    player.isReady = !player.isReady;

    console.log(`${player.name} toggled ready to ${player.isReady} in room ${room.code}`);
    return { success: true, room };
  }

  // Start the game (host only)
  startGame(hostSocketId: string): StartGameResult | ErrorResult {
    const room = this.getRoomByPlayer(hostSocketId);
    if (!room) {
      return { success: false, error: 'Not in any room' };
    }

    const host = room.players.get(hostSocketId);
    if (!host?.isHost) {
      return { success: false, error: 'Only host can start game' };
    }

    const allPlayers = Array.from(room.players.values());
    const participatingPlayers = allPlayers.filter(p => p.isParticipating && p.isOnline);

    if (participatingPlayers.length < room.minPlayers) {
      return { success: false, error: `Need at least ${room.minPlayers} players to start` };
    }

    // Check if all non-host players are ready
    const nonHostPlayers = participatingPlayers.filter(p => !p.isHost);
    const allReady = nonHostPlayers.every(p => p.isReady);
    
    if (!allReady) {
      return { success: false, error: 'All players must be ready to start' };
    }

    // Update game state
    room.gameState = {
      phase: 'tile-input',
      currentRound: 1,
      startedAt: new Date(),
      participatingPlayers: participatingPlayers.map(p => p.id),
      playersReady: []
    };

    console.log(`Game started in room ${room.code} with ${participatingPlayers.length} players`);
    return { success: true, room };
  }

  // Update player participation/readiness (host only)
  updatePlayerStatus(
    hostSocketId: string, 
    targetPlayerId: string, 
    updates: { isParticipating?: boolean; tilesInputted?: boolean }
  ): UpdatePlayerResult | ErrorResult {
    const room = this.getRoomByPlayer(hostSocketId);
    if (!room) {
      return { success: false, error: 'Not in any room' };
    }

    const host = room.players.get(hostSocketId);
    if (!host?.isHost) {
      return { success: false, error: 'Only host can update player status' };
    }

    const targetPlayer = room.players.get(targetPlayerId);
    if (!targetPlayer) {
      return { success: false, error: 'Player not found' };
    }

    // Apply updates
    if (updates.isParticipating !== undefined) {
      targetPlayer.isParticipating = updates.isParticipating;
    }
    if (updates.tilesInputted !== undefined) {
      targetPlayer.tilesInputted = updates.tilesInputted;
    }

    // Update participating players list if needed
    if (updates.isParticipating !== undefined) {
      const participatingIds = Array.from(room.players.values())
        .filter(p => p.isParticipating && p.isOnline)
        .map(p => p.id);
      room.gameState.participatingPlayers = participatingIds;
    }

    console.log(`Host updated ${targetPlayer.name} status in room ${room.code}`);
    return { success: true, room };
  }

  // Player updates their tile count
  updatePlayerTiles(socketId: string, tileCount: number): UpdatePlayerResult | ErrorResult {
    const room = this.getRoomByPlayer(socketId);
    if (!room) {
      return { success: false, error: 'Not in any room' };
    }

    const player = room.players.get(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Update tile count and mark as inputted if they have 13 tiles
    player.tilesCount = tileCount;
    player.tilesInputted = tileCount === 13;

    // Check if all participating players have inputted tiles
    const participatingPlayers = Array.from(room.players.values())
      .filter(p => room.gameState.participatingPlayers.includes(p.id));
    
    const allReady = participatingPlayers.every(p => p.tilesInputted);
    
    if (allReady && room.gameState.phase === 'tile-input') {
      // Auto-advance to next phase when all players ready
      room.gameState.phase = 'charleston';
      room.gameState.playersReady = participatingPlayers.map(p => p.id);
      console.log(`All players ready in room ${room.code}, advancing to charleston`);
    }

    console.log(`${player.name} updated tiles (${tileCount}) in room ${room.code}`);
    return { success: true, room };
  }

  // Mark player connection status
  updatePlayerConnection(socketId: string, isOnline: boolean): UpdatePlayerResult | ErrorResult {
    const room = this.getRoomByPlayer(socketId);
    if (!room) {
      return { success: false, error: 'Not in any room' };
    }

    const player = room.players.get(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    player.isOnline = isOnline;

    // Update participating players if connection changed
    const participatingIds = Array.from(room.players.values())
      .filter(p => p.isParticipating && p.isOnline)
      .map(p => p.id);
    room.gameState.participatingPlayers = participatingIds;

    console.log(`${player.name} is now ${isOnline ? 'online' : 'offline'} in room ${room.code}`);
    return { success: true, room };
  }

  // Leave a room
  leaveRoom(socketId: string): LeaveRoomResult | ErrorResult {
    const roomCode = this.playerRooms.get(socketId);
    if (!roomCode) {
      return { success: false, error: 'Not in any room' };
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const player = room.players.get(socketId);
    room.players.delete(socketId);
    this.playerRooms.delete(socketId);

    console.log(`${player?.name || 'Player'} left room ${roomCode}`);

    // If room is empty, delete it
    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted (empty)`);
      return { success: true, roomDeleted: true };
    }

    // If host left, make oldest player the new host
    if (player?.isHost && room.players.size > 0) {
      const players = Array.from(room.players.values());
      const oldestPlayer = players.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
      
      if (oldestPlayer) {
        oldestPlayer.isHost = true;
        oldestPlayer.isReady = true; // New host is automatically ready
        console.log(`${oldestPlayer.name} is now host of room ${roomCode}`);
      }
    }

    // Update participating players list
    const participatingIds = Array.from(room.players.values())
      .filter(p => p.isParticipating && p.isOnline)
      .map(p => p.id);
    room.gameState.participatingPlayers = participatingIds;

    return { success: true, room, roomDeleted: false };
  }

  // Get room by code
  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  // Get room by player socket ID
  getRoomByPlayer(socketId: string): Room | undefined {
    const roomCode = this.playerRooms.get(socketId);
    return roomCode ? this.rooms.get(roomCode) : undefined;
  }

  // Get all players in a room as array
  getRoomPlayers(roomCode: string): Player[] {
    const room = this.rooms.get(roomCode);
    return room ? Array.from(room.players.values()) : [];
  }

  // Update game state for a room
  updateGameState(roomCode: string, updates: Partial<GameState>): boolean {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.gameState = { ...room.gameState, ...updates };
      return true;
    }
    return false;
  }

  // Get stats for debugging
  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalPlayers: this.playerRooms.size,
      rooms: Array.from(this.rooms.entries()).map(([code, room]) => ({
        code,
        playerCount: room.players.size,
        participatingCount: room.gameState.participatingPlayers.length,
        phase: room.gameState.phase,
        createdAt: room.createdAt
      }))
    };
  }
}

export default new RoomManager();