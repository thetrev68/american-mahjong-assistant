// /backend/src/server.ts
// Express + Socket.io server with room management (TypeScript)

import express, { type Request, type Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomManager from './roomManager';

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
        const updatedRoom = {
          code: result.room.code,
          players: Array.from(result.room.players.values()),
          gameState: result.room.gameState
        };

        socket.to(roomCode).emit('player-left', {
          playerId: socket.id,
          room: updatedRoom
        });
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

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    // Auto-leave room on disconnect
    const room = roomManager.getRoomByPlayer(socket.id);
    if (room) {
      const roomCode = room.code;
      const result = roomManager.leaveRoom(socket.id);
      
      if (result.success && !result.roomDeleted && result.room) {
        const updatedRoom = {
          code: result.room.code,
          players: Array.from(result.room.players.values()),
          gameState: result.room.gameState
        };

        socket.to(roomCode).emit('player-left', {
          playerId: socket.id,
          room: updatedRoom
        });
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});