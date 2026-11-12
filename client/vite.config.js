import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// While developing, calls to /api are sent to the Express server on port 5000.
// The end-to-end tests point it at their own test server with API_PROXY_TARGET.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': process.env.API_PROXY_TARGET || 'http://localhost:5000' },
  },
});
