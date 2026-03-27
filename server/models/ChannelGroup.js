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

const normalizeChannelGroup = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    channels: parseJsonField(row.channels),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
};

module.exports = {
  tableName: 'channel_groups',
  primaryKey: 'id',

  async create(groupData) {
    const {
      name,
      channels = [],
    } = groupData;

    const sql = `
      INSERT INTO channel_groups (name, channels)
      VALUES (?, ?)
    `;

    const [result] = await execute(sql, [
      name,
      JSON.stringify(channels),
    ]);

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await execute('SELECT * FROM channel_groups WHERE id = ? AND deletedAt IS NULL LIMIT 1', [id]);
    return normalizeChannelGroup(rows[0]);
  },

  async findByName(name) {
    const [rows] = await execute('SELECT * FROM channel_groups WHERE name = ? AND deletedAt IS NULL LIMIT 1', [name]);
    return normalizeChannelGroup(rows[0]);
  },

  async findAll(limit = 100, offset = 0) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 100, 1000));
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    const [rows] = await execute(
      `SELECT * FROM channel_groups WHERE deletedAt IS NULL LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      []
    );
    return rows.map(normalizeChannelGroup);
  },

  async update(id, updates) {
    const allowedFields = ['name', 'channels'];
    
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;

      fields.push(`${key} = ?`);

      if (key === 'channels' && typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE channel_groups SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    await execute(sql, [...values, id]);

    return this.findById(id);
  },

  async softDelete(id) {
    await execute('UPDATE channel_groups SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  async delete(id) {
    await execute('DELETE FROM channel_groups WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  normalizeChannelGroup,
};
