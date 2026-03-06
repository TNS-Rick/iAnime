const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', default: null }, // for channel messages
  dmSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DirectMessage', default: null }, // for DM
  timestamp: { type: Date, default: Date.now },
  isPinned: { type: Boolean, default: false },
  reactions: [{
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // @mentions
  deletedAt: { type: Date, default: null },
});

messageSchema.index({ channelId: 1, timestamp: -1 });
messageSchema.index({ dmSessionId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
