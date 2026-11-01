/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': decodeURIComponent(new URL('./src', import.meta.url).pathname) } },
  // The 3D game pages are lazy-loaded (App.tsx), so three.js is only downloaded when the lab is opened.
  build: { chunkSizeWarningLimit: 1500 },
  test: { globals: true, environment: 'jsdom', include: ['src/**/*.test.ts'] },
});
