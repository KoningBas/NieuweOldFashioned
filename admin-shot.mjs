// Screenshot harness for the admin panel. The real panel needs a Supabase
// session and a migrated database; neither exists locally, so every request to
// supabase.co is answered from fixtures and a fake session is planted in
// localStorage before the app boots.
//
// Usage: node admin-shot.mjs <route> <label> [light|dark] [expand]

import puppeteer from 'puppeteer';
import path from 'path';

const PROJECT = 'C:/Users/jbfok/Desktop/NieuweOld';
const REF = 'qbfieohnyzjzelbaxbrz';
const CHROME = 'C:/Users/jbfok/.cache/puppeteer/chrome/win64-131.0.6778.204/chrome-win64/chrome.exe';

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const positional = args.filter((a) => !a.startsWith('--'));
const tabFlag = args.find((a) => a.startsWith('--tab='))?.slice('--tab='.length);

const route = positional[0] || 'Overzicht';
const label = positional[1] || 'admin';
const theme = positional[2] || 'dark';
const expand = positional[3] === 'expand';
const width = Number(positional[4]) || 1440;

// --open-first  click the first row of the list, then screenshot the detail
// --tab=Label   click the tab with that label once the screen is up
// --no-list     answer packing_lists empty, for the "nothing generated" state
// --stale       cocktail choice newer than the generated packing list

const USER_ID = '00000000-0000-4000-8000-000000000001';

const SETTINGS = {
  id: 'set-1', business_name: 'The Old Fashioned Bar', business_email: 'info@theoldfashioned.nl',
  business_phone: '06 12 34 56 78', business_address: 'Grotestraat 12, 7461 BZ Rijssen',
  cocktail_price: 8, min_cocktails: 50, workshop_price_per_person: 32,
  travel_fee_near: 0, travel_fee_far: 45, travel_near_km_limit: 25,
  booking_notice_hours: 48, max_guests: 250, created_at: '2026-01-01T00:00:00Z',
  kvk_number: '87654321', vat_number: 'NL004567890B01', iban: 'NL91 ABNA 0417 1643 00',
  quote_valid_days: 14, invoice_due_days: 14, vat_rate: 21, nudge_new_days: 3, nudge_quote_days: 7,
};

const PACKAGES = [
  { id: 'pkg-1', package_name: 'Bartending op Locatie', description: 'Professionele bartenders verzorgen een complete cocktailervaring op jouw feest of evenement.', price: 8, price_unit: 'per_cocktail', min_quantity: 50, category: 'bartending', is_featured: true, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'pkg-2', package_name: 'Workshop op Locatie', description: 'Leer onder begeleiding van onze bartender twee cocktails maken, inclusief shots en materialen.', price: 32, price_unit: 'per_person', min_quantity: 4, category: 'workshop', is_featured: true, is_active: true, created_at: '2026-01-02T00:00:00Z' },
  { id: 'pkg-3', package_name: 'Proeverij aan de bar', description: 'Vijf cocktails aan onze eigen bar, met verhaal per glas.', price: 45, price_unit: 'per_person', min_quantity: 6, category: 'workshop', is_featured: false, is_active: false, created_at: '2026-01-03T00:00:00Z' },
];

const COCKTAILS = [
  { id: 'ck-1', name: 'The Old Fashioned', description: 'Bourbon, huisgemaakte bitters en een vleugje sinaasappel.', category: 'signature', is_featured: true, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'ck-2', name: 'Smoked Negroni', description: 'Een verfijnde twist op de klassieker, licht gerookt voor extra diepte.', category: 'signature', is_featured: true, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'ck-3', name: 'Espresso Martini', description: 'Wodka, verse espresso en koffielikeur.', category: 'klassiek', is_featured: false, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'ck-4', name: 'Winterse Punch', description: 'Seizoenscocktail, alleen in de wintermaanden.', category: 'seizoen', is_featured: false, is_active: false, created_at: '2026-01-01T00:00:00Z' },
];

const INGREDIENTS = [
  { id: 'ing-1', cocktail_id: 'ck-1', name: 'Bourbon', amount: 60, unit: 'ml', category: 'sterke_drank', perishability: 'houdbaar', pack_size: 700, pack_unit: 'fles', sort_order: 0 },
  { id: 'ing-2', cocktail_id: 'ck-1', name: 'Suikersiroop', amount: 10, unit: 'ml', category: 'mixers', perishability: 'houdbaar', pack_size: 750, pack_unit: 'fles', sort_order: 1 },
  { id: 'ing-3', cocktail_id: 'ck-1', name: 'Sinaasappel', amount: 0.2, unit: 'st', category: 'vers', perishability: 'vers', pack_size: null, pack_unit: null, sort_order: 2 },
  { id: 'ing-4', cocktail_id: 'ck-1', name: 'IJsblokken', amount: 120, unit: 'g', category: 'ijs', perishability: 'diepvries', pack_size: 2000, pack_unit: 'zak', sort_order: 3 },
];

const TEMPLATE = { id: 'tpl-1', package_id: 'pkg-1', name: 'Basislijst Bartending op Locatie', created_at: '2026-01-01T00:00:00Z' };

const TEMPLATE_ITEMS = [
  ['Shakers', 'barmateriaal', 'houdbaar', 'st', 'fixed', 4, 10],
  ['Jiggers', 'barmateriaal', 'houdbaar', 'st', 'fixed', 4, 11],
  ['Barlepels', 'barmateriaal', 'houdbaar', 'st', 'fixed', 2, 12],
  ['Highball glazen', 'glaswerk', 'houdbaar', 'st', 'per_guest', 1.5, 20],
  ['Coupe glazen', 'glaswerk', 'houdbaar', 'st', 'per_guest', 0.75, 21],
  ['IJsblokjes', 'ijs', 'diepvries', 'kg', 'per_cocktail', 0.25, 30],
  ['Rietjes', 'verbruik', 'houdbaar', 'st', 'per_cocktail', 1, 40],
  ['Mobiele bar', 'techniek', 'houdbaar', 'st', 'fixed', 1, 50],
].map(([name, category, perishability, unit, scale_basis, scale_factor, sort_order], i) => ({
  id: `tpi-${i}`, template_id: 'tpl-1', name, category, perishability, unit, scale_basis, scale_factor, sort_order,
}));

// The base kit every on-location job takes along (packing_templates.package_id null).
const BASE_TEMPLATE = { id: 'tpl-base', package_id: null, name: 'Basisuitrusting op locatie', created_at: '2026-01-01T00:00:00Z' };

const BASE_TEMPLATE_ITEMS = [
  ['Mobiele bar', 'techniek', 'houdbaar', 'st', 'fixed', 1, 50],
  ['Barverlichting', 'techniek', 'houdbaar', 'st', 'fixed', 1, 51],
  ['Verlengsnoeren', 'techniek', 'houdbaar', 'st', 'fixed', 2, 52],
  ['Koelboxen', 'barmateriaal', 'houdbaar', 'st', 'fixed', 2, 53],
  ['Snijplank + mes', 'barmateriaal', 'houdbaar', 'st', 'fixed', 1, 54],
  ['Bardoeken', 'verbruik', 'houdbaar', 'st', 'fixed', 6, 55],
  ['Emmer', 'barmateriaal', 'houdbaar', 'st', 'fixed', 1, 60],
  ['Sopje: afwasmiddel', 'verbruik', 'houdbaar', 'st', 'fixed', 1, 61],
  ['Sponzen', 'verbruik', 'houdbaar', 'st', 'fixed', 3, 62],
  ['Theedoeken', 'verbruik', 'houdbaar', 'st', 'fixed', 4, 63],
  ['Afvalzakken', 'verbruik', 'houdbaar', 'st', 'fixed', 10, 66],
  ['EHBO-koffer', 'barmateriaal', 'houdbaar', 'st', 'fixed', 1, 70],
].map(([name, category, perishability, unit, scale_basis, scale_factor, sort_order], i) => ({
  id: `btpi-${i}`, template_id: 'tpl-base', name, category, perishability, unit, scale_basis, scale_factor, sort_order,
}));

const GENERATED_AT = '2026-07-14T09:00:00Z';
const REQUEST = {
  id: 'req-1', full_name: 'Marieke de Vries', email: 'marieke@voorbeeld.nl', phone: '06 24 88 13 09',
  event_type: 'Bedrijfsborrel', guest_count: 80, cocktail_count: 200, package_id: 'pkg-1',
  event_date: '2026-09-12', event_time: '17:00:00', event_city: 'Rijssen', event_postcode: '7461 BZ',
  distance_km: 4, estimated_total: 1600, status: 'booked', special_requests: 'Graag twee alcoholvrije opties.',
  created_at: '2026-07-01T10:00:00Z', source: 'wizard_locatie', event_address: 'Grotestraat 12',
  arrangement: 'Bites', internal_notes: null,
  cocktails_updated_at: flags.has('--stale') ? '2026-07-18T14:00:00Z' : '2026-07-14T08:00:00Z',
};

const REQUEST_COCKTAILS = [
  { id: 'rc-1', request_id: 'req-1', cocktail_id: 'ck-1', planned_count: 80, cocktail_menu: { name: 'The Old Fashioned' } },
  { id: 'rc-2', request_id: 'req-1', cocktail_id: 'ck-2', planned_count: 60, cocktail_menu: { name: 'Smoked Negroni' } },
  { id: 'rc-3', request_id: 'req-1', cocktail_id: 'ck-3', planned_count: 60, cocktail_menu: { name: 'Espresso Martini' } },
];

const PACKING_LIST = { id: 'pl-1', request_id: 'req-1', notes: null, generated_at: GENERATED_AT, created_at: GENERATED_AT };

const PACKING_LIST_ITEMS = [
  ['Bourbon', 'sterke_drank', 'houdbaar', 7, 'fles', true, 'cocktails', 100],
  ['Suikersiroop', 'mixers', 'houdbaar', 2, 'fles', true, 'cocktails', 101],
  ['Sinaasappel', 'vers', 'vers', 16, 'st', false, 'cocktails', 102],
  ['IJsblokken', 'ijs', 'diepvries', 5, 'zak', false, 'cocktails', 103],
  ['Highball glazen', 'glaswerk', 'houdbaar', 120, 'st', true, 'scaling', 20],
  ['Coupe glazen', 'glaswerk', 'houdbaar', 60, 'st', false, 'scaling', 21],
  ['Shakers', 'barmateriaal', 'houdbaar', 4, 'st', true, 'template', 10],
  ['Snijplank + mes', 'barmateriaal', 'houdbaar', 1, 'st', false, 'template', 54],
  ['Koelboxen', 'barmateriaal', 'houdbaar', 2, 'st', false, 'template', 53],
  ['EHBO-koffer', 'barmateriaal', 'houdbaar', 1, 'st', false, 'template', 70],
  ['Bardoeken', 'verbruik', 'houdbaar', 6, 'st', true, 'template', 55],
  ['Sponzen', 'verbruik', 'houdbaar', 3, 'st', false, 'template', 62],
  ['Afvalzakken', 'verbruik', 'houdbaar', 10, 'st', false, 'template', 66],
  ['Mobiele bar', 'techniek', 'houdbaar', 1, 'st', true, 'template', 50],
  ['Verlengsnoeren', 'techniek', 'houdbaar', 2, 'st', false, 'template', 52],
].map(([name, category, perishability, quantity, unit, is_checked, origin, sort_order], i) => ({
  id: `pli-${i}`, list_id: 'pl-1', name, category, perishability, quantity, unit, is_checked, origin, sort_order,
}));

/** Table name -> rows. Anything unlisted answers with an empty set. */
const TABLES = {
  admin_users: [{ id: 'adm-1', user_id: USER_ID, created_at: '2026-01-01T00:00:00Z' }],
  service_settings: [SETTINGS],
  service_packages: PACKAGES,
  cocktail_menu: COCKTAILS,
  cocktail_ingredients: INGREDIENTS,
  // Order matters: a limit=1 query takes the first row, so put the template the
  // screen under test is asking for in front.
  packing_templates: tabFlag === 'Basisuitrusting' ? [BASE_TEMPLATE, TEMPLATE] : [TEMPLATE, BASE_TEMPLATE],
  // The fixture responder ignores filters, so pick the set the screen expects.
  packing_template_items: tabFlag === 'Basisuitrusting' ? BASE_TEMPLATE_ITEMS : TEMPLATE_ITEMS,
  quote_requests: [REQUEST],
  request_cocktails: REQUEST_COCKTAILS,
  packing_lists: flags.has('--no-list') ? [] : [PACKING_LIST],
  packing_list_items: flags.has('--no-list') ? [] : PACKING_LIST_ITEMS,
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });

await page.evaluateOnNewDocument((ref, userId, themeName) => {
  const oneYear = Math.floor(Date.now() / 1000) + 31536000;
  localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({
    access_token: 'fixture-token', token_type: 'bearer', expires_in: 31536000, expires_at: oneYear,
    refresh_token: 'fixture-refresh',
    user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'beheer@theoldfashioned.nl', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  }));
  localStorage.setItem('admin-theme', themeName);
}, REF, USER_ID, theme);

if (flags.has('--debug')) {
  page.on('console', (msg) => console.log(`[console.${msg.type()}]`, msg.text()));
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));
  page.on('requestfailed', (req) => console.log('[requestfailed]', req.url(), req.failure()?.errorText));
}

await page.setRequestInterception(true);
page.on('request', (req) => {
  const url = req.url();
  if (!url.includes('supabase.co')) return req.continue();

  // supabase-js sends apikey/authorization, so the browser runs a preflight;
  // without these headers every fixture response is discarded as a CORS error.
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Expose-Headers': '*',
  };

  if (req.method() === 'OPTIONS') {
    return req.respond({ status: 204, headers: CORS, body: '' });
  }

  const wantsObject = (req.headers().accept || '').includes('pgrst.object');
  const json = (body, status = 200) => req.respond({
    status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body),
  });

  if (url.includes('/auth/v1/')) {
    return json({ id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'beheer@theoldfashioned.nl', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' });
  }

  const table = url.match(/\/rest\/v1\/([^?]+)/)?.[1];
  // Filters are ignored, but limit is not: maybeSingle() rejects a two-row
  // answer, so a fixture table with more rows than the query asked for breaks
  // the screen under test rather than the screenshot.
  const limit = Number(url.match(/[?&]limit=(\d+)/)?.[1]);
  const all = TABLES[table] ?? [];
  const rows = limit ? all.slice(0, limit) : all;
  if (flags.has('--debug')) console.log('[fixture]', req.method(), url.replace(/.*\/rest\/v1\//, ''), `-> ${rows.length} rows`, wantsObject ? '(object)' : '');
  return json(wantsObject ? (rows[0] ?? null) : rows);
});

// Deep links would need a dev-server history fallback; clicking the sidebar is
// both simpler and closer to how the screen is actually reached.
await page.goto('http://localhost:3000/admin/', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 1000));

const navigated = await page.evaluate((navLabel) => {
  const link = [...document.querySelectorAll('nav a')].find((a) => a.textContent.trim() === navLabel);
  if (!link) return false;
  link.click();
  return true;
}, route);
if (!navigated) throw new Error(`Geen navigatielink gevonden met label "${route}"`);
await new Promise((r) => setTimeout(r, 1200));

if (flags.has('--open-first')) {
  const opened = await page.evaluate(() => {
    const row = (document.querySelector('main') ?? document.body).querySelector('ul a[href]');
    if (!row) return false;
    row.click();
    return true;
  });
  if (!opened) throw new Error('Geen rij gevonden om te openen');
  await new Promise((r) => setTimeout(r, 1200));
}

if (tabFlag) {
  const switched = await page.evaluate((tabLabel) => {
    const tab = [...document.querySelectorAll('[role="tab"]')].find((t) => t.textContent.trim() === tabLabel);
    if (!tab) return false;
    tab.click();
    return true;
  }, tabFlag);
  if (!switched) throw new Error(`Geen tab gevonden met label "${tabFlag}"`);
  await new Promise((r) => setTimeout(r, 1200));
}

if (expand) {
  // Scoped to the content column: the mobile nav also carries aria-expanded,
  // and at desktop width that button is hidden and unclickable.
  const opened = await page.evaluate(() => {
    const scope = document.querySelector('main') ?? document.body;
    const toggle = scope.querySelector('button[aria-expanded="false"]');
    if (!toggle) return false;
    toggle.click();
    return true;
  });
  if (!opened) throw new Error('Geen uitklapknop gevonden in de contentkolom');
  await new Promise((r) => setTimeout(r, 900));
}

const out = path.join(PROJECT, 'temporary screenshots', `admin-${label}-${theme}.png`);
await page.screenshot({ path: out, fullPage: true });
console.log(out);

await browser.close();
