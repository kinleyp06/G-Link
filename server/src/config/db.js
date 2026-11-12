// MySQL connection pool. dateStrings keeps DATE values as 'YYYY-MM-DD' text (no timezone surprises).
const fs = require('fs');
const mysql = require('mysql2/promise');
const env = require('./env');

const { ssl, sslCa, ...db } = env.db;
// Local MySQL: no SSL. Shared online MySQL: encrypted, checked against the provider's certificate.
const sslOptions = ssl ? { rejectUnauthorized: true, ...(sslCa ? { ca: fs.readFileSync(sslCa, 'utf8') } : {}) } : undefined;

const pool = mysql.createPool({
  ...db,
  ssl: sslOptions,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
  decimalNumbers: true,
});

// Runs fn(conn) inside a transaction. Commits if fn succeeds, rolls back if it throws.
async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, withTransaction };
