// Sends real email through an SMTP account (for example a Gmail account with an App password).
// The settings come from server/.env: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM.
// There is no "print to terminal" mode: sign-up confirmation, booking decisions, cancellations,
// check-in and check-out all reach the guest's inbox.
const nodemailer = require('nodemailer');
const env = require('../config/env');

// Two ways to send: Gmail over SMTP (laptops), or the Brevo email API over HTTPS (online hosts such as
// Render's free plan, which block SMTP). Brevo is used when BREVO_API_KEY is set.
const useBrevo = () => Boolean(process.env.BREVO_API_KEY);
const missingSettings = () => (useBrevo()
  ? ['BREVO_SENDER_EMAIL'].filter((k) => !process.env[k] && !process.env.SMTP_USER)
  : ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !process.env[k]));

// The "from" address for Brevo: BREVO_SENDER_EMAIL (a sender verified in Brevo), else SMTP_USER.
function brevoSender() {
  const email = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER;
  const name = (/^\s*"?([^"<]+?)"?\s*</.exec(env.smtp.from || '') || [])[1] || 'G-Link Guest House';
  return { name, email };
}

async function brevo(path, body) {
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'api-key': process.env.BREVO_API_KEY, accept: 'application/json', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const info = await res.json().catch(() => ({}));
    throw new Error(`Brevo ${res.status}: ${info.message || res.statusText}`);
  }
  return res.json().catch(() => ({}));
}

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      // Give up after 15 seconds instead of minutes if the email server cannot be reached.
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });
  }
  return transporter;
}

// Called when the server starts: stops it if email is not set up, and logs in to the
// SMTP account once so a wrong password shows up straight away (not at the first sign-up).
async function checkEmailSetup() {
  const missing = missingSettings();
  if (missing.length) {
    console.error(`\nEmail is not set up. Fill in ${missing.join(', ')} in server/.env.`);
    console.error('G-Link sends every confirmation and booking notice by real email, so the server needs an email account.');
    console.error('Gmail: turn on 2-Step Verification, create an App password, then see "Email setup" in SETUP_GUIDE.md.\n');
    process.exit(1);
  }
  if (useBrevo()) {
    try {
      await brevo('/account');
      console.log(`Email ready (Brevo): sending as ${brevoSender().email}`);
    } catch (err) {
      console.error(`Email login failed (${err.message}). Check BREVO_API_KEY.`);
      console.error('The website still runs, but emails will not be delivered until this is fixed.');
    }
    return;
  }
  try {
    await getTransporter().verify();
    console.log(`Email ready: sending as ${env.smtp.user}`);
  } catch (err) {
    console.error(`Email login failed (${err.message}). Check SMTP_USER and SMTP_PASS in server/.env.`);
    console.error('The website still runs, but emails will not be delivered until this is fixed.');
  }
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Same message as an HTML email in the site colours (royal blue header, gold rule).
// Links become clickable; `button` adds one big button (used for the confirmation link).
function toHtml(text, button) {
  const body = escapeHtml(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#002789">$1</a>')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  const btn = button
    ? `<p style="margin:20px 0"><a href="${escapeHtml(button.url)}" style="background:#002789;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(button.label)}</a></p>`
    : '';
  return `<div style="background:#f4f5f7;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#2b2b2b">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e1e3e8">
    <div style="background:#002789;color:#ffffff;padding:16px 22px;font-size:18px;font-weight:700;border-bottom:4px solid #A07A43">G-Link &middot; CST Guest House</div>
    <div style="padding:22px;font-size:15px;line-height:1.5">${body}${btn}</div>
    <div style="padding:12px 22px;font-size:12px;color:#6b6f76;background:#f4f5f7">College of Science and Technology, Rinchending, Phuentsholing. This is an automatic email from G-Link.</div>
  </div>
</div>`;
}

// Returns true when the email was accepted by the mail server. Never throws, so a failed
// notice cannot undo a booking; the few places that must know (sign-up) check the result.
async function sendMail({ to, subject, text, button }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!recipients.length) return false;
  if (missingSettings().length) {
    console.error(`Email not sent (email is not set up in server/.env): ${subject}`);
    return false;
  }
  try {
    if (useBrevo()) {
      await brevo('/smtp/email', {
        sender: brevoSender(),
        to: recipients.map((email) => ({ email })),
        subject,
        textContent: text,
        htmlContent: toHtml(text, button),
      });
    } else {
      await getTransporter().sendMail({ from: env.smtp.from, to: recipients.join(', '), subject, text, html: toHtml(text, button) });
    }
    return true;
  } catch (err) {
    console.error(`Email failed (${subject}): ${err.message}`);
    return false;
  }
}

module.exports = { sendMail, checkEmailSetup, brevoSender };
