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

const normalizeAnime = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    coverImage: row.coverImage || '',
    rating: parseFloat(row.rating) || 0,
    category: row.category || '',
    status: row.status || 'ongoing',
    jikanId: row.jikanId,
    anilistId: row.anilistId,
    kitsuId: row.kitsuId,
    platforms: parseJsonField(row.platforms),
    hashtags: parseJsonField(row.hashtags),
    followedByCount: row.followedByCount || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
};

module.exports = {
  tableName: 'animes',
  primaryKey: 'id',

  async create(animeData) {
    const {
      title,
      description = '',
      coverImage = '',
      rating = 0,
      category = '',
      status = 'ongoing',
      jikanId = null,
      anilistId = null,
      kitsuId = null,
      platforms = [],
      hashtags = [],
      followedByCount = 0,
    } = animeData;

    const sql = `
      INSERT INTO animes (
        title, description, coverImage, rating, category, status,
        jikanId, anilistId, kitsuId, platforms, hashtags, followedByCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await execute(sql, [
      title,
      description,
      coverImage,
      rating,
      category,
      status,
      jikanId,
      anilistId,
      kitsuId,
      JSON.stringify(platforms),
      JSON.stringify(hashtags),
      followedByCount,
    ]);

    return this.findById(result.insertId);
  },

  async findById(id) {
    const [rows] = await execute('SELECT * FROM animes WHERE id = ? AND deletedAt IS NULL LIMIT 1', [id]);
    return normalizeAnime(rows[0]);
  },

  async findByTitle(title) {
    const [rows] = await execute('SELECT * FROM animes WHERE title = ? AND deletedAt IS NULL LIMIT 1', [title]);
    return normalizeAnime(rows[0]);
  },

  async findByJikanId(jikanId) {
    const [rows] = await execute('SELECT * FROM animes WHERE jikanId = ? AND deletedAt IS NULL LIMIT 1', [jikanId]);
    return normalizeAnime(rows[0]);
  },

  async search(query, limit = 20, offset = 0) {
    const searchPattern = `%${query}%`;
    const [rows] = await execute(
      `SELECT * FROM animes 
       WHERE (title LIKE ? OR description LIKE ? OR hashtags LIKE ?)
       AND deletedAt IS NULL 
       LIMIT ? OFFSET ?`,
      [searchPattern, searchPattern, searchPattern, limit, offset]
    );
    return rows.map(normalizeAnime);
  },

  async findAll(limit = 100, offset = 0) {
    const [rows] = await execute(
      'SELECT * FROM animes WHERE deletedAt IS NULL LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows.map(normalizeAnime);
  },

  async update(id, updates) {
    const allowedFields = ['description', 'coverImage', 'rating', 'category', 'status', 'platforms', 'hashtags', 'followedByCount'];
    
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;

      fields.push(`${key} = ?`);

      if (['platforms', 'hashtags'].includes(key) && typeof value === 'object') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value);
      }
    }

    if (fields.length === 0) return this.findById(id);

    const sql = `UPDATE animes SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    await execute(sql, [...values, id]);

    return this.findById(id);
  },

  async softDelete(id) {
    await execute('UPDATE animes SET deletedAt = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  async delete(id) {
    await execute('DELETE FROM animes WHERE id = ?', [id]);
    return { id, deleted: true };
  },

  normalizeAnime,
};
