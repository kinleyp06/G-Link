import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The backend allows requests from http://localhost:5173 (CLIENT_URL in server/.env).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
