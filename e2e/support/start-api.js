// Started by Playwright before the browser tests (see playwright.config.js):
// a fake mailbox, a fresh g_link_test database, and the G-Link server on port 5050.
// The tests read the emails from http://127.0.0.1:5051/mail (only on this computer).
const http = require('http');
const h = require('../../server/tests/helpers');

const API_PORT = 5050;
const MAIL_VIEW_PORT = 5051;

(async () => {
  const mail = await h.startMailbox();
  h.useTestSettings(mail.port);
  process.env.CLIENT_URL = 'http://localhost:5174'; // links in emails open the test website
  await h.resetTestDatabase();
  const app = require('../../server/src/app');
  app.listen(API_PORT, () => console.log(`Test API on http://127.0.0.1:${API_PORT} (database ${h.TEST_DB})`));
  http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(mail.messages));
  }).listen(MAIL_VIEW_PORT, '127.0.0.1');
})().catch((err) => {
  console.error('Could not start the test server:', err.message);
  process.exit(1);
});
