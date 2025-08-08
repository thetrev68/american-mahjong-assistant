// backend/api/socket.ts
// Vercel serverless function for Socket.IO
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';

// Import your existing server logic
import '../src/server.js';

let io: SocketIOServer;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!io) {
    console.log('Setting up Socket.IO server...');
    
    // Create HTTP server
    const httpServer = createServer();
    
    // Initialize Socket.IO
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });
    
    // Import and set up your socket handlers here
    // This is a simplified setup - you'll need to adapt your server.ts logic
    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  }
  
  res.status(200).json({ message: 'Socket.IO server running' });
}