const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;
let redisSubscriber = null;
let redisPublisher = null;

const createRedisClient = (name = 'client') => {
  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis ${name} retry attempt ${times}, delay ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('connect', () => logger.info(`Redis ${name} connected`));
  client.on('error', (err) => logger.error(`Redis ${name} error:`, err));
  client.on('close', () => logger.warn(`Redis ${name} connection closed`));

  return client;
};

const getRedisClient = () => {
  if (!redisClient) redisClient = createRedisClient('main');
  return redisClient;
};

const getRedisSubscriber = () => {
  if (!redisSubscriber) redisSubscriber = createRedisClient('subscriber');
  return redisSubscriber;
};

const getRedisPublisher = () => {
  if (!redisPublisher) redisPublisher = createRedisClient('publisher');
  return redisPublisher;
};

const disconnectRedis = async () => {
  const clients = [redisClient, redisSubscriber, redisPublisher].filter(Boolean);
  await Promise.all(clients.map((c) => c.quit()));
  logger.info('All Redis clients disconnected');
};

module.exports = { getRedisClient, getRedisSubscriber, getRedisPublisher, disconnectRedis };
