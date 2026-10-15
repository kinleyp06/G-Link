// /api/superadmin : ICT unit manages admins, incharges and users
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/http');
const v = require('../utils/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { publicUser } = require('../services/users');

const router = express.Router();
router.use(requireAuth, requireRole('Super Admin'));

const ROLES = ['Guest', 'Incharge', 'Admin', 'Super Admin'];

router.get('/users', asyncHandler(async (req, res) => {
  const params = [];
  let where = '1=1';
  if (req.query.role) { where += ' AND role = ?'; params.push(req.query.role); }
  if (req.query.q) {
    where += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
    const q = `%${req.query.q}%`;
    params.push(q, q, q);
  }
  const [rows] = await pool.query(`SELECT * FROM users WHERE ${where} ORDER BY FIELD(role,'Super Admin','Admin','Incharge','Guest'), first_name LIMIT 500`, params);
  res.json({ users: rows.map(publicUser) });
}));

// Create an admin, incharge (or guest) account. Staff accounts are marked as verified.
router.post('/users', asyncHandler(async (req, res) => {
  const b = req.body;
  v.required(b, ['first_name', 'last_name', 'email', 'password', 'role']);
  const email = String(b.email).trim().toLowerCase();
  if (!v.isEmail(email)) throw new HttpError(400, 'Enter a valid email address.');
  v.oneOf(b.role, ROLES, 'Role');
  if (String(b.password).length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');
  const [ins] = await pool.query(
    'INSERT INTO users (first_name, last_name, email, email_verified, password, role) VALUES (?, ?, ?, TRUE, ?, ?)',
    [b.first_name.trim(), b.last_name.trim(), email, await bcrypt.hash(b.password, 10), b.role]
  );
  res.status(201).json({ message: `${b.role} account created.`, user_id: ins.insertId });
}));

router.put('/users/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.user_id) throw new HttpError(400, 'You cannot change your own role or status.');
  const { role, status } = req.body;
  v.oneOf(role, ROLES, 'Role');
  v.oneOf(status, ['Active', 'Inactive'], 'Status');
  const [r] = await pool.query('UPDATE users SET role = ?, status = ? WHERE user_id = ?', [role, status, id]);
  if (!r.affectedRows) throw new HttpError(404, 'User not found.');
  res.json({ message: 'User saved.' });
}));

router.put('/users/:id/password', asyncHandler(async (req, res) => {
  const pw = String(req.body.password || '');
  if (pw.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');
  await pool.query('UPDATE users SET password = ? WHERE user_id = ?', [await bcrypt.hash(pw, 10), req.params.id]);
  res.json({ message: 'Password reset.' });
}));

module.exports = router;
