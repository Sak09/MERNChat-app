const authService = require('../services/authService');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

class AuthController {
  async register(req, res, next) {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return sendError(res, 'All fields are required', 400);
      }

      const result = await authService.register(username, email, password);
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

      return sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Registration successful', 201);
    } catch (error) {
      if (error.message.includes('already exists')) return sendError(res, error.message, 409);
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return sendError(res, 'Email and password required', 400);

      const result = await authService.login(email, password);
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);

      return sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 'Login successful');
    } catch (error) {
      if (error.message === 'Invalid email or password') return sendError(res, error.message, 401);
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      await authService.logout(req.user._id);
      res.clearCookie('refreshToken');
      return sendSuccess(res, {}, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) return sendError(res, 'Refresh token required', 401);

      const tokens = await authService.refreshTokens(refreshToken);
      res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

      return sendSuccess(res, { accessToken: tokens.accessToken }, 'Token refreshed');
    } catch (error) {
      if (error.message.includes('token')) return sendError(res, error.message, 401);
      next(error);
    }
  }

  async getMe(req, res) {
    return sendSuccess(res, { user: req.user }, 'Profile fetched');
  }
}

module.exports = new AuthController();
