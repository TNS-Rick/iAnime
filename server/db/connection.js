require('dotenv').config();
const mysql = require('mysql2/promise');
const { schemaStatements, resetStatements } = require('./schema');

let isConnected = false;
let pool;

const getDbConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && !databaseUrl.startsWith('mongodb')) {
    const parsedUrl = new URL(databaseUrl);

    return {
      database: decodeURIComponent(parsedUrl.pathname.replace(/^\//, '')) || 'ianime',
      username: decodeURIComponent(parsedUrl.username || process.env.DB_USER || 'root'),
      password: decodeURIComponent(parsedUrl.password || process.env.DB_PASSWORD || ''),
      host: parsedUrl.hostname || process.env.DB_HOST || 'localhost',
      port: Number(parsedUrl.port || process.env.DB_PORT || 3306),
    };
  }

  return {
    database: process.env.DB_NAME || 'ianime',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
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

const initSchema = async () => {
  const activePool = getPool();
  await runStatements(activePool, schemaStatements);
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
    console.error('❌ Errore connessione MySQL:', error.message);
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
