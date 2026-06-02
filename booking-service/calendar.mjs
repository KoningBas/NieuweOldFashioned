import { google } from 'googleapis';

// colorId 5 = Banana (geel), colorId 9 = Blueberry (donkerblauw)
const COLOR_MAP = {
  'Cocktails & Bites': '5',
};
const DEFAULT_COLOR = '9';

const DURATION_HOURS = 3;

function getColorId(workshopName) {
  return COLOR_MAP[workshopName] ?? DEFAULT_COLOR;
}

export async function createCalendarEvent(auth, parsed) {
  const calendar = google.calendar({ version: 'v3', auth });
  const { workshopName, customerName, personCount, customerPhone, notes, eventDate, dayLabel, dayNumber, monthLabel, year, time } = parsed;

  const start = new Date(eventDate);
  const end = new Date(start.getTime() + DURATION_HOURS * 60 * 60 * 1000);

  const toRfc3339Local = (d) => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  };

  const description = [
    `Telefoon: ${customerPhone}`,
    `Personen: ${personCount}`,
    notes ? `Opmerking: ${notes}` : null,
  ].filter(Boolean).join('\n');

  const event = {
    summary: `${workshopName} – ${customerName} (${personCount} pers.)`,
    description,
    start: { dateTime: toRfc3339Local(start), timeZone: 'Europe/Amsterdam' },
    end: { dateTime: toRfc3339Local(end), timeZone: 'Europe/Amsterdam' },
    colorId: getColorId(workshopName),
  };

  const res = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    requestBody: event,
  });

  return res.data;
}

export async function getCalendarEvent(auth, eventId) {
  const calendar = google.calendar({ version: 'v3', auth });
  try {
    const res = await calendar.events.get({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId,
    });
    return res.data;
  } catch (err) {
    if (err.status === 404 || err.code === 404) return null;
    throw err;
  }
}

export async function listMonthEvents(auth, year, month) {
  const calendar = google.calendar({ version: 'v3', auth });
  const tz = 'Europe/Amsterdam';
  const timeMin = new Date(year, month - 1, 1).toISOString();
  const timeMax = new Date(year, month, 1).toISOString();

  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: tz,
  });

  return (res.data.items || []).filter(e => e.summary && e.summary.includes(' – '));
}

export async function updateCalendarEvent(auth, eventId, updates) {
  const calendar = google.calendar({ version: 'v3', auth });
  const tz = 'Europe/Amsterdam';

  const existing = await calendar.events.get({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    eventId,
  });

  const event = existing.data;
  const { workshopName, customerName, personCount, customerPhone, notes, startDateTime } = updates;

  if (workshopName || customerName || personCount) {
    const wn = workshopName || parseEventSummary(event.summary).workshopName;
    const cn = customerName || parseEventSummary(event.summary).customerName;
    const pc = personCount || parseEventSummary(event.summary).personCount;
    event.summary = `${wn} – ${cn} (${pc} pers.)`;
    event.colorId = getColorId(wn);
  }

  if (customerPhone !== undefined || notes !== undefined) {
    const lines = [];
    if (customerPhone !== undefined) lines.push(`Telefoon: ${customerPhone}`);
    else {
      const m = (event.description || '').match(/^Telefoon: (.+)$/m);
      if (m) lines.push(`Telefoon: ${m[1]}`);
    }
    const pc = updates.personCount || parseEventSummary(event.summary).personCount;
    lines.push(`Personen: ${pc}`);
    if (notes) lines.push(`Opmerking: ${notes}`);
    else if (notes === undefined) {
      const m = (event.description || '').match(/^Opmerking: (.+)$/m);
      if (m) lines.push(`Opmerking: ${m[1]}`);
    }
    event.description = lines.filter(Boolean).join('\n');
  }

  if (startDateTime) {
    const start = new Date(startDateTime);
    const end = new Date(start.getTime() + DURATION_HOURS * 60 * 60 * 1000);
    const toLocal = d => {
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
    };
    event.start = { dateTime: toLocal(start), timeZone: tz };
    event.end = { dateTime: toLocal(end), timeZone: tz };
  }

  const res = await calendar.events.update({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    eventId,
    requestBody: event,
  });
  return res.data;
}

export async function deleteCalendarEvent(auth, eventId) {
  const calendar = google.calendar({ version: 'v3', auth });
  await calendar.events.delete({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    eventId,
  });
}

export function parseEventSummary(summary = '') {
  const m = summary.match(/^(.+?) – (.+?) \((\d+) pers\.\)$/);
  if (!m) return { workshopName: summary, customerName: '', personCount: '' };
  return { workshopName: m[1], customerName: m[2], personCount: m[3] };
}

export function parseEventDescription(description = '') {
  const phone = (description.match(/^Telefoon: (.+)$/m) || [])[1] || '';
  const notes = (description.match(/^Opmerking: (.+)$/m) || [])[1] || '';
  return { customerPhone: phone, notes };
}
