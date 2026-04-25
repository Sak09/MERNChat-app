const authService = require('../services/authService');
const { getRedisClient } = require('../config/redis');
const User = require('../models/User');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return sendError(res, 'Authorization token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyAccessToken(token);
    if (!decoded) return sendError(res, 'Invalid or expired token', 401);

    // Try Redis cache first
    const redis = getRedisClient();
    const cached = await redis.get(`user:${decoded.userId}`).catch(() => null);

    if (cached) {
      req.user = JSON.parse(cached);
    } else {
      const user = await User.findById(decoded.userId).select('-password -refreshToken');
      if (!user || !user.isActive) return sendError(res, 'User not found or inactive', 401);
      req.user = user.toPublicProfile();
      await redis.setex(`user:${decoded.userId}`, 3600, JSON.stringify(req.user)).catch(() => {});
    }

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return sendError(res, 'Authentication failed', 401);
  }
};

// Socket.io auth
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));

    const decoded = authService.verifyAccessToken(token);
    if (!decoded) return next(new Error('Invalid token'));

    const redis = getRedisClient();
    const cached = await redis.get(`user:${decoded.userId}`).catch(() => null);

    if (cached) {
      socket.user = JSON.parse(cached);
    } else {
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));
      socket.user = user.toPublicProfile();
    }

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
};

module.exports = { authenticate, authenticateSocket };
