/**
 * PC-side Instacart Session Capture
 *
 * Uses the PC's Chrome (which CAN render Instacart) to:
 * 1. Load the store page
 * 2. Capture session cookies (including __Host-instacart_sid)
 * 3. Intercept a real GraphQL request to get the query template
 * 4. Save everything to a session file
 *
 * This file is then SCP'd to the Pi for use by the catalog walker.
 */

import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSION_OUTPUT = join(__dirname, 'captured-session.json');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const INSTACART_BASE = 'https://www.instacart.com';
const STORE_SLUG = 'market-basket';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== Instacart Session Capture (PC) ===');
  console.log(`Chrome: ${CHROME_PATH}`);
  console.log(`Store: ${STORE_SLUG}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1366,768',
    ],
  });

  let graphqlTemplates = [];
  let capturedHeaders = {};

  try {
    const page = await browser.newPage();
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    await page.setUserAgent(ua);
    await page.setViewport({ width: 1366, height: 768 });

    // Intercept ALL requests to see what Instacart does
    await page.setRequestInterception(true);
    const allApiCalls = [];

    page.on('request', req => {
      const type = req.resourceType();
      const url = req.url();
      const method = req.method();

      // Log ALL non-static requests
      if ((type === 'xhr' || type === 'fetch') && method === 'POST') {
        try {
          const pd = req.postData();
          const shortUrl = url.replace('https://www.instacart.com', '');
          allApiCalls.push({ url: shortUrl, method, bodyLen: pd?.length || 0 });

          if (pd) {
            try {
              const parsed = JSON.parse(pd);
              capturedHeaders = { ...req.headers() };

              if (Array.isArray(parsed)) {
                // Batch GraphQL
                for (const item of parsed) {
                  graphqlTemplates.push({
                    operationName: item.operationName || 'batch',
                    body: JSON.stringify(item),
                  });
                  console.log(`  [captured] Batch GQL: ${item.operationName}`);
                }
              } else if (parsed.operationName) {
                graphqlTemplates.push({
                  operationName: parsed.operationName,
                  body: pd,
                });
                console.log(`  [captured] GQL: ${parsed.operationName}`);
              }
            } catch {}
          }
        } catch {}
      }

      // Allow everything (PC can handle it)
      if (type === 'image' || type === 'font' || type === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Also capture responses for the GraphQL calls
    page.on('response', async (res) => {
      const url = res.url();
      if (url.includes('/graphql') && res.request().method() === 'POST') {
        try {
          const body = await res.text();
          if (body.length > 1000) {
            const pd = res.request().postData();
            if (pd) {
              const parsed = JSON.parse(pd);
              console.log(`  [response] ${parsed.operationName || 'unknown'}: ${body.length} bytes`);
            }
          }
        } catch {}
      }
    });

    // Helper: navigate with graceful timeout handling
    async function safeGoto(url, label) {
      console.log(`  Loading ${label}...`);
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      } catch (e) {
        console.log(`  ${label} nav timeout, continuing...`);
      }
      // Wait for JS to execute and fire GraphQL requests
      await sleep(15000);
      console.log(`  ${label} done (templates so far: ${graphqlTemplates.length}, API calls: ${allApiCalls.length})`);
    }

    // Step 1: Load the store page
    console.log('\n[1] Loading store page...');
    await safeGoto(`${INSTACART_BASE}/store/${STORE_SLUG}`, 'store home');

    // Step 2: Navigate to search page (this should trigger SearchResultsPlacements)
    console.log('\n[2] Loading search page...');
    await safeGoto(`${INSTACART_BASE}/store/${STORE_SLUG}/search/chicken`, 'search: chicken');

    // Step 3: Another search term
    console.log('\n[3] Second search...');
    await safeGoto(`${INSTACART_BASE}/store/${STORE_SLUG}/search/milk`, 'search: milk');

    // Step 4: Load a collection/department page
    console.log('\n[4] Loading produce collection...');
    await safeGoto(`${INSTACART_BASE}/store/${STORE_SLUG}/collections/produce`, 'produce collection');

    // Step 5: Extract cookies
    console.log('\n[5] Extracting cookies...');
    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log(`  Got ${cookies.length} cookies`);
    console.log(`  Has instacart_sid: ${cookieStr.includes('instacart_sid')}`);

    // Step 6: Extract client identifiers from page
    const clientData = await page.evaluate(() => {
      const meta = {};
      for (const s of document.querySelectorAll('script')) {
        const text = s.textContent || '';
        const cid = text.match(/"clientIdentifier"\s*:\s*"([^"]+)"/);
        if (cid) meta.clientIdentifier = cid[1];
        const csrf = text.match(/"csrfToken"\s*:\s*"([^"]+)"/);
        if (csrf) meta.csrfToken = csrf[1];
      }
      return meta;
    }).catch(() => ({}));

    console.log(`  Client data:`, clientData);

    // Step 7: Save session
    const sessionData = {
      cookies: cookieStr,
      clientData,
      capturedHeaders: Object.fromEntries(
        Object.entries(capturedHeaders).filter(([k]) =>
          ['x-client-identifier', 'x-csrf-token', 'content-type', 'accept'].includes(k.toLowerCase())
        )
      ),
      graphqlTemplates: graphqlTemplates.map(t => ({
        operationName: t.operationName,
        body: t.body,
      })),
      ua,
      timestamp: Date.now(),
    };

    writeFileSync(SESSION_OUTPUT, JSON.stringify(sessionData, null, 2));
    console.log(`\n[6] Session saved to ${SESSION_OUTPUT}`);

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Cookies: ${cookies.length}`);
    console.log(`GraphQL templates captured: ${graphqlTemplates.length}`);
    graphqlTemplates.forEach(t => console.log(`  - ${t.operationName}`));
    console.log(`Client identifier: ${clientData.clientIdentifier || 'none'}`);
    console.log(`CSRF token: ${clientData.csrfToken ? 'yes' : 'no'}`);

    // Find the search template specifically
    const searchTemplate = graphqlTemplates.find(t =>
      t.operationName === 'SearchResultsPlacements' ||
      t.operationName?.includes('Search')
    );
    if (searchTemplate) {
      console.log(`\nSearch template found: ${searchTemplate.operationName}`);
      console.log(`Body length: ${searchTemplate.body.length}`);
    } else {
      console.log('\nWARNING: No search template captured.');
      console.log('Captured operations:', graphqlTemplates.map(t => t.operationName).join(', '));
    }

    // Log ALL API calls made
    console.log(`\nAll API calls (${allApiCalls.length}):`);
    allApiCalls.forEach(c => console.log(`  ${c.method} ${c.url} (${c.bodyLen}b)`));

  } finally {
    await browser.close();
    console.log('\nBrowser closed');
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
