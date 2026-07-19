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

const route = process.argv[2] || 'Overzicht';
const label = process.argv[3] || 'admin';
const theme = process.argv[4] || 'dark';
const expand = process.argv[5] === 'expand';
const width = Number(process.argv[6]) || 1440;

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

/** Table name -> rows. Anything unlisted answers with an empty set. */
const TABLES = {
  admin_users: [{ id: 'adm-1', user_id: USER_ID, created_at: '2026-01-01T00:00:00Z' }],
  service_settings: [SETTINGS],
  service_packages: PACKAGES,
  cocktail_menu: COCKTAILS,
  cocktail_ingredients: INGREDIENTS,
  packing_templates: [TEMPLATE],
  packing_template_items: TEMPLATE_ITEMS,
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
  const rows = TABLES[table] ?? [];
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
