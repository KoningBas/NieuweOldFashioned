import http from 'http';
import { run } from './processor.mjs';
import { loadState } from './state.mjs';
import { logger } from './logger.mjs';

const PORT = parseInt(process.env.ADMIN_PORT || '3001', 10);

let isRunning = false;

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workshop Boekingen — Beheer</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #e8e0d4; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: 40px; max-width: 560px; width: 100%; margin: 24px; }
    h1 { font-size: 20px; font-weight: 600; color: #C8922A; margin-bottom: 6px; }
    .subtitle { font-size: 13px; color: #6b6560; margin-bottom: 32px; }
    .state-box { background: #111; border: 1px solid #222; border-radius: 8px; padding: 16px; margin-bottom: 28px; font-size: 13px; line-height: 1.8; }
    .state-box .label { color: #6b6560; }
    .state-box .value { color: #e8e0d4; }
    .state-box .verified { color: #4caf50; }
    .state-box .warning { color: #ff9800; }
    button { width: 100%; padding: 14px 24px; background: #C8922A; color: #0f0f0f; font-size: 15px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; transition: background 0.15s, transform 0.1s; }
    button:hover { background: #d9a43d; }
    button:active { transform: scale(0.98); }
    button:disabled { background: #3a3020; color: #5a4a30; cursor: not-allowed; transform: none; }
    .result { margin-top: 24px; padding: 16px; border-radius: 8px; font-size: 13px; line-height: 1.8; display: none; }
    .result.success { background: #0d1f0d; border: 1px solid #1e3a1e; color: #81c784; }
    .result.error { background: #1f0d0d; border: 1px solid #3a1e1e; color: #e57373; }
    .result.info { background: #111; border: 1px solid #222; color: #aaa; }
    .booking-item { padding: 6px 0; border-bottom: 1px solid #1a3a1a; }
    .booking-item:last-child { border-bottom: none; }
    .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #5a4a30; border-top-color: #C8922A; border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 8px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <h1>Workshop Boekingen</h1>
    <p class="subtitle">Beheer — The Old Fashioned</p>

    <div class="state-box" id="state-box">Laden...</div>

    <button id="check-btn" onclick="checkBookings()">Controleer boekingen</button>

    <div class="result" id="result"></div>
  </div>

  <script>
    async function loadStatus() {
      try {
        const r = await fetch('/status');
        const s = await r.json();
        const box = document.getElementById('state-box');
        if (!s.lastProcessedAt) {
          box.innerHTML = '<span class="value">Nog geen boekingen verwerkt.</span>';
        } else {
          const evStatus = s.lastCalendarEventId
            ? '<span class="verified">&#10003; In agenda</span>'
            : '<span class="warning">&#9888; Niet gevonden in agenda</span>';
          box.innerHTML =
            '<div><span class="label">Laatste boeking: </span><span class="value">' + (s.lastCustomerName || '—') + '</span></div>' +
            '<div><span class="label">Workshop: </span><span class="value">' + (s.lastWorkshopName || '—') + '</span></div>' +
            '<div><span class="label">Verwerkt op: </span><span class="value">' + new Date(s.lastProcessedAt).toLocaleString('nl-NL') + '</span></div>' +
            '<div><span class="label">Agenda event: </span>' + evStatus + '</div>';
        }
      } catch(e) {
        document.getElementById('state-box').innerHTML = '<span class="warning">Status ophalen mislukt.</span>';
      }
    }

    async function checkBookings() {
      const btn = document.getElementById('check-btn');
      const resultEl = document.getElementById('result');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Bezig met controleren...';
      resultEl.style.display = 'none';

      try {
        const r = await fetch('/check', { method: 'POST' });
        const data = await r.json();

        resultEl.style.display = 'block';
        if (data.error) {
          resultEl.className = 'result error';
          resultEl.innerHTML = '<strong>Fout:</strong> ' + data.error;
        } else if (data.processed.length === 0 && data.errors.length === 0) {
          resultEl.className = 'result info';
          resultEl.innerHTML = 'Geen nieuwe boekingen gevonden.';
        } else {
          let html = '';
          if (data.processed.length > 0) {
            html += '<strong>' + data.processed.length + ' boeking(en) verwerkt:</strong>';
            data.processed.forEach(b => {
              html += '<div class="booking-item">&#10003; ' + b.customer + ' — ' + b.workshop + ' (' + b.date + ')</div>';
            });
          }
          if (data.errors.length > 0) {
            html += (html ? '<br>' : '') + '<strong>' + data.errors.length + ' fout(en):</strong>';
            data.errors.forEach(e => { html += '<div>' + (e.customer || e.messageId || '') + ': ' + e.error + '</div>'; });
          }
          resultEl.className = data.errors.length > 0 ? 'result error' : 'result success';
          resultEl.innerHTML = html;
        }
        await loadStatus();
      } catch(e) {
        resultEl.style.display = 'block';
        resultEl.className = 'result error';
        resultEl.innerHTML = 'Verbindingsfout: ' + e.message;
      }

      btn.disabled = false;
      btn.innerHTML = 'Controleer boekingen';
    }

    loadStatus();
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(ADMIN_HTML);
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(loadState()));
    return;
  }

  if (req.method === 'POST' && req.url === '/check') {
    if (isRunning) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Al bezig, even geduld.' }));
      return;
    }
    isRunning = true;
    try {
      const results = await run();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(results));
    } catch (err) {
      logger.error('Verwerkingsfout', { error: err.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    } finally {
      isRunning = false;
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  logger.info(`Admin server gestart op http://localhost:${PORT}`);
  console.log(`\nOpen http://localhost:${PORT} in de browser om boekingen te controleren.\n`);
});
