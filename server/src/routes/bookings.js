// /api/bookings : guest room bookings (book, quote, my bookings, cancel, request stay extension)
const express = require('express');
const { pool, withTransaction } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/http');
const v = require('../utils/validate');
const { daysBetween, today } = require('../utils/dates');
const { requireAuth } = require('../middleware/auth');
const { requireCompleteProfile, allowedCategories, allowedGuestCategories, isRubEmail, isProfileComplete } = require('../services/users');
const { readRoomRequest, checkFitsRoom, MAX_NIGHTS } = require('../services/bookingRequest');
const { checkRoom, getRoom } = require('../services/availability');
const { priceRoom } = require('../services/pricing');
const notify = require('../services/notify');

const router = express.Router();
router.use(requireAuth);

async function readGuestRequest(conn, user, body) {
  return readRoomRequest(body, {
    bookerCategories: await allowedCategories(conn, user),
    guestCategories: await allowedGuestCategories(conn),
  });
}

function gendersOf(user, reqData) {
  return [user.gender, ...reqData.extraGuests.map((g) => g.gender)];
}

// What the booking form may offer this user.
router.get('/options', asyncHandler(async (req, res) => {
  res.json({
    categories: await allowedCategories(pool, req.user),
    guest_categories: await allowedGuestCategories(pool),
    is_rub_email: isRubEmail(req.user.email),
    profile_complete: isProfileComplete(req.user),
    gender: req.user.gender,
    max_nights: MAX_NIGHTS,
  });
}));

// Check availability + bill before submitting (nothing is saved).
router.post('/quote', asyncHandler(async (req, res) => {
  requireCompleteProfile(req.user);
  const r = await readGuestRequest(pool, req.user, req.body);
  const room = await getRoom(pool, r.roomId);
  checkFitsRoom(r, room);
  const avail = await checkRoom(pool, room, {
    checkIn: r.checkIn, checkOut: r.checkOut, bookingType: r.bookingType, bedsNeeded: r.numberOfGuests, genders: gendersOf(req.user, r),
  });
  const bill = await priceRoom(pool, { bookingType: r.bookingType, bookerCategory: r.category, extraGuests: r.extraGuests, nights: r.nights });
  res.json({
    nights: r.nights,
    availability: { available: avail.available, reason: avail.reason, shared: avail.shared, beds_free: avail.bedsFree },
    bill,
  });
}));

// Submit a booking -> status Pending, admins emailed. Shared room -> notice must be confirmed.
router.post('/', asyncHandler(async (req, res) => {
  const user = req.user;
  requireCompleteProfile(user);
  const r = await readGuestRequest(pool, user, req.body);

  const { booking, bill, hostIds } = await withTransaction(async (conn) => {
    const room = await getRoom(conn, r.roomId, true); // locks the room row until commit
    checkFitsRoom(r, room);
    const avail = await checkRoom(conn, room, {
      checkIn: r.checkIn, checkOut: r.checkOut, bookingType: r.bookingType, bedsNeeded: r.numberOfGuests, genders: gendersOf(user, r),
    });
    if (!avail.available) throw new HttpError(409, avail.reason);
    if (avail.shared && !r.noticeAcknowledged) {
      throw new HttpError(409, 'This room is already occupied and your stay will involve sharing. Confirm the notice to continue.', 'SHARING_NOTICE');
    }
    const priced = await priceRoom(conn, { bookingType: r.bookingType, bookerCategory: r.category, extraGuests: r.extraGuests, nights: r.nights });

    const [ins] = await conn.query(
      `INSERT INTO bookings (user_id, room_id, booking_type, guest_category, gender, check_in_date, check_out_date,
                             purpose_of_visit, number_of_guests, allow_sharing)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.user_id, room.room_id, r.bookingType, r.category, user.gender, r.checkIn, r.checkOut, r.purpose, r.numberOfGuests, r.allowSharing]
    );
    const bookingId = ins.insertId;
    for (const g of r.extraGuests) {
      await conn.query(
        `INSERT INTO booking_guests (booking_id, full_name, gender, contact_number, citizenship_id, staff_id, guest_category, arrival_date, departure_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bookingId, g.full_name, g.gender, g.contact_number, g.citizenship_id, g.staff_id, g.guest_category, g.arrival_date, g.departure_date]
      );
    }
    for (const hostId of avail.shared ? avail.hostBookingIds : []) {
      await conn.query(
        'INSERT INTO room_sharing (host_booking_id, guest_booking_id, notice_acknowledged) VALUES (?, ?, TRUE)',
        [hostId, bookingId]
      );
    }
    const [rows] = await conn.query('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
    return { booking: { ...rows[0], room_number: room.room_number }, bill: priced, hostIds: avail.shared ? avail.hostBookingIds : [] };
  });

  // Emails after the booking is safely saved.
  await notify.bookingSubmitted(booking);
  for (const hostId of hostIds) {
    const [[host]] = await pool.query('SELECT * FROM bookings WHERE booking_id = ?', [hostId]);
    const sent = await notify.sharingNotice(host, { first_name: user.first_name, gender: user.gender, check_in_date: r.checkIn, check_out_date: r.checkOut });
    if (sent) {
      await pool.query('UPDATE room_sharing SET host_notified_at = NOW() WHERE host_booking_id = ? AND guest_booking_id = ?', [hostId, booking.booking_id]);
    }
  }
  res.status(201).json({ message: 'Booking submitted. You will get an email when the admin decides.', booking, bill });
}));

// My room bookings, with bills, extensions and sharing notes.
router.get('/mine', asyncHandler(async (req, res) => {
  const [bookings] = await pool.query(
    `SELECT b.*, r.room_number, g.guesthouse_name FROM bookings b
       JOIN rooms r ON r.room_id = b.room_id JOIN guest_houses g ON g.guesthouse_id = r.guesthouse_id
      WHERE b.user_id = ? ORDER BY b.check_in_date DESC, b.booking_id DESC`,
    [req.user.user_id]
  );
  if (!bookings.length) return res.json({ bookings: [] });
  const ids = bookings.map((b) => b.booking_id);

  const [guests] = await pool.query('SELECT * FROM booking_guests WHERE booking_id IN (?)', [ids]);
  const [payments] = await pool.query('SELECT * FROM payments WHERE booking_id IN (?) ORDER BY payment_id', [ids]);
  const [extensions] = await pool.query('SELECT * FROM stay_extensions WHERE booking_id IN (?) ORDER BY extension_id', [ids]);
  // People sharing MY room: only first name, gender and dates (contact details stay with the admin).
  const [sharers] = await pool.query(
    `SELECT rs.host_booking_id, u.first_name, sb.gender, sb.check_in_date, sb.check_out_date, sb.booking_status
       FROM room_sharing rs JOIN bookings sb ON sb.booking_id = rs.guest_booking_id
       LEFT JOIN users u ON u.user_id = sb.user_id
      WHERE rs.host_booking_id IN (?) AND sb.booking_status IN ('Pending','Approved')`,
    [ids]
  );
  const [joined] = await pool.query('SELECT guest_booking_id FROM room_sharing WHERE guest_booking_id IN (?)', [ids]);
  const joinedSet = new Set(joined.map((j) => j.guest_booking_id));

  res.json({
    bookings: bookings.map((b) => ({
      ...b,
      allow_sharing: !!b.allow_sharing,
      guests: guests.filter((g) => g.booking_id === b.booking_id),
      payments: payments.filter((p) => p.booking_id === b.booking_id),
      extensions: extensions.filter((e) => e.booking_id === b.booking_id),
      sharing_with: sharers.filter((s) => s.host_booking_id === b.booking_id),
      is_shared_stay: joinedSet.has(b.booking_id),
    })),
  });
}));

router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const [[b]] = await pool.query(
    'SELECT b.*, r.room_number FROM bookings b JOIN rooms r ON r.room_id = b.room_id WHERE b.booking_id = ? AND b.user_id = ?',
    [req.params.id, req.user.user_id]
  );
  if (!b) throw new HttpError(404, 'Booking not found.');
  if (!['Pending', 'Approved'].includes(b.booking_status) || b.checked_in_at) {
    throw new HttpError(400, 'Only pending or approved bookings that have not checked in can be cancelled.');
  }
  await pool.query("UPDATE bookings SET booking_status = 'Cancelled' WHERE booking_id = ?", [b.booking_id]);
  await pool.query("UPDATE stay_extensions SET extension_status = 'Rejected', reviewed_at = NOW() WHERE booking_id = ? AND extension_status = 'Pending'", [b.booking_id]);
  await notify.bookingCancelled(b);
  res.json({ message: 'Booking cancelled.' });
}));

// Request a stay extension (new check-out date). Admin reviews it.
router.post('/:id/extensions', asyncHandler(async (req, res) => {
  v.required(req.body, ['new_check_out_date']);
  v.date(req.body.new_check_out_date, 'New check-out date');
  const [[b]] = await pool.query(
    'SELECT b.*, r.room_number FROM bookings b JOIN rooms r ON r.room_id = b.room_id WHERE b.booking_id = ? AND b.user_id = ?',
    [req.params.id, req.user.user_id]
  );
  if (!b) throw new HttpError(404, 'Booking not found.');
  if (b.booking_status !== 'Approved' || b.checked_out_at) throw new HttpError(400, 'Only approved stays that have not checked out can be extended.');
  if (b.check_out_date < today()) throw new HttpError(400, 'This stay has already ended.');
  const newOut = req.body.new_check_out_date;
  if (newOut <= b.check_out_date) throw new HttpError(400, `Pick a date after your current check-out (${b.check_out_date}).`);
  const extra = daysBetween(b.check_out_date, newOut);
  if (extra > MAX_NIGHTS) throw new HttpError(400, `You can extend by at most ${MAX_NIGHTS} nights at a time.`);
  const [[pending]] = await pool.query(
    "SELECT COUNT(*) AS n FROM stay_extensions WHERE booking_id = ? AND extension_status = 'Pending'", [b.booking_id]
  );
  if (pending.n) throw new HttpError(409, 'You already have an extension request waiting for review.');

  const [ins] = await pool.query(
    'INSERT INTO stay_extensions (booking_id, previous_check_out_date, new_check_out_date, extra_nights) VALUES (?, ?, ?, ?)',
    [b.booking_id, b.check_out_date, newOut, extra]
  );
  const ext = { extension_id: ins.insertId, previous_check_out_date: b.check_out_date, new_check_out_date: newOut, extra_nights: extra };
  await notify.extensionRequested(b, ext);
  res.status(201).json({ message: 'Extension requested. You will get an email when the admin decides.', extension: ext });
}));

module.exports = router;
