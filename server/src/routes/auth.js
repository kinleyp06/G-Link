// /api/auth : sign up, verify email, sign in, who am I
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/http');
const v = require('../utils/validate');
const { requireAuth } = require('../middleware/auth');
const { publicUser } = require('../services/users');
const notify = require('../services/notify');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ uid: user.user_id, role: user.role, purpose: 'login' }, env.jwtSecret, { expiresIn: '7d' });
}

function verifyToken(user) {
  return jwt.sign({ uid: user.user_id, purpose: 'verify' }, env.jwtSecret, { expiresIn: '1d' });
}

// Sign up with email ID. Every new account is a Guest.
router.post('/register', asyncHandler(async (req, res) => {
  const { first_name, last_name, password } = req.body;
  const email = String(req.body.email || '').trim().toLowerCase();
  v.required({ ...req.body, email }, ['first_name', 'last_name', 'email', 'password']);
  if (!v.isEmail(email)) throw new HttpError(400, 'Enter a valid email address.');
  v.maxLen(first_name, 20, 'First name');
  v.maxLen(last_name, 20, 'Last name');
  if (String(password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');

  const hash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)',
    [first_name.trim(), last_name.trim(), email, hash]
  );
  const user = { user_id: result.insertId, first_name, email };
  await notify.verifyEmail(user, verifyToken(user));
  res.status(201).json({ message: 'Account created. Check your email for the link to confirm it.' });
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
  if (user && !user.email_verified) await notify.verifyEmail(user, verifyToken(user));
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
