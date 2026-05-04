import { chromium } from 'playwright';

const BASE = 'https://app.cheflowhq.com';
const results = [];

async function check(page, name, url, assertions, timeout = 60000) {
  try {
    const start = Date.now();
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const status = res?.status() ?? 0;
    const text = await page.locator('body').textContent({ timeout: 5000 }).catch(() => '');
    const pass = await assertions(page, status, text);
    const tag = elapsed > 5 ? ` [SLOW ${elapsed}s]` : ` [${elapsed}s]`;
    results.push({ name, status, pass, url, elapsed: +elapsed });
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name} (${status})${tag}`);
  } catch (e) {
    results.push({ name, pass: false, error: e.message, url });
    console.log(`FAIL ${name}: ${e.message.slice(0, 120)}`);
  }
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: 'ChefFlow-SmokeTest/1.0',
  viewport: { width: 1280, height: 720 }
});
const page = await ctx.newPage();

// 1. Homepage
await check(page, 'Homepage', `${BASE}/`, async (p, s) => s === 200);

// 2. Booking page
await check(page, 'Booking page /book', `${BASE}/book`, async (p, s) => {
  if (s !== 200) return false;
  return await p.locator('form, input, textarea, [data-booking], button').count() > 0;
});

// 3. Sign in page
await check(page, 'Sign in /signin', `${BASE}/signin`, async (p, s) => {
  return s === 200 || p.url().includes('signin') || p.url().includes('auth');
});

// 4. Chef directory (known slow)
await check(page, 'Chef directory /chefs', `${BASE}/chefs`, async (p, s) => s === 200);

// 5. Privacy
await check(page, 'Privacy /privacy', `${BASE}/privacy`, async (p, s) => s === 200);

// 6. Terms
await check(page, 'Terms /terms', `${BASE}/terms`, async (p, s) => s === 200);

// 7. How it works
await check(page, 'How it works', `${BASE}/how-it-works`, async (p, s) => s === 200);

// 8. Manifest.json
await check(page, 'PWA manifest', `${BASE}/manifest.json`, async (p, s, text) => {
  return s === 200 && text.includes('ChefFlow');
});

// 9. Service worker
await check(page, 'Service worker', `${BASE}/sw.js`, async (p, s, text) => {
  return s === 200 && text.includes('self');
});

// 10. API health
await check(page, 'API health', `${BASE}/api/health`, async (p, s) => s === 200);

// 11. Build version
await check(page, 'Build version API', `${BASE}/api/build-version`, async (p, s, text) => {
  return s === 200 && text.includes('buildId');
});

// 12. Try to find a chef slug and test profile + inquiry
{
  try {
    await page.goto(`${BASE}/chefs`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    const href = await page.locator('a[href^="/chef/"]').first().getAttribute('href').catch(() => null);
    if (href) {
      const slug = href.split('/')[2];
      await check(page, `Chef profile /${slug}`, `${BASE}/chef/${slug}`, async (p, s) => s === 200);
      await check(page, `Chef inquiry form /${slug}`, `${BASE}/chef/${slug}/inquire`, async (p, s) => {
        if (s !== 200) return false;
        return await p.locator('form, input, textarea').count() > 0;
      });
    } else {
      console.log('SKIP Chef profile/inquiry: no chef found in directory');
    }
  } catch (e) {
    console.log(`SKIP Chef profile/inquiry: directory timed out`);
  }
}

// 13. Ingredient encyclopedia
await check(page, 'Ingredient pages', `${BASE}/ingredient`, async (p, s) => {
  return s === 200 || s === 307 || s === 308;
});

// 14. For operators
await check(page, 'For Operators', `${BASE}/for-operators`, async (p, s) => s === 200);

// 15. Compare page
await check(page, 'Compare page', `${BASE}/compare`, async (p, s) => s === 200);

// 16. Contact
await check(page, 'Contact', `${BASE}/contact`, async (p, s) => s === 200);

// 17. Mobile viewport tests
{
  const mobilePage = await browser.newPage({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
  });
  await check(mobilePage, 'Mobile: homepage', `${BASE}/`, async (p, s) => s === 200);
  await check(mobilePage, 'Mobile: booking', `${BASE}/book`, async (p, s) => {
    if (s !== 200) return false;
    return await p.locator('form, input, textarea, button').count() > 0;
  });
  await check(mobilePage, 'Mobile: sign in', `${BASE}/signin`, async (p, s) => {
    return s === 200 || p.url().includes('signin');
  });
  await mobilePage.close();
}

await browser.close();

// Summary
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
const slow = results.filter(r => r.elapsed > 5);
console.log(`\n=============================`);
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${results.length}`);
if (slow.length > 0) {
  console.log(`\nSLOW PAGES (>5s):`);
  slow.forEach(r => console.log(`  ${r.name}: ${r.elapsed}s`));
}
if (failed > 0) {
  console.log(`\nFAILURES:`);
  results.filter(r => !r.pass).forEach(r => {
    console.log(`  ${r.name} — ${r.url} ${r.error || `status ${r.status}`}`);
  });
}
