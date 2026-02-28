import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { verifyAccessToken } from './security/jwt.js';
import { logger } from './logger.js';
import { corsOrigins } from './env.js';
import http from 'http';

const roomInitiators = new Map<string, string>();

const getRoomSize = (io: Server, roomId: string) => {
  const room = io.sockets.adapter.rooms.get(roomId);
  return room ? room.size : 0;
};

const getNextInitiator = (io: Server, roomId: string) => {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room || room.size === 0) return null;
  return room.values().next().value || null;
};

// Zod schemas for payload validation
const joinRoomSchema = z.object({
  roomId: z.string().min(1).max(100),
});

const offerSchema = z.object({
  roomId: z.string().min(1).max(100),
  offer: z.any() 
});

const answerSchema = z.object({
  roomId: z.string().min(1).max(100),
  answer: z.any()
});

const iceCandidateSchema = z.object({
  roomId: z.string().min(1).max(100),
  candidate: z.any()
});

export function setupSignaling(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 30000,
    pingInterval: 10000
  });

  // Authentication Middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      const decoded = verifyAccessToken(token);
      socket.data.userId = decoded.sub;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.userId }, 'Socket connected');

    socket.on('join-room', (payload) => {
      try {
        const { roomId } = joinRoomSchema.parse(payload);
        
        socket.join(roomId);
        socket.data.roomId = roomId;

        if (!roomInitiators.has(roomId)) {
          roomInitiators.set(roomId, socket.id);
        }

        const initiatorId = roomInitiators.get(roomId);
        const roomSize = getRoomSize(io, roomId);

        socket.emit('room-joined', {
          roomId,
          roomSize,
          isInitiator: socket.id === initiatorId
        });

        if (roomSize >= 2) {
          io.to(roomId).emit('room-ready', { roomId });
        } else {
          socket.emit('room-waiting', { roomId });
        }
      } catch (err) {
        logger.error({ err, payload }, 'Invalid join-room payload');
      }
    });

    socket.on('offer', (payload) => {
      try {
        const { roomId, offer } = offerSchema.parse(payload);
        socket.to(roomId).emit('offer', { offer });
      } catch (err) {
        logger.error({ err, payload }, 'Invalid offer payload');
      }
    });

    socket.on('answer', (payload) => {
      try {
        const { roomId, answer } = answerSchema.parse(payload);
        socket.to(roomId).emit('answer', { answer });
      } catch (err) {
        logger.error({ err, payload }, 'Invalid answer payload');
      }
    });

    socket.on('ice-candidate', (payload) => {
      try {
        const { roomId, candidate } = iceCandidateSchema.parse(payload);
        socket.to(roomId).emit('ice-candidate', { candidate });
      } catch (err) {
        logger.error({ err, payload }, 'Invalid ice-candidate payload');
      }
    });

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      socket.to(roomId).emit('peer-disconnected');

      if (roomInitiators.get(roomId) === socket.id) {
        const nextInitiator = getNextInitiator(io, roomId);
        if (nextInitiator) {
          roomInitiators.set(roomId, nextInitiator);
          io.to(roomId).emit('initiator-changed', { initiatorId: nextInitiator });
        } else {
          roomInitiators.delete(roomId);
        }
      }
      logger.info({ socketId: socket.id, roomId }, 'Socket disconnected');
    });
  });
}
