// Bed availability rules (from the System Flow notes):
// - Rooms are 3-bedded; availability is per bed and per night.
// - beds free = capacity - beds in APPROVED bookings - blocked beds, for overlapping dates.
// - An Exclusive booking takes the whole room and is never shown as shared.
// - Free beds in an occupied room can be booked only if every occupant ticked allow_sharing
//   AND the new guests have the same gender as the occupant.
const { eachNight } = require('../utils/dates');

function bedsUsedBy(booking, capacity) {
  return booking.booking_type === 'Exclusive' ? capacity : booking.number_of_guests;
}

/**
 * room: row from rooms joined with guest house status (gh_status)
 * opts: { checkIn, checkOut, bookingType, bedsNeeded, genders (array or null), excludeBookingId }
 */
async function checkRoom(conn, room, opts) {
  const { checkIn, checkOut, bookingType = 'Per Bed', bedsNeeded = 1, genders = null, excludeBookingId = 0 } = opts;
  const capacity = room.capacity;

  const [occupants] = await conn.query(
    `SELECT booking_id, user_id, booking_type, number_of_guests, gender, allow_sharing, check_in_date, check_out_date
       FROM bookings
      WHERE room_id = ? AND booking_status = 'Approved'
        AND check_in_date < ? AND check_out_date > ? AND booking_id <> ?`,
    [room.room_id, checkOut, checkIn, excludeBookingId || 0]
  );
  const [blocks] = await conn.query(
    `SELECT beds_blocked, start_date, end_date FROM room_blocks
      WHERE room_id = ? AND start_date < ? AND end_date > ?`,
    [room.room_id, checkOut, checkIn]
  );

  // Busiest night decides how many beds are free for the whole stay.
  let maxUsed = 0;
  for (const night of eachNight(checkIn, checkOut)) {
    let used = 0;
    for (const b of occupants) if (b.check_in_date <= night && b.check_out_date > night) used += bedsUsedBy(b, capacity);
    for (const bl of blocks) if (bl.start_date <= night && bl.end_date > night) used += bl.beds_blocked;
    maxUsed = Math.max(maxUsed, used);
  }
  const bedsFree = Math.max(0, capacity - maxUsed);
  const shared = occupants.length > 0;
  const occupantGender = shared ? occupants[0].gender : null;
  const sharingAllowed = shared && occupants.every((b) => b.booking_type !== 'Exclusive' && b.allow_sharing);

  const result = {
    available: false,
    reason: '',
    capacity,
    bedsFree,
    shared,
    sharingAllowed,
    occupantGender,
    hostBookingIds: occupants.map((b) => b.booking_id),
    hosts: occupants,
  };

  if (room.room_status === 'Maintenance' || (room.gh_status && room.gh_status !== 'Available')) {
    result.reason = 'This room is not open for booking right now.';
    return result;
  }
  if (bookingType === 'Exclusive') {
    if (shared || bedsFree < capacity) {
      result.reason = 'An exclusive booking needs the whole room free for these dates.';
      return result;
    }
    result.available = true;
    return result;
  }
  if (bedsFree < bedsNeeded) {
    result.reason = bedsFree === 0 ? 'Room full: pick another room or other dates.' : `Only ${bedsFree} bed(s) free for these dates.`;
    return result;
  }
  if (shared && !sharingAllowed) {
    result.reason = 'This room is occupied and the occupant has not agreed to share.';
    return result;
  }
  if (shared && genders && genders.some((g) => g !== occupantGender)) {
    result.reason = `Free beds in this room can only be booked by ${occupantGender.toLowerCase()} guests. Pick another room.`;
    return result;
  }
  result.available = true;
  return result;
}

// Loads a room with its guest house status. Use lock=true inside a transaction to stop double booking.
async function getRoom(conn, roomId, lock = false) {
  const [rows] = await conn.query(
    `SELECT r.*, g.status AS gh_status, g.guesthouse_name
       FROM rooms r JOIN guest_houses g ON g.guesthouse_id = r.guesthouse_id
      WHERE r.room_id = ? ${lock ? 'FOR UPDATE' : ''}`,
    [roomId]
  );
  return rows[0] || null;
}

// Room status follows the latest booking action (check-in / check-out). Maintenance is never overwritten.
async function refreshRoomStatus(conn, roomId) {
  const [[{ inHouse }]] = await conn.query(
    `SELECT COUNT(*) AS inHouse FROM bookings
      WHERE room_id = ? AND booking_status = 'Approved' AND checked_in_at IS NOT NULL AND checked_out_at IS NULL`,
    [roomId]
  );
  await conn.query(
    `UPDATE rooms SET room_status = ? WHERE room_id = ? AND room_status <> 'Maintenance'`,
    [inHouse > 0 ? 'Occupied' : 'Available', roomId]
  );
}

module.exports = { checkRoom, getRoom, refreshRoomStatus };
