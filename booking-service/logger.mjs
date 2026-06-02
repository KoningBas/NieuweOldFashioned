import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, 'logs');

function getLogFile() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(logsDir, `service-${date}.log`);
}

function write(level, message, data) {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...(data && { data }) });
  console.log(entry);
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    fs.appendFileSync(getLogFile(), entry + '\n', 'utf-8');
  } catch {
    // logging failure should never crash the service
  }
}

export const logger = {
  info: (msg, data) => write('info', msg, data),
  warn: (msg, data) => write('warn', msg, data),
  error: (msg, data) => write('error', msg, data),
};
