const { Server } = require('socket.io');
const { authenticateSocket } = require('../middleware/auth');
const { addMessageJob, addAckJob } = require('../queues/messageQueue');
const { messageQueue } = require('../queues/messageQueue');
const { getRedisClient } = require('../config/redis');
const User = require('../models/User');
const logger = require('../utils/logger');

const setupSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Auth middleware
  io.use(authenticateSocket);

  // Track online users in Redis: userId -> socketId
  const setOnline = async (userId, socketId) => {
    const redis = getRedisClient();
    await redis.hset('online_users', userId.toString(), socketId);
    await User.findByIdAndUpdate(userId, { status: 'online' });
  };

  const setOffline = async (userId) => {
    const redis = getRedisClient();
    await redis.hdel('online_users', userId.toString());
    await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() });
  };

  const isOnline = async (userId) => {
    const redis = getRedisClient();
    return !!(await redis.hget('online_users', userId.toString()));
  };

  // Listen for processed messages from Bull queue and emit to recipients
  messageQueue.on('completed', async (job, result) => {
    if (job.name !== 'send') return;
    const { conversationId, senderId } = job.data;
    const { messageId, clientId } = result;

    try {
      const Message = require('../models/Message');
      const message = await Message.findById(messageId)
        .populate('sender', 'username avatar')
        .populate('replyTo', 'content sender')
        .lean();

      if (!message) return;

      // Emit to conversation room
      io.to(`conv:${conversationId}`).emit('message:new', {
        ...message,
        clientId,
      });

      // Send ACK back to sender
      const redis = getRedisClient();
      const senderSocketId = await redis.hget('online_users', senderId.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit('message:ack', {
          clientId,
          messageId: message._id,
          status: 'delivered',
          conversationId,
        });
      }

      // Update message status to delivered
      await addAckJob({ messageId: message._id.toString(), status: 'delivered' });
    } catch (err) {
      logger.error('Error emitting completed message:', err);
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id;
    logger.debug(`Socket connected: ${socket.id} user: ${userId}`);

    await setOnline(userId, socket.id);

    // Broadcast online status to others
    socket.broadcast.emit('user:online', { userId, status: 'online' });

    // Join user's personal room
    socket.join(`user:${userId}`);

    // ── JOIN CONVERSATION ROOMS ──
    socket.on('conversation:join', (conversationId) => {
      socket.join(`conv:${conversationId}`);
      logger.debug(`User ${userId} joined conv:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    // ── SEND MESSAGE (via queue) ──
    socket.on('message:send', async (data, callback) => {
      try {
        const { conversationId, content, type = 'text', clientId, replyTo } = data;
        if (!content?.trim() || !conversationId) {
          return callback?.({ error: 'Invalid message data' });
        }

        const job = await addMessageJob({
          conversationId,
          senderId: userId,
          content: content.trim(),
          type,
          clientId,
          replyTo,
        });

        // Immediately acknowledge receipt to sender (optimistic)
        callback?.({ success: true, jobId: job.id, clientId, status: 'pending' });
      } catch (err) {
        logger.error('message:send error:', err);
        callback?.({ error: 'Failed to queue message' });
      }
    });

    // ── TYPING INDICATORS ──
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', {
        userId,
        username: socket.user.username,
        conversationId,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:stop', {
        userId,
        conversationId,
      });
    });

    // ── READ RECEIPTS ──
    socket.on('message:read', async ({ conversationId, messageIds }) => {
      try {
        const Message = require('../models/Message');
        await Message.updateMany(
          { _id: { $in: messageIds }, conversationId },
          { status: 'read', $addToSet: { readBy: { user: userId } } }
        );

        socket.to(`conv:${conversationId}`).emit('message:read', {
          userId,
          messageIds,
          conversationId,
        });
      } catch (err) {
        logger.error('message:read error:', err);
      }
    });

    // ── DISCONNECT ──
    socket.on('disconnect', async () => {
      logger.debug(`Socket disconnected: ${socket.id} user: ${userId}`);
      await setOffline(userId);
      socket.broadcast.emit('user:offline', { userId, status: 'offline', lastSeen: new Date() });
    });
  });

  return io;
};

module.exports = setupSocket;
