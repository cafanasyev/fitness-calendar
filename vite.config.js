import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy: {
      // Forward Firebase Hosting reserved URLs to the emulator so
      // /__/firebase/init.js (SDK auto-config) works during local dev.
      '/__': 'http://localhost:5000',
    },
  },
  build: {
    outDir: 'dist',
    target: 'ES2022',
  },
});
