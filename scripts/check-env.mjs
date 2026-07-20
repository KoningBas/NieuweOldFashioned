import { existsSync, readFileSync } from 'node:fs';

// locatie/, workshops/ and admin/ all import src/shared/lib/supabase.ts, which
// throws at module-load time when these are missing. That throw happens deep in
// the module graph, so the symptom is a blank #root on every page except the
// static homepage — with nothing in the terminal to say why. Catch it here,
// before Vite even starts, so it's impossible to miss.
const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

function loadEnvLocal() {
  if (!existsSync('.env.local')) return {};
  const vars = {};
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (match) vars[match[1]] = match[2];
  }
  return vars;
}

const vars = { ...loadEnvLocal(), ...process.env };
const missing = REQUIRED.filter((key) => !vars[key]);

if (missing.length > 0) {
  console.error(
    `\n✖ .env.local is missing ${missing.join(', ')}.\n` +
      `  locatie/, workshops/ and admin/ will load with a blank page until this is fixed\n` +
      `  (the homepage is static and won't show anything wrong).\n\n` +
      `  Copy .env.local.example to .env.local and fill in the values from the\n` +
      `  Supabase dashboard (Project Settings > API).\n`
  );
  process.exit(1);
}
