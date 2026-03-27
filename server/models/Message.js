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

const normalizeMessage = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    content: row.content,
    authorId: row.authorId,
    channelId: row.channelId,
    dmSessionId: row.dmSessionId,
    timestamp: row.timestamp,
    isPinned: toBoolean(row.isPinned),
    reactions: parseJsonField(row.reactions),
    mentions: parseJsonField(row.mentions),
    deletedAt: row.deletedAt,
  };
};

module.exports = {
  tableName: 'messages',
  primaryKey: 'id',

  async create(messageData) {
    const {
      content,
      authorId,
      channelId = null,
      dmSessionId = null,
      isPinned = false,
      reactions = [],
      mentions = [],
    } = messageData;

    const sql = `
      INSERT INTO messages (
        content, authorId, channelId, dmSessionId, isPinned, reactions, mentions
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await execute(sql, [
      content,
      authorId,
      channelId,
      dmSessionId,
      isPinned ? 1 : 0,
      JSON.stringify(reactions),
      JSON.stringify(mentions),
    ]);

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await execute('SELECT * FROM messages WHERE id = ? AND deletedAt IS NULL LIMIT 1', [id]);
    return normalizeMessage(rows[0]);
  },

  async findByChannel(channelId, limit = 50, offset = 0) {
    const [rows] = await execute(
      `SELECT * FROM messages 
       WHERE channelId = ? AND deletedAt IS NULL 
       ORDER BY timestamp DESC 
       LIMIT ? OFFSET ?`,
      [channelId, limit, offset]
    );
    return rows.map(normalizeMessage);
  },

  async findByDmSession(dmSessionId, limit = 50, offset = 0) {
    const [rows] = await execute(
      `SELECT * FROM messages 
       WHERE dmSessionId = ? AND deletedAt IS NULL 
       ORDER BY timestamp DESC 
       LIMIT ? OFFSET ?`,
      [dmSessionId, limit, offset]
    );
    return rows.map(normalizeMessage);
  },

  async findByAuthor(authorId, limit = 50, offset = 0) {
    const [rows] = await execute(
      `SELECT * FROM messages 
       WHERE authorId = ? AND deletedAt IS NULL 
       ORDER BY timestamp DESC 
       LIMIT ? OFFSET ?`,
      [authorId, limit, offset]
    );
    return rows.map(normalizeMessage);
  },

  async update(id, updates) {
    const allowedFields = ['content', 'isPinned', 'reactions', 'mentions'];
    
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;

      fields.push(`${key} = ?`);

      if (['reactions', 'mentions'].includes(key) && typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else if (key === 'isPinned' && typeof value === 'boolean') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE messages SET ${fields.join(', ')} WHERE id = ?`;
    await execute(sql, [...values, id]);

    return this.findById(id);
  },

  async softDelete(id) {
    await execute('UPDATE messages SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  async delete(id) {
    await execute('DELETE FROM messages WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  normalizeMessage,
};
