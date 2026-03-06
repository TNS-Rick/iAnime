const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['text', 'voice'], required: true },
  hashtags: [String],
  maxMembers: { type: Number, default: 10 },
  permissions: [{
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    canRead: { type: Boolean, default: true },
    canWrite: { type: Boolean, default: true },
  }],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
});

channelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Channel', channelSchema);
