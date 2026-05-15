const express = require('express');
const qrcode = require('qrcode');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const {
  authenticateToken,
  sanitizeUser,
  hashPassword,
  comparePassword,
  signUserToken,
  generateTwoFASecret,
  parseTwoFAConfig,
  buildTwoFASecretPayload,
  verifyTwoFACode,
} = require('./auth');
const { User } = require('../models');

const router = express.Router();
const twoFAChallenges = new Map();

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const generateNumericCode = () => String(Math.floor(100000 + Math.random() * 900000));
const generateChallengeId = () => crypto.randomUUID();

const maskEmail = (email = '') => {
  const [localPart, domain] = String(email).split('@');
  if (!localPart || !domain) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] || '*'}*@${domain}`;
  }

  return `${localPart[0]}${'*'.repeat(Math.max(1, localPart.length - 2))}${localPart[localPart.length - 1]}@${domain}`;
};

const maskPhone = (phoneNumber = '') => {
  const clean = String(phoneNumber).replace(/\s+/g, '');
  if (clean.length <= 4) {
    return clean;
  }

  return `${'*'.repeat(clean.length - 4)}${clean.slice(-4)}`;
};

const cleanupChallenges = () => {
  const now = Date.now();
  for (const [challengeId, challenge] of twoFAChallenges.entries()) {
    if (!challenge || challenge.expiresAt < now) {
      twoFAChallenges.delete(challengeId);
    }
  }
};

const createChallenge = ({ userId, purpose, method, destination, phoneNumber = null }) => {
  cleanupChallenges();

  const challengeId = generateChallengeId();
  const code = generateNumericCode();
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;

  twoFAChallenges.set(challengeId, {
    userId,
    purpose,
    method,
    destination,
    phoneNumber,
    code,
    expiresAt,
  });

  return {
    challengeId,
    code,
    expiresAt,
    expiresInSeconds: Math.floor(CHALLENGE_TTL_MS / 1000),
  };
};

const getChallenge = (challengeId, expectedPurpose) => {
  cleanupChallenges();
  const challenge = twoFAChallenges.get(challengeId);

  if (!challenge || challenge.purpose !== expectedPurpose) {
    return null;
  }

  if (challenge.expiresAt < Date.now()) {
    twoFAChallenges.delete(challengeId);
    return null;
  }

  return challenge;
};

const consumeChallenge = (challengeId) => {
  twoFAChallenges.delete(challengeId);
};

const sendTwoFACode = async ({ method, destination, code }) => {
  const devPreview = process.env.NODE_ENV !== 'production' ? code : undefined;

  if (method === 'email') {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@ianime.local',
        to: destination,
        subject: 'Codice 2FA iAnime',
        text: `Il tuo codice di verifica e: ${code}`,
      });

      return { delivered: true, devPreview };
    }

    throw new Error(
      'Email 2FA non configurato: imposta SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM nel file .env del server'
    );
  }

  if (method === 'phone') {
    // SMS provider integration can be plugged in here (Twilio, MessageBird, etc.).
    console.log(`[2FA SMS DEBUG] codice per ${destination}: ${code}`);
    return { delivered: false, devPreview };
  }

  return { delivered: false, devPreview };
};

// Register endpoint
router.post('/v1/auth/register', async (req, res, next) => {
  try {
    const { email, password, username, publicKey } = req.body;

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
      publicKey: publicKey || null,
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
    const { email, password, twoFACode, challengeId } = req.body;

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
      const twoFAConfig = parseTwoFAConfig(user);
      const method = twoFAConfig.method || user.twoFAMethod || 'app';

      if (method === 'app' && !twoFAConfig.secret) {
        return res.status(500).json({ error: '2FA configurato in modo non valido' });
      }

      if (method === 'app') {
        if (!twoFACode) {
          return res.json({
            requiresTwoFA: true,
            method: 'app',
            message: 'Inserisci il codice 2FA per completare l\'accesso',
          });
        }

        const isValidTwoFA = verifyTwoFACode(twoFAConfig.secret, twoFACode);
        if (!isValidTwoFA) {
          return res.status(401).json({ error: 'Codice 2FA non valido' });
        }
      } else {
        const destination = method === 'email' ? user.email : twoFAConfig.phoneNumber;

        if (!destination) {
          return res.status(500).json({ error: 'Metodo 2FA configurato in modo non valido' });
        }

        if (!twoFACode || !challengeId) {
          const newChallenge = createChallenge({
            userId: user.id,
            purpose: 'login',
            method,
            destination,
            phoneNumber: twoFAConfig.phoneNumber,
          });

          const deliveryInfo = await sendTwoFACode({
            method,
            destination,
            code: newChallenge.code,
          });

          return res.json({
            requiresTwoFA: true,
            method,
            challengeId: newChallenge.challengeId,
            expiresInSeconds: newChallenge.expiresInSeconds,
            destinationMasked: method === 'email' ? maskEmail(destination) : maskPhone(destination),
            deliveryFallback: !deliveryInfo.delivered,
            ...(deliveryInfo.devPreview ? { devCodePreview: deliveryInfo.devPreview } : {}),
            message: `Inserisci il codice ${method === 'email' ? 'ricevuto via email' : 'ricevuto via SMS'} per completare l'accesso`,
          });
        }

        const challenge = getChallenge(challengeId, 'login');
        if (!challenge || challenge.userId !== user.id || challenge.method !== method) {
          return res.status(401).json({ error: 'Challenge 2FA non valido o scaduto' });
        }

        if (String(challenge.code) !== String(twoFACode).trim()) {
          return res.status(401).json({ error: 'Codice 2FA non valido' });
        }

        consumeChallenge(challengeId);
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

// Start 2FA setup for app/email/phone.
router.post('/v1/auth/2fa/setup/start', authenticateToken, async (req, res, next) => {
  try {
    const { method, phoneNumber } = req.body;
    const selectedMethod = String(method || '').toLowerCase();

    if (!['app', 'email', 'phone'].includes(selectedMethod)) {
      return res.status(400).json({ error: 'Metodo 2FA non valido. Usa app, email o phone' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    if (selectedMethod === 'app') {
      const secret = generateTwoFASecret(`iAnime (${user.email})`);
      const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

      return res.json({
        method: 'app',
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url,
        qrCodeDataUrl,
      });
    }

    if (selectedMethod === 'phone' && !String(phoneNumber || '').trim()) {
      return res.status(400).json({ error: 'Inserisci un numero di telefono valido' });
    }

    const destination = selectedMethod === 'email' ? user.email : String(phoneNumber || '').trim();
    const newChallenge = createChallenge({
      userId: user.id,
      purpose: 'setup',
      method: selectedMethod,
      destination,
      phoneNumber: selectedMethod === 'phone' ? destination : null,
    });

    let deliveryInfo;
    try {
      deliveryInfo = await sendTwoFACode({
        method: selectedMethod,
        destination,
        code: newChallenge.code,
      });
    } catch (mailError) {
      twoFAChallenges.delete(newChallenge.challengeId);
      return res.status(503).json({ error: mailError.message });
    }

    return res.json({
      method: selectedMethod,
      challengeId: newChallenge.challengeId,
      expiresInSeconds: newChallenge.expiresInSeconds,
      destinationMasked: selectedMethod === 'email' ? maskEmail(destination) : maskPhone(destination),
      deliveryFallback: !deliveryInfo.delivered,
      ...(deliveryInfo.devPreview ? { devCodePreview: deliveryInfo.devPreview } : {}),
      message: `Codice di verifica inviato tramite ${selectedMethod === 'email' ? 'email' : 'SMS'}`,
    });
  } catch (error) {
    next(error);
  }
});

// Confirm 2FA setup and persist configuration.
router.post('/v1/auth/2fa/setup/confirm', authenticateToken, async (req, res, next) => {
  try {
    const { method, secret, code, challengeId, phoneNumber } = req.body;
    const selectedMethod = String(method || '').toLowerCase();

    if (!['app', 'email', 'phone'].includes(selectedMethod)) {
      return res.status(400).json({ error: 'Metodo 2FA non valido. Usa app, email o phone' });
    }

    if (selectedMethod === 'app') {
      if (!secret || !code) {
        return res.status(400).json({ error: 'Secret e codice 2FA sono obbligatori' });
      }

      if (!verifyTwoFACode(secret, code)) {
        return res.status(400).json({ error: 'Codice 2FA non valido' });
      }

      const updatedUser = await User.update(req.user.id, {
        twoFAEnabled: true,
        twoFAMethod: 'app',
        twoFASecret: buildTwoFASecretPayload({ method: 'app', secret }),
      });

      return res.json({
        message: '2FA attivato con successo',
        user: sanitizeUser(updatedUser),
      });
    }

    if (!challengeId || !code) {
      return res.status(400).json({ error: 'Challenge e codice 2FA sono obbligatori' });
    }

    const challenge = getChallenge(challengeId, 'setup');
    if (!challenge || challenge.userId !== req.user.id || challenge.method !== selectedMethod) {
      return res.status(400).json({ error: 'Challenge 2FA non valido o scaduto' });
    }

    if (String(challenge.code) !== String(code).trim()) {
      return res.status(400).json({ error: 'Codice 2FA non valido' });
    }

    consumeChallenge(challengeId);

    const resolvedPhone = selectedMethod === 'phone'
      ? String(phoneNumber || challenge.phoneNumber || '').trim()
      : null;

    const updatedUser = await User.update(req.user.id, {
      twoFAEnabled: true,
      twoFAMethod: selectedMethod,
      twoFASecret: buildTwoFASecretPayload({
        method: selectedMethod,
        secret: null,
        phoneNumber: resolvedPhone,
      }),
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
    const { password, twoFACode, challengeId } = req.body;

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

    if (user.twoFAEnabled) {
      const twoFAConfig = parseTwoFAConfig(user);
      const method = twoFAConfig.method || user.twoFAMethod || 'app';

      if (method === 'app') {
        if (!twoFACode || !verifyTwoFACode(twoFAConfig.secret, twoFACode)) {
          return res.status(401).json({ error: 'Codice 2FA non valido' });
        }
      } else {
        const destination = method === 'email' ? user.email : twoFAConfig.phoneNumber;
        if (!destination) {
          return res.status(500).json({ error: 'Metodo 2FA configurato in modo non valido' });
        }

        if (!challengeId || !twoFACode) {
          const newChallenge = createChallenge({
            userId: user.id,
            purpose: 'disable',
            method,
            destination,
            phoneNumber: twoFAConfig.phoneNumber,
          });

          let deliveryInfo;
          try {
            deliveryInfo = await sendTwoFACode({
              method,
              destination,
              code: newChallenge.code,
            });
          } catch (mailError) {
            twoFAChallenges.delete(newChallenge.challengeId);
            return res.status(503).json({ error: mailError.message });
          }

          return res.status(401).json({
            requiresTwoFA: true,
            method,
            challengeId: newChallenge.challengeId,
            expiresInSeconds: newChallenge.expiresInSeconds,
            destinationMasked: method === 'email' ? maskEmail(destination) : maskPhone(destination),
            deliveryFallback: !deliveryInfo.delivered,
            ...(deliveryInfo.devPreview ? { devCodePreview: deliveryInfo.devPreview } : {}),
            error: 'Inserisci il codice 2FA per completare la disattivazione',
          });
        }

        const challenge = getChallenge(challengeId, 'disable');
        if (!challenge || challenge.userId !== user.id || challenge.method !== method) {
          return res.status(401).json({ error: 'Challenge 2FA non valido o scaduto' });
        }

        if (String(challenge.code) !== String(twoFACode).trim()) {
          return res.status(401).json({ error: 'Codice 2FA non valido' });
        }

        consumeChallenge(challengeId);
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
    // Supporta sia le chiavi legacy che quelle usate dalla pagina /profile/settings.
    const body = {
      ...req.body,
      ...(req.body.avatar !== undefined ? { profileImage: req.body.avatar } : {}),
      ...(req.body.frame !== undefined ? { profileFrameStyle: req.body.frame } : {}),
    };

    const allowedUpdates = [
      'username',
      'bio',
      'profileImage',
      'profileFrameStyle',
      'displayNameColor',
      'theme',
      'displayMode',
      'language',
      'colorblindMode',
      'highContrast',
      'textSize',
      'audioInputDevice',
      'audioOutputDevice',
      'volume',
      'twoFAEnabled',
      'twoFAMethod',
      'whoCanInvite',
      'acceptStrangerMessages',
      'publicKey',
    ];

    const updates = {};

    // Validation rules for specific fields
    const validThemes = ['dark', 'light', 'auto'];
    const validDisplayModes = ['dark', 'light'];
    const validColorblindModes = ['normal', 'deuteranopia', 'protanopia', 'tritanopia'];

    const usernamePattern = /^[a-zA-Z0-9_-]+$/;
    const reservedUsernames = new Set(['admin', 'root', 'support', 'system', 'moderator', 'mod']);

    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        if (field === 'username') {
          const nextUsername = String(body.username || '').trim();

          if (nextUsername.length < 3 || nextUsername.length > 30) {
            return res.status(400).json({ error: 'Username deve avere tra 3 e 30 caratteri' });
          }

          if (!usernamePattern.test(nextUsername)) {
            return res.status(400).json({ error: 'Username non valido: usa solo lettere, numeri, _ e -' });
          }

          if (reservedUsernames.has(nextUsername.toLowerCase())) {
            return res.status(400).json({ error: 'Username non disponibile' });
          }

          const currentUser = await User.findById(req.user.id);
          if (!currentUser) {
            return res.status(404).json({ error: 'Utente non trovato' });
          }

          if (currentUser.username !== nextUsername) {
            const existing = await User.findByUsername(nextUsername);
            if (existing && existing.id !== currentUser.id) {
              return res.status(400).json({ error: 'Username già preso' });
            }

            updates.username = nextUsername;
            updates.lastUsernameChange = new Date();
          }

          continue;
        }

        // Validate theme field
        if (field === 'theme' && !validThemes.includes(body[field])) {
          return res.status(400).json({ error: 'Theme non valido. Deve essere: dark, light, o auto' });
        }
        
        // Validate displayMode field
        if (field === 'displayMode' && !validDisplayModes.includes(body[field])) {
          return res.status(400).json({ error: 'Display mode non valido. Deve essere: dark o light' });
        }
        
        // Validate colorblindMode field
        if (field === 'colorblindMode' && !validColorblindModes.includes(body[field])) {
          return res.status(400).json({ error: 'Modalità daltonismo non valida' });
        }
        
        // Validate textSize (should be 0.5-2.0)
        if (field === 'textSize') {
          const size = parseFloat(body[field]);
          if (isNaN(size) || size < 0.5 || size > 2.0) {
            return res.status(400).json({ error: 'Dimensione testo deve essere tra 0.5 e 2.0' });
          }
        }
        
        // Validate volume (should be 0-100)
        if (field === 'volume') {
          const volume = parseInt(body[field]);
          if (isNaN(volume) || volume < 0 || volume > 100) {
            return res.status(400).json({ error: 'Volume deve essere tra 0 e 100' });
          }
        }

        if (field === 'profileFrameStyle') {
          const nextFrame = String(body[field] || '').trim();
          if (!nextFrame) {
            updates[field] = 'none';
          } else if (nextFrame.length > 50) {
            return res.status(400).json({ error: 'Cornice profilo non valida' });
          } else {
            updates[field] = nextFrame;
          }
          continue;
        }

        if (field === 'profileImage') {
          const nextImage = body[field];
          if (nextImage === null || nextImage === '') {
            updates[field] = '';
          } else if (typeof nextImage !== 'string') {
            return res.status(400).json({ error: 'Immagine profilo non valida' });
          } else if (nextImage.length > 2_000_000) {
            // Guardrail: evita payload enormi (circa ~2MB di stringa)
            return res.status(400).json({ error: 'Immagine profilo troppo grande' });
          } else {
            updates[field] = nextImage;
          }
          continue;
        }
        
        updates[field] = body[field];
      }
    }

    const updatedUser = await User.update(req.user.id, updates);
    res.json({ user: sanitizeUser(updatedUser) });
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username già preso' });
    }
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
