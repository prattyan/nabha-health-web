import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const app = express();
app.use(cors({ origin: '*'}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,
  pingInterval: 10000
});

const roomInitiators = new Map();

const getRoomSize = (roomId) => {
  const room = io.sockets.adapter.rooms.get(roomId);
  return room ? room.size : 0;
};

const getNextInitiator = (roomId) => {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room || room.size === 0) return null;
  return room.values().next().value || null;
};

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, userId }) => {
    if (!roomId) return;

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;

    if (!roomInitiators.has(roomId)) {
      roomInitiators.set(roomId, socket.id);
    }

    const initiatorId = roomInitiators.get(roomId);
    const roomSize = getRoomSize(roomId);

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
  });

  socket.on('offer', ({ roomId, offer }) => {
    if (!roomId || !offer) return;
    socket.to(roomId).emit('offer', { offer });
  });

  socket.on('answer', ({ roomId, answer }) => {
    if (!roomId || !answer) return;
    socket.to(roomId).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    if (!roomId || !candidate) return;
    socket.to(roomId).emit('ice-candidate', { candidate });
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    socket.to(roomId).emit('peer-disconnected');

    if (roomInitiators.get(roomId) === socket.id) {
      const nextInitiator = getNextInitiator(roomId);
      if (nextInitiator) {
        roomInitiators.set(roomId, nextInitiator);
        io.to(roomId).emit('initiator-changed', { initiatorId: nextInitiator });
      } else {
        roomInitiators.delete(roomId);
      }
    }
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
