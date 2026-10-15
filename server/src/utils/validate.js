// Small input-checking helpers. Each throws a 400 HttpError with a clear message.
const { HttpError } = require('./http');
const { isValidDate } = require('./dates');

const GENDERS = ['Male', 'Female', 'Other'];
const CATEGORIES = ['RUB staff', 'Other national', 'International'];
const BOOKING_TYPES = ['Exclusive', 'Per Bed', 'Family/Group'];

function required(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  if (missing.length) throw new HttpError(400, `Please fill in: ${missing.join(', ')}`);
}

function oneOf(value, list, label) {
  if (!list.includes(value)) throw new HttpError(400, `${label} must be one of: ${list.join(', ')}`);
}

function date(value, label) {
  if (!isValidDate(value)) throw new HttpError(400, `${label} must be a valid date (YYYY-MM-DD)`);
}

function maxLen(value, max, label) {
  if (value && String(value).length > max) throw new HttpError(400, `${label} can be at most ${max} characters`);
}

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function positiveInt(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${label} must be a whole number above 0`);
  return n;
}

function phone(value, label = 'Phone number') {
  if (value && !/^\d{8,11}$/.test(String(value))) throw new HttpError(400, `${label} must be 8 to 11 digits`);
}

module.exports = { GENDERS, CATEGORIES, BOOKING_TYPES, required, oneOf, date, maxLen, isEmail, positiveInt, phone };
