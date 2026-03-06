const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  country: { type: String, required: true },
  type: { type: String, required: true },
}, { _id: false });

const animeSchema = new mongoose.Schema({
  // Basic info
  title: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  rating: { type: Number, min: 0, max: 10, default: 0 },
  category: { type: String, default: '' },
  status: { type: String, enum: ['ongoing', 'completed', 'upcoming'], default: 'ongoing' },

  // External API links
  jikanId: { type: Number, default: null },
  anilistId: { type: Number, default: null },
  kitsuId: { type: Number, default: null },

  // Platforms (streaming)
  platforms: [platformSchema],

  // Community info
  hashtags: [String],
  followedByCount: { type: Number, default: 0 },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // Soft delete
  deletedAt: { type: Date, default: null },
});

// Update timestamp on save
animeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Anime', animeSchema);
