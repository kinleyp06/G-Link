// Date helpers. All dates are 'YYYY-MM-DD' strings.
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

function isValidDate(s) {
  return parseDate(s) !== null;
}

// Number of nights between check-in and check-out (or days between two dates).
function daysBetween(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / DAY_MS);
}

function addDays(s, n) {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Today's date in the server's local time zone (Bhutan time on your laptop).
function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// Every night of a stay: from check-in up to (not including) check-out.
function eachNight(from, to) {
  const nights = [];
  for (let d = from; d < to; d = addDays(d, 1)) nights.push(d);
  return nights;
}

module.exports = { parseDate, isValidDate, daysBetween, addDays, today, eachNight };
