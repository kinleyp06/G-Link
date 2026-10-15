// Hall rules: one 25-seater hall, Nu. 5,000/day + GST. Days are counted inclusive
// (start 10 Oct, end 11 Oct = 2 days). A hall is taken if an APPROVED hall booking overlaps.
const { HttpError } = require('../utils/http');
const v = require('../utils/validate');
const { daysBetween, today } = require('../utils/dates');

function readHallRequest(body, { allowPast = false } = {}) {
  v.required(body, ['hall_id', 'start_date', 'end_date']);
  v.date(body.start_date, 'Start date');
  v.date(body.end_date, 'End date');
  if (body.end_date < body.start_date) throw new HttpError(400, 'End date cannot be before start date.');
  if (!allowPast && body.start_date < today()) throw new HttpError(400, 'Start date cannot be in the past.');
  const days = daysBetween(body.start_date, body.end_date) + 1;
  if (days > 14) throw new HttpError(400, 'A hall booking can be at most 14 days.');
  return { hallId: v.positiveInt(body.hall_id, 'Hall'), start: body.start_date, end: body.end_date, days };
}

async function hallConflicts(conn, hallId, start, end, excludeId = 0) {
  const [rows] = await conn.query(
    `SELECT hall_booking_id, start_date, end_date FROM hall_bookings
      WHERE hall_id = ? AND booking_status = 'Approved' AND start_date <= ? AND end_date >= ? AND hall_booking_id <> ?`,
    [hallId, end, start, excludeId]
  );
  return rows;
}

async function getHall(conn, hallId, lock = false) {
  const [rows] = await conn.query(`SELECT * FROM halls WHERE hall_id = ? ${lock ? 'FOR UPDATE' : ''}`, [hallId]);
  if (!rows[0]) throw new HttpError(404, 'Hall not found.');
  return rows[0];
}

module.exports = { readHallRequest, hallConflicts, getHall };
