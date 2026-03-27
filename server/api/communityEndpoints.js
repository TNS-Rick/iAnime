const express = require('express');
const { authenticateToken, sanitizeUser } = require('./auth');
const { execute } = require('../db/connection');
const { Community, Channel, Message, User } = require('../models');

const router = express.Router();

// Get all communities (optional: filter by user)
router.get('/v1/communities', async (req, res, next) => {
  try {
    const communities = await Community.findAll(50, 0);
    res.json({ communities: communities || [] });
  } catch (error) {
    next(error);
  }
});

// Get a specific community by ID
router.get('/v1/communities/:communityId', async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    res.json({ community });
  } catch (error) {
    next(error);
  }
});

// Get members of a specific community
router.get('/v1/communities/:communityId/members', async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const memberIds = community.members || [];
    const members = [];

    for (const memberId of memberIds) {
      const user = await User.findById(memberId);
      if (user) {
        const { password, twoFASecret, ...safeUser } = user;
        members.push(safeUser);
      }
    }

    res.json({ members });
  } catch (error) {
    next(error);
  }
});

// Add a member to a community
router.post('/v1/communities/:communityId/members', authenticateToken, async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;
    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    const members = community.members || [];
    if (members.includes(userId)) {
      return res.status(400).json({ error: 'You are already a member of this community' });
    }

    members.push(userId);
    await Community.update(communityId, { members });

    res.json({ message: 'Successfully joined community' });
  } catch (error) {
    next(error);
  }
});

// ========== CHANNELS ENDPOINTS ==========

// Get all channels in a community
router.get('/v1/communities/:communityId/channels', async (req, res, next) => {
  try {
    const { communityId } = req.params;

    const [channels] = await execute(
      `SELECT * FROM channels WHERE communityId = ? AND deletedAt IS NULL`,
      [communityId]
    );

    res.json({ channels: channels || [] });
  } catch (error) {
    next(error);
  }
});

// Create a new channel (admin only)
router.post('/v1/communities/:communityId/channels', authenticateToken, async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // Check if user is admin
    const [community] = await execute(
      `SELECT adminId FROM communities WHERE id = ? AND deletedAt IS NULL`,
      [communityId]
    );

    if (!community || community[0].adminId !== req.user.id) {
      return res.status(403).json({ error: 'Only admin can create channels' });
    }

    const [result] = await execute(
      `INSERT INTO channels (name, type, communityId, members, messages, hashtags, permissions)
       VALUES (?, ?, ?, JSON_ARRAY(), JSON_ARRAY(), JSON_ARRAY(), JSON_OBJECT())`,
      [name, type, communityId]
    );

    res.status(201).json({
      message: 'Channel created successfully',
      channel: { id: result.insertId, name, type, communityId }
    });
  } catch (error) {
    next(error);
  }
});

// Update channel (admin only)
router.put('/v1/communities/:communityId/channels/:channelId', authenticateToken, async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const { name, type } = req.body;

    // Check if user is admin
    const [community] = await execute(
      `SELECT adminId FROM communities WHERE id = ? AND deletedAt IS NULL`,
      [communityId]
    );

    if (!community || community[0].adminId !== req.user.id) {
      return res.status(403).json({ error: 'Only admin can update channels' });
    }

    await execute(
      `UPDATE channels SET name = ?, type = ? WHERE id = ? AND communityId = ? AND deletedAt IS NULL`,
      [name, type, req.params.channelId, communityId]
    );

    res.json({ message: 'Channel updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete channel (admin only)
router.delete('/v1/communities/:communityId/channels/:channelId', authenticateToken, async (req, res, next) => {
  try {
    const { communityId } = req.params;

    // Check if user is admin
    const [community] = await execute(
      `SELECT adminId FROM communities WHERE id = ? AND deletedAt IS NULL`,
      [communityId]
    );

    if (!community || community[0].adminId !== req.user.id) {
      return res.status(403).json({ error: 'Only admin can delete channels' });
    }

    await execute(
      `UPDATE channels SET deletedAt = NOW() WHERE id = ? AND communityId = ? AND deletedAt IS NULL`,
      [req.params.channelId, communityId]
    );

    res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ========== MESSAGES ENDPOINTS ==========

// Get messages in a channel
router.get('/v1/communities/:communityId/channels/:channelId/messages', async (req, res, next) => {
  try {
    const { communityId, channelId } = req.params;

    const [messages] = await execute(
      `SELECT * FROM messages WHERE channelId = ? AND deletedAt IS NULL ORDER BY createdAt ASC`,
      [channelId]
    );

    res.json({ messages: messages || [] });
  } catch (error) {
    next(error);
  }
});

// Post a message in a channel
router.post('/v1/communities/:communityId/channels/:channelId/messages', authenticateToken, async (req, res, next) => {
  try {
    const { communityId, channelId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Verify user is community member
    const [community] = await execute(
      `SELECT members FROM communities WHERE id = ? AND deletedAt IS NULL`,
      [communityId]
    );

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    let members = [];
    try {
      members = JSON.parse(community[0].members || '[]');
    } catch (e) {
      members = [];
    }

    if (!members.includes(req.user.id) && community[0].adminId !== req.user.id) {
      return res.status(403).json({ error: 'You are not a member of this community' });
    }

    const [result] = await execute(
      `INSERT INTO messages (content, authorId, channelId, isPinned, reactions)
       VALUES (?, ?, ?, FALSE, JSON_ARRAY())`,
      [content, req.user.id, channelId]
    );

    res.status(201).json({
      message: 'Message posted successfully',
      messageId: result.insertId
    });
  } catch (error) {
    next(error);
  }
});

// Delete message (admin or message author)
router.delete('/v1/communities/:communityId/messages/:messageId', authenticateToken, async (req, res, next) => {
  try {
    const { communityId } = req.params;

    // Get message info
    const [message] = await execute(
      `SELECT authorId FROM messages WHERE id = ? AND deletedAt IS NULL`,
      [req.params.messageId]
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is admin or message author
    const [community] = await execute(
      `SELECT adminId FROM communities WHERE id = ? AND deletedAt IS NULL`,
      [communityId]
    );

    if (community[0].adminId !== req.user.id && message[0].authorId !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await execute(
      `UPDATE messages SET deletedAt = NOW() WHERE id = ? AND deletedAt IS NULL`,
      [req.params.messageId]
    );

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Pin/Unpin message (admin only)
router.put('/v1/communities/:communityId/messages/:messageId/pin', authenticateToken, async (req, res, next) => {
  try {
    const { communityId } = req.params;

    // Check if user is admin
    const [community] = await execute(
      `SELECT adminId FROM communities WHERE id = ? AND deletedAt IS NULL`,
      [communityId]
    );

    if (!community || community[0].adminId !== req.user.id) {
      return res.status(403).json({ error: 'Only admin can pin messages' });
    }

    // Get current pin status
    const [message] = await execute(
      `SELECT isPinned FROM messages WHERE id = ? AND deletedAt IS NULL`,
      [req.params.messageId]
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const newPinnedStatus = !message[0].isPinned;

    await execute(
      `UPDATE messages SET isPinned = ? WHERE id = ? AND deletedAt IS NULL`,
      [newPinnedStatus, req.params.messageId]
    );

    res.json({ message: newPinnedStatus ? 'Message pinned' : 'Message unpinned' });
  } catch (error) {
    next(error);
  }
});

// ========== FRIENDSHIPS ENDPOINTS ==========

// Get friend requests for current user
router.get('/v1/friendships/requests', authenticateToken, async (req, res, next) => {
  try {
    const [friendships] = await execute(
      `SELECT * FROM friendships WHERE recipient = ? AND status = 'pending' AND deletedAt IS NULL`,
      [req.user.id]
    );

    res.json({ friendRequests: friendships || [] });
  } catch (error) {
    next(error);
  }
});

// Get all friends for current user
router.get('/v1/friendships', authenticateToken, async (req, res, next) => {
  try {
    const [friendships] = await execute(
      `SELECT * FROM friendships WHERE (requester = ? OR recipient = ?) AND status = 'accepted' AND deletedAt IS NULL`,
      [req.user.id, req.user.id]
    );

    res.json({ friends: friendships || [] });
  } catch (error) {
    next(error);
  }
});

// Send friend request
router.post('/v1/friendships', authenticateToken, async (req, res, next) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    if (req.user.id === recipientId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if relationship already exists
    const [existing] = await execute(
      `SELECT id FROM friendships WHERE 
       (requester = ? AND recipient = ?) OR (requester = ? AND recipient = ?)
       AND deletedAt IS NULL`,
      [req.user.id, recipientId, recipientId, req.user.id]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Friendship relationship already exists' });
    }

    const [result] = await execute(
      `INSERT INTO friendships (requester, recipient, status) VALUES (?, ?, 'pending')`,
      [req.user.id, recipientId]
    );

    res.status(201).json({
      message: 'Friend request sent',
      friendshipId: result.insertId
    });
  } catch (error) {
    next(error);
  }
});

// Accept/Reject friend request
router.put('/v1/friendships/:friendshipId', authenticateToken, async (req, res, next) => {
  try {
    const { status } = req.body; // 'accepted' or 'rejected'

    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if user is the recipient
    const [friendship] = await execute(
      `SELECT recipient FROM friendships WHERE id = ? AND deletedAt IS NULL`,
      [req.params.friendshipId]
    );

    if (!friendship || friendship[0].recipient !== req.user.id) {
      return res.status(403).json({ error: 'You can only respond to friend requests sent to you' });
    }

    if (status === 'rejected') {
      await execute(
        `UPDATE friendships SET deletedAt = NOW() WHERE id = ? AND deletedAt IS NULL`,
        [req.params.friendshipId]
      );
    } else {
      await execute(
        `UPDATE friendships SET status = 'accepted' WHERE id = ? AND deletedAt IS NULL`,
        [req.params.friendshipId]
      );
    }

    res.json({ message: `Friend request ${status}` });
  } catch (error) {
    next(error);
  }
});

// Unfriend/Remove friend
router.delete('/v1/friendships/:friendshipId', authenticateToken, async (req, res, next) => {
  try {
    // Check if user is part of the friendship
    const [friendship] = await execute(
      `SELECT requester, recipient FROM friendships WHERE id = ? AND deletedAt IS NULL`,
      [req.params.friendshipId]
    );

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    if (friendship[0].requester !== req.user.id && friendship[0].recipient !== req.user.id) {
      return res.status(403).json({ error: 'You are not part of this friendship' });
    }

    await execute(
      `UPDATE friendships SET deletedAt = NOW() WHERE id = ? AND deletedAt IS NULL`,
      [req.params.friendshipId]
    );

    res.json({ message: 'Friendship removed' });
  } catch (error) {
    next(error);
  }
});

// ========== DIRECT MESSAGES ENDPOINTS ==========

// Get all conversations for current user
router.get('/v1/direct-messages', authenticateToken, async (req, res, next) => {
  try {
    const [conversations] = await execute(
      `SELECT * FROM direct_messages WHERE participants LIKE ? AND deletedAt IS NULL`,
      [`%${req.user.id}%`]
    );

    res.json({ conversations: conversations || [] });
  } catch (error) {
    next(error);
  }
});

// Get messages in a direct message conversation
router.get('/v1/direct-messages/:conversationId', authenticateToken, async (req, res, next) => {
  try {
    const [conversation] = await execute(
      `SELECT * FROM direct_messages WHERE id = ? AND deletedAt IS NULL`,
      [req.params.conversationId]
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Parse participants and check if user is part of conversation
    let participants = [];
    try {
      participants = JSON.parse(conversation[0].participants || '[]');
    } catch (e) {
      participants = [];
    }

    if (!participants.includes(req.user.id)) {
      return res.status(403).json({ error: 'You are not part of this conversation' });
    }

    res.json({ conversation: conversation[0] });
  } catch (error) {
    next(error);
  }
});

// Send a direct message
router.post('/v1/direct-messages', authenticateToken, async (req, res, next) => {
  try {
    const { recipientId, content } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({ error: 'Recipient ID and content are required' });
    }

    // Find or create conversation
    const [existingConversation] = await execute(
      `SELECT id FROM direct_messages WHERE 
       (JSON_CONTAINS(participants, JSON_ARRAY(?, ?)) OR JSON_CONTAINS(participants, JSON_ARRAY(?, ?)))
       AND deletedAt IS NULL`,
      [req.user.id, recipientId, recipientId, req.user.id]
    );

    let conversationId;

    if (existingConversation && existingConversation.length > 0) {
      conversationId = existingConversation[0].id;
    } else {
      // Create new conversation
      const [result] = await execute(
        `INSERT INTO direct_messages (participants, messages) VALUES (?, JSON_ARRAY())`,
        [JSON.stringify([req.user.id, recipientId])]
      );
      conversationId = result.insertId;
    }

    // Add message to conversation
    const messageObj = {
      id: Date.now(),
      authorId: req.user.id,
      content,
      timestamp: new Date().toISOString()
    };

    const [conversation] = await execute(
      `SELECT messages FROM direct_messages WHERE id = ? AND deletedAt IS NULL`,
      [conversationId]
    );

    let messages = [];
    try {
      messages = JSON.parse(conversation[0].messages || '[]');
    } catch (e) {
      messages = [];
    }

    messages.push(messageObj);

    await execute(
      `UPDATE direct_messages SET messages = ? WHERE id = ? AND deletedAt IS NULL`,
      [JSON.stringify(messages), conversationId]
    );

    res.status(201).json({
      message: {
        id: messageObj.id,
        authorId: req.user.id,
        author: { id: req.user.id, username: req.user.username },
        content,
        timestamp: messageObj.timestamp,
        dmSessionId: conversationId
      },
      conversationId,
      messageId: messageObj.id
    });
  } catch (error) {
    next(error);
  }
});

// ========== USER BLOCKING ENDPOINTS ==========

// Get blocked users for current user
router.get('/v1/users/blocked', authenticateToken, async (req, res, next) => {
  try {
    const [user] = await execute(
      `SELECT blockedUsers FROM users WHERE id = ? AND deletedAt IS NULL`,
      [req.user.id]
    );

    let blockedUsers = [];
    try {
      blockedUsers = JSON.parse(user[0].blockedUsers || '[]');
    } catch (e) {
      blockedUsers = [];
    }

    res.json({ blockedUsers });
  } catch (error) {
    next(error);
  }
});

// Block a user
router.post('/v1/users/:userId/block', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.user.id === parseInt(userId)) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    const [user] = await execute(
      `SELECT blockedUsers FROM users WHERE id = ? AND deletedAt IS NULL`,
      [req.user.id]
    );

    let blockedUsers = [];
    try {
      blockedUsers = JSON.parse(user[0].blockedUsers || '[]');
    } catch (e) {
      blockedUsers = [];
    }

    if (!blockedUsers.includes(parseInt(userId))) {
      blockedUsers.push(parseInt(userId));

      await execute(
        `UPDATE users SET blockedUsers = ? WHERE id = ? AND deletedAt IS NULL`,
        [JSON.stringify(blockedUsers), req.user.id]
      );
    }

    res.json({ message: 'User blocked' });
  } catch (error) {
    next(error);
  }
});

// Unblock a user
router.delete('/v1/users/:userId/block', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [user] = await execute(
      `SELECT blockedUsers FROM users WHERE id = ? AND deletedAt IS NULL`,
      [req.user.id]
    );

    let blockedUsers = [];
    try {
      blockedUsers = JSON.parse(user[0].blockedUsers || '[]');
    } catch (e) {
      blockedUsers = [];
    }

    blockedUsers = blockedUsers.filter(id => id !== parseInt(userId));

    await execute(
      `UPDATE users SET blockedUsers = ? WHERE id = ? AND deletedAt IS NULL`,
      [JSON.stringify(blockedUsers), req.user.id]
    );

    res.json({ message: 'User unblocked' });
  } catch (error) {
    next(error);
  }
});

// ========== USER SEARCH ENDPOINT ==========

// Search users by username
router.get('/v1/users/search', async (req, res, next) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const [users] = await execute(
      `SELECT id, username, profileImage, bio FROM users WHERE username LIKE ? AND deletedAt IS NULL LIMIT 10`,
      [`%${username}%`]
    );

    res.json({ users: users || [] });
  } catch (error) {
    next(error);
  }
});

module.exports = { communityEndpointsRouter: router };
