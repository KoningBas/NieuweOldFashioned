import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, 'state.json');

const DEFAULTS = {
  lastProcessedMessageId: null,
  lastCalendarEventId: null,
  lastProcessedAt: null,
  lastCustomerName: null,
  lastWorkshopName: null,
};

export function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) };
    }
  } catch {
    // corrupt state file — start fresh
  }
  return { ...DEFAULTS };
}

export function saveState(update) {
  const current = loadState();
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...current, ...update }, null, 2), 'utf-8');
}
