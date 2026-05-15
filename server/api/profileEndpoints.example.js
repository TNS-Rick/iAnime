/**
 * Backend API Reference for Profile Settings
 * Implement these endpoints to complete the integration
 * 
 * File: server/api/profileEndpoints.js (suggested)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

// ===== VALIDATION HELPERS =====

const isValidUsername = (username) => {
  const pattern = /^[a-zA-Z0-9_-]{3,30}$/;
  return pattern.test(username);
};

const isValidBio = (bio) => {
  return bio && bio.length <= 200;
};

const RESERVED_USERNAMES = ['admin', 'root', 'system', 'moderator', 'support'];

// ===== ENDPOINTS =====

/**
 * GET /api/v1/profile
 * Get current user profile
 * 
 * Response:
 * {
 *   "profile": {
 *     "id": "123",
 *     "username": "giorno_anime",
 *     "email": "user@example.com",
 *     "bio": "Amante degli anime",
 *     "avatar": "base64_or_url",
 *     "frame": "neon",
 *     "createdAt": "2024-01-15T10:00:00Z"
 *   }
 * }
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      profile: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio || '',
        avatar: user.avatar || null,
        frame: user.frame || 'none',
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/profile
 * Update user profile
 * 
 * Body:
 * {
 *   "username": "new_username",
 *   "bio": "New biography",
 *   "avatar": "base64_image_data",
 *   "frame": "neon"
 * }
 * 
 * Response:
 * {
 *   "message": "Profile updated successfully",
 *   "profile": { ... }
 * }
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, bio, avatar, frame } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate username
    if (username && username !== user.username) {
      if (!isValidUsername(username)) {
        return res.status(400).json({
          error: 'Invalid username format',
          details: 'Username must be 3-30 characters (letters, numbers, -, _)'
        });
      }

      // Check if reserved
      if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
        return res.status(400).json({
          error: 'Username reserved',
          details: 'This username is reserved and cannot be used'
        });
      }

      // Check if already in use
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          error: 'Username already in use',
          details: 'Please choose a different username'
        });
      }

      user.username = username;
    }

    // Validate bio
    if (bio !== undefined) {
      if (bio && !isValidBio(bio)) {
        return res.status(400).json({
          error: 'Invalid bio length',
          details: 'Biography must not exceed 200 characters'
        });
      }
      user.bio = bio;
    }

    // Validate frame
    const validFrames = ['none', 'neon', 'gold', 'minimal', 'cyberpunk', 'rgb'];
    if (frame && !validFrames.includes(frame)) {
      return res.status(400).json({
        error: 'Invalid frame',
        details: `Frame must be one of: ${validFrames.join(', ')}`
      });
    }
    if (frame) {
      user.frame = frame;
    }

    // Handle avatar
    if (avatar !== undefined) {
      // If avatar is null, remove it
      if (avatar === null) {
        user.avatar = null;
      } else {
        // Save base64 or URL
        // Option 1: Save to database (if small enough)
        if (avatar.length < 2000000) { // ~2MB limit for DB storage
          user.avatar = avatar;
        } else {
          // Option 2: Upload to S3/CDN and save URL
          // const imageUrl = await uploadToS3(avatar);
          // user.avatar = imageUrl;
          
          return res.status(413).json({
            error: 'Avatar too large',
            details: 'Avatar must be less than 2MB'
          });
        }
      }
    }

    // Update timestamp
    user.updatedAt = new Date();

    // Save to database
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      profile: {
        id: user.id,
        username: user.username,
        email: user.email,
        bio: user.bio || '',
        avatar: user.avatar || null,
        frame: user.frame || 'none',
        updatedAt: user.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/profile/username-availability?username=xxx
 * Check if username is available
 * 
 * Response:
 * {
 *   "available": true,
 *   "username": "giorno_anime"
 * }
 */
router.get('/profile/username-availability', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    if (!isValidUsername(username)) {
      return res.json({
        available: false,
        reason: 'Invalid format'
      });
    }

    if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
      return res.json({
        available: false,
        reason: 'Reserved username'
      });
    }

    const existingUser = await User.findOne({ username });

    res.json({
      available: !existingUser,
      username
    });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v1/profile/avatar
 * Remove user avatar
 * 
 * Response:
 * {
 *   "message": "Avatar removed",
 *   "profile": { ... }
 * }
 */
router.delete('/profile/avatar', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.avatar = null;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      message: 'Avatar removed',
      profile: {
        id: user.id,
        avatar: null
      }
    });
  } catch (error) {
    console.error('Error removing avatar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

// ===== INTEGRATION IN server/index.js =====
// 
// const profileEndpoints = require('./api/profileEndpoints');
// app.use('/api/v1', profileEndpoints);
//

// ===== DATABASE SCHEMA MIGRATION =====
//
// ALTER TABLE users ADD COLUMN bio VARCHAR(200);
// ALTER TABLE users ADD COLUMN avatar LONGTEXT; -- For base64, or VARCHAR(255) for URL
// ALTER TABLE users ADD COLUMN frame VARCHAR(50) DEFAULT 'none';
// ALTER TABLE users ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
//

// ===== ERROR RESPONSES =====
// 400 Bad Request - Validation error
// 401 Unauthorized - Not authenticated
// 403 Forbidden - No permission
// 404 Not Found - Resource not found
// 409 Conflict - Username already taken
// 413 Payload Too Large - Avatar too large
// 500 Internal Server Error - Server error
