/**
 * OpenClaw - Shared Scraping Utilities
 * Rate limiting, privacy-preserving request defaults, Puppeteer helpers.
 */

import puppeteer from 'puppeteer-core';
import {
  assertHostNotBlocked,
  assertResponseAllowed,
  buildPublicFetchOptions,
  collectorUserAgent,
  redactUrlForLog,
  sourceFingerprint,
} from './collector-policy.mjs';

/**
 * Backward-compatible name. Collector identity is deliberately stable:
 * do not impersonate rotating consumer browsers.
 */
export function randomUserAgent() {
  return collectorUserAgent();
}

export { sourceFingerprint };

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
    protocolTimeout: 120000,
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
 * Create a new page with a stable collector identity and isolated defaults.
 */
export async function newPage(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(randomUserAgent());
  await page.setExtraHTTPHeaders({ DNT: '1', 'Sec-GPC': '1' });
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
    assertHostNotBlocked(url);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    if (response) {
      assertResponseAllowed(response, url);
      if (!response.ok()) return false;
    }
    return true;
  } catch (err) {
    console.error(`[scrape] Failed to load ${redactUrlForLog(url)}: ${err.message}`);
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
 * Public HTTP fetch with ambient credentials removed by default.
 */
export async function httpFetch(url, options = {}) {
  assertHostNotBlocked(url);
  const requestOptions = buildPublicFetchOptions({
    ...options,
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
      ...options.headers,
    },
  });

  const res = await fetch(url, requestOptions);
  assertResponseAllowed(res, url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${redactUrlForLog(url)}`);
  return res;
}
