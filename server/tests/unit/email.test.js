// Unit tests: sending email through the Brevo API (used online, where SMTP is blocked).
// fetch is replaced by a fake, so no real email is sent.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

let calls; let reply; const realFetch = global.fetch;

beforeEach(() => {
  process.env.BREVO_API_KEY = 'test-key';
  process.env.SMTP_USER = 'team@example.com';
  process.env.MAIL_FROM = '"G-Link Guest House <team@example.com>"';
  delete process.env.BREVO_SENDER_EMAIL;
  calls = [];
  reply = { ok: true, status: 201, json: async () => ({ messageId: '1' }) };
  global.fetch = async (url, options) => { calls.push({ url, options }); return reply; };
  delete require.cache[require.resolve('../../src/config/env')];
  delete require.cache[require.resolve('../../src/services/email')];
});
afterEach(() => { global.fetch = realFetch; delete process.env.BREVO_API_KEY; });

test('with BREVO_API_KEY, an email goes to the Brevo API with the key, sender and both text and HTML', async () => {
  const { sendMail } = require('../../src/services/email');
  const ok = await sendMail({ to: 'guest@example.com', subject: 'G-Link: test', text: 'Hello\n\nhttps://example.com' });
  assert.equal(ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(calls[0].options.headers['api-key'], 'test-key');
  const body = JSON.parse(calls[0].options.body);
  assert.deepEqual(body.sender, { name: 'G-Link Guest House', email: 'team@example.com' });
  assert.deepEqual(body.to, [{ email: 'guest@example.com' }]);
  assert.equal(body.subject, 'G-Link: test');
  assert.match(body.htmlContent, /href="https:\/\/example.com"/);
});

test('BREVO_SENDER_EMAIL, when set, is the from address', async () => {
  process.env.BREVO_SENDER_EMAIL = 'noreply@example.org';
  const { brevoSender } = require('../../src/services/email');
  assert.equal(brevoSender().email, 'noreply@example.org');
});

test('a refused email returns false instead of crashing the booking', async () => {
  reply = { ok: false, status: 401, statusText: 'Unauthorized', json: async () => ({ message: 'Key not found' }) };
  const { sendMail } = require('../../src/services/email');
  const ok = await sendMail({ to: 'guest@example.com', subject: 'x', text: 'y' });
  assert.equal(ok, false);
});
