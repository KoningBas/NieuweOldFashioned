import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function copyIfExists(src, dest) {
  if (!existsSync(src)) return;
  await cp(src, dest, { recursive: true });
}

async function main() {
  await mkdir('dist', { recursive: true });
  await copyIfExists('index.html', 'dist/index.html');
  await copyIfExists('OldImages', 'dist/OldImages');
  await copyIfExists('public/images', 'dist/images');
}

main();
