const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null },
});

directMessageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for quick lookup by participants
directMessageSchema.index({ participants: 1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
