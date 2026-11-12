// Unit tests: meeting hall dates. Days count both ends; at most 14 days; no past dates.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readHallRequest } = require('../../src/services/hallRules');
const { addDays, today } = require('../../src/utils/dates');

const inDays = (n) => addDays(today(), n);

test('first and last day both count: 10 to 11 = 2 days', () => {
  assert.equal(readHallRequest({ hall_id: 1, start_date: inDays(10), end_date: inDays(11) }).days, 2);
});

test('the last day cannot be before the first day', () => {
  assert.throws(() => readHallRequest({ hall_id: 1, start_date: inDays(5), end_date: inDays(4) }), /before start/);
});

test('a hall booking can be at most 14 days', () => {
  assert.throws(() => readHallRequest({ hall_id: 1, start_date: inDays(1), end_date: inDays(15) }), /14 days/);
});
