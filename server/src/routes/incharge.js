// /api/incharge : view bookings, check guests in and out (Admins and Super Admin can use it too)
const express = require('express');
const { pool, withTransaction } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/http');
const v = require('../utils/validate');
const { today, daysBetween } = require('../utils/dates');
const { requireAuth, requireRole } = require('../middleware/auth');
const { refreshRoomStatus } = require('../services/availability');
const { cleanGuest } = require('../services/bookingRequest');
const { priceRoom, insertPayment } = require('../services/pricing');
const notify = require('../services/notify');

const router = express.Router();
router.use(requireAuth, requireRole('Incharge', 'Admin'));

const BOOKING_SELECT = `
  SELECT b.*, r.room_number, r.capacity, g.guesthouse_name,
         COALESCE(CONCAT(u.first_name,' ',u.last_name),
                  (SELECT full_name FROM booking_guests bg WHERE bg.booking_id = b.booking_id ORDER BY guest_id LIMIT 1)) AS guest_name,
         u.phone_number AS guest_phone, u.sid AS guest_staff_id,
         (SELECT GROUP_CONCAT(CONCAT(bg.full_name, ': ', COALESCE(bg.staff_id, 'no staff ID')) SEPARATOR '; ')
            FROM booking_guests bg WHERE bg.booking_id = b.booking_id AND bg.guest_category = 'RUB') AS rub_guests,
         (SELECT COALESCE(SUM(p.total_amount), 0) FROM payments p
           WHERE p.booking_id = b.booking_id AND p.payment_status = 'Unpaid') AS amount_due
    FROM bookings b JOIN rooms r ON r.room_id = b.room_id
    JOIN guest_houses g ON g.guesthouse_id = r.guesthouse_id
    LEFT JOIN users u ON u.user_id = b.user_id`;

// Arrivals, guests in house, and departures for a day (default today).
router.get('/bookings', asyncHandler(async (req, res) => {
  const day = req.query.date || today();
  v.date(day, 'Date');
  const [arrivals] = await pool.query(
    `${BOOKING_SELECT} WHERE b.booking_status = 'Approved' AND b.checked_in_at IS NULL AND b.check_in_date <= ? AND b.check_out_date > ?
      ORDER BY r.room_number`, [day, day]
  );
  const [inHouse] = await pool.query(
    `${BOOKING_SELECT} WHERE b.booking_status = 'Approved' AND b.checked_in_at IS NOT NULL AND b.checked_out_at IS NULL
      ORDER BY b.check_out_date, r.room_number`
  );
  const [upcoming] = await pool.query(
    `${BOOKING_SELECT} WHERE b.booking_status = 'Approved' AND b.checked_in_at IS NULL AND b.check_in_date > ?
      ORDER BY b.check_in_date LIMIT 50`, [day]
  );
  res.json({ date: day, arrivals, in_house: inHouse, upcoming });
}));

async function loadForUpdate(conn, id) {
  const [[b]] = await conn.query(
    'SELECT b.*, r.capacity, r.room_number FROM bookings b JOIN rooms r ON r.room_id = b.room_id WHERE b.booking_id = ? FOR UPDATE',
    [id]
  );
  if (!b) throw new HttpError(404, 'Booking not found.');
  return b;
}

router.post('/bookings/:id/check-in', asyncHandler(async (req, res) => {
  const booked = await withTransaction(async (conn) => {
    const b = await loadForUpdate(conn, req.params.id);
    if (b.booking_status !== 'Approved') throw new HttpError(400, 'Only approved bookings can be checked in.');
    if (b.checked_in_at) throw new HttpError(400, 'This guest is already checked in.');
    if (b.check_in_date > today()) throw new HttpError(400, `Check-in opens on ${b.check_in_date}.`);
    await conn.query('UPDATE bookings SET checked_in_at = NOW(), checked_by = ? WHERE booking_id = ?', [req.user.user_id, b.booking_id]);
    await refreshRoomStatus(conn, b.room_id);
    return b;
  });
  const emailed = await notify.checkedIn(booked); // false for an international guest (no account)
  res.json({ message: emailed ? 'Guest checked in. They have been emailed.' : 'Guest checked in.' });
}));

// Extra people arrived on an exclusive booking: charge them per bed, or turn them away if no beds are free.
router.post('/bookings/:id/extra-guests', asyncHandler(async (req, res) => {
  const list = Array.isArray(req.body.guests) ? req.body.guests : [];
  if (!list.length) throw new HttpError(400, 'Add at least one extra person.');
  const out = await withTransaction(async (conn) => {
    const b = await loadForUpdate(conn, req.params.id);
    if (b.booking_type !== 'Exclusive') throw new HttpError(400, 'Extra people are only added this way on exclusive bookings.');
    if (b.booking_status !== 'Approved' || b.checked_out_at) throw new HttpError(400, 'The stay is not active.');
    const free = b.capacity - b.number_of_guests;
    if (list.length > free) throw new HttpError(409, `No beds free for ${list.length} more: only ${free} bed(s) left in room ${b.room_number}. Turn the extra people away.`);
    const from = b.check_in_date > today() ? b.check_in_date : today();
    const nights = Math.max(1, daysBetween(from, b.check_out_date));
    const guests = list.map((g, i) => cleanGuest(g, i, v.CATEGORIES, from, b.check_out_date));
    // Price only the extra beds: per-bed rate x beds x remaining nights + GST.
    const full = await priceRoom(conn, { bookingType: 'Exclusive', bookerCategory: b.guest_category, extraGuests: guests, nights });
    const extraLines = full.lines.slice(1);
    const subtotal = Math.round(extraLines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
    const gst = Math.round(subtotal * full.gst_percent) / 100;
    const bill = { lines: extraLines, subtotal, gst_percent: full.gst_percent, gst_amount: gst, total_amount: Math.round((subtotal + gst) * 100) / 100 };
    for (const g of guests) {
      await conn.query(
        `INSERT INTO booking_guests (booking_id, full_name, gender, contact_number, citizenship_id, staff_id, guest_category, arrival_date, departure_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [b.booking_id, g.full_name, g.gender, g.contact_number, g.citizenship_id, g.staff_id, g.guest_category, from, b.check_out_date]
      );
    }
    await conn.query('UPDATE bookings SET number_of_guests = number_of_guests + ? WHERE booking_id = ?', [guests.length, b.booking_id]);
    await insertPayment(conn, { bookingId: b.booking_id, description: `Extra people on exclusive booking (${guests.length})`, bill });
    return bill;
  });
  res.json({ message: 'Extra people added and billed per bed.', bill: out });
}));

// Check-out settles the stay: every unpaid bill on the booking is marked paid with the
// payment method the guest used (an online payment app or Cash), then the guest gets a receipt by email.
router.post('/bookings/:id/check-out', asyncHandler(async (req, res) => {
  const out = await withTransaction(async (conn) => {
    const b = await loadForUpdate(conn, req.params.id);
    if (!b.checked_in_at || b.checked_out_at) throw new HttpError(400, 'This guest is not checked in.');
    const [[due]] = await conn.query(
      "SELECT COUNT(*) AS n FROM payments WHERE booking_id = ? AND payment_status = 'Unpaid'", [b.booking_id]
    );
    if (due.n > 0) {
      v.oneOf(req.body.payment_method, v.PAYMENT_METHODS, 'Payment method');
      await conn.query(
        `UPDATE payments SET payment_status = 'Paid', paid_at = NOW(), payment_method = ?, recorded_by = ?
          WHERE booking_id = ? AND payment_status = 'Unpaid'`,
        [req.body.payment_method, req.user.user_id, b.booking_id]
      );
    }
    await conn.query(
      "UPDATE bookings SET checked_out_at = NOW(), checked_by = ?, booking_status = 'Completed' WHERE booking_id = ?",
      [req.user.user_id, b.booking_id]
    );
    await conn.query("UPDATE stay_extensions SET extension_status = 'Rejected', reviewed_at = NOW() WHERE booking_id = ? AND extension_status = 'Pending'", [b.booking_id]);
    await refreshRoomStatus(conn, b.room_id);
    const [payments] = await conn.query('SELECT * FROM payments WHERE booking_id = ? ORDER BY payment_id', [b.booking_id]);
    return { b, payments, paidNow: due.n > 0 };
  });
  const emailed = await notify.checkedOut(out.b, out.payments); // false for an international guest (no account)
  const paid = out.paidNow ? ` and paid by ${req.body.payment_method}` : '';
  res.json({ message: `Guest checked out${paid}. Booking completed${emailed ? '; a receipt was emailed' : ''}.` });
}));

// Guest never arrived.
router.post('/bookings/:id/no-show', asyncHandler(async (req, res) => {
  const missed = await withTransaction(async (conn) => {
    const b = await loadForUpdate(conn, req.params.id);
    if (b.booking_status !== 'Approved' || b.checked_in_at) throw new HttpError(400, 'Only approved bookings that never checked in can be marked as no-show.');
    await conn.query("UPDATE bookings SET booking_status = 'Cancelled', checked_by = ? WHERE booking_id = ?", [req.user.user_id, b.booking_id]);
    return b;
  });
  const emailed = await notify.bookingCancelled(missed, 'no-show');
  res.json({ message: `Marked as no-show. Booking cancelled${emailed ? ' and the guest emailed' : ''}.` });
}));

module.exports = router;
