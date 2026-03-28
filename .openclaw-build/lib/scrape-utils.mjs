/**
 * OpenClaw - Shared Scraping Utilities
 * Rate limiting, user-agent rotation, Puppeteer helpers.
 */

import puppeteer from 'puppeteer-core';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
];

export function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Rate-limited delay: 3-6 seconds between requests.
 */
export async function rateLimitDelay() {
  const delay = 3000 + Math.random() * 3000;
  await sleep(delay);
}

/**
 * Launch a headless Chromium browser on the Pi.
 * Only ONE instance at a time to avoid OOM.
 */
export async function launchBrowser() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--mute-audio',
      '--no-first-run',
      '--disable-features=Translate',
    ],
  });
  return browser;
}

/**
 * Create a new page with a random user agent and reasonable viewport.
 */
export async function newPage(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(randomUserAgent());
  await page.setViewport({ width: 1366, height: 768 });
  // Block images, fonts, and media to save bandwidth/memory
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (['image', 'font', 'media', 'stylesheet'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });
  return page;
}

/**
 * Safe page navigation with timeout.
 */
export async function safeFetch(page, url, timeoutMs = 30000) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    return true;
  } catch (err) {
    console.error(`[scrape] Failed to load ${url}: ${err.message}`);
    return false;
  }
}

/**
 * Extract text content from a page, cleaning whitespace.
 */
export async function getTextContent(page, selector) {
  try {
    const text = await page.$eval(selector, el => el.textContent);
    return text?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Extract all matching elements as an array of objects.
 */
export async function extractAll(page, containerSelector, extractFn) {
  try {
    return await page.$$eval(containerSelector, (elements, fnStr) => {
      // Can't pass functions to $$eval, so we extract basic data
      return elements.map(el => ({
        text: el.textContent?.trim() || '',
        html: el.innerHTML,
      }));
    });
  } catch {
    return [];
  }
}

/**
 * Simple HTTP fetch with user-agent rotation (no browser needed).
 */
export async function httpFetch(url, options = {}) {
  const headers = {
    'User-Agent': randomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res;
}
