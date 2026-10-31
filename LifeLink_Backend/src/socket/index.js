// src/socket/index.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');
const logger = require('../utils/logger');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Auth Middleware ─────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        // Allow anonymous connections for public feed
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('name role bloodGroup location');
      socket.user = user;
      next();
    } catch (err) {
      socket.user = null;
      next(); // Allow connection even with invalid token
    }
  });

  // ─── Connection Handler ──────────────────────────────────
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.user?.name || 'anonymous'})`);

    // Join personal room
    if (socket.user) {
      socket.join(`user:${socket.user._id}`);
      socket.join(`role:${socket.user.role}`);

      // Update user online status
      User.findByIdAndUpdate(socket.user._id, { lastSeen: new Date() }).exec();
    }

    // ─── Location Updates ──────────────────────────────────
    socket.on('update_location', async (data) => {
      if (!socket.user) return;
      const { lat, lng } = data;

      await User.findByIdAndUpdate(socket.user._id, {
        'location.coordinates': [lng, lat],
      }).exec();

      // Broadcast to nearby users
      socket.broadcast.emit('donor_location_update', {
        donorId: socket.user._id,
        name: socket.user.name,
        bloodGroup: socket.user.bloodGroup,
        coordinates: [lng, lat],
      });
    });

    // ─── Join Generic Room ─────────────────────────────────
    socket.on('join_room', (roomName) => {
      if (roomName) socket.join(roomName);
    });

    // ─── Join Request Room ─────────────────────────────────
    socket.on('join_request', (requestId) => {
      socket.join(`request:${requestId}`);
    });

    socket.on('leave_request', (requestId) => {
      socket.leave(`request:${requestId}`);
    });

    // ─── Chat ─────────────────────────────────────────────
    socket.on('join_chat', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('send_message', async (data) => {
      if (!socket.user) return;
      const { chatId, content, type = 'text' } = data;

      try {
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        // Verify user is participant
        if (!chat.participants.includes(socket.user._id)) return;

        const message = {
          sender: socket.user._id,
          content,
          type,
          createdAt: new Date(),
        };

        chat.messages.push(message);
        chat.lastMessage = { content, sender: socket.user._id, timestamp: new Date() };
        await chat.save();

        io.to(`chat:${chatId}`).emit('new_message', {
          chatId,
          message: {
            ...message,
            sender: { _id: socket.user._id, name: socket.user.name },
          },
        });
      } catch (err) {
        logger.error('Chat error:', err.message);
      }
    });

    socket.on('typing', (data) => {
      if (!socket.user) return;
      socket.to(`chat:${data.chatId}`).emit('user_typing', {
        userId: socket.user._id,
        name: socket.user.name,
      });
    });

    socket.on('stop_typing', (data) => {
      if (!socket.user) return;
      socket.to(`chat:${data.chatId}`).emit('user_stop_typing', {
        userId: socket.user._id,
      });
    });

    // ─── Emergency SOS ────────────────────────────────────
    socket.on('sos_alert', async (data) => {
      if (!socket.user) return;

      logger.warn(`🚨 SOS from ${socket.user.name}: ${JSON.stringify(data)}`);

      io.to('role:admin').emit('sos_alert', {
        user: socket.user,
        location: data.location,
        message: data.message,
        timestamp: new Date(),
      });
    });

    // ─── Ambulance Tracking ────────────────────────────────
    socket.on('ambulance_update', (data) => {
      io.to(`request:${data.requestId}`).emit('ambulance_location', data);
    });

    // ─── Disconnect ───────────────────────────────────────
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      if (socket.user) {
        User.findByIdAndUpdate(socket.user._id, { lastSeen: new Date() }).exec();
      }
    });
  });

  logger.info('✅ Socket.IO initialized');
  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

module.exports = { initializeSocket, getIO };
