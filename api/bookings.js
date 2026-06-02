import { getOAuthClient } from '../booking-service/auth.mjs';
import { listMonthEvents, listWeekEvents, parseEventSummary, parseEventDescription } from '../booking-service/calendar.mjs';

function checkAuth(req, res) {
  const pw = req.headers['x-admin-password'];
  if (!process.env.ADMIN_PASSWORD || pw !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;
  if (req.method !== 'GET') { res.status(405).end(); return; }

  const { startDate, endDate } = req.query;
  const year = parseInt(req.query.year || new Date().getFullYear(), 10);
  const month = parseInt(req.query.month || (new Date().getMonth() + 1), 10);

  try {
    const auth = getOAuthClient();
    const events = startDate && endDate
      ? await listWeekEvents(auth, startDate, endDate)
      : await listMonthEvents(auth, year, month);
    const bookings = events.map(e => {
      const { workshopName, customerName, personCount } = parseEventSummary(e.summary);
      const { customerPhone, notes } = parseEventDescription(e.description);
      return {
        id: e.id,
        workshopName,
        customerName,
        personCount,
        customerPhone,
        notes,
        start: e.start?.dateTime || e.start?.date || '',
        colorId: e.colorId || '9',
        htmlLink: e.htmlLink,
      };
    });
    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
