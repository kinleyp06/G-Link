// /api/admin : Admin (and Super Admin) work
// bookings review, change rooms, international guests, stay extensions, hall bookings,
// guest houses & rooms, room blocks (VIP/official), rates, payments, dashboard.
const express = require('express');
const { pool, withTransaction } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/http');
const v = require('../utils/validate');
const { daysBetween, today } = require('../utils/dates');
const { requireAuth, requireRole } = require('../middleware/auth');
const { readRoomRequest, checkFitsRoom, cleanGuest } = require('../services/bookingRequest');
const { checkRoom, getRoom } = require('../services/availability');
const { priceRoom, priceExistingBooking, priceHall, insertPayment } = require('../services/pricing');
const { hallConflicts, getHall } = require('../services/hallRules');
const notify = require('../services/notify');

const router = express.Router();
router.use(requireAuth, requireRole('Admin'));

// ---------- helpers ----------
async function loadBooking(conn, id, lock = false) {
  const [rows] = await conn.query(
    `SELECT b.*, r.room_number FROM bookings b JOIN rooms r ON r.room_id = b.room_id
      WHERE b.booking_id = ? ${lock ? 'FOR UPDATE' : ''}`,
    [id]
  );
  if (!rows[0]) throw new HttpError(404, 'Booking not found.');
  return rows[0];
}

// Genders of everyone staying on a booking (used for same-gender sharing).
async function bookingGenders(conn, booking) {
  const [guests] = await conn.query('SELECT gender FROM booking_guests WHERE booking_id = ?', [booking.booking_id]);
  return booking.user_id ? [booking.gender, ...guests.map((g) => g.gender)] : guests.map((g) => g.gender);
}

// ---------- dashboard ----------
router.get('/dashboard', asyncHandler(async (req, res) => {
  const t = today();
  const one = async (sql, params = []) => (await pool.query(sql, params))[0][0];
  res.json({
    pending_bookings: (await one("SELECT COUNT(*) AS n FROM bookings WHERE booking_status = 'Pending'")).n,
    pending_extensions: (await one("SELECT COUNT(*) AS n FROM stay_extensions WHERE extension_status = 'Pending'")).n,
    pending_hall_bookings: (await one("SELECT COUNT(*) AS n FROM hall_bookings WHERE booking_status = 'Pending'")).n,
    arrivals_today: (await one("SELECT COUNT(*) AS n FROM bookings WHERE booking_status = 'Approved' AND check_in_date = ? AND checked_in_at IS NULL", [t])).n,
    in_house: (await one("SELECT COALESCE(SUM(number_of_guests),0) AS n FROM bookings WHERE booking_status = 'Approved' AND checked_in_at IS NOT NULL AND checked_out_at IS NULL")).n,
    rooms: (await one('SELECT COUNT(*) AS n, COALESCE(SUM(capacity),0) AS beds FROM rooms')),
    unpaid: (await one("SELECT COUNT(*) AS n, COALESCE(SUM(total_amount),0) AS total FROM payments WHERE payment_status = 'Unpaid'")),
    active_blocks: (await one('SELECT COUNT(*) AS n FROM room_blocks WHERE end_date > ?', [t])).n,
  });
}));

// ---------- room bookings ----------
router.get('/bookings', asyncHandler(async (req, res) => {
  const params = [];
  let where = '1=1';
  if (req.query.status) { where += ' AND b.booking_status = ?'; params.push(req.query.status); }
  const [rows] = await pool.query(
    `SELECT b.*, r.room_number, g.guesthouse_name,
            COALESCE(CONCAT(u.first_name, ' ', u.last_name),
                     (SELECT full_name FROM booking_guests bg WHERE bg.booking_id = b.booking_id ORDER BY guest_id LIMIT 1)) AS booker_name,
            u.email AS booker_email
       FROM bookings b JOIN rooms r ON r.room_id = b.room_id
       JOIN guest_houses g ON g.guesthouse_id = r.guesthouse_id
       LEFT JOIN users u ON u.user_id = b.user_id
      WHERE ${where} ORDER BY b.booking_date DESC LIMIT 300`,
    params
  );
  res.json({ bookings: rows });
}));

// Full details. Contact details of sharing guests are visible here (administration only).
router.get('/bookings/:id', asyncHandler(async (req, res) => {
  const b = await loadBooking(pool, req.params.id);
  const [[user]] = await pool.query(
    'SELECT user_id, first_name, last_name, email, phone_number, citizenship_id, gender, sid, department FROM users WHERE user_id = ?',
    [b.user_id || 0]
  );
  const [guests] = await pool.query('SELECT * FROM booking_guests WHERE booking_id = ?', [b.booking_id]);
  const [extensions] = await pool.query('SELECT * FROM stay_extensions WHERE booking_id = ?', [b.booking_id]);
  const [payments] = await pool.query('SELECT * FROM payments WHERE booking_id = ?', [b.booking_id]);
  const [sharing] = await pool.query(
    `SELECT rs.*, hb.booking_id AS host_id, gb.booking_id AS guest_id,
            CONCAT(hu.first_name,' ',hu.last_name) AS host_name, hu.phone_number AS host_phone, hu.email AS host_email,
            CONCAT(gu.first_name,' ',gu.last_name) AS guest_name, gu.phone_number AS guest_phone, gu.email AS guest_email
       FROM room_sharing rs
       JOIN bookings hb ON hb.booking_id = rs.host_booking_id LEFT JOIN users hu ON hu.user_id = hb.user_id
       JOIN bookings gb ON gb.booking_id = rs.guest_booking_id LEFT JOIN users gu ON gu.user_id = gb.user_id
      WHERE rs.host_booking_id = ? OR rs.guest_booking_id = ?`,
    [b.booking_id, b.booking_id]
  );
  res.json({ booking: b, user: user || null, guests, extensions, payments, sharing });
}));

router.post('/bookings/:id/approve', asyncHandler(async (req, res) => {
  const adminId = req.user.user_id;
  const { booking, bill } = await withTransaction(async (conn) => {
    const pre = await loadBooking(conn, req.params.id);
    const room = await getRoom(conn, pre.room_id, true);
    const b = await loadBooking(conn, req.params.id, true);
    if (b.booking_status !== 'Pending') throw new HttpError(400, `This booking is already ${b.booking_status}.`);
    const avail = await checkRoom(conn, room, {
      checkIn: b.check_in_date, checkOut: b.check_out_date, bookingType: b.booking_type,
      bedsNeeded: b.number_of_guests, genders: await bookingGenders(conn, b), excludeBookingId: b.booking_id,
    });
    if (!avail.available) throw new HttpError(409, `Cannot approve: ${avail.reason} Reject it or change the room.`);
    if (avail.shared) {
      const [links] = await conn.query('SELECT host_booking_id FROM room_sharing WHERE guest_booking_id = ?', [b.booking_id]);
      const linked = new Set(links.map((l) => l.host_booking_id));
      if (avail.hostBookingIds.some((id) => !linked.has(id))) {
        throw new HttpError(409, 'Another guest now occupies this room and this booker never confirmed the sharing notice. Change the room or reject.');
      }
    }
    const priced = await priceExistingBooking(conn, b, daysBetween(b.check_in_date, b.check_out_date));
    await conn.query(
      "UPDATE bookings SET booking_status = 'Approved', approved_by = ?, approval_date = NOW() WHERE booking_id = ?",
      [adminId, b.booking_id]
    );
    await insertPayment(conn, { bookingId: b.booking_id, description: 'Room charge', bill: priced });
    return { booking: { ...b, booking_status: 'Approved' }, bill: priced };
  });
  await notify.bookingOutcome(booking, bill);
  res.json({ message: 'Booking approved and bill created.', bill });
}));

router.post('/bookings/:id/reject', asyncHandler(async (req, res) => {
  const b = await loadBooking(pool, req.params.id);
  if (b.booking_status !== 'Pending') throw new HttpError(400, `This booking is already ${b.booking_status}.`);
  await pool.query(
    "UPDATE bookings SET booking_status = 'Rejected', approved_by = ?, approval_date = NOW() WHERE booking_id = ?",
    [req.user.user_id, b.booking_id]
  );
  await notify.bookingOutcome({ ...b, booking_status: 'Rejected' });
  res.json({ message: 'Booking rejected.' });
}));

// Change the room for someone (same dates). Moving into an occupied room needs confirm_sharing.
router.put('/bookings/:id/room', asyncHandler(async (req, res) => {
  const newRoomId = v.positiveInt(req.body.room_id, 'New room');
  const result = await withTransaction(async (conn) => {
    const b = await loadBooking(conn, req.params.id, true);
    if (!['Pending', 'Approved'].includes(b.booking_status) || b.checked_out_at) throw new HttpError(400, 'Only pending or approved bookings can be moved.');
    if (b.room_id === newRoomId) throw new HttpError(400, 'The booking is already in that room.');
    const room = await getRoom(conn, newRoomId, true);
    if (!room) throw new HttpError(404, 'Room not found.');
    if (b.number_of_guests > room.capacity) throw new HttpError(400, 'The group does not fit in that room.');
    const avail = await checkRoom(conn, room, {
      checkIn: b.check_in_date, checkOut: b.check_out_date, bookingType: b.booking_type,
      bedsNeeded: b.number_of_guests, genders: await bookingGenders(conn, b), excludeBookingId: b.booking_id,
    });
    if (!avail.available) throw new HttpError(409, avail.reason);
    if (avail.shared && !req.body.confirm_sharing) {
      throw new HttpError(409, `Room ${room.room_number} already has a guest who allows sharing. Confirm to move this booking in as a shared stay.`, 'SHARING_NOTICE');
    }
    await conn.query('DELETE FROM room_sharing WHERE guest_booking_id = ? OR host_booking_id = ?', [b.booking_id, b.booking_id]);
    await conn.query('UPDATE bookings SET room_id = ? WHERE booking_id = ?', [room.room_id, b.booking_id]);
    for (const hostId of avail.shared ? avail.hostBookingIds : []) {
      await conn.query('INSERT INTO room_sharing (host_booking_id, guest_booking_id, notice_acknowledged) VALUES (?, ?, FALSE)', [hostId, b.booking_id]);
    }
    return { b, room, hostIds: avail.shared ? avail.hostBookingIds : [] };
  });
  await notify.roomChanged(result.b, result.room.room_number);
  if (result.hostIds.length) {
    const [[u]] = await pool.query('SELECT first_name FROM users WHERE user_id = ?', [result.b.user_id || 0]);
    const [[firstGuest]] = await pool.query('SELECT full_name FROM booking_guests WHERE booking_id = ? ORDER BY guest_id LIMIT 1', [result.b.booking_id]);
    for (const hostId of result.hostIds) {
      const [[host]] = await pool.query('SELECT * FROM bookings WHERE booking_id = ?', [hostId]);
      await notify.sharingNotice(host, {
        first_name: u?.first_name || (firstGuest?.full_name || 'Guest').split(' ')[0],
        gender: result.b.gender, check_in_date: result.b.check_in_date, check_out_date: result.b.check_out_date,
      });
      await pool.query('UPDATE room_sharing SET host_notified_at = NOW() WHERE host_booking_id = ? AND guest_booking_id = ?', [hostId, result.b.booking_id]);
    }
  }
  res.json({ message: `Booking moved to room ${result.room.room_number}.` });
}));

// Admin enters a booking for international guests. All guest details go in booking_guests.
// It is approved straight away and billed at the International rate.
router.post('/bookings/international', asyncHandler(async (req, res) => {
  const guestsRaw = Array.isArray(req.body.guests) ? req.body.guests : [];
  if (!guestsRaw.length) throw new HttpError(400, 'Enter the details of at least one guest.');
  const r = readRoomRequest({ ...req.body, guest_category: 'International', additional_guests: guestsRaw.slice(1) }, {
    bookerCategories: ['International'], guestCategories: ['International', 'RUB staff', 'Other national'], allowPastDates: true,
  });
  const main = cleanGuest({ ...guestsRaw[0], guest_category: 'International' }, 0, ['International'], r.checkIn, r.checkOut);
  const all = [main, ...r.extraGuests];
  const adminId = req.user.user_id;

  const out = await withTransaction(async (conn) => {
    const room = await getRoom(conn, r.roomId, true);
    checkFitsRoom(r, room);
    const avail = await checkRoom(conn, room, {
      checkIn: r.checkIn, checkOut: r.checkOut, bookingType: r.bookingType, bedsNeeded: r.numberOfGuests, genders: all.map((g) => g.gender),
    });
    if (!avail.available) throw new HttpError(409, avail.reason);
    if (avail.shared && !req.body.notice_acknowledged) {
      throw new HttpError(409, 'This room is already occupied; the stay will involve sharing. Confirm to continue.', 'SHARING_NOTICE');
    }
    const bill = await priceRoom(conn, { bookingType: r.bookingType, bookerCategory: 'International', extraGuests: r.extraGuests, nights: r.nights });
    const [ins] = await conn.query(
      `INSERT INTO bookings (user_id, created_by, room_id, booking_type, guest_category, gender, check_in_date, check_out_date,
                             purpose_of_visit, number_of_guests, allow_sharing, booking_status, approved_by, approval_date)
       VALUES (NULL, ?, ?, ?, 'International', ?, ?, ?, ?, ?, FALSE, 'Approved', ?, NOW())`,
      [adminId, room.room_id, r.bookingType, main.gender, r.checkIn, r.checkOut, r.purpose, r.numberOfGuests, adminId]
    );
    const bookingId = ins.insertId;
    for (const g of all) {
      await conn.query(
        `INSERT INTO booking_guests (booking_id, full_name, gender, contact_number, citizenship_id, staff_id, guest_category, arrival_date, departure_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bookingId, g.full_name, g.gender, g.contact_number, g.citizenship_id, g.staff_id, g.guest_category, r.checkIn, r.checkOut]
      );
    }
    for (const hostId of avail.shared ? avail.hostBookingIds : []) {
      await conn.query('INSERT INTO room_sharing (host_booking_id, guest_booking_id, notice_acknowledged) VALUES (?, ?, TRUE)', [hostId, bookingId]);
    }
    await insertPayment(conn, { bookingId, description: 'Room charge (international)', bill });
    return { bookingId, bill, hostIds: avail.shared ? avail.hostBookingIds : [] };
  });
  for (const hostId of out.hostIds) {
    const [[host]] = await pool.query('SELECT * FROM bookings WHERE booking_id = ?', [hostId]);
    await notify.sharingNotice(host, { first_name: main.full_name.split(' ')[0], gender: main.gender, check_in_date: r.checkIn, check_out_date: r.checkOut });
    await pool.query('UPDATE room_sharing SET host_notified_at = NOW() WHERE host_booking_id = ? AND guest_booking_id = ?', [hostId, out.bookingId]);
  }
  res.status(201).json({ message: `International booking #${out.bookingId} saved and approved.`, booking_id: out.bookingId, bill: out.bill });
}));

// ---------- stay extensions ----------
router.get('/extensions', asyncHandler(async (req, res) => {
  const status = req.query.status || 'Pending';
  const [rows] = await pool.query(
    `SELECT e.*, b.room_id, b.booking_type, b.number_of_guests, r.room_number,
            COALESCE(CONCAT(u.first_name,' ',u.last_name),
                     (SELECT full_name FROM booking_guests bg WHERE bg.booking_id = b.booking_id ORDER BY guest_id LIMIT 1)) AS booker_name
       FROM stay_extensions e JOIN bookings b ON b.booking_id = e.booking_id
       JOIN rooms r ON r.room_id = b.room_id LEFT JOIN users u ON u.user_id = b.user_id
      WHERE e.extension_status = ? ORDER BY e.requested_at DESC`,
    [status]
  );
  res.json({ extensions: rows });
}));

router.post('/extensions/:id/approve', asyncHandler(async (req, res) => {
  const adminId = req.user.user_id;
  const out = await withTransaction(async (conn) => {
    const [[ext]] = await conn.query('SELECT * FROM stay_extensions WHERE extension_id = ? FOR UPDATE', [req.params.id]);
    if (!ext) throw new HttpError(404, 'Extension request not found.');
    if (ext.extension_status !== 'Pending') throw new HttpError(400, `This request is already ${ext.extension_status}.`);
    const pre = await loadBooking(conn, ext.booking_id);
    const room = await getRoom(conn, pre.room_id, true);
    const b = await loadBooking(conn, ext.booking_id, true);
    if (b.booking_status !== 'Approved' || b.checked_out_at) throw new HttpError(400, 'The stay is no longer active.');
    if (b.check_out_date !== ext.previous_check_out_date) throw new HttpError(409, 'The check-out date changed since this request. Reject it and ask the guest to request again.');
    // Are the beds free for the extra nights?
    const avail = await checkRoom(conn, room, {
      checkIn: ext.previous_check_out_date, checkOut: ext.new_check_out_date, bookingType: b.booking_type,
      bedsNeeded: b.number_of_guests, genders: await bookingGenders(conn, b), excludeBookingId: b.booking_id,
    });
    if (!avail.available) throw new HttpError(409, `Beds are not free for the extra nights: ${avail.reason}`);
    const bill = await priceExistingBooking(conn, b, ext.extra_nights);
    await conn.query(
      'UPDATE bookings SET check_out_date = ?, extension_count = extension_count + 1 WHERE booking_id = ?',
      [ext.new_check_out_date, b.booking_id]
    );
    await conn.query('UPDATE booking_guests SET departure_date = ? WHERE booking_id = ?', [ext.new_check_out_date, b.booking_id]);
    await conn.query(
      "UPDATE stay_extensions SET extension_status = 'Approved', reviewed_by = ?, reviewed_at = NOW() WHERE extension_id = ?",
      [adminId, ext.extension_id]
    );
    await insertPayment(conn, { bookingId: b.booking_id, description: `Stay extension: ${ext.extra_nights} night(s)`, bill });
    return { b, ext: { ...ext, extension_status: 'Approved' }, bill };
  });
  await notify.extensionOutcome(out.b, out.ext, out.bill);
  res.json({ message: 'Extension approved. Check-out date updated and extra nights billed.', bill: out.bill });
}));

router.post('/extensions/:id/reject', asyncHandler(async (req, res) => {
  const [[ext]] = await pool.query('SELECT * FROM stay_extensions WHERE extension_id = ?', [req.params.id]);
  if (!ext) throw new HttpError(404, 'Extension request not found.');
  if (ext.extension_status !== 'Pending') throw new HttpError(400, `This request is already ${ext.extension_status}.`);
  await pool.query(
    "UPDATE stay_extensions SET extension_status = 'Rejected', reviewed_by = ?, reviewed_at = NOW() WHERE extension_id = ?",
    [req.user.user_id, ext.extension_id]
  );
  const b = await loadBooking(pool, ext.booking_id);
  await notify.extensionOutcome(b, { ...ext, extension_status: 'Rejected' });
  res.json({ message: 'Extension rejected. The original dates stay.' });
}));

// ---------- hall bookings ----------
router.get('/hall-bookings', asyncHandler(async (req, res) => {
  const params = [];
  let where = '1=1';
  if (req.query.status) { where += ' AND hb.booking_status = ?'; params.push(req.query.status); }
  const [rows] = await pool.query(
    `SELECT hb.*, h.hall_name, CONCAT(u.first_name,' ',u.last_name) AS booker_name, u.email AS booker_email, u.phone_number AS booker_phone
       FROM hall_bookings hb JOIN halls h ON h.hall_id = hb.hall_id JOIN users u ON u.user_id = hb.user_id
      WHERE ${where} ORDER BY hb.booking_date DESC LIMIT 300`,
    params
  );
  res.json({ hall_bookings: rows });
}));

router.post('/hall-bookings/:id/approve', asyncHandler(async (req, res) => {
  const out = await withTransaction(async (conn) => {
    const [[pre]] = await conn.query('SELECT * FROM hall_bookings WHERE hall_booking_id = ?', [req.params.id]);
    if (!pre) throw new HttpError(404, 'Hall booking not found.');
    const hall = await getHall(conn, pre.hall_id, true);
    const [[hb]] = await conn.query('SELECT * FROM hall_bookings WHERE hall_booking_id = ? FOR UPDATE', [req.params.id]);
    if (hb.booking_status !== 'Pending') throw new HttpError(400, `This hall booking is already ${hb.booking_status}.`);
    if ((await hallConflicts(conn, hb.hall_id, hb.start_date, hb.end_date, hb.hall_booking_id)).length) {
      throw new HttpError(409, 'Another approved hall booking overlaps these days. Reject this one.');
    }
    const bill = priceHall(hall, daysBetween(hb.start_date, hb.end_date) + 1);
    await conn.query(
      "UPDATE hall_bookings SET booking_status = 'Approved', approved_by = ?, approval_date = NOW() WHERE hall_booking_id = ?",
      [req.user.user_id, hb.hall_booking_id]
    );
    await insertPayment(conn, { hallBookingId: hb.hall_booking_id, description: 'Hall charge', bill });
    return { hb: { ...hb, booking_status: 'Approved' }, bill };
  });
  await notify.hallOutcome(out.hb, out.bill);
  res.json({ message: 'Hall booking approved and bill created.', bill: out.bill });
}));

router.post('/hall-bookings/:id/reject', asyncHandler(async (req, res) => {
  const [[hb]] = await pool.query('SELECT * FROM hall_bookings WHERE hall_booking_id = ?', [req.params.id]);
  if (!hb) throw new HttpError(404, 'Hall booking not found.');
  if (hb.booking_status !== 'Pending') throw new HttpError(400, `This hall booking is already ${hb.booking_status}.`);
  await pool.query(
    "UPDATE hall_bookings SET booking_status = 'Rejected', approved_by = ?, approval_date = NOW() WHERE hall_booking_id = ?",
    [req.user.user_id, hb.hall_booking_id]
  );
  await notify.hallOutcome({ ...hb, booking_status: 'Rejected' });
  res.json({ message: 'Hall booking rejected.' });
}));

router.get('/halls', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM halls ORDER BY hall_id');
  res.json({ halls: rows });
}));

router.put('/halls/:id', asyncHandler(async (req, res) => {
  const b = req.body;
  v.required(b, ['hall_name', 'capacity', 'price_per_day', 'status']);
  v.maxLen(b.hall_name, 50, 'Hall name');
  v.oneOf(b.status, ['Available', 'Closed', 'Maintenance'], 'Status');
  const price = Number(b.price_per_day);
  if (!(price >= 0)) throw new HttpError(400, 'Price per day must be a number.');
  await pool.query('UPDATE halls SET hall_name = ?, capacity = ?, price_per_day = ?, status = ? WHERE hall_id = ?',
    [b.hall_name, v.positiveInt(b.capacity, 'Capacity'), price, b.status, req.params.id]);
  res.json({ message: 'Hall saved.' });
}));

// ---------- guest houses & rooms (manage room availability) ----------
router.get('/guesthouses', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM guest_houses ORDER BY guesthouse_name');
  res.json({ guesthouses: rows });
}));

function readGuestHouse(b) {
  v.required(b, ['guesthouse_name', 'location']);
  v.maxLen(b.guesthouse_name, 50, 'Name');
  v.maxLen(b.location, 50, 'Location');
  v.maxLen(b.contact_number, 20, 'Contact number');
  const status = b.status || 'Available';
  v.oneOf(status, ['Available', 'Closed', 'Maintenance'], 'Status');
  return [b.guesthouse_name.trim(), b.location.trim(), b.description || null, b.contact_number || null, status];
}

router.post('/guesthouses', asyncHandler(async (req, res) => {
  const [ins] = await pool.query(
    'INSERT INTO guest_houses (guesthouse_name, location, description, contact_number, status) VALUES (?, ?, ?, ?, ?)',
    readGuestHouse(req.body)
  );
  res.status(201).json({ message: 'Guest house added.', guesthouse_id: ins.insertId });
}));

router.put('/guesthouses/:id', asyncHandler(async (req, res) => {
  await pool.query(
    'UPDATE guest_houses SET guesthouse_name = ?, location = ?, description = ?, contact_number = ?, status = ? WHERE guesthouse_id = ?',
    [...readGuestHouse(req.body), req.params.id]
  );
  res.json({ message: 'Guest house saved.' });
}));

router.get('/rooms', asyncHandler(async (req, res) => {
  const params = [];
  let where = '1=1';
  if (req.query.guesthouse_id) { where += ' AND r.guesthouse_id = ?'; params.push(req.query.guesthouse_id); }
  const [rows] = await pool.query(
    `SELECT r.*, g.guesthouse_name FROM rooms r JOIN guest_houses g ON g.guesthouse_id = r.guesthouse_id
      WHERE ${where} ORDER BY g.guesthouse_name, r.room_number`,
    params
  );
  res.json({ rooms: rows });
}));

function readRoom(b) {
  v.required(b, ['guesthouse_id', 'room_number', 'room_type', 'capacity']);
  v.maxLen(b.room_number, 10, 'Room number');
  v.oneOf(b.room_type, ['Single', 'Double', 'Suite'], 'Room type');
  const status = b.room_status || 'Available';
  v.oneOf(status, ['Available', 'Occupied', 'Maintenance'], 'Room status');
  return [v.positiveInt(b.guesthouse_id, 'Guest house'), String(b.room_number).trim(), b.room_type, v.positiveInt(b.capacity, 'Capacity'), status, b.description || null];
}

router.post('/rooms', asyncHandler(async (req, res) => {
  const [ins] = await pool.query(
    'INSERT INTO rooms (guesthouse_id, room_number, room_type, capacity, room_status, description) VALUES (?, ?, ?, ?, ?, ?)',
    readRoom(req.body)
  );
  res.status(201).json({ message: 'Room added.', room_id: ins.insertId });
}));

router.put('/rooms/:id', asyncHandler(async (req, res) => {
  await pool.query(
    'UPDATE rooms SET guesthouse_id = ?, room_number = ?, room_type = ?, capacity = ?, room_status = ?, description = ? WHERE room_id = ?',
    [...readRoom(req.body), req.params.id]
  );
  res.json({ message: 'Room saved.' });
}));

// ---------- room blocks (VIP / official reservations: no booking is made) ----------
router.get('/blocks', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT bl.*, r.room_number, g.guesthouse_name, CONCAT(u.first_name,' ',u.last_name) AS blocked_by_name
       FROM room_blocks bl JOIN rooms r ON r.room_id = bl.room_id
       JOIN guest_houses g ON g.guesthouse_id = r.guesthouse_id JOIN users u ON u.user_id = bl.blocked_by
      WHERE bl.end_date >= ? ORDER BY bl.start_date`,
    [today()]
  );
  res.json({ blocks: rows });
}));

router.post('/blocks', asyncHandler(async (req, res) => {
  const b = req.body;
  v.required(b, ['room_id', 'beds_blocked', 'start_date', 'end_date', 'reason']);
  v.date(b.start_date, 'Start date');
  v.date(b.end_date, 'End date');
  if (b.end_date <= b.start_date) throw new HttpError(400, 'End date must be after start date (it works like a check-out date).');
  v.maxLen(b.reason, 100, 'Reason');
  const beds = v.positiveInt(b.beds_blocked, 'Beds to block');
  const id = await withTransaction(async (conn) => {
    const room = await getRoom(conn, v.positiveInt(b.room_id, 'Room'), true);
    if (!room) throw new HttpError(404, 'Room not found.');
    if (beds > room.capacity) throw new HttpError(400, `Room ${room.room_number} has only ${room.capacity} beds.`);
    const avail = await checkRoom(conn, room, { checkIn: b.start_date, checkOut: b.end_date, bookingType: 'Per Bed', bedsNeeded: beds });
    if (avail.bedsFree < beds) throw new HttpError(409, `Only ${avail.bedsFree} bed(s) are free in room ${room.room_number} for these dates.`);
    const [ins] = await conn.query(
      'INSERT INTO room_blocks (room_id, beds_blocked, start_date, end_date, reason, blocked_by) VALUES (?, ?, ?, ?, ?, ?)',
      [room.room_id, beds, b.start_date, b.end_date, b.reason.trim(), req.user.user_id]
    );
    return ins.insertId;
  });
  res.status(201).json({ message: 'Beds blocked.', block_id: id });
}));

router.delete('/blocks/:id', asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM room_blocks WHERE block_id = ?', [req.params.id]);
  res.json({ message: 'Block removed. The beds can be booked again.' });
}));

// ---------- rates (edit rate table: rates, GST) ----------
router.get('/rates', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT ra.*, CONCAT(u.first_name,' ',u.last_name) AS updated_by_name FROM rates ra
       LEFT JOIN users u ON u.user_id = ra.updated_by ORDER BY ra.rate_id`
  );
  res.json({ rates: rows });
}));

router.put('/rates/:id', asyncHandler(async (req, res) => {
  const { rate, gst_percent } = req.body;
  const rateVal = rate === null || rate === '' || rate === undefined ? null : Number(rate);
  if (rateVal !== null && !(rateVal >= 0)) throw new HttpError(400, 'Rate must be a number (or empty to leave it unset).');
  const gst = Number(gst_percent);
  if (!(gst >= 0 && gst < 100)) throw new HttpError(400, 'GST % must be between 0 and 99.99.');
  await pool.query('UPDATE rates SET rate = ?, gst_percent = ?, updated_by = ? WHERE rate_id = ?', [rateVal, gst, req.user.user_id, req.params.id]);
  res.json({ message: 'Rate saved.' });
}));

// ---------- payments (record the bill and whether it was paid) ----------
router.get('/payments', asyncHandler(async (req, res) => {
  const params = [];
  let where = '1=1';
  if (req.query.status) { where += ' AND p.payment_status = ?'; params.push(req.query.status); }
  const [rows] = await pool.query(
    `SELECT p.*,
            COALESCE(CONCAT(bu.first_name,' ',bu.last_name),
                     (SELECT full_name FROM booking_guests bg WHERE bg.booking_id = p.booking_id ORDER BY guest_id LIMIT 1),
                     CONCAT(hu.first_name,' ',hu.last_name)) AS payer_name,
            r.room_number, h.hall_name
       FROM payments p
       LEFT JOIN bookings b ON b.booking_id = p.booking_id
       LEFT JOIN users bu ON bu.user_id = b.user_id
       LEFT JOIN rooms r ON r.room_id = b.room_id
       LEFT JOIN hall_bookings hb ON hb.hall_booking_id = p.hall_booking_id
       LEFT JOIN users hu ON hu.user_id = hb.user_id
       LEFT JOIN halls h ON h.hall_id = hb.hall_id
      WHERE ${where} ORDER BY p.payment_id DESC LIMIT 300`,
    params
  );
  res.json({ payments: rows });
}));

router.post('/payments/:id/paid', asyncHandler(async (req, res) => {
  await pool.query("UPDATE payments SET payment_status = 'Paid', paid_at = NOW(), recorded_by = ? WHERE payment_id = ?", [req.user.user_id, req.params.id]);
  res.json({ message: 'Marked as paid.' });
}));

router.post('/payments/:id/unpaid', asyncHandler(async (req, res) => {
  await pool.query("UPDATE payments SET payment_status = 'Unpaid', paid_at = NULL, recorded_by = ? WHERE payment_id = ?", [req.user.user_id, req.params.id]);
  res.json({ message: 'Marked as unpaid.' });
}));

module.exports = router;
