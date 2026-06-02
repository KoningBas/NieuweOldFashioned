import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, 'token.json');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.events',
];

export function getOAuthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  }
  const client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
  );
  // Vercel: read token from env var
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    return client;
  }
  // Local: read token from file
  if (fs.existsSync(TOKEN_FILE)) {
    client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8')));
  }
  return client;
}

async function runAuthSetup() {
  const client = getOAuthClient();
  const authUrl = client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES });
  console.log('\nOpen deze URL in de browser (ingelogd als Theqingzakelijk@gmail.com):\n');
  console.log(authUrl);
  console.log('\nPlak de teruggestuurde code hieronder en druk op Enter:');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise(resolve => rl.question('Code: ', answer => { rl.close(); resolve(answer.trim()); }));

  const { tokens } = await client.getToken(code);
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
  console.log('\ntoken.json opgeslagen. OAuth2 setup voltooid.');
}

// Run as CLI: node --env-file=.env booking-service/auth.mjs
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAuthSetup().catch(err => { console.error(err.message); process.exit(1); });
}
