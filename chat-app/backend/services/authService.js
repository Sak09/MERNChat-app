const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

class AuthService {
  generateTokens(userId) {
    const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    });
    return { accessToken, refreshToken };
  }

  async register(username, email, password) {
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      throw new Error(`User with this ${field} already exists`);
    }

    const user = await User.create({ username, email, password });
    const { accessToken, refreshToken } = this.generateTokens(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Cache user in Redis
    const redis = getRedisClient();
    await redis.setex(`user:${user._id}`, 3600, JSON.stringify(user.toPublicProfile()));

    return { user: user.toPublicProfile(), accessToken, refreshToken };
  }

  async login(email, password) {
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid email or password');
    }
    if (!user.isActive) throw new Error('Account is deactivated');

    const { accessToken, refreshToken } = this.generateTokens(user._id);
    user.refreshToken = refreshToken;
    user.status = 'online';
    await user.save({ validateBeforeSave: false });

    const redis = getRedisClient();
    await redis.setex(`user:${user._id}`, 3600, JSON.stringify(user.toPublicProfile()));

    return { user: user.toPublicProfile(), accessToken, refreshToken };
  }

  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null, status: 'offline', lastSeen: new Date() });
    const redis = getRedisClient();
    await redis.del(`user:${userId}`);
  }

  async refreshTokens(refreshToken) {
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new Error('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      throw new Error('Refresh token mismatch');
    }

    const tokens = this.generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    return tokens;
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return null;
    }
  }
}

module.exports = new AuthService();
