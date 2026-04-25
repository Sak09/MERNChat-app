const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

class UserController {
  async searchUsers(req, res, next) {
    try {
      const { q } = req.query;
      if (!q || q.trim().length < 2) return sendError(res, 'Query must be at least 2 characters', 400);

      const users = await User.find({
        $or: [
          { username: { $regex: q.trim(), $options: 'i' } },
          { email: { $regex: q.trim(), $options: 'i' } },
        ],
        _id: { $ne: req.user._id },
        isActive: true,
      })
        .select('username email avatar status lastSeen')
        .limit(20)
        .lean();

      return sendSuccess(res, { users });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const user = await User.findById(req.params.userId)
        .select('username avatar status lastSeen createdAt')
        .lean();

      if (!user) return sendError(res, 'User not found', 404);
      return sendSuccess(res, { user });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { username } = req.body;
      const updates = {};
      if (username) updates.username = username;

      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
      }).select('-password -refreshToken');

      return sendSuccess(res, { user: user.toPublicProfile() }, 'Profile updated');
    } catch (error) {
      if (error.code === 11000) return sendError(res, 'Username already taken', 409);
      next(error);
    }
  }
}

module.exports = new UserController();
