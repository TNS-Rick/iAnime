const { execute } = require('../db/connection');

const normalizeFriendship = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    requester: row.requester,
    recipient: row.recipient,
    status: row.status || 'pending',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
};

module.exports = {
  tableName: 'friendships',
  primaryKey: 'id',

  async create(friendshipData) {
    const {
      requester,
      recipient,
      status = 'pending',
    } = friendshipData;

    const sql = `
      INSERT INTO friendships (requester, recipient, status)
      VALUES (?, ?, ?)
    `;

    const [result] = await execute(sql, [requester, recipient, status]);

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await execute('SELECT * FROM friendships WHERE id = ? AND deletedAt IS NULL LIMIT 1', [id]);
    return normalizeFriendship(rows[0]);
  },

  async findBetween(userId1, userId2) {
    const [rows] = await execute(
      `SELECT * FROM friendships 
       WHERE (requester = ? AND recipient = ?) OR (requester = ? AND recipient = ?)
       AND deletedAt IS NULL 
       LIMIT 1`,
      [userId1, userId2, userId2, userId1]
    );
    return normalizeFriendship(rows[0]);
  },

  async findByRequester(userId, status = null, limit = 50, offset = 0) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    let sql = 'SELECT * FROM friendships WHERE requester = ? AND deletedAt IS NULL';
    const params = [userId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [rows] = await execute(sql, params);
    return rows.map(normalizeFriendship);
  },

  async findByRecipient(userId, status = null, limit = 50, offset = 0) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    let sql = 'SELECT * FROM friendships WHERE recipient = ? AND deletedAt IS NULL';
    const params = [userId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [rows] = await execute(sql, params);
    return rows.map(normalizeFriendship);
  },

  async findByUser(userId, status = null, limit = 50, offset = 0) {
    const safeLimit = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const safeOffset = Math.max(0, parseInt(offset) || 0);
    let sql = `SELECT * FROM friendships 
               WHERE (requester = ? OR recipient = ?) 
               AND deletedAt IS NULL`;
    const params = [userId, userId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const [rows] = await execute(sql, params);
    return rows.map(normalizeFriendship);
  },

  async update(id, updates) {
    const allowedFields = ['status'];
    
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;
      fields.push(`${key} = ?`);
      values.push(value);
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE friendships SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    await execute(sql, [...values, id]);

    return this.findById(id);
  },

  async softDelete(id) {
    await execute('UPDATE friendships SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  async delete(id) {
    await execute('DELETE FROM friendships WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  normalizeFriendship,
};
