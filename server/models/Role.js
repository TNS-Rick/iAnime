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

const normalizeRole = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    permissions: parseJsonField(row.permissions),
    color: row.color || '#000000',
    members: parseJsonField(row.members),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
};

module.exports = {
  tableName: 'roles',
  primaryKey: 'id',

  async create(roleData) {
    const {
      name,
      permissions = [],
      color = '#000000',
      members = [],
    } = roleData;

    const sql = `
      INSERT INTO roles (name, permissions, color, members)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await execute(sql, [
      name,
      JSON.stringify(permissions),
      color,
      JSON.stringify(members),
    ]);

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await execute('SELECT * FROM roles WHERE id = ? AND deletedAt IS NULL LIMIT 1', [id]);
    return normalizeRole(rows[0]);
  },

  async findByName(name) {
    const [rows] = await execute('SELECT * FROM roles WHERE name = ? AND deletedAt IS NULL LIMIT 1', [name]);
    return normalizeRole(rows[0]);
  },

  async findAll(limit = 100, offset = 0) {
    const [rows] = await execute(
      'SELECT * FROM roles WHERE deletedAt IS NULL LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows.map(normalizeRole);
  },

  async update(id, updates) {
    const allowedFields = ['name', 'permissions', 'color', 'members'];
    
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;

      fields.push(`${key} = ?`);

      if (['permissions', 'members'].includes(key) && typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE roles SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    await execute(sql, [...values, id]);

    return this.findById(id);
  },

  async softDelete(id) {
    await execute('UPDATE roles SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  async delete(id) {
    await execute('DELETE FROM roles WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  normalizeRole,
};
