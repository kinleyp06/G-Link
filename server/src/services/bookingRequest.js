// Reads and checks the fields of a room booking form (used by guests and by admins).
const { HttpError } = require('../utils/http');
const v = require('../utils/validate');
const { daysBetween, today } = require('../utils/dates');

const MAX_NIGHTS = 30;

function cleanGuest(g, i, allowedCategories, checkIn, checkOut) {
  const label = `Guest ${i + 1}`;
  if (!g || !g.full_name || !String(g.full_name).trim()) throw new HttpError(400, `${label}: full name is required`);
  v.maxLen(g.full_name, 50, `${label} full name`);
  v.oneOf(g.gender, v.GENDERS, `${label} gender`);
  v.oneOf(g.guest_category, allowedCategories, `${label} category`);
  v.phone(g.contact_number, `${label} contact number`);
  v.maxLen(g.citizenship_id, 20, `${label} CID`);
  v.maxLen(g.staff_id, 20, `${label} staff ID`);
  if (g.guest_category === 'RUB staff' && !g.staff_id) throw new HttpError(400, `${label}: staff ID is needed for the RUB staff rate`);
  return {
    full_name: String(g.full_name).trim(),
    gender: g.gender,
    contact_number: g.contact_number ? String(g.contact_number) : null,
    citizenship_id: g.citizenship_id ? String(g.citizenship_id).trim() : null,
    staff_id: g.staff_id ? String(g.staff_id).trim() : null,
    guest_category: g.guest_category,
    arrival_date: checkIn,
    departure_date: checkOut,
  };
}

/**
 * Returns a clean request object or throws a 400 error.
 * opts.bookerCategories: categories the booker may choose
 * opts.guestCategories: categories allowed for additional guests
 * opts.allowPastDates: admins may enter bookings starting today or earlier for walk-ins
 */
function readRoomRequest(body, opts) {
  v.required(body, ['room_id', 'booking_type', 'check_in_date', 'check_out_date', 'purpose_of_visit']);
  const roomId = v.positiveInt(body.room_id, 'Room');
  v.oneOf(body.booking_type, v.BOOKING_TYPES, 'Booking type');
  v.date(body.check_in_date, 'Check-in date');
  v.date(body.check_out_date, 'Check-out date');
  v.maxLen(body.purpose_of_visit, 255, 'Purpose of visit');
  const checkIn = body.check_in_date;
  const checkOut = body.check_out_date;
  if (!opts.allowPastDates && checkIn < today()) throw new HttpError(400, 'Check-in date cannot be in the past.');
  const nights = daysBetween(checkIn, checkOut);
  if (nights < 1) throw new HttpError(400, 'Check-out must be at least one day after check-in.');
  if (nights > MAX_NIGHTS) throw new HttpError(400, `A booking can be at most ${MAX_NIGHTS} nights. Request an extension later if needed.`);

  let category = body.guest_category;
  if (opts.bookerCategories) v.oneOf(category, opts.bookerCategories, 'Guest category');

  const rawGuests = Array.isArray(body.additional_guests) ? body.additional_guests : [];
  const extraGuests = rawGuests.map((g, i) => cleanGuest(g, i, opts.guestCategories, checkIn, checkOut));
  const type = body.booking_type;
  if (type === 'Exclusive' && extraGuests.length) throw new HttpError(400, 'An exclusive booking is for one occupant only.');
  if (type === 'Per Bed' && extraGuests.length) throw new HttpError(400, 'A per-bed booking is for one bed. Choose Family/Group to bring more people.');
  if (type === 'Family/Group' && extraGuests.length < 1) throw new HttpError(400, 'Add at least one more guest for a Family/Group booking.');

  return {
    roomId,
    bookingType: type,
    category,
    checkIn,
    checkOut,
    nights,
    purpose: String(body.purpose_of_visit).trim(),
    allowSharing: type !== 'Exclusive' && !!body.allow_sharing,
    noticeAcknowledged: !!body.notice_acknowledged,
    extraGuests,
    numberOfGuests: type === 'Exclusive' ? 1 : 1 + extraGuests.length,
  };
}

// Checks the group fits in the room (3 beds).
function checkFitsRoom(reqData, room) {
  if (!room) throw new HttpError(404, 'Room not found.');
  if (reqData.numberOfGuests > room.capacity) {
    throw new HttpError(400, `Room ${room.room_number} has ${room.capacity} beds. Split a bigger group across rooms.`);
  }
}

module.exports = { readRoomRequest, checkFitsRoom, cleanGuest, MAX_NIGHTS };
