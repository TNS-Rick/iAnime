const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const { execute } = require('../db/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const sanitizeUser = (user) => {
  if (!user) {
    return user;
  }

  const sanitized = { ...user };
  delete sanitized.password;
  delete sanitized.twoFASecret;
  return sanitized;
};

const signUserToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      id: user.id,
      email: user.email,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const hashPassword = async (password) => bcrypt.hash(password, 10);
const comparePassword = async (password, hashedPassword) => bcrypt.compare(password, hashedPassword);

const normalizeTwoFACode = (code) => String(code || '').replace(/\s+/g, '');

const verifyTwoFACode = (secret, code) => {
  if (!secret || !code) {
    return false;
  }

  return speakeasy.totp.verify({
    secret: String(secret).replace(/\s+/g, ''),
    encoding: 'base32',
    token: normalizeTwoFACode(code),
    window: 1,
  });
};

const generateTwoFASecret = (label) => {
  return speakeasy.generateSecret({
    name: label,
    length: 20,
  });
};

const getActiveUserById = async (id) => {
  const [rows] = await execute('SELECT * FROM users WHERE id = ? AND deletedAt IS NULL LIMIT 1', [id]);
  return rows[0] || null;
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Token JWT mancante o non valido' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getActiveUserById(payload.id);

    if (!user) {
      return res.status(401).json({ error: 'Utente associato al token non trovato' });
    }

    req.user = sanitizeUser(user);
    req.auth = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token JWT non valido', details: error.message });
  }
};

module.exports = {
  authenticateToken,
  comparePassword,
  generateTwoFASecret,
  getActiveUserById,
  hashPassword,
  sanitizeUser,
  signUserToken,
  verifyTwoFACode,
};
