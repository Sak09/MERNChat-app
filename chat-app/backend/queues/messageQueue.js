const Bull = require('bull');
const messageService = require('../services/messageService');
const logger = require('../utils/logger');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

// Queue for processing outbound messages
const messageQueue = new Bull('message-processing', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Queue for delivery ACK tracking
const ackQueue = new Bull('message-ack', {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 500 },
    removeOnComplete: 200,
  },
});

// Process message jobs
messageQueue.process('send', async (job) => {
  const { conversationId, senderId, content, type, clientId, replyTo } = job.data;
  logger.debug(`Processing message job ${job.id} for conversation ${conversationId}`);

  const message = await messageService.sendMessage({
    conversationId,
    senderId,
    content,
    type,
    clientId,
    replyTo,
  });

  return { messageId: message._id.toString(), clientId };
});

// Process ACK jobs
ackQueue.process('ack', async (job) => {
  const { messageId, status } = job.data;
  await messageService.updateMessageStatus(messageId, status);
  return { messageId, status };
});

// Event handlers
messageQueue.on('completed', (job, result) => {
  logger.debug(`Message job ${job.id} completed: ${result.messageId}`);
});

messageQueue.on('failed', (job, err) => {
  logger.error(`Message job ${job.id} failed: ${err.message}`);
});

ackQueue.on('failed', (job, err) => {
  logger.error(`ACK job ${job.id} failed: ${err.message}`);
});

const addMessageJob = (data) => messageQueue.add('send', data, { priority: 1 });
const addAckJob = (data) => ackQueue.add('ack', data);

const getQueueStats = async () => {
  const [msgWaiting, msgActive, msgFailed, ackWaiting] = await Promise.all([
    messageQueue.getWaitingCount(),
    messageQueue.getActiveCount(),
    messageQueue.getFailedCount(),
    ackQueue.getWaitingCount(),
  ]);
  return { messageQueue: { waiting: msgWaiting, active: msgActive, failed: msgFailed }, ackQueue: { waiting: ackWaiting } };
};

const gracefulShutdown = async () => {
  await Promise.all([messageQueue.close(), ackQueue.close()]);
  logger.info('Bull queues closed');
};

module.exports = { messageQueue, ackQueue, addMessageJob, addAckJob, getQueueStats, gracefulShutdown };
