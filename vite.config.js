import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        wholeHouse: resolve(import.meta.dirname, 'whole-house.html'),
      },
    },
  },
});
