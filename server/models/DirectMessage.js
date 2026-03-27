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

const normalizeDirectMessage = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    participants: parseJsonField(row.participants),
    messages: parseJsonField(row.messages),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
};

module.exports = {
  tableName: 'direct_messages',
  primaryKey: 'id',

  async create(dmData) {
    const {
      participants = [],
      messages = [],
    } = dmData;

    const sql = `
      INSERT INTO direct_messages (participants, messages)
      VALUES (?, ?)
    `;

    const [result] = await execute(sql, [
      JSON.stringify(participants),
      JSON.stringify(messages),
    ]);

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await execute(
      'SELECT * FROM direct_messages WHERE id = ? AND deletedAt IS NULL LIMIT 1',
      [id]
    );
    return normalizeDirectMessage(rows[0]);
  },

  async findByParticipants(userId1, userId2) {
    const [rows] = await execute(
      `SELECT * FROM direct_messages 
       WHERE (participants LIKE ? OR participants LIKE ?) 
       AND deletedAt IS NULL 
       LIMIT 1`,
      [`%"${userId1}"%`, `%"${userId2}"%`]
    );
    return normalizeDirectMessage(rows[0]);
  },

  async findByUser(userId, limit = 50, offset = 0) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    const [rows] = await execute(
      `SELECT * FROM direct_messages 
       WHERE participants LIKE ? 
       AND deletedAt IS NULL 
       LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      [`%"${userId}"%`]
    );
    return rows.map(normalizeDirectMessage);
  },

  async findAll(limit = 100, offset = 0) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 100, 1000));
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    const [rows] = await execute(
      `SELECT * FROM direct_messages WHERE deletedAt IS NULL LIMIT ${safeLimit} OFFSET ${safeOffset}`,
      []
    );
    return rows.map(normalizeDirectMessage);
  },

  async update(id, updates) {
    const allowedFields = ['participants', 'messages'];
    
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;

      fields.push(`${key} = ?`);

      if (typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE direct_messages SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    await execute(sql, [...values, id]);

    return this.findById(id);
  },

  async softDelete(id) {
    await execute('UPDATE direct_messages SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  async delete(id) {
    await execute('DELETE FROM direct_messages WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  normalizeDirectMessage,
};
