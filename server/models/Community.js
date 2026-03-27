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

const normalizeCommunity = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    adminId: row.adminId,
    roles: parseJsonField(row.roles),
    categories: parseJsonField(row.categories),
    channelGroups: parseJsonField(row.channelGroups),
    members: parseJsonField(row.members),
    pinnedMessages: parseJsonField(row.pinnedMessages),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
};

module.exports = {
  tableName: 'communities',
  primaryKey: 'id',

  async create(communityData) {
    const {
      name,
      description = '',
      adminId,
      roles = [],
      categories = [],
      channelGroups = [],
      members = [],
      pinnedMessages = [],
    } = communityData;

    const sql = `
      INSERT INTO communities (
        name, description, adminId, roles, categories, channelGroups, members, pinnedMessages
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await execute(sql, [
      name,
      description,
      adminId,
      JSON.stringify(roles),
      JSON.stringify(categories),
      JSON.stringify(channelGroups),
      JSON.stringify(members),
      JSON.stringify(pinnedMessages),
    ]);

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await execute(
      'SELECT * FROM communities WHERE id = ? AND deletedAt IS NULL LIMIT 1',
      [id]
    );
    return normalizeCommunity(rows[0]);
  },

  async findByAdmin(adminId, limit = 50, offset = 0) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    const [rows] = await execute(
      `SELECT * FROM communities WHERE adminId = ? AND deletedAt IS NULL LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [adminId]
    );
    return rows.map(normalizeCommunity);
  },

  async findByName(name, adminId) {
    const [rows] = await execute(
      'SELECT * FROM communities WHERE name = ? AND adminId = ? AND deletedAt IS NULL LIMIT 1',
      [name, adminId]
    );
    return normalizeCommunity(rows[0]);
  },

  async findAll(limit = 100, offset = 0) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 100, 1000));
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    const [rows] = await execute(
      `SELECT * FROM communities WHERE deletedAt IS NULL LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      []
    );
    return rows.map(normalizeCommunity);
  },

  async update(id, updates) {
    const allowedFields = ['name', 'description', 'roles', 'categories', 'channelGroups', 'members', 'pinnedMessages'];
    
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;

      fields.push(`${key} = ?`);

      if (['roles', 'categories', 'channelGroups', 'members', 'pinnedMessages'].includes(key) && typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE communities SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    await execute(sql, [...values, id]);

    return this.findById(id);
  },

  async softDelete(id) {
    await execute('UPDATE communities SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  async delete(id) {
    await execute('DELETE FROM communities WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  normalizeCommunity,
};
