import { defineConfig } from 'vite';

export default defineConfig({
  base: '/web-game-race/',
  server: {
    port: 5173,
    host: true
  }
});
