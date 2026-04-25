const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const PAGE_SIZE = 20;

class MessageService {
  async sendMessage({ conversationId, senderId, content, type = 'text', clientId, replyTo }) {
    // Verify conversation and sender are participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: senderId,
    });
    if (!conversation) throw new Error('Conversation not found or access denied');

    const message = await Message.create({
      conversationId,
      sender: senderId,
      content,
      type,
      clientId,
      replyTo: replyTo || null,
      status: 'sent',
    });

    // Update conversation's last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: message.createdAt,
      $inc: this._buildUnreadInc(conversation.participants, senderId),
    });

    // Populate sender info
    await message.populate('sender', 'username avatar');

    // Invalidate cache
    const redis = getRedisClient();
    await redis.del(`messages:${conversationId}:page:1`);

    return message;
  }

  _buildUnreadInc(participants, senderId) {
    const inc = {};
    for (const pid of participants) {
      if (pid.toString() !== senderId.toString()) {
        inc[`unreadCount.${pid}`] = 1;
      }
    }
    return inc;
  }

  async getMessages(conversationId, userId, cursor = null) {
    // Verify access
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });
    if (!conversation) throw new Error('Conversation not found or access denied');

    const query = {
      conversationId,
      isDeleted: false,
    };

    // Cursor-based pagination: fetch messages before the cursor
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE + 1)
      .populate('sender', 'username avatar')
      .populate('replyTo', 'content sender')
      .lean();

    const hasMore = messages.length > PAGE_SIZE;
    if (hasMore) messages.pop();

    // Reverse so oldest is first
    messages.reverse();

    const nextCursor = hasMore && messages.length > 0 ? messages[0].createdAt.toISOString() : null;

    // Mark messages as delivered
    await Message.updateMany(
      { conversationId, sender: { $ne: userId }, status: 'sent' },
      { status: 'delivered' }
    );

    // Reset unread count
    await Conversation.findByIdAndUpdate(conversationId, {
      [`unreadCount.${userId}`]: 0,
    });

    return { messages, hasMore, nextCursor };
  }

  async markAsRead(conversationId, userId) {
    await Message.updateMany(
      { conversationId, sender: { $ne: userId }, status: { $in: ['sent', 'delivered'] } },
      { status: 'read', $addToSet: { readBy: { user: userId } } }
    );

    await Conversation.findByIdAndUpdate(conversationId, {
      [`unreadCount.${userId}`]: 0,
    });
  }

  async updateMessageStatus(messageId, status) {
    return Message.findByIdAndUpdate(messageId, { status }, { new: true });
  }

  async deleteMessage(messageId, userId) {
    const message = await Message.findOne({ _id: messageId, sender: userId });
    if (!message) throw new Error('Message not found or not authorized');
    return message.softDelete();
  }
}

module.exports = new MessageService();
