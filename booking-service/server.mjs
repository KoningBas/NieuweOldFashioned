import http from 'http';
import { run } from './processor.mjs';
import { loadState } from './state.mjs';
import { logger } from './logger.mjs';
import { getOAuthClient } from './auth.mjs';
import { listMonthEvents, updateCalendarEvent, deleteCalendarEvent, parseEventSummary, parseEventDescription } from './calendar.mjs';

const PORT = parseInt(process.env.ADMIN_PORT || '3001', 10);
let isRunning = false;

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

function eventToBooking(event) {
  const { workshopName, customerName, personCount } = parseEventSummary(event.summary);
  const { customerPhone, notes } = parseEventDescription(event.description);
  const start = event.start?.dateTime || event.start?.date || '';
  return {
    id: event.id,
    workshopName,
    customerName,
    personCount,
    customerPhone,
    notes,
    start,
    colorId: event.colorId || '9',
    htmlLink: event.htmlLink,
  };
}

const COLOR_LABELS = { '5': '#F6BF26', '9': '#4A548D', '6': '#F4511E', '10': '#0B8043', '11': '#D50000', '3': '#8E24AA', '4': '#E67C73' };

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Workshop Beheer — The Old Fashioned</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0c0c0c; --surface: #161616; --surface2: #1e1e1e; --border: #272727;
      --gold: #C8922A; --gold-light: #d9a43d; --text: #e8e0d4; --muted: #6b6560;
      --green: #4caf50; --red: #e57373; --orange: #ff9800;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
    header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 16px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
    header h1 { font-size: 17px; font-weight: 600; color: var(--gold); }
    header span { font-size: 12px; color: var(--muted); }
    .main { max-width: 960px; margin: 0 auto; padding: 28px 20px; }

    /* Month nav */
    .month-nav { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
    .month-nav h2 { font-size: 22px; font-weight: 700; flex: 1; }
    .nav-btn { background: var(--surface2); border: 1px solid var(--border); color: var(--text); width: 36px; height: 36px; border-radius: 8px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: background .15s; }
    .nav-btn:hover { background: var(--border); }
    .check-btn { background: var(--gold); color: #0c0c0c; border: none; padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s; }
    .check-btn:hover { background: var(--gold-light); }
    .check-btn:disabled { background: #3a3020; color: #5a4a30; cursor: not-allowed; }

    /* Bookings grid */
    .bookings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    .empty-state { text-align: center; color: var(--muted); padding: 60px 0; font-size: 15px; grid-column: 1/-1; }

    /* Booking card */
    .booking-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; cursor: pointer; transition: border-color .15s, transform .1s; }
    .booking-card:hover { border-color: var(--gold); transform: translateY(-1px); }
    .card-color-bar { height: 4px; }
    .card-body { padding: 16px; }
    .card-workshop { font-size: 13px; font-weight: 600; color: var(--gold); margin-bottom: 6px; text-transform: uppercase; letter-spacing: .04em; }
    .card-name { font-size: 17px; font-weight: 600; margin-bottom: 4px; }
    .card-date { font-size: 13px; color: var(--muted); margin-bottom: 12px; }
    .card-meta { display: flex; gap: 16px; font-size: 12px; color: var(--muted); }
    .card-meta span { display: flex; align-items: center; gap: 4px; }

    /* Toast */
    .toast { position: fixed; bottom: 24px; right: 24px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 12px 18px; font-size: 13px; opacity: 0; transform: translateY(8px); transition: opacity .2s, transform .2s; pointer-events: none; z-index: 100; }
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast.success { border-color: #2e5a2e; color: var(--green); }
    .toast.error { border-color: #5a2e2e; color: var(--red); }

    /* Modal overlay */
    .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 50; align-items: center; justify-content: center; padding: 20px; }
    .modal-overlay.open { display: flex; }
    .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
    .modal-header { padding: 20px 24px 0; display: flex; align-items: center; justify-content: space-between; }
    .modal-header h3 { font-size: 17px; font-weight: 600; }
    .modal-close { background: none; border: none; color: var(--muted); font-size: 20px; cursor: pointer; line-height: 1; padding: 4px; }
    .modal-close:hover { color: var(--text); }
    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 12px; color: var(--muted); font-weight: 500; letter-spacing: .03em; }
    .field input, .field select, .field textarea { background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 8px; padding: 10px 12px; font-size: 14px; font-family: inherit; transition: border-color .15s; }
    .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--gold); }
    .field select option { background: var(--surface2); }
    .field textarea { resize: vertical; min-height: 72px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .modal-footer { padding: 0 24px 20px; display: flex; gap: 10px; }
    .btn { flex: 1; padding: 11px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: background .15s; }
    .btn-save { background: var(--gold); color: #0c0c0c; }
    .btn-save:hover { background: var(--gold-light); }
    .btn-cancel-booking { background: transparent; border: 1px solid #5a2e2e; color: var(--red); }
    .btn-cancel-booking:hover { background: #1f0d0d; }
    .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--border); }
    .spinner { display: inline-block; width: 13px; height: 13px; border: 2px solid #5a4a30; border-top-color: var(--gold); border-radius: 50%; animation: spin .7s linear infinite; vertical-align: middle; margin-right: 6px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <header>
    <h1>Workshop Beheer — The Old Fashioned</h1>
    <span id="last-check">—</span>
  </header>

  <div class="main">
    <div class="month-nav">
      <button class="nav-btn" onclick="changeMonth(-1)">&#8592;</button>
      <h2 id="month-label">—</h2>
      <button class="nav-btn" onclick="changeMonth(1)">&#8594;</button>
      <button class="check-btn" id="check-btn" onclick="checkBookings()">&#8635; Nieuwe boekingen ophalen</button>
    </div>
    <div class="bookings-grid" id="grid">
      <div class="empty-state">Laden...</div>
    </div>
  </div>

  <!-- Edit modal -->
  <div class="modal-overlay" id="modal">
    <div class="modal">
      <div class="modal-header">
        <h3>Boeking bewerken</h3>
        <button class="modal-close" onclick="closeModal()">&#215;</button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="edit-id">
        <div class="field">
          <label>WORKSHOP TYPE</label>
          <select id="edit-workshop">
            <option value="Cocktails &amp; Bites">Cocktails &amp; Bites</option>
            <option value="Cocktails &amp; Streetfood">Cocktails &amp; Streetfood</option>
          </select>
        </div>
        <div class="field-row">
          <div class="field">
            <label>NAAM KLANT</label>
            <input type="text" id="edit-name" placeholder="Naam">
          </div>
          <div class="field">
            <label>PERSONEN</label>
            <input type="number" id="edit-persons" min="1" placeholder="8">
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>DATUM &amp; TIJD</label>
            <input type="datetime-local" id="edit-datetime">
          </div>
          <div class="field">
            <label>TELEFOON</label>
            <input type="tel" id="edit-phone" placeholder="06...">
          </div>
        </div>
        <div class="field">
          <label>NOTITIES (intern)</label>
          <textarea id="edit-notes" placeholder="Interne aantekeningen..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-cancel-booking" onclick="confirmCancel()">Annuleren</button>
        <button class="btn btn-secondary" onclick="closeModal()">Sluiten</button>
        <button class="btn btn-save" id="save-btn" onclick="saveBooking()">Opslaan</button>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const NL_MONTHS = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
    const NL_DAYS = ['zo','ma','di','wo','do','vr','za'];
    const COLOR_MAP = {'5':'#F6BF26','9':'#4A548D','6':'#F4511E','10':'#0B8043','11':'#D50000','3':'#8E24AA','4':'#E67C73'};
    const DEFAULT_COLOR = '#4A548D';

    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth() + 1;
    let bookings = [];

    function fmt(isoStr) {
      if (!isoStr) return '—';
      const d = new Date(isoStr);
      return NL_DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + NL_MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ' om ' + d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
    }

    function toLocalInputValue(isoStr) {
      if (!isoStr) return '';
      const d = new Date(isoStr);
      const pad = n => String(n).padStart(2,'0');
      return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function updateMonthLabel() {
      document.getElementById('month-label').textContent = NL_MONTHS[currentMonth-1] + ' ' + currentYear;
    }

    function changeMonth(dir) {
      currentMonth += dir;
      if (currentMonth > 12) { currentMonth = 1; currentYear++; }
      if (currentMonth < 1) { currentMonth = 12; currentYear--; }
      loadBookings();
    }

    async function loadBookings() {
      updateMonthLabel();
      const grid = document.getElementById('grid');
      grid.innerHTML = '<div class="empty-state"><span class="spinner"></span>Laden...</div>';
      try {
        const r = await fetch('/bookings?year=' + currentYear + '&month=' + currentMonth);
        bookings = await r.json();
        renderGrid();
      } catch(e) {
        grid.innerHTML = '<div class="empty-state" style="color:var(--red)">Fout bij laden: ' + e.message + '</div>';
      }
    }

    function renderGrid() {
      const grid = document.getElementById('grid');
      if (!bookings.length) {
        grid.innerHTML = '<div class="empty-state">Geen workshops deze maand.</div>';
        return;
      }
      grid.innerHTML = bookings.map((b,i) => {
        const color = COLOR_MAP[b.colorId] || DEFAULT_COLOR;
        return '<div class="booking-card" onclick="openEdit(' + i + ')">' +
          '<div class="card-color-bar" style="background:' + color + '"></div>' +
          '<div class="card-body">' +
            '<div class="card-workshop">' + (b.workshopName || '—') + '</div>' +
            '<div class="card-name">' + (b.customerName || '—') + '</div>' +
            '<div class="card-date">' + fmt(b.start) + '</div>' +
            '<div class="card-meta">' +
              '<span>&#128100; ' + (b.personCount || '?') + ' pers.</span>' +
              (b.customerPhone ? '<span>&#128222; ' + b.customerPhone + '</span>' : '') +
            '</div>' +
          '</div></div>';
      }).join('');
    }

    function openEdit(i) {
      const b = bookings[i];
      document.getElementById('edit-id').value = b.id;
      document.getElementById('edit-workshop').value = b.workshopName || 'Cocktails & Streetfood';
      document.getElementById('edit-name').value = b.customerName || '';
      document.getElementById('edit-persons').value = b.personCount || '';
      document.getElementById('edit-datetime').value = toLocalInputValue(b.start);
      document.getElementById('edit-phone').value = b.customerPhone || '';
      document.getElementById('edit-notes').value = b.notes || '';
      document.getElementById('modal').classList.add('open');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('open');
    }

    async function saveBooking() {
      const btn = document.getElementById('save-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Opslaan...';
      const id = document.getElementById('edit-id').value;
      const payload = {
        workshopName: document.getElementById('edit-workshop').value,
        customerName: document.getElementById('edit-name').value,
        personCount: document.getElementById('edit-persons').value,
        customerPhone: document.getElementById('edit-phone').value,
        notes: document.getElementById('edit-notes').value,
        startDateTime: document.getElementById('edit-datetime').value,
      };
      try {
        const r = await fetch('/bookings/' + encodeURIComponent(id), { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        if (!r.ok) throw new Error(await r.text());
        showToast('Boeking opgeslagen', 'success');
        closeModal();
        await loadBookings();
      } catch(e) {
        showToast('Fout: ' + e.message, 'error');
      }
      btn.disabled = false;
      btn.innerHTML = 'Opslaan';
    }

    async function confirmCancel() {
      if (!confirm('Weet je zeker dat je deze boeking wilt annuleren? Het calendar event wordt verwijderd.')) return;
      const id = document.getElementById('edit-id').value;
      try {
        const r = await fetch('/bookings/' + encodeURIComponent(id), { method: 'DELETE' });
        if (!r.ok) throw new Error(await r.text());
        showToast('Boeking geannuleerd', 'success');
        closeModal();
        await loadBookings();
      } catch(e) {
        showToast('Fout: ' + e.message, 'error');
      }
    }

    async function checkBookings() {
      const btn = document.getElementById('check-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Bezig...';
      try {
        const r = await fetch('/check', { method: 'POST' });
        const data = await r.json();
        if (data.error) showToast('Fout: ' + data.error, 'error');
        else if (data.processed.length === 0) showToast('Geen nieuwe boekingen', 'success');
        else showToast(data.processed.length + ' boeking(en) verwerkt', 'success');
        await loadBookings();
      } catch(e) {
        showToast('Fout: ' + e.message, 'error');
      }
      btn.disabled = false;
      btn.innerHTML = '&#8635; Nieuwe boekingen ophalen';
    }

    let toastTimer;
    function showToast(msg, type = 'success') {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast show ' + type;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { t.className = 'toast'; }, 3000);
    }

    document.getElementById('modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    loadBookings();
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(ADMIN_HTML);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(loadState()));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/bookings') {
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear(), 10);
    const month = parseInt(url.searchParams.get('month') || (new Date().getMonth() + 1), 10);
    try {
      const auth = getOAuthClient();
      const events = await listMonthEvents(auth, year, month);
      const bookings = events.map(eventToBooking);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(bookings));
    } catch (err) {
      logger.error('Fout bij ophalen events', { error: err.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  const editMatch = url.pathname.match(/^\/bookings\/(.+)$/);

  if (req.method === 'PUT' && editMatch) {
    const eventId = decodeURIComponent(editMatch[1]);
    try {
      const body = await parseBody(req);
      const auth = getOAuthClient();
      await updateCalendarEvent(auth, eventId, body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      logger.error('Fout bij updaten event', { error: err.message, eventId });
      res.writeHead(500);
      res.end(err.message);
    }
    return;
  }

  if (req.method === 'DELETE' && editMatch) {
    const eventId = decodeURIComponent(editMatch[1]);
    try {
      const auth = getOAuthClient();
      await deleteCalendarEvent(auth, eventId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      logger.error('Fout bij verwijderen event', { error: err.message, eventId });
      res.writeHead(500);
      res.end(err.message);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/check') {
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
  console.log(`\nOpen http://localhost:${PORT} in de browser.\n`);
});
