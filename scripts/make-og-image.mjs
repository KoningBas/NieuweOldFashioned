/**
 * Bouwt OldImages/og-image.png: de deelafbeelding voor WhatsApp, Facebook en LinkedIn.
 *
 * Waarom een gegenereerd bestand en niet het logo zelf: Logooldfashioned.png is
 * 250x170 met transparantie. Facebook toont pas een grote kaart vanaf 600x315 en
 * negeert afbeeldingen onder 200x200; transparante PNG's worden per platform op
 * wit of zwart geplakt. Dit script zet het logo daarom op een vaste 1200x630
 * achtergrond in de huisstijlkleur.
 *
 * Draaien: node scripts/make-og-image.mjs
 */
import puppeteer from 'puppeteer';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const logo = readFileSync(path.join(root, 'OldImages/Logooldfashioned.png')).toString('base64');
const out = path.join(root, 'OldImages/og-image.png');

// Het logo is 250x170. Meer dan ~2x opschalen maakt de gouden krullen zichtbaar
// zacht, dus 500px breed is de bovengrens tot er een hi-res bronbestand is.
const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; }
  body {
    width: 1200px; height: 630px;
    display: flex; align-items: center; justify-content: center;
    background-color: #0D0D0D;
    background-image:
      radial-gradient(ellipse 70% 55% at 50% 45%, rgba(200,146,42,0.18), transparent 70%),
      radial-gradient(ellipse 45% 40% at 50% 50%, rgba(200,146,42,0.10), transparent 65%),
      radial-gradient(ellipse 100% 80% at 50% 120%, rgba(0,0,0,0.55), transparent 60%);
  }
  img { width: 500px; height: auto; display: block; }
</style></head>
<body><img src="data:image/png;base64,${logo}" alt=""></body></html>`;

const browser = await puppeteer.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.screenshot({ path: out });
await browser.close();

console.log(`Saved: ${out}`);
