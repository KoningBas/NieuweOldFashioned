import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('.', import.meta.url));

function redirectAppRoots() {
  return {
    name: 'redirect-app-roots',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/admin' || req.url === '/locatie') {
          res.writeHead(301, { Location: req.url + '/' });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [react(), redirectAppRoots()],
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
