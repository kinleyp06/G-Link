// Quick check that the server can reach MySQL and all 12 tables exist:  npm run check-db
require('../src/config/env');
const { pool } = require('../src/config/db');

const TABLES = ['users', 'guest_houses', 'rooms', 'bookings', 'booking_guests', 'room_sharing',
  'stay_extensions', 'room_blocks', 'halls', 'hall_bookings', 'rates', 'payments'];

(async () => {
  const [rows] = await pool.query('SHOW TABLES');
  const found = rows.map((r) => Object.values(r)[0].toLowerCase());
  for (const t of TABLES) console.log(`${found.includes(t) ? 'OK     ' : 'MISSING'} ${t}`);
  await pool.end();
})().catch((err) => {
  console.error('Cannot connect to MySQL:', err.message);
  console.error('Check DB_HOST, DB_USER, DB_PASSWORD and DB_NAME in server/.env');
  process.exit(1);
});
