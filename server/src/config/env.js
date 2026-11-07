// Loads .env and gives every file one place to read settings from.
require('dotenv').config();

const env = {
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'g_link',
  },
  jwtSecret: process.env.JWT_SECRET || 'dev_only_secret_change_me',
  gstPercent: Number(process.env.GST_PERCENT) || 5,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: String(process.env.SMTP_SECURE) !== 'false',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    // Gmail only sends "from" the signed-in account, so this defaults to SMTP_USER.
    from: process.env.MAIL_FROM || `G-Link Guest House <${process.env.SMTP_USER || ''}>`,
  },
};

module.exports = env;
