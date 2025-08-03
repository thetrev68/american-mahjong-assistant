// /backend/src/server.ts
// Express + Socket.io server with room management (TypeScript)

import express, { type Request, type Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomManager from './roomManager.js';

const app = express();
const server = http.createServer(app);

// Configure CORS for both Express and Socket.io
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
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
    const { playerName = 'Player' } = data || {};
    
    const result = roomManager.createRoom(socket.id, playerName);
    
    if (result.success) {
      // Join the socket to the room for broadcasting
      socket.join(result.roomCode);
      
      // Send success response to creator
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
      // Join the socket to the room for broadcasting
      socket.join(roomCode.toUpperCase());
      
      const roomData = {
        code: result.room.code,
        players: Array.from(result.room.players.values()),
        gameState: result.room.gameState
      };

      // Send success response to the joining player
      socket.emit('room-joined', roomData);

      // Notify all other players in the room
      socket.to(roomCode.toUpperCase()).emit('player-joined', {
        player: result.room.players.get(socket.id),
        room: roomData
      });

      console.log(`${playerName} joined room ${roomCode.toUpperCase()}`);
    } else {
      socket.emit('room-error', { message: result.error });
    }
  });

  // Start game (host only)
  socket.on('start-game', () => {
    const result = roomManager.startGame(socket.id);
    
    if (result.success) {
      const roomCode = result.room.code;
      
      // Broadcast game start to all players
      broadcastRoomUpdate(roomCode, result.room);
      
      // Send specific game-started event
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

    // Only include properties that are actually defined
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

  // Update player's tile count
  socket.on('update-tiles', (data: { tileCount?: number }) => {
    const { tileCount = 0 } = data || {};
    
    if (tileCount < 0 || tileCount > 14) {
      socket.emit('room-error', { message: 'Invalid tile count (0-14)' });
      return;
    }

    const result = roomManager.updatePlayerTiles(socket.id, tileCount);
    
    if (result.success) {
      const roomCode = result.room.code;
      broadcastRoomUpdate(roomCode, result.room);
      
      // Check if phase changed to charleston
      if (result.room.gameState.phase === 'charleston') {
        io.to(roomCode).emit('phase-changed', {
          newPhase: 'charleston',
          message: 'All players have entered their tiles! Charleston phase begins.'
        });
      }

      console.log(`Tiles updated in room ${roomCode}`);
    } else {
      socket.emit('room-error', { message: result.error });
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
      // Leave the socket room
      socket.leave(roomCode);
      
      // Send confirmation to leaving player
      socket.emit('room-left');

      // If room still exists, notify remaining players
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
    
    // Mark as offline but don't remove from room immediately
    const result = roomManager.updatePlayerConnection(socket.id, false);
    if (result.success) {
      const roomCode = result.room.code;
      broadcastRoomUpdate(roomCode, result.room);
    }

    // TODO: Add reconnection timeout logic in future chunks
    // For now, we'll leave players in room when they disconnect
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});