// /backend/src/roomManager.ts
// Room management system for mahjong assistant (TypeScript)

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: Date;
}

interface GameState {
  phase: 'waiting' | 'playing' | 'finished';
  currentRound: number;
}

interface Room {
  code: string;
  createdAt: Date;
  players: Map<string, Player>;
  gameState: GameState;
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
      }
    };

    // Add creator to room
    room.players.set(creatorSocketId, {
      id: creatorSocketId,
      name: creatorName,
      isHost: true,
      joinedAt: new Date()
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

    if (room.players.size >= 4) {
      return { success: false, error: 'Room is full (max 4 players)' };
    }

    // Add player to room
    room.players.set(socketId, {
      id: socketId,
      name: playerName,
      isHost: false,
      joinedAt: new Date()
    });

    this.playerRooms.set(socketId, roomCode);

    console.log(`${playerName} joined room ${roomCode}`);
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
      
      // This should never happen since we checked room.players.size > 0, but let's be safe
      if (oldestPlayer) {
        oldestPlayer.isHost = true;
        console.log(`${oldestPlayer.name} is now host of room ${roomCode}`);
      }
    }

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
        phase: room.gameState.phase,
        createdAt: room.createdAt
      }))
    };
  }
}

export default new RoomManager();