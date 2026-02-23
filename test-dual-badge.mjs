import { chromium } from 'playwright';

const BASE = 'http://localhost:3100';
const EMAIL = 'agent@chefflow.test';
const PASSWORD = 'AgentChefFlow!2026';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Auth
  console.log('Authenticating...');
  const authResp = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  console.log('Auth status:', authResp.status());
  if (authResp.status() !== 200) { await browser.close(); process.exit(1); }

  // Navigate
  console.log('Navigating to dashboard...');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);

  console.log('Page URL:', page.url());

  // Search entire page text for anything AI/Ollama/PC/Pi related
  const pageText = await page.evaluate(() => document.body?.innerText || '');
  const lines = pageText.split('\n').filter(l => 
    /ollama|AI|pc\s*·|pi\s*·|local\s*·|dual|offline|online|badge|ms\b/i.test(l)
  );
  console.log('AI-related text lines on page:');
  lines.forEach(l => console.log('  >', l.trim().substring(0, 120)));
  
  if (lines.length === 0) {
    console.log('  (none found - the OllamaStatusBadge is NOT rendered on this page)');
  }

  // Full screenshot
  await page.screenshot({ path: 'test-screenshots/dual-badge.png', fullPage: false });
  console.log('Screenshot saved: test-screenshots/dual-badge.png');

  // Header area screenshot
  await page.screenshot({
    path: 'test-screenshots/dual-badge-header.png',
    clip: { x: 0, y: 0, width: 1440, height: 150 }
  });
  console.log('Header screenshot saved: test-screenshots/dual-badge-header.png');

  await browser.close();
  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
