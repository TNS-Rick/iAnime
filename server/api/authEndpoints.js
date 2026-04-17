const express = require('express');
const qrcode = require('qrcode');
const {
  authenticateToken,
  sanitizeUser,
  hashPassword,
  comparePassword,
  signUserToken,
  generateTwoFASecret,
  verifyTwoFACode,
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

    if (password.length < 8) {
      return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri' });
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
    const { email, password, twoFACode } = req.body;

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

    if (user.twoFAEnabled) {
      if (!user.twoFASecret) {
        return res.status(500).json({ error: '2FA configurato in modo non valido' });
      }

      if (!twoFACode) {
        return res.json({
          requiresTwoFA: true,
          method: user.twoFAMethod || 'app',
          message: 'Inserisci il codice 2FA per completare l\'accesso',
        });
      }

      const isValidTwoFA = verifyTwoFACode(user.twoFASecret, twoFACode);
      if (!isValidTwoFA) {
        return res.status(401).json({ error: 'Codice 2FA non valido' });
      }
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

// 2FA setup - generate a secret and QR code for authenticator apps
router.get('/v1/auth/2fa/setup', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const secret = generateTwoFASecret(`iAnime (${user.email})`);
    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      method: 'app',
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCodeDataUrl,
    });
  } catch (error) {
    next(error);
  }
});

// 2FA confirm - verify the code and persist the shared secret
router.post('/v1/auth/2fa/confirm', authenticateToken, async (req, res, next) => {
  try {
    const { secret, code } = req.body;

    if (!secret || !code) {
      return res.status(400).json({ error: 'Secret e codice 2FA sono obbligatori' });
    }

    if (!verifyTwoFACode(secret, code)) {
      return res.status(400).json({ error: 'Codice 2FA non valido' });
    }

    const updatedUser = await User.update(req.user.id, {
      twoFAEnabled: true,
      twoFAMethod: 'app',
      twoFASecret: secret,
    });

    res.json({
      message: '2FA attivato con successo',
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    next(error);
  }
});

// 2FA disable - confirm with password and current 2FA code if enabled
router.post('/v1/auth/2fa/disable', authenticateToken, async (req, res, next) => {
  try {
    const { password, twoFACode } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'La password corrente è obbligatoria' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Password non valida' });
    }

    if (user.twoFAEnabled && user.twoFASecret) {
      if (!twoFACode || !verifyTwoFACode(user.twoFASecret, twoFACode)) {
        return res.status(401).json({ error: 'Codice 2FA non valido' });
      }
    }

    const updatedUser = await User.update(req.user.id, {
      twoFAEnabled: false,
      twoFAMethod: null,
      twoFASecret: null,
    });

    res.json({
      message: '2FA disattivato con successo',
      user: sanitizeUser(updatedUser),
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
    const allowedUpdates = ['bio', 'profileImage', 'displayNameColor', 'theme', 'displayMode', 'language', 'colorblindMode', 'highContrast', 'textSize', 'audioInputDevice', 'audioOutputDevice', 'volume', 'twoFAEnabled', 'twoFAMethod', 'whoCanInvite', 'acceptStrangerMessages'];
    const updates = {};

    // Validation rules for specific fields
    const validThemes = ['dark', 'light', 'auto'];
    const validDisplayModes = ['dark', 'light'];
    const validColorblindModes = ['none', 'deuteranopia', 'protanopia', 'tritanopia'];

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        // Validate theme field
        if (field === 'theme' && !validThemes.includes(req.body[field])) {
          return res.status(400).json({ error: 'Theme non valido. Deve essere: dark, light, o auto' });
        }
        
        // Validate displayMode field
        if (field === 'displayMode' && !validDisplayModes.includes(req.body[field])) {
          return res.status(400).json({ error: 'Display mode non valido. Deve essere: dark o light' });
        }
        
        // Validate colorblindMode field
        if (field === 'colorblindMode' && !validColorblindModes.includes(req.body[field])) {
          return res.status(400).json({ error: 'Modalità daltonismo non valida' });
        }
        
        // Validate textSize (should be 0.5-2.0)
        if (field === 'textSize') {
          const size = parseFloat(req.body[field]);
          if (isNaN(size) || size < 0.5 || size > 2.0) {
            return res.status(400).json({ error: 'Dimensione testo deve essere tra 0.5 e 2.0' });
          }
        }
        
        // Validate volume (should be 0-100)
        if (field === 'volume') {
          const volume = parseInt(req.body[field]);
          if (isNaN(volume) || volume < 0 || volume > 100) {
            return res.status(400).json({ error: 'Volume deve essere tra 0 e 100' });
          }
        }
        
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

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri' });
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
