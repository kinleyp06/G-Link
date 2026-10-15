// Works out bills. Room: (rate x beds x nights) + GST. Hall: price_per_day x days + GST.
// The rate is picked automatically from the guest category. The booker pays for all guests.
const { HttpError } = require('../utils/http');
const env = require('../config/env');

const round2 = (n) => Math.round(n * 100) / 100;

async function getRate(conn, category, chargeType) {
  const [rows] = await conn.query(
    'SELECT rate, gst_percent FROM rates WHERE guest_category = ? AND charge_type = ?',
    [category, chargeType]
  );
  const row = rows[0];
  if (!row || row.rate === null) {
    throw new HttpError(400, `The ${chargeType.toLowerCase()} rate for ${category} guests has not been set yet. An admin must set it in Rates first.`);
  }
  return { rate: Number(row.rate), gst: Number(row.gst_percent) };
}

/**
 * Prices a room stay.
 * bookingType: 'Exclusive' | 'Per Bed' | 'Family/Group'
 * bookerCategory: category of the main guest
 * extraGuests: [{ guest_category, full_name }] - each takes one bed at their own per-bed rate
 *   (for Exclusive, these are extra people added by the Incharge at check-in)
 * nights: number of nights
 */
async function priceRoom(conn, { bookingType, bookerCategory, extraGuests = [], nights }) {
  const lines = [];
  let gstPercent;
  if (bookingType === 'Exclusive') {
    const r = await getRate(conn, bookerCategory, 'Exclusive Room');
    gstPercent = r.gst;
    lines.push({ label: `Exclusive room (${bookerCategory})`, rate: r.rate, beds: 1, nights, amount: round2(r.rate * nights) });
  } else {
    const r = await getRate(conn, bookerCategory, 'Per Bed');
    gstPercent = r.gst;
    lines.push({ label: `Bed - main guest (${bookerCategory})`, rate: r.rate, beds: 1, nights, amount: round2(r.rate * nights) });
  }
  for (const g of extraGuests) {
    const r = await getRate(conn, g.guest_category, 'Per Bed');
    lines.push({ label: `Bed - ${g.full_name || 'guest'} (${g.guest_category})`, rate: r.rate, beds: 1, nights, amount: round2(r.rate * nights) });
  }
  const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
  const gst_amount = round2((subtotal * gstPercent) / 100);
  return { lines, subtotal, gst_percent: gstPercent, gst_amount, total_amount: round2(subtotal + gst_amount) };
}

// Loads what is needed to price an existing booking (for approval, extensions).
async function priceExistingBooking(conn, booking, nights) {
  const [guests] = await conn.query(
    'SELECT full_name, guest_category FROM booking_guests WHERE booking_id = ? ORDER BY guest_id',
    [booking.booking_id]
  );
  // For admin-entered bookings (no user), the first guest row is the main guest.
  const extraGuests = booking.user_id ? guests : guests.slice(1);
  return priceRoom(conn, { bookingType: booking.booking_type, bookerCategory: booking.guest_category, extraGuests, nights });
}

function priceHall(hall, days) {
  const subtotal = round2(Number(hall.price_per_day) * days);
  const gst_amount = round2((subtotal * env.gstPercent) / 100);
  return {
    lines: [{ label: `${hall.hall_name}`, rate: Number(hall.price_per_day), days, amount: subtotal }],
    subtotal,
    gst_percent: env.gstPercent,
    gst_amount,
    total_amount: round2(subtotal + gst_amount),
  };
}

async function insertPayment(conn, { bookingId = null, hallBookingId = null, description, bill }) {
  const [res] = await conn.query(
    `INSERT INTO payments (booking_id, hall_booking_id, description, subtotal, gst_amount, total_amount)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [bookingId, hallBookingId, description, bill.subtotal, bill.gst_amount, bill.total_amount]
  );
  return res.insertId;
}

module.exports = { getRate, priceRoom, priceExistingBooking, priceHall, insertPayment, round2 };
