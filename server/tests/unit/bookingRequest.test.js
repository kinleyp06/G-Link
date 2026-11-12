// Unit tests: the booking form rules (dates, length of stay, guests per booking type, room size).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readRoomRequest, checkFitsRoom, MAX_NIGHTS } = require('../../src/services/bookingRequest');
const { addDays, today } = require('../../src/utils/dates');

const inDays = (n) => addDays(today(), n);
const opts = { category: 'RUB', guestCategories: ['RUB', 'Non-RUB'] };
const form = (extra = {}) => ({
  room_id: 1, booking_type: 'Per Bed', check_in_date: inDays(3), check_out_date: inDays(5), purpose_of_visit: 'Workshop', ...extra,
});

test('a normal one-bed booking is read with 2 nights and the profile category', () => {
  const r = readRoomRequest(form(), opts);
  assert.equal(r.nights, 2);
  assert.equal(r.category, 'RUB');
  assert.equal(r.numberOfGuests, 1);
});

test('check-in cannot be in the past', () => {
  assert.throws(() => readRoomRequest(form({ check_in_date: inDays(-1) }), opts), /past/);
});

test(`a stay can be at most ${MAX_NIGHTS} nights`, () => {
  assert.throws(() => readRoomRequest(form({ check_out_date: inDays(3 + MAX_NIGHTS + 1) }), opts), /at most/);
});

test('family/group needs at least one more guest', () => {
  assert.throws(() => readRoomRequest(form({ booking_type: 'Family/Group' }), opts), /at least one more guest/);
});

test('a RUB family guest needs a staff ID', () => {
  const guests = [{ full_name: 'Karma', gender: 'Male', guest_category: 'RUB' }];
  assert.throws(() => readRoomRequest(form({ booking_type: 'Family/Group', additional_guests: guests }), opts), /staff ID/);
});

test('a whole-room booking is for one occupant only', () => {
  const guests = [{ full_name: 'Karma', gender: 'Male', guest_category: 'Non-RUB' }];
  assert.throws(() => readRoomRequest(form({ booking_type: 'Exclusive', additional_guests: guests }), opts), /one occupant/);
});

test('sharing is never allowed on a whole-room booking', () => {
  const r = readRoomRequest(form({ booking_type: 'Exclusive', allow_sharing: true }), opts);
  assert.equal(r.allowSharing, false);
});

test('a group bigger than the room is refused', () => {
  const r = { numberOfGuests: 4 };
  assert.throws(() => checkFitsRoom(r, { room_number: '1', capacity: 3 }), /3 beds/);
});
