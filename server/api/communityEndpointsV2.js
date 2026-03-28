const express = require('express');
const { authenticateToken, sanitizeUser } = require('./auth');
const { Community, Channel, ChannelGroup, Message, User, Friendship } = require('../models');

const router = express.Router();

const parseIdArray = (values) => {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value));
};

const hydrateCommunityChannelGroups = async (community) => {
  const groupIds = parseIdArray(community?.channelGroups || []);
  if (groupIds.length === 0) return [];

  const groups = await Promise.all(groupIds.map((groupId) => ChannelGroup.findById(groupId)));
  return groups.filter(Boolean);
};

const hydrateCommunityChannels = async (community) => {
  const groups = await hydrateCommunityChannelGroups(community);
  const orderedChannelIds = [];
  const channelGroupById = new Map();

  for (const group of groups) {
    const channelIds = parseIdArray(group.channels || []);
    for (const channelId of channelIds) {
      if (!channelGroupById.has(channelId)) {
        channelGroupById.set(channelId, {
          channelGroupId: group.id,
          channelGroupName: group.name,
        });
        orderedChannelIds.push(channelId);
      }
    }
  }

  const loadedChannels = await Promise.all(orderedChannelIds.map((channelId) => Channel.findById(channelId)));
  const channels = loadedChannels
    .filter(Boolean)
    .map((channel) => ({
      ...channel,
      ...(channelGroupById.get(channel.id) || {}),
    }));

  return {
    channels,
    channelGroups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      channels: parseIdArray(group.channels || []),
    })),
  };
};

// ========== COMMUNITIES ENDPOINTS ==========

// Get all communities
router.get('/v1/communities', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const communities = await Community.findAll(limit, offset);
    res.json({ communities: communities || [] });
  } catch (error) {
    next(error);
  }
});

// Get single community
router.get('/v1/communities/:id', async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ error: 'Comunità non trovata' });
    }
    res.json({ community });
  } catch (error) {
    next(error);
  }
});

// Create community (authenticated)
router.post('/v1/communities', authenticateToken, async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Il nome della comunità è obbligatorio' });
    }

    const community = await Community.create({
      name,
      description: description || '',
      adminId: req.user.id,
      members: [req.user.id],
    });

    res.status(201).json({ community });
  } catch (error) {
    next(error);
  }
});

// Update community (admin only)
router.put('/v1/communities/:id', authenticateToken, async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ error: 'Comunità non trovata' });
    }

    if (community.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Solo l\'admin può modificare la comunità' });
    }

    const { name, description } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;

    const updated = await Community.update(req.params.id, updates);
    res.json({ community: updated });
  } catch (error) {
    next(error);
  }
});

// Delete community (admin only)
router.delete('/v1/communities/:id', authenticateToken, async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ error: 'Comunità non trovata' });
    }

    if (community.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Solo l\'admin può eliminare la comunità' });
    }

    await Community.softDelete(req.params.id);
    res.json({ message: 'Comunità eliminata' });
  } catch (error) {
    next(error);
  }
});

// ========== MEMBERS ENDPOINTS ==========

// Get community members
router.get('/v1/communities/:id/members', async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ error: 'Comunità non trovata' });
    }

    const members = [];
    for (const memberId of community.members || []) {
      const user = await User.findById(memberId);
      if (user) {
        members.push(sanitizeUser(user));
      }
    }

    res.json({ members, count: members.length });
  } catch (error) {
    next(error);
  }
});

// Join community
router.post('/v1/communities/:id/join', authenticateToken, async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ error: 'Comunità non trovata' });
    }

    const members = community.members || [];
    const userId = parseInt(req.user.id);
    
    // Check if already a member (handle both string and number types)
    const isMember = members.some(m => parseInt(m) === userId);
    if (isMember) {
      return res.status(400).json({ error: 'Sei già membro di questa comunità' });
    }

    members.push(userId);
    await Community.update(req.params.id, { members });

    res.json({ message: 'Sei entrato nella comunità' });
  } catch (error) {
    next(error);
  }
});

// Leave community
router.post('/v1/communities/:id/leave', authenticateToken, async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ error: 'Comunità non trovata' });
    }

    if (community.adminId === req.user.id) {
      return res.status(400).json({ error: 'L\'admin della comunità non può uscire' });
    }

    const userId = parseInt(req.user.id);
    const members = (community.members || []).filter(m => parseInt(m) !== userId);
    await Community.update(req.params.id, { members });

    res.json({ message: 'Hai lasciato la comunità' });
  } catch (error) {
    next(error);
  }
});

// ========== CHANNELS ENDPOINTS ==========

// Get channels in community (simple endpoint)
router.get('/v1/communities/:communityId/channels', async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) {
      return res.status(404).json({ error: 'Comunità non trovata' });
    }

    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const { channels, channelGroups } = await hydrateCommunityChannels(community);
    const pagedChannels = channels.slice(offset, offset + limit);

    res.json({
      channels: pagedChannels,
      channelGroups,
      count: channels.length,
    });
  } catch (error) {
    next(error);
  }
});

// Get single channel
router.get('/v1/channels/:id', async (req, res, next) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: 'Canale non trovato' });
    }
    res.json({ channel });
  } catch (error) {
    next(error);
  }
});

// Create channel (admin only)
router.post('/v1/communities/:communityId/channels', authenticateToken, async (req, res, next) => {
  try {
    const { type, name, channelGroupId } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Nome e tipo sono obbligatori' });
    }

    const community = await Community.findById(req.params.communityId);
    if (!community) {
      return res.status(404).json({ error: 'Comunità non trovata' });
    }

    if (community.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Solo l\'admin può creare canali' });
    }

    const channel = await Channel.create({
      name,
      type,
      members: [req.user.id],
    });

    const channelGroups = await hydrateCommunityChannelGroups(community);
    if (channelGroups.length === 0) {
      await Channel.softDelete(channel.id);
      return res.status(400).json({ error: 'Nessun gruppo di canali disponibile per questa comunità' });
    }

    const parsedRequestedGroupId = Number.parseInt(channelGroupId, 10);
    let targetGroup = null;

    if (Number.isInteger(parsedRequestedGroupId)) {
      targetGroup = channelGroups.find((group) => group.id === parsedRequestedGroupId) || null;
      if (!targetGroup) {
        await Channel.softDelete(channel.id);
        return res.status(400).json({ error: 'Gruppo canale non valido per questa comunità' });
      }
    }

    if (!targetGroup) {
      const preferredKeyword = type === 'voice' ? 'voice' : 'text';
      targetGroup =
        channelGroups.find((group) => group.name.toLowerCase().includes(preferredKeyword)) || channelGroups[0];
    }

    const updatedGroupChannels = Array.from(
      new Set([...parseIdArray(targetGroup.channels || []), channel.id])
    );

    await ChannelGroup.update(targetGroup.id, { channels: updatedGroupChannels });

    res.status(201).json({
      channel: {
        ...channel,
        channelGroupId: targetGroup.id,
        channelGroupName: targetGroup.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update channel (admin only)
router.put('/v1/channels/:id', authenticateToken, async (req, res, next) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: 'Canale non trovato' });
    }

    const { name, type } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (type) updates.type = type;

    const updated = await Channel.update(req.params.id, updates);
    res.json({ channel: updated });
  } catch (error) {
    next(error);
  }
});

// Delete channel
router.delete('/v1/channels/:id', authenticateToken, async (req, res, next) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: 'Canale non trovato' });
    }

    await Channel.softDelete(req.params.id);
    res.json({ message: 'Canale eliminato' });
  } catch (error) {
    next(error);
  }
});

// ========== MESSAGES ENDPOINTS ==========

// Get messages in channel
router.get('/v1/channels/:id/messages', async (req, res, next) => {
  try {
    // Validate channel exists
    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ error: 'Canale non trovato' });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const messages = await Message.findByChannel(req.params.id, limit, offset);
    
    // Enrich messages with author information
    const enrichedMessages = await Promise.all(
      (messages || []).map(async (msg) => {
        const author = await User.findById(msg.authorId);
        return {
          ...msg,
          author: author ? { id: author.id, username: author.username } : null
        };
      })
    );
    
    res.json({ messages: enrichedMessages || [] });
  } catch (error) {
    next(error);
  }
});

// Post message in channel
router.post('/v1/channels/:id/messages', authenticateToken, async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Il contenuto del messaggio è obbligatorio' });
    }

    const message = await Message.create({
      content: content.trim(),
      authorId: req.user.id,
      channelId: req.params.id,
    });

    // Enrich with author information
    const enrichedMessage = {
      ...message,
      author: { id: req.user.id, username: req.user.username }
    };

    const io = req.app.get('io');
    if (io) {
      const payload = { type: 'message', message: enrichedMessage };
      io.to(`channel-${req.params.id}`).emit(`channel-${req.params.id}`, payload);
    }

    res.status(201).json({ message: enrichedMessage });
  } catch (error) {
    next(error);
  }
});

// Update message (author only)
router.put('/v1/messages/:id', authenticateToken, async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Messaggio non trovato' });
    }

    if (message.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Non puoi modificare il messaggio di un altro utente' });
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Il contenuto non può essere vuoto' });
    }

    const updated = await Message.update(req.params.id, { content: content.trim() });
    res.json({ message: updated });
  } catch (error) {
    next(error);
  }
});

// Delete message (author or admin)
router.delete('/v1/messages/:id', authenticateToken, async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Messaggio non trovato' });
    }

    if (message.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Non puoi eliminare il messaggio di un altro utente' });
    }

    await Message.softDelete(req.params.id);
    res.json({ message: 'Messaggio eliminato' });
  } catch (error) {
    next(error);
  }
});

// ========== FRIENDSHIPS ENDPOINTS ==========

// Get friend requests
router.get('/v1/friendships/requests', authenticateToken, async (req, res, next) => {
  try {
    const friendships = await Friendship.findByRecipient(req.user.id, 'pending');
    res.json({ friendRequests: friendships });
  } catch (error) {
    next(error);
  }
});

// Get all friends
router.get('/v1/friendships', authenticateToken, async (req, res, next) => {
  try {
    const friendships = await Friendship.findByUser(req.user.id, 'accepted');
    const friends = [];

    for (const friendship of friendships) {
      const friendId = friendship.requester === req.user.id ? friendship.recipient : friendship.requester;
      const friend = await User.findById(friendId);
      if (friend) {
        friends.push(sanitizeUser(friend));
      }
    }

    res.json({ friends });
  } catch (error) {
    next(error);
  }
});

// Send friend request
router.post('/v1/friendships', authenticateToken, async (req, res, next) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: 'ID del destinatario è obbligatorio' });
    }

    if (req.user.id === recipientId) {
      return res.status(400).json({ error: 'Non puoi aggiungere te stesso' });
    }

    const existing = await Friendship.findBetween(req.user.id, recipientId);
    if (existing) {
      return res.status(400).json({ error: 'Relazione di amicizia già esistente' });
    }

    const friendship = await Friendship.create({
      requester: req.user.id,
      recipient: recipientId,
    });

    res.status(201).json({ friendship });
  } catch (error) {
    next(error);
  }
});

// Accept friend request
router.post('/v1/friendships/:id/accept', authenticateToken, async (req, res, next) => {
  try {
    const friendship = await Friendship.findById(req.params.id);
    if (!friendship) {
      return res.status(404).json({ error: 'Richiesta di amicizia non trovata' });
    }

    if (friendship.recipient !== req.user.id) {
      return res.status(403).json({ error: 'Non puoi accettare questa richiesta' });
    }

    const updated = await Friendship.update(req.params.id, { status: 'accepted' });
    res.json({ friendship: updated, message: 'Amicizia accettata' });
  } catch (error) {
    next(error);
  }
});

// Reject friend request
router.post('/v1/friendships/:id/reject', authenticateToken, async (req, res, next) => {
  try {
    const friendship = await Friendship.findById(req.params.id);
    if (!friendship) {
      return res.status(404).json({ error: 'Richiesta di amicizia non trovata' });
    }

    if (friendship.recipient !== req.user.id) {
      return res.status(403).json({ error: 'Non puoi rifiutare questa richiesta' });
    }

    await Friendship.softDelete(req.params.id);
    res.json({ message: 'Richiesta rifiutata' });
  } catch (error) {
    next(error);
  }
});

// ========== USER ENDPOINTS ==========

// Search users by username
router.get('/v1/users/search', async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query deve contenere almeno 2 caratteri' });
    }

    const users = await User.search(query);
    const sanitized = users.map(u => sanitizeUser(u));
    res.json({ users: sanitized });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/v1/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});

// Get user's blocked list
router.get('/v1/users/blocked/list', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const blockedIds = user.blockedUsers || [];
    
    const blockedUsers = [];
    for (const blockedId of blockedIds) {
      const blockedUser = await User.findById(blockedId);
      if (blockedUser) {
        blockedUsers.push(sanitizeUser(blockedUser));
      }
    }
    
    res.json({ blockedUsers });
  } catch (error) {
    next(error);
  }
});

// Block a user
router.post('/v1/users/:id/block', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    
    // Validate target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Non puoi bloccare te stesso' });
    }

    const user = await User.findById(req.user.id);
    const blockedUsers = user.blockedUsers || [];
    
    // Check if already blocked
    if (blockedUsers.includes(userId)) {
      return res.status(400).json({ error: 'Utente già bloccato' });
    }
    
    blockedUsers.push(userId);
    await User.update(req.user.id, { blockedUsers });

    res.json({ message: 'Utente bloccato' });
  } catch (error) {
    next(error);
  }
});

// Unblock a user
router.delete('/v1/users/:id/block', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    
    // Validate target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    
    const user = await User.findById(req.user.id);
    const blockedUsers = user.blockedUsers || [];
    
    // Check if user is actually blocked
    if (!blockedUsers.includes(userId)) {
      return res.status(400).json({ error: 'Utente non è bloccato' });
    }
    
    const updatedBlockedUsers = blockedUsers.filter(uid => uid !== userId);
    await User.update(req.user.id, { blockedUsers: updatedBlockedUsers });
    res.json({ message: 'Utente sbloccato' });
  } catch (error) {
    next(error);
  }
});

// ========== ROLES ENDPOINTS ==========

// Create role in community
router.post('/v1/communities/:communityId/roles', authenticateToken, async (req, res, next) => {
  try {
    const { name, color, permissions } = req.body;
    const community = await Community.findById(req.params.communityId);

    if (!community) {
      return res.status(404).json({ error: 'Comunità non trovata' });
    }

    if (community.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Solo l\'admin può creare ruoli' });
    }

    // In a real app, you'd create a Role model. For now, we update community roles
    const role = {
      id: Date.now(),
      name,
      color: color || '#00d4ff',
      permissions: permissions || [],
      members: []
    };

    const roles = community.roles || [];
    roles.push(role);
    await Community.update(req.params.communityId, { roles });

    res.status(201).json({ role });
  } catch (error) {
    next(error);
  }
});

// ========== COMMUNITY MEMBER MANAGEMENT ==========

// Kick member from community
router.post('/v1/communities/:communityId/members/:memberId/kick', authenticateToken, async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) {
      return res.status(404).json({ error: 'Comunità non trovata' });
    }

    if (community.adminId !== req.user.id) {
      return res.status(403).json({ error: 'Solo l\'admin può cacciare i membri' });
    }

    const memberId = parseInt(req.params.memberId);
    const members = (community.members || []).filter(m => parseInt(m) !== memberId);
    await Community.update(req.params.communityId, { members });

    res.json({ message: 'Membro rimosso dalla comunità' });
  } catch (error) {
    next(error);
  }
});

module.exports = { communityEndpointsRouter: router };
