// G-Link backend entry point. Run with: npm run dev
const env = require('./config/env');
const app = require('./app');
const { checkEmailSetup } = require('./services/email');

// Open the port first (hosts like Render wait for it), then check the email login in the background.
// The server still stops if the email settings are missing: every notice goes by email.
app.listen(env.port, () => {
  console.log(`G-Link API running on http://localhost:${env.port}`);
  console.log(`Health check: http://localhost:${env.port}/api/health`);
  checkEmailSetup();
});
