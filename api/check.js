import { run } from '../booking-service/processor.mjs';

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
  if (req.method !== 'POST') { res.status(405).end(); return; }

  try {
    const results = await run();
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
