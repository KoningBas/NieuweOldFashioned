import { getOAuthClient } from '../../booking-service/auth.mjs';
import { updateCalendarEvent, deleteCalendarEvent } from '../../booking-service/calendar.mjs';

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
  const eventId = req.query.id;

  if (req.method === 'PUT') {
    try {
      const auth = getOAuthClient();
      await updateCalendarEvent(auth, eventId, req.body);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      const auth = getOAuthClient();
      await deleteCalendarEvent(auth, eventId);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).end();
}
