// /api/halls and /api/hall-bookings : meeting hall booking (separate from room bookings)
const express = require('express');
const { pool } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/http');
const v = require('../utils/validate');
const { requireAuth } = require('../middleware/auth');
const { requireCompleteProfile } = require('../services/users');
const { readHallRequest, hallConflicts, getHall } = require('../services/hallRules');
const { priceHall } = require('../services/pricing');
const notify = require('../services/notify');

const router = express.Router();

router.get('/halls', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM halls ORDER BY hall_name');
  res.json({ halls: rows });
}));

// Shows if the hall is free and the fee (Nu. 5,000 per day + GST).
router.get('/halls/:id/availability', asyncHandler(async (req, res) => {
  const r = readHallRequest({ hall_id: req.params.id, ...req.query });
  const hall = await getHall(pool, r.hallId);
  const conflicts = await hallConflicts(pool, r.hallId, r.start, r.end);
  const open = hall.status === 'Available';
  res.json({
    available: open && conflicts.length === 0,
    reason: !open ? 'The hall is not open for booking right now.' : conflicts.length ? 'The hall is already booked on some of these days.' : '',
    days: r.days,
    bill: priceHall(hall, r.days),
  });
}));

router.post('/hall-bookings', requireAuth, asyncHandler(async (req, res) => {
  requireCompleteProfile(req.user);
  const r = readHallRequest(req.body);
  v.required(req.body, ['purpose', 'number_of_attendees']);
  v.maxLen(req.body.purpose, 255, 'Purpose');
  const attendees = v.positiveInt(req.body.number_of_attendees, 'Number of attendees');
  const hall = await getHall(pool, r.hallId);
  if (hall.status !== 'Available') throw new HttpError(409, 'The hall is not open for booking right now.');
  if (attendees > hall.capacity) throw new HttpError(400, `The hall seats up to ${hall.capacity} people.`);
  if ((await hallConflicts(pool, r.hallId, r.start, r.end)).length) throw new HttpError(409, 'The hall is already booked on some of these days.');

  const [ins] = await pool.query(
    `INSERT INTO hall_bookings (user_id, hall_id, start_date, end_date, purpose, number_of_attendees)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user.user_id, r.hallId, r.start, r.end, String(req.body.purpose).trim(), attendees]
  );
  const [[hb]] = await pool.query('SELECT * FROM hall_bookings WHERE hall_booking_id = ?', [ins.insertId]);
  await notify.hallSubmitted(hb);
  res.status(201).json({ message: 'Hall booking submitted. You will get an email when the admin decides.', hall_booking: hb, bill: priceHall(hall, r.days) });
}));

router.get('/hall-bookings/mine', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT hb.*, h.hall_name FROM hall_bookings hb JOIN halls h ON h.hall_id = hb.hall_id
      WHERE hb.user_id = ? ORDER BY hb.start_date DESC`,
    [req.user.user_id]
  );
  const ids = rows.map((r) => r.hall_booking_id);
  const [payments] = ids.length
    ? await pool.query('SELECT * FROM payments WHERE hall_booking_id IN (?)', [ids])
    : [[]];
  res.json({ hall_bookings: rows.map((r) => ({ ...r, payments: payments.filter((p) => p.hall_booking_id === r.hall_booking_id) })) });
}));

// Cancelling a hall booking never touches room bookings (and the other way round).
router.post('/hall-bookings/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const [[hb]] = await pool.query('SELECT * FROM hall_bookings WHERE hall_booking_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
  if (!hb) throw new HttpError(404, 'Hall booking not found.');
  if (!['Pending', 'Approved'].includes(hb.booking_status)) throw new HttpError(400, 'Only pending or approved hall bookings can be cancelled.');
  await pool.query("UPDATE hall_bookings SET booking_status = 'Cancelled' WHERE hall_booking_id = ?", [hb.hall_booking_id]);
  res.json({ message: 'Hall booking cancelled.' });
}));

module.exports = router;
