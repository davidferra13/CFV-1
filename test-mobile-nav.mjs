import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
});
const page = await context.newPage();

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', err => errors.push('PAGE ERROR: ' + err.message));

// Sign in
console.log('Signing in...');
const res = await page.request.post('http://localhost:3100/api/e2e/auth', {
  data: { email: 'agent@chefflow.test', password: 'AgentChefFlow!2026' }
});
console.log('Auth response status:', res.status());

// Navigate to dashboard
console.log('Going to dashboard...');
await page.goto('http://localhost:3100/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
console.log('Current URL:', page.url());

// Screenshot the bottom of the page
await page.screenshot({ path: 'test-screenshots/mobile-dashboard.png', fullPage: false });

// Check all links in the bottom nav
const navs = await page.locator('nav').all();
console.log('Number of nav elements:', navs.length);

for (let i = 0; i < navs.length; i++) {
  const nav = navs[i];
  const box = await nav.boundingBox();
  const vis = await nav.isVisible();
  const cls = await nav.getAttribute('class');
  console.log(`Nav ${i}: visible=${vis} box=${box ? `y:${Math.round(box.y)} h:${Math.round(box.height)}` : 'none'} class=${(cls || '').substring(0, 60)}`);
}

// Find links in the bottom region (y > 700 on iPhone viewport)
const allLinks = await page.locator('a').all();
const bottomLinks = [];
for (const link of allLinks) {
  const box = await link.boundingBox();
  if (box && box.y > 700) {
    const href = await link.getAttribute('href');
    const text = await link.textContent();
    bottomLinks.push({ text: (text || '').trim(), href, y: Math.round(box.y) });
  }
}
console.log('Links in bottom area (y>700):', JSON.stringify(bottomLinks, null, 2));

// Check what element is at the tap point for each bottom link
for (const bl of bottomLinks) {
  if (!bl.href) continue;
  const link = page.locator(`a[href="${bl.href}"]`).last();
  const box = await link.boundingBox();
  if (!box) continue;

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  const elemInfo = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return 'null';
    let info = el.tagName;
    if (el.className && typeof el.className === 'string') info += '.' + el.className.substring(0, 60);
    const a = el.closest('a');
    if (a) info += ' -> a[href=' + a.getAttribute('href') + ']';
    return info;
  }, { x: cx, y: cy });

  console.log(`Element at (${Math.round(cx)},${Math.round(cy)}) for "${bl.text}": ${elemInfo}`);
}

// Now try clicking each link and see if we navigate
console.log('\n=== CLICK TESTS ===');

// Go back to dashboard
await page.goto('http://localhost:3100/dashboard', { waitUntil: 'networkidle', timeout: 30000 });

for (const bl of bottomLinks) {
  if (!bl.href || bl.href === '/dashboard') continue;

  console.log(`\nClicking "${bl.text}" (href=${bl.href})...`);
  const link = page.locator(`nav a[href="${bl.href}"]`).last();
  const count = await link.count();
  if (count === 0) {
    console.log('  Link not found in nav');
    continue;
  }

  try {
    await link.click({ timeout: 5000 });
    await page.waitForTimeout(3000);
    console.log('  URL after click:', page.url());

    // Go back to dashboard for next test
    await page.goto('http://localhost:3100/dashboard', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log('  Click failed:', e.message);
  }
}

if (errors.length > 0) {
  console.log('\n=== CONSOLE ERRORS ===');
  errors.forEach(e => console.log(e));
} else {
  console.log('\nNo console errors detected.');
}

await browser.close();
