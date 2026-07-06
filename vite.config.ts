import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        locatie: resolve(root, 'locatie/index.html'),
        admin: resolve(root, 'admin/index.html'),
      },
    },
  },
  test: {
    environment: 'node',
  },
});
