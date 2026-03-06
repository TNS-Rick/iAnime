const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  // Basic info
  name: { type: String, required: true },
  description: { type: String, default: '' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // Structure
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  categories: [String], // e.g., ['naruto', 'jujutsu-kaisen']
  channelGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ChannelGroup' }],
  
  // Members
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Content
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],

  // Soft delete
  deletedAt: { type: Date, default: null },
});

communitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure unique community names per admin
communitySchema.index({ adminId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Community', communitySchema);
