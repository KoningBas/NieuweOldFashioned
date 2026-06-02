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
    start: { dateTime: toRfc3339Local(start), timeZone: process.env.TZ_CALENDAR || 'Europe/Amsterdam' },
    end: { dateTime: toRfc3339Local(end), timeZone: process.env.TZ_CALENDAR || 'Europe/Amsterdam' },
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
