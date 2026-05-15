const { getPool } = require('./connection');

const safeExecute = async (sql) => {
  try {
    await getPool().execute(sql);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};

/**
 * Applica piccole migrazioni idempotenti per mantenere lo schema compatibile
 * con le esigenze del frontend senza richiedere reset del DB.
 */
const applyMigrations = async () => {
  // username: allinea a max 30 caratteri (frontend)
  await safeExecute('ALTER TABLE users MODIFY username VARCHAR(30) NOT NULL');

  // profileImage: permette Data URL/base64 più lunghi rispetto a VARCHAR(255)
  // NB: TEXT/MEDIUMTEXT in MySQL spesso non supporta DEFAULT, quindi usiamo NULL.
  await safeExecute('ALTER TABLE users MODIFY profileImage MEDIUMTEXT NULL');

  // profileFrameStyle: allinea default a "none" (frontend)
  await safeExecute("ALTER TABLE users MODIFY profileFrameStyle VARCHAR(50) NOT NULL DEFAULT 'none'");
  await safeExecute("UPDATE users SET profileFrameStyle = 'none' WHERE profileFrameStyle = 'default'");
};

module.exports = { applyMigrations };
