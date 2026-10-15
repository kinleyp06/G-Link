// G-Link backend entry point. Run with: npm run dev
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { pool } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, database: err.message });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/incharge', require('./routes/incharge'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api', require('./routes/halls'));
app.use('/api', require('./routes/catalog'));

app.use('/api', (req, res) => res.status(404).json({ message: `No API route for ${req.method} ${req.originalUrl}` }));
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`G-Link API running on http://localhost:${env.port}`);
  console.log(`Health check: http://localhost:${env.port}/api/health`);
});
