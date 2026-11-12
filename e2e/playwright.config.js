// End-to-end tests: Playwright starts a test server (fresh g_link_test database, fake mailbox)
// and the website on port 5174, then a real Chrome browser clicks through the site.
// Run from this folder: npm install, npx playwright install chromium, npm test
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1, // the tests share one database, so they run one after another
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node support/start-api.js',
      url: 'http://127.0.0.1:5050/api/health',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'npm --prefix ../client run dev -- --port 5174 --strictPort',
      url: 'http://localhost:5174',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:5050' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
