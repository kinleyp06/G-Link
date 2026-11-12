// /api/profile : view and edit your own profile, change password
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/http');
const v = require('../utils/validate');
const { requireAuth } = require('../middleware/auth');
const { publicUser, readProfile } = require('../services/users');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Same fields as the sign-up form. The RUB member switch decides the rate (RUB or Non-RUB).
router.put('/', asyncHandler(async (req, res) => {
  const p = readProfile(req.body);
  await pool.query(
    `UPDATE users SET first_name = ?, last_name = ?, phone_number = ?, citizenship_id = ?,
            gender = ?, is_rub_member = ?, sid = ?, department = ? WHERE user_id = ?`,
    [p.first_name, p.last_name, p.phone_number, p.citizenship_id, p.gender, p.is_rub_member, p.sid, p.department, req.user.user_id]
  );
  const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [req.user.user_id]);
  res.json({ message: 'Profile saved.', user: publicUser(rows[0]) });
}));

router.put('/password', asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  v.required(req.body, ['current_password', 'new_password']);
  if (!(await bcrypt.compare(current_password, req.user.password))) throw new HttpError(400, 'Current password is wrong.');
  if (String(new_password).length < 8) throw new HttpError(400, 'New password must be at least 8 characters.');
  await pool.query('UPDATE users SET password = ? WHERE user_id = ?', [await bcrypt.hash(new_password, 10), req.user.user_id]);
  res.json({ message: 'Password changed.' });
}));

module.exports = router;
