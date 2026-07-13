import puppeteer from 'puppeteer';
import path from 'path';

const outDir = 'C:/Users/jbfok/Desktop/NieuweOld/temporary screenshots';
const url = process.argv[2];
const selector = process.argv[3];
const label = process.argv[4];
const width = parseInt(process.argv[5]) || 1440;

const browser = await puppeteer.launch({
  executablePath: 'C:/Users/jbfok/.cache/puppeteer/chrome/win64-131.0.6778.204/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width, height: 900 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 1500));

const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y <= docHeight; y += 400) {
  await page.evaluate((sy) => window.scrollTo(0, sy), y);
  await new Promise((r) => setTimeout(r, 150));
}
await page.evaluate(() => window.scrollTo(0, 0));
await new Promise((r) => setTimeout(r, 800));

const el = await page.$(selector);
const out = path.join(outDir, `crop-${label}.png`);
await el.screenshot({ path: out });
console.log('Saved:', out);
await browser.close();
