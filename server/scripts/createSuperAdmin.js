// Creates (or resets) the first Super Admin (ICT unit) from the SUPER_ADMIN_* values in .env.
// Run once after the database is set up:  npm run create-super-admin
const bcrypt = require('bcryptjs');
require('../src/config/env');
const { pool } = require('../src/config/db');

(async () => {
  const email = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || '';
  if (!email || password.length < 8) {
    console.error('Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD (8+ characters) in server/.env first.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (first_name, last_name, email, email_verified, password, role, status)
     VALUES (?, ?, ?, TRUE, ?, 'Super Admin', 'Active')
     ON DUPLICATE KEY UPDATE password = VALUES(password), role = 'Super Admin', status = 'Active', email_verified = TRUE`,
    [process.env.SUPER_ADMIN_FIRST_NAME || 'ICT', process.env.SUPER_ADMIN_LAST_NAME || 'Unit', email, hash]
  );
  console.log(`Super Admin ready: ${email}`);
  await pool.end();
})().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
