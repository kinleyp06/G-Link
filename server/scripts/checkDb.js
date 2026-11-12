// Quick check that the server can reach MySQL, all 12 tables exist, and the latest columns are there:  npm run check-db
require('../src/config/env');
const { pool } = require('../src/config/db');

const TABLES = ['users', 'guest_houses', 'rooms', 'bookings', 'booking_guests', 'room_sharing',
  'stay_extensions', 'room_blocks', 'halls', 'hall_bookings', 'rates', 'payments'];

(async () => {
  const [rows] = await pool.query('SHOW TABLES');
  const found = rows.map((r) => Object.values(r)[0].toLowerCase());
  for (const t of TABLES) console.log(`${found.includes(t) ? 'OK     ' : 'MISSING'} ${t}`);
  if (found.includes('payments')) {
    const [cols] = await pool.query("SHOW COLUMNS FROM payments LIKE 'payment_method'");
    if (cols.length) console.log('OK      payments.payment_method');
    else console.log('MISSING payments.payment_method  -> run database/updates/01_add_payment_method.sql once');
  }
  if (found.includes('rooms')) {
    const [cols] = await pool.query("SHOW COLUMNS FROM rooms LIKE 'floor'");
    if (cols.length) console.log('OK      rooms.floor');
    else console.log('MISSING rooms.floor  -> run database/updates/04_real_rooms_floors_vip_suites.sql once');
  }
  await pool.end();
})().catch((err) => {
  console.error('Cannot connect to MySQL:', err.message);
  console.error('Check DB_HOST, DB_USER, DB_PASSWORD and DB_NAME in server/.env');
  process.exit(1);
});
