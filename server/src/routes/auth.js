// /api/auth : sign up, verify email, sign in, who am I
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/http');
const v = require('../utils/validate');
const { requireAuth } = require('../middleware/auth');
const { publicUser, readProfile } = require('../services/users');
const notify = require('../services/notify');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ uid: user.user_id, role: user.role, purpose: 'login' }, env.jwtSecret, { expiresIn: '7d' });
}

function verifyToken(user) {
  return jwt.sign({ uid: user.user_id, purpose: 'verify' }, env.jwtSecret, { expiresIn: '1d' });
}

// Sign up with email ID. Every new account is a Guest. The form has the same fields as the
// Profile page (phone, CID, gender, RUB member + staff ID + department), so the profile is
// complete from the start and the guest can book straight after confirming their email.
router.post('/register', asyncHandler(async (req, res) => {
  const { password } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();
  v.required({ ...req.body, email }, ['email', 'password']);
  if (!v.isEmail(email)) throw new HttpError(400, 'Enter a valid email address.');
  if (String(password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');
  const p = readProfile(req.body);

  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    `INSERT INTO users (first_name, last_name, email, password, phone_number, citizenship_id, gender, is_rub_member, sid, department)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.first_name, p.last_name, email, hash, p.phone_number, p.citizenship_id, p.gender, p.is_rub_member, p.sid, p.department]
  );
  const user = { user_id: result.insertId, first_name: p.first_name, email };
  if (!(await notify.verifyEmail(user, verifyToken(user)))) {
    // Without the email the account could never be confirmed, so undo it and let them try again.
    await pool.query('DELETE FROM users WHERE user_id = ?', [user.user_id]);
    throw new HttpError(502, 'We could not send the confirmation email. Check the address and try again in a few minutes.');
  }
  res.status(201).json({ message: `Account created. We sent a confirmation link to ${email}. Open it to activate your account (check Spam too).` });
}));

router.post('/verify-email', asyncHandler(async (req, res) => {
  let payload;
  try {
    payload = jwt.verify(String(req.body.token || ''), env.jwtSecret);
  } catch {
    throw new HttpError(400, 'This link is invalid or has expired. Ask for a new one from the sign in page.');
  }
  if (payload.purpose !== 'verify') throw new HttpError(400, 'This link is invalid.');
  await pool.query('UPDATE users SET email_verified = TRUE WHERE user_id = ?', [payload.uid]);
  res.json({ message: 'Email confirmed. You can sign in now.' });
}));

router.post('/resend-verification', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (user && !user.email_verified && !(await notify.verifyEmail(user, verifyToken(user)))) {
    throw new HttpError(502, 'We could not send the email right now. Try again in a few minutes.');
  }
  // Same answer either way, so nobody can test which emails exist.
  res.json({ message: 'If that account needs confirming, a new link has been sent.' });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(401, 'Email or password is wrong.');
  }
  if (user.status !== 'Active') throw new HttpError(403, 'This account has been deactivated. Contact the ICT unit.');
  if (!user.email_verified) {
    throw new HttpError(403, 'Confirm your email first. Use the link we emailed you.', 'EMAIL_NOT_VERIFIED');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
