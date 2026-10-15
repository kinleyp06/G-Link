// /api/profile : view and edit your own profile, change password
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { HttpError, asyncHandler } = require('../utils/http');
const v = require('../utils/validate');
const { requireAuth } = require('../middleware/auth');
const { publicUser, isRubEmail } = require('../services/users');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  res.json({ user: publicUser(req.user), is_rub_email: isRubEmail(req.user.email) });
});

router.put('/', asyncHandler(async (req, res) => {
  const b = req.body;
  v.required(b, ['first_name', 'last_name', 'phone_number', 'citizenship_id', 'gender', 'department']);
  v.maxLen(b.first_name, 20, 'First name');
  v.maxLen(b.last_name, 20, 'Last name');
  v.phone(b.phone_number);
  v.maxLen(b.citizenship_id, 20, 'Citizenship ID');
  v.oneOf(b.gender, v.GENDERS, 'Gender');
  v.maxLen(b.sid, 20, 'Staff/Student ID');
  v.maxLen(b.department, 50, 'Department');

  await pool.query(
    `UPDATE users SET first_name = ?, last_name = ?, phone_number = ?, citizenship_id = ?,
            gender = ?, sid = ?, department = ? WHERE user_id = ?`,
    [b.first_name.trim(), b.last_name.trim(), String(b.phone_number), String(b.citizenship_id).trim(),
      b.gender, b.sid ? String(b.sid).trim() : null, b.department.trim(), req.user.user_id]
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
