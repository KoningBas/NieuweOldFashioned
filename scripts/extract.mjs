/**
 * Extraction script for https://www.thecocktailclub.com
 * Captures DOM structure, CSS values, content, assets, and behaviors
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const TARGET = 'https://www.thecocktailclub.com';

const CHROME = 'C:/Users/jbfok/.cache/puppeteer/chrome/win64-131.0.6778.204/chrome-win64/chrome.exe';

async function launch(width = 1440) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  return { browser, page };
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));
}

function save(relPath, content) {
  const full = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (typeof content === 'string') {
    fs.writeFileSync(full, content, 'utf8');
  } else {
    fs.writeFileSync(full, JSON.stringify(content, null, 2), 'utf8');
  }
  console.log('Saved:', relPath);
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlink(dest, () => {});
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

const EXTRACT_STYLES_FN = `
function extractAll(selector) {
  const el = document.querySelector(selector);
  if (!el) return { error: 'not found: ' + selector };
  const props = [
    'fontSize','fontWeight','fontFamily','lineHeight','letterSpacing','color',
    'textTransform','textDecoration','backgroundColor','background',
    'padding','paddingTop','paddingRight','paddingBottom','paddingLeft',
    'margin','marginTop','marginRight','marginBottom','marginLeft',
    'width','height','maxWidth','minWidth','maxHeight','minHeight',
    'display','flexDirection','justifyContent','alignItems','gap','flexWrap',
    'gridTemplateColumns','gridTemplateRows','gridColumn','gridRow',
    'borderRadius','border','borderTop','borderBottom','borderLeft','borderRight',
    'boxShadow','overflow','overflowX','overflowY',
    'position','top','right','bottom','left','zIndex',
    'opacity','transform','transition','cursor',
    'objectFit','objectPosition','mixBlendMode','filter','backdropFilter',
    'whiteSpace','textOverflow','WebkitLineClamp','webkitLineClamp',
    'aspectRatio','scrollSnapType','scrollSnapAlign'
  ];
  function extractStyles(element) {
    const cs = getComputedStyle(element);
    const styles = {};
    props.forEach(p => {
      const v = cs[p];
      if (v && v !== 'none' && v !== 'normal' && v !== 'auto' && v !== '0px' && v !== 'rgba(0, 0, 0, 0)' && v !== '' && v !== 'visible') {
        styles[p] = v;
      }
    });
    return styles;
  }
  function walk(element, depth) {
    if (depth > 5) return null;
    const children = [...element.children];
    const cs = getComputedStyle(element);
    let bgImg = cs.backgroundImage;
    if (bgImg === 'none') bgImg = null;
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: element.className?.toString().split(' ').filter(Boolean).slice(0, 8).join(' ') || null,
      text: element.childElementCount === 0 ? element.textContent.trim().slice(0, 300) : null,
      href: element.href || null,
      src: element.src || element.currentSrc || null,
      alt: element.alt || null,
      bgImage: bgImg,
      styles: extractStyles(element),
      childCount: children.length,
      children: children.slice(0, 30).map(c => walk(c, depth + 1)).filter(Boolean)
    };
  }
  return walk(el, 0);
}
`;

async function extractSection(page, selector) {
  return page.evaluate(`
    (function() {
      ${EXTRACT_STYLES_FN}
      return JSON.stringify(extractAll('${selector}'));
    })()
  `).then(r => JSON.parse(r));
}

// ============================================================
// MAIN
// ============================================================
console.log('=== Starting extraction of', TARGET, '===\n');

const { browser: b1, page: p1 } = await launch(1440);
await goto(p1, TARGET);
console.log('Page loaded at 1440px');

// --- Screenshot desktop full page ---
await p1.screenshot({ path: path.join(ROOT, 'docs/design-references/desktop-full.png'), fullPage: true });
console.log('Screenshot: desktop-full.png');

// --- Basic page info ---
const pageInfo = await p1.evaluate(() => {
  return {
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.content,
    metaOG: [...document.querySelectorAll('meta[property^="og:"]')].map(m => ({ prop: m.getAttribute('property'), content: m.content })),
    fonts: [...document.querySelectorAll('link[href*="font"]')].map(l => l.href),
    scripts: [...document.querySelectorAll('script[src]')].map(s => s.src).filter(s => !s.includes('analytics') && !s.includes('gtag')),
    hasLenis: !!document.querySelector('.lenis') || !!document.querySelector('[data-lenis]'),
    hasLocomotiveScroll: !!document.querySelector('.locomotive-scroll') || !!document.querySelector('[data-scroll-container]'),
    scrollSnapType: getComputedStyle(document.documentElement).scrollSnapType,
    bodyOverflow: getComputedStyle(document.body).overflow,
    bodyFontFamily: getComputedStyle(document.body).fontFamily,
    bodyFontSize: getComputedStyle(document.body).fontSize,
    bodyColor: getComputedStyle(document.body).color,
    bodyBackground: getComputedStyle(document.body).background,
  };
});
save('docs/research/page-info.json', pageInfo);

// --- Asset discovery ---
const assets = await p1.evaluate(() => {
  const images = [...document.querySelectorAll('img')].map(img => ({
    src: img.src || img.currentSrc,
    alt: img.alt,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    loading: img.loading,
    classes: img.className,
    parentClasses: img.parentElement?.className?.toString().slice(0, 100),
    position: getComputedStyle(img).position,
    zIndex: getComputedStyle(img).zIndex,
    objectFit: getComputedStyle(img).objectFit,
  }));
  const videos = [...document.querySelectorAll('video')].map(v => ({
    src: v.src || v.querySelector?.('source')?.src,
    poster: v.poster,
    autoplay: v.autoplay,
    loop: v.loop,
    muted: v.muted,
    classes: v.className,
  }));
  const bgImages = [...document.querySelectorAll('*')].filter(el => {
    const bg = getComputedStyle(el).backgroundImage;
    return bg && bg !== 'none' && bg.includes('url');
  }).map(el => ({
    url: getComputedStyle(el).backgroundImage,
    element: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.toString().split(' ')[0] : ''),
    size: getComputedStyle(el).backgroundSize,
    position: getComputedStyle(el).backgroundPosition,
  }));
  const svgs = [...document.querySelectorAll('svg')].map(svg => ({
    outerHTML: svg.outerHTML.slice(0, 500),
    viewBox: svg.getAttribute('viewBox'),
    classes: svg.className?.toString(),
    width: svg.getAttribute('width'),
    height: svg.getAttribute('height'),
  }));
  const favicons = [...document.querySelectorAll('link[rel*="icon"]')].map(l => ({
    href: l.href, rel: l.rel, sizes: l.sizes?.toString()
  }));
  const fonts = [...new Set([...document.querySelectorAll('*')].slice(0, 500).map(el => getComputedStyle(el).fontFamily))];
  return { images, videos, bgImages, svgs: svgs.slice(0, 20), favicons, fonts };
});
save('docs/research/assets.json', assets);

// --- Color extraction ---
const colors = await p1.evaluate(() => {
  const elements = [...document.querySelectorAll('*')].slice(0, 1000);
  const colorSet = new Set();
  elements.forEach(el => {
    const cs = getComputedStyle(el);
    ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'outlineColor'].forEach(prop => {
      const v = cs[prop];
      if (v && v !== 'rgba(0, 0, 0, 0)' && v !== 'transparent') colorSet.add(v);
    });
    const bg = cs.background;
    if (bg && bg !== 'rgba(0, 0, 0, 0)') colorSet.add(bg);
  });
  return [...colorSet].slice(0, 80);
});
save('docs/research/colors.json', colors);

// --- Page topology ---
const topology = await p1.evaluate(() => {
  const sections = [];
  // Identify major sections
  const selectors = ['header', 'nav', 'section', 'main', 'footer', 'article', '[class*="hero"]', '[class*="section"]', '[class*="hero"]'];
  const seen = new Set();
  document.querySelectorAll('header, nav, section, main, footer, [class*="hero"], [class*="banner"]').forEach(el => {
    if (seen.has(el)) return;
    seen.add(el);
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    sections.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classes: el.className?.toString().split(' ').filter(Boolean).slice(0, 5).join(' '),
      topOffset: Math.round(window.scrollY + rect.top),
      height: Math.round(rect.height),
      position: cs.position,
      zIndex: cs.zIndex,
      childCount: el.children.length,
      headings: [...el.querySelectorAll('h1,h2,h3')].map(h => h.textContent.trim().slice(0, 80)),
      hasImages: el.querySelectorAll('img').length,
      hasVideo: el.querySelectorAll('video').length,
      hasButtons: el.querySelectorAll('button, a[class*="btn"], a[class*="button"]').length,
    });
  });
  return sections;
});
save('docs/research/topology.json', topology);

// --- Full HTML snapshot ---
const html = await p1.evaluate(() => document.documentElement.outerHTML.slice(0, 500000));
save('docs/research/page-snapshot.html', html);

// --- Navigation extraction ---
const nav = await p1.evaluate(() => {
  const navEl = document.querySelector('header, nav');
  if (!navEl) return null;
  return {
    outerHTML: navEl.outerHTML.slice(0, 5000),
    links: [...navEl.querySelectorAll('a')].map(a => ({
      text: a.textContent.trim(),
      href: a.href,
      classes: a.className?.toString(),
    })),
    logo: navEl.querySelector('img, svg, [class*="logo"]')?.outerHTML?.slice(0, 1000),
    styles: {
      position: getComputedStyle(navEl).position,
      background: getComputedStyle(navEl).background,
      backgroundColor: getComputedStyle(navEl).backgroundColor,
      padding: getComputedStyle(navEl).padding,
      height: getComputedStyle(navEl).height,
      zIndex: getComputedStyle(navEl).zIndex,
      borderBottom: getComputedStyle(navEl).borderBottom,
    }
  };
});
save('docs/research/nav.json', nav);

// --- Hero section ---
const hero = await p1.evaluate(() => {
  const heroEl = document.querySelector('[class*="hero"], main section:first-child, .hero, #hero, section:first-of-type');
  if (!heroEl) return { html: document.querySelector('main')?.innerHTML?.slice(0, 5000) };
  return {
    outerHTML: heroEl.outerHTML.slice(0, 10000),
    headings: [...heroEl.querySelectorAll('h1,h2,h3,h4')].map(h => ({ tag: h.tagName, text: h.textContent.trim(), fontSize: getComputedStyle(h).fontSize })),
    text: heroEl.textContent.trim().slice(0, 2000),
    images: [...heroEl.querySelectorAll('img')].map(img => ({ src: img.src, alt: img.alt })),
    bgImage: getComputedStyle(heroEl).backgroundImage,
    styles: {
      height: getComputedStyle(heroEl).height,
      minHeight: getComputedStyle(heroEl).minHeight,
      background: getComputedStyle(heroEl).background,
      backgroundColor: getComputedStyle(heroEl).backgroundColor,
      display: getComputedStyle(heroEl).display,
      alignItems: getComputedStyle(heroEl).alignItems,
      justifyContent: getComputedStyle(heroEl).justifyContent,
      padding: getComputedStyle(heroEl).padding,
    }
  };
});
save('docs/research/hero.json', hero);

// --- All sections text content ---
const allText = await p1.evaluate(() => {
  const sections = [];
  document.querySelectorAll('section, main > div, footer').forEach((el, i) => {
    sections.push({
      index: i,
      classes: el.className?.toString().slice(0, 100),
      headings: [...el.querySelectorAll('h1,h2,h3,h4,h5')].map(h => h.textContent.trim()),
      paragraphs: [...el.querySelectorAll('p')].map(p => p.textContent.trim()).filter(t => t.length > 10),
      links: [...el.querySelectorAll('a')].map(a => ({ text: a.textContent.trim(), href: a.href })).slice(0, 20),
      images: [...el.querySelectorAll('img')].map(img => ({ src: img.src, alt: img.alt })),
    });
  });
  return sections;
});
save('docs/research/all-sections-content.json', allText);

// --- Scroll behaviors: scroll down and capture nav changes ---
await p1.evaluate(() => window.scrollTo(0, 100));
await new Promise(r => setTimeout(r, 500));
const navScrolled = await p1.evaluate(() => {
  const navEl = document.querySelector('header, nav');
  if (!navEl) return null;
  const cs = getComputedStyle(navEl);
  return {
    background: cs.background,
    backgroundColor: cs.backgroundColor,
    boxShadow: cs.boxShadow,
    transform: cs.transform,
    height: cs.height,
  };
});
save('docs/research/nav-scrolled.json', navScrolled);

await p1.evaluate(() => window.scrollTo(0, 0));
await new Promise(r => setTimeout(r, 300));

// --- Screenshot viewport sections ---
const docHeight = await p1.evaluate(() => document.documentElement.scrollHeight);
const viewHeight = 900;
let scrollPos = 0;
let sectionIdx = 0;

console.log(`\nTotal page height: ${docHeight}px. Taking viewport screenshots...\n`);

while (scrollPos < docHeight) {
  await p1.evaluate(y => window.scrollTo(0, y), scrollPos);
  await new Promise(r => setTimeout(r, 600));
  const ssPath = path.join(ROOT, `docs/design-references/section-${sectionIdx}.png`);
  await p1.screenshot({ path: ssPath });
  console.log(`Section screenshot ${sectionIdx} at scroll ${scrollPos}`);
  scrollPos += viewHeight;
  sectionIdx++;
  if (sectionIdx > 20) break; // safety
}

// --- Mobile screenshot ---
console.log('\nCapturing mobile view...');
const { browser: b2, page: p2 } = await launch(390);
await goto(p2, TARGET);
await p2.screenshot({ path: path.join(ROOT, 'docs/design-references/mobile-full.png'), fullPage: true });
console.log('Screenshot: mobile-full.png');
await b2.close();

// --- Download favicon & key assets ---
console.log('\nDownloading assets...');
if (assets.favicons.length) {
  for (const fav of assets.favicons.slice(0, 3)) {
    if (!fav.href || !fav.href.startsWith('http')) continue;
    const ext = path.extname(fav.href.split('?')[0]) || '.ico';
    const dest = path.join(ROOT, `public/${path.basename(fav.href.split('?')[0])}`);
    try {
      await downloadFile(fav.href, dest);
      console.log('Downloaded favicon:', path.basename(dest));
    } catch(e) {
      console.log('Failed favicon:', e.message);
    }
  }
}

// Download first 10 unique images
const imgUrls = [...new Set(assets.images.map(i => i.src).filter(s => s && s.startsWith('http')))].slice(0, 15);
for (const url of imgUrls) {
  try {
    const urlObj = new URL(url);
    const filename = path.basename(urlObj.pathname).split('?')[0] || 'img.jpg';
    const dest = path.join(ROOT, 'public/images', filename);
    if (!fs.existsSync(dest)) {
      await downloadFile(url, dest);
      console.log('Downloaded:', filename);
    }
  } catch(e) {
    console.log('Failed:', url, e.message);
  }
}

await b1.close();

console.log('\n=== Extraction complete ===');
console.log('Files saved to docs/research/ and docs/design-references/');
