import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Server } from 'socket.io';

const PORT = 3001;
const INTERNAL_PORT = 3002;

// Create Socket.IO server
const httpServer = createServer();
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Separate internal HTTP server for broadcast API (from Next.js API routes)
const internalServer = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        const { channel, guildId } = message;

        if (channel === 'guild' && guildId) {
          io.to(`guild:${guildId}`).emit('chat:message', message);
          console.log(`[Chat WS] Broadcast to guild:${guildId}: ${message.content?.substring(0, 50)}`);
        } else {
          io.to('world').emit('chat:message', message);
          console.log(`[Chat WS] Broadcast to world: ${message.content?.substring(0, 50)}`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error('[Chat WS] Broadcast parse error:', e);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Track connected users
interface ConnectedUser {
  socketId: string;
  playerId: string;
  displayName: string;
  level: number;
  guildId: string | null;
}

const connectedUsers = new Map<string, ConnectedUser>();

// Heartbeat check - every 30 seconds
setInterval(() => {
  io.emit('ping');
}, 30000);

io.on('connection', (socket) => {
  console.log(`[Chat WS] Client connected: ${socket.id}`);

  let currentUser: ConnectedUser | null = null;

  // Authenticate user
  socket.on('auth', (data: { playerId: string; displayName: string; level: number; guildId?: string }) => {
    currentUser = {
      socketId: socket.id,
      playerId: data.playerId,
      displayName: data.displayName,
      level: data.level,
      guildId: data.guildId || null,
    };

    connectedUsers.set(socket.id, currentUser);

    // Join world chat room
    socket.join('world');

    // Join guild room if in a guild
    if (data.guildId) {
      socket.join(`guild:${data.guildId}`);
    }

    // Confirm authentication
    socket.emit('auth:success', { playerId: data.playerId });

    console.log(`[Chat WS] User authenticated: ${data.displayName} (${data.playerId}), guild: ${data.guildId || 'none'}`);
  });

  // Join a guild room
  socket.on('guild:join', (data: { guildId: string }) => {
    if (currentUser) {
      if (currentUser.guildId) {
        socket.leave(`guild:${currentUser.guildId}`);
      }
      currentUser.guildId = data.guildId;
      socket.join(`guild:${data.guildId}`);
      console.log(`[Chat WS] ${currentUser.displayName} joined guild room: ${data.guildId}`);
    }
  });

  // Leave guild room
  socket.on('guild:leave', () => {
    if (currentUser?.guildId) {
      socket.leave(`guild:${currentUser.guildId}`);
      console.log(`[Chat WS] ${currentUser.displayName} left guild room: ${currentUser.guildId}`);
      currentUser.guildId = null;
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    if (currentUser) {
      connectedUsers.delete(socket.id);
      console.log(`[Chat WS] User disconnected: ${currentUser.displayName} (${reason})`);
    }
  });

  socket.on('error', (error) => {
    console.error(`[Chat WS] Socket error (${socket.id}):`, error);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Chat WS] Chat WebSocket server running on port ${PORT}`);
});

internalServer.listen(INTERNAL_PORT, () => {
  console.log(`[Chat WS] Internal broadcast API running on port ${INTERNAL_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Chat WS] Received SIGTERM, shutting down...');
  io.close();
  httpServer.close(() => {
    internalServer.close(() => {
      console.log('[Chat WS] Server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('[Chat WS] Received SIGINT, shutting down...');
  io.close();
  httpServer.close(() => {
    internalServer.close(() => {
      console.log('[Chat WS] Server closed');
      process.exit(0);
    });
  });
});

// Keep the process alive
process.on('uncaughtException', (err) => {
  console.error('[Chat WS] Uncaught exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('[Chat WS] Unhandled rejection:', err);
});

// Prevent process from exiting
setInterval(() => {
  // Keep-alive tick
}, 60000);
