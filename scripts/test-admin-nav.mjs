import { chromium } from 'playwright';

const BASE = 'http://localhost:3100';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Step 1: Sign in
  console.log('--- Step 1: Signing in ---');
  const res = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'ChefFlowLocal!123' }
  });
  console.log('Auth response status:', res.status());
  if (!res.ok()) {
    console.log('Auth body:', await res.text());
    await browser.close();
    process.exit(1);
  }

  // Step 2: Navigate to /admin
  console.log('\n--- Step 2: Navigate to /admin ---');
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
  console.log('Current URL:', page.url());

  // Step 3: Screenshot admin dashboard
  await page.screenshot({ path: 'screenshots/admin-dashboard.png', fullPage: true });
  console.log('Screenshot saved: screenshots/admin-dashboard.png');

  // Check for Pulse and All Inquiries tiles/links on admin page
  console.log('\n--- Step 3: Checking for Pulse and Inquiries tiles ---');
  const pageText = await page.textContent('body');

  const hasPulse = pageText.includes('Pulse');
  const hasInquiries = pageText.includes('Inquiries') || pageText.includes('All Inquiries');
  console.log('Found "Pulse" on page:', hasPulse);
  console.log('Found "Inquiries" or "All Inquiries" on page:', hasInquiries);

  // Find all links on the page
  const links = await page.$$eval('a', els => els.map(a => ({ text: a.textContent?.trim(), href: a.href })));
  console.log('\nAll links on admin page:');
  for (const l of links) {
    console.log(`  "${l.text}" -> ${l.href}`);
  }

  // Step 4: Click on Pulse tile/link
  console.log('\n--- Step 4: Navigate to /admin/pulse ---');
  const pulseLink = await page.$('a[href*="/admin/pulse"]');
  if (pulseLink) {
    await pulseLink.click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } else {
    console.log('No Pulse link found, navigating directly');
    await page.goto(`${BASE}/admin/pulse`, { waitUntil: 'networkidle', timeout: 30000 });
  }
  console.log('Current URL:', page.url());

  // Step 5: Screenshot pulse page
  await page.screenshot({ path: 'screenshots/admin-pulse.png', fullPage: true });
  console.log('Screenshot saved: screenshots/admin-pulse.png');

  // Step 6: Check sidebar/nav for Pulse and All Inquiries
  console.log('\n--- Step 6: Checking sidebar nav items ---');
  // Look at nav/sidebar elements
  const navItems = await page.$$eval('nav a, aside a, [role="navigation"] a', els =>
    els.map(a => ({ text: a.textContent?.trim(), href: a.href }))
  );
  console.log('Nav/sidebar links:');
  for (const n of navItems) {
    console.log(`  "${n.text}" -> ${n.href}`);
  }

  const navHasPulse = navItems.some(n => n.text?.includes('Pulse'));
  const navHasInquiries = navItems.some(n => n.text?.includes('Inquiries'));
  console.log('\nNav has "Pulse":', navHasPulse);
  console.log('Nav has "Inquiries":', navHasInquiries);

  // Check for console errors
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  // Step 7: Navigate back to /admin and check for broken elements
  console.log('\n--- Step 7: Back to /admin, check for broken links ---');
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: 'screenshots/admin-final.png', fullPage: true });
  console.log('Screenshot saved: screenshots/admin-final.png');

  // Check all links on admin page are valid (not 404)
  const adminLinks = await page.$$eval('a', els => els.map(a => a.href).filter(h => h.startsWith('http')));
  const uniqueLinks = [...new Set(adminLinks)].filter(l => l.includes('localhost:3100'));
  console.log(`\nChecking ${uniqueLinks.length} internal links for broken responses...`);
  for (const link of uniqueLinks) {
    try {
      const r = await page.request.get(link, { timeout: 5000 });
      if (r.status() >= 400) {
        console.log(`  BROKEN (${r.status()}): ${link}`);
      }
    } catch (e) {
      console.log(`  ERROR: ${link} - ${e.message}`);
    }
  }

  if (errors.length > 0) {
    console.log('\nConsole errors detected:');
    for (const e of errors) console.log(`  ${e}`);
  }

  console.log('\n--- Done ---');
  await browser.close();
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
