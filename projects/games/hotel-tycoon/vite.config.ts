import { defineConfig } from 'vite';

// base: './' keeps every asset path relative, so the game works under any
// sub-path (GitHub Pages: /<repo>/projects/games/hotel-tycoon/).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
