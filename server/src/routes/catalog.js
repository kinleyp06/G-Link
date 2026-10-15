// /api : browse guest houses, rooms, availability and rates (signed in or not)
const express = require('express');
const { pool } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/http');
const v = require('../utils/validate');
const { optionalAuth } = require('../middleware/auth');
const { checkRoom } = require('../services/availability');

const router = express.Router();

router.get('/guesthouses', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT g.*, COUNT(r.room_id) AS room_count, COALESCE(SUM(r.capacity), 0) AS bed_count
       FROM guest_houses g LEFT JOIN rooms r ON r.guesthouse_id = g.guesthouse_id
      GROUP BY g.guesthouse_id ORDER BY g.guesthouse_name`
  );
  res.json({ guesthouses: rows });
}));

router.get('/rates', asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT rate_id, guest_category, charge_type, rate, gst_percent FROM rates ORDER BY rate_id');
  res.json({ rates: rows });
}));

// Availability by date, per bed, for every room in a guest house.
router.get('/rooms/availability', optionalAuth, asyncHandler(async (req, res) => {
  const { guesthouse_id, check_in, check_out } = req.query;
  v.required(req.query, ['guesthouse_id', 'check_in', 'check_out']);
  v.date(check_in, 'Check-in date');
  v.date(check_out, 'Check-out date');
  if (check_out <= check_in) throw new HttpError(400, 'Check-out must be after check-in.');

  const [rooms] = await pool.query(
    `SELECT r.*, g.status AS gh_status, g.guesthouse_name FROM rooms r
       JOIN guest_houses g ON g.guesthouse_id = r.guesthouse_id
      WHERE r.guesthouse_id = ? ORDER BY r.room_number`,
    [guesthouse_id]
  );
  const myGender = req.user?.gender || null;
  const result = [];
  for (const room of rooms) {
    const bed = await checkRoom(pool, room, {
      checkIn: check_in, checkOut: check_out, bookingType: 'Per Bed', bedsNeeded: 1, genders: myGender ? [myGender] : null,
    });
    const exclusive = await checkRoom(pool, room, { checkIn: check_in, checkOut: check_out, bookingType: 'Exclusive' });
    let label;
    if (room.room_status === 'Maintenance' || room.gh_status !== 'Available') label = 'Not open for booking';
    else if (bed.bedsFree === 0) label = 'Full';
    else if (bed.shared && bed.sharingAllowed) label = `Shared room, ${bed.bedsFree} bed(s) available`;
    else if (bed.shared) label = 'Occupied (not shared)';
    else label = `${bed.bedsFree} bed(s) free`;

    result.push({
      room_id: room.room_id,
      room_number: room.room_number,
      room_type: room.room_type,
      capacity: room.capacity,
      room_status: room.room_status,
      description: room.description,
      beds_free: bed.bedsFree,
      shared: bed.shared && bed.sharingAllowed,
      occupant_gender: bed.shared && bed.sharingAllowed ? bed.occupantGender : null,
      bed_available_for_me: bed.available,
      exclusive_available: exclusive.available,
      reason: bed.available ? '' : bed.reason,
      label,
    });
  }
  res.json({ rooms: result });
}));

router.get('/rooms/:id', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, g.guesthouse_name, g.status AS guesthouse_status FROM rooms r
       JOIN guest_houses g ON g.guesthouse_id = r.guesthouse_id WHERE r.room_id = ?`,
    [req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Room not found.');
  res.json({ room: rows[0] });
}));

module.exports = router;
