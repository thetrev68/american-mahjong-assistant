import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { SocketHandlers } from './features/socket-communication/socket-handlers';
import { RoomManager } from './features/room-lifecycle/room-manager';
import { StateSyncManager } from './features/state-sync/state-sync-manager';

const app = express();
const server = createServer(app);

// CORS configuration for local network multiplayer
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));

app.use(express.json());

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialize managers and socket handlers
const roomManager = new RoomManager();
const stateSyncManager = new StateSyncManager();
const socketHandlers = new SocketHandlers(io, roomManager, stateSyncManager);

// Setup socket event handlers and start cleanup
io.on('connection', (socket) => {
  socketHandlers.registerHandlers(socket);
});

socketHandlers.startPeriodicCleanup();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'mahjong-co-pilot-backend' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Mahjong Co-Pilot server running on port ${PORT}`);
  console.log(`🌐 Frontend URLs: http://localhost:5173, http://localhost:3000`);
});

export { io };