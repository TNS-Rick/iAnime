const mysql = require('mysql2/promise');
const { schemaStatements, resetStatements } = require('./schema');

let isConnected = false;
let pool;

const getDbConfig = () => {
  return {
    database: 'ianime',
    username: 'root',
    password: 'root',
    host: 'localhost',
    port: 3306,
  };
};

const dbConfig = getDbConfig();

const ensureDatabaseExists = async () => {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.username,
    password: dbConfig.password,
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
  } finally {
    await connection.end();
  }
};

const createPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false,
      charset: 'utf8mb4',
    });
  }

  return pool;
};

const getPool = () => createPool();

const runStatements = async (connection, statements) => {
  for (const statement of statements) {
    await connection.query(statement);
  }
};

const runMigrations = async () => {
  const activePool = getPool();
  
  // Migration: Add publicKey column to users table if it doesn't exist
  try {
    const [columns] = await activePool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'users' 
       AND COLUMN_NAME = 'publicKey'`
    );
    
    if (!columns || columns.length === 0) {
      console.log('🔄 Adding missing publicKey column to users table...');
      await activePool.query(
        `ALTER TABLE users ADD COLUMN publicKey TEXT NULL AFTER twoFASecret`
      );
      console.log('✅ publicKey column added successfully');
    }
  } catch (error) {
    console.error('⚠️  Migration error (publicKey column):', error.message);
  }
};

const initSchema = async () => {
  const activePool = getPool();
  await runStatements(activePool, schemaStatements);
  await runMigrations();
};

const resetDatabase = async () => {
  const activePool = getPool();
  await runStatements(activePool, resetStatements);
  await runStatements(activePool, schemaStatements);
};

const query = async (sql, params = []) => {
  const activePool = getPool();
  return activePool.query(sql, params);
};

const execute = async (sql, params = []) => {
  const activePool = getPool();
  return activePool.execute(sql, params);
};

const connectDB = async () => {
  try {
    if (isConnected) {
      return getPool();
    }

    await ensureDatabaseExists();
    const activePool = getPool();
    const connection = await activePool.getConnection();

    try {
      await connection.ping();
    } finally {
      connection.release();
    }

    await initSchema();

    isConnected = true;
    console.log('✅ MySQL connesso con successo');
    return activePool;
  } catch (error) {
    const authMode = dbConfig.password ? 'YES' : 'NO';
    console.error(
      `❌ Errore connessione MySQL (${dbConfig.username}@${dbConfig.host}:${dbConfig.port}, password: ${authMode}):`,
      error.message
    );
    console.error(
      'ℹ️ Verifica che MySQL sia attivo su localhost:3306 e che le credenziali root/root siano valide.'
    );
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    if (!isConnected) {
      return;
    }

    await pool.end();
    pool = null;
    isConnected = false;
    console.log('✅ MySQL disconnesso');
  } catch (error) {
    console.error('❌ Errore disconnessione MySQL:', error.message);
  }
};

module.exports = { getPool, connectDB, disconnectDB, getDbConfig, initSchema, resetDatabase, query, execute };
