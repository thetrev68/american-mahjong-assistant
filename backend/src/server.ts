// /backend/src/server.ts
// Express + Socket.io server with room management - Enhanced for Charleston

import express, { type Request, type Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomManager from './roomManager.js';

type PlayerPosition = 'east' | 'south' | 'west' | 'north';

const app = express();
const server = http.createServer(app);

// Configure CORS for both Express and Socket.io
app.use(cors({
  origin: ["http://localhost:5173", "http://192.168.1.77:5173"],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://192.168.1.77:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.json());

// Basic health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const stats = roomManager.getStats();
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    ...stats
  });
});

// Helper function to broadcast room update to all players
const broadcastRoomUpdate = (roomCode: string, room: any) => {
  const roomData = {
    code: room.code,
    players: Array.from(room.players.values()),
    gameState: room.gameState
  };
  io.to(roomCode).emit('room-updated', roomData);
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create a new room
  socket.on('create-room', (data: { playerName?: string }) => {
    console.log('CREATE ROOM EVENT RECEIVED:', data);
    const { playerName = 'Player' } = data || {};
    
    const result = roomManager.createRoom(socket.id, playerName);
    
    if (result.success) {
      socket.join(result.roomCode);
      
      socket.emit('room-created', {
        roomCode: result.roomCode,
        room: {
          code: result.room.code,
          players: Array.from(result.room.players.values()),
          gameState: result.room.gameState
        }
      });

      console.log(`Room ${result.roomCode} created by ${playerName}`);
    } else {
      socket.emit('room-error', { message: result.error });
    }
  });

  // Join an existing room
  socket.on('join-room', (data: { roomCode?: string; playerName?: string }) => {
    const { roomCode, playerName = 'Player' } = data || {};
    
    if (!roomCode) {
      socket.emit('room-error', { message: 'Room code required' });
      return;
    }

    const result = roomManager.joinRoom(roomCode.toUpperCase(), socket.id, playerName);
    
    if (result.success) {
      socket.join(roomCode.toUpperCase());
      
      const roomData = {
        code: result.room.code,
        players: Array.from(result.room.players.values()),
        gameState: result.room.gameState
      };

      socket.emit('room-joined', roomData);

      socket.to(roomCode.toUpperCase()).emit('player-joined', {
        player: result.room.players.get(socket.id),
        room: roomData
      });

      console.log(`${playerName} joined room ${roomCode.toUpperCase()}`);
    } else {
      socket.emit('room-error', { message: result.error });
    }
  });

  // Toggle player ready status
  socket.on('toggle-ready', () => {
    const result = roomManager.togglePlayerReady(socket.id);
    
    if (result.success) {
      const roomCode = result.room.code;
      broadcastRoomUpdate(roomCode, result.room);
      
      const player = result.room.players.get(socket.id);
      console.log(`${player?.name} is now ${player?.isReady ? 'ready' : 'not ready'} in room ${roomCode}`);
    } else {
      socket.emit('room-error', { message: result.error });
    }
  });

  // Start game (host only)
  socket.on('start-game', () => {
    const result = roomManager.startGame(socket.id);
    
    if (result.success) {
      const roomCode = result.room.code;
      
      broadcastRoomUpdate(roomCode, result.room);
      
      io.to(roomCode).emit('game-started', {
        phase: result.room.gameState.phase,
        participatingPlayers: result.room.gameState.participatingPlayers,
        startedAt: result.room.gameState.startedAt
      });

      console.log(`Game started in room ${roomCode}`);
    } else {
      socket.emit('room-error', { message: result.error });
    }
  });

  // Update player status (host only)
  socket.on('update-player-status', (data: { 
    targetPlayerId?: string; 
    isParticipating?: boolean; 
    tilesInputted?: boolean 
  }) => {
    const { targetPlayerId, isParticipating, tilesInputted } = data || {};
    
    if (!targetPlayerId) {
      socket.emit('room-error', { message: 'Target player ID required' });
      return;
    }

    const updates: { isParticipating?: boolean; tilesInputted?: boolean } = {};
    if (isParticipating !== undefined) updates.isParticipating = isParticipating;
    if (tilesInputted !== undefined) updates.tilesInputted = tilesInputted;

    const result = roomManager.updatePlayerStatus(socket.id, targetPlayerId, updates);
    
    if (result.success) {
      const roomCode = result.room.code;
      broadcastRoomUpdate(roomCode, result.room);
      console.log(`Player status updated in room ${roomCode}`);
    } else {
      socket.emit('room-error', { message: result.error });
    }
  });

  // Update tiles with actual tile data
  socket.on('update-tiles', (data: { tiles?: any[]; tileCount?: number }) => {
    const { tiles = [], tileCount = 0 } = data || {};
    
    // Validate tile count
    if (tileCount < 0 || tileCount > 14) {
      socket.emit('room-error', { message: 'Invalid tile count (0-14)' });
      return;
    }

    // Validate tiles array matches count
    if (tiles.length !== tileCount) {
      socket.emit('room-error', { message: 'Tile count mismatch with provided tiles' });
      return;
    }

    // Basic tile validation
    if (tiles.length > 0) {
      const validTiles = tiles.every(tile => 
        tile && 
        typeof tile.id === 'string' && 
        typeof tile.suit === 'string' && 
        typeof tile.value === 'string'
      );
      
      if (!validTiles) {
        socket.emit('room-error', { message: 'Invalid tile data format' });
        return;
      }
    }

    const result = roomManager.updatePlayerTiles(socket.id, tileCount, tiles);
    
    if (result.success) {
      const roomCode = result.room.code;
      broadcastRoomUpdate(roomCode, result.room);
      
      // Check if phase changed to charleston
      if (result.room.gameState.phase === 'charleston') {
        io.to(roomCode).emit('phase-changed', {
          newPhase: 'charleston',
          message: 'All players have entered their tiles! Charleston phase begins.'
        });

        // Start Charleston phase
        io.to(roomCode).emit('charleston-phase-started', {
          phase: 'right',
          playersReady: []
        });
      }

      console.log(`Tiles updated in room ${roomCode} - Player has ${tileCount} tiles`);
    } else {
      socket.emit('room-error', { message: result.error });
    }
  });

  // NEW: Charleston confirm selection
  socket.on('charleston-confirm-selection', (data: { 
    roomId?: string; 
    playerId?: string; 
    phase?: string;
    selectedTiles?: any[] 
  }) => {
    const { roomId, playerId, phase, selectedTiles = [] } = data || {};
    
    if (!roomId || !playerId || !phase) {
      socket.emit('charleston-error', { message: 'Missing required Charleston data' });
      return;
    }

    if (selectedTiles.length !== 3) {
      socket.emit('charleston-error', { message: 'Must select exactly 3 tiles' });
      return;
    }

    const result = roomManager.charlestonConfirmSelection(socket.id, phase, selectedTiles);
    
    if (result.success) {
      // Broadcast selection update to all players
      io.to(roomId).emit('charleston-selection-update', {
        playerId,
        isReady: true,
        playersReady: result.playersReady
      });

      // Check if all players are ready to advance phase
      if (result.allPlayersReady) {
        // Distribute tiles and advance phase
        const distributionResult = roomManager.charlestonDistributeTiles(roomId, phase);
        
        if (distributionResult.success) {
          io.to(roomId).emit('charleston-phase-complete', {
            phase,
            nextPhase: distributionResult.nextPhase,
            distributions: distributionResult.distributions
          });

          // Broadcast updated room state with new tile distributions
          const room = roomManager.getRoom(roomId);
          if (room) {
            broadcastRoomUpdate(roomId, room);
          }

          if (distributionResult.nextPhase) {
            // Start next phase
            io.to(roomId).emit('charleston-phase-started', {
              phase: distributionResult.nextPhase,
              playersReady: []
            });
          } else {
            // Charleston complete
            io.to(roomId).emit('charleston-complete');
            // Advance game to playing phase
            const gameAdvanceResult = roomManager.advanceToPlayingPhase(roomId);
            if (gameAdvanceResult.success) {
              broadcastRoomUpdate(roomId, gameAdvanceResult.room);
            }
          }
        }
      }

      console.log(`Charleston ${phase}: Player ${playerId} confirmed selection in room ${roomId}`);
    } else {
      socket.emit('charleston-error', { message: result.error });
    }
  });

  // NEW: Charleston advance phase (host only)
  socket.on('charleston-advance-phase', (data: { roomId?: string; currentPhase?: string }) => {
    const { roomId, currentPhase } = data || {};
    
    if (!roomId || !currentPhase) {
      socket.emit('charleston-error', { message: 'Missing room ID or current phase' });
      return;
    }

    const result = roomManager.charlestonAdvancePhase(socket.id, roomId, currentPhase);
    
    if (result.success) {
      if (result.nextPhase) {
        io.to(roomId).emit('charleston-phase-started', {
          phase: result.nextPhase,
          playersReady: []
        });
      } else {
        io.to(roomId).emit('charleston-complete');
        // Advance game to playing phase
        const gameAdvanceResult = roomManager.advanceToPlayingPhase(roomId);
        if (gameAdvanceResult.success) {
          broadcastRoomUpdate(roomId, gameAdvanceResult.room);
        }
      }
      
      console.log(`Charleston: Host advanced from ${currentPhase} to ${result.nextPhase || 'complete'} in room ${roomId}`);
    } else {
      socket.emit('charleston-error', { message: result.error });
    }
  });

  // NEW: Charleston skip optional (host only)
  socket.on('charleston-skip-optional', (data: { roomId?: string }) => {
    const { roomId } = data || {};
    
    if (!roomId) {
      socket.emit('charleston-error', { message: 'Missing room ID' });
      return;
    }

    const result = roomManager.charlestonSkipOptional(socket.id, roomId);
    
    if (result.success) {
      io.to(roomId).emit('charleston-complete');
      
      // Advance game to playing phase
      const gameAdvanceResult = roomManager.advanceToPlayingPhase(roomId);
      if (gameAdvanceResult.success) {
        broadcastRoomUpdate(roomId, gameAdvanceResult.room);
      }
      
      console.log(`Charleston: Host skipped optional phase in room ${roomId}`);
    } else {
      socket.emit('charleston-error', { message: result.error });
    }
  });

  // NEW: Charleston skip remaining phases (host only)
  socket.on('charleston-skip-remaining', (data: { roomId?: string; currentPhase?: string }) => {
    const { roomId, currentPhase } = data || {};
    
    if (!roomId || !currentPhase) {
      socket.emit('charleston-error', { message: 'Missing room ID or current phase' });
      return;
    }

    const result = roomManager.charlestonSkipRemaining(socket.id, roomId, currentPhase);
    
    if (result.success) {
      io.to(roomId).emit('charleston-complete');
      
      // Advance game to playing phase
      const gameAdvanceResult = roomManager.advanceToPlayingPhase(roomId);
      if (gameAdvanceResult.success) {
        broadcastRoomUpdate(roomId, gameAdvanceResult.room);
      }
      
      console.log(`Charleston: Host skipped remaining phases from ${currentPhase} in room ${roomId}`);
    } else {
      socket.emit('charleston-error', { message: result.error });
    }
  });

  // NEW: Position assignment (host only)
  socket.on('assign-position', (data: { playerId?: string; position?: string }) => {
    const { playerId, position } = data || {};
    
    if (!playerId || !position) {
      socket.emit('position-error', { message: 'Player ID and position required' });
      return;
    }

    const result = roomManager.assignPlayerPosition(socket.id, playerId, position as any);
    
    if (result.success) {
      const roomCode = result.room.code;
      
      // Broadcast position update to all players
      io.to(roomCode).emit('positions-updated', {
        positions: Object.fromEntries(result.room.playerPositions || new Map())
      });
      
      console.log(`Position assigned: ${playerId} -> ${position} in room ${roomCode}`);
    } else {
      socket.emit('position-error', { message: result.error });
    }
  });

  // NEW: Confirm all positions (host only)
  socket.on('confirm-positions', (data: { positions?: Record<string, string> }) => {
    const { positions = {} } = data || {};
    
    const result = roomManager.confirmPlayerPositions(socket.id, new Map(Object.entries(positions) as [string, PlayerPosition][]));
    
    if (result.success) {
      const roomCode = result.room.code;
      
      // Broadcast final positions to all players
      io.to(roomCode).emit('positions-confirmed', {
        positions: Object.fromEntries(result.room.playerPositions || new Map())
      });
      
      console.log(`Positions confirmed in room ${roomCode}`);
    } else {
      socket.emit('position-error', { message: result.error });
    }
  });

  // Leave current room
  socket.on('leave-room', () => {
    const room = roomManager.getRoomByPlayer(socket.id);
    if (!room) {
      socket.emit('room-error', { message: 'Not in any room' });
      return;
    }

    const roomCode = room.code;
    const result = roomManager.leaveRoom(socket.id);
    
    if (result.success) {
      socket.leave(roomCode);
      socket.emit('room-left');

      if (!result.roomDeleted && result.room) {
        broadcastRoomUpdate(roomCode, result.room);
      }

      console.log(`Player ${socket.id} left room ${roomCode}`);
    }
  });

  // Get current room info
  socket.on('get-room-info', () => {
    const room = roomManager.getRoomByPlayer(socket.id);
    
    if (room) {
      socket.emit('room-info', {
        code: room.code,
        players: Array.from(room.players.values()),
        gameState: room.gameState
      });
    } else {
      socket.emit('room-error', { message: 'Not in any room' });
    }
  });

  // Handle connection status changes
  socket.on('connect', () => {
    const result = roomManager.updatePlayerConnection(socket.id, true);
    if (result.success) {
      const roomCode = result.room.code;
      broadcastRoomUpdate(roomCode, result.room);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    const result = roomManager.updatePlayerConnection(socket.id, false);
    if (result.success) {
      const roomCode = result.room.code;
      broadcastRoomUpdate(roomCode, result.room);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});