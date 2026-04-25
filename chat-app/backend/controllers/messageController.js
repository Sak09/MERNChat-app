const messageService = require('../services/messageService');
const { addMessageJob } = require('../queues/messageQueue');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

class MessageController {
  async getMessages(req, res, next) {
    try {
      const { conversationId } = req.params;
      const { cursor } = req.query;

      const result = await messageService.getMessages(conversationId, req.user._id, cursor || null);

      return sendPaginated(res, result.messages, {
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        pageSize: 20,
      });
    } catch (error) {
      if (error.message.includes('not found')) return sendError(res, error.message, 404);
      next(error);
    }
  }

  async sendMessage(req, res, next) {
    try {
      const { conversationId } = req.params;
      const { content, type = 'text', clientId, replyTo } = req.body;

      if (!content?.trim()) return sendError(res, 'Message content required', 400);

      // Add to queue for processing
      const job = await addMessageJob({
        conversationId,
        senderId: req.user._id,
        content: content.trim(),
        type,
        clientId,
        replyTo,
      });

      return sendSuccess(res, { jobId: job.id, clientId }, 'Message queued', 202);
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req, res, next) {
    try {
      const { messageId } = req.params;
      await messageService.deleteMessage(messageId, req.user._id);
      return sendSuccess(res, {}, 'Message deleted');
    } catch (error) {
      if (error.message.includes('not found')) return sendError(res, error.message, 404);
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { conversationId } = req.params;
      await messageService.markAsRead(conversationId, req.user._id);
      return sendSuccess(res, {}, 'Messages marked as read');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();
