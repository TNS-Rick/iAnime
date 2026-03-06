const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic info
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  username: { type: String, required: true, unique: true, lowercase: true, maxlength: 20 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // Profile
  bio: { type: String, default: '', maxlength: 500 },
  profileImage: { type: String, default: '' },
  displayNameColor: { type: String, default: '#000000' }, // premium feature
  profileFrameStyle: { type: String, default: 'default' }, // premium feature

  // Settings
  theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
  displayMode: { type: String, enum: ['light', 'dark'], default: 'light' },
  language: { type: String, default: 'it' },
  notifications: {
    mention: { type: Boolean, default: true },
    friendRequest: { type: Boolean, default: true },
    systemNotifications: { type: Boolean, default: true },
    communityList: [mongoose.Schema.Types.ObjectId], // communities for mentions
    limitedPeople: [mongoose.Schema.Types.ObjectId], // users to exclude notifications
  },

  // Premium
  isPremium: { type: Boolean, default: false },
  premiumExpiresAt: { type: Date, default: null },
  billingMethod: { type: String, enum: ['credit_card', 'debit_card', 'prepaid'], default: null },

  // 2FA
  twoFAEnabled: { type: Boolean, default: false },
  twoFAMethod: { type: String, enum: ['phone', 'email', 'app'], default: null },
  twoFASecret: { type: String, default: null },

  // Privacy & Security
  whoCanInvite: { type: String, enum: ['all', 'friends', 'none'], default: 'all' },
  acceptStrangerMessages: { type: Boolean, default: false },

  // Relations
  friendsList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  communities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],

  // Colorblind modes
  colorblindMode: { type: String, enum: ['normal', 'protanopia', 'deuteranopia', 'tritanopia'], default: 'normal' },
  highContrast: { type: Boolean, default: false },
  textSize: { type: Number, min: 0.25, max: 1, default: 0.75 }, // in VW units

  // Audio
  audioInputDevice: { type: String, default: 'default' },
  audioOutputDevice: { type: String, default: 'default' },
  volume: { type: Number, min: 0, max: 100, default: 80 },

  // Username change tracking
  lastUsernameChange: { type: Date, default: null },

  // Soft delete
  deletedAt: { type: Date, default: null },
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(plainPassword) {
  return await bcrypt.compare(plainPassword, this.password);
};

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
