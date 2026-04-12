const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ baseURL: 'http://localhost:3100' });
  const ar = await ctx.request.post('/api/e2e/auth', { data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' }, headers: { 'Content-Type': 'application/json' } });
  console.log('Auth:', ar.status());
  const page = await ctx.newPage();
  let reqs = 0;
  let resps = 0;
  page.on('request', req => { reqs++; if (reqs <= 3) console.log('REQ', reqs+':', req.url().substring(0,80)); });
  page.on('response', r => { resps++; if (resps <= 3) console.log('RESP', resps+':', r.status(), r.url().substring(0,80)); });
  // Just do a simple GET request via Playwright without waiting for full load
  console.log('Making API request...');
  const resp = await ctx.request.get('/api/health');
  console.log('Health API:', resp.status(), await resp.text());
  console.log('Now trying page nav...');
  page.goto('/expenses/new', { waitUntil: 'commit', timeout: 30000 }).then(r => console.log('Nav complete!')).catch(e => console.log('Nav err:', e.message.substring(0,80)));
  await sleep(5000);
  console.log('After 5s: URL=', page.url(), 'reqs=', reqs, 'resps=', resps);
  await page.screenshot({ path: 'C:/tmp/receipt-state.png' }).catch(e => console.log('SS err:', e.message.substring(0,80)));
  await browser.close();
  console.log('Done');
}
main().catch(e => { console.error('FATAL:', e.message.substring(0,200)); process.exit(1); });