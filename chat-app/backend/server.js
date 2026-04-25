require('dotenv').config();
const http = require('http');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/database');
const { getRedisClient } = require('./config/redis');
const setupSocket = require('./services/socketService');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

// Routes
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const userRoutes = require('./routes/users');

const app = express();
const httpServer = http.createServer(app);

// ── SECURITY & MIDDLEWARE ──
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ── RATE LIMITING ──
app.use('/api', apiLimiter);

// ── HEALTH CHECK ──
app.get('/health', async (req, res) => {
  const redis = getRedisClient();
  let redisStatus = 'disconnected';
  try {
    await redis.ping();
    redisStatus = 'connected';
  } catch {}

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  });
});

// ── API ROUTES ──
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userRoutes);

// ── 404 & ERROR HANDLERS ──
app.use(notFound);
app.use(errorHandler);

// ── STARTUP ──
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    getRedisClient(); // Initialize Redis connection

    const io = setupSocket(httpServer);
    app.set('io', io);

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ── GRACEFUL SHUTDOWN ──
const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  httpServer.close(async () => {
    const { gracefulShutdown } = require('./queues/messageQueue');
    const { disconnectRedis } = require('./config/redis');
    await gracefulShutdown();
    await disconnectRedis();
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

start();

module.exports = { app, httpServer };
