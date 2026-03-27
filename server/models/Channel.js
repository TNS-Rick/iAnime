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

const normalizeChannel = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    type: row.type || 'text',
    hashtags: parseJsonField(row.hashtags),
    maxMembers: row.maxMembers || 10,
    permissions: parseJsonField(row.permissions),
    messages: parseJsonField(row.messages),
    members: parseJsonField(row.members),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
};

module.exports = {
  tableName: 'channels',
  primaryKey: 'id',

  async create(channelData) {
    const {
      name,
      type = 'text',
      hashtags = [],
      maxMembers = 10,
      permissions = [],
      messages = [],
      members = [],
    } = channelData;

    const sql = `
      INSERT INTO channels (name, type, hashtags, maxMembers, permissions, messages, members)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await execute(sql, [
      name,
      type,
      JSON.stringify(hashtags),
      maxMembers,
      JSON.stringify(permissions),
      JSON.stringify(messages),
      JSON.stringify(members),
    ]);

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await execute('SELECT * FROM channels WHERE id = ? AND deletedAt IS NULL LIMIT 1', [id]);
    return normalizeChannel(rows[0]);
  },

  async findByName(name) {
    const [rows] = await execute('SELECT * FROM channels WHERE name = ? AND deletedAt IS NULL LIMIT 1', [name]);
    return normalizeChannel(rows[0]);
  },

  async findByType(type, limit = 50, offset = 0) {
    const [rows] = await execute(
      'SELECT * FROM channels WHERE type = ? AND deletedAt IS NULL LIMIT ? OFFSET ?',
      [type, limit, offset]
    );
    return rows.map(normalizeChannel);
  },

  async findAll(limit = 100, offset = 0) {
    const [rows] = await execute(
      'SELECT * FROM channels WHERE deletedAt IS NULL LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows.map(normalizeChannel);
  },

  async update(id, updates) {
    const allowedFields = ['name', 'type', 'hashtags', 'maxMembers', 'permissions', 'messages', 'members'];
    
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;

      fields.push(`${key} = ?`);

      if (['hashtags', 'permissions', 'messages', 'members'].includes(key) && typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE channels SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    await execute(sql, [...values, id]);

    return this.findById(id);
  },

  async softDelete(id) {
    await execute('UPDATE channels SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  async delete(id) {
    await execute('DELETE FROM channels WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  normalizeChannel,
};
