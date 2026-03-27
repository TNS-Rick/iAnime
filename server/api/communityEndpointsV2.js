const express = require('express');
const { authenticateToken, sanitizeUser } = require('./auth');
const { Community, Channel, Message, User, Friendship } = require('../models');

const router = express.Router();

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
    if (members.includes(req.user.id)) {
      return res.status(400).json({ error: 'Sei già membro di questa comunità' });
    }

    members.push(req.user.id);
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

    const members = (community.members || []).filter(id => id !== req.user.id);
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
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const channels = await Channel.findAll(limit, offset);
    res.json({ channels: channels || [] });
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
    const { type, name } = req.body;

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

    res.status(201).json({ channel });
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
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const messages = await Message.findByChannel(req.params.id, limit, offset);
    res.json({ messages: messages || [] });
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

    res.status(201).json({ message });
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

module.exports = { communityEndpointsRouter: router };
