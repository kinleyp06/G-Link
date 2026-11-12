// Unit tests: date helpers (nights between dates, valid dates).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isValidDate, daysBetween, addDays, eachNight } = require('../../src/utils/dates');

test('2 nights between 10 and 12 January', () => {
  assert.equal(daysBetween('2030-01-10', '2030-01-12'), 2);
});

test('nights are counted across the end of a month', () => {
  assert.equal(daysBetween('2030-01-30', '2030-02-02'), 3);
});

test('only real YYYY-MM-DD dates are valid', () => {
  assert.equal(isValidDate('2030-02-28'), true);
  assert.equal(isValidDate('2030-02-30'), false);
  assert.equal(isValidDate('10/01/2030'), false);
});

test('each night of a stay excludes the check-out day', () => {
  assert.deepEqual(eachNight('2030-01-10', '2030-01-12'), ['2030-01-10', '2030-01-11']);
  assert.equal(addDays('2030-12-31', 1), '2031-01-01');
});
