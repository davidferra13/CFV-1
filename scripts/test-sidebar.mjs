import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const creds = JSON.parse(readFileSync('.auth/agent.json', 'utf-8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Sign in
await page.goto('http://localhost:3100/auth/signin', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(3000);
await page.locator('input[type="email"]').fill(creds.email);
await page.locator('input[type="password"]').fill(creds.password);
await page.click('button:has-text("Sign In")');
await page.waitForTimeout(15000);

console.log('URL:', page.url());

// Screenshot 1: Default collapsed state
await page.screenshot({ path: 'screenshots/ux-01-default.png', fullPage: false });

// Screenshot 2: Expand Pipeline group
const pipelineBtn = page.locator('aside button:has-text("Pipeline")').first();
if (await pipelineBtn.count() > 0) {
  await pipelineBtn.click();
  await page.waitForTimeout(500);
}
await page.screenshot({ path: 'screenshots/ux-02-pipeline-open.png', fullPage: false });

// Screenshot 3: Now click Culinary - Pipeline should auto-close (accordion)
await page.evaluate(() => {
  const nav = document.querySelector('aside nav');
  if (nav) nav.scrollTop = 0;
});
await page.waitForTimeout(300);

// Scroll down to find Culinary in the "All Features" section
const culinaryBtn = page.locator('aside button:has-text("Culinary")').last();
if (await culinaryBtn.count() > 0) {
  await culinaryBtn.scrollIntoViewIfNeeded();
  await culinaryBtn.click();
  await page.waitForTimeout(500);
}
await page.screenshot({ path: 'screenshots/ux-03-culinary-accordion.png', fullPage: false });

// Screenshot 4: Scroll to see the "All Features" label
await page.evaluate(() => {
  const nav = document.querySelector('aside nav');
  if (nav) {
    // Scroll to show the "All Features" divider
    const spans = nav.querySelectorAll('span');
    for (const span of spans) {
      if (span.textContent.trim() === 'All Features') {
        span.scrollIntoView({ block: 'center' });
        break;
      }
    }
  }
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'screenshots/ux-04-all-features-label.png', fullPage: false });

console.log('Screenshots saved');
await browser.close();
