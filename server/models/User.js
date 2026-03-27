const { execute } = require('../db/connection');

const parseJsonField = (value) => {
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return value;
};

const toBoolean = (value) => Boolean(value);

const normalizeUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    username: row.username,
    bio: row.bio || '',
    profileImage: row.profileImage || '',
    displayNameColor: row.displayNameColor || '#000000',
    profileFrameStyle: row.profileFrameStyle || 'default',
    theme: row.theme || 'auto',
    displayMode: row.displayMode || 'light',
    language: row.language || 'it',
    notifications: parseJsonField(row.notifications),
    isPremium: toBoolean(row.isPremium),
    premiumExpiresAt: row.premiumExpiresAt,
    billingMethod: row.billingMethod,
    twoFAEnabled: toBoolean(row.twoFAEnabled),
    twoFAMethod: row.twoFAMethod,
    twoFASecret: row.twoFASecret,
    whoCanInvite: row.whoCanInvite || 'all',
    acceptStrangerMessages: toBoolean(row.acceptStrangerMessages),
    friendsList: parseJsonField(row.friendsList),
    blockedUsers: parseJsonField(row.blockedUsers),
    communities: parseJsonField(row.communities),
    colorblindMode: row.colorblindMode || 'normal',
    highContrast: toBoolean(row.highContrast),
    textSize: parseFloat(row.textSize) || 0.75,
    audioInputDevice: row.audioInputDevice || 'default',
    audioOutputDevice: row.audioOutputDevice || 'default',
    volume: row.volume || 80,
    lastUsernameChange: row.lastUsernameChange,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
};

module.exports = {
  tableName: 'users',
  primaryKey: 'id',

  async create(userData) {
    const {
      email,
      password,
      username,
      bio = '',
      profileImage = '',
      displayNameColor = '#000000',
      profileFrameStyle = 'default',
      theme = 'auto',
      displayMode = 'light',
      language = 'it',
      notifications = {},
      isPremium = false,
      premiumExpiresAt = null,
      billingMethod = null,
      twoFAEnabled = false,
      twoFAMethod = null,
      twoFASecret = null,
      whoCanInvite = 'all',
      acceptStrangerMessages = false,
      friendsList = [],
      blockedUsers = [],
      communities = [],
    } = userData;

    const sql = `
      INSERT INTO users (
        email, password, username, bio, profileImage, displayNameColor,
        profileFrameStyle, theme, displayMode, language, notifications,
        isPremium, premiumExpiresAt, billingMethod, twoFAEnabled, twoFAMethod,
        twoFASecret, whoCanInvite, acceptStrangerMessages, friendsList, blockedUsers, communities
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await execute(sql, [
      email,
      password,
      username,
      bio,
      profileImage,
      displayNameColor,
      profileFrameStyle,
      theme,
      displayMode,
      language,
      JSON.stringify(notifications),
      isPremium ? 1 : 0,
      premiumExpiresAt,
      billingMethod,
      twoFAEnabled ? 1 : 0,
      twoFAMethod,
      twoFASecret,
      whoCanInvite,
      acceptStrangerMessages ? 1 : 0,
      JSON.stringify(friendsList),
      JSON.stringify(blockedUsers),
      JSON.stringify(communities),
    ]);

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await execute('SELECT * FROM users WHERE id = ? AND deletedAt IS NULL LIMIT 1', [id]);
    return normalizeUser(rows[0]);
  },

  async findByEmail(email) {
    const [rows] = await execute('SELECT * FROM users WHERE email = ? AND deletedAt IS NULL LIMIT 1', [email]);
    return normalizeUser(rows[0]);
  },

  async findByUsername(username) {
    const [rows] = await execute('SELECT * FROM users WHERE username = ? AND deletedAt IS NULL LIMIT 1', [username]);
    return normalizeUser(rows[0]);
  },

  async findAll(limit = 100, offset = 0) {
    const [rows] = await execute(
      'SELECT * FROM users WHERE deletedAt IS NULL LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows.map(normalizeUser);
  },

  async update(id, updates) {
    const allowedFields = [
      'bio', 'profileImage', 'displayNameColor', 'profileFrameStyle',
      'theme', 'displayMode', 'language', 'notifications', 'isPremium',
      'premiumExpiresAt', 'billingMethod', 'twoFAEnabled', 'twoFAMethod',
      'twoFASecret', 'whoCanInvite', 'acceptStrangerMessages', 'friendsList',
      'blockedUsers', 'communities', 'colorblindMode', 'highContrast',
      'textSize', 'audioInputDevice', 'audioOutputDevice', 'volume',
    ];

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;

      fields.push(`${key} = ?`);

      if (typeof value === 'object' && !['isPremium', 'twoFAEnabled', 'acceptStrangerMessages', 'highContrast'].includes(key)) {
        values.push(JSON.stringify(value));
      } else if (typeof value === 'boolean') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE users SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    await execute(sql, [...values, id]);

    return this.findById(id);
  },

  async softDelete(id) {
    await execute('UPDATE users SET deletedAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  async delete(id) {
    await execute('DELETE FROM users WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  normalizeUser,
};
