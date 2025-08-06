// /backend/src/roomManager.ts
// Room management system for mahjong assistant - Enhanced for Charleston

interface Tile {
  id: string;
  suit: string;
  value: string;
  isJoker?: boolean;
  jokerFor?: Tile;
}

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: Date;
  isParticipating: boolean;
  isOnline: boolean;
  tilesInputted: boolean;
  tilesCount: number;
  tiles: Tile[];
  isReady: boolean;
}

interface GameState {
  phase: 'waiting' | 'tile-input' | 'charleston' | 'playing' | 'finished';
  currentRound: number;
  startedAt?: Date;
  participatingPlayers: string[];
  playersReady: string[];
}

// NEW: Charleston state interfaces
interface CharlestonSelection {
  playerId: string;
  phase: string;
  selectedTiles: Tile[];
  confirmedAt: Date;
}

interface CharlestonState {
  currentPhase: 'right' | 'across' | 'left' | 'optional' | 'complete';
  selections: Map<string, CharlestonSelection>;
  playersReady: string[];
  isActive: boolean;
}

interface Room {
  code: string;
  createdAt: Date;
  players: Map<string, Player>;
  gameState: GameState;
  charlestonState?: CharlestonState; // NEW: Charleston state
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

// NEW: Charleston result interfaces
interface CharlestonConfirmResult {
  success: true;
  playersReady: string[];
  allPlayersReady: boolean;
}

interface CharlestonDistributionResult {
  success: true;
  nextPhase?: 'right' | 'across' | 'left' | 'optional' | undefined;
  distributions: { fromPlayerId: string; toPlayerId: string; tiles: Tile[] }[];
}

interface CharlestonAdvanceResult {
  success: true;
  nextPhase?: 'right' | 'across' | 'left' | 'optional' | undefined;
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
    } while (this.rooms.has(code));
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
      tiles: [],
      isReady: true
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
      tiles: [],
      isReady: false
    });

    this.playerRooms.set(socketId, roomCode);

    console.log(`${playerName} joined room ${roomCode.toUpperCase()}`);
    return { success: true, room };
  }

  // Toggle player ready status
  togglePlayerReady(socketId: string): UpdatePlayerResult | ErrorResult {
    const room = this.getRoomByPlayer(socketId);
    if (!room) {
      return { success: false, error: 'Not in any room' };
    }

    const player = room.players.get(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (room.gameState.phase !== 'waiting') {
      return { success: false, error: 'Can only toggle ready in waiting phase' };
    }

    if (player.isHost) {
      return { success: false, error: 'Host is always ready' };
    }

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

    const nonHostPlayers = participatingPlayers.filter(p => !p.isHost);
    const allReady = nonHostPlayers.every(p => p.isReady);
    
    if (!allReady) {
      const notReadyPlayers = nonHostPlayers.filter(p => !p.isReady).map(p => p.name);
      return { success: false, error: `All players must be ready to start. Waiting for: ${notReadyPlayers.join(', ')}` };
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

  // Player updates their tiles (actual tile data + count)
  updatePlayerTiles(socketId: string, tileCount: number, tiles: Tile[] = []): UpdatePlayerResult | ErrorResult {
    const room = this.getRoomByPlayer(socketId);
    if (!room) {
      return { success: false, error: 'Not in any room' };
    }

    const player = room.players.get(socketId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Can only update tiles during tile-input phase
    if (room.gameState.phase !== 'tile-input') {
      return { success: false, error: 'Can only update tiles during tile-input phase' };
    }

    // Validate tile data
    if (tiles.length !== tileCount) {
      return { success: false, error: 'Tile array length does not match tile count' };
    }

    // Basic tile validation
    for (const tile of tiles) {
      if (!tile || !tile.id || !tile.suit || !tile.value) {
        return { success: false, error: 'Invalid tile data structure' };
      }
    }

    // Update player's tile data
    player.tilesCount = tileCount;
    player.tiles = tiles;
    player.tilesInputted = tileCount === 13; // American Mahjong standard

    // Check if all participating players have inputted tiles
    const participatingPlayersList = Array.from(room.players.values())
      .filter(p => room.gameState.participatingPlayers.includes(p.id));
    
    const allReady = participatingPlayersList.every(p => p.tilesInputted);
    
    if (allReady && room.gameState.phase === 'tile-input') {
      // Auto-advance to charleston phase
      room.gameState.phase = 'charleston';
      room.gameState.playersReady = participatingPlayersList.map(p => p.id);
      
      // Initialize Charleston state
      room.charlestonState = {
        currentPhase: 'right',
        selections: new Map(),
        playersReady: [],
        isActive: true
      };
      
      console.log(`All players ready in room ${room.code}, advancing to charleston`);
    }

    console.log(`${player.name} updated tiles (${tileCount}) in room ${room.code}`);
    return { success: true, room };
  }

  // NEW: Charleston confirm selection
  charlestonConfirmSelection(
    socketId: string, 
    phase: string, 
    selectedTiles: Tile[]
  ): CharlestonConfirmResult | ErrorResult {
    const room = this.getRoomByPlayer(socketId);
    if (!room) {
      return { success: false, error: 'Not in any room' };
    }

    if (room.gameState.phase !== 'charleston') {
      return { success: false, error: 'Not in Charleston phase' };
    }

    if (!room.charlestonState) {
      return { success: false, error: 'Charleston state not initialized' };
    }

    if (selectedTiles.length !== 3) {
      return { success: false, error: 'Must select exactly 3 tiles' };
    }

    // Store player's Charleston selection
    room.charlestonState.selections.set(socketId, {
      playerId: socketId,
      phase,
      selectedTiles,
      confirmedAt: new Date()
    });

    // Update ready players list
    if (!room.charlestonState.playersReady.includes(socketId)) {
      room.charlestonState.playersReady.push(socketId);
    }

    const totalParticipating = room.gameState.participatingPlayers.length;
    const allPlayersReady = room.charlestonState.playersReady.length >= totalParticipating;

    console.log(`Charleston ${phase}: Player ${socketId} confirmed selection in room ${room.code}`);
    
    return {
      success: true,
      playersReady: room.charlestonState.playersReady,
      allPlayersReady
    };
  }

  // NEW: Charleston distribute tiles and advance phase
  charlestonDistributeTiles(
    roomCode: string, 
    currentPhase: string
  ): CharlestonDistributionResult | ErrorResult {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (!room.charlestonState) {
      return { success: false, error: 'Charleston state not initialized' };
    }

    // Get participating players
    const participatingPlayers = Array.from(room.players.values())
      .filter(p => room.gameState.participatingPlayers.includes(p.id));

    const playerCount = participatingPlayers.length;
    const distributions: { fromPlayerId: string; toPlayerId: string; tiles: Tile[] }[] = [];

    // Calculate pass directions based on phase and player count
    const getPassTarget = (playerIndex: number): number => {
      switch (currentPhase) {
        case 'right':
          return (playerIndex + 1) % playerCount;
        case 'across':
          return playerCount === 4 ? (playerIndex + 2) % playerCount : playerIndex; // Skip for 3 players
        case 'left':
        case 'optional':
          return (playerIndex - 1 + playerCount) % playerCount;
        default:
          return playerIndex;
      }
    };

    // Distribute tiles
    participatingPlayers.forEach((player, index) => {
      const selection = room.charlestonState!.selections.get(player.id);
      if (selection) {
        const targetIndex = getPassTarget(index);
        const targetPlayer = participatingPlayers[targetIndex];
        
        if (targetPlayer && targetPlayer.id !== player.id) {
          // Remove selected tiles from current player
          selection.selectedTiles.forEach(selectedTile => {
            const tileIndex = player.tiles.findIndex(t => 
              t.id === selectedTile.id && 
              t.suit === selectedTile.suit && 
              t.value === selectedTile.value
            );
            if (tileIndex !== -1) {
              player.tiles.splice(tileIndex, 1);
            }
          });
          
          // Add tiles to target player
          targetPlayer.tiles.push(...selection.selectedTiles);
          
          // Update tile counts
          player.tilesCount = player.tiles.length;
          targetPlayer.tilesCount = targetPlayer.tiles.length;
          
          // Record distribution
          distributions.push({
            fromPlayerId: player.id,
            toPlayerId: targetPlayer.id,
            tiles: [...selection.selectedTiles]
          });
        }
      }
    });

    // Determine next phase
    const getNextPhase = (): 'right' | 'across' | 'left' | 'optional' | undefined => {
      const phaseOrder = playerCount === 3 
        ? ['right', 'left', 'optional'] // Skip 'across' for 3 players
        : ['right', 'across', 'left', 'optional'];
      
      const currentIndex = phaseOrder.indexOf(currentPhase as any);
      const nextIndex = currentIndex + 1;
      
      return nextIndex < phaseOrder.length ? phaseOrder[nextIndex] as any : undefined;
    };

    const nextPhase = getNextPhase();

    // Reset Charleston state for next phase or complete
    if (nextPhase) {
      room.charlestonState.currentPhase = nextPhase;
      room.charlestonState.selections.clear();
      room.charlestonState.playersReady = [];
    } else {
      // Charleston complete
      room.charlestonState.isActive = false;
      room.charlestonState.currentPhase = 'complete';
    }

    console.log(`Charleston ${currentPhase}: Distributed tiles, next phase: ${nextPhase || 'complete'}`);

    return {
      success: true,
      nextPhase,
      distributions
    };
  }

  // NEW: Charleston advance phase (host only)
  charlestonAdvancePhase(
    hostSocketId: string, 
    roomCode: string, 
    currentPhase: string
  ): CharlestonAdvanceResult | ErrorResult {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const host = room.players.get(hostSocketId);
    if (!host?.isHost) {
      return { success: false, error: 'Only host can advance Charleston phase' };
    }

    if (room.gameState.phase !== 'charleston') {
      return { success: false, error: 'Not in Charleston phase' };
    }

    // Use the same logic as distribution to get next phase
    const participatingPlayers = Array.from(room.players.values())
      .filter(p => room.gameState.participatingPlayers.includes(p.id));
    const playerCount = participatingPlayers.length;

    const getNextPhase = (): 'right' | 'across' | 'left' | 'optional' | undefined => {
      const phaseOrder = playerCount === 3 
        ? ['right', 'left', 'optional'] 
        : ['right', 'across', 'left', 'optional'];
      
      const currentIndex = phaseOrder.indexOf(currentPhase as any);
      const nextIndex = currentIndex + 1;
      
      return nextIndex < phaseOrder.length ? phaseOrder[nextIndex] as any : undefined;
    };

    const nextPhase = getNextPhase();

    if (room.charlestonState) {
      if (nextPhase) {
        room.charlestonState.currentPhase = nextPhase;
        room.charlestonState.selections.clear();
        room.charlestonState.playersReady = [];
      } else {
        room.charlestonState.isActive = false;
        room.charlestonState.currentPhase = 'complete';
      }
    }

    return {
      success: true,
      nextPhase
    };
  }

  // NEW: Charleston skip optional (host only)
  charlestonSkipOptional(hostSocketId: string, roomCode: string): CharlestonAdvanceResult | ErrorResult {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    const host = room.players.get(hostSocketId);
    if (!host?.isHost) {
      return { success: false, error: 'Only host can skip optional phase' };
    }

    if (room.gameState.phase !== 'charleston') {
      return { success: false, error: 'Not in Charleston phase' };
    }

    if (room.charlestonState) {
      room.charlestonState.isActive = false;
      room.charlestonState.currentPhase = 'complete';
    }

    return {
      success: true,
      nextPhase: undefined // Complete
    };
  }

  // NEW: Advance to playing phase after Charleston
  advanceToPlayingPhase(roomCode: string): UpdatePlayerResult | ErrorResult {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.gameState.phase !== 'charleston') {
      return { success: false, error: 'Not in Charleston phase' };
    }

    // Advance to playing phase
    room.gameState.phase = 'playing';
    room.gameState.startedAt = new Date();

    console.log(`Room ${roomCode} advanced to playing phase`);

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
        oldestPlayer.isReady = true;
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

  // Get player tiles
  getPlayerTiles(socketId: string): Tile[] {
    const room = this.getRoomByPlayer(socketId);
    if (!room) return [];
    
    const player = room.players.get(socketId);
    return player?.tiles || [];
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
        charlestonPhase: room.charlestonState?.currentPhase || 'none',
        charlestonActive: room.charlestonState?.isActive || false,
        createdAt: room.createdAt,
        playersWithTiles: Array.from(room.players.values()).filter(p => p.tiles.length > 0).length
      }))
    };
  }
}

export default new RoomManager();