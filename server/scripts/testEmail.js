// Sends one test email so you can check the SMTP settings in server/.env:
//   npm run test-email -- you@example.com
require('../src/config/env');
const { sendMail } = require('../src/services/email');

const to = process.argv[2];
if (!to) {
  console.error('Give an address to send to, for example:  npm run test-email -- you@example.com');
  process.exit(1);
}

sendMail({
  to,
  subject: 'G-Link: test email',
  text: 'This is a test email from G-Link.\n\nIf you can read this, email is set up correctly.',
}).then((ok) => {
  console.log(ok ? `Sent. Check the inbox (and Spam) of ${to}.` : 'Not sent. Read the error above and check the SMTP settings in server/.env.');
  process.exit(ok ? 0 : 1);
});
