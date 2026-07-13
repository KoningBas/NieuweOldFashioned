import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;

// locatie/ and admin/ are Vite apps whose entry is a .tsx module. A plain static
// file server hands the browser raw TSX with the wrong MIME type, the module is
// blocked, React never mounts and the page renders as an empty black body. So
// serve everything through Vite, which transpiles the TSX and injects env vars.
const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  // host: true binds to 0.0.0.0 so phones on the same wifi can open the dev build.
  server: { port: PORT, strictPort: true, host: true },
});

await server.listen();
server.printUrls();
