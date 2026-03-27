const express = require('express');
const {
  authenticateToken,
  sanitizeUser,
  hashPassword,
  comparePassword,
  signUserToken,
} = require('./auth');
const { User } = require('../models');

const router = express.Router();

// Register endpoint
router.post('/v1/auth/register', async (req, res, next) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username sono obbligatori' });
    }

    // Check if user exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email già registrata' });
    }

    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username già preso' });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      email,
      password: hashedPassword,
      username,
    });

    const token = signUserToken(user);
    const sanitized = sanitizeUser(user);

    res.status(201).json({
      message: 'Utente registrato con successo',
      user: sanitized,
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Login endpoint
router.post('/v1/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatori' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const token = signUserToken(user);
    const sanitized = sanitizeUser(user);

    res.json({
      message: 'Login avvenuto con successo',
      user: sanitized,
      token,
    });
  } catch (error) {
    next(error);
  }
});

// Get current user profile
router.get('/v1/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }
    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put('/v1/auth/profile', authenticateToken, async (req, res, next) => {
  try {
    const allowedUpdates = ['bio', 'profileImage', 'displayNameColor', 'theme', 'language'];
    const updates = {};

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const updatedUser = await User.update(req.user.id, updates);
    res.json({ user: sanitizeUser(updatedUser) });
  } catch (error) {
    next(error);
  }
});

// Change password
router.post('/v1/auth/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Password attuali e nuove sono obbligatorie' });
    }

    const user = await User.findById(req.user.id);
    const passwordMatch = await comparePassword(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Password attuale non è corretta' });
    }

    const hashedPassword = await hashPassword(newPassword);
    await User.update(req.user.id, { password: hashedPassword });

    res.json({ message: 'Password modificata con successo' });
  } catch (error) {
    next(error);
  }
});

// Logout (client-side only, but we can invalidate tokens server-side if needed)
router.post('/v1/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout avvenuto con successo' });
});

module.exports = { authEndpointsRouter: router };
