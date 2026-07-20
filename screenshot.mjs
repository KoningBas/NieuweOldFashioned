import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, 'temporary screenshots');

if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const width = parseInt(process.argv[4]) || 1440;
const fullPage = process.argv[5] !== 'false';

// Auto-increment filename
const existing = fs.readdirSync(screenshotDir).filter(f => f.match(/^screenshot-\d+/));
const nums = existing.map(f => parseInt(f.match(/^screenshot-(\d+)/)?.[1] || '0'));
const next = nums.length ? Math.max(...nums) + 1 : 1;
const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const outPath = path.join(screenshotDir, filename);

const browser = await puppeteer.launch({
  // Laat puppeteer zelf de gedownloade Chrome vinden; CHROME_PATH overschrijft dat.
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width, height: 844, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 2000));
// Scroll slowly to trigger all intersection observers + image loads
const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y <= docHeight; y += 400) {
  await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
  await new Promise(r => setTimeout(r, 200));
}
// Force all fade sections visible
await page.evaluate(() => {
  document.querySelectorAll('.fade-section').forEach(el => el.classList.add('visible'));
});
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: outPath, fullPage });

console.log(`Saved: ${outPath}`);
await browser.close();
