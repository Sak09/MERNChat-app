const Conversation = require('../models/Conversation');
const User = require('../models/User');

class ConversationService {
  async getUserConversations(userId) {
    return Conversation.find({
      participants: userId,
      isActive: true,
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username avatar status lastSeen')
      .populate('lastMessage', 'content type createdAt sender status')
      .lean();
  }

  async getOrCreateDirect(userId, targetUserId) {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) throw new Error('User not found');
    if (userId === targetUserId) throw new Error('Cannot create conversation with yourself');

    return Conversation.findOrCreateDirect(userId, targetUserId);
  }

  async createGroup(creatorId, name, participantIds) {
    if (!participantIds.includes(creatorId.toString())) {
      participantIds.push(creatorId.toString());
    }

    const users = await User.find({ _id: { $in: participantIds } });
    if (users.length < 2) throw new Error('Group needs at least 2 participants');

    return Conversation.create({
      type: 'group',
      name,
      participants: participantIds,
      admins: [creatorId],
      avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${name}`,
    });
  }

  async getConversationById(conversationId, userId) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    }).populate('participants', 'username avatar status lastSeen');

    if (!conversation) throw new Error('Conversation not found');
    return conversation;
  }
}

module.exports = new ConversationService();
