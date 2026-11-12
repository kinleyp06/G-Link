// Integration tests: the real server + a real MySQL database (g_link_test) + a fake mailbox.
// Each test sends real requests, like the website does, and checks the answers, the database and the emails.
// Run: npm run test:integration   (needs MySQL running; uses DB_HOST / DB_USER / DB_PASSWORD from server/.env)
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('../helpers');

let mail; let server; let base; let pool;
const tokens = {};

// ---------- small helpers ----------
async function api(method, path, body, token) {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
async function signIn(email, password = h.STAFF_PASSWORD) {
  const r = await api('POST', '/auth/login', { email, password });
  assert.equal(r.status, 200, `sign in ${email}: ${r.body.message}`);
  return r.body.token;
}
const profile = (extra) => ({
  first_name: 'Test', last_name: 'Guest', password: 'Password1', phone_number: '17123456', gender: 'Male', ...extra,
});
let cid = 1000;
async function newGuest(email, extra = {}) {
  cid += 1;
  const r = await api('POST', '/auth/register', profile({ email, citizenship_id: String(cid), ...extra }));
  assert.equal(r.status, 201, r.body.message);
  const m = await h.waitForEmail(mail.messages, email, /confirm your email/);
  assert.equal((await api('POST', '/auth/verify-email', { token: h.tokenFrom(m) })).status, 200);
  return signIn(email, 'Password1');
}
const { addDays, today } = require('../../src/utils/dates');
const inDays = (n) => addDays(today(), n);
const roomId = async (number) => (await pool.query('SELECT room_id FROM rooms WHERE room_number = ?', [number]))[0][0].room_id;

// ---------- start: fake mailbox, fresh test database, the app on a free port ----------
before(async () => {
  mail = await h.startMailbox();
  h.useTestSettings(mail.port);
  await h.resetTestDatabase();
  const app = require('../../src/app');
  ({ pool } = require('../../src/config/db'));
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
  tokens.admin = await signIn(h.STAFF.admin.email);
  tokens.incharge = await signIn(h.STAFF.incharge.email);
});

after(async () => {
  await new Promise((r) => server.close(r));
  await pool.end();
  await new Promise((r) => mail.server.close(r));
});

// ---------- the tests ----------
test('the server is connected to the database', async () => {
  const r = await api('GET', '/health');
  assert.deepEqual(r.body, { ok: true, database: 'connected' });
});

test('visitors see 10 rooms: 1-8 bookable, Suite 1 and Suite 2 reserved for VIP', async () => {
  const r = await api('GET', `/rooms/availability?guesthouse_id=1&check_in=${inDays(3)}&check_out=${inDays(5)}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.rooms.length, 10);
  const suites = r.body.rooms.filter((x) => x.vip_only);
  assert.deepEqual(suites.map((x) => x.room_number).sort(), ['Suite 1', 'Suite 2']);
  assert.ok(suites.every((x) => !x.bed_available_for_me && x.label === 'Reserved for college VIP guests'));
  assert.equal(r.body.rooms.filter((x) => x.floor === 0 && !x.vip_only).length, 4);
});

test('sign-up sends a confirmation email; sign-in waits until the email is confirmed', async () => {
  const email = 'pema@test.gl';
  const reg = await api('POST', '/auth/register', profile({ email, citizenship_id: '501', is_rub_member: true, sid: 'CST100', department: 'IT' }));
  assert.equal(reg.status, 201);
  const before = await api('POST', '/auth/login', { email, password: 'Password1' });
  assert.equal(before.status, 403);
  assert.equal(before.body.code, 'EMAIL_NOT_VERIFIED');
  const m = await h.waitForEmail(mail.messages, email, /confirm your email/);
  assert.equal((await api('POST', '/auth/verify-email', { token: h.tokenFrom(m) })).status, 200);
  tokens.rub = await signIn(email, 'Password1');
  const me = await api('GET', '/auth/me', null, tokens.rub);
  assert.equal(me.body.user.guest_category, 'RUB');
  assert.equal(me.body.user.profile_complete, true);
});

test('sign-up refuses gender "Other" and a RUB member without a staff ID', async () => {
  const other = await api('POST', '/auth/register', profile({ email: 'o@test.gl', citizenship_id: '502', gender: 'Other' }));
  assert.equal(other.status, 400);
  const noSid = await api('POST', '/auth/register', profile({ email: 's@test.gl', citizenship_id: '503', is_rub_member: true, department: 'IT' }));
  assert.equal(noSid.status, 400);
  assert.match(noSid.body.message, /staff ID/);
});

test('quotes use the rate from the profile: RUB Nu. 525, Non-RUB Nu. 840 for one bed, 2 nights', async () => {
  tokens.nonRub = await newGuest('karma@test.gl');
  const body = { room_id: await roomId('1'), booking_type: 'Per Bed', check_in_date: inDays(3), check_out_date: inDays(5), purpose_of_visit: 'Workshop' };
  const rub = await api('POST', '/bookings/quote', body, tokens.rub);
  assert.equal(rub.body.bill.total_amount, 525);
  const nonRub = await api('POST', '/bookings/quote', { ...body, guest_category: 'RUB' }, tokens.nonRub); // the form cannot pick the rate
  assert.equal(nonRub.body.bill.total_amount, 840);
});

test('a VIP suite cannot be booked by a guest', async () => {
  const r = await api('POST', '/bookings', {
    room_id: await roomId('Suite 1'), booking_type: 'Exclusive', check_in_date: inDays(3), check_out_date: inDays(5), purpose_of_visit: 'x',
  }, tokens.rub);
  assert.equal(r.status, 409);
  assert.match(r.body.message, /VIP/);
});

test('book, then the admin approves: bill created and approval email with the staff ID note', async () => {
  const r = await api('POST', '/bookings', {
    room_id: await roomId('1'), booking_type: 'Per Bed', check_in_date: inDays(3), check_out_date: inDays(5), purpose_of_visit: 'Workshop', allow_sharing: true,
  }, tokens.rub);
  assert.equal(r.status, 201);
  assert.equal(r.body.booking.booking_status, 'Pending');
  await h.waitForEmail(mail.messages, h.STAFF.admin.email, /new room booking/);
  const id = r.body.booking.booking_id;
  assert.equal((await api('POST', `/admin/bookings/${id}/approve`, {}, tokens.admin)).status, 200);
  const [[bill]] = await pool.query('SELECT total_amount, payment_status FROM payments WHERE booking_id = ?', [id]);
  assert.equal(bill.total_amount, 525);
  assert.equal(bill.payment_status, 'Unpaid');
  const m = await h.waitForEmail(mail.messages, 'pema@test.gl', /was approved/);
  assert.match(m.text, /Staff ID will be verified during check-in and check-out/);
});

test('sharing: another male guest may share room 1, a female guest may not', async () => {
  const url = `/rooms/availability?guesthouse_id=1&check_in=${inDays(3)}&check_out=${inDays(5)}`;
  const male = (await api('GET', url, null, tokens.nonRub)).body.rooms.find((x) => x.room_number === '1');
  assert.equal(male.shared, true);
  assert.equal(male.bed_available_for_me, true);
  assert.equal(male.exclusive_available, false);
  const female = await newGuest('dechen@test.gl', { gender: 'Female' });
  const forHer = (await api('GET', url, null, female)).body.rooms.find((x) => x.room_number === '1');
  assert.equal(forHer.bed_available_for_me, false);
  assert.match(forHer.reason, /male guests/);
});

test('check-in and check-out: payment method required, bill paid, emails sent', async () => {
  const b = await api('POST', '/bookings', {
    room_id: await roomId('5'), booking_type: 'Per Bed', check_in_date: today(), check_out_date: inDays(1), purpose_of_visit: 'Visit',
  }, tokens.nonRub);
  const id = b.body.booking.booking_id;
  await api('POST', `/admin/bookings/${id}/approve`, {}, tokens.admin);
  assert.equal((await api('POST', `/incharge/bookings/${id}/check-in`, {}, tokens.incharge)).status, 200);
  await h.waitForEmail(mail.messages, 'karma@test.gl', /checked in/);
  const noMethod = await api('POST', `/incharge/bookings/${id}/check-out`, {}, tokens.incharge);
  assert.equal(noMethod.status, 400);
  const ok = await api('POST', `/incharge/bookings/${id}/check-out`, { payment_method: 'mBOB' }, tokens.incharge);
  assert.equal(ok.status, 200);
  const [[row]] = await pool.query('SELECT b.booking_status, p.payment_status, p.payment_method FROM bookings b JOIN payments p USING (booking_id) WHERE b.booking_id = ?', [id]);
  assert.deepEqual({ ...row }, { booking_status: 'Completed', payment_status: 'Paid', payment_method: 'mBOB' });
  const receipt = await h.waitForEmail(mail.messages, 'karma@test.gl', /checked out/);
  assert.match(receipt.text, /mBOB/);
});

test('the admin books an international guest: approved at once, Non-RUB rate, no account', async () => {
  const r = await api('POST', '/admin/bookings/international', {
    room_id: await roomId('6'), booking_type: 'Per Bed', check_in_date: inDays(3), check_out_date: inDays(5), purpose_of_visit: 'Conference',
    guests: [{ full_name: 'John Smith', gender: 'Male', citizenship_id: 'P1234567' }],
  }, tokens.admin);
  assert.equal(r.status, 201);
  assert.equal(r.body.bill.total_amount, 840);
  const [[b]] = await pool.query('SELECT user_id, guest_category, booking_status FROM bookings WHERE booking_id = ?', [r.body.booking_id]);
  assert.deepEqual({ ...b }, { user_id: null, guest_category: 'Non-RUB', booking_status: 'Approved' });
});

test('meeting hall: fee Nu. 10,500 for 2 days, at most 25 people, cancelling sends an email', async () => {
  const fee = await api('GET', `/halls/1/availability?start_date=${inDays(10)}&end_date=${inDays(11)}`);
  assert.equal(fee.body.bill.total_amount, 10500);
  const tooMany = await api('POST', '/hall-bookings', { hall_id: 1, start_date: inDays(10), end_date: inDays(11), purpose: 'Meeting', number_of_attendees: 30 }, tokens.rub);
  assert.equal(tooMany.status, 400);
  const hb = await api('POST', '/hall-bookings', { hall_id: 1, start_date: inDays(10), end_date: inDays(11), purpose: 'Meeting', number_of_attendees: 20 }, tokens.rub);
  assert.equal(hb.status, 201);
  assert.equal((await api('POST', `/hall-bookings/${hb.body.hall_booking.hall_booking_id}/cancel`, {}, tokens.rub)).status, 200);
  await h.waitForEmail(mail.messages, 'pema@test.gl', /hall booking .* was cancelled/);
});

test('roles: guests cannot use admin or incharge pages; nobody can without signing in', async () => {
  assert.equal((await api('GET', '/admin/dashboard', null, tokens.rub)).status, 403);
  assert.equal((await api('GET', '/incharge/bookings', null, tokens.rub)).status, 403);
  assert.equal((await api('GET', '/bookings/mine')).status, 401);
  assert.equal((await api('GET', '/admin/dashboard', null, tokens.admin)).status, 200);
});
