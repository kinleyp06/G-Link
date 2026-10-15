// Sends email with nodemailer. If SMTP is not set up (SMTP_HOST empty), the email
// is printed in the server terminal instead, so you can still test everything.
const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;
if (env.smtp.host) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
}

// Never throws: a failed email must not break a booking.
async function sendMail({ to, subject, text }) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) return false;
  if (!transporter) {
    console.log('\n----- EMAIL (dev mode, not really sent) -----');
    console.log(`To: ${recipients.join(', ')}\nSubject: ${subject}\n\n${text}`);
    console.log('---------------------------------------------\n');
    return true;
  }
  try {
    await transporter.sendMail({ from: env.smtp.from, to: recipients.join(', '), subject, text });
    return true;
  } catch (err) {
    console.error('Email failed:', err.message);
    return false;
  }
}

module.exports = { sendMail };
