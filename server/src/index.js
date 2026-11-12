// G-Link backend entry point. Run with: npm run dev
const env = require('./config/env');
const app = require('./app');
const { checkEmailSetup } = require('./services/email');

// Email must work before the site opens: sign-up confirmation and every booking notice go by email.
checkEmailSetup().then(() => {
  app.listen(env.port, () => {
    console.log(`G-Link API running on http://localhost:${env.port}`);
    console.log(`Health check: http://localhost:${env.port}/api/health`);
  });
});
