// Login checks. requireAuth -> must be signed in. requireRole -> must have one of the roles.
// Super Admin has full access, so it passes every role check.
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { pool } = require('../config/db');
const { HttpError } = require('../utils/http');

async function loadUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new HttpError(401, 'Your session has expired. Please sign in again.');
  }
  if (payload.purpose !== 'login') throw new HttpError(401, 'Invalid session token.');
  const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [payload.uid]);
  const user = rows[0];
  if (!user || user.status !== 'Active') throw new HttpError(401, 'This account is not active.');
  return user;
}

async function requireAuth(req, res, next) {
  try {
    const user = await loadUser(req);
    if (!user) throw new HttpError(401, 'Please sign in first.');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Like requireAuth but lets visitors through (req.user stays undefined).
async function optionalAuth(req, res, next) {
  try {
    req.user = (await loadUser(req)) || undefined;
    next();
  } catch {
    req.user = undefined;
    next();
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'Please sign in first.'));
    if (req.user.role === 'Super Admin' || roles.includes(req.user.role)) return next();
    return next(new HttpError(403, 'You do not have permission to do this.'));
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };
