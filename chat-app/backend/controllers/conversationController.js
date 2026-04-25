const conversationService = require('../services/conversationService');
const { sendSuccess, sendError } = require('../utils/response');

class ConversationController {
  async getConversations(req, res, next) {
    try {
      const conversations = await conversationService.getUserConversations(req.user._id);
      return sendSuccess(res, { conversations });
    } catch (error) {
      next(error);
    }
  }

  async getOrCreateDirect(req, res, next) {
    try {
      const { targetUserId } = req.params;
      const conversation = await conversationService.getOrCreateDirect(req.user._id, targetUserId);
      return sendSuccess(res, { conversation });
    } catch (error) {
      if (error.message.includes('not found')) return sendError(res, error.message, 404);
      next(error);
    }
  }

  async createGroup(req, res, next) {
    try {
      const { name, participantIds } = req.body;
      if (!name || !participantIds?.length) {
        return sendError(res, 'Group name and participants required', 400);
      }
      const conversation = await conversationService.createGroup(req.user._id, name, participantIds);
      return sendSuccess(res, { conversation }, 'Group created', 201);
    } catch (error) {
      next(error);
    }
  }

  async getConversation(req, res, next) {
    try {
      const conversation = await conversationService.getConversationById(
        req.params.conversationId,
        req.user._id
      );
      return sendSuccess(res, { conversation });
    } catch (error) {
      if (error.message.includes('not found')) return sendError(res, error.message, 404);
      next(error);
    }
  }
}

module.exports = new ConversationController();
