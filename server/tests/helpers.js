// Shared by the integration tests (and the end-to-end tests' server).
// 1. A fake mailbox: a tiny SMTP server that keeps every email the app sends, in memory.
// 2. A fresh test database, g_link_test, built from database/all_in_one.sql, so your real data is never touched.
// 3. Staff accounts to sign in with: Super Admin, Admin, Incharge (password Password123!).
const fs = require('fs');
const path = require('path');
const { SMTPServer } = require('smtp-server');
const { simpleParser } = require('mailparser');

const TEST_DB = 'g_link_test';
const STAFF_PASSWORD = 'Password123!';
const STAFF = {
  superAdmin: { email: 'super@test.gl', role: 'Super Admin' },
  admin: { email: 'admin@test.gl', role: 'Admin' },
  incharge: { email: 'incharge@test.gl', role: 'Incharge' },
};

function startMailbox(port = 0) {
  const messages = [];
  const server = new SMTPServer({
    disabledCommands: ['STARTTLS'], // plain connection: only on this computer
    allowInsecureAuth: true,
    authOptional: true,
    onAuth(auth, session, cb) { cb(null, { user: auth.username }); },
    onData(stream, session, cb) {
      simpleParser(stream).then((m) => {
        messages.push({ to: m.to?.text || '', subject: m.subject || '', text: m.text || '' });
        cb();
      }, cb);
    },
    logger: false,
  });
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, messages, port: server.server.address().port }));
  });
}

// Points the app at the test database and the fake mailbox. Call BEFORE requiring anything from src/.
function useTestSettings(mailPort) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // DB_HOST / DB_USER / DB_PASSWORD from your .env
  Object.assign(process.env, {
    DB_NAME: TEST_DB,
    JWT_SECRET: 'test_only_secret',
    CLIENT_URL: process.env.TEST_CLIENT_URL || 'http://localhost:5173',
    SMTP_HOST: '127.0.0.1', SMTP_PORT: String(mailPort), SMTP_SECURE: 'false',
    SMTP_USER: 'test@test.gl', SMTP_PASS: 'test', MAIL_FROM: 'G-Link Test <test@test.gl>',
  });
}

// Drops and rebuilds g_link_test from all_in_one.sql, then adds the staff accounts.
async function resetTestDatabase() {
  const mysql = require('mysql2/promise');
  const bcrypt = require('bcryptjs');
  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'all_in_one.sql'), 'utf8')
    .replace(/CREATE DATABASE IF NOT EXISTS g_link\b/, `CREATE DATABASE IF NOT EXISTS ${TEST_DB}`)
    .replace(/USE g_link;/, `USE ${TEST_DB};`);
  const ssl = String(process.env.DB_SSL).toLowerCase() === 'true' ? { rejectUnauthorized: true } : undefined;
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', ssl, multipleStatements: true,
  });
  try {
    await conn.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await conn.query(sql);
    const hash = await bcrypt.hash(STAFF_PASSWORD, 10);
    for (const [key, s] of Object.entries(STAFF)) {
      await conn.query(
        `INSERT INTO ${TEST_DB}.users (first_name, last_name, email, email_verified, password, role) VALUES (?, 'Tester', ?, TRUE, ?, ?)`,
        [key, s.email, hash, s.role]
      );
    }
  } finally {
    await conn.end();
  }
}

// Waits for an email to that address whose subject matches.
async function waitForEmail(messages, to, subject, timeoutMs = 5000) {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const m = [...messages].reverse().find((x) => x.to.includes(to) && subject.test(x.subject));
    if (m) return m;
    if (Date.now() > end) throw new Error(`No email to ${to} matching ${subject}. Got: ${messages.map((x) => `${x.to}: ${x.subject}`).join(' | ')}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

const tokenFrom = (email) => decodeURIComponent(email.text.match(/token=([^\s]+)/)[1]);

module.exports = { TEST_DB, STAFF, STAFF_PASSWORD, startMailbox, useTestSettings, resetTestDatabase, waitForEmail, tokenFrom };
