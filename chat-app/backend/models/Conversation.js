const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    type: {
      type: String,
      enum: ['direct', 'group'],
      default: 'direct',
    },
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    avatar: String,
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ participants: 1, type: 1 });

// Find or create direct conversation between two users
conversationSchema.statics.findOrCreateDirect = async function (userId1, userId2) {
  const existing = await this.findOne({
    type: 'direct',
    participants: { $all: [userId1, userId2], $size: 2 },
  }).populate('participants', 'username avatar status lastSeen');

  if (existing) return existing;

  const conversation = await this.create({
    type: 'direct',
    participants: [userId1, userId2],
  });

  return conversation.populate('participants', 'username avatar status lastSeen');
};

module.exports = mongoose.model('Conversation', conversationSchema);
