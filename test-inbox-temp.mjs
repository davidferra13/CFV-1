import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

// Capture ALL console messages
const allConsole = [];
page.on('console', msg => allConsole.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => allConsole.push(`[PAGE ERROR] ${err.message}`));

const resp = await page.request.post('http://localhost:3100/api/e2e/auth', {
  data: { email: 'davidferra13@gmail.com', password: 'TDtd1943!' }, timeout: 120000
});
const cookies = resp.headers()['set-cookie'];
if (cookies) {
  const [nameValue] = cookies.split(';');
  const [name, ...valueParts] = nameValue.split('=');
  await context.addCookies([{ name: name.trim(), value: valueParts.join('=').trim(), domain: 'localhost', path: '/' }]);
}

await page.goto('http://localhost:3100/inbox?tab=unlinked', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(12000);

// Print all console messages
console.log('=== CONSOLE MESSAGES ===');
for (const msg of allConsole) {
  console.log(msg);
}

// Check hydration status
const hydrated = await page.evaluate(() => {
  // In Next.js, if hydration completed, __NEXT_DATA__ exists and React root is attached
  const root = document.getElementById('__next');
  if (!root) return { nextRoot: false };
  const reactRoot = Object.keys(root).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactContainer'));
  return { nextRoot: true, reactRoot: !!reactRoot, key: reactRoot || 'none' };
});
console.log('\nHydration check:', hydrated);

await browser.close();
